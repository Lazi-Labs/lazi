/**
 * Pricebook Image Migration Routes
 * Endpoints for migrating images from ServiceTitan to S3
 * Uses ServiceTitan official API: /pricebook/v2/tenant/{tenant}/images
 */

import express from 'express';
import pg from 'pg';
import config from '../config/index.js';
import { 
  uploadImage, 
  generateImageKey, 
  fetchImageFromST 
} from '../services/imageStorage.js';

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

router.get('/status', asyncHandler(async (req, res) => {
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
        COUNT(*) FILTER (WHERE s3_image_url IS NULL AND assets IS NOT NULL AND jsonb_array_length(assets) > 0) as pending,
        COUNT(*) FILTER (WHERE assets IS NULL OR jsonb_array_length(assets) = 0) as no_image
      FROM master.pricebook_materials
      WHERE tenant_id = $1
    `, [tenantId]);
    stats.materials = materialsResult.rows[0];

    const equipmentResult = await pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE s3_image_url IS NOT NULL) as migrated,
        COUNT(*) FILTER (WHERE s3_image_url IS NULL AND assets IS NOT NULL AND jsonb_array_length(assets) > 0) as pending,
        COUNT(*) FILTER (WHERE assets IS NULL OR jsonb_array_length(assets) = 0) as no_image
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

    const subcategoriesResult = await pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE s3_image_url IS NOT NULL) as migrated,
        COUNT(*) FILTER (WHERE s3_image_url IS NULL AND image_url IS NOT NULL AND image_url != '') as pending,
        COUNT(*) FILTER (WHERE image_url IS NULL OR image_url = '') as no_image
      FROM master.pricebook_subcategories
      WHERE tenant_id = $1
    `, [tenantId]);
    stats.subcategories = subcategoriesResult.rows[0];

    res.json({ success: true, tenant_id: tenantId, stats });
  } catch (error) {
    console.error('[MIGRATION STATUS] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    await pool.end();
  }
}));

router.post('/services', asyncHandler(async (req, res) => {
  const pool = getPool();
  const tenantId = getTenantId(req);
  const { limit = 25 } = req.body;

  try {
    const services = await pool.query(`
      SELECT st_id, name, assets
      FROM master.pricebook_services
      WHERE tenant_id = $1
        AND assets IS NOT NULL
        AND jsonb_array_length(assets) > 0
        AND (s3_image_url IS NULL OR s3_image_url = '')
      ORDER BY st_id
      LIMIT $2
    `, [tenantId, limit]);

    const results = { migrated: 0, failed: 0, skipped: 0, errors: [] };

    for (const service of services.rows) {
      try {
        const assets = service.assets;
        const imagePath = assets[0]?.url;
        
        if (!imagePath) {
          results.skipped++;
          continue;
        }

        if (!imagePath.startsWith('Images/')) {
          results.skipped++;
          results.errors.push({ st_id: service.st_id, error: `Invalid path: ${imagePath}` });
          continue;
        }

        console.log(`Migrating service ${service.st_id}: ${service.name}`);

        const { buffer, contentType } = await fetchImageFromST(tenantId, imagePath);

        const ext = contentType.includes('png') ? 'png' : 
                    contentType.includes('webp') ? 'webp' : 'jpg';

        const s3Key = generateImageKey(tenantId, 'services', service.st_id, ext);
        const s3Url = await uploadImage(s3Key, buffer, contentType);

        await pool.query(`
          UPDATE master.pricebook_services
          SET s3_image_url = $1, s3_image_key = $2, image_migrated_at = NOW()
          WHERE st_id = $3 AND tenant_id = $4
        `, [s3Url, s3Key, service.st_id, tenantId]);

        results.migrated++;
        console.log(`✓ Migrated service ${service.st_id} → ${s3Key}`);

      } catch (error) {
        results.failed++;
        results.errors.push({ st_id: service.st_id, name: service.name, error: error.message });
        console.error(`✗ Failed service ${service.st_id}: ${error.message}`);
      }
    }

    res.json({
      success: true,
      message: `Migration complete: ${results.migrated} migrated, ${results.failed} failed, ${results.skipped} skipped`,
      ...results,
    });
  } catch (error) {
    console.error('[MIGRATION] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    await pool.end();
  }
}));

router.post('/materials', asyncHandler(async (req, res) => {
  const pool = getPool();
  const tenantId = getTenantId(req);
  const { limit = 25 } = req.body;

  try {
    const materials = await pool.query(`
      SELECT st_id, name, assets
      FROM master.pricebook_materials
      WHERE tenant_id = $1
        AND assets IS NOT NULL
        AND jsonb_array_length(assets) > 0
        AND (s3_image_url IS NULL OR s3_image_url = '')
      ORDER BY st_id
      LIMIT $2
    `, [tenantId, limit]);

    const results = { migrated: 0, failed: 0, skipped: 0, errors: [] };

    for (const material of materials.rows) {
      try {
        const assets = material.assets;
        const imagePath = assets[0]?.url;
        
        if (!imagePath) {
          results.skipped++;
          continue;
        }

        if (!imagePath.startsWith('Images/')) {
          results.skipped++;
          results.errors.push({ st_id: material.st_id, error: `Invalid path: ${imagePath}` });
          continue;
        }

        console.log(`Migrating material ${material.st_id}: ${material.name}`);

        const { buffer, contentType } = await fetchImageFromST(tenantId, imagePath);

        const ext = contentType.includes('png') ? 'png' : 
                    contentType.includes('webp') ? 'webp' : 'jpg';

        const s3Key = generateImageKey(tenantId, 'materials', material.st_id, ext);
        const s3Url = await uploadImage(s3Key, buffer, contentType);

        await pool.query(`
          UPDATE master.pricebook_materials
          SET s3_image_url = $1, s3_image_key = $2, image_migrated_at = NOW()
          WHERE st_id = $3 AND tenant_id = $4
        `, [s3Url, s3Key, material.st_id, tenantId]);

        results.migrated++;
        console.log(`✓ Migrated material ${material.st_id} → ${s3Key}`);

      } catch (error) {
        results.failed++;
        results.errors.push({ st_id: material.st_id, name: material.name, error: error.message });
        console.error(`✗ Failed material ${material.st_id}: ${error.message}`);
      }
    }

    res.json({
      success: true,
      message: `Migration complete: ${results.migrated} migrated, ${results.failed} failed, ${results.skipped} skipped`,
      ...results,
    });
  } catch (error) {
    console.error('[MIGRATION] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    await pool.end();
  }
}));

// POST /api/pricebook/images/migrate/equipment
router.post('/equipment', asyncHandler(async (req, res) => {
  const pool = getPool();
  const tenantId = getTenantId(req);
  const { limit = 100 } = req.body;

  try {
    // Get equipment with images that haven't been migrated
    // Equipment uses 'assets' JSONB column like services
    const equipment = await pool.query(`
      SELECT st_id, name, assets
      FROM master.pricebook_equipment
      WHERE tenant_id = $1
        AND assets IS NOT NULL
        AND jsonb_array_length(assets) > 0
        AND (s3_image_url IS NULL OR s3_image_url = '')
      ORDER BY st_id
      LIMIT $2
    `, [tenantId, limit]);

    const results = { migrated: 0, failed: 0, skipped: 0, errors: [] };

    for (const item of equipment.rows) {
      try {
        const imagePath = item.assets[0]?.url;
        if (!imagePath || !imagePath.startsWith('Images/')) {
          results.skipped++;
          continue;
        }

        const { buffer, contentType } = await fetchImageFromST(tenantId, imagePath);
        const ext = contentType.includes('png') ? 'png' : 'jpg';
        const s3Key = generateImageKey(tenantId, 'equipment', item.st_id, ext);
        const s3Url = await uploadImage(s3Key, buffer, contentType);

        await pool.query(`
          UPDATE master.pricebook_equipment
          SET s3_image_url = $1, s3_image_key = $2, image_migrated_at = NOW()
          WHERE st_id = $3 AND tenant_id = $4
        `, [s3Url, s3Key, item.st_id, tenantId]);

        results.migrated++;
      } catch (error) {
        console.error(`[EQUIPMENT MIGRATION] Failed for ${item.st_id}:`, error.message);
        results.failed++;
        results.errors.push({ st_id: item.st_id, error: error.message });
      }
    }

    res.json({
      success: true,
      message: `Migration complete: ${results.migrated} migrated, ${results.failed} failed, ${results.skipped} skipped`,
      ...results,
    });
  } catch (error) {
    console.error('[EQUIPMENT MIGRATION] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    await pool.end();
  }
}));

// POST /api/pricebook/images/migrate/categories
router.post('/categories', asyncHandler(async (req, res) => {
  const pool = getPool();
  const tenantId = getTenantId(req);
  const { limit = 100 } = req.body;

  try {
    // Categories use 'image_url' column (string), not assets JSONB
    const categories = await pool.query(`
      SELECT st_id, name, image_url
      FROM master.pricebook_categories
      WHERE tenant_id = $1
        AND image_url IS NOT NULL
        AND image_url != ''
        AND image_url LIKE 'Images/%'
        AND (s3_image_url IS NULL OR s3_image_url = '')
      ORDER BY st_id
      LIMIT $2
    `, [tenantId, limit]);

    const results = { migrated: 0, failed: 0, skipped: 0, errors: [] };

    for (const category of categories.rows) {
      try {
        const { buffer, contentType } = await fetchImageFromST(tenantId, category.image_url);
        const ext = contentType.includes('png') ? 'png' : 'jpg';
        const s3Key = generateImageKey(tenantId, 'categories', category.st_id, ext);
        const s3Url = await uploadImage(s3Key, buffer, contentType);

        await pool.query(`
          UPDATE master.pricebook_categories
          SET s3_image_url = $1, s3_image_key = $2, image_migrated_at = NOW()
          WHERE st_id = $3 AND tenant_id = $4
        `, [s3Url, s3Key, category.st_id, tenantId]);

        results.migrated++;
      } catch (error) {
        console.error(`[CATEGORY MIGRATION] Failed for ${category.st_id}:`, error.message);
        results.failed++;
        results.errors.push({ st_id: category.st_id, error: error.message });
      }
    }

    res.json({
      success: true,
      message: `Migration complete: ${results.migrated} migrated, ${results.failed} failed, ${results.skipped} skipped`,
      ...results,
    });
  } catch (error) {
    console.error('[CATEGORY MIGRATION] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    await pool.end();
  }
}));

// POST /api/pricebook/images/migrate/subcategories
router.post('/subcategories', asyncHandler(async (req, res) => {
  const pool = getPool();
  const tenantId = getTenantId(req);
  const { limit = 100 } = req.body;

  try {
    // Get subcategories with images that haven't been migrated
    const subcategories = await pool.query(`
      SELECT st_id, name, image_url, depth, path
      FROM master.pricebook_subcategories
      WHERE tenant_id = $1
        AND image_url IS NOT NULL
        AND image_url != ''
        AND image_url LIKE 'Images/%'
        AND (s3_image_url IS NULL OR s3_image_url = '')
      ORDER BY depth, st_id
      LIMIT $2
    `, [tenantId, limit]);

    const results = { migrated: 0, failed: 0, skipped: 0, errors: [] };

    for (const subcat of subcategories.rows) {
      try {
        const { buffer, contentType } = await fetchImageFromST(tenantId, subcat.image_url);
        const ext = contentType.includes('png') ? 'png' : 'jpg';
        const s3Key = generateImageKey(tenantId, 'subcategories', subcat.st_id, ext);
        const s3Url = await uploadImage(s3Key, buffer, contentType);

        await pool.query(`
          UPDATE master.pricebook_subcategories
          SET s3_image_url = $1, s3_image_key = $2, image_migrated_at = NOW()
          WHERE st_id = $3 AND tenant_id = $4
        `, [s3Url, s3Key, subcat.st_id, tenantId]);

        results.migrated++;
      } catch (error) {
        console.error(`[SUBCATEGORY MIGRATION] Failed for ${subcat.st_id}:`, error.message);
        results.failed++;
        results.errors.push({ st_id: subcat.st_id, error: error.message });
      }
    }

    res.json({
      success: true,
      message: `Migration complete: ${results.migrated} migrated, ${results.failed} failed, ${results.skipped} skipped`,
      ...results,
    });
  } catch (error) {
    console.error('[SUBCATEGORY MIGRATION] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    await pool.end();
  }
}));

router.get('/test-st-connection', asyncHandler(async (req, res) => {
  const pool = getPool();
  const tenantId = getTenantId(req);

  try {
    const sample = await pool.query(`
      SELECT st_id, name, assets
      FROM master.pricebook_services
      WHERE tenant_id = $1
        AND assets IS NOT NULL
        AND jsonb_array_length(assets) > 0
      LIMIT 1
    `, [tenantId]);

    if (sample.rows.length === 0) {
      return res.json({ success: false, error: 'No services with images found' });
    }

    const service = sample.rows[0];
    const imagePath = service.assets[0]?.url;

    const { buffer, contentType } = await fetchImageFromST(tenantId, imagePath);

    res.json({
      success: true,
      message: 'ServiceTitan image API connection successful!',
      test: {
        service_id: service.st_id,
        service_name: service.name,
        image_path: imagePath,
        image_size: buffer.length,
        content_type: contentType,
      }
    });
  } catch (error) {
    res.json({
      success: false,
      error: error.message,
    });
  } finally {
    await pool.end();
  }
}));

export default router;
