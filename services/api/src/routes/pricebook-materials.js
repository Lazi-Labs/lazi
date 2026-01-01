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
      let newMaterialsWhereConditions = ['n.tenant_id = $1', 'n.pushed_to_st = false'];

      // Active filter with CRM override (default: show only active)
      if (active === 'true') {
        whereConditions.push('COALESCE(o.override_active, m.active) = true');
        newMaterialsWhereConditions.push('n.active = true');
      } else if (active === 'false') {
        whereConditions.push('COALESCE(o.override_active, m.active) = false');
        newMaterialsWhereConditions.push('n.active = false');
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
        newMaterialsWhereConditions.push(`(
          n.display_name ILIKE $${params.length} OR
          n.code ILIKE $${params.length} OR
          n.description ILIKE $${params.length}
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
          // Also filter new materials by category
          const newCategoryConditions = categoryIds.map((_, idx) => {
            return `n.categories @> $${params.length - categoryIds.length + idx + 1}::jsonb`;
          });
          newMaterialsWhereConditions.push(`(${newCategoryConditions.join(' OR ')})`);
        } else {
          // Single category - check if the ID is in the categories array
          params.push(parseInt(categoryIds[0], 10));
          whereConditions.push(`m.categories @> $${params.length}::jsonb`);
          newMaterialsWhereConditions.push(`n.categories @> $${params.length}::jsonb`);
        }
      }

      const whereClause = whereConditions.join(' AND ');
      const newMaterialsWhereClause = newMaterialsWhereConditions.join(' AND ');

      // Validate sort
      const allowedSorts = ['name', 'code', 'price', 'cost', 'created_at', 'updated_at'];
      const safeSort = allowedSorts.includes(sort_by) ? sort_by : 'name';
      const safeOrder = sort_order.toLowerCase() === 'desc' ? 'DESC' : 'ASC';

      // Get total count from both tables
      const countResult = await pool.query(
        `SELECT
          (SELECT COUNT(*) FROM master.pricebook_materials m
           LEFT JOIN crm.pricebook_overrides o
             ON o.st_pricebook_id = m.st_id
             AND o.tenant_id = m.tenant_id
             AND o.item_type = 'material'
           WHERE ${whereClause}) +
          (SELECT COUNT(*) FROM crm.pricebook_new_materials n
           WHERE ${newMaterialsWhereClause}) as total`,
        params
      );
      const total = parseInt(countResult.rows[0].total, 10);

      // Get materials with pagination and CRM overrides
      const pageNum = Math.max(1, parseInt(page, 10));
      const limitNum = Math.min(500, Math.max(1, parseInt(limit, 10)));
      const offset = (pageNum - 1) * limitNum;

      params.push(limitNum, offset);

      // UNION query to include both existing and new materials
      const query = `
        SELECT * FROM (
          -- Existing materials from master table
          SELECT
            m.id,
            m.st_id::text as st_id,
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
            o.custom_tags,
            false as is_new,
            null as push_error
          FROM master.pricebook_materials m
          LEFT JOIN crm.pricebook_overrides o
            ON o.st_pricebook_id = m.st_id
            AND o.tenant_id = m.tenant_id
            AND o.item_type = 'material'
          WHERE ${whereClause}

          UNION ALL

          -- New materials not yet pushed to ST
          SELECT
            n.id,
            ('new_' || n.id::text) as st_id,
            n.code,
            n.display_name as name,
            n.display_name,
            n.description,
            n.price,
            n.member_price,
            n.add_on_price,
            n.cost,
            n.active,
            n.taxable,
            n.unit_of_measure,
            n.account,
            n.s3_image_url as image_url,
            n.categories,
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
            null as reorder_threshold,
            null as custom_tags,
            true as is_new,
            n.push_error
          FROM crm.pricebook_new_materials n
          WHERE ${newMaterialsWhereClause}
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
// POST /api/pricebook/materials/:stId/pull
// Pull a single material from ServiceTitan and update local record
// ============================================================================

router.post(
  '/:stId/pull',
  asyncHandler(async (req, res) => {
    const pool = getPool();
    const tenantId = getTenantId(req);
    const { stId } = req.params;

    console.log(`[MATERIALS PULL] Pulling material ${stId} from ServiceTitan`);

    try {
      // Fetch material from ServiceTitan
      const stApiUrl = `https://api.servicetitan.io/pricebook/v2/tenant/${tenantId}/materials/${stId}`;
      const response = await stRequest(stApiUrl, { method: 'GET' });

      if (!response.data) {
        return res.status(404).json({ error: 'Material not found in ServiceTitan' });
      }

      const material = response.data;
      console.log(`[MATERIALS PULL] Fetched material:`, material.code, material.displayName);

      // Update master table with ALL fields including assets
      await pool.query(`
        UPDATE master.pricebook_materials SET
          code = $3,
          name = $4,
          display_name = $4,
          description = $5,
          cost = $6,
          price = $7,
          member_price = $8,
          add_on_price = $9,
          add_on_member_price = $10,
          hours = $11,
          bonus = $12,
          commission_bonus = $13,
          pays_commission = $14,
          deduct_as_job_cost = $15,
          is_inventory = $16,
          is_configurable_material = $17,
          display_in_amount = $18,
          is_other_direct_cost = $19,
          chargeable_by_default = $20,
          active = $21,
          taxable = $22,
          unit_of_measure = $23,
          account = $24,
          categories = $25,
          primary_vendor = $26,
          other_vendors = $27,
          st_modified_on = $28,
          assets = $29,
          default_asset_url = $30,
          updated_at = NOW(),
          last_synced_at = NOW()
        WHERE st_id = $1 AND tenant_id = $2
      `, [
        parseInt(stId, 10),
        tenantId,
        material.code || null,
        material.displayName || material.name || null,
        material.description || null,
        material.cost || 0,
        material.price || 0,
        material.memberPrice || 0,
        material.addOnPrice || 0,
        material.addOnMemberPrice || 0,
        material.hours || 0,
        material.bonus || 0,
        material.commissionBonus || 0,
        material.paysCommission || false,
        material.deductAsJobCost || false,
        material.isInventory || false,
        material.isConfigurableMaterial || false,
        material.displayInAmount || false,
        material.isOtherDirectCost || false,
        material.chargeableByDefault !== false,
        material.active !== false,
        material.taxable,
        material.unitOfMeasure || null,
        material.account || null,
        JSON.stringify(material.categories || []),
        JSON.stringify(material.primaryVendor || null),
        JSON.stringify(material.otherVendors || []),
        material.modifiedOn || null,
        JSON.stringify(material.assets || []),
        material.defaultAssetUrl || null
      ]);

      // Clear ALL pending overrides including image URL since we just pulled fresh data from ST
      await pool.query(`
        UPDATE crm.pricebook_overrides
        SET pending_sync = false,
            last_synced_at = NOW(),
            override_image_url = NULL,
            override_image_data = NULL,
            override_image_mime_type = NULL,
            override_image_filename = NULL,
            delete_image = false
        WHERE st_pricebook_id = $1 AND tenant_id = $2 AND item_type = 'material'
      `, [parseInt(stId, 10), tenantId]);

      console.log(`[MATERIALS PULL] Updated local record for material ${stId}`);

      res.json({
        success: true,
        message: `Material ${material.code} pulled from ServiceTitan`,
        data: {
          stId: material.id,
          code: material.code,
          name: material.displayName,
          description: material.description,
          cost: material.cost,
          price: material.price,
          memberPrice: material.memberPrice,
          addOnPrice: material.addOnPrice,
          addOnMemberPrice: material.addOnMemberPrice,
          hours: material.hours,
          bonus: material.bonus,
          commissionBonus: material.commissionBonus,
          paysCommission: material.paysCommission,
          deductAsJobCost: material.deductAsJobCost,
          isInventory: material.isInventory,
          active: material.active,
          taxable: material.taxable,
          unitOfMeasure: material.unitOfMeasure,
          categories: material.categories,
          primaryVendor: material.primaryVendor,
          modifiedOn: material.modifiedOn,
          assets: material.assets || [],
          defaultAssetUrl: material.defaultAssetUrl
        }
      });

    } catch (error) {
      console.error('[MATERIALS PULL] Error:', error);
      res.status(500).json({ error: error.message });
    } finally {
      await pool.end();
    }
  })
);

// ============================================================================
// GET /api/pricebook/materials/:stId
// Get single material by ServiceTitan ID with CRM overrides
// Also handles new materials (prefixed with 'new_')
// ============================================================================

router.get(
  '/:stId',
  asyncHandler(async (req, res) => {
    const pool = getPool();
    const tenantId = getTenantId(req);
    const { stId } = req.params;

    try {
      // Check if this is a new material (not yet pushed to ST)
      const isNewMaterial = stId.startsWith('new_');

      if (isNewMaterial) {
        // Query new materials table
        const newId = stId.replace('new_', '');
        const result = await pool.query(`
          SELECT
            n.id,
            n.tenant_id,
            n.code,
            n.display_name,
            n.description,
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
            n.is_inventory,
            n.is_configurable_material,
            n.display_in_amount,
            n.is_other_direct_cost,
            n.chargeable_by_default,
            n.active,
            n.taxable,
            n.unit_of_measure,
            n.account,
            n.cost_of_sale_account,
            n.asset_account,
            n.business_unit_id,
            n.general_ledger_account_id,
            n.cost_type_id,
            n.budget_cost_code,
            n.budget_cost_type,
            n.categories,
            n.primary_vendor,
            n.other_vendors,
            n.assets,
            n.s3_image_url,
            n.st_id,
            n.pushed_to_st,
            n.pushed_at,
            n.push_error,
            n.created_at,
            n.updated_at,
            n.created_by
          FROM crm.pricebook_new_materials n
          WHERE n.id = $1 AND n.tenant_id = $2
        `, [parseInt(newId, 10), tenantId]);

        if (result.rows.length === 0) {
          return res.status(404).json({ error: 'Material not found' });
        }

        const row = result.rows[0];
        return res.json({
          id: `new_${row.id}`,
          stId: row.st_id ? row.st_id.toString() : null,
          code: row.code,
          displayName: row.display_name,
          name: row.display_name,
          description: row.description,

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
          isInventory: row.is_inventory || false,
          isConfigurableMaterial: row.is_configurable_material || false,
          chargeableByDefault: row.chargeable_by_default !== false,
          displayInAmount: row.display_in_amount || false,
          isOtherDirectCost: row.is_other_direct_cost || false,

          // Categorization
          categories: row.categories || [],
          unitOfMeasure: row.unit_of_measure,

          // Accounting
          account: row.account,
          costOfSaleAccount: row.cost_of_sale_account,
          assetAccount: row.asset_account,
          generalLedgerAccountId: row.general_ledger_account_id,
          costTypeId: row.cost_type_id,
          budgetCostCode: row.budget_cost_code,
          budgetCostType: row.budget_cost_type,

          // Vendors
          primaryVendor: row.primary_vendor,
          otherVendors: row.other_vendors || [],

          // Assets
          assets: row.assets || [],
          imageUrl: row.s3_image_url,
          s3ImageUrl: row.s3_image_url,

          // Business
          businessUnitId: row.business_unit_id,

          // Timestamps
          createdAt: row.created_at,
          updatedAt: row.updated_at,

          // New material status
          isNew: true,
          pushedToSt: row.pushed_to_st || false,
          pushedAt: row.pushed_at,
          pushError: row.push_error,
          createdBy: row.created_by,

          // CRM (not applicable for new materials)
          overrideId: null,
          hasPendingChanges: false,
          syncError: null,
          internalNotes: null,
          reorderThreshold: null,
          customTags: null,
        });
      }

      // Query existing material from master table
      const result = await pool.query(`
        SELECT
          m.id,
          m.st_id,
          m.tenant_id,
          m.code,
          COALESCE(o.override_name, m.display_name, m.name) as display_name,
          m.name,
          COALESCE(o.override_description, m.description) as description,

          -- Pricing (with overrides)
          COALESCE(o.override_cost, m.cost) as cost,
          COALESCE(o.override_price, m.price) as price,
          COALESCE(o.override_member_price, m.member_price) as member_price,
          COALESCE(o.override_add_on_price, m.add_on_price) as add_on_price,
          COALESCE(o.override_add_on_member_price, m.add_on_member_price) as add_on_member_price,

          -- Labor & Commission (with overrides)
          COALESCE(o.override_hours, m.hours) as hours,
          COALESCE(o.override_bonus, m.bonus) as bonus,
          COALESCE(o.override_commission_bonus, m.commission_bonus) as commission_bonus,
          COALESCE(o.override_pays_commission, m.pays_commission) as pays_commission,

          -- Flags (with overrides)
          COALESCE(o.override_active, m.active) as active,
          COALESCE(o.override_taxable, m.taxable) as taxable,
          COALESCE(o.override_deduct_as_job_cost, m.deduct_as_job_cost) as deduct_as_job_cost,
          COALESCE(o.override_is_inventory, m.is_inventory) as is_inventory,
          m.is_configurable_material,
          COALESCE(o.override_chargeable_by_default, m.chargeable_by_default) as chargeable_by_default,
          m.display_in_amount,
          m.is_other_direct_cost,

          -- Categorization
          m.categories,
          COALESCE(o.override_unit_of_measure, m.unit_of_measure) as unit_of_measure,

          -- Accounting
          m.account,
          m.cost_of_sale_account,
          m.asset_account,
          m.general_ledger_account_id,
          m.cost_type_id,
          m.budget_cost_code,
          m.budget_cost_type,

          -- Vendors (with overrides)
          COALESCE(o.override_primary_vendor, m.primary_vendor) as primary_vendor,
          COALESCE(o.override_other_vendors, m.other_vendors) as other_vendors,

          -- Assets
          m.assets,
          m.default_asset_url,
          COALESCE(o.override_image_url, m.s3_image_url, m.default_asset_url) as image_url,
          m.s3_image_url,

          -- Business
          COALESCE(o.override_business_unit_id, m.business_unit_id) as business_unit_id,

          -- External
          m.external_id,
          m.source,

          -- Timestamps
          m.st_created_on,
          m.st_modified_on,
          m.created_by_id,
          m.created_at,
          m.updated_at,
          m.last_synced_at,

          -- CRM status
          o.id as override_id,
          o.pending_sync as has_pending_changes,
          o.sync_error,
          o.internal_notes,
          o.preferred_vendor as override_preferred_vendor,
          o.reorder_threshold,
          o.custom_tags,
          o.images_to_delete

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
        isInventory: row.is_inventory || false,
        isConfigurableMaterial: row.is_configurable_material || false,
        chargeableByDefault: row.chargeable_by_default !== false,
        displayInAmount: row.display_in_amount || false,
        isOtherDirectCost: row.is_other_direct_cost || false,

        // Categorization
        categories: row.categories || [],
        unitOfMeasure: row.unit_of_measure,

        // Accounting
        account: row.account,
        costOfSaleAccount: row.cost_of_sale_account,
        assetAccount: row.asset_account,
        generalLedgerAccountId: row.general_ledger_account_id,
        costTypeId: row.cost_type_id,
        budgetCostCode: row.budget_cost_code,
        budgetCostType: row.budget_cost_type,

        // Vendors
        primaryVendor: row.primary_vendor,
        otherVendors: row.other_vendors || [],

        // Assets (filtered to exclude images marked for deletion)
        assets: filteredAssets,
        defaultAssetUrl: row.default_asset_url,
        imageUrl: row.image_url,
        s3ImageUrl: row.s3_image_url,
        imagesToDelete: imagesToDelete, // Include for frontend reference

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
        reorderThreshold: row.reorder_threshold,
        customTags: row.custom_tags,
      });
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
          -- Pricing
          cost, price, member_price, add_on_price, add_on_member_price,
          -- Labor & Commission
          hours, bonus, commission_bonus, pays_commission,
          -- Flags
          active, taxable, deduct_as_job_cost, is_inventory,
          is_configurable_material, chargeable_by_default, display_in_amount, is_other_direct_cost,
          -- Categorization
          categories, unit_of_measure,
          -- Accounting
          account, cost_of_sale_account, asset_account,
          general_ledger_account_id, cost_type_id, budget_cost_code, budget_cost_type,
          -- Vendors
          primary_vendor, other_vendors,
          -- Assets
          assets, default_asset_url,
          -- Business
          business_unit_id,
          -- External
          external_id, source,
          -- Timestamps
          st_created_on, st_modified_on, created_by_id,
          last_synced_at
        )
        SELECT 
          r.st_id,
          r.tenant_id::text,
          r.code,
          COALESCE(r.display_name, 'Unnamed Material'),
          r.display_name,
          r.description,
          -- Pricing
          COALESCE(r.cost, 0),
          COALESCE(r.price, 0),
          COALESCE(r.member_price, 0),
          COALESCE(r.add_on_price, 0),
          COALESCE((r.full_data->>'addOnMemberPrice')::decimal, 0),
          -- Labor & Commission
          COALESCE((r.full_data->>'hours')::decimal, 0),
          COALESCE((r.full_data->>'bonus')::decimal, 0),
          COALESCE((r.full_data->>'commissionBonus')::decimal, 0),
          COALESCE((r.full_data->>'paysCommission')::boolean, false),
          -- Flags
          COALESCE(r.active, true),
          r.taxable,
          COALESCE((r.full_data->>'deductAsJobCost')::boolean, false),
          COALESCE((r.full_data->>'isInventory')::boolean, false),
          COALESCE((r.full_data->>'isConfigurableMaterial')::boolean, false),
          COALESCE((r.full_data->>'chargeableByDefault')::boolean, true),
          COALESCE((r.full_data->>'displayInAmount')::boolean, false),
          COALESCE((r.full_data->>'isOtherDirectCost')::boolean, false),
          -- Categorization
          r.categories,
          r.unit_of_measure,
          -- Accounting
          r.full_data->>'account',
          r.full_data->>'costOfSaleAccount',
          r.full_data->>'assetAccount',
          (r.full_data->>'generalLedgerAccountId')::bigint,
          (r.full_data->>'costTypeId')::bigint,
          r.full_data->>'budgetCostCode',
          r.full_data->>'budgetCostType',
          -- Vendors
          r.primary_vendor,
          COALESCE(r.other_vendors, '[]'::jsonb),
          -- Assets
          COALESCE(r.full_data->'assets', '[]'::jsonb),
          r.full_data->>'defaultAssetUrl',
          -- Business
          (r.full_data->>'businessUnitId')::bigint,
          -- External
          r.full_data->>'externalId',
          r.full_data->>'source',
          -- Timestamps
          r.created_on,
          r.modified_on,
          (r.full_data->>'createdById')::bigint,
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
          add_on_member_price = EXCLUDED.add_on_member_price,
          hours = EXCLUDED.hours,
          bonus = EXCLUDED.bonus,
          commission_bonus = EXCLUDED.commission_bonus,
          pays_commission = EXCLUDED.pays_commission,
          active = EXCLUDED.active,
          taxable = EXCLUDED.taxable,
          deduct_as_job_cost = EXCLUDED.deduct_as_job_cost,
          is_inventory = EXCLUDED.is_inventory,
          is_configurable_material = EXCLUDED.is_configurable_material,
          chargeable_by_default = EXCLUDED.chargeable_by_default,
          display_in_amount = EXCLUDED.display_in_amount,
          is_other_direct_cost = EXCLUDED.is_other_direct_cost,
          categories = EXCLUDED.categories,
          unit_of_measure = EXCLUDED.unit_of_measure,
          account = EXCLUDED.account,
          cost_of_sale_account = EXCLUDED.cost_of_sale_account,
          asset_account = EXCLUDED.asset_account,
          general_ledger_account_id = EXCLUDED.general_ledger_account_id,
          cost_type_id = EXCLUDED.cost_type_id,
          budget_cost_code = EXCLUDED.budget_cost_code,
          budget_cost_type = EXCLUDED.budget_cost_type,
          primary_vendor = EXCLUDED.primary_vendor,
          other_vendors = EXCLUDED.other_vendors,
          assets = EXCLUDED.assets,
          default_asset_url = EXCLUDED.default_asset_url,
          business_unit_id = EXCLUDED.business_unit_id,
          external_id = EXCLUDED.external_id,
          source = EXCLUDED.source,
          st_created_on = EXCLUDED.st_created_on,
          st_modified_on = EXCLUDED.st_modified_on,
          created_by_id = EXCLUDED.created_by_id,
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
// GET /api/pricebook/materials/pending
// List materials pending push to ServiceTitan
// ============================================================================

router.get(
  '/pending',
  asyncHandler(async (req, res) => {
    const pool = getPool();
    const tenantId = getTenantId(req);

    try {
      const [newMaterials, modifiedMaterials] = await Promise.all([
        pool.query(`
          SELECT id, code, display_name, price, cost, created_at, push_error
          FROM crm.pricebook_new_materials
          WHERE tenant_id = $1 AND pushed_to_st = false
          ORDER BY created_at DESC
        `, [tenantId]),

        pool.query(`
          SELECT o.st_pricebook_id, m.code, m.display_name, o.updated_at, o.sync_error
          FROM crm.pricebook_overrides o
          JOIN master.pricebook_materials m ON o.st_pricebook_id = m.st_id AND o.tenant_id = m.tenant_id
          WHERE o.tenant_id = $1 AND o.item_type = 'material' AND o.pending_sync = true
          ORDER BY o.updated_at DESC
        `, [tenantId])
      ]);

      res.json({
        new: newMaterials.rows,
        modified: modifiedMaterials.rows,
        total: newMaterials.rows.length + modifiedMaterials.rows.length,
      });

    } catch (error) {
      console.error('[MATERIALS PENDING] Error:', error);
      res.status(500).json({ error: error.message });
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

// ============================================================================
// POST /api/pricebook/materials
// Create new material (stores in CRM, pending push to ST)
// ============================================================================

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const pool = getPool();
    const tenantId = getTenantId(req);
    const material = req.body;

    // Validate required fields
    const requiredFields = ['code', 'description'];
    const missing = requiredFields.filter(f => !material[f]);
    if (missing.length > 0) {
      return res.status(400).json({ 
        error: 'Missing required fields', 
        fields: missing 
      });
    }

    try {
      // Check if code already exists
      const existing = await pool.query(`
        SELECT 1 FROM master.pricebook_materials WHERE code = $1 AND tenant_id = $2
        UNION
        SELECT 1 FROM crm.pricebook_new_materials WHERE code = $1 AND tenant_id = $2
      `, [material.code, tenantId]);

      if (existing.rows.length > 0) {
        return res.status(409).json({ error: 'Material code already exists' });
      }

      // Insert new material
      console.log("[MATERIALS CREATE] Creating new material with code:", material.code);
      const result = await pool.query(`
        INSERT INTO crm.pricebook_new_materials (
          tenant_id, code, display_name, description,
          cost, price, member_price, add_on_price, add_on_member_price,
          hours, bonus, commission_bonus,
          pays_commission, deduct_as_job_cost, is_inventory,
          is_configurable_material, display_in_amount, is_other_direct_cost,
          chargeable_by_default, active, taxable,
          unit_of_measure, account, business_unit_id,
          categories, primary_vendor, other_vendors, assets,
          created_by
        ) VALUES (
          $1, $2, $3, $4,
          $5, $6, $7, $8, $9,
          $10, $11, $12,
          $13, $14, $15,
          $16, $17, $18,
          $19, $20, $21,
          $22, $23, $24,
          $25, $26, $27, $28,
          $29
        )
        RETURNING *
      `, [
        tenantId,
        material.code,
        material.displayName || material.name || null,
        material.description,
        material.cost || 0,
        material.price || 0,
        material.memberPrice || 0,
        material.addOnPrice || 0,
        material.addOnMemberPrice || 0,
        material.hours || 0,
        material.bonus || 0,
        material.commissionBonus || 0,
        material.paysCommission || false,
        material.deductAsJobCost || false,
        material.isInventory || false,
        material.isConfigurableMaterial || false,
        material.displayInAmount || false,
        material.isOtherDirectCost || false,
        material.chargeableByDefault !== false,
        material.active !== false,
        material.taxable !== false,
        material.unitOfMeasure || null,
        material.account || null,
        material.businessUnitId || null,
        JSON.stringify(material.categories || []),
        JSON.stringify(material.primaryVendor || null),
        JSON.stringify(material.otherVendors || []),
        JSON.stringify(material.assets || []),
        material.createdBy || 'system'
      ]);

      const row = result.rows[0];
      res.status(201).json({
        success: true,
        data: formatMaterialResponse(row, true),
        message: 'Material created. Click PUSH to sync to ServiceTitan.',
        isNew: true
      });

    } catch (error) {
      console.error('[MATERIALS CREATE] Error:', error);
      res.status(500).json({ error: error.message });
    } finally {
      await pool.end();
    }
  })
);

// ============================================================================
// PUT /api/pricebook/materials/:stId
// Update existing material (creates CRM override) or update new material
// ============================================================================

router.put(
  '/:stId',
  asyncHandler(async (req, res) => {
    const pool = getPool();
    const tenantId = getTenantId(req);
    const { stId } = req.params;
    const changes = req.body;

    try {
      const isNewMaterial = stId.startsWith('new_') || parseInt(stId) < 0;

      if (isNewMaterial) {
        // Update the new material directly
        const id = stId.replace('new_', '');
        console.log("[MATERIALS UPDATE] Updating new material:", id);
        const result = await pool.query(`
          UPDATE crm.pricebook_new_materials SET
            display_name = COALESCE($3, display_name),
            description = COALESCE($4, description),
            cost = COALESCE($5, cost),
            price = COALESCE($6, price),
            member_price = COALESCE($7, member_price),
            add_on_price = COALESCE($8, add_on_price),
            add_on_member_price = COALESCE($9, add_on_member_price),
            hours = COALESCE($10, hours),
            bonus = COALESCE($11, bonus),
            commission_bonus = COALESCE($12, commission_bonus),
            pays_commission = COALESCE($13, pays_commission),
            deduct_as_job_cost = COALESCE($14, deduct_as_job_cost),
            is_inventory = COALESCE($15, is_inventory),
            is_configurable_material = COALESCE($16, is_configurable_material),
            display_in_amount = COALESCE($17, display_in_amount),
            is_other_direct_cost = COALESCE($18, is_other_direct_cost),
            chargeable_by_default = COALESCE($19, chargeable_by_default),
            active = COALESCE($20, active),
            taxable = COALESCE($21, taxable),
            unit_of_measure = COALESCE($22, unit_of_measure),
            categories = COALESCE($23, categories),
            primary_vendor = COALESCE($24, primary_vendor),
            other_vendors = COALESCE($25, other_vendors),
            s3_image_url = COALESCE($26, s3_image_url),
            pending_images = COALESCE($27, pending_images),
            updated_at = NOW()
          WHERE id = $1 AND tenant_id = $2
          RETURNING *
        `, [
          id, tenantId,
          changes.displayName || changes.name || null,
          changes.description,
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
          changes.isInventory,
          changes.isConfigurableMaterial,
          changes.displayInAmount,
          changes.isOtherDirectCost,
          changes.chargeableByDefault,
          changes.active,
          changes.taxable,
          changes.unitOfMeasure,
          changes.categories ? JSON.stringify(changes.categories) : null,
          changes.primaryVendor ? JSON.stringify(changes.primaryVendor) : null,
          changes.otherVendors ? JSON.stringify(changes.otherVendors) : null,
          changes.defaultImageUrl || changes.imageUrl || null,
          changes.pendingImages ? JSON.stringify(changes.pendingImages) : null
        ]);

        if (result.rows.length === 0) {
          return res.status(404).json({ error: 'Material not found' });
        }

        return res.json({
          success: true,
          data: formatMaterialResponse(result.rows[0], true),
          message: 'Material updated. Click PUSH to sync to ServiceTitan.'
        });
      }

      // Create/update override for existing material
      console.log("[MATERIALS UPDATE] Saving override for ST ID:", stId);

      // Handle pending images - store as JSON array if multiple, or as single URL for backward compat
      let imageUrlValue = null;
      if (changes.pendingImages && Array.isArray(changes.pendingImages) && changes.pendingImages.length > 0) {
        // Store as JSON array string
        imageUrlValue = JSON.stringify(changes.pendingImages);
        console.log("[MATERIALS UPDATE] Storing pending images:", imageUrlValue);
      } else if (changes.defaultImageUrl || changes.imageUrl) {
        imageUrlValue = changes.defaultImageUrl || changes.imageUrl;
      }

      // Handle images to delete - store as JSON array
      let imagesToDeleteValue = null;
      if (changes.imagesToDelete && Array.isArray(changes.imagesToDelete) && changes.imagesToDelete.length > 0) {
        imagesToDeleteValue = JSON.stringify(changes.imagesToDelete);
        console.log("[MATERIALS UPDATE] Storing images to delete:", imagesToDeleteValue);
      }

      const result = await pool.query(`
        INSERT INTO crm.pricebook_overrides (
          st_pricebook_id, tenant_id, item_type,
          override_name, override_description, override_price, override_cost,
          override_active, override_member_price, override_add_on_price,
          override_add_on_member_price, override_hours, override_bonus,
          override_commission_bonus, override_pays_commission, override_deduct_as_job_cost,
          override_is_inventory, override_unit_of_measure, override_chargeable_by_default,
          override_primary_vendor, override_other_vendors, override_image_url, images_to_delete,
          pending_sync, updated_at
        ) VALUES ($1, $2, 'material', $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, true, NOW())
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
          override_is_inventory = COALESCE($16, crm.pricebook_overrides.override_is_inventory),
          override_unit_of_measure = COALESCE($17, crm.pricebook_overrides.override_unit_of_measure),
          override_chargeable_by_default = COALESCE($18, crm.pricebook_overrides.override_chargeable_by_default),
          override_primary_vendor = COALESCE($19, crm.pricebook_overrides.override_primary_vendor),
          override_other_vendors = COALESCE($20, crm.pricebook_overrides.override_other_vendors),
          override_image_url = COALESCE($21, crm.pricebook_overrides.override_image_url),
          images_to_delete = COALESCE($22, crm.pricebook_overrides.images_to_delete),
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
        changes.isInventory,
        changes.unitOfMeasure,
        changes.chargeableByDefault,
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
      console.error('[MATERIALS UPDATE] Error:', error);
      res.status(500).json({ error: error.message });
    } finally {
      await pool.end();
    }
  })
);

// ============================================================================
// POST /api/pricebook/materials/push
// Push pending materials to ServiceTitan
// ============================================================================

router.post(
  '/push',
  asyncHandler(async (req, res) => {
    const pool = getPool();
    const tenantId = getTenantId(req);
    const { stIds } = req.body; // Optional: specific IDs to push

    try {
      const results = { created: [], updated: [], failed: [] };

      // 1. Push NEW materials (create in ST)
      const newMaterialsQuery = stIds 
        ? `SELECT * FROM crm.pricebook_new_materials WHERE tenant_id = $1 AND pushed_to_st = false AND id = ANY($2::int[])`
        : `SELECT * FROM crm.pricebook_new_materials WHERE tenant_id = $1 AND pushed_to_st = false`;
      
      const newMaterials = await pool.query(
        newMaterialsQuery, 
        stIds ? [tenantId, stIds.filter(id => String(id).startsWith('new_')).map(id => parseInt(String(id).replace('new_', ''), 10))] : [tenantId]
      );

      for (const material of newMaterials.rows) {
        try {
          // Build ST API payload
          const payload = buildServiceTitanPayload(material);

          // Collect all image URLs to upload (from pending_images and s3_image_url)
          let imageUrls = [];

          // Check for pending_images (stored as JSON array)
          if (material.pending_images) {
            try {
              const parsed = JSON.parse(material.pending_images);
              if (Array.isArray(parsed)) {
                imageUrls = imageUrls.concat(parsed);
              }
            } catch {
              // Not JSON, ignore
            }
          }

          // Also check s3_image_url (backward compat)
          if (material.s3_image_url && !imageUrls.includes(material.s3_image_url)) {
            imageUrls.push(material.s3_image_url);
          }

          // Upload all images to ST
          if (imageUrls.length > 0) {
            console.log(`[PUSH] New material ${material.code} has ${imageUrls.length} images to upload`);
            const stAssets = [];

            for (let i = 0; i < imageUrls.length; i++) {
              const url = imageUrls[i];
              console.log(`[PUSH] Uploading image ${i + 1}/${imageUrls.length} for new material ${material.code}...`);
              const stImagePath = await uploadImageToServiceTitan(
                url,
                tenantId,
                `material_${material.code.replace(/[^a-zA-Z0-9]/g, '_')}_${i + 1}.jpg`
              );

              if (stImagePath) {
                stAssets.push({ url: stImagePath, type: 'Image' });
                console.log(`[PUSH] Image ${i + 1} uploaded to ST: ${stImagePath}`);
              } else {
                console.warn(`[PUSH] Failed to upload image ${i + 1} to ST`);
              }
            }

            if (stAssets.length > 0) {
              payload.assets = stAssets;
              console.log(`[PUSH] Total ${stAssets.length} images uploaded for new material`);
            }
          }

          // Call ST API to create material
          const stResponse = await createMaterialInServiceTitan(payload, tenantId);

          // Verify we got a valid ST ID back
          if (!stResponse.id) {
            throw new Error('ServiceTitan did not return a valid material ID');
          }

          // Insert into master table FIRST (this validates the data)
          await insertIntoMaster(pool, stResponse, tenantId);

          // Only mark as pushed AFTER master insert succeeds
          await pool.query(`
            UPDATE crm.pricebook_new_materials
            SET st_id = $1, pushed_to_st = true, pushed_at = NOW(), push_error = NULL
            WHERE id = $2
          `, [stResponse.id, material.id]);

          results.created.push({
            localId: material.id,
            stId: stResponse.id,
            code: material.code
          });

        } catch (err) {
          console.error(`[MATERIALS PUSH] Failed to create material ${material.code}:`, err.message);
          await pool.query(`
            UPDATE crm.pricebook_new_materials
            SET push_error = $1, pushed_to_st = false
            WHERE id = $2
          `, [err.message, material.id]);

          results.failed.push({
            localId: material.id,
            code: material.code,
            error: err.message
          });
        }
      }

      // 2. Push MODIFIED materials (update in ST)
      const overridesQuery = stIds
        ? `SELECT o.*, m.code, m.st_id FROM crm.pricebook_overrides o
           JOIN master.pricebook_materials m ON o.st_pricebook_id = m.st_id AND o.tenant_id = m.tenant_id
           WHERE o.tenant_id = $1 AND o.item_type = 'material' AND o.pending_sync = true AND o.st_pricebook_id = ANY($2::bigint[])`
        : `SELECT o.*, m.code, m.st_id FROM crm.pricebook_overrides o
           JOIN master.pricebook_materials m ON o.st_pricebook_id = m.st_id AND o.tenant_id = m.tenant_id
           WHERE o.tenant_id = $1 AND o.item_type = 'material' AND o.pending_sync = true`;

      const overrides = await pool.query(
        overridesQuery,
        stIds ? [tenantId, stIds.filter(id => !String(id).startsWith('new_')).map(id => parseInt(id, 10))] : [tenantId]
      );

      for (const override of overrides.rows) {
        try {
          // Build update payload (only changed fields)
          const payload = buildUpdatePayload(override);

          // Get existing assets from master table to preserve them
          const existingAssetsResult = await pool.query(`
            SELECT assets FROM master.pricebook_materials
            WHERE st_id = $1 AND tenant_id = $2
          `, [override.st_pricebook_id, tenantId]);

          let existingAssets = [];
          if (existingAssetsResult.rows.length > 0 && existingAssetsResult.rows[0].assets) {
            existingAssets = existingAssetsResult.rows[0].assets;
            console.log(`[PUSH] Material ${override.st_pricebook_id} has ${existingAssets.length} existing assets`);
          }

          // Parse images to delete (if any)
          let imagesToDelete = [];
          if (override.images_to_delete) {
            try {
              imagesToDelete = Array.isArray(override.images_to_delete)
                ? override.images_to_delete
                : JSON.parse(override.images_to_delete);
              console.log(`[PUSH] Material ${override.st_pricebook_id} has ${imagesToDelete.length} images marked for deletion`);
            } catch {
              console.warn(`[PUSH] Failed to parse images_to_delete for ${override.st_pricebook_id}`);
            }
          }

          // Filter out deleted images from existing assets
          if (imagesToDelete.length > 0 && existingAssets.length > 0) {
            const beforeCount = existingAssets.length;
            existingAssets = existingAssets.filter(a => {
              // Check if this asset's URL is in the delete list
              const shouldDelete = imagesToDelete.some(delUrl => a.url === delUrl || a.url.includes(delUrl) || delUrl.includes(a.url));
              if (shouldDelete) {
                console.log(`[PUSH] Removing image from assets: ${a.url}`);
              }
              return !shouldDelete;
            });
            console.log(`[PUSH] Filtered existing assets: ${beforeCount} -> ${existingAssets.length}`);
          }

          // If there's an image URL, upload to ST first and get the ST path
          // Handle both single URL and JSON array of URLs
          let newStAssets = [];
          if (override.override_image_url) {
            let imageUrls = [];

            // Try to parse as JSON array
            try {
              const parsed = JSON.parse(override.override_image_url);
              if (Array.isArray(parsed)) {
                imageUrls = parsed;
                console.log(`[PUSH] Material ${override.st_pricebook_id} has ${imageUrls.length} NEW images to upload`);
              } else {
                imageUrls = [override.override_image_url];
              }
            } catch {
              // Not JSON, treat as single URL
              imageUrls = [override.override_image_url];
            }

            // Upload all NEW images to ST
            for (let i = 0; i < imageUrls.length; i++) {
              const url = imageUrls[i];
              console.log(`[PUSH] Uploading image ${i + 1}/${imageUrls.length} for material ${override.st_pricebook_id}...`);
              const stImagePath = await uploadImageToServiceTitan(
                url,
                tenantId,
                `material_${override.st_pricebook_id}_${Date.now()}_${i + 1}.jpg`
              );

              if (stImagePath) {
                newStAssets.push({ url: stImagePath, type: 'Image' });
                console.log(`[PUSH] Image ${i + 1} uploaded to ST: ${stImagePath}`);
              } else {
                console.warn(`[PUSH] Failed to upload image ${i + 1} to ST`);
              }
            }
          }

          // MERGE existing assets with new assets (new ones first, then existing)
          // This also handles the case where we only deleted images (no new ones)
          if (newStAssets.length > 0 || existingAssets.length > 0 || imagesToDelete.length > 0) {
            // Convert existing assets to the format ST expects
            const existingForPayload = existingAssets
              .filter(a => a.type === 'Image')
              .map(a => ({ url: a.url, type: 'Image' }));

            // New assets first (they become default), then existing
            payload.assets = [...newStAssets, ...existingForPayload];
            console.log(`[PUSH] Combined assets (${newStAssets.length} new + ${existingForPayload.length} existing): ${JSON.stringify(payload.assets)}`);
          }

          // Call ST API to update material
          console.log("[PUSH] Calling ST API for", override.st_pricebook_id, "with payload:", JSON.stringify(payload));
          const stResult = await updateMaterialInServiceTitan(override.st_pricebook_id, payload, tenantId);
          console.log("[PUSH] ST API result:", JSON.stringify(stResult));

          // Clear override completely (changes now in ST)
          await pool.query(`
            UPDATE crm.pricebook_overrides
            SET pending_sync = false,
                override_image_url = NULL,
                images_to_delete = NULL,
                last_synced_at = NOW(),
                sync_error = NULL
            WHERE id = $1
          `, [override.id]);

          // Update master table with new assets from ST response
          if (stResult.assets) {
            await pool.query(`
              UPDATE master.pricebook_materials
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
            console.log(`[PUSH] Updated master table with ${stResult.assets.length} assets`);
          }

          // Update master table with other fields
          await updateMasterFromOverride(pool, override);

          results.updated.push({ 
            stId: override.st_pricebook_id, 
            code: override.code 
          });

        } catch (err) {
          console.error(`[MATERIALS PUSH] Failed to update material ${override.code}:`, err.message);
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
      console.error('[MATERIALS PUSH] Error:', error);
      res.status(500).json({ error: error.message });
    } finally {
      await pool.end();
    }
  })
);

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatMaterialResponse(row, isNew = false) {
  return {
    id: isNew ? `new_${row.id}` : row.st_id?.toString(),
    stId: row.st_id?.toString(),
    code: row.code,
    name: row.display_name || row.name,
    displayName: row.display_name,
    description: row.description,
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
    isInventory: row.is_inventory || false,
    isConfigurableMaterial: row.is_configurable_material || false,
    displayInAmount: row.display_in_amount || false,
    isOtherDirectCost: row.is_other_direct_cost || false,
    chargeableByDefault: row.chargeable_by_default !== false,
    active: row.active !== false,
    taxable: row.taxable,
    unitOfMeasure: row.unit_of_measure,
    account: row.account,
    businessUnitId: row.business_unit_id,
    categories: parseJsonSafe(row.categories, []),
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

function parseJsonSafe(value, defaultValue) {
  if (!value) return defaultValue;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return defaultValue;
  }
}

function buildServiceTitanPayload(material) {
  const payload = {
    code: material.code,
    displayName: material.display_name || '',
    description: material.description || '',
    cost: parseFloat(material.cost) || 0,
    price: parseFloat(material.price) || 0,
    memberPrice: parseFloat(material.member_price) || 0,
    addOnPrice: parseFloat(material.add_on_price) || 0,
    addOnMemberPrice: parseFloat(material.add_on_member_price) || 0,
    hours: parseFloat(material.hours) || 0,
    bonus: parseFloat(material.bonus) || 0,
    commissionBonus: parseFloat(material.commission_bonus) || 0,
    paysCommission: material.pays_commission || false,
    deductAsJobCost: material.deduct_as_job_cost || false,
    isInventory: material.is_inventory || false,
    isConfigurableMaterial: material.is_configurable_material || false,
    displayInAmount: material.display_in_amount || false,
    isOtherDirectCost: material.is_other_direct_cost || false,
    chargeableByDefault: material.chargeable_by_default !== false,
    active: material.active !== false,
    taxable: material.taxable,
    unitOfMeasure: material.unit_of_measure || null,
    account: material.account || null,
    categories: parseJsonSafe(material.categories, []),
    primaryVendor: parseJsonSafe(material.primary_vendor, null),
    otherVendors: parseJsonSafe(material.other_vendors, []),
  };

  // Note: Image URL is handled separately in push flow - uploaded to ST first, then ST path is added

  return payload;
}

function buildUpdatePayload(override) {
  const payload = {};
  if (override.override_name) payload.displayName = override.override_name;
  if (override.override_description) payload.description = override.override_description;
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
  if (override.override_is_inventory !== null) payload.isInventory = override.override_is_inventory;
  if (override.override_unit_of_measure) payload.unitOfMeasure = override.override_unit_of_measure;
  if (override.override_chargeable_by_default !== null) payload.chargeableByDefault = override.override_chargeable_by_default;
  // Note: Image URL is handled separately in push flow - uploaded to ST first, then ST path is added
  return payload;
}

async function createMaterialInServiceTitan(payload, tenantId) {
  const response = await stRequest(
    `https://api.servicetitan.io/pricebook/v2/tenant/${tenantId}/materials`,
    {
      method: 'POST',
      body: payload,
    }
  );

  if (!response.data) {
    throw new Error(response.error || 'Failed to create material in ServiceTitan');
  }

  return response.data;
}

async function updateMaterialInServiceTitan(stId, payload, tenantId) {
  const response = await stRequest(
    `https://api.servicetitan.io/pricebook/v2/tenant/${tenantId}/materials/${stId}`,
    {
      method: 'PATCH',
      body: payload,
    }
  );

  if (!response.data) {
    throw new Error(response.error || 'Failed to update material in ServiceTitan');
  }

  return response.data;
}

/**
 * Upload an image to ServiceTitan and return the ST image path
 * Uses multipart/form-data as required by ST API
 * @param {string} imageUrl - The S3 or external URL of the image
 * @param {string} tenantId - The tenant ID
 * @param {string} filename - Optional filename for the image
 * @returns {Promise<string|null>} - The ServiceTitan image path (e.g., "Images/Materials/uuid.jpg") or null if failed
 */
async function uploadImageToServiceTitan(imageUrl, tenantId, filename = null) {
  try {
    console.log(`[ST IMAGE UPLOAD] Starting upload for: ${imageUrl}`);

    // Fetch the image from the URL (S3 or external)
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

    // Get image as buffer
    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

    // Determine content type and filename
    const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';
    const ext = contentType.includes('png') ? 'png' :
                contentType.includes('gif') ? 'gif' :
                contentType.includes('webp') ? 'webp' : 'jpg';

    // Generate filename if not provided
    const finalFilename = filename || `material_${Date.now()}.${ext}`;

    console.log(`[ST IMAGE UPLOAD] Uploading to ST: ${finalFilename} (${imageBuffer.length} bytes, ${contentType})`);

    // Get ST access token
    const { getAccessToken } = await import('../services/tokenManager.js');
    const accessToken = await getAccessToken();

    // Create FormData with the image (ST requires multipart/form-data)
    const formData = new FormData();
    const imageBlob = new Blob([imageBuffer], { type: contentType });
    formData.append('file', imageBlob, finalFilename);

    // Upload to ServiceTitan using multipart/form-data
    const stResponse = await fetch(
      `https://api.servicetitan.io/pricebook/v2/tenant/${tenantId}/images`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'ST-App-Key': process.env.SERVICE_TITAN_APP_KEY,
          // Don't set Content-Type - fetch will set it automatically with boundary for FormData
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

    // ST returns the image path like "Images/Materials/uuid.jpg"
    return stResult.path || stResult.url || stResult.imageUrl || stResult;

  } catch (error) {
    console.error(`[ST IMAGE UPLOAD] Error uploading image:`, error.message);
    return null;
  }
}

async function insertIntoMaster(pool, stResponse, tenantId) {
  await pool.query(`
    INSERT INTO master.pricebook_materials (
      st_id, tenant_id, code, name, display_name, description,
      cost, price, member_price, add_on_price, add_on_member_price,
      hours, bonus, commission_bonus, pays_commission, deduct_as_job_cost,
      is_inventory, is_configurable_material, display_in_amount, is_other_direct_cost,
      chargeable_by_default, active, taxable, unit_of_measure, account,
      categories, last_synced_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, NOW())
    ON CONFLICT (st_id, tenant_id) DO UPDATE SET
      display_name = EXCLUDED.display_name,
      description = EXCLUDED.description,
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
      is_inventory = EXCLUDED.is_inventory,
      is_configurable_material = EXCLUDED.is_configurable_material,
      display_in_amount = EXCLUDED.display_in_amount,
      is_other_direct_cost = EXCLUDED.is_other_direct_cost,
      chargeable_by_default = EXCLUDED.chargeable_by_default,
      active = EXCLUDED.active,
      taxable = EXCLUDED.taxable,
      unit_of_measure = EXCLUDED.unit_of_measure,
      account = EXCLUDED.account,
      categories = EXCLUDED.categories,
      updated_at = NOW(),
      last_synced_at = NOW()
  `, [
    stResponse.id, tenantId, stResponse.code, stResponse.displayName || stResponse.code,
    stResponse.displayName, stResponse.description,
    stResponse.cost, stResponse.price, stResponse.memberPrice, stResponse.addOnPrice, stResponse.addOnMemberPrice,
    stResponse.hours, stResponse.bonus, stResponse.commissionBonus, stResponse.paysCommission, stResponse.deductAsJobCost,
    stResponse.isInventory, stResponse.isConfigurableMaterial, stResponse.displayInAmount, stResponse.isOtherDirectCost,
    stResponse.chargeableByDefault, stResponse.active, stResponse.taxable, stResponse.unitOfMeasure, stResponse.account,
    JSON.stringify(stResponse.categories || [])
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
      UPDATE master.pricebook_materials
      SET ${updates.join(', ')}
      WHERE st_id = $${idx++} AND tenant_id = $${idx}
    `, values);
  }
}

export default router;
