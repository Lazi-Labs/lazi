import express from 'express';
import multer from 'multer';
import pg from 'pg';
import config from '../config/index.js';
import { uploadImage, deleteImage, generateImageKey } from '../services/imageStorage.js';
import { resolveImageUrl, resolveImageUrls, getImageInfo } from '../services/imageResolver.js';

const { Pool } = pg;
const router = express.Router();

function getPool() {
  const connectionString = config.database.url;
  return new Pool({
    connectionString,
    max: 10,
    ssl: connectionString?.includes('supabase') ? { rejectUnauthorized: false } : false,
  });
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, WebP, and GIF allowed.'));
    }
  },
});

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

const VALID_ENTITY_TYPES = ['services', 'materials', 'equipment', 'categories'];
const CRM_TABLES = {
  services: 'crm.pricebook_service_edits',
  materials: 'crm.pricebook_material_edits',
  equipment: 'crm.pricebook_equipment_edits',
  categories: 'crm.pricebook_category_edits',
};

function getTenantId(req) {
  return req.headers['x-tenant-id'] || process.env.SERVICE_TITAN_TENANT_ID || '3222348440';
}

router.get('/:entityType/:stId', asyncHandler(async (req, res) => {
  const { entityType, stId } = req.params;
  const tenantId = getTenantId(req);

  if (!VALID_ENTITY_TYPES.includes(entityType)) {
    return res.status(400).json({ success: false, error: 'Invalid entity type' });
  }

  const imageUrl = await resolveImageUrl(entityType, stId, tenantId);
  
  res.json({
    success: true,
    st_id: stId,
    entity_type: entityType,
    image_url: imageUrl,
  });
}));

router.get('/:entityType/:stId/info', asyncHandler(async (req, res) => {
  const { entityType, stId } = req.params;
  const tenantId = getTenantId(req);

  if (!VALID_ENTITY_TYPES.includes(entityType)) {
    return res.status(400).json({ success: false, error: 'Invalid entity type' });
  }

  const info = await getImageInfo(entityType, stId, tenantId);
  
  if (!info) {
    return res.status(404).json({ success: false, error: 'Entity not found' });
  }
  
  res.json({ success: true, ...info });
}));

router.post('/:entityType/batch', asyncHandler(async (req, res) => {
  const { entityType } = req.params;
  const { st_ids } = req.body;
  const tenantId = getTenantId(req);

  if (!VALID_ENTITY_TYPES.includes(entityType)) {
    return res.status(400).json({ success: false, error: 'Invalid entity type' });
  }

  if (!Array.isArray(st_ids) || st_ids.length === 0) {
    return res.status(400).json({ success: false, error: 'st_ids array required' });
  }

  if (st_ids.length > 100) {
    return res.status(400).json({ success: false, error: 'Max 100 IDs per request' });
  }

  const imageMap = await resolveImageUrls(entityType, st_ids, tenantId);
  
  res.json({
    success: true,
    entity_type: entityType,
    images: imageMap,
  });
}));

router.post('/:entityType/:stId/upload', upload.single('image'), asyncHandler(async (req, res) => {
  const { entityType, stId } = req.params;
  const tenantId = getTenantId(req);
  const userId = req.headers['x-user-id'] || 'unknown';

  if (!VALID_ENTITY_TYPES.includes(entityType)) {
    return res.status(400).json({ success: false, error: 'Invalid entity type' });
  }

  if (!req.file) {
    return res.status(400).json({ success: false, error: 'No image file provided' });
  }

  const s3Key = generateImageKey(tenantId, `${entityType}/custom`, req.file.originalname);
  const s3Url = await uploadImage(s3Key, req.file.buffer, req.file.mimetype);
  
  const pool = getPool();
  try {
    const crmTable = CRM_TABLES[entityType];
    await pool.query(`
      INSERT INTO ${crmTable} (tenant_id, st_id, custom_image_url, image_deleted, edited_by, edited_at)
      VALUES ($1, $2, $3, FALSE, $4, NOW())
      ON CONFLICT (tenant_id, st_id) DO UPDATE SET
        custom_image_url = $3,
        image_deleted = FALSE,
        edited_by = $4,
        edited_at = NOW()
    `, [tenantId, stId, s3Url, userId]);

    res.json({
      success: true,
      message: 'Image uploaded successfully',
      st_id: stId,
      entity_type: entityType,
      image_url: s3Url,
      s3_key: s3Key,
    });
  } finally {
    await pool.end();
  }
}));

router.delete('/:entityType/:stId', asyncHandler(async (req, res) => {
  const { entityType, stId } = req.params;
  const tenantId = getTenantId(req);
  const userId = req.headers['x-user-id'] || 'unknown';
  const { delete_from_s3 } = req.query;

  if (!VALID_ENTITY_TYPES.includes(entityType)) {
    return res.status(400).json({ success: false, error: 'Invalid entity type' });
  }

  const pool = getPool();
  try {
    const crmTable = CRM_TABLES[entityType];
    const existing = await pool.query(
      `SELECT custom_image_url FROM ${crmTable} WHERE tenant_id = $1 AND st_id = $2`,
      [tenantId, stId]
    );

    await pool.query(`
      INSERT INTO ${crmTable} (tenant_id, st_id, image_deleted, custom_image_url, edited_by, edited_at)
      VALUES ($1, $2, TRUE, NULL, $3, NOW())
      ON CONFLICT (tenant_id, st_id) DO UPDATE SET
        image_deleted = TRUE,
        custom_image_url = NULL,
        edited_by = $3,
        edited_at = NOW()
    `, [tenantId, stId, userId]);

    if (delete_from_s3 === 'true' && existing.rows[0]?.custom_image_url) {
      const url = existing.rows[0].custom_image_url;
      const key = url.split('.amazonaws.com/')[1];
      if (key) {
        try {
          await deleteImage(key);
        } catch (e) {
          console.error('Failed to delete from S3:', e);
        }
      }
    }

    res.json({
      success: true,
      message: 'Image removed',
      st_id: stId,
      entity_type: entityType,
    });
  } finally {
    await pool.end();
  }
}));

router.post('/:entityType/:stId/restore', asyncHandler(async (req, res) => {
  const { entityType, stId } = req.params;
  const tenantId = getTenantId(req);
  const userId = req.headers['x-user-id'] || 'unknown';

  if (!VALID_ENTITY_TYPES.includes(entityType)) {
    return res.status(400).json({ success: false, error: 'Invalid entity type' });
  }

  const pool = getPool();
  try {
    const crmTable = CRM_TABLES[entityType];
    
    await pool.query(`
      UPDATE ${crmTable}
      SET custom_image_url = NULL,
          image_deleted = FALSE,
          edited_by = $3,
          edited_at = NOW()
      WHERE tenant_id = $1 AND st_id = $2
    `, [tenantId, stId, userId]);

    const imageUrl = await resolveImageUrl(entityType, stId, tenantId);

    res.json({
      success: true,
      message: 'Image restored to original',
      st_id: stId,
      entity_type: entityType,
      image_url: imageUrl,
    });
  } finally {
    await pool.end();
  }
}));

export default router;
