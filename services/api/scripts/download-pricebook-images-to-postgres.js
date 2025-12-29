#!/usr/bin/env node
/**
 * Download Pricebook Images to PostgreSQL
 * Downloads all pricebook images from ServiceTitan and stores them in PostgreSQL
 * 
 * Usage: node scripts/download-pricebook-images-to-postgres.js
 */

import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const { Pool } = pg;

// Configuration
const TENANT_ID = process.env.SERVICE_TITAN_TENANT_ID || '3222348440';
const CLIENT_ID = process.env.SERVICE_TITAN_CLIENT_ID;
const CLIENT_SECRET = process.env.SERVICE_TITAN_CLIENT_SECRET;
const APP_KEY = process.env.SERVICE_TITAN_APP_KEY;
const DATABASE_URL = process.env.DATABASE_URL;

// Database pool
const pool = new Pool({
  connectionString: DATABASE_URL,
  max: 5,
});

// Token cache
let accessToken = null;
let tokenExpiresAt = 0;

async function getAccessToken() {
  const now = Date.now();
  if (accessToken && tokenExpiresAt > now + 60000) {
    return accessToken;
  }

  console.log('Fetching new access token...');
  
  const response = await fetch('https://auth.servicetitan.io/connect/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to get access token: ${response.status} - ${text}`);
  }

  const data = await response.json();
  accessToken = data.access_token;
  tokenExpiresAt = now + (data.expires_in * 1000);
  
  console.log('Got access token, expires in', data.expires_in, 'seconds');
  return accessToken;
}

async function downloadImage(imagePath, sourceType, sourceStId) {
  if (!imagePath) return { success: false, reason: 'no-path' };
  
  try {
    const token = await getAccessToken();
    
    // ServiceTitan image endpoint: GET /pricebook/v2/tenant/{tenant}/images?path=
    const url = `https://api.servicetitan.io/pricebook/v2/tenant/${TENANT_ID}/images?path=${encodeURIComponent(imagePath)}`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'ST-App-Key': APP_KEY,
      },
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      const buffer = Buffer.from(await response.arrayBuffer());
      const contentType = response.headers.get('content-type') || 'image/jpeg';
      
      if (buffer.length > 0) {
        // Insert into raw.pricebook_images
        await pool.query(`
          INSERT INTO raw.pricebook_images (
            image_path, tenant_id, image_data, content_type, file_size,
            source_type, source_st_id, downloaded_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
          ON CONFLICT (image_path) DO UPDATE SET
            image_data = EXCLUDED.image_data,
            content_type = EXCLUDED.content_type,
            file_size = EXCLUDED.file_size,
            downloaded_at = NOW(),
            download_error = NULL,
            updated_at = NOW()
        `, [imagePath, TENANT_ID, buffer, contentType, buffer.length, sourceType, sourceStId]);
        
        return { success: true, size: buffer.length, contentType };
      }
    }
    
    // Record the error
    await pool.query(`
      INSERT INTO raw.pricebook_images (
        image_path, tenant_id, source_type, source_st_id, download_error
      ) VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (image_path) DO UPDATE SET
        download_error = EXCLUDED.download_error,
        updated_at = NOW()
    `, [imagePath, TENANT_ID, sourceType, sourceStId, `HTTP ${response.status}`]);
    
    return { success: false, reason: 'not-found', status: response.status };
  } catch (err) {
    // Record the error
    await pool.query(`
      INSERT INTO raw.pricebook_images (
        image_path, tenant_id, source_type, source_st_id, download_error
      ) VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (image_path) DO UPDATE SET
        download_error = EXCLUDED.download_error,
        updated_at = NOW()
    `, [imagePath, TENANT_ID, sourceType, sourceStId, err.message]);
    
    return { success: false, reason: 'error', message: err.message };
  }
}

async function syncToMaster() {
  console.log('\n=== Syncing to master.pricebook_images ===');
  
  const result = await pool.query(`
    INSERT INTO master.pricebook_images (
      image_path, tenant_id, image_data, content_type, file_size,
      source_type, source_st_id, last_synced_at
    )
    SELECT 
      image_path, tenant_id, image_data, content_type, file_size,
      source_type, source_st_id, NOW()
    FROM raw.pricebook_images
    WHERE image_data IS NOT NULL
    ON CONFLICT (image_path) DO UPDATE SET
      image_data = EXCLUDED.image_data,
      content_type = EXCLUDED.content_type,
      file_size = EXCLUDED.file_size,
      source_type = EXCLUDED.source_type,
      source_st_id = EXCLUDED.source_st_id,
      last_synced_at = NOW(),
      updated_at = NOW()
    RETURNING id
  `);
  
  console.log(`Synced ${result.rowCount} images to master table`);
  return result.rowCount;
}

async function processCategories() {
  console.log('\n=== Processing Category Images ===');
  
  const result = await pool.query(`
    SELECT st_id, image 
    FROM raw.st_pricebook_categories 
    WHERE image IS NOT NULL AND image != ''
      AND tenant_id = $1
  `, [TENANT_ID]);
  
  console.log(`Found ${result.rows.length} categories with images`);
  
  let downloaded = 0;
  let failed = 0;
  
  for (let i = 0; i < result.rows.length; i++) {
    const { st_id, image } = result.rows[i];
    const downloadResult = await downloadImage(image, 'category', st_id);
    
    if (downloadResult.success) {
      downloaded++;
      process.stdout.write('.');
    } else {
      failed++;
      if (failed <= 3) {
        console.log(`\nFailed: ${image} - ${downloadResult.reason}`);
      }
    }
    
    // Progress update
    if ((i + 1) % 20 === 0) {
      console.log(`\n  Progress: ${i + 1}/${result.rows.length}`);
    }
    
    // Small delay to avoid rate limiting
    await new Promise(r => setTimeout(r, 100));
  }
  
  console.log(`\nCategories: ${downloaded} downloaded, ${failed} failed`);
  return { downloaded, failed };
}

async function processSubcategories() {
  console.log('\n=== Processing Subcategory Images ===');
  
  const result = await pool.query(`
    SELECT st_id, image_url 
    FROM master.pricebook_subcategories 
    WHERE image_url IS NOT NULL AND image_url != ''
      AND tenant_id = $1
  `, [TENANT_ID]);
  
  console.log(`Found ${result.rows.length} subcategories with images`);
  
  let downloaded = 0;
  let failed = 0;
  
  for (let i = 0; i < result.rows.length; i++) {
    const { st_id, image_url } = result.rows[i];
    const downloadResult = await downloadImage(image_url, 'subcategory', st_id);
    
    if (downloadResult.success) {
      downloaded++;
      process.stdout.write('.');
    } else {
      failed++;
    }
    
    if ((i + 1) % 50 === 0) {
      console.log(`\n  Progress: ${i + 1}/${result.rows.length}`);
    }
    
    await new Promise(r => setTimeout(r, 100));
  }
  
  console.log(`\nSubcategories: ${downloaded} downloaded, ${failed} failed`);
  return { downloaded, failed };
}

async function processServices() {
  console.log('\n=== Processing Service Images ===');
  
  const result = await pool.query(`
    SELECT st_id, assets 
    FROM raw.st_pricebook_services 
    WHERE assets IS NOT NULL AND jsonb_array_length(assets) > 0
      AND tenant_id = $1
  `, [TENANT_ID]);
  
  console.log(`Found ${result.rows.length} services with assets`);
  
  let downloaded = 0;
  let failed = 0;
  
  for (let i = 0; i < result.rows.length; i++) {
    const { st_id, assets } = result.rows[i];
    
    if (Array.isArray(assets)) {
      for (const asset of assets) {
        if (asset.type === 'Image' && asset.url) {
          const downloadResult = await downloadImage(asset.url, 'service', st_id);
          if (downloadResult.success) {
            downloaded++;
            process.stdout.write('.');
          } else {
            failed++;
          }
          await new Promise(r => setTimeout(r, 100));
        }
      }
    }
    
    if ((i + 1) % 100 === 0) {
      console.log(`\n  Progress: ${i + 1}/${result.rows.length}`);
    }
  }
  
  console.log(`\nServices: ${downloaded} downloaded, ${failed} failed`);
  return { downloaded, failed };
}

async function processMaterials() {
  console.log('\n=== Processing Material Images ===');
  
  const result = await pool.query(`
    SELECT st_id, assets 
    FROM raw.st_pricebook_materials 
    WHERE assets IS NOT NULL AND jsonb_array_length(assets) > 0
      AND tenant_id = $1
  `, [TENANT_ID]);
  
  console.log(`Found ${result.rows.length} materials with assets`);
  
  let downloaded = 0;
  let failed = 0;
  
  for (let i = 0; i < result.rows.length; i++) {
    const { st_id, assets } = result.rows[i];
    
    if (Array.isArray(assets)) {
      for (const asset of assets) {
        if (asset.type === 'Image' && asset.url) {
          const downloadResult = await downloadImage(asset.url, 'material', st_id);
          if (downloadResult.success) {
            downloaded++;
            process.stdout.write('.');
          } else {
            failed++;
          }
          await new Promise(r => setTimeout(r, 100));
        }
      }
    }
    
    if ((i + 1) % 100 === 0) {
      console.log(`\n  Progress: ${i + 1}/${result.rows.length}`);
    }
  }
  
  console.log(`\nMaterials: ${downloaded} downloaded, ${failed} failed`);
  return { downloaded, failed };
}

async function processEquipment() {
  console.log('\n=== Processing Equipment Images ===');
  
  const result = await pool.query(`
    SELECT st_id, assets 
    FROM raw.st_pricebook_equipment 
    WHERE assets IS NOT NULL AND jsonb_array_length(assets) > 0
      AND tenant_id = $1
  `, [TENANT_ID]);
  
  console.log(`Found ${result.rows.length} equipment with assets`);
  
  let downloaded = 0;
  let failed = 0;
  
  for (let i = 0; i < result.rows.length; i++) {
    const { st_id, assets } = result.rows[i];
    
    if (Array.isArray(assets)) {
      for (const asset of assets) {
        if (asset.type === 'Image' && asset.url) {
          const downloadResult = await downloadImage(asset.url, 'equipment', st_id);
          if (downloadResult.success) {
            downloaded++;
            process.stdout.write('.');
          } else {
            failed++;
          }
          await new Promise(r => setTimeout(r, 100));
        }
      }
    }
    
    if ((i + 1) % 100 === 0) {
      console.log(`\n  Progress: ${i + 1}/${result.rows.length}`);
    }
  }
  
  console.log(`\nEquipment: ${downloaded} downloaded, ${failed} failed`);
  return { downloaded, failed };
}

async function main() {
  console.log('========================================');
  console.log('Pricebook Image Download to PostgreSQL');
  console.log('========================================');
  console.log(`Tenant ID: ${TENANT_ID}`);
  console.log(`Database: ${DATABASE_URL?.split('@')[1] || 'configured'}`);
  console.log('');
  
  if (!CLIENT_ID || !CLIENT_SECRET || !APP_KEY) {
    console.error('ERROR: Missing ServiceTitan credentials');
    console.error('Required: SERVICE_TITAN_CLIENT_ID, SERVICE_TITAN_CLIENT_SECRET, SERVICE_TITAN_APP_KEY');
    process.exit(1);
  }
  
  if (!DATABASE_URL) {
    console.error('ERROR: Missing DATABASE_URL');
    process.exit(1);
  }
  
  const totals = { downloaded: 0, failed: 0 };
  
  // Process categories
  const catResults = await processCategories();
  totals.downloaded += catResults.downloaded;
  totals.failed += catResults.failed;
  
  // Process subcategories
  const subResults = await processSubcategories();
  totals.downloaded += subResults.downloaded;
  totals.failed += subResults.failed;
  
  // Process services
  const svcResults = await processServices();
  totals.downloaded += svcResults.downloaded;
  totals.failed += svcResults.failed;
  
  // Process materials
  const matResults = await processMaterials();
  totals.downloaded += matResults.downloaded;
  totals.failed += matResults.failed;
  
  // Process equipment
  const eqResults = await processEquipment();
  totals.downloaded += eqResults.downloaded;
  totals.failed += eqResults.failed;
  
  // Sync to master
  const masterCount = await syncToMaster();
  
  console.log('\n========================================');
  console.log('Download Complete!');
  console.log('========================================');
  console.log(`Total Downloaded: ${totals.downloaded}`);
  console.log(`Total Failed: ${totals.failed}`);
  console.log(`Master Table: ${masterCount} images`);
  
  await pool.end();
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
