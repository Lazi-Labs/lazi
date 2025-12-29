/**
 * Pricebook Image Migration Routes
 * Endpoints for migrating images from ServiceTitan to S3
 */

import express from 'express';
import pg from 'pg';
import config from '../config/index.js';
import { uploadImage } from '../services/imageStorage.js';

const { Pool } = pg;
const router = express.Router();

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

function getTenantId(req) {
  return req.headers['x-tenant-id'] || process.env.SERVICE_TITAN_TENANT_ID || '3222348440';
}

function getPool() {
  const connectionString = config.database.url;
  return new Pool({
    connectionString,
    max: 10,
    ssl: connectionString?.includes('supabase') ? { rejectUnauthorized: false } : false,
  });
}

router.get('/migrate/status', asyncHandler(async (req, res) => {
  const pool = getPool();
  const tenantId = getTenantId(req);
  
  try {
    const stats = {};

    const servicesResult = await pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE s3_image_url IS NOT NULL) as migrated,
        COUNT(*) FILTER (WHERE s3_image_url IS NULL AND assets IS NOT NULL AND jsonb_array_length(assets) > 0) as pending,
        COUNT(*) FILTER (WHERE assets IS NULL OR jsonb_array_length(assets) = 0) as no_image
      FROM master.pricebook_services
      WHERE tenant_id = $1
    `, [tenantId]);
    stats.services = servicesResult.rows[0];

    const materialsResult = await pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE s3_image_url IS NOT NULL) as migrated,
        COUNT(*) FILTER (WHERE s3_image_url IS NULL AND image_url IS NOT NULL) as pending,
        COUNT(*) FILTER (WHERE image_url IS NULL) as no_image
      FROM master.pricebook_materials
      WHERE tenant_id = $1
    `, [tenantId]);
    stats.materials = materialsResult.rows[0];

    const equipmentResult = await pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE s3_image_url IS NOT NULL) as migrated,
        COUNT(*) FILTER (WHERE s3_image_url IS NULL AND image_url IS NOT NULL) as pending,
        COUNT(*) FILTER (WHERE image_url IS NULL) as no_image
      FROM master.pricebook_equipment
      WHERE tenant_id = $1
    `, [tenantId]);
    stats.equipment = equipmentResult.rows[0];

    const categoriesResult = await pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE s3_image_url IS NOT NULL) as migrated,
        COUNT(*) FILTER (WHERE s3_image_url IS NULL AND image_url IS NOT NULL) as pending,
        COUNT(*) FILTER (WHERE image_url IS NULL) as no_image
      FROM master.pricebook_categories
      WHERE tenant_id = $1
    `, [tenantId]);
    stats.categories = categoriesResult.rows[0];

    res.json({ success: true, tenant_id: tenantId, stats });
  } catch (error) {
    console.error('[MIGRATION STATUS] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    await pool.end();
  }
}));

router.post('/migrate/services', asyncHandler(async (req, res) => {
  const pool = getPool();
  const tenantId = getTenantId(req);
  const { limit = 50 } = req.body;

  try {
    const services = await pool.query(`
      SELECT st_id, name, assets
      FROM master.pricebook_services
      WHERE tenant_id = $1
        AND assets IS NOT NULL
        AND jsonb_array_length(assets) > 0
        AND s3_image_url IS NULL
      LIMIT $2
    `, [tenantId, limit]);

    const results = { migrated: 0, failed: 0, errors: [] };

    for (const service of services.rows) {
      try {
        const assets = service.assets;
        const imageUrl = assets[0]?.url;
        
        if (!imageUrl) continue;

        const fullUrl = imageUrl.startsWith('http') 
          ? imageUrl 
          : `https://go.servicetitan.com/${imageUrl}`;

        const response = await fetch(fullUrl, { redirect: 'follow' });
        
        if (!response.ok) {
          results.failed++;
          results.errors.push({ st_id: service.st_id, error: `HTTP ${response.status}` });
          continue;
        }

        const buffer = Buffer.from(await response.arrayBuffer());
        const contentType = response.headers.get('content-type') || 'image/jpeg';
        const ext = contentType.includes('png') ? 'png' : 'jpg';

        const s3Key = `${tenantId}/services/${service.st_id}.${ext}`;
        const s3Url = await uploadImage(s3Key, buffer, contentType);

        await pool.query(`
          UPDATE master.pricebook_services
          SET s3_image_url = $1, s3_image_key = $2, image_migrated_at = NOW()
          WHERE st_id = $3 AND tenant_id = $4
        `, [s3Url, s3Key, service.st_id, tenantId]);

        results.migrated++;
        console.log(`Migrated service ${service.st_id}: ${service.name}`);

      } catch (error) {
        results.failed++;
        results.errors.push({ st_id: service.st_id, error: error.message });
      }
    }

    res.json({
      success: true,
      message: `Migration complete: ${results.migrated} migrated, ${results.failed} failed`,
      ...results,
    });
  } catch (error) {
    console.error('[MIGRATION] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    await pool.end();
  }
}));

router.post('/migrate/materials', asyncHandler(async (req, res) => {
  const pool = getPool();
  const tenantId = getTenantId(req);
  const { limit = 50 } = req.body;

  try {
    const materials = await pool.query(`
      SELECT st_id, name, image_url
      FROM master.pricebook_materials
      WHERE tenant_id = $1
        AND image_url IS NOT NULL
        AND s3_image_url IS NULL
      LIMIT $2
    `, [tenantId, limit]);

    const results = { migrated: 0, failed: 0, errors: [] };

    for (const material of materials.rows) {
      try {
        const fullUrl = material.image_url.startsWith('http')
          ? material.image_url
          : `https://go.servicetitan.com/${material.image_url}`;

        const response = await fetch(fullUrl, { redirect: 'follow' });
        if (!response.ok) {
          results.failed++;
          continue;
        }

        const buffer = Buffer.from(await response.arrayBuffer());
        const contentType = response.headers.get('content-type') || 'image/jpeg';
        const ext = contentType.includes('png') ? 'png' : 'jpg';

        const s3Key = `${tenantId}/materials/${material.st_id}.${ext}`;
        const s3Url = await uploadImage(s3Key, buffer, contentType);

        await pool.query(`
          UPDATE master.pricebook_materials
          SET s3_image_url = $1, s3_image_key = $2, image_migrated_at = NOW()
          WHERE st_id = $3 AND tenant_id = $4
        `, [s3Url, s3Key, material.st_id, tenantId]);

        results.migrated++;
      } catch (error) {
        results.failed++;
        results.errors.push({ st_id: material.st_id, error: error.message });
      }
    }

    res.json({ success: true, ...results });
  } catch (error) {
    console.error('[MIGRATION] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    await pool.end();
  }
}));

router.post('/migrate/all', asyncHandler(async (req, res) => {
  res.json({
    success: true,
    message: 'Use individual migration endpoints for better control',
    endpoints: [
      'POST /api/pricebook/images/migrate/services',
      'POST /api/pricebook/images/migrate/materials',
      'POST /api/pricebook/images/migrate/equipment',
      'POST /api/pricebook/images/migrate/categories',
    ],
  });
}));

export default router;
