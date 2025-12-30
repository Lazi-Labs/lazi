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
          COALESCE(o.override_primary_vendor, m.primary_vendor) as primary_vendor,
          COALESCE(o.override_other_vendors, m.other_vendors) as other_vendors,
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
          changes.otherVendors ? JSON.stringify(changes.otherVendors) : null
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
      const result = await pool.query(`
        INSERT INTO crm.pricebook_overrides (
          st_pricebook_id, tenant_id, item_type,
          override_name, override_description, override_price, override_cost,
          override_active, override_member_price, override_add_on_price,
          override_add_on_member_price, override_hours, override_bonus,
          override_commission_bonus, override_pays_commission, override_deduct_as_job_cost,
          override_is_inventory, override_unit_of_measure, override_chargeable_by_default,
          override_primary_vendor, override_other_vendors,
          pending_sync, updated_at
        ) VALUES ($1, $2, 'material', $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, true, NOW())
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
        changes.otherVendors ? JSON.stringify(changes.otherVendors) : null
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
          
          // Call ST API to create material
          const stResponse = await createMaterialInServiceTitan(payload, tenantId);
          
          // Update local record with ST ID
          await pool.query(`
            UPDATE crm.pricebook_new_materials
            SET st_id = $1, pushed_to_st = true, pushed_at = NOW(), push_error = NULL
            WHERE id = $2
          `, [stResponse.id, material.id]);

          // Also insert into master table for future queries
          await insertIntoMaster(pool, stResponse, tenantId);

          results.created.push({ 
            localId: material.id, 
            stId: stResponse.id, 
            code: material.code 
          });

        } catch (err) {
          console.error(`[MATERIALS PUSH] Failed to create material ${material.code}:`, err.message);
          await pool.query(`
            UPDATE crm.pricebook_new_materials
            SET push_error = $1
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
          
          // Call ST API to update material
          await updateMaterialInServiceTitan(override.st_pricebook_id, payload, tenantId);
          
          // Clear override (changes now in ST)
          await pool.query(`
            UPDATE crm.pricebook_overrides
            SET pending_sync = false, 
                last_synced_at = NOW(),
                sync_error = NULL
            WHERE id = $1
          `, [override.id]);

          // Update master table
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
  return {
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
  return payload;
}

async function createMaterialInServiceTitan(payload, tenantId) {
  const response = await stRequest(
    `https://api.servicetitan.io/pricebook/v2/tenant/${tenantId}/materials`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
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
      body: JSON.stringify(payload),
    }
  );

  if (!response.data) {
    throw new Error(response.error || 'Failed to update material in ServiceTitan');
  }

  return response.data;
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
