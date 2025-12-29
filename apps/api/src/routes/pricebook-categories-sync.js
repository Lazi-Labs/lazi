/**
 * Pricebook Categories Sync Routes
 * Direct sync endpoints for categories (RAW → MASTER)
 */

import { Router } from 'express';
import pg from 'pg';
import config from '../config/index.js';

const { Pool } = pg;
const router = Router();

// Simple async handler wrapper
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

// ============================================================================
// POST /api/pricebook/categories/sync-to-master
// Sync categories from RAW to MASTER
// ============================================================================

router.post(
  '/sync-to-master',
  asyncHandler(async (req, res) => {
    const pool = getPool();
    const tenantId = getTenantId(req);

    console.log(`[CATEGORIES SYNC] Syncing RAW → MASTER for tenant ${tenantId}`);

    try {
      // First, fix the tenant_id type mismatch issue by casting
      const result = await pool.query(`
        INSERT INTO master.pricebook_categories (
          st_id, tenant_id, name, display_name, description, category_type,
          parent_st_id, is_active, st_created_on, st_modified_on, 
          created_at, updated_at, last_synced_at
        )
        SELECT
          r.st_id,
          r.tenant_id::text,  -- Cast bigint to text for MASTER table
          COALESCE(r.full_data->>'name', r.name),
          r.full_data->>'displayName',
          r.full_data->>'description',
          COALESCE(r.full_data->>'categoryType', r.category_type),
          (r.full_data->>'parentId')::bigint,
          COALESCE((r.full_data->>'active')::boolean, r.active, true),
          (r.full_data->>'createdOn')::timestamptz,
          (r.full_data->>'modifiedOn')::timestamptz,
          NOW(),
          NOW(),
          NOW()
        FROM raw.st_pricebook_categories r
        WHERE r.tenant_id = $1
        ON CONFLICT (st_id, tenant_id) DO UPDATE SET
          name = EXCLUDED.name,
          display_name = EXCLUDED.display_name,
          description = EXCLUDED.description,
          category_type = EXCLUDED.category_type,
          parent_st_id = EXCLUDED.parent_st_id,
          is_active = EXCLUDED.is_active,
          st_created_on = EXCLUDED.st_created_on,
          st_modified_on = EXCLUDED.st_modified_on,
          updated_at = NOW(),
          last_synced_at = NOW()
      `, [tenantId]);

      const syncedCount = result.rowCount;

      console.log(`[CATEGORIES SYNC] Completed: ${syncedCount} categories synced to MASTER`);

      res.json({
        success: true,
        synced: syncedCount,
        message: `Synced ${syncedCount} categories from RAW to MASTER`,
      });

    } catch (error) {
      console.error('[CATEGORIES SYNC] Error:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        detail: error.detail || null,
      });
    } finally {
      await pool.end();
    }
  })
);

// ============================================================================
// GET /api/pricebook/categories/stats
// Get category sync statistics
// ============================================================================

router.get(
  '/stats',
  asyncHandler(async (req, res) => {
    const pool = getPool();
    const tenantId = getTenantId(req);

    try {
      const rawStats = await pool.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE active = true) as active,
          COUNT(*) FILTER (WHERE active = false) as inactive
        FROM raw.st_pricebook_categories
        WHERE tenant_id = $1
      `, [tenantId]);

      const masterStats = await pool.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE is_active = true) as active,
          COUNT(*) FILTER (WHERE is_active = false) as inactive
        FROM master.pricebook_categories
        WHERE tenant_id = $1
      `, [tenantId]);

      res.json({
        raw: rawStats.rows[0],
        master: masterStats.rows[0],
      });

    } catch (error) {
      console.error('[CATEGORIES STATS] Error:', error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    } finally {
      await pool.end();
    }
  })
);

export default router;
