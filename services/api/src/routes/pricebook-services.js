/**
 * Pricebook Services API Routes
 *
 * REST endpoints for CRM to interact with master.pricebook_services
 * Includes: List, Get, Save (to CRM), Push (to ST), Pull (from ST)
 */

import { Router } from 'express';
import { getPool } from '../db/schema-connection.js';
import { resolveImageUrl, resolveImageUrls } from '../services/imageResolver.js';
import { getCache, setCache, invalidateCache, cacheKey, CACHE_TTL } from '../utils/cache.js';
import { stRequest } from '../services/stClient.js';

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
// GET /api/pricebook/services/stats
// Get service statistics (MUST be before /:stId route)
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
// GET /api/pricebook/services/:stId
// Get single service by ServiceTitan ID with CRM edits merged
// Also handles new services (new_*) from CRM
// ============================================================================

router.get(
  '/:stId',
  asyncHandler(async (req, res) => {
    const tenantId = getTenantId(req);
    const { stId } = req.params;

    // Check if this is a new service (not yet pushed to ST)
    const isNewService = stId.startsWith('new_');

    if (isNewService) {
      // Fetch from crm.pricebook_new_services
      const localId = stId.replace('new_', '');
      const result = await pool.query(`
        SELECT * FROM crm.pricebook_new_services
        WHERE id = $1 AND tenant_id = $2
      `, [parseInt(localId, 10), tenantId]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Service not found' });
      }

      const service = result.rows[0];

      // Parse pending images for new service
      let newServicePendingImages = [];
      if (service.pending_images) {
        try {
          newServicePendingImages = typeof service.pending_images === 'string'
            ? JSON.parse(service.pending_images)
            : service.pending_images;
        } catch { newServicePendingImages = []; }
      }

      // Format response for new service
      const response = {
        id: `new_${service.id}`,
        stId: null,
        code: service.code,
        name: service.display_name || service.code,
        displayName: service.display_name,
        description: service.description,
        price: parseFloat(service.price) || 0,
        memberPrice: parseFloat(service.member_price) || 0,
        addOnPrice: parseFloat(service.add_on_price) || 0,
        addOnMemberPrice: parseFloat(service.add_on_member_price) || 0,
        durationHours: parseFloat(service.hours) || 0,
        active: service.active !== false,
        taxable: service.taxable !== false,
        isLabor: service.is_labor || false,
        account: service.account,
        warranty: service.warranty || { description: '' },
        categories: service.categories || [],
        materials: service.service_materials || [],
        equipment: service.service_equipment || [],
        upgrades: service.upgrades || [],
        recommendations: service.recommendations || [],
        // Image fields
        assets: service.assets || [],
        pending_images: newServicePendingImages,
        pendingImages: newServicePendingImages,
        // Metadata
        isNew: true,
        _hasLocalEdits: true,
        _syncStatus: 'pending',
        pushError: service.push_error,
      };

      return res.json(response);
    }

    // Fetch service from MASTER table
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

    // Check for pending edits in CRM
    const editsResult = await pool.query(
      'SELECT * FROM crm.pricebook_service_edits WHERE st_id = $1 AND tenant_id = $2',
      [parseInt(stId, 10), tenantId]
    );
    const edits = editsResult.rows[0];

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

    // Extract warranty description
    const warrantyDesc = service.warranty?.description || service.warranty?.warrantyDescription || '';

    // Parse pending images and images to delete from edits
    let pendingImages = [];
    let imagesToDelete = [];
    if (edits?.pending_images) {
      try {
        pendingImages = typeof edits.pending_images === 'string'
          ? JSON.parse(edits.pending_images)
          : edits.pending_images;
      } catch { pendingImages = []; }
    }
    if (edits?.images_to_delete) {
      try {
        imagesToDelete = typeof edits.images_to_delete === 'string'
          ? JSON.parse(edits.images_to_delete)
          : edits.images_to_delete;
      } catch { imagesToDelete = []; }
    }

    // Merge CRM edits with master data
    const response = {
      ...service,
      // Override with CRM edits if present
      code: edits?.code || service.code,
      name: edits?.name || service.name || service.display_name,
      display_name: edits?.display_name || service.display_name,
      description: edits?.description || service.description,
      price: edits?.price !== null && edits?.price !== undefined ? parseFloat(edits.price) : parseFloat(service.price) || 0,
      member_price: edits?.member_price !== null && edits?.member_price !== undefined ? parseFloat(edits.member_price) : parseFloat(service.member_price) || 0,
      add_on_price: edits?.add_on_price !== null && edits?.add_on_price !== undefined ? parseFloat(edits.add_on_price) : parseFloat(service.add_on_price) || 0,
      hours: edits?.hours !== null && edits?.hours !== undefined ? parseFloat(edits.hours) : parseFloat(service.hours) || 0,
      active: edits?.active !== null && edits?.active !== undefined ? edits.active : service.active,
      taxable: edits?.taxable !== null && edits?.taxable !== undefined ? edits.taxable : service.taxable,
      warranty: { description: edits?.warranty_text || warrantyDesc },
      image_url: serviceImageUrl,
      materials: materialsWithImages,
      equipment: equipmentWithImages,
      // Image management fields
      pending_images: pendingImages,
      images_to_delete: imagesToDelete,
      // Metadata for frontend
      _hasLocalEdits: !!edits || pendingImages.length > 0,
      _syncStatus: edits?.sync_status || (pendingImages.length > 0 ? 'pending' : 'synced'),
      _lastModified: edits?.modified_at || service.st_modified_on,
    };

    res.json(response);
  })
);

// ============================================================================
// POST /api/pricebook/services
// Create NEW service (stores in CRM, pending push to ST)
// ============================================================================

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const tenantId = getTenantId(req);
    const service = req.body;

    console.log('[SERVICES] Creating new service:', service.code);

    // Validate required fields
    const requiredFields = ['code', 'description'];
    const missing = requiredFields.filter(f => !service[f]);
    if (missing.length > 0) {
      return res.status(400).json({
        error: 'Missing required fields',
        fields: missing
      });
    }

    try {
      // Check if code already exists
      const existing = await pool.query(`
        SELECT 1 FROM master.pricebook_services WHERE code = $1 AND tenant_id = $2
        UNION
        SELECT 1 FROM crm.pricebook_new_services WHERE code = $1 AND tenant_id = $2
      `, [service.code, tenantId]);

      if (existing.rows.length > 0) {
        return res.status(409).json({ error: 'Service code already exists' });
      }

      // Insert new service
      const result = await pool.query(`
        INSERT INTO crm.pricebook_new_services (
          tenant_id, code, display_name, description,
          price, member_price, add_on_price, add_on_member_price,
          hours, active, taxable, is_labor, account,
          warranty, categories, service_materials, service_equipment,
          upgrades, recommendations, created_by
        ) VALUES (
          $1, $2, $3, $4,
          $5, $6, $7, $8,
          $9, $10, $11, $12, $13,
          $14, $15, $16, $17,
          $18, $19, $20
        )
        RETURNING *
      `, [
        tenantId,
        service.code,
        service.displayName || service.name || service.code,
        service.description || '',
        service.price || 0,
        service.memberPrice || 0,
        service.addOnPrice || 0,
        service.addOnMemberPrice || 0,
        service.hours || service.durationHours || 0,
        service.active !== false,
        service.taxable !== false,
        service.isLabor || false,
        service.account || null,
        JSON.stringify(service.warranty || { description: '' }),
        JSON.stringify(service.categories || []),
        JSON.stringify(service.serviceMaterials || service.materials || []),
        JSON.stringify(service.serviceEquipment || service.equipment || []),
        JSON.stringify(service.upgrades || []),
        JSON.stringify(service.recommendations || []),
        service.createdBy || 'system'
      ]);

      const row = result.rows[0];

      // Invalidate cache
      await invalidateCache(`pricebook:${tenantId}:services:*`);

      console.log(`[SERVICES] Created new service with local id: ${row.id}`);

      res.status(201).json({
        success: true,
        data: {
          id: `new_${row.id}`,
          stId: null,
          code: row.code,
          name: row.display_name,
          displayName: row.display_name,
          description: row.description,
          price: parseFloat(row.price) || 0,
          memberPrice: parseFloat(row.member_price) || 0,
          addOnPrice: parseFloat(row.add_on_price) || 0,
          durationHours: parseFloat(row.hours) || 0,
          active: row.active,
          taxable: row.taxable,
          isNew: true
        },
        message: 'Service created. Click PUSH to sync to ServiceTitan.',
        isNew: true
      });

    } catch (error) {
      console.error('[SERVICES CREATE] Error:', error);
      res.status(500).json({ error: error.message });
    }
  })
);

// ============================================================================
// PUT /api/pricebook/services/:stId - Save local edits to CRM
// Also handles updating new services (new_* IDs)
// ============================================================================

router.put(
  '/:stId',
  asyncHandler(async (req, res) => {
    const tenantId = getTenantId(req);
    const { stId } = req.params;
    const edits = req.body;

    console.log(`[SERVICES] Saving edits for service ${stId}`);

    // Check if this is a new service
    const isNewService = stId.startsWith('new_');

    try {
      if (isNewService) {
        // Update the new service directly in crm.pricebook_new_services
        const localId = stId.replace('new_', '');
        console.log(`[SERVICES] Updating new service with local id: ${localId}`);

        // Handle pending images for new services
        let newServicePendingImages = null;
        if (edits.pendingImages && Array.isArray(edits.pendingImages) && edits.pendingImages.length > 0) {
          newServicePendingImages = JSON.stringify(edits.pendingImages);
        }

        const result = await pool.query(`
          UPDATE crm.pricebook_new_services SET
            code = COALESCE($3, code),
            display_name = COALESCE($4, display_name),
            description = COALESCE($5, description),
            price = COALESCE($6, price),
            member_price = COALESCE($7, member_price),
            add_on_price = COALESCE($8, add_on_price),
            hours = COALESCE($9, hours),
            active = COALESCE($10, active),
            taxable = COALESCE($11, taxable),
            warranty = COALESCE($12, warranty),
            categories = COALESCE($13, categories),
            service_materials = COALESCE($14, service_materials),
            service_equipment = COALESCE($15, service_equipment),
            pending_images = COALESCE($16, pending_images),
            upgrades = COALESCE($17, upgrades),
            recommendations = COALESCE($18, recommendations),
            updated_at = NOW()
          WHERE id = $1 AND tenant_id = $2
          RETURNING *
        `, [
          parseInt(localId, 10), tenantId,
          edits.code,
          edits.displayName || edits.name || edits.display_name,
          edits.description,
          edits.price,
          edits.memberPrice || edits.member_price,
          edits.addOnPrice || edits.add_on_price,
          edits.hours || edits.durationHours,
          edits.active,
          edits.taxable,
          edits.warranty ? JSON.stringify({ description: edits.warranty }) : null,
          edits.categories ? JSON.stringify(edits.categories) : null,
          edits.materials ? JSON.stringify(edits.materials) : null,
          edits.equipment ? JSON.stringify(edits.equipment) : null,
          newServicePendingImages,
          edits.upgrades ? JSON.stringify(edits.upgrades) : null,
          edits.recommendations ? JSON.stringify(edits.recommendations) : null
        ]);

        if (result.rows.length === 0) {
          return res.status(404).json({ error: 'Service not found' });
        }

        // Invalidate cache
        await invalidateCache(`pricebook:${tenantId}:services:*`);

        return res.json({
          success: true,
          message: 'Service updated. Click PUSH to sync to ServiceTitan.',
          data: result.rows[0],
          syncStatus: 'pending'
        });
      }

      // Handle pending images - store as JSON array
      let pendingImagesValue = null;
      if (edits.pendingImages && Array.isArray(edits.pendingImages) && edits.pendingImages.length > 0) {
        pendingImagesValue = JSON.stringify(edits.pendingImages);
      }

      // Handle images to delete - store as JSON array
      let imagesToDeleteValue = null;
      if (edits.imagesToDelete && Array.isArray(edits.imagesToDelete) && edits.imagesToDelete.length > 0) {
        imagesToDeleteValue = JSON.stringify(edits.imagesToDelete);
      }

      // Handle materials - convert to ST format { skuId, quantity }
      // Priority: stId (ServiceTitan ID) > materialId > skuId > st_id > id
      let serviceMaterialsValue = null;
      if (edits.materials && Array.isArray(edits.materials) && edits.materials.length > 0) {
        const formatted = edits.materials.map(m => ({
          skuId: parseInt(m.stId || m.st_id || m.skuId || m.materialId || m.id, 10),
          quantity: m.quantity || 1
        }));
        serviceMaterialsValue = JSON.stringify(formatted);
        console.log(`[SERVICES] Saving ${formatted.length} materials for service ${stId}:`, formatted.map(m => m.skuId).join(', '));
      }

      // Handle equipment - convert to ST format { skuId, quantity }
      // Priority: stId (ServiceTitan ID) > equipmentId > skuId > st_id > id
      let serviceEquipmentValue = null;
      if (edits.equipment && Array.isArray(edits.equipment) && edits.equipment.length > 0) {
        const formatted = edits.equipment.map(e => ({
          skuId: parseInt(e.stId || e.st_id || e.skuId || e.equipmentId || e.id, 10),
          quantity: e.quantity || 1
        }));
        serviceEquipmentValue = JSON.stringify(formatted);
        console.log(`[SERVICES] Saving ${formatted.length} equipment for service ${stId}:`, formatted.map(e => e.skuId).join(', '));
      }

      // Existing service - save to pricebook_service_edits
      const result = await pool.query(`
        INSERT INTO crm.pricebook_service_edits
          (st_id, tenant_id, code, name, display_name, description,
           price, member_price, add_on_price, hours, active, taxable,
           warranty_text, pending_images, images_to_delete, service_materials, service_equipment,
           modified_at, sync_status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW(), 'pending')
        ON CONFLICT (st_id, tenant_id) DO UPDATE SET
          code = COALESCE(EXCLUDED.code, crm.pricebook_service_edits.code),
          name = COALESCE(EXCLUDED.name, crm.pricebook_service_edits.name),
          display_name = COALESCE(EXCLUDED.display_name, crm.pricebook_service_edits.display_name),
          description = COALESCE(EXCLUDED.description, crm.pricebook_service_edits.description),
          price = COALESCE(EXCLUDED.price, crm.pricebook_service_edits.price),
          member_price = COALESCE(EXCLUDED.member_price, crm.pricebook_service_edits.member_price),
          add_on_price = COALESCE(EXCLUDED.add_on_price, crm.pricebook_service_edits.add_on_price),
          hours = COALESCE(EXCLUDED.hours, crm.pricebook_service_edits.hours),
          active = COALESCE(EXCLUDED.active, crm.pricebook_service_edits.active),
          taxable = COALESCE(EXCLUDED.taxable, crm.pricebook_service_edits.taxable),
          warranty_text = COALESCE(EXCLUDED.warranty_text, crm.pricebook_service_edits.warranty_text),
          pending_images = COALESCE(EXCLUDED.pending_images, crm.pricebook_service_edits.pending_images),
          images_to_delete = COALESCE(EXCLUDED.images_to_delete, crm.pricebook_service_edits.images_to_delete),
          service_materials = COALESCE(EXCLUDED.service_materials, crm.pricebook_service_edits.service_materials),
          service_equipment = COALESCE(EXCLUDED.service_equipment, crm.pricebook_service_edits.service_equipment),
          modified_at = NOW(),
          sync_status = 'pending'
        RETURNING *
      `, [
        parseInt(stId, 10), tenantId,
        edits.code, edits.name, edits.displayName || edits.display_name, edits.description,
        edits.price, edits.memberPrice || edits.member_price, edits.addOnPrice || edits.add_on_price,
        edits.hours || edits.durationHours, edits.active, edits.taxable, edits.warranty,
        pendingImagesValue, imagesToDeleteValue, serviceMaterialsValue, serviceEquipmentValue
      ]);

      // Invalidate cache
      await invalidateCache(`pricebook:${tenantId}:services:*`);

      console.log(`[SERVICES] Saved edits for service ${stId}, sync_status: pending`);

      res.json({
        success: true,
        message: 'Changes saved locally. Click PUSH to sync with ServiceTitan.',
        data: result.rows[0],
        syncStatus: 'pending'
      });
    } catch (error) {
      console.error('[SERVICES] Save error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  })
);

// ============================================================================
// POST /api/pricebook/services/:stId/push - Push changes to ServiceTitan
// Handles both NEW services (POST to ST) and EXISTING services (PATCH to ST)
// ============================================================================

router.post(
  '/:stId/push',
  asyncHandler(async (req, res) => {
    const pushStartTime = Date.now();
    const tenantId = getTenantId(req);
    const { stId } = req.params;

    console.log(`[SERVICES] Pushing service ${stId} to ServiceTitan`);

    // Parse JSON fields safely
    const parseJsonField = (field) => {
      if (!field) return [];
      if (Array.isArray(field)) return field;
      if (typeof field === 'string') {
        try { return JSON.parse(field); } catch { return []; }
      }
      return field;
    };

    // Check if this is a NEW service
    const isNewService = stId.startsWith('new_');

    try {
      if (isNewService) {
        // ========================================
        // NEW SERVICE - POST to ServiceTitan
        // ========================================
        const localId = stId.replace('new_', '');
        console.log(`[SERVICES] Creating NEW service in ST, local id: ${localId}`);

        // Get the new service from CRM
        const newServiceResult = await pool.query(
          'SELECT * FROM crm.pricebook_new_services WHERE id = $1 AND tenant_id = $2',
          [parseInt(localId, 10), tenantId]
        );

        if (!newServiceResult.rows[0]) {
          return res.status(404).json({ success: false, error: 'Service not found in CRM' });
        }

        const service = newServiceResult.rows[0];

        // Parse warranty
        let warranty = service.warranty || {};
        if (typeof warranty === 'string') {
          try { warranty = JSON.parse(warranty); } catch { warranty = {}; }
        }

        // Get categories - extract just the IDs as integers for ST API
        const categories = parseJsonField(service.categories);
        const categoryIds = categories.map(c => parseInt(c.id || c.st_id || c, 10)).filter(id => !isNaN(id));

        // Get service materials in ST format: { skuId, quantity }
        // Priority: materialId before id because kit materials have id like 'kit-61917089-...'
        const serviceMaterials = parseJsonField(service.service_materials);
        const formattedMaterials = serviceMaterials.map(m => ({
          skuId: parseInt(m.skuId || m.sku_id || m.stId || m.st_id || m.materialId || m.id, 10),
          quantity: m.quantity || 1,
        })).filter(m => m.skuId && !isNaN(m.skuId));
        console.log(`[SERVICES] New service materials: ${formattedMaterials.length} items, skuIds: ${formattedMaterials.map(m => m.skuId).join(', ')}`);

        // Get service equipment in ST format: { skuId, quantity }
        // Priority: equipmentId before id for same reason
        const serviceEquipment = parseJsonField(service.service_equipment);
        const formattedEquipment = serviceEquipment.map(e => ({
          skuId: parseInt(e.skuId || e.sku_id || e.stId || e.st_id || e.equipmentId || e.id, 10),
          quantity: e.quantity || 1,
        })).filter(e => e.skuId && !isNaN(e.skuId));
        console.log(`[SERVICES] New service equipment: ${formattedEquipment.length} items, skuIds: ${formattedEquipment.map(e => e.skuId).join(', ')}`);

        // Build payload for ST - NOTE: No 'id' field for POST (ST generates it)
        const stPayload = {
          code: service.code,
          displayName: service.display_name || service.code,
          description: service.description || '',
          price: parseFloat(service.price) || 0,
          memberPrice: parseFloat(service.member_price) || 0,
          addOnPrice: parseFloat(service.add_on_price) || 0,
          addOnMemberPrice: parseFloat(service.add_on_member_price) || parseFloat(service.add_on_price) || 0,
          hours: parseFloat(service.hours) || 0,
          active: service.active !== false,
          taxable: service.taxable !== false,
          isLabor: service.is_labor || false,
          account: service.account || null,
          warranty: {
            duration: warranty.duration || 0,
            description: warranty.description || '',
          },
          categories: categoryIds,
          serviceMaterials: formattedMaterials,
          serviceEquipment: formattedEquipment,
          recommendations: parseJsonField(service.recommendations),
          upgrades: parseJsonField(service.upgrades),
        };

        // Upload pending images to ServiceTitan
        const pendingImages = parseJsonField(service.pending_images);
        if (pendingImages.length > 0) {
          console.log(`[SERVICES] Uploading ${pendingImages.length} pending images for new service`);
          const stAssets = [];

          for (let i = 0; i < pendingImages.length; i++) {
            const imageUrl = pendingImages[i];
            const stImagePath = await uploadImageToServiceTitan(
              imageUrl,
              tenantId,
              `service_${service.code}_${i + 1}.jpg`
            );
            if (stImagePath) {
              stAssets.push({ url: stImagePath, type: 'Image' });
              console.log(`[SERVICES] Uploaded image ${i + 1}: ${stImagePath}`);
            }
          }

          if (stAssets.length > 0) {
            stPayload.assets = stAssets;
            console.log(`[SERVICES] Added ${stAssets.length} assets to payload`);
          }
        }

        console.log('[SERVICES] New service payload:', JSON.stringify(stPayload, null, 2));

        // POST to ServiceTitan API to CREATE new service
        const stApiUrl = `https://api.servicetitan.io/pricebook/v2/tenant/${tenantId}/services`;
        const stResponse = await stRequest(stApiUrl, {
          method: 'POST',
          body: stPayload,
        });

        // Verify we got a valid ST ID back
        const newStId = stResponse.data?.id || stResponse.id;
        if (!newStId) {
          throw new Error('ServiceTitan did not return a valid service ID');
        }

        console.log(`[SERVICES] ServiceTitan created service with ID: ${newStId}`);

        // Insert into master table
        await pool.query(`
          INSERT INTO master.pricebook_services (
            st_id, tenant_id, code, name, display_name, description,
            price, member_price, add_on_price, hours, active, taxable,
            is_labor, account, warranty, categories,
            service_materials, service_equipment, recommendations, upgrades,
            st_created_on, st_modified_on, last_synced_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, NOW(), NOW(), NOW()
          )
          ON CONFLICT (st_id, tenant_id) DO UPDATE SET
            code = EXCLUDED.code,
            display_name = EXCLUDED.display_name,
            description = EXCLUDED.description,
            price = EXCLUDED.price,
            member_price = EXCLUDED.member_price,
            add_on_price = EXCLUDED.add_on_price,
            hours = EXCLUDED.hours,
            active = EXCLUDED.active,
            taxable = EXCLUDED.taxable,
            updated_at = NOW(),
            last_synced_at = NOW()
        `, [
          newStId, tenantId, stPayload.code, stPayload.displayName, stPayload.displayName,
          stPayload.description, stPayload.price, stPayload.memberPrice, stPayload.addOnPrice,
          stPayload.hours, stPayload.active, stPayload.taxable, stPayload.isLabor, stPayload.account,
          JSON.stringify(stPayload.warranty), JSON.stringify(categoryIds),
          JSON.stringify(formattedMaterials), JSON.stringify(formattedEquipment),
          JSON.stringify(stPayload.recommendations), JSON.stringify(stPayload.upgrades)
        ]);

        // Update the CRM record with the ST ID
        await pool.query(`
          UPDATE crm.pricebook_new_services
          SET st_id = $1, pushed_to_st = true, pushed_at = NOW(), push_error = NULL
          WHERE id = $2 AND tenant_id = $3
        `, [newStId, parseInt(localId, 10), tenantId]);

        // Invalidate cache
        await invalidateCache(`pricebook:${tenantId}:services:*`);

        console.log(`[SERVICES] Successfully created service ${service.code} in ServiceTitan with ID: ${newStId}`);

        return res.json({
          success: true,
          message: 'Service created in ServiceTitan',
          syncStatus: 'synced',
          newStId: newStId,
          data: stResponse.data || { id: newStId, ...stPayload }
        });
      }

      // ========================================
      // EXISTING SERVICE - PATCH to ServiceTitan
      // ========================================

      // Get pending edits from CRM
      const editsResult = await pool.query(
        'SELECT * FROM crm.pricebook_service_edits WHERE st_id = $1 AND tenant_id = $2',
        [parseInt(stId, 10), tenantId]
      );

      // Get original from master
      const masterResult = await pool.query(
        'SELECT * FROM master.pricebook_services WHERE st_id = $1 AND tenant_id = $2',
        [parseInt(stId, 10), tenantId]
      );

      if (!masterResult.rows[0]) {
        return res.status(404).json({ success: false, error: 'Service not found in database' });
      }

      const original = masterResult.rows[0];
      const edits = editsResult.rows[0] || {};

      // Build payload for ServiceTitan - merge edits with original
      // Get warranty from edits or original
      const originalWarranty = original.warranty || {};
      const warrantyDescription = edits.warranty_text ?? originalWarranty.description ?? '';

      // Get categories - extract just the IDs as integers for ST API
      const categories = parseJsonField(original.categories);
      const categoryIds = categories.map(c => parseInt(c.id || c.st_id, 10)).filter(id => !isNaN(id));

      // Get service materials - prefer edits over original
      // Edits take precedence: if user modified materials, use those; otherwise fall back to original
      const serviceMaterialsSource = edits.service_materials ? parseJsonField(edits.service_materials) : parseJsonField(original.service_materials);
      const formattedMaterials = serviceMaterialsSource.map(m => ({
        skuId: parseInt(m.skuId || m.sku_id || m.materialId || m.id, 10),
        quantity: m.quantity || 1,
      })).filter(m => m.skuId && !isNaN(m.skuId));
      console.log(`[SERVICES] Push materials: ${formattedMaterials.length} items (from ${edits.service_materials ? 'edits' : 'original'})`);

      // Get service equipment - prefer edits over original
      const serviceEquipmentSource = edits.service_equipment ? parseJsonField(edits.service_equipment) : parseJsonField(original.service_equipment);
      const formattedEquipment = serviceEquipmentSource.map(e => ({
        skuId: parseInt(e.skuId || e.sku_id || e.equipmentId || e.id, 10),
        quantity: e.quantity || 1,
      })).filter(e => e.skuId && !isNaN(e.skuId));
      console.log(`[SERVICES] Push equipment: ${formattedEquipment.length} items (from ${edits.service_equipment ? 'edits' : 'original'})`);

      // Get recommendations and upgrades
      const recommendations = parseJsonField(original.recommendations);
      const upgrades = parseJsonField(original.upgrades);

      const stPayload = {
        id: parseInt(stId, 10),
        code: edits.code || original.code,
        displayName: edits.display_name || edits.name || original.display_name,
        description: edits.description || original.description,
        price: parseFloat(edits.price ?? original.price ?? 0),
        memberPrice: parseFloat(edits.member_price ?? original.member_price ?? 0),
        addOnPrice: parseFloat(edits.add_on_price ?? original.add_on_price ?? 0),
        addOnMemberPrice: parseFloat(edits.add_on_member_price ?? original.add_on_member_price ?? original.add_on_price ?? 0),
        hours: parseFloat(edits.hours ?? original.hours ?? 0),
        active: edits.active ?? original.active ?? true,
        taxable: edits.taxable ?? original.taxable ?? true,
        isLabor: original.is_labor ?? false,
        account: edits.account || original.account || null,
        warranty: {
          duration: originalWarranty.duration ?? 0,
          description: warrantyDescription,
        },
        categories: categoryIds,
        serviceMaterials: formattedMaterials,
        serviceEquipment: formattedEquipment,
        recommendations: recommendations,
        upgrades: upgrades,
      };

      // Handle existing assets
      let existingAssets = parseJsonField(original.assets) || [];

      // Handle images to delete
      const imagesToDelete = parseJsonField(edits.images_to_delete);
      if (imagesToDelete.length > 0) {
        console.log(`[SERVICES] Removing ${imagesToDelete.length} images from assets`);
        existingAssets = existingAssets.filter(a =>
          !imagesToDelete.some(del => a.url && (a.url.includes(del) || del.includes(a.url)))
        );
      }

      // Upload pending images to ServiceTitan IN PARALLEL
      const pendingImages = parseJsonField(edits.pending_images);
      let newStAssets = [];
      if (pendingImages.length > 0) {
        console.log(`[SERVICES] Uploading ${pendingImages.length} pending images for service ${stId} in parallel`);
        const startTime = Date.now();

        // Pre-fetch token once for all uploads
        const { getAccessToken } = await import('../services/tokenManager.js');
        const accessToken = await getAccessToken();

        // Upload all images in parallel
        const uploadPromises = pendingImages.map((imageUrl, i) =>
          uploadImageToServiceTitanFast(imageUrl, tenantId, `service_${stId}_${Date.now()}_${i + 1}.jpg`, accessToken)
        );

        const results = await Promise.all(uploadPromises);
        newStAssets = results
          .filter(path => path !== null)
          .map(path => ({ url: path, type: 'Image' }));

        console.log(`[SERVICES] Uploaded ${newStAssets.length}/${pendingImages.length} images in ${Date.now() - startTime}ms`);
      }

      // Merge assets: new uploads + existing (minus deleted)
      if (newStAssets.length > 0 || existingAssets.length > 0 || imagesToDelete.length > 0) {
        stPayload.assets = [...newStAssets, ...existingAssets.filter(a => a.type === 'Image')];
        console.log(`[SERVICES] Final assets count: ${stPayload.assets.length}`);
      }

      console.log('[SERVICES] Push payload:', JSON.stringify(stPayload, null, 2));

      // Push to ServiceTitan API (use PATCH to update existing service)
      const stApiUrl = `https://api.servicetitan.io/pricebook/v2/tenant/${tenantId}/services/${stId}`;
      const stResponse = await stRequest(stApiUrl, {
        method: 'PATCH',
        body: stPayload,
      });

      // Run all post-push updates IN PARALLEL for speed
      const finalAssets = stResponse.data?.assets || stPayload.assets || [];
      const finalMaterials = stResponse.data?.serviceMaterials || formattedMaterials;
      const finalEquipment = stResponse.data?.serviceEquipment || formattedEquipment;
      const dbUpdatePromises = [];

      // Update CRM sync status and clear synced edits
      if (editsResult.rows[0]) {
        dbUpdatePromises.push(
          pool.query(`
            UPDATE crm.pricebook_service_edits
            SET sync_status = 'synced', last_pushed_at = NOW(), sync_error = NULL,
                pending_images = '[]', images_to_delete = '[]',
                service_materials = NULL, service_equipment = NULL
            WHERE st_id = $1 AND tenant_id = $2
          `, [parseInt(stId, 10), tenantId])
        );
      }

      // Update master table with new data including assets, materials, equipment
      if (stResponse.data) {
        dbUpdatePromises.push(
          pool.query(`
            UPDATE master.pricebook_services
            SET
              code = $3,
              display_name = $4,
              description = $5,
              price = $6,
              member_price = $7,
              add_on_price = $8,
              hours = $9,
              active = $10,
              taxable = $11,
              assets = $12,
              service_materials = $13,
              service_equipment = $14,
              updated_at = NOW(),
              last_synced_at = NOW()
            WHERE st_id = $1 AND tenant_id = $2
          `, [
            parseInt(stId, 10), tenantId, stPayload.code, stPayload.displayName, stPayload.description,
            stPayload.price, stPayload.memberPrice, stPayload.addOnPrice,
            stPayload.hours, stPayload.active, stPayload.taxable,
            JSON.stringify(finalAssets),
            JSON.stringify(finalMaterials),
            JSON.stringify(finalEquipment)
          ])
        );
      }

      // Invalidate cache (non-blocking)
      dbUpdatePromises.push(invalidateCache(`pricebook:${tenantId}:services:*`));

      // Execute all updates in parallel
      await Promise.all(dbUpdatePromises);

      const totalTime = Date.now() - pushStartTime;
      console.log(`[SERVICES] Successfully pushed service ${stId} to ServiceTitan in ${totalTime}ms`);

      res.json({
        success: true,
        message: `Changes pushed to ServiceTitan (${totalTime}ms)`,
        syncStatus: 'synced',
        data: stResponse.data || stPayload
      });
    } catch (error) {
      console.error('[SERVICES] Push error:', error);

      // Update CRM with error status
      try {
        await pool.query(`
          UPDATE crm.pricebook_service_edits
          SET sync_status = 'error', sync_error = $3
          WHERE st_id = $1 AND tenant_id = $2
        `, [parseInt(stId, 10), tenantId, error.message]);
      } catch (e) {
        console.error('[SERVICES] Failed to update error status:', e);
      }

      res.status(500).json({ success: false, error: error.message });
    }
  })
);

// ============================================================================
// POST /api/pricebook/services/:stId/pull - Pull latest from ServiceTitan
// ============================================================================

router.post(
  '/:stId/pull',
  asyncHandler(async (req, res) => {
    const tenantId = getTenantId(req);
    const { stId } = req.params;

    console.log(`[SERVICES] Pulling service ${stId} from ServiceTitan`);

    try {
      // Fetch from ServiceTitan
      const stApiUrl = `https://api.servicetitan.io/pricebook/v2/tenant/${tenantId}/services/${stId}`;
      const stResponse = await stRequest(stApiUrl, {
        method: 'GET',
      });

      if (!stResponse.data) {
        return res.status(404).json({ success: false, error: 'Service not found in ServiceTitan' });
      }

      const service = stResponse.data;

      // Update master table
      await pool.query(`
        INSERT INTO master.pricebook_services (
          st_id, tenant_id, code, name, display_name, description,
          price, member_price, add_on_price, hours, active, taxable,
          categories, assets, warranty, service_materials, service_equipment,
          recommendations, upgrades, st_created_on, st_modified_on, last_synced_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, NOW())
        ON CONFLICT (st_id, tenant_id) DO UPDATE SET
          code = EXCLUDED.code,
          name = EXCLUDED.name,
          display_name = EXCLUDED.display_name,
          description = EXCLUDED.description,
          price = EXCLUDED.price,
          member_price = EXCLUDED.member_price,
          add_on_price = EXCLUDED.add_on_price,
          hours = EXCLUDED.hours,
          active = EXCLUDED.active,
          taxable = EXCLUDED.taxable,
          categories = EXCLUDED.categories,
          assets = EXCLUDED.assets,
          warranty = EXCLUDED.warranty,
          service_materials = EXCLUDED.service_materials,
          service_equipment = EXCLUDED.service_equipment,
          recommendations = EXCLUDED.recommendations,
          upgrades = EXCLUDED.upgrades,
          st_modified_on = EXCLUDED.st_modified_on,
          updated_at = NOW(),
          last_synced_at = NOW()
      `, [
        service.id, tenantId, service.code, service.displayName, service.displayName,
        service.description, service.price, service.memberPrice, service.addOnPrice,
        service.hours, service.active, service.taxable,
        JSON.stringify(service.categories || []), JSON.stringify(service.assets || []),
        JSON.stringify(service.warranty || {}), JSON.stringify(service.serviceMaterials || []),
        JSON.stringify(service.serviceEquipment || []), JSON.stringify(service.recommendations || []),
        JSON.stringify(service.upgrades || []), service.createdOn, service.modifiedOn
      ]);

      // Clear any local edits (user chose to pull fresh data)
      await pool.query(
        'DELETE FROM crm.pricebook_service_edits WHERE st_id = $1 AND tenant_id = $2',
        [parseInt(stId, 10), tenantId]
      );

      // Invalidate cache
      await invalidateCache(`pricebook:${tenantId}:services:*`);

      console.log(`[SERVICES] Pulled service ${stId} from ServiceTitan`);

      res.json({
        success: true,
        message: 'Pulled latest from ServiceTitan',
        data: service
      });
    } catch (error) {
      console.error('[SERVICES] Pull error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
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
// Helper function: Upload image to ServiceTitan
// ============================================================================

/**
 * Upload an image from S3/external URL to ServiceTitan
 * Uses multipart/form-data as required by ST API
 * @param {string} imageUrl - The S3 or external URL of the image
 * @param {string} tenantId - The tenant ID
 * @param {string} filename - Optional filename for the image
 * @returns {Promise<string|null>} - The ServiceTitan image path or null if failed
 */
async function uploadImageToServiceTitan(imageUrl, tenantId, filename = null) {
  try {
    console.log(`[ST SERVICE IMAGE UPLOAD] Starting upload for: ${imageUrl}`);

    // Fetch the image from the URL (S3 or external)
    const imageResponse = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; LAZI-CRM/1.0)',
        'Accept': 'image/*',
      },
    });

    if (!imageResponse.ok) {
      console.error(`[ST SERVICE IMAGE UPLOAD] Failed to fetch image from ${imageUrl}: ${imageResponse.status}`);
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
    const finalFilename = filename || `service_${Date.now()}.${ext}`;

    console.log(`[ST SERVICE IMAGE UPLOAD] Uploading to ST: ${finalFilename} (${imageBuffer.length} bytes, ${contentType})`);

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
        },
        body: formData,
      }
    );

    if (!stResponse.ok) {
      const errorText = await stResponse.text();
      console.error(`[ST SERVICE IMAGE UPLOAD] ST API error: ${stResponse.status} - ${errorText}`);
      return null;
    }

    const stResult = await stResponse.json();
    console.log(`[ST SERVICE IMAGE UPLOAD] Success! ST response:`, JSON.stringify(stResult));

    // ST returns the image path like "Images/Service/uuid.jpg"
    return stResult.path || stResult.url || stResult.imageUrl || stResult;

  } catch (error) {
    console.error(`[ST SERVICE IMAGE UPLOAD] Error uploading image:`, error.message);
    return null;
  }
}

/**
 * Fast image upload - uses pre-fetched access token for parallel uploads
 */
async function uploadImageToServiceTitanFast(imageUrl, tenantId, filename, accessToken) {
  try {
    // Fetch the image from the URL (S3 or external)
    const imageResponse = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; LAZI-CRM/1.0)',
        'Accept': 'image/*',
      },
    });

    if (!imageResponse.ok) {
      console.error(`[ST FAST UPLOAD] Failed to fetch image from ${imageUrl}: ${imageResponse.status}`);
      return null;
    }

    // Get image as buffer
    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

    // Determine content type and filename
    const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';
    const ext = contentType.includes('png') ? 'png' :
                contentType.includes('gif') ? 'gif' :
                contentType.includes('webp') ? 'webp' : 'jpg';

    const finalFilename = filename || `service_${Date.now()}.${ext}`;

    // Create FormData with the image
    const formData = new FormData();
    const imageBlob = new Blob([imageBuffer], { type: contentType });
    formData.append('file', imageBlob, finalFilename);

    // Upload to ServiceTitan using pre-fetched token
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
      console.error(`[ST FAST UPLOAD] ST API error: ${stResponse.status} - ${errorText}`);
      return null;
    }

    const stResult = await stResponse.json();
    return stResult.path || stResult.url || stResult.imageUrl || stResult;

  } catch (error) {
    console.error(`[ST FAST UPLOAD] Error:`, error.message);
    return null;
  }
}

export default router;
