import pg from 'pg';
import config from '../config/index.js';

const { Pool } = pg;

function getPool() {
  const connectionString = config.database.url;
  return new Pool({
    connectionString,
    max: 10,
    ssl: connectionString?.includes('supabase') ? { rejectUnauthorized: false } : false,
  });
}

/**
 * Image Resolution Priority:
 * 1. CRM custom_image_url (user uploaded custom image)
 * 2. MASTER s3_image_url (migrated from ServiceTitan)
 * 3. MASTER assets[0].url (original ServiceTitan URL)
 * 4. null (no image)
 */

const ENTITY_CONFIG = {
  services: {
    masterTable: 'master.pricebook_services',
    crmTable: 'crm.pricebook_service_edits',
    stImageField: "assets->0->>'url'",
  },
  materials: {
    masterTable: 'master.pricebook_materials',
    crmTable: 'crm.pricebook_material_edits',
    stImageField: "image_url",
  },
  equipment: {
    masterTable: 'master.pricebook_equipment',
    crmTable: 'crm.pricebook_equipment_edits',
    stImageField: "image_url",
  },
  categories: {
    masterTable: 'master.pricebook_categories',
    crmTable: 'crm.pricebook_category_edits',
    stImageField: "image_url",
  },
};

/**
 * Resolve image URL for a single entity
 */
export async function resolveImageUrl(entityType, stId, tenantId) {
  const pool = getPool();
  try {
    const config = ENTITY_CONFIG[entityType];
    if (!config) throw new Error(`Unknown entity type: ${entityType}`);

    const query = `
      SELECT 
        m.st_id,
        m.s3_image_url as migrated_url,
        m.${config.stImageField} as original_url,
        e.custom_image_url,
        e.image_deleted
      FROM ${config.masterTable} m
      LEFT JOIN ${config.crmTable} e ON m.st_id = e.st_id AND m.tenant_id = e.tenant_id
      WHERE m.st_id = $1 AND m.tenant_id = $2
    `;

    const result = await pool.query(query, [stId, tenantId]);
    
    if (result.rows.length === 0) return null;
    
    const row = result.rows[0];
    
    // If user explicitly deleted the image
    if (row.image_deleted) return null;
    
    // Priority: CRM custom → S3 migrated → ST original
    return row.custom_image_url || row.migrated_url || row.original_url || null;
  } finally {
    await pool.end();
  }
}

/**
 * Resolve image URLs for multiple entities (batch)
 */
export async function resolveImageUrls(entityType, stIds, tenantId) {
  const pool = getPool();
  try {
    const config = ENTITY_CONFIG[entityType];
    if (!config) throw new Error(`Unknown entity type: ${entityType}`);

    const query = `
      SELECT 
        m.st_id,
        m.s3_image_url as migrated_url,
        m.${config.stImageField} as original_url,
        e.custom_image_url,
        e.image_deleted
      FROM ${config.masterTable} m
      LEFT JOIN ${config.crmTable} e ON m.st_id = e.st_id AND m.tenant_id = e.tenant_id
      WHERE m.st_id = ANY($1) AND m.tenant_id = $2
    `;

    const result = await pool.query(query, [stIds, tenantId]);
    
    const imageMap = {};
    for (const row of result.rows) {
      if (row.image_deleted) {
        imageMap[row.st_id] = null;
      } else {
        imageMap[row.st_id] = row.custom_image_url || row.migrated_url || row.original_url || null;
      }
    }
    
    return imageMap;
  } finally {
    await pool.end();
  }
}

/**
 * Get image info with all URLs for debugging/admin
 */
export async function getImageInfo(entityType, stId, tenantId) {
  const pool = getPool();
  try {
    const config = ENTITY_CONFIG[entityType];
    if (!config) throw new Error(`Unknown entity type: ${entityType}`);

    const query = `
      SELECT 
        m.st_id,
        m.name,
        m.s3_image_url as migrated_url,
        m.s3_image_key,
        m.image_migrated_at,
        m.${config.stImageField} as original_url,
        e.custom_image_url,
        e.image_deleted,
        e.edited_at as custom_image_uploaded_at
      FROM ${config.masterTable} m
      LEFT JOIN ${config.crmTable} e ON m.st_id = e.st_id AND m.tenant_id = e.tenant_id
      WHERE m.st_id = $1 AND m.tenant_id = $2
    `;

    const result = await pool.query(query, [stId, tenantId]);
    
    if (result.rows.length === 0) return null;
    
    const row = result.rows[0];
    
    return {
      st_id: row.st_id,
      name: row.name,
      resolved_url: row.image_deleted ? null : (row.custom_image_url || row.migrated_url || row.original_url),
      sources: {
        custom: row.custom_image_url,
        migrated: row.migrated_url,
        original: row.original_url,
      },
      s3_key: row.s3_image_key,
      is_deleted: row.image_deleted,
      migrated_at: row.image_migrated_at,
      custom_uploaded_at: row.custom_image_uploaded_at,
    };
  } finally {
    await pool.end();
  }
}

export default {
  resolveImageUrl,
  resolveImageUrls,
  getImageInfo,
};
