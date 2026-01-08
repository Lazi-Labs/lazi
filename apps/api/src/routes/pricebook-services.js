/**
 * Pricebook Services API Routes
 *
 * REST endpoints for CRM to interact with master.pricebook_services
 */

import { Router } from 'express';
import { getPool } from '../db/schema-connection.js';
import { stRequest } from '../services/stClient.js';
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
// List services with filtering and pagination
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

    // Build query
    const params = [tenantId];
    let whereConditions = ['s.tenant_id = $1'];

    // Active filter (default: show only active)
    if (active === 'true') {
      whereConditions.push('s.active = true');
    } else if (active === 'false') {
      whereConditions.push('s.active = false');
    }
    // If active === 'all', don't filter by active status

    // Search filter
    if (search) {
      params.push(`%${search}%`);
      whereConditions.push(`(s.name ILIKE $${params.length} OR s.code ILIKE $${params.length} OR s.display_name ILIKE $${params.length})`);
    }

    // Category filter
    if (category_id) {
      params.push(parseInt(category_id, 10));
      whereConditions.push(`s.category_st_id = $${params.length}`);
    }

    const whereClause = whereConditions.join(' AND ');

    // Validate sort
    const allowedSorts = ['name', 'code', 'price', 'created_at', 'updated_at'];
    const safeSort = allowedSorts.includes(sort_by) ? sort_by : 'name';
    const safeOrder = sort_order.toLowerCase() === 'desc' ? 'DESC' : 'ASC';

    // Get total count
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM master.pricebook_services s WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count, 10);

    // Get services with pagination
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(500, Math.max(1, parseInt(limit, 10)));
    const offset = (pageNum - 1) * limitNum;

    params.push(limitNum, offset);

    const query = `
      SELECT 
        s.id,
        s.st_id,
        s.code,
        s.name,
        s.display_name,
        s.description,
        s.price,
        s.member_price,
        s.add_on_price,
        s.cost,
        s.active,
        s.taxable,
        s.hours,
        s.is_labor,
        s.account,
        s.image_url,
        s.category_st_id,
        s.categories,
        s.warranty,
        s.st_created_on,
        s.st_modified_on,
        s.created_at,
        s.updated_at
      FROM master.pricebook_services s
      WHERE ${whereClause}
      ORDER BY s.${safeSort} ${safeOrder}
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

    res.json(result.rows[0]);
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

// ============================================================================
// POST /api/pricebook/services/sync-from-st
// Fetch services from ServiceTitan API and store in RAW table
// ============================================================================

router.post(
  '/sync-from-st',
  asyncHandler(async (req, res) => {
    const tenantId = getTenantId(req);

    console.log(`[SERVICES SYNC] Fetching from ServiceTitan for tenant ${tenantId}`);

    try {
      let allServices = [];
      let page = 1;
      let hasMore = true;
      const pageSize = 500;

      // Fetch all pages
      while (hasMore) {
        console.log(`[SERVICES SYNC] Fetching page ${page}...`);

        const stApiUrl = `https://api.servicetitan.io/pricebook/v2/tenant/${tenantId}/services`;
        const response = await stRequest(stApiUrl, {
          method: 'GET',
          query: {
            active: 'any',
            page: page,
            pageSize: pageSize,
          },
        });

        if (!response.data || !response.data.data) {
          console.log(`[SERVICES SYNC] Invalid response on page ${page}`);
          break;
        }

        const services = response.data.data;
        allServices = allServices.concat(services);

        console.log(`[SERVICES SYNC] Page ${page}: ${services.length} services (total: ${allServices.length})`);

        // Check if there are more pages
        hasMore = response.data.hasMore || services.length === pageSize;
        page++;

        // Safety limit to prevent infinite loops
        if (page > 50) {
          console.log(`[SERVICES SYNC] Reached page limit (50), stopping`);
          break;
        }
      }

      console.log(`[SERVICES SYNC] Fetched ${allServices.length} total services from ${page - 1} pages`);

      let insertedCount = 0;

      // Insert/update each service in RAW table
      for (const service of allServices) {
        const result = await pool.query(`
          INSERT INTO raw.st_pricebook_services (
            st_id, tenant_id, code, display_name, description,
            price, member_price, add_on_price, hours,
            taxable, active,
            categories, service_materials, service_equipment, recommendations,
            created_on, modified_on, full_data, fetched_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
            $11, $12, $13, $14, $15, $16, $17, $18, NOW()
          )
          ON CONFLICT (st_id, tenant_id) DO UPDATE SET
            code = EXCLUDED.code,
            display_name = EXCLUDED.display_name,
            description = EXCLUDED.description,
            price = EXCLUDED.price,
            member_price = EXCLUDED.member_price,
            add_on_price = EXCLUDED.add_on_price,
            hours = EXCLUDED.hours,
            taxable = EXCLUDED.taxable,
            active = EXCLUDED.active,
            categories = EXCLUDED.categories,
            service_materials = EXCLUDED.service_materials,
            service_equipment = EXCLUDED.service_equipment,
            recommendations = EXCLUDED.recommendations,
            modified_on = EXCLUDED.modified_on,
            full_data = EXCLUDED.full_data,
            fetched_at = NOW()
        `, [
          service.id,
          tenantId,
          service.code || null,
          service.displayName || service.name || null,
          service.description || null,
          service.price || 0,
          service.memberPrice || 0,
          service.addOnPrice || 0,
          service.hours || 0,
          service.taxable !== undefined ? service.taxable : true,
          service.active !== undefined ? service.active : true,
          JSON.stringify(service.categories || []),
          JSON.stringify(service.serviceMaterials || []),
          JSON.stringify(service.serviceEquipment || []),
          JSON.stringify(service.recommendations || []),
          service.createdOn || null,
          service.modifiedOn || null,
          JSON.stringify(service),
        ]);

        if (result.rowCount > 0) {
          insertedCount++;
        }
      }

      console.log(`[SERVICES SYNC] Completed: ${insertedCount} services synced to RAW table`);

      // Invalidate cache
      await invalidateCache(`pricebook:${tenantId}:services:*`);

      res.json({
        success: true,
        synced: insertedCount,
        total: allServices.length,
        pages: page - 1,
        message: `Synced ${insertedCount} services from ServiceTitan to RAW table (${page - 1} pages)`,
      });

    } catch (error) {
      console.error('[SERVICES SYNC] Error:', error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  })
);

// ============================================================================
// POST /api/pricebook/services/sync-to-master
// Sync services from RAW to MASTER table (alias for /sync)
// ============================================================================

router.post(
  '/sync-to-master',
  asyncHandler(async (req, res) => {
    const tenantId = getTenantId(req);

    console.log(`[SERVICES SYNC] Starting RAW → MASTER sync for tenant ${tenantId}`);

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

    console.log(`[SERVICES SYNC] Synced ${result.rowCount} services to MASTER table`);

    res.json({
      success: true,
      synced: result.rowCount,
      message: `Synced ${result.rowCount} services from RAW to MASTER`,
    });
  })
);

export default router;
