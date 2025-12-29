/**
 * Pricebook Materials Routes
 * Handles materials sync from ServiceTitan to RAW and RAW to MASTER
 */

import { Router } from 'express';
import pg from 'pg';
import config from '../config/index.js';
import { stRequest } from '../services/stClient.js';

const { Pool } = pg;
const router = Router();

// Simple async handler wrapper
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

function getPool() {
  const connectionString = config.database.url;
  return new Pool({
    connectionString,
    max: 10,
    ssl: connectionString?.includes('supabase') ? { rejectUnauthorized: false } : false,
  });
}

function getTenantId(req) {
  return req.headers['x-tenant-id'] || process.env.SERVICE_TITAN_TENANT_ID || '3222348440';
}

// ============================================================================
// GET /api/pricebook/materials
// List materials with filtering, pagination, and CRM override support
// ============================================================================

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const pool = getPool();
    const tenantId = getTenantId(req);
    const {
      active = 'true',
      search,
      category_id,
      sort_by = 'name',
      sort_order = 'asc',
      page = '1',
      limit = '100',
    } = req.query;

    try {
      // Build query with CRM override support
      const params = [tenantId];
      let whereConditions = ['m.tenant_id = $1'];

      // Active filter with CRM override (default: show only active)
      if (active === 'true') {
        whereConditions.push('COALESCE(o.override_active, m.active) = true');
      } else if (active === 'false') {
        whereConditions.push('COALESCE(o.override_active, m.active) = false');
      }
      // If active === 'all', don't filter by active status

      // Search filter with CRM override
      if (search) {
        params.push(`%${search}%`);
        whereConditions.push(`(
          COALESCE(o.override_name, m.name) ILIKE $${params.length} OR 
          m.code ILIKE $${params.length} OR 
          m.display_name ILIKE $${params.length}
        )`);
      }

      // Category filter (materials use categories JSONB array of IDs like [61878437])
      // Supports comma-separated category IDs for hierarchical filtering
      if (category_id) {
        const categoryIds = category_id.toString().split(',').map(id => id.trim()).filter(id => id);
        
        if (categoryIds.length > 1) {
          // Build OR condition for multiple categories - check if any category ID is in the array
          const categoryConditions = categoryIds.map((id) => {
            params.push(parseInt(id, 10));
            return `m.categories @> $${params.length}::jsonb`;
          });
          whereConditions.push(`(${categoryConditions.join(' OR ')})`);
        } else {
          // Single category - check if the ID is in the categories array
          params.push(parseInt(categoryIds[0], 10));
          whereConditions.push(`m.categories @> $${params.length}::jsonb`);
        }
      }

      const whereClause = whereConditions.join(' AND ');

      // Validate sort
      const allowedSorts = ['name', 'code', 'price', 'cost', 'created_at', 'updated_at'];
      const safeSort = allowedSorts.includes(sort_by) ? sort_by : 'name';
      const safeOrder = sort_order.toLowerCase() === 'desc' ? 'DESC' : 'ASC';

      // Get total count with CRM override join
      const countResult = await pool.query(
        `SELECT COUNT(*) 
         FROM master.pricebook_materials m
         LEFT JOIN crm.pricebook_overrides o 
           ON o.st_pricebook_id = m.st_id 
           AND o.tenant_id = m.tenant_id
           AND o.item_type = 'material'
         WHERE ${whereClause}`,
        params
      );
      const total = parseInt(countResult.rows[0].count, 10);

      // Get materials with pagination and CRM overrides
      const pageNum = Math.max(1, parseInt(page, 10));
      const limitNum = Math.min(500, Math.max(1, parseInt(limit, 10)));
      const offset = (pageNum - 1) * limitNum;

      params.push(limitNum, offset);

      const query = `
        SELECT 
          m.id,
          m.st_id,
          m.code,
          COALESCE(o.override_name, m.name) as name,
          m.display_name,
          COALESCE(o.override_description, m.description) as description,
          COALESCE(o.override_price, m.price) as price,
          m.member_price,
          m.add_on_price,
          COALESCE(o.override_cost, m.cost) as cost,
          COALESCE(o.override_active, m.active) as active,
          m.taxable,
          m.unit_of_measure,
          m.account,
          COALESCE(o.override_image_url, m.s3_image_url) as image_url,
          m.categories,
          m.primary_vendor,
          m.other_vendors,
          m.st_created_on,
          m.st_modified_on,
          m.created_at,
          m.updated_at,
          o.id as override_id,
          o.pending_sync as has_pending_changes,
          o.internal_notes,
          o.preferred_vendor,
          o.reorder_threshold,
          o.custom_tags
        FROM master.pricebook_materials m
        LEFT JOIN crm.pricebook_overrides o 
          ON o.st_pricebook_id = m.st_id 
          AND o.tenant_id = m.tenant_id
          AND o.item_type = 'material'
        WHERE ${whereClause}
        ORDER BY COALESCE(o.override_name, m.name) ${safeOrder}
        LIMIT $${params.length - 1} OFFSET $${params.length}
      `;

      const result = await pool.query(query, params);

      res.json({
        data: result.rows,
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      });
    } finally {
      await pool.end();
    }
  })
);

// ============================================================================
// GET /api/pricebook/materials/:stId
// Get single material by ServiceTitan ID with CRM overrides
// ============================================================================

router.get(
  '/:stId',
  asyncHandler(async (req, res) => {
    const pool = getPool();
    const tenantId = getTenantId(req);
    const { stId } = req.params;

    try {
      const result = await pool.query(`
        SELECT 
          m.*,
          COALESCE(o.override_name, m.name) as name,
          COALESCE(o.override_description, m.description) as description,
          COALESCE(o.override_price, m.price) as price,
          COALESCE(o.override_cost, m.cost) as cost,
          COALESCE(o.override_active, m.active) as active,
          COALESCE(o.override_image_url, m.s3_image_url) as image_url,
          o.id as override_id,
          o.pending_sync as has_pending_changes,
          o.internal_notes,
          o.preferred_vendor as override_preferred_vendor,
          o.reorder_threshold,
          o.custom_tags
        FROM master.pricebook_materials m
        LEFT JOIN crm.pricebook_overrides o 
          ON o.st_pricebook_id = m.st_id 
          AND o.tenant_id = m.tenant_id
          AND o.item_type = 'material'
        WHERE m.st_id = $1 AND m.tenant_id = $2
      `, [parseInt(stId, 10), tenantId]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Material not found' });
      }

      res.json(result.rows[0]);
    } finally {
      await pool.end();
    }
  })
);

// ============================================================================
// POST /api/pricebook/materials/sync-from-st
// Fetch materials from ServiceTitan API and store in RAW table
// ============================================================================

router.post(
  '/sync-from-st',
  asyncHandler(async (req, res) => {
    const pool = getPool();
    const tenantId = getTenantId(req);

    console.log(`[MATERIALS SYNC] Fetching from ServiceTitan for tenant ${tenantId}`);

    try {
      let allMaterials = [];
      let page = 1;
      let hasMore = true;
      const pageSize = 500;

      // Fetch all pages
      while (hasMore) {
        console.log(`[MATERIALS SYNC] Fetching page ${page}...`);
        
        const stApiUrl = `https://api.servicetitan.io/pricebook/v2/tenant/${tenantId}/materials`;
        const response = await stRequest(stApiUrl, {
          method: 'GET',
          query: {
            active: 'any',
            page: page,
            pageSize: pageSize,
          },
        });

        if (!response.data || !response.data.data) {
          console.log(`[MATERIALS SYNC] Invalid response on page ${page}`);
          break;
        }

        const materials = response.data.data;
        allMaterials = allMaterials.concat(materials);
        
        console.log(`[MATERIALS SYNC] Page ${page}: ${materials.length} materials (total: ${allMaterials.length})`);

        // Check if there are more pages
        hasMore = response.data.hasMore || materials.length === pageSize;
        page++;

        // Safety limit to prevent infinite loops
        if (page > 50) {
          console.log(`[MATERIALS SYNC] Reached page limit (50), stopping`);
          break;
        }
      }

      console.log(`[MATERIALS SYNC] Fetched ${allMaterials.length} total materials from ${page - 1} pages`);

      let insertedCount = 0;

      // Insert/update each material in RAW table
      for (const material of allMaterials) {
        const result = await pool.query(`
          INSERT INTO raw.st_pricebook_materials (
            st_id, tenant_id, code, display_name, description,
            cost, price, member_price, add_on_price, hours,
            unit_of_measure, taxable, active,
            categories, primary_vendor, other_vendors,
            created_on, modified_on, full_data, fetched_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
            $11, $12, $13, $14, $15, $16, $17, $18, $19, NOW()
          )
          ON CONFLICT (st_id, tenant_id) DO UPDATE SET
            code = EXCLUDED.code,
            display_name = EXCLUDED.display_name,
            description = EXCLUDED.description,
            cost = EXCLUDED.cost,
            price = EXCLUDED.price,
            member_price = EXCLUDED.member_price,
            add_on_price = EXCLUDED.add_on_price,
            hours = EXCLUDED.hours,
            unit_of_measure = EXCLUDED.unit_of_measure,
            taxable = EXCLUDED.taxable,
            active = EXCLUDED.active,
            categories = EXCLUDED.categories,
            primary_vendor = EXCLUDED.primary_vendor,
            other_vendors = EXCLUDED.other_vendors,
            modified_on = EXCLUDED.modified_on,
            full_data = EXCLUDED.full_data,
            fetched_at = NOW()
        `, [
          material.id,
          tenantId,
          material.code || null,
          material.displayName || material.name || null,
          material.description || null,
          material.cost || 0,
          material.price || 0,
          material.memberPrice || 0,
          material.addOnPrice || 0,
          material.hours || 0,
          material.unitOfMeasure || null,
          material.taxable !== undefined ? material.taxable : true,
          material.active !== undefined ? material.active : true,
          JSON.stringify(material.categories || []),
          JSON.stringify(material.primaryVendor || null),
          JSON.stringify(material.otherVendors || []),
          material.createdOn || null,
          material.modifiedOn || null,
          JSON.stringify(material),
        ]);

        if (result.rowCount > 0) {
          insertedCount++;
        }
      }

      console.log(`[MATERIALS SYNC] Completed: ${insertedCount} materials synced to RAW table`);

      res.json({
        success: true,
        synced: insertedCount,
        total: allMaterials.length,
        pages: page - 1,
        message: `Synced ${insertedCount} materials from ServiceTitan to RAW table (${page - 1} pages)`,
      });

    } catch (error) {
      console.error('[MATERIALS SYNC] Error:', error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    } finally {
      await pool.end();
    }
  })
);

// ============================================================================
// POST /api/pricebook/materials/sync-to-master
// Sync materials from RAW to MASTER table
// ============================================================================

router.post(
  '/sync-to-master',
  asyncHandler(async (req, res) => {
    const pool = getPool();
    const tenantId = getTenantId(req);

    console.log(`[MATERIALS SYNC] Starting RAW → MASTER sync for tenant ${tenantId}`);

    try {
      const result = await pool.query(`
        INSERT INTO master.pricebook_materials (
          st_id, tenant_id, code, name, display_name, description,
          cost, price, member_price, add_on_price, unit_of_measure,
          taxable, active, account, categories, assets,
          primary_vendor, other_vendors, st_created_on, st_modified_on, last_synced_at
        )
        SELECT 
          r.st_id,
          r.tenant_id::text,
          r.code,
          COALESCE(r.display_name, 'Unnamed Material'),
          r.display_name,
          r.description,
          COALESCE(r.cost, 0),
          COALESCE(r.price, 0),
          COALESCE(r.member_price, 0),
          COALESCE(r.add_on_price, 0),
          r.unit_of_measure,
          COALESCE(r.taxable, true),
          COALESCE(r.active, true),
          r.full_data->>'account',
          r.categories,
          r.full_data->'assets',
          r.primary_vendor,
          r.other_vendors,
          r.created_on,
          r.modified_on,
          NOW()
        FROM raw.st_pricebook_materials r
        WHERE r.tenant_id = $1
        ON CONFLICT (st_id, tenant_id) DO UPDATE SET
          code = EXCLUDED.code,
          name = EXCLUDED.name,
          display_name = EXCLUDED.display_name,
          description = EXCLUDED.description,
          cost = EXCLUDED.cost,
          price = EXCLUDED.price,
          member_price = EXCLUDED.member_price,
          add_on_price = EXCLUDED.add_on_price,
          unit_of_measure = EXCLUDED.unit_of_measure,
          taxable = EXCLUDED.taxable,
          active = EXCLUDED.active,
          account = EXCLUDED.account,
          categories = EXCLUDED.categories,
          assets = EXCLUDED.assets,
          primary_vendor = EXCLUDED.primary_vendor,
          other_vendors = EXCLUDED.other_vendors,
          st_created_on = EXCLUDED.st_created_on,
          st_modified_on = EXCLUDED.st_modified_on,
          updated_at = NOW(),
          last_synced_at = NOW()
      `, [tenantId]);

      console.log(`[MATERIALS SYNC] Synced ${result.rowCount} materials to MASTER table`);

      res.json({
        success: true,
        synced: result.rowCount,
        message: `Synced ${result.rowCount} materials from RAW to MASTER`,
      });

    } catch (error) {
      console.error('[MATERIALS SYNC] Error:', error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    } finally {
      await pool.end();
    }
  })
);

// ============================================================================
// GET /api/pricebook/materials/stats
// Get materials statistics
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
        FROM raw.st_pricebook_materials
        WHERE tenant_id = $1
      `, [tenantId]);

      const masterStats = await pool.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE active = true) as active,
          COUNT(*) FILTER (WHERE active = false) as inactive
        FROM master.pricebook_materials
        WHERE tenant_id = $1
      `, [tenantId]);

      res.json({
        raw: rawStats.rows[0],
        master: masterStats.rows[0],
      });

    } catch (error) {
      console.error('[MATERIALS STATS] Error:', error);
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
