/**
 * Pricebook Services API Routes
 * 
 * REST endpoints for CRM to interact with master.pricebook_services
 */

import { Router } from 'express';
import { getPool } from '../db/schema-connection.js';
import { resolveImageUrl, resolveImageUrls } from '../services/imageResolver.js';
import { getCache, setCache, invalidateCache, cacheKey, CACHE_TTL } from '../utils/cache.js';

const router = Router();
const pool = getPool();

// Helper to get tenant ID from request
function getTenantId(req) {
  return req.headers['x-tenant-id'] || process.env.DEFAULT_TENANT_ID || '3222348440';
}

// Async handler wrapper
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// ============================================================================
// GET /api/pricebook/services
// List services with filtering, pagination, and CRM override support
// ============================================================================

router.get(
  '/',
  asyncHandler(async (req, res) => {
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

    // Try cache first (skip if searching)
    if (!search) {
      const cacheKeyStr = cacheKey('services', tenantId, active, category_id || 'all', page, limit);
      const cached = await getCache(cacheKeyStr);
      if (cached) {
        console.log(`[CACHE HIT] ${cacheKeyStr}`);
        return res.json(cached);
      }
    }

    // Build query with CRM override support
    const params = [tenantId];
    let whereConditions = ['s.tenant_id = $1'];

    // Active filter with CRM override (default: show only active)
    if (active === 'true') {
      whereConditions.push('COALESCE(o.override_active, s.active) = true');
    } else if (active === 'false') {
      whereConditions.push('COALESCE(o.override_active, s.active) = false');
    }
    // If active === 'all', don't filter by active status

    // Search filter with CRM override
    if (search) {
      params.push(`%${search}%`);
      whereConditions.push(`(
        COALESCE(o.override_name, s.name) ILIKE $${params.length} OR 
        s.code ILIKE $${params.length} OR 
        COALESCE(o.override_display_name, s.display_name) ILIKE $${params.length}
      )`);
    }

    // Category filter - supports multiple category IDs (comma-separated for hierarchical filtering)
    if (category_id) {
      // Support comma-separated category IDs for hierarchical filtering
      const categoryIds = category_id.toString().split(',').map(id => id.trim()).filter(id => id);
      
      if (categoryIds.length > 1) {
        // Cast to bigint array for comparison with category_st_id column
        params.push(categoryIds.map(id => parseInt(id, 10)));
        whereConditions.push(`s.category_st_id = ANY($${params.length}::bigint[])`);
      } else {
        params.push(parseInt(categoryIds[0], 10));
        whereConditions.push(`s.category_st_id = $${params.length}`);
      }
    }

    const whereClause = whereConditions.join(' AND ');

    // Validate sort
    const allowedSorts = ['name', 'code', 'price', 'created_at', 'updated_at'];
    const safeSort = allowedSorts.includes(sort_by) ? sort_by : 'name';
    const safeOrder = sort_order.toLowerCase() === 'desc' ? 'DESC' : 'ASC';

    // Get total count with CRM override join
    const countResult = await pool.query(
      `SELECT COUNT(*) 
       FROM master.pricebook_services s
       LEFT JOIN crm.pricebook_overrides o 
         ON o.st_pricebook_id = s.st_id 
         AND o.tenant_id = s.tenant_id
         AND o.item_type = 'service'
       WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count, 10);

    // Get services with pagination and CRM overrides
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(500, Math.max(1, parseInt(limit, 10)));
    const offset = (pageNum - 1) * limitNum;

    params.push(limitNum, offset);

    const query = `
      SELECT 
        s.id,
        s.st_id,
        s.code,
        COALESCE(o.override_name, s.name) as name,
        COALESCE(o.override_display_name, s.display_name) as display_name,
        COALESCE(o.override_description, s.description) as description,
        COALESCE(o.override_price, s.price) as price,
        s.member_price,
        s.add_on_price,
        COALESCE(o.override_cost, s.cost) as cost,
        COALESCE(o.override_active, s.active) as active,
        s.taxable,
        s.hours,
        s.is_labor,
        s.account,
        COALESCE(o.override_image_url, s.s3_image_url, s.image_url) as image_url,
        s.category_st_id,
        s.categories,
        s.warranty,
        s.st_created_on,
        s.st_modified_on,
        s.created_at,
        s.updated_at,
        o.id as override_id,
        o.pending_sync as has_pending_changes,
        o.internal_notes,
        o.custom_tags
      FROM master.pricebook_services s
      LEFT JOIN crm.pricebook_overrides o 
        ON o.st_pricebook_id = s.st_id 
        AND o.tenant_id = s.tenant_id
        AND o.item_type = 'service'
      WHERE ${whereClause}
      ORDER BY COALESCE(o.override_name, s.name) ${safeOrder}
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `;

    const result = await pool.query(query, params);

    const response = {
      data: result.rows,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    };

    // Cache the result (skip if searching)
    if (!search) {
      const cacheKeyStr = cacheKey('services', tenantId, active, category_id || 'all', page, limit);
      await setCache(cacheKeyStr, response, CACHE_TTL.categories);
    }

    res.json(response);
  })
);

// ============================================================================
// GET /api/pricebook/services/:stId
// Get single service by ServiceTitan ID
// ============================================================================

router.get(
  '/:stId',
  asyncHandler(async (req, res) => {
    const tenantId = getTenantId(req);
    const { stId } = req.params;

    const result = await pool.query(`
      SELECT 
        s.*,
        c.name as category_name
      FROM master.pricebook_services s
      LEFT JOIN master.pricebook_categories c 
        ON s.category_st_id = c.st_id 
        AND s.tenant_id = c.tenant_id
      WHERE s.st_id = $1 AND s.tenant_id = $2
    `, [parseInt(stId, 10), tenantId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Service not found' });
    }

    const service = result.rows[0];
    
    // Resolve service image
    const serviceImageUrl = await resolveImageUrl('services', parseInt(stId, 10), tenantId);
    
    // Get linked materials with images
    let materialsWithImages = [];
    if (service.service_materials && service.service_materials.length > 0) {
      const materialIds = service.service_materials
        .map(m => m.skuId || m.id)
        .filter(id => id);
      
      if (materialIds.length > 0) {
        const materials = await pool.query(`
          SELECT st_id, name, code, cost, price, description
          FROM master.pricebook_materials
          WHERE st_id = ANY($1) AND tenant_id = $2
        `, [materialIds, tenantId]);
        
        const materialImageMap = await resolveImageUrls('materials', materialIds, tenantId);
        
        materialsWithImages = materials.rows.map(m => ({
          ...m,
          quantity: service.service_materials.find(sm => (sm.skuId || sm.id) === m.st_id)?.quantity || 1,
          image_url: materialImageMap[m.st_id] || null,
        }));
      }
    }

    // Get linked equipment with images
    let equipmentWithImages = [];
    if (service.service_equipment && service.service_equipment.length > 0) {
      const equipmentIds = service.service_equipment
        .map(e => e.skuId || e.id)
        .filter(id => id);
      
      if (equipmentIds.length > 0) {
        const equipment = await pool.query(`
          SELECT st_id, name, code, cost, price, description
          FROM master.pricebook_equipment
          WHERE st_id = ANY($1) AND tenant_id = $2
        `, [equipmentIds, tenantId]);
        
        const equipmentImageMap = await resolveImageUrls('equipment', equipmentIds, tenantId);
        
        equipmentWithImages = equipment.rows.map(e => ({
          ...e,
          quantity: service.service_equipment.find(se => (se.skuId || se.id) === e.st_id)?.quantity || 1,
          image_url: equipmentImageMap[e.st_id] || null,
        }));
      }
    }

    res.json({
      ...service,
      image_url: serviceImageUrl,
      materials: materialsWithImages,
      equipment: equipmentWithImages,
    });
  })
);

// ============================================================================
// POST /api/pricebook/services/sync
// Sync services from raw to master
// ============================================================================

router.post(
  '/sync',
  asyncHandler(async (req, res) => {
    const tenantId = getTenantId(req);

    console.log(`[SERVICES SYNC] Starting sync for tenant ${tenantId}`);

    const result = await pool.query(`
      INSERT INTO master.pricebook_services (
        st_id, tenant_id, code, name, display_name, description, 
        price, member_price, add_on_price, active, taxable, hours, is_labor,
        account, categories, assets, warranty, service_materials, 
        service_equipment, recommendations, upgrades,
        st_created_on, st_modified_on, last_synced_at
      )
      SELECT 
        r.st_id,
        r.tenant_id::text,
        r.code,
        COALESCE(r.display_name, 'Unnamed Service'),
        r.display_name,
        r.description,
        COALESCE(r.price, 0),
        COALESCE(r.member_price, 0),
        COALESCE(r.add_on_price, 0),
        COALESCE(r.active, true),
        COALESCE(r.taxable, true),
        COALESCE(r.hours, 0),
        COALESCE((r.full_data->>'isLabor')::boolean, false),
        r.full_data->>'account',
        r.categories,
        r.full_data->'assets',
        r.full_data->'warranty',
        r.service_materials,
        r.service_equipment,
        r.recommendations,
        r.full_data->'upgrades',
        (r.full_data->>'createdOn')::timestamptz,
        (r.full_data->>'modifiedOn')::timestamptz,
        NOW()
      FROM raw.st_pricebook_services r
      WHERE r.tenant_id = $1
      ON CONFLICT (st_id, tenant_id) DO UPDATE SET
        code = EXCLUDED.code,
        name = EXCLUDED.name,
        display_name = EXCLUDED.display_name,
        description = EXCLUDED.description,
        price = EXCLUDED.price,
        member_price = EXCLUDED.member_price,
        add_on_price = EXCLUDED.add_on_price,
        active = EXCLUDED.active,
        taxable = EXCLUDED.taxable,
        hours = EXCLUDED.hours,
        is_labor = EXCLUDED.is_labor,
        account = EXCLUDED.account,
        categories = EXCLUDED.categories,
        assets = EXCLUDED.assets,
        warranty = EXCLUDED.warranty,
        service_materials = EXCLUDED.service_materials,
        service_equipment = EXCLUDED.service_equipment,
        recommendations = EXCLUDED.recommendations,
        upgrades = EXCLUDED.upgrades,
        st_created_on = EXCLUDED.st_created_on,
        st_modified_on = EXCLUDED.st_modified_on,
        updated_at = NOW(),
        last_synced_at = NOW()
    `, [tenantId]);

    // Invalidate cache
    await invalidateCache(`pricebook:${tenantId}:services:*`);

    console.log(`[SERVICES SYNC] Synced ${result.rowCount} services`);

    res.json({
      success: true,
      synced: result.rowCount,
      message: `Synced ${result.rowCount} services from raw to master`,
    });
  })
);

// ============================================================================
// GET /api/pricebook/services/stats
// Get service statistics
// ============================================================================

router.get(
  '/stats',
  asyncHandler(async (req, res) => {
    const tenantId = getTenantId(req);

    const result = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE active = true) as active,
        COUNT(*) FILTER (WHERE active = false) as inactive,
        COUNT(*) FILTER (WHERE image_url IS NOT NULL) as with_images,
        AVG(price) as avg_price,
        MAX(price) as max_price,
        MIN(price) FILTER (WHERE price > 0) as min_price
      FROM master.pricebook_services
      WHERE tenant_id = $1
    `, [tenantId]);

    res.json(result.rows[0]);
  })
);

export default router;
