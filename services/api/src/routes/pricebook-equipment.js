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
