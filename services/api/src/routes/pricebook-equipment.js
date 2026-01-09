/**
 * Pricebook Equipment Routes
 * Handles equipment sync from ServiceTitan to RAW and RAW to MASTER
 * Plus full CRUD operations with CRM override support
 */

import { Router } from 'express';
import pg from 'pg';
import config from '../config/index.js';
import { stRequest } from '../services/stClient.js';

const { Pool } = pg;
const router = Router();

// Helper to parse JSON safely
function parseJsonSafe(value, defaultValue) {
  if (!value) return defaultValue;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return defaultValue;
  }
}

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
      let newEquipmentWhereConditions = ['n.tenant_id = $1', 'n.pushed_to_st = false'];

      // Active filter with CRM override (default: show only active)
      if (active === 'true') {
        whereConditions.push('COALESCE(o.override_active, e.active) = true');
        newEquipmentWhereConditions.push('n.active = true');
      } else if (active === 'false') {
        whereConditions.push('COALESCE(o.override_active, e.active) = false');
        newEquipmentWhereConditions.push('n.active = false');
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
        newEquipmentWhereConditions.push(`(
          n.display_name ILIKE $${params.length} OR
          n.code ILIKE $${params.length} OR
          n.description ILIKE $${params.length} OR
          n.manufacturer ILIKE $${params.length} OR
          n.model ILIKE $${params.length}
        )`);
      }

      // Category filter (equipment uses categories JSONB)
      if (category_id) {
        const categoryIds = category_id.toString().split(',').map(id => id.trim()).filter(id => id);
        if (categoryIds.length > 1) {
          const categoryConditions = categoryIds.map((id) => {
            params.push(parseInt(id, 10));
            return `e.categories @> $${params.length}::jsonb`;
          });
          whereConditions.push(`(${categoryConditions.join(' OR ')})`);
          const newCategoryConditions = categoryIds.map((_, idx) => {
            return `n.categories @> $${params.length - categoryIds.length + idx + 1}::jsonb`;
          });
          newEquipmentWhereConditions.push(`(${newCategoryConditions.join(' OR ')})`);
        } else {
          params.push(parseInt(categoryIds[0], 10));
          whereConditions.push(`e.categories @> $${params.length}::jsonb`);
          newEquipmentWhereConditions.push(`n.categories @> $${params.length}::jsonb`);
        }
      }

      const whereClause = whereConditions.join(' AND ');
      const newEquipmentWhereClause = newEquipmentWhereConditions.join(' AND ');

      // Validate sort
      const allowedSorts = ['name', 'code', 'price', 'cost', 'manufacturer', 'model', 'created_at', 'updated_at'];
      const safeSort = allowedSorts.includes(sort_by) ? sort_by : 'name';
      const safeOrder = sort_order.toLowerCase() === 'desc' ? 'DESC' : 'ASC';

      // Get total count from both tables
      const countResult = await pool.query(
        `SELECT
          (SELECT COUNT(*) FROM master.pricebook_equipment e
           LEFT JOIN crm.pricebook_overrides o
             ON o.st_pricebook_id = e.st_id
             AND o.tenant_id = e.tenant_id
             AND o.item_type = 'equipment'
           WHERE ${whereClause}) +
          (SELECT COUNT(*) FROM crm.pricebook_new_equipment n
           WHERE ${newEquipmentWhereClause}) as total`,
        params
      );
      const total = parseInt(countResult.rows[0].total, 10);

      // Get equipment with pagination and CRM overrides
      const pageNum = Math.max(1, parseInt(page, 10));
      const limitNum = Math.min(500, Math.max(1, parseInt(limit, 10)));
      const offset = (pageNum - 1) * limitNum;

      params.push(limitNum, offset);

      // UNION query to include both existing and new equipment
      const query = `
        SELECT * FROM (
          -- Existing equipment from master table
          SELECT 
            e.id,
            e.st_id::text as st_id,
            e.code,
            COALESCE(o.override_name, e.name) as name,
            e.display_name,
            COALESCE(o.override_description, e.description) as description,
            COALESCE(o.override_manufacturer, e.manufacturer) as manufacturer,
            COALESCE(o.override_model, e.model) as model,
            COALESCE(o.override_price, e.price) as price,
            e.member_price,
            e.add_on_price,
            COALESCE(o.override_cost, e.cost) as cost,
            COALESCE(o.override_active, e.active) as active,
            e.taxable,
            e.account,
            COALESCE(o.override_image_url, e.s3_image_url) as image_url,
            e.categories,
            COALESCE(o.override_manufacturer_warranty, e.manufacturer_warranty) as manufacturer_warranty,
            COALESCE(o.override_service_warranty, e.service_warranty) as service_warranty,
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
            o.custom_tags,
            false as is_new,
            null as push_error
          FROM master.pricebook_equipment e
          LEFT JOIN crm.pricebook_overrides o 
            ON o.st_pricebook_id = e.st_id 
            AND o.tenant_id = e.tenant_id
            AND o.item_type = 'equipment'
          WHERE ${whereClause}

          UNION ALL

          -- New equipment not yet pushed to ST
          SELECT
            n.id,
            ('new_' || n.id::text) as st_id,
            n.code,
            n.display_name as name,
            n.display_name,
            n.description,
            n.manufacturer,
            n.model,
            n.price,
            n.member_price,
            n.add_on_price,
            n.cost,
            n.active,
            n.taxable,
            n.account,
            n.s3_image_url as image_url,
            n.categories,
            n.manufacturer_warranty,
            n.service_warranty,
            n.primary_vendor,
            n.other_vendors,
            null as st_created_on,
            null as st_modified_on,
            n.created_at,
            n.updated_at,
            null as override_id,
            false as has_pending_changes,
            null as internal_notes,
            null as preferred_vendor,
            null as custom_tags,
            true as is_new,
            n.push_error
          FROM crm.pricebook_new_equipment n
          WHERE ${newEquipmentWhereClause}
        ) combined
        ORDER BY name ${safeOrder}
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
// Also handles new equipment (prefixed with 'new_')
// ============================================================================

router.get(
  '/:stId',
  asyncHandler(async (req, res) => {
    const pool = getPool();
    const tenantId = getTenantId(req);
    const { stId } = req.params;

    try {
      // Check if this is a new equipment (not yet pushed to ST)
      const isNewEquipment = stId.startsWith('new_');

      if (isNewEquipment) {
        // Query new equipment table
        const newId = stId.replace('new_', '');
        const result = await pool.query(`
          SELECT
            n.id,
            n.tenant_id,
            n.code,
            n.display_name,
            n.description,
            n.manufacturer,
            n.model,
            n.cost,
            n.price,
            n.member_price,
            n.add_on_price,
            n.add_on_member_price,
            n.hours,
            n.bonus,
            n.commission_bonus,
            n.pays_commission,
            n.deduct_as_job_cost,
            n.active,
            n.taxable,
            n.chargeable_by_default,
            n.account,
            n.cost_of_sale_account,
            n.asset_account,
            n.income_account,
            n.business_unit_id,
            n.general_ledger_account_id,
            n.categories,
            n.manufacturer_warranty,
            n.service_warranty,
            n.primary_vendor,
            n.other_vendors,
            n.assets,
            n.s3_image_url,
            n.pending_images,
            n.st_id,
            n.pushed_to_st,
            n.pushed_at,
            n.push_error,
            n.created_at,
            n.updated_at,
            n.created_by
          FROM crm.pricebook_new_equipment n
          WHERE n.id = $1 AND n.tenant_id = $2
        `, [parseInt(newId, 10), tenantId]);

        if (result.rows.length === 0) {
          return res.status(404).json({ error: 'Equipment not found' });
        }

        const row = result.rows[0];
        return res.json({
          id: `new_${row.id}`,
          stId: row.st_id ? row.st_id.toString() : null,
          code: row.code,
          displayName: row.display_name,
          name: row.display_name,
          description: row.description,
          manufacturer: row.manufacturer,
          model: row.model,

          // Pricing
          cost: parseFloat(row.cost) || 0,
          price: parseFloat(row.price) || 0,
          memberPrice: parseFloat(row.member_price) || 0,
          addOnPrice: parseFloat(row.add_on_price) || 0,
          addOnMemberPrice: parseFloat(row.add_on_member_price) || 0,

          // Labor & Commission
          hours: parseFloat(row.hours) || 0,
          bonus: parseFloat(row.bonus) || 0,
          commissionBonus: parseFloat(row.commission_bonus) || 0,
          paysCommission: row.pays_commission || false,

          // Flags
          active: row.active !== false,
          taxable: row.taxable,
          deductAsJobCost: row.deduct_as_job_cost || false,
          chargeableByDefault: row.chargeable_by_default !== false,

          // Categorization
          categories: row.categories || [],

          // Accounting
          account: row.account,
          costOfSaleAccount: row.cost_of_sale_account,
          assetAccount: row.asset_account,
          incomeAccount: row.income_account,
          generalLedgerAccountId: row.general_ledger_account_id,

          // Warranty
          manufacturerWarranty: row.manufacturer_warranty,
          serviceWarranty: row.service_warranty,

          // Vendors
          primaryVendor: row.primary_vendor,
          otherVendors: row.other_vendors || [],

          // Assets
          assets: row.assets || [],
          imageUrl: row.s3_image_url,
          s3ImageUrl: row.s3_image_url,
          pendingImages: row.pending_images || [],

          // Business
          businessUnitId: row.business_unit_id,

          // Timestamps
          createdAt: row.created_at,
          updatedAt: row.updated_at,

          // New equipment status
          isNew: true,
          pushedToSt: row.pushed_to_st || false,
          pushedAt: row.pushed_at,
          pushError: row.push_error,
          createdBy: row.created_by,

          // CRM (not applicable for new equipment)
          overrideId: null,
          hasPendingChanges: false,
          syncError: null,
          internalNotes: null,
          customTags: null,
        });
      }

      // Query existing equipment from master table
      const result = await pool.query(`
        SELECT
          e.id,
          e.st_id,
          e.tenant_id,
          e.code,
          COALESCE(o.override_name, e.display_name, e.name) as display_name,
          e.name,
          COALESCE(o.override_description, e.description) as description,
          COALESCE(o.override_manufacturer, e.manufacturer) as manufacturer,
          COALESCE(o.override_model, e.model) as model,

          -- Pricing (with overrides)
          COALESCE(o.override_cost, e.cost) as cost,
          COALESCE(o.override_price, e.price) as price,
          COALESCE(o.override_member_price, e.member_price) as member_price,
          COALESCE(o.override_add_on_price, e.add_on_price) as add_on_price,
          COALESCE(o.override_add_on_member_price, e.add_on_member_price) as add_on_member_price,

          -- Labor & Commission (with overrides)
          COALESCE(o.override_hours, e.hours) as hours,
          COALESCE(o.override_bonus, e.bonus) as bonus,
          COALESCE(o.override_commission_bonus, e.commission_bonus) as commission_bonus,
          COALESCE(o.override_pays_commission, e.pays_commission) as pays_commission,

          -- Flags (with overrides)
          COALESCE(o.override_active, e.active) as active,
          e.taxable,
          COALESCE(o.override_deduct_as_job_cost, e.deduct_as_job_cost) as deduct_as_job_cost,
          COALESCE(o.override_chargeable_by_default, e.chargeable_by_default) as chargeable_by_default,

          -- Categorization
          e.categories,

          -- Accounting
          e.account,
          e.cost_of_sale_account,
          e.asset_account,
          e.income_account,
          e.general_ledger_account_id,

          -- Warranty (with overrides)
          COALESCE(o.override_manufacturer_warranty, e.manufacturer_warranty) as manufacturer_warranty,
          COALESCE(o.override_service_warranty, e.service_warranty) as service_warranty,

          -- Vendors (with overrides)
          COALESCE(o.override_primary_vendor, e.primary_vendor) as primary_vendor,
          COALESCE(o.override_other_vendors, e.other_vendors) as other_vendors,

          -- Assets
          e.assets,
          e.default_asset_url,
          COALESCE(o.override_image_url, e.s3_image_url, e.default_asset_url) as image_url,
          e.s3_image_url,

          -- Business
          e.business_unit_id,

          -- External
          e.external_id,
          e.source,

          -- Timestamps
          e.st_created_on,
          e.st_modified_on,
          e.created_by_id,
          e.created_at,
          e.updated_at,
          e.last_synced_at,

          -- CRM status
          o.id as override_id,
          o.pending_sync as has_pending_changes,
          o.sync_error,
          o.internal_notes,
          o.preferred_vendor as override_preferred_vendor,
          o.custom_tags,
          o.images_to_delete

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

      // Format response with camelCase keys
      const row = result.rows[0];

      // Parse images_to_delete and filter assets
      let imagesToDelete = [];
      if (row.images_to_delete) {
        try {
          imagesToDelete = Array.isArray(row.images_to_delete)
            ? row.images_to_delete
            : JSON.parse(row.images_to_delete);
        } catch { /* ignore parse errors */ }
      }

      // Filter out assets that are marked for deletion
      let filteredAssets = row.assets || [];
      if (imagesToDelete.length > 0 && filteredAssets.length > 0) {
        filteredAssets = filteredAssets.filter(asset => {
          const shouldDelete = imagesToDelete.some(delUrl =>
            asset.url === delUrl || asset.url.includes(delUrl) || delUrl.includes(asset.url)
          );
          return !shouldDelete;
        });
      }

      res.json({
        id: row.st_id?.toString(),
        stId: row.st_id?.toString(),
        code: row.code,
        displayName: row.display_name,
        name: row.name,
        description: row.description,
        manufacturer: row.manufacturer,
        model: row.model,

        // Pricing
        cost: parseFloat(row.cost) || 0,
        price: parseFloat(row.price) || 0,
        memberPrice: parseFloat(row.member_price) || 0,
        addOnPrice: parseFloat(row.add_on_price) || 0,
        addOnMemberPrice: parseFloat(row.add_on_member_price) || 0,

        // Labor & Commission
        hours: parseFloat(row.hours) || 0,
        bonus: parseFloat(row.bonus) || 0,
        commissionBonus: parseFloat(row.commission_bonus) || 0,
        paysCommission: row.pays_commission || false,

        // Flags
        active: row.active !== false,
        taxable: row.taxable,
        deductAsJobCost: row.deduct_as_job_cost || false,
        chargeableByDefault: row.chargeable_by_default !== false,

        // Categorization
        categories: row.categories || [],

        // Accounting
        account: row.account,
        costOfSaleAccount: row.cost_of_sale_account,
        assetAccount: row.asset_account,
        incomeAccount: row.income_account,
        generalLedgerAccountId: row.general_ledger_account_id,

        // Warranty
        manufacturerWarranty: row.manufacturer_warranty,
        serviceWarranty: row.service_warranty,

        // Vendors - filter out primary vendor from otherVendors to avoid duplicates
        primaryVendor: row.primary_vendor,
        otherVendors: (row.other_vendors || []).filter(v =>
          !row.primary_vendor || v.vendorId !== row.primary_vendor.vendorId
        ),

        // Assets (filtered to exclude images marked for deletion)
        assets: filteredAssets,
        defaultAssetUrl: row.default_asset_url,
        imageUrl: row.image_url,
        s3ImageUrl: row.s3_image_url,
        imagesToDelete: imagesToDelete,

        // Business
        businessUnitId: row.business_unit_id,

        // External
        externalId: row.external_id,
        source: row.source,

        // Timestamps
        createdOn: row.st_created_on,
        modifiedOn: row.st_modified_on,
        createdById: row.created_by_id,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        lastSyncedAt: row.last_synced_at,

        // Status
        isNew: false,

        // CRM
        overrideId: row.override_id,
        hasPendingChanges: row.has_pending_changes || false,
        syncError: row.sync_error,
        internalNotes: row.internal_notes,
        customTags: row.custom_tags,
      });
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

// ============================================================================
// GET /api/pricebook/equipment/pending
// List equipment pending push to ServiceTitan
// ============================================================================

router.get(
  '/pending',
  asyncHandler(async (req, res) => {
    const pool = getPool();
    const tenantId = getTenantId(req);

    try {
      const [newEquipment, modifiedEquipment] = await Promise.all([
        pool.query(`
          SELECT id, code, display_name, price, cost, created_at, push_error
          FROM crm.pricebook_new_equipment
          WHERE tenant_id = $1 AND pushed_to_st = false
          ORDER BY created_at DESC
        `, [tenantId]),

        pool.query(`
          SELECT o.st_pricebook_id, e.code, e.display_name, o.updated_at, o.sync_error
          FROM crm.pricebook_overrides o
          JOIN master.pricebook_equipment e ON o.st_pricebook_id = e.st_id AND o.tenant_id = e.tenant_id
          WHERE o.tenant_id = $1 AND o.item_type = 'equipment' AND o.pending_sync = true
          ORDER BY o.updated_at DESC
        `, [tenantId])
      ]);

      res.json({
        new: newEquipment.rows,
        modified: modifiedEquipment.rows,
        total: newEquipment.rows.length + modifiedEquipment.rows.length,
      });

    } catch (error) {
      console.error('[EQUIPMENT PENDING] Error:', error);
      res.status(500).json({ error: error.message });
    } finally {
      await pool.end();
    }
  })
);

// ============================================================================
// POST /api/pricebook/equipment
// Create new equipment (stores in CRM, pending push to ST)
// ============================================================================

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const pool = getPool();
    const tenantId = getTenantId(req);
    const equipment = req.body;

    // Validate required fields
    const requiredFields = ['code', 'description'];
    const missing = requiredFields.filter(f => !equipment[f]);
    if (missing.length > 0) {
      return res.status(400).json({ 
        error: 'Missing required fields', 
        fields: missing 
      });
    }

    try {
      // Check if code already exists
      const existing = await pool.query(`
        SELECT 1 FROM master.pricebook_equipment WHERE code = $1 AND tenant_id = $2
        UNION
        SELECT 1 FROM crm.pricebook_new_equipment WHERE code = $1 AND tenant_id = $2
      `, [equipment.code, tenantId]);

      if (existing.rows.length > 0) {
        return res.status(409).json({ error: 'Equipment code already exists' });
      }

      // Insert new equipment
      console.log("[EQUIPMENT CREATE] Creating new equipment with code:", equipment.code);
      const result = await pool.query(`
        INSERT INTO crm.pricebook_new_equipment (
          tenant_id, code, display_name, description,
          manufacturer, model,
          cost, price, member_price, add_on_price, add_on_member_price,
          hours, bonus, commission_bonus,
          pays_commission, deduct_as_job_cost,
          chargeable_by_default, active, taxable,
          account, business_unit_id,
          categories, manufacturer_warranty, service_warranty,
          primary_vendor, other_vendors, assets,
          created_by
        ) VALUES (
          $1, $2, $3, $4,
          $5, $6,
          $7, $8, $9, $10, $11,
          $12, $13, $14,
          $15, $16,
          $17, $18, $19,
          $20, $21,
          $22, $23, $24,
          $25, $26, $27,
          $28
        )
        RETURNING *
      `, [
        tenantId,
        equipment.code,
        equipment.displayName || equipment.name || null,
        equipment.description,
        equipment.manufacturer || null,
        equipment.model || null,
        equipment.cost || 0,
        equipment.price || 0,
        equipment.memberPrice || 0,
        equipment.addOnPrice || 0,
        equipment.addOnMemberPrice || 0,
        equipment.hours || 0,
        equipment.bonus || 0,
        equipment.commissionBonus || 0,
        equipment.paysCommission || false,
        equipment.deductAsJobCost || false,
        equipment.chargeableByDefault !== false,
        equipment.active !== false,
        equipment.taxable !== false,
        equipment.account || null,
        equipment.businessUnitId || null,
        JSON.stringify(equipment.categories || []),
        JSON.stringify(equipment.manufacturerWarranty || null),
        JSON.stringify(equipment.serviceWarranty || null),
        JSON.stringify(equipment.primaryVendor || null),
        JSON.stringify(equipment.otherVendors || []),
        JSON.stringify(equipment.assets || []),
        equipment.createdBy || 'system'
      ]);

      const row = result.rows[0];
      res.status(201).json({
        success: true,
        data: formatEquipmentResponse(row, true),
        message: 'Equipment created. Click PUSH to sync to ServiceTitan.',
        isNew: true
      });

    } catch (error) {
      console.error('[EQUIPMENT CREATE] Error:', error);
      res.status(500).json({ error: error.message });
    } finally {
      await pool.end();
    }
  })
);

// ============================================================================
// PUT /api/pricebook/equipment/:stId
// Update existing equipment (creates CRM override) or update new equipment
// ============================================================================

router.put(
  '/:stId',
  asyncHandler(async (req, res) => {
    const pool = getPool();
    const tenantId = getTenantId(req);
    const { stId } = req.params;
    const changes = req.body;

    try {
      const isNewEquipment = stId.startsWith('new_') || parseInt(stId) < 0;

      if (isNewEquipment) {
        // Update the new equipment directly
        const id = stId.replace('new_', '');
        console.log("[EQUIPMENT UPDATE] Updating new equipment:", id);
        const result = await pool.query(`
          UPDATE crm.pricebook_new_equipment SET
            display_name = COALESCE($3, display_name),
            description = COALESCE($4, description),
            manufacturer = COALESCE($5, manufacturer),
            model = COALESCE($6, model),
            cost = COALESCE($7, cost),
            price = COALESCE($8, price),
            member_price = COALESCE($9, member_price),
            add_on_price = COALESCE($10, add_on_price),
            add_on_member_price = COALESCE($11, add_on_member_price),
            hours = COALESCE($12, hours),
            bonus = COALESCE($13, bonus),
            commission_bonus = COALESCE($14, commission_bonus),
            pays_commission = COALESCE($15, pays_commission),
            deduct_as_job_cost = COALESCE($16, deduct_as_job_cost),
            chargeable_by_default = COALESCE($17, chargeable_by_default),
            active = COALESCE($18, active),
            taxable = COALESCE($19, taxable),
            categories = COALESCE($20, categories),
            manufacturer_warranty = COALESCE($21, manufacturer_warranty),
            service_warranty = COALESCE($22, service_warranty),
            primary_vendor = COALESCE($23, primary_vendor),
            other_vendors = COALESCE($24, other_vendors),
            s3_image_url = COALESCE($25, s3_image_url),
            pending_images = COALESCE($26, pending_images),
            updated_at = NOW()
          WHERE id = $1 AND tenant_id = $2
          RETURNING *
        `, [
          id, tenantId,
          changes.displayName || changes.name || null,
          changes.description,
          changes.manufacturer,
          changes.model,
          changes.cost,
          changes.price,
          changes.memberPrice,
          changes.addOnPrice,
          changes.addOnMemberPrice,
          changes.hours,
          changes.bonus,
          changes.commissionBonus,
          changes.paysCommission,
          changes.deductAsJobCost,
          changes.chargeableByDefault,
          changes.active,
          changes.taxable,
          changes.categories ? JSON.stringify(changes.categories) : null,
          changes.manufacturerWarranty ? JSON.stringify(changes.manufacturerWarranty) : null,
          changes.serviceWarranty ? JSON.stringify(changes.serviceWarranty) : null,
          changes.primaryVendor ? JSON.stringify(changes.primaryVendor) : null,
          changes.otherVendors ? JSON.stringify(changes.otherVendors) : null,
          changes.defaultImageUrl || changes.imageUrl || null,
          changes.pendingImages ? JSON.stringify(changes.pendingImages) : null
        ]);

        if (result.rows.length === 0) {
          return res.status(404).json({ error: 'Equipment not found' });
        }

        return res.json({
          success: true,
          data: formatEquipmentResponse(result.rows[0], true),
          message: 'Equipment updated. Click PUSH to sync to ServiceTitan.'
        });
      }

      // Create/update override for existing equipment
      console.log("[EQUIPMENT UPDATE] Saving override for ST ID:", stId);

      // Handle pending images
      let imageUrlValue = null;
      if (changes.pendingImages && Array.isArray(changes.pendingImages) && changes.pendingImages.length > 0) {
        imageUrlValue = JSON.stringify(changes.pendingImages);
        console.log("[EQUIPMENT UPDATE] Storing pending images:", imageUrlValue);
      } else if (changes.defaultImageUrl || changes.imageUrl) {
        imageUrlValue = changes.defaultImageUrl || changes.imageUrl;
      }

      // Handle images to delete
      let imagesToDeleteValue = null;
      if (changes.imagesToDelete && Array.isArray(changes.imagesToDelete) && changes.imagesToDelete.length > 0) {
        imagesToDeleteValue = JSON.stringify(changes.imagesToDelete);
        console.log("[EQUIPMENT UPDATE] Storing images to delete:", imagesToDeleteValue);
      }

      const result = await pool.query(`
        INSERT INTO crm.pricebook_overrides (
          st_pricebook_id, tenant_id, item_type,
          override_name, override_description, override_price, override_cost,
          override_active, override_member_price, override_add_on_price,
          override_add_on_member_price, override_hours, override_bonus,
          override_commission_bonus, override_pays_commission, override_deduct_as_job_cost,
          override_chargeable_by_default,
          override_manufacturer, override_model,
          override_manufacturer_warranty, override_service_warranty,
          override_primary_vendor, override_other_vendors, override_image_url, images_to_delete,
          pending_sync, updated_at
        ) VALUES ($1, $2, 'equipment', $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, true, NOW())
        ON CONFLICT (st_pricebook_id, tenant_id, item_type) DO UPDATE SET
          override_name = COALESCE($3, crm.pricebook_overrides.override_name),
          override_description = COALESCE($4, crm.pricebook_overrides.override_description),
          override_price = COALESCE($5, crm.pricebook_overrides.override_price),
          override_cost = COALESCE($6, crm.pricebook_overrides.override_cost),
          override_active = COALESCE($7, crm.pricebook_overrides.override_active),
          override_member_price = COALESCE($8, crm.pricebook_overrides.override_member_price),
          override_add_on_price = COALESCE($9, crm.pricebook_overrides.override_add_on_price),
          override_add_on_member_price = COALESCE($10, crm.pricebook_overrides.override_add_on_member_price),
          override_hours = COALESCE($11, crm.pricebook_overrides.override_hours),
          override_bonus = COALESCE($12, crm.pricebook_overrides.override_bonus),
          override_commission_bonus = COALESCE($13, crm.pricebook_overrides.override_commission_bonus),
          override_pays_commission = COALESCE($14, crm.pricebook_overrides.override_pays_commission),
          override_deduct_as_job_cost = COALESCE($15, crm.pricebook_overrides.override_deduct_as_job_cost),
          override_chargeable_by_default = COALESCE($16, crm.pricebook_overrides.override_chargeable_by_default),
          override_manufacturer = COALESCE($17, crm.pricebook_overrides.override_manufacturer),
          override_model = COALESCE($18, crm.pricebook_overrides.override_model),
          override_manufacturer_warranty = COALESCE($19, crm.pricebook_overrides.override_manufacturer_warranty),
          override_service_warranty = COALESCE($20, crm.pricebook_overrides.override_service_warranty),
          override_primary_vendor = COALESCE($21, crm.pricebook_overrides.override_primary_vendor),
          override_other_vendors = COALESCE($22, crm.pricebook_overrides.override_other_vendors),
          override_image_url = COALESCE($23, crm.pricebook_overrides.override_image_url),
          images_to_delete = COALESCE($24, crm.pricebook_overrides.images_to_delete),
          pending_sync = true,
          updated_at = NOW()
        RETURNING *
      `, [
        parseInt(stId, 10), tenantId,
        changes.displayName || changes.name || null,
        changes.description,
        changes.price,
        changes.cost,
        changes.active,
        changes.memberPrice,
        changes.addOnPrice,
        changes.addOnMemberPrice,
        changes.hours,
        changes.bonus,
        changes.commissionBonus,
        changes.paysCommission,
        changes.deductAsJobCost,
        changes.chargeableByDefault,
        changes.manufacturer,
        changes.model,
        changes.manufacturerWarranty ? JSON.stringify(changes.manufacturerWarranty) : null,
        changes.serviceWarranty ? JSON.stringify(changes.serviceWarranty) : null,
        changes.primaryVendor ? JSON.stringify(changes.primaryVendor) : null,
        changes.otherVendors ? JSON.stringify(changes.otherVendors) : null,
        imageUrlValue,
        imagesToDeleteValue
      ]);

      res.json({
        success: true,
        override: result.rows[0],
        message: 'Changes saved. Click PUSH to sync to ServiceTitan.'
      });

    } catch (error) {
      console.error('[EQUIPMENT UPDATE] Error:', error);
      res.status(500).json({ error: error.message });
    } finally {
      await pool.end();
    }
  })
);

// ============================================================================
// POST /api/pricebook/equipment/:stId/pull
// Pull a single equipment from ServiceTitan and update local record
// ============================================================================

router.post(
  '/:stId/pull',
  asyncHandler(async (req, res) => {
    const pool = getPool();
    const tenantId = getTenantId(req);
    const { stId } = req.params;

    console.log(`[EQUIPMENT PULL] Pulling equipment ${stId} from ServiceTitan`);

    try {
      // Fetch equipment from ServiceTitan
      const stApiUrl = `https://api.servicetitan.io/pricebook/v2/tenant/${tenantId}/equipment/${stId}`;
      const response = await stRequest(stApiUrl, { method: 'GET' });

      if (!response.data) {
        return res.status(404).json({ error: 'Equipment not found in ServiceTitan' });
      }

      const equipment = response.data;
      console.log(`[EQUIPMENT PULL] Fetched equipment:`, equipment.code, equipment.displayName);

      // Update master table with ALL fields including assets
      await pool.query(`
        UPDATE master.pricebook_equipment SET
          code = $3,
          name = $4,
          display_name = $4,
          description = $5,
          manufacturer = $6,
          model = $7,
          cost = $8,
          price = $9,
          member_price = $10,
          add_on_price = $11,
          add_on_member_price = $12,
          hours = $13,
          bonus = $14,
          commission_bonus = $15,
          pays_commission = $16,
          deduct_as_job_cost = $17,
          chargeable_by_default = $18,
          active = $19,
          taxable = $20,
          account = $21,
          categories = $22,
          manufacturer_warranty = $23,
          service_warranty = $24,
          primary_vendor = $25,
          other_vendors = $26,
          st_modified_on = $27,
          assets = $28,
          default_asset_url = $29,
          updated_at = NOW(),
          last_synced_at = NOW()
        WHERE st_id = $1 AND tenant_id = $2
      `, [
        parseInt(stId, 10),
        tenantId,
        equipment.code || null,
        equipment.displayName || equipment.name || null,
        equipment.description || null,
        equipment.manufacturer || null,
        equipment.model || null,
        equipment.cost || 0,
        equipment.price || 0,
        equipment.memberPrice || 0,
        equipment.addOnPrice || 0,
        equipment.addOnMemberPrice || 0,
        equipment.hours || 0,
        equipment.bonus || 0,
        equipment.commissionBonus || 0,
        equipment.paysCommission || false,
        equipment.deductAsJobCost || false,
        equipment.chargeableByDefault !== false,
        equipment.active !== false,
        equipment.taxable,
        equipment.account || null,
        JSON.stringify(equipment.categories || []),
        JSON.stringify(equipment.manufacturerWarranty || null),
        JSON.stringify(equipment.serviceWarranty || null),
        JSON.stringify(equipment.primaryVendor || null),
        JSON.stringify(equipment.otherVendors || []),
        equipment.modifiedOn || null,
        JSON.stringify(equipment.assets || []),
        equipment.defaultAssetUrl || null
      ]);

      // Clear ALL pending overrides
      await pool.query(`
        UPDATE crm.pricebook_overrides
        SET pending_sync = false,
            last_synced_at = NOW(),
            override_image_url = NULL,
            images_to_delete = NULL
        WHERE st_pricebook_id = $1 AND tenant_id = $2 AND item_type = 'equipment'
      `, [parseInt(stId, 10), tenantId]);

      console.log(`[EQUIPMENT PULL] Updated local record for equipment ${stId}`);

      res.json({
        success: true,
        message: `Equipment ${equipment.code} pulled from ServiceTitan`,
        data: {
          stId: equipment.id,
          code: equipment.code,
          name: equipment.displayName,
          description: equipment.description,
          manufacturer: equipment.manufacturer,
          model: equipment.model,
          cost: equipment.cost,
          price: equipment.price,
          memberPrice: equipment.memberPrice,
          addOnPrice: equipment.addOnPrice,
          active: equipment.active,
          taxable: equipment.taxable,
          categories: equipment.categories,
          manufacturerWarranty: equipment.manufacturerWarranty,
          serviceWarranty: equipment.serviceWarranty,
          primaryVendor: equipment.primaryVendor,
          modifiedOn: equipment.modifiedOn,
          assets: equipment.assets || [],
          defaultAssetUrl: equipment.defaultAssetUrl
        }
      });

    } catch (error) {
      console.error('[EQUIPMENT PULL] Error:', error);
      res.status(500).json({ error: error.message });
    } finally {
      await pool.end();
    }
  })
);

// ============================================================================
// POST /api/pricebook/equipment/push
// Push pending equipment to ServiceTitan
// ============================================================================

router.post(
  '/push',
  asyncHandler(async (req, res) => {
    const pool = getPool();
    const tenantId = getTenantId(req);
    const { stIds } = req.body; // Optional: specific IDs to push

    try {
      const results = { created: [], updated: [], failed: [] };

      // 1. Push NEW equipment (create in ST)
      const newEquipmentQuery = stIds 
        ? `SELECT * FROM crm.pricebook_new_equipment WHERE tenant_id = $1 AND pushed_to_st = false AND id = ANY($2::int[])`
        : `SELECT * FROM crm.pricebook_new_equipment WHERE tenant_id = $1 AND pushed_to_st = false`;
      
      const newEquipment = await pool.query(
        newEquipmentQuery, 
        stIds ? [tenantId, stIds.filter(id => String(id).startsWith('new_')).map(id => parseInt(String(id).replace('new_', ''), 10))] : [tenantId]
      );

      for (const equipment of newEquipment.rows) {
        try {
          // Build ST API payload
          const payload = buildServiceTitanPayload(equipment);

          // Handle images
          let imageUrls = [];
          if (equipment.pending_images) {
            try {
              const parsed = JSON.parse(equipment.pending_images);
              if (Array.isArray(parsed)) {
                imageUrls = imageUrls.concat(parsed);
              }
            } catch { /* Not JSON, ignore */ }
          }
          if (equipment.s3_image_url && !imageUrls.includes(equipment.s3_image_url)) {
            imageUrls.push(equipment.s3_image_url);
          }

          // Upload images to ST
          if (imageUrls.length > 0) {
            console.log(`[PUSH] New equipment ${equipment.code} has ${imageUrls.length} images to upload`);
            const stAssets = [];
            for (let i = 0; i < imageUrls.length; i++) {
              const url = imageUrls[i];
              console.log(`[PUSH] Uploading image ${i + 1}/${imageUrls.length} for new equipment ${equipment.code}...`);
              const stImagePath = await uploadImageToServiceTitan(url, tenantId, `equipment_${equipment.code.replace(/[^a-zA-Z0-9]/g, '_')}_${i + 1}.jpg`);
              if (stImagePath) {
                stAssets.push({ url: stImagePath, type: 'Image' });
                console.log(`[PUSH] Image ${i + 1} uploaded to ST: ${stImagePath}`);
              }
            }
            if (stAssets.length > 0) {
              payload.assets = stAssets;
            }
          }

          // Call ST API to create equipment
          const stResponse = await createEquipmentInServiceTitan(payload, tenantId);

          if (!stResponse.id) {
            throw new Error('ServiceTitan did not return a valid equipment ID');
          }

          // Insert into master table
          await insertIntoMaster(pool, stResponse, tenantId);

          // Mark as pushed
          await pool.query(`
            UPDATE crm.pricebook_new_equipment
            SET st_id = $1, pushed_to_st = true, pushed_at = NOW(), push_error = NULL
            WHERE id = $2
          `, [stResponse.id, equipment.id]);

          results.created.push({
            localId: equipment.id,
            stId: stResponse.id,
            code: equipment.code
          });

        } catch (err) {
          console.error(`[EQUIPMENT PUSH] Failed to create equipment ${equipment.code}:`, err.message);
          await pool.query(`
            UPDATE crm.pricebook_new_equipment
            SET push_error = $1, pushed_to_st = false
            WHERE id = $2
          `, [err.message, equipment.id]);

          results.failed.push({
            localId: equipment.id,
            code: equipment.code,
            error: err.message
          });
        }
      }

      // 2. Push MODIFIED equipment (update in ST)
      const overridesQuery = stIds
        ? `SELECT o.*, e.code, e.st_id FROM crm.pricebook_overrides o
           JOIN master.pricebook_equipment e ON o.st_pricebook_id = e.st_id AND o.tenant_id = e.tenant_id
           WHERE o.tenant_id = $1 AND o.item_type = 'equipment' AND o.pending_sync = true AND o.st_pricebook_id = ANY($2::bigint[])`
        : `SELECT o.*, e.code, e.st_id FROM crm.pricebook_overrides o
           JOIN master.pricebook_equipment e ON o.st_pricebook_id = e.st_id AND o.tenant_id = e.tenant_id
           WHERE o.tenant_id = $1 AND o.item_type = 'equipment' AND o.pending_sync = true`;

      const overrides = await pool.query(
        overridesQuery,
        stIds ? [tenantId, stIds.filter(id => !String(id).startsWith('new_')).map(id => parseInt(id, 10))] : [tenantId]
      );

      for (const override of overrides.rows) {
        try {
          // Build update payload
          const payload = buildUpdatePayload(override);

          // Get existing assets
          const existingAssetsResult = await pool.query(`
            SELECT assets FROM master.pricebook_equipment
            WHERE st_id = $1 AND tenant_id = $2
          `, [override.st_pricebook_id, tenantId]);

          let existingAssets = [];
          if (existingAssetsResult.rows.length > 0 && existingAssetsResult.rows[0].assets) {
            existingAssets = existingAssetsResult.rows[0].assets;
          }

          // Parse images to delete
          let imagesToDelete = [];
          if (override.images_to_delete) {
            try {
              imagesToDelete = Array.isArray(override.images_to_delete)
                ? override.images_to_delete
                : JSON.parse(override.images_to_delete);
            } catch { /* ignore */ }
          }

          // Filter out deleted images
          if (imagesToDelete.length > 0 && existingAssets.length > 0) {
            existingAssets = existingAssets.filter(a => {
              const shouldDelete = imagesToDelete.some(delUrl => a.url === delUrl || a.url.includes(delUrl) || delUrl.includes(a.url));
              return !shouldDelete;
            });
          }

          // Handle new images
          let newStAssets = [];
          if (override.override_image_url) {
            let imageUrls = [];
            try {
              const parsed = JSON.parse(override.override_image_url);
              if (Array.isArray(parsed)) {
                imageUrls = parsed;
              } else {
                imageUrls = [override.override_image_url];
              }
            } catch {
              imageUrls = [override.override_image_url];
            }

            for (let i = 0; i < imageUrls.length; i++) {
              const url = imageUrls[i];
              console.log(`[PUSH] Uploading image ${i + 1}/${imageUrls.length} for equipment ${override.st_pricebook_id}...`);
              const stImagePath = await uploadImageToServiceTitan(url, tenantId, `equipment_${override.st_pricebook_id}_${Date.now()}_${i + 1}.jpg`);
              if (stImagePath) {
                newStAssets.push({ url: stImagePath, type: 'Image' });
              }
            }
          }

          // Merge assets
          if (newStAssets.length > 0 || existingAssets.length > 0 || imagesToDelete.length > 0) {
            const existingForPayload = existingAssets
              .filter(a => a.type === 'Image')
              .map(a => ({ url: a.url, type: 'Image' }));
            payload.assets = [...newStAssets, ...existingForPayload];
          }

          // Call ST API to update equipment
          console.log("[PUSH] Calling ST API for", override.st_pricebook_id, "with payload:", JSON.stringify(payload));
          const stResult = await updateEquipmentInServiceTitan(override.st_pricebook_id, payload, tenantId);

          // Clear override
          await pool.query(`
            UPDATE crm.pricebook_overrides
            SET pending_sync = false,
                override_image_url = NULL,
                images_to_delete = NULL,
                last_synced_at = NOW(),
                sync_error = NULL
            WHERE id = $1
          `, [override.id]);

          // Update master table with new assets
          if (stResult.assets) {
            await pool.query(`
              UPDATE master.pricebook_equipment
              SET assets = $1,
                  default_asset_url = $2,
                  updated_at = NOW()
              WHERE st_id = $3 AND tenant_id = $4
            `, [
              JSON.stringify(stResult.assets),
              stResult.defaultAssetUrl || null,
              override.st_pricebook_id,
              tenantId
            ]);
          }

          // Update master table with other fields
          await updateMasterFromOverride(pool, override);

          results.updated.push({ 
            stId: override.st_pricebook_id, 
            code: override.code 
          });

        } catch (err) {
          console.error(`[EQUIPMENT PUSH] Failed to update equipment ${override.code}:`, err.message);
          await pool.query(`
            UPDATE crm.pricebook_overrides
            SET sync_error = $1
            WHERE id = $2
          `, [err.message, override.id]);

          results.failed.push({ 
            stId: override.st_pricebook_id, 
            code: override.code, 
            error: err.message 
          });
        }
      }

      res.json({
        success: results.failed.length === 0,
        results,
        message: `Created: ${results.created.length}, Updated: ${results.updated.length}, Failed: ${results.failed.length}`
      });

    } catch (error) {
      console.error('[EQUIPMENT PUSH] Error:', error);
      res.status(500).json({ error: error.message });
    } finally {
      await pool.end();
    }
  })
);

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatEquipmentResponse(row, isNew = false) {
  return {
    id: isNew ? `new_${row.id}` : row.st_id?.toString(),
    stId: row.st_id?.toString(),
    code: row.code,
    name: row.display_name || row.name,
    displayName: row.display_name,
    description: row.description,
    manufacturer: row.manufacturer,
    model: row.model,
    cost: parseFloat(row.cost) || 0,
    price: parseFloat(row.price) || 0,
    memberPrice: parseFloat(row.member_price) || 0,
    addOnPrice: parseFloat(row.add_on_price) || 0,
    addOnMemberPrice: parseFloat(row.add_on_member_price) || 0,
    hours: parseFloat(row.hours) || 0,
    bonus: parseFloat(row.bonus) || 0,
    commissionBonus: parseFloat(row.commission_bonus) || 0,
    paysCommission: row.pays_commission || false,
    deductAsJobCost: row.deduct_as_job_cost || false,
    chargeableByDefault: row.chargeable_by_default !== false,
    active: row.active !== false,
    taxable: row.taxable,
    account: row.account,
    businessUnitId: row.business_unit_id,
    categories: parseJsonSafe(row.categories, []),
    manufacturerWarranty: parseJsonSafe(row.manufacturer_warranty, null),
    serviceWarranty: parseJsonSafe(row.service_warranty, null),
    primaryVendor: parseJsonSafe(row.primary_vendor, null),
    otherVendors: parseJsonSafe(row.other_vendors, []),
    assets: parseJsonSafe(row.assets, []),
    imageUrl: row.s3_image_url || row.image_url,
    hasPendingChanges: row.pending_sync === true,
    isNew: isNew,
    pushedToSt: row.pushed_to_st,
    pushError: row.push_error,
    updatedAt: row.updated_at,
  };
}

function buildServiceTitanPayload(equipment) {
  const payload = {
    code: equipment.code,
    displayName: equipment.display_name || '',
    description: equipment.description || '',
    manufacturer: equipment.manufacturer || null,
    model: equipment.model || null,
    cost: parseFloat(equipment.cost) || 0,
    price: parseFloat(equipment.price) || 0,
    memberPrice: parseFloat(equipment.member_price) || 0,
    addOnPrice: parseFloat(equipment.add_on_price) || 0,
    addOnMemberPrice: parseFloat(equipment.add_on_member_price) || 0,
    hours: parseFloat(equipment.hours) || 0,
    bonus: parseFloat(equipment.bonus) || 0,
    commissionBonus: parseFloat(equipment.commission_bonus) || 0,
    paysCommission: equipment.pays_commission || false,
    deductAsJobCost: equipment.deduct_as_job_cost || false,
    chargeableByDefault: equipment.chargeable_by_default !== false,
    active: equipment.active !== false,
    taxable: equipment.taxable,
    account: equipment.account || null,
    categories: parseJsonSafe(equipment.categories, []),
    manufacturerWarranty: parseJsonSafe(equipment.manufacturer_warranty, null),
    serviceWarranty: parseJsonSafe(equipment.service_warranty, null),
    primaryVendor: parseJsonSafe(equipment.primary_vendor, null),
    otherVendors: parseJsonSafe(equipment.other_vendors, []),
  };
  return payload;
}

function buildUpdatePayload(override) {
  const payload = {};
  if (override.override_name) payload.displayName = override.override_name;
  if (override.override_description) payload.description = override.override_description;
  if (override.override_manufacturer) payload.manufacturer = override.override_manufacturer;
  if (override.override_model) payload.model = override.override_model;
  if (override.override_price !== null) payload.price = parseFloat(override.override_price);
  if (override.override_cost !== null) payload.cost = parseFloat(override.override_cost);
  if (override.override_active !== null) payload.active = override.override_active;
  if (override.override_member_price !== null) payload.memberPrice = parseFloat(override.override_member_price);
  if (override.override_add_on_price !== null) payload.addOnPrice = parseFloat(override.override_add_on_price);
  if (override.override_add_on_member_price !== null) payload.addOnMemberPrice = parseFloat(override.override_add_on_member_price);
  if (override.override_hours !== null) payload.hours = parseFloat(override.override_hours);
  if (override.override_bonus !== null) payload.bonus = parseFloat(override.override_bonus);
  if (override.override_commission_bonus !== null) payload.commissionBonus = parseFloat(override.override_commission_bonus);
  if (override.override_pays_commission !== null) payload.paysCommission = override.override_pays_commission;
  if (override.override_deduct_as_job_cost !== null) payload.deductAsJobCost = override.override_deduct_as_job_cost;
  if (override.override_chargeable_by_default !== null) payload.chargeableByDefault = override.override_chargeable_by_default;
  if (override.override_manufacturer_warranty) payload.manufacturerWarranty = parseJsonSafe(override.override_manufacturer_warranty, null);
  if (override.override_service_warranty) payload.serviceWarranty = parseJsonSafe(override.override_service_warranty, null);
  return payload;
}

async function createEquipmentInServiceTitan(payload, tenantId) {
  const response = await stRequest(
    `https://api.servicetitan.io/pricebook/v2/tenant/${tenantId}/equipment`,
    {
      method: 'POST',
      body: payload,
    }
  );

  if (!response.data) {
    throw new Error(response.error || 'Failed to create equipment in ServiceTitan');
  }

  return response.data;
}

async function updateEquipmentInServiceTitan(stId, payload, tenantId) {
  const response = await stRequest(
    `https://api.servicetitan.io/pricebook/v2/tenant/${tenantId}/equipment/${stId}`,
    {
      method: 'PATCH',
      body: payload,
    }
  );

  if (!response.data) {
    throw new Error(response.error || 'Failed to update equipment in ServiceTitan');
  }

  return response.data;
}

async function uploadImageToServiceTitan(imageUrl, tenantId, filename = null) {
  try {
    console.log(`[ST IMAGE UPLOAD] Starting upload for: ${imageUrl}`);

    const imageResponse = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; LAZI-CRM/1.0)',
        'Accept': 'image/*',
      },
    });

    if (!imageResponse.ok) {
      console.error(`[ST IMAGE UPLOAD] Failed to fetch image from ${imageUrl}: ${imageResponse.status}`);
      return null;
    }

    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
    const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';
    const ext = contentType.includes('png') ? 'png' :
                contentType.includes('gif') ? 'gif' :
                contentType.includes('webp') ? 'webp' : 'jpg';

    const finalFilename = filename || `equipment_${Date.now()}.${ext}`;

    console.log(`[ST IMAGE UPLOAD] Uploading to ST: ${finalFilename} (${imageBuffer.length} bytes, ${contentType})`);

    const { getAccessToken } = await import('../services/tokenManager.js');
    const accessToken = await getAccessToken();

    const formData = new FormData();
    const imageBlob = new Blob([imageBuffer], { type: contentType });
    formData.append('file', imageBlob, finalFilename);

    const stResponse = await fetch(
      `https://api.servicetitan.io/pricebook/v2/tenant/${tenantId}/images`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'ST-App-Key': process.env.SERVICE_TITAN_APP_KEY,
        },
        body: formData,
      }
    );

    if (!stResponse.ok) {
      const errorText = await stResponse.text();
      console.error(`[ST IMAGE UPLOAD] ST API error: ${stResponse.status} - ${errorText}`);
      return null;
    }

    const stResult = await stResponse.json();
    console.log(`[ST IMAGE UPLOAD] Success! ST response:`, JSON.stringify(stResult));

    return stResult.path || stResult.url || stResult.imageUrl || stResult;

  } catch (error) {
    console.error(`[ST IMAGE UPLOAD] Error uploading image:`, error.message);
    return null;
  }
}

async function insertIntoMaster(pool, stResponse, tenantId) {
  await pool.query(`
    INSERT INTO master.pricebook_equipment (
      st_id, tenant_id, code, name, display_name, description,
      manufacturer, model,
      cost, price, member_price, add_on_price, add_on_member_price,
      hours, bonus, commission_bonus, pays_commission, deduct_as_job_cost,
      chargeable_by_default, active, taxable, account,
      categories, manufacturer_warranty, service_warranty,
      last_synced_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, NOW())
    ON CONFLICT (st_id, tenant_id) DO UPDATE SET
      display_name = EXCLUDED.display_name,
      description = EXCLUDED.description,
      manufacturer = EXCLUDED.manufacturer,
      model = EXCLUDED.model,
      cost = EXCLUDED.cost,
      price = EXCLUDED.price,
      member_price = EXCLUDED.member_price,
      add_on_price = EXCLUDED.add_on_price,
      add_on_member_price = EXCLUDED.add_on_member_price,
      hours = EXCLUDED.hours,
      bonus = EXCLUDED.bonus,
      commission_bonus = EXCLUDED.commission_bonus,
      pays_commission = EXCLUDED.pays_commission,
      deduct_as_job_cost = EXCLUDED.deduct_as_job_cost,
      chargeable_by_default = EXCLUDED.chargeable_by_default,
      active = EXCLUDED.active,
      taxable = EXCLUDED.taxable,
      account = EXCLUDED.account,
      categories = EXCLUDED.categories,
      manufacturer_warranty = EXCLUDED.manufacturer_warranty,
      service_warranty = EXCLUDED.service_warranty,
      updated_at = NOW(),
      last_synced_at = NOW()
  `, [
    stResponse.id, tenantId, stResponse.code, stResponse.displayName || stResponse.code,
    stResponse.displayName, stResponse.description,
    stResponse.manufacturer, stResponse.model,
    stResponse.cost, stResponse.price, stResponse.memberPrice, stResponse.addOnPrice, stResponse.addOnMemberPrice,
    stResponse.hours, stResponse.bonus, stResponse.commissionBonus, stResponse.paysCommission, stResponse.deductAsJobCost,
    stResponse.chargeableByDefault, stResponse.active, stResponse.taxable, stResponse.account,
    JSON.stringify(stResponse.categories || []),
    JSON.stringify(stResponse.manufacturerWarranty || null),
    JSON.stringify(stResponse.serviceWarranty || null)
  ]);
}

async function updateMasterFromOverride(pool, override) {
  const updates = [];
  const values = [];
  let idx = 1;

  if (override.override_name) {
    updates.push(`display_name = $${idx++}`);
    values.push(override.override_name);
  }
  if (override.override_description) {
    updates.push(`description = $${idx++}`);
    values.push(override.override_description);
  }
  if (override.override_manufacturer) {
    updates.push(`manufacturer = $${idx++}`);
    values.push(override.override_manufacturer);
  }
  if (override.override_model) {
    updates.push(`model = $${idx++}`);
    values.push(override.override_model);
  }
  if (override.override_price !== null) {
    updates.push(`price = $${idx++}`);
    values.push(override.override_price);
  }
  if (override.override_cost !== null) {
    updates.push(`cost = $${idx++}`);
    values.push(override.override_cost);
  }
  if (override.override_active !== null) {
    updates.push(`active = $${idx++}`);
    values.push(override.override_active);
  }
  if (override.override_member_price !== null) {
    updates.push(`member_price = $${idx++}`);
    values.push(override.override_member_price);
  }
  if (override.override_add_on_price !== null) {
    updates.push(`add_on_price = $${idx++}`);
    values.push(override.override_add_on_price);
  }
  if (override.override_hours !== null) {
    updates.push(`hours = $${idx++}`);
    values.push(override.override_hours);
  }

  if (updates.length > 0) {
    updates.push(`updated_at = NOW()`);
    updates.push(`last_synced_at = NOW()`);
    values.push(override.st_pricebook_id, override.tenant_id);
    
    await pool.query(`
      UPDATE master.pricebook_equipment
      SET ${updates.join(', ')}
      WHERE st_id = $${idx++} AND tenant_id = $${idx}
    `, values);
  }
}

export default router;
