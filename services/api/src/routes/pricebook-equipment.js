/**
 * Pricebook Equipment Routes
 * Handles equipment sync from ServiceTitan to RAW and RAW to MASTER
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
// GET /api/pricebook/equipment
// List equipment with filtering, pagination, and CRM override support
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
      let whereConditions = ['e.tenant_id = $1'];

      // Active filter with CRM override (default: show only active)
      if (active === 'true') {
        whereConditions.push('COALESCE(o.override_active, e.active) = true');
      } else if (active === 'false') {
        whereConditions.push('COALESCE(o.override_active, e.active) = false');
      }
      // If active === 'all', don't filter by active status

      // Search filter with CRM override
      if (search) {
        params.push(`%${search}%`);
        whereConditions.push(`(
          COALESCE(o.override_name, e.name) ILIKE $${params.length} OR 
          e.code ILIKE $${params.length} OR 
          e.display_name ILIKE $${params.length} OR
          e.manufacturer ILIKE $${params.length} OR
          e.model ILIKE $${params.length}
        )`);
      }

      // Category filter (equipment uses categories JSONB)
      if (category_id) {
        params.push(JSON.stringify([{ id: parseInt(category_id, 10) }]));
        whereConditions.push(`e.categories @> $${params.length}::jsonb`);
      }

      const whereClause = whereConditions.join(' AND ');

      // Validate sort
      const allowedSorts = ['name', 'code', 'price', 'cost', 'manufacturer', 'model', 'created_at', 'updated_at'];
      const safeSort = allowedSorts.includes(sort_by) ? sort_by : 'name';
      const safeOrder = sort_order.toLowerCase() === 'desc' ? 'DESC' : 'ASC';

      // Get total count with CRM override join
      const countResult = await pool.query(
        `SELECT COUNT(*) 
         FROM master.pricebook_equipment e
         LEFT JOIN crm.pricebook_overrides o 
           ON o.st_pricebook_id = e.st_id 
           AND o.tenant_id = e.tenant_id
           AND o.item_type = 'equipment'
         WHERE ${whereClause}`,
        params
      );
      const total = parseInt(countResult.rows[0].count, 10);

      // Get equipment with pagination and CRM overrides
      const pageNum = Math.max(1, parseInt(page, 10));
      const limitNum = Math.min(500, Math.max(1, parseInt(limit, 10)));
      const offset = (pageNum - 1) * limitNum;

      params.push(limitNum, offset);

      const query = `
        SELECT 
          e.id,
          e.st_id,
          e.code,
          COALESCE(o.override_name, e.name) as name,
          e.display_name,
          COALESCE(o.override_description, e.description) as description,
          e.manufacturer,
          e.model,
          COALESCE(o.override_price, e.price) as price,
          e.member_price,
          e.add_on_price,
          COALESCE(o.override_cost, e.cost) as cost,
          COALESCE(o.override_active, e.active) as active,
          e.taxable,
          e.account,
          COALESCE(o.override_image_url, e.s3_image_url) as image_url,
          e.categories,
          e.manufacturer_warranty,
          e.service_warranty,
          e.primary_vendor,
          e.other_vendors,
          e.st_created_on,
          e.st_modified_on,
          e.created_at,
          e.updated_at,
          o.id as override_id,
          o.pending_sync as has_pending_changes,
          o.internal_notes,
          o.preferred_vendor,
          o.custom_tags
        FROM master.pricebook_equipment e
        LEFT JOIN crm.pricebook_overrides o 
          ON o.st_pricebook_id = e.st_id 
          AND o.tenant_id = e.tenant_id
          AND o.item_type = 'equipment'
        WHERE ${whereClause}
        ORDER BY COALESCE(o.override_name, e.name) ${safeOrder}
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
// GET /api/pricebook/equipment/:stId
// Get single equipment by ServiceTitan ID with CRM overrides
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
          e.*,
          COALESCE(o.override_name, e.name) as name,
          COALESCE(o.override_description, e.description) as description,
          COALESCE(o.override_price, e.price) as price,
          COALESCE(o.override_cost, e.cost) as cost,
          COALESCE(o.override_active, e.active) as active,
          COALESCE(o.override_image_url, e.s3_image_url) as image_url,
          o.id as override_id,
          o.pending_sync as has_pending_changes,
          o.internal_notes,
          o.preferred_vendor as override_preferred_vendor,
          o.custom_tags
        FROM master.pricebook_equipment e
        LEFT JOIN crm.pricebook_overrides o 
          ON o.st_pricebook_id = e.st_id 
          AND o.tenant_id = e.tenant_id
          AND o.item_type = 'equipment'
        WHERE e.st_id = $1 AND e.tenant_id = $2
      `, [parseInt(stId, 10), tenantId]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Equipment not found' });
      }

      res.json(result.rows[0]);
    } finally {
      await pool.end();
    }
  })
);

// ============================================================================
// POST /api/pricebook/equipment/sync-from-st
// Fetch equipment from ServiceTitan API and store in RAW table
// ============================================================================

router.post(
  '/sync-from-st',
  asyncHandler(async (req, res) => {
    const pool = getPool();
    const tenantId = getTenantId(req);

    console.log(`[EQUIPMENT SYNC] Fetching from ServiceTitan for tenant ${tenantId}`);

    try {
      let allEquipment = [];
      let page = 1;
      let hasMore = true;
      const pageSize = 500;

      // Fetch all pages
      while (hasMore) {
        console.log(`[EQUIPMENT SYNC] Fetching page ${page}...`);
        
        const stApiUrl = `https://api.servicetitan.io/pricebook/v2/tenant/${tenantId}/equipment`;
        const response = await stRequest(stApiUrl, {
          method: 'GET',
          query: {
            active: 'any',
            page: page,
            pageSize: pageSize,
          },
        });

        if (!response.data || !response.data.data) {
          console.log(`[EQUIPMENT SYNC] Invalid response on page ${page}`);
          break;
        }

        const equipment = response.data.data;
        allEquipment = allEquipment.concat(equipment);
        
        console.log(`[EQUIPMENT SYNC] Page ${page}: ${equipment.length} equipment (total: ${allEquipment.length})`);

        hasMore = response.data.hasMore || equipment.length === pageSize;
        page++;

        if (page > 50) {
          console.log(`[EQUIPMENT SYNC] Reached page limit (50), stopping`);
          break;
        }
      }

      console.log(`[EQUIPMENT SYNC] Fetched ${allEquipment.length} total equipment from ${page - 1} pages`);

      let insertedCount = 0;

      for (const item of allEquipment) {
        await pool.query(`
          INSERT INTO raw.st_pricebook_equipment (
            st_id, tenant_id, code, display_name, description,
            manufacturer, model, cost, price, member_price, add_on_price,
            taxable, active, categories, manufacturer_warranty, service_warranty,
            primary_vendor, other_vendors, created_on, modified_on, full_data, fetched_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, NOW()
          )
          ON CONFLICT (st_id, tenant_id) DO UPDATE SET
            code = EXCLUDED.code,
            display_name = EXCLUDED.display_name,
            description = EXCLUDED.description,
            manufacturer = EXCLUDED.manufacturer,
            model = EXCLUDED.model,
            cost = EXCLUDED.cost,
            price = EXCLUDED.price,
            member_price = EXCLUDED.member_price,
            add_on_price = EXCLUDED.add_on_price,
            taxable = EXCLUDED.taxable,
            active = EXCLUDED.active,
            categories = EXCLUDED.categories,
            manufacturer_warranty = EXCLUDED.manufacturer_warranty,
            service_warranty = EXCLUDED.service_warranty,
            primary_vendor = EXCLUDED.primary_vendor,
            other_vendors = EXCLUDED.other_vendors,
            modified_on = EXCLUDED.modified_on,
            full_data = EXCLUDED.full_data,
            fetched_at = NOW()
        `, [
          item.id,
          tenantId,
          item.code || null,
          item.displayName || item.name || null,
          item.description || null,
          item.manufacturer || null,
          item.model || null,
          item.cost || 0,
          item.price || 0,
          item.memberPrice || 0,
          item.addOnPrice || 0,
          item.taxable !== undefined ? item.taxable : true,
          item.active !== undefined ? item.active : true,
          JSON.stringify(item.categories || []),
          JSON.stringify(item.manufacturerWarranty || null),
          JSON.stringify(item.serviceWarranty || null),
          JSON.stringify(item.primaryVendor || null),
          JSON.stringify(item.otherVendors || []),
          item.createdOn || null,
          item.modifiedOn || null,
          JSON.stringify(item),
        ]);

        insertedCount++;
      }

      console.log(`[EQUIPMENT SYNC] Completed: ${insertedCount} equipment synced to RAW table`);

      res.json({
        success: true,
        synced: insertedCount,
        total: allEquipment.length,
        pages: page - 1,
        message: `Synced ${insertedCount} equipment from ServiceTitan to RAW table (${page - 1} pages)`,
      });

    } catch (error) {
      console.error('[EQUIPMENT SYNC] Error:', error);
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
// POST /api/pricebook/equipment/sync-to-master
// Sync equipment from RAW to MASTER table
// ============================================================================

router.post(
  '/sync-to-master',
  asyncHandler(async (req, res) => {
    const pool = getPool();
    const tenantId = getTenantId(req);

    console.log(`[EQUIPMENT SYNC] Starting RAW → MASTER sync for tenant ${tenantId}`);

    try {
      const result = await pool.query(`
        INSERT INTO master.pricebook_equipment (
          st_id, tenant_id, code, name, display_name, description,
          manufacturer, model, cost, price, member_price, add_on_price,
          taxable, active, account, categories, assets,
          manufacturer_warranty, service_warranty, primary_vendor, other_vendors,
          st_created_on, st_modified_on, last_synced_at
        )
        SELECT 
          r.st_id,
          r.tenant_id::text,
          r.code,
          COALESCE(r.display_name, 'Unnamed Equipment'),
          r.display_name,
          r.description,
          r.manufacturer,
          r.model,
          COALESCE(r.cost, 0),
          COALESCE(r.price, 0),
          COALESCE(r.member_price, 0),
          COALESCE(r.add_on_price, 0),
          COALESCE(r.taxable, true),
          COALESCE(r.active, true),
          r.full_data->>'account',
          r.categories,
          r.full_data->'assets',
          r.manufacturer_warranty,
          r.service_warranty,
          r.primary_vendor,
          r.other_vendors,
          r.created_on,
          r.modified_on,
          NOW()
        FROM raw.st_pricebook_equipment r
        WHERE r.tenant_id = $1
        ON CONFLICT (st_id, tenant_id) DO UPDATE SET
          code = EXCLUDED.code,
          name = EXCLUDED.name,
          display_name = EXCLUDED.display_name,
          description = EXCLUDED.description,
          manufacturer = EXCLUDED.manufacturer,
          model = EXCLUDED.model,
          cost = EXCLUDED.cost,
          price = EXCLUDED.price,
          member_price = EXCLUDED.member_price,
          add_on_price = EXCLUDED.add_on_price,
          taxable = EXCLUDED.taxable,
          active = EXCLUDED.active,
          account = EXCLUDED.account,
          categories = EXCLUDED.categories,
          assets = EXCLUDED.assets,
          manufacturer_warranty = EXCLUDED.manufacturer_warranty,
          service_warranty = EXCLUDED.service_warranty,
          primary_vendor = EXCLUDED.primary_vendor,
          other_vendors = EXCLUDED.other_vendors,
          st_created_on = EXCLUDED.st_created_on,
          st_modified_on = EXCLUDED.st_modified_on,
          updated_at = NOW(),
          last_synced_at = NOW()
      `, [tenantId]);

      console.log(`[EQUIPMENT SYNC] Synced ${result.rowCount} equipment to MASTER table`);

      res.json({
        success: true,
        synced: result.rowCount,
        message: `Synced ${result.rowCount} equipment from RAW to MASTER`,
      });

    } catch (error) {
      console.error('[EQUIPMENT SYNC] Error:', error);
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
// GET /api/pricebook/equipment/stats
// Get equipment statistics
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
        FROM raw.st_pricebook_equipment
        WHERE tenant_id = $1
      `, [tenantId]);

      const masterStats = await pool.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE active = true) as active,
          COUNT(*) FILTER (WHERE active = false) as inactive
        FROM master.pricebook_equipment
        WHERE tenant_id = $1
      `, [tenantId]);

      res.json({
        raw: rawStats.rows[0],
        master: masterStats.rows[0],
      });

    } catch (error) {
      console.error('[EQUIPMENT STATS] Error:', error);
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
