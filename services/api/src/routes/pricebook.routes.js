/**
 * Pricebook Routes
 * ServiceTitan Pricebook API endpoints
 * Includes: Services, Materials, Equipment, Categories, Discounts, etc.
 */

import { Router } from 'express';
import { stEndpoints } from '../lib/stEndpoints.js';
import {
  createListHandler,
  createGetHandler,
  createCreateHandler,
  createUpdateHandler,
  createDeleteHandler,
  createExportHandler,
  createActionHandler,
  addDefaultAssetUrl,
} from '../controllers/generic.controller.js';
import { stRequest } from '../services/stClient.js';
import { getAccessToken } from '../services/tokenManager.js';
import pg from 'pg';
import config from '../config/index.js';

const { Pool } = pg;

// Use raw SQL pool for pricebook queries (data is in raw schema)
function getPool() {
  const connectionString = config.database.url;
  return new Pool({
    connectionString,
    max: 10,
    ssl: connectionString?.includes('supabase') ? { rejectUnauthorized: false } : false,
  });
}

const router = Router();

/**
 * Get all descendant category IDs for a given category (recursive)
 * This allows filtering by a parent category to include all items in child categories
 */
async function getAllDescendantCategoryIds(categoryId) {
  const pool = getPool();
  try {
    const catId = parseInt(categoryId);
    const allIds = [catId];
    
    // Recursively get all children using raw SQL
    const getChildren = async (parentIds) => {
      if (parentIds.length === 0) return;
      
      const result = await pool.query(
        `SELECT st_id FROM raw.st_pricebook_categories WHERE parent_id = ANY($1)`,
        [parentIds]
      );
      
      const childIds = result.rows.map(c => Number(c.st_id));
      if (childIds.length > 0) {
        allIds.push(...childIds);
        await getChildren(childIds);
      }
    };
    
    await getChildren([catId]);
    return allIds;
  } finally {
    await pool.end();
  }
}

/**
 * Create a pricebook list handler that adds defaultAssetUrl to each item
 */
function createPricebookListHandler(endpointFn) {
  return async (req, res, next) => {
    try {
      const result = await stRequest(endpointFn(), {
        method: 'GET',
        query: req.query,
      });

      // Add defaultAssetUrl to each item in the data array
      if (result.data?.data && Array.isArray(result.data.data)) {
        result.data.data = addDefaultAssetUrl(result.data.data);
      }

      res.status(result.status).json(result.data);
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Create a pricebook get handler that adds defaultAssetUrl to the item
 */
function createPricebookGetHandler(endpointFn) {
  return async (req, res, next) => {
    try {
      const { id } = req.params;
      const result = await stRequest(endpointFn(id), {
        method: 'GET',
        query: req.query,
      });

      // Add defaultAssetUrl to the item
      if (result.data) {
        result.data = addDefaultAssetUrl(result.data);
      }

      res.status(result.status).json(result.data);
    } catch (error) {
      next(error);
    }
  };
}

// ═══════════════════════════════════════════════════════════════
// SERVICES (with defaultAssetUrl)
// ═══════════════════════════════════════════════════════════════
router.get('/services', createPricebookListHandler(stEndpoints.services.list));
router.get('/services/export', createExportHandler(stEndpoints.services.export));

// Database-backed services list with filtering (uses raw schema)
router.get('/db/services', async (req, res) => {
  const pool = getPool();
  try {
    const { 
      page = 1, 
      pageSize = 25, 
      search, 
      active, 
      categoryId,
      priceMin,
      priceMax,
      hoursMin,
      hoursMax,
      hasImages,
      hasMaterials,
      hasEquipment,
    } = req.query;
    
    const skip = (parseInt(page) - 1) * parseInt(pageSize);
    const take = parseInt(pageSize);
    
    // Build WHERE conditions
    const conditions = [];
    const params = [];
    let paramIndex = 1;
    
    // Status filter
    if (active !== undefined) {
      conditions.push(`active = $${paramIndex++}`);
      params.push(active === 'true');
    }
    
    // Search filter (code, name, description)
    if (search) {
      conditions.push(`(code ILIKE $${paramIndex} OR display_name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }
    
    // Price range filter
    if (priceMin) {
      conditions.push(`price >= $${paramIndex++}`);
      params.push(parseFloat(priceMin));
    }
    if (priceMax) {
      conditions.push(`price <= $${paramIndex++}`);
      params.push(parseFloat(priceMax));
    }
    
    // Hours range filter
    if (hoursMin) {
      conditions.push(`hours >= $${paramIndex++}`);
      params.push(parseFloat(hoursMin));
    }
    if (hoursMax) {
      conditions.push(`hours <= $${paramIndex++}`);
      params.push(parseFloat(hoursMax));
    }
    
    // Has images filter
    if (hasImages === 'true') {
      conditions.push(`jsonb_array_length(COALESCE(assets, '[]'::jsonb)) > 0`);
    } else if (hasImages === 'false') {
      conditions.push(`jsonb_array_length(COALESCE(assets, '[]'::jsonb)) = 0`);
    }
    
    // Has materials filter
    if (hasMaterials === 'true') {
      conditions.push(`jsonb_array_length(COALESCE(service_materials, '[]'::jsonb)) > 0`);
    } else if (hasMaterials === 'false') {
      conditions.push(`jsonb_array_length(COALESCE(service_materials, '[]'::jsonb)) = 0`);
    }
    
    // Has equipment filter
    if (hasEquipment === 'true') {
      conditions.push(`jsonb_array_length(COALESCE(service_equipment, '[]'::jsonb)) > 0`);
    } else if (hasEquipment === 'false') {
      conditions.push(`jsonb_array_length(COALESCE(service_equipment, '[]'::jsonb)) = 0`);
    }
    
    // Category filter
    if (categoryId) {
      const allCategoryIds = await getAllDescendantCategoryIds(categoryId);
      const categoryConditions = allCategoryIds.map(id => `categories @> '[{"id": ${id}}]'::jsonb`).join(' OR ');
      conditions.push(`(${categoryConditions})`);
    }
    
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    // Get total count
    const countResult = await pool.query(
      `SELECT COUNT(*) as count FROM raw.st_pricebook_services ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0]?.count || 0);
    
    // Get services
    const servicesResult = await pool.query(
      `SELECT * FROM raw.st_pricebook_services ${whereClause} ORDER BY display_name ASC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      [...params, take, skip]
    );
    const services = servicesResult.rows;
    
    const data = services.map(s => ({
      id: s.id,
      stId: s.st_id.toString(),
      code: s.code || '',
      name: s.display_name || '',
      description: s.description || '',
      price: parseFloat(s.price) || 0,
      memberPrice: parseFloat(s.member_price) || 0,
      addOnPrice: parseFloat(s.add_on_price) || 0,
      durationHours: parseFloat(s.hours) || 0,
      active: s.active ?? true,
      taxable: s.taxable ?? false,
      account: s.account || '',
      categories: s.categories || [],
      defaultImageUrl: s.assets?.length > 0 ? `/images/db/services/${s.st_id}` : null,
      hasMaterials: (s.service_materials?.length || 0) > 0,
      hasEquipment: (s.service_equipment?.length || 0) > 0,
    }));
    
    res.json({
      data,
      page: parseInt(page),
      pageSize: take,
      totalCount: total,
      hasMore: skip + take < total,
    });
  } catch (error) {
    console.error('Error fetching services from DB:', error);
    res.status(500).json({ error: 'Failed to fetch services', message: error.message });
  } finally {
    await pool.end();
  }
});

// Database-backed service detail with linked materials (uses raw schema)
router.get('/db/services/:id', async (req, res) => {
  const pool = getPool();
  const { resolveImageUrl, resolveImageUrls } = await import('../services/imageResolver.js');
  const tenantId = req.headers['x-tenant-id'] || process.env.SERVICE_TITAN_TENANT_ID || '3222348440';
  
  try {
    const { id } = req.params;
    
    // Determine if id is a UUID or a ServiceTitan ID
    const isUuid = id.includes('-') && id.length === 36;
    
    // Fetch service from database - join raw with master to get S3 image URLs
    let serviceResult;
    if (isUuid) {
      serviceResult = await pool.query(
        `SELECT r.*, m.s3_image_url, m.s3_image_key 
         FROM raw.st_pricebook_services r
         LEFT JOIN master.pricebook_services m ON r.st_id = m.st_id AND r.tenant_id::text = m.tenant_id
         WHERE r.id = $1`,
        [id]
      );
    } else {
      serviceResult = await pool.query(
        `SELECT r.*, m.s3_image_url, m.s3_image_key
         FROM raw.st_pricebook_services r
         LEFT JOIN master.pricebook_services m ON r.st_id = m.st_id AND r.tenant_id::text = m.tenant_id
         WHERE r.st_id = $1`,
        [id]
      );
    }
    
    const service = serviceResult.rows[0];
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }
    
    // Parse service_materials JSON to get linked material IDs
    const serviceMaterials = service.service_materials || [];
    const materialStIds = serviceMaterials.map(m => m.skuId || m.id).filter(Boolean);
    
    // Fetch linked materials from database - join with master for S3 images
    let materials = [];
    if (materialStIds.length > 0) {
      const materialsResult = await pool.query(
        `SELECT r.*, m.s3_image_url, m.s3_image_key
         FROM raw.st_pricebook_materials r
         LEFT JOIN master.pricebook_materials m ON r.st_id = m.st_id AND r.tenant_id::text = m.tenant_id
         WHERE r.st_id = ANY($1)`,
        [materialStIds.map(id => BigInt(id))]
      );
      const dbMaterials = materialsResult.rows;
      
      // Map materials with quantity from service_materials
      materials = serviceMaterials.map(sm => {
        const dbMat = dbMaterials.find(m => m.st_id.toString() === (sm.skuId || sm.id).toString());
        if (!dbMat) return null;
        
        const primaryVendor = dbMat.primary_vendor || {};
        
        return {
          id: dbMat.id,
          materialId: dbMat.st_id.toString(),
          stId: dbMat.st_id,
          code: dbMat.code || '',
          name: dbMat.display_name || '',
          description: dbMat.description || '',
          quantity: sm.quantity || 1,
          unitCost: parseFloat(dbMat.cost) || 0,
          vendorName: primaryVendor.name || 'Default Replenishment Vendor',
          vendorId: primaryVendor.id?.toString() || null,
          imageUrl: dbMat.s3_image_url || null,
        };
      }).filter(Boolean);
    }
    
    // Parse service_equipment JSON
    const serviceEquipment = service.service_equipment || [];
    const equipmentStIds = serviceEquipment.map(e => e.skuId || e.id).filter(Boolean);
    
    // Fetch linked equipment from database - join with master for S3 images
    let equipment = [];
    if (equipmentStIds.length > 0) {
      const equipmentResult = await pool.query(
        `SELECT r.*, m.s3_image_url, m.s3_image_key
         FROM raw.st_pricebook_equipment r
         LEFT JOIN master.pricebook_equipment m ON r.st_id = m.st_id AND r.tenant_id::text = m.tenant_id
         WHERE r.st_id = ANY($1)`,
        [equipmentStIds.map(id => BigInt(id))]
      );
      const dbEquipment = equipmentResult.rows;
      
      equipment = serviceEquipment.map(se => {
        const dbEquip = dbEquipment.find(e => e.st_id.toString() === (se.skuId || se.id).toString());
        if (!dbEquip) return null;
        
        const primaryVendor = dbEquip.primary_vendor || {};
        
        return {
          id: dbEquip.id,
          equipmentId: dbEquip.st_id.toString(),
          stId: dbEquip.st_id,
          code: dbEquip.code || '',
          name: dbEquip.display_name || '',
          description: dbEquip.description || '',
          quantity: se.quantity || 1,
          unitCost: parseFloat(dbEquip.price) || 0,
          vendorName: primaryVendor.name || 'Default Replenishment Vendor',
          vendorId: primaryVendor.id?.toString() || null,
          imageUrl: dbEquip.s3_image_url || null,
        };
      }).filter(Boolean);
    }
    
    // Parse categories
    const categories = (service.categories || []).map(cat => ({
      id: cat.id?.toString() || '',
      path: cat.name || '',
      name: cat.name?.split(' > ').pop() || '',
    }));
    
    // Use S3 image URL from master table, or resolve if not available
    console.log('[DEBUG] service.s3_image_url:', service.s3_image_url);
    console.log('[DEBUG] service.st_id:', service.st_id);
    console.log('[DEBUG] service.assets:', service.assets);
    const serviceImageUrl = service.s3_image_url || (service.assets?.[0]?.url ? await resolveImageUrl('services', service.st_id, tenantId) : null);
    console.log('[DEBUG] serviceImageUrl:', serviceImageUrl);
    
    // Build response
    const response = {
      id: service.id,
      stId: service.st_id.toString(),
      code: service.code || '',
      name: service.display_name || '',
      displayName: service.display_name || '',
      description: service.description || '',
      warranty: service.warranty?.description || '',
      price: parseFloat(service.price) || 0,
      memberPrice: parseFloat(service.member_price) || 0,
      addOnPrice: parseFloat(service.add_on_price) || 0,
      memberAddOnPrice: parseFloat(service.member_price) || 0,
      durationHours: parseFloat(service.hours) || 0,
      active: service.active ?? true,
      taxable: service.taxable ?? false,
      account: service.account || '',
      categories,
      materials,
      equipment,
      upgrades: (service.upgrades || []).map(u => u.name || u),
      recommendations: (service.recommendations || []).map(r => r.name || r),
      image_url: serviceImageUrl,
      defaultImageUrl: serviceImageUrl,
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error fetching service from DB:', error);
    res.status(500).json({ error: 'Failed to fetch service', message: error.message });
  } finally {
    await pool.end();
  }
});

router.get('/services/:id', createPricebookGetHandler(stEndpoints.services.get));
router.post('/services', createCreateHandler(stEndpoints.services.create));
router.patch('/services/:id', createUpdateHandler(stEndpoints.services.update, 'PATCH'));
router.delete('/services/:id', createDeleteHandler(stEndpoints.services.delete));

// ═══════════════════════════════════════════════════════════════
// MATERIALS (with defaultAssetUrl)
// ═══════════════════════════════════════════════════════════════

// Database-backed materials list with filtering (uses raw schema)
router.get('/db/materials', async (req, res) => {
  const pool = getPool();
  const { resolveImageUrls } = await import('../services/imageResolver.js');
  const tenantId = req.headers['x-tenant-id'] || process.env.SERVICE_TITAN_TENANT_ID || '3222348440';
  
  try {
    const { 
      page = '1', 
      pageSize = '25', 
      search, 
      categoryId,
      active,
      costMin,
      costMax,
      priceMin,
      priceMax,
      hasImages,
    } = req.query;
    
    const skip = (parseInt(page) - 1) * parseInt(pageSize);
    const take = parseInt(pageSize);
    
    // Build WHERE conditions
    const conditions = [];
    const params = [];
    let paramIndex = 1;
    
    // Active filter
    if (active !== undefined) {
      conditions.push(`active = $${paramIndex++}`);
      params.push(active === 'true');
    }
    
    // Search filter
    if (search) {
      conditions.push(`(code ILIKE $${paramIndex} OR display_name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }
    
    // Cost filter
    if (costMin) {
      conditions.push(`cost >= $${paramIndex++}`);
      params.push(parseFloat(costMin));
    }
    if (costMax) {
      conditions.push(`cost <= $${paramIndex++}`);
      params.push(parseFloat(costMax));
    }
    
    // Price filter
    if (priceMin) {
      conditions.push(`price >= $${paramIndex++}`);
      params.push(parseFloat(priceMin));
    }
    if (priceMax) {
      conditions.push(`price <= $${paramIndex++}`);
      params.push(parseFloat(priceMax));
    }
    
    // Has images filter
    if (hasImages === 'true') {
      conditions.push(`jsonb_array_length(COALESCE(assets, '[]'::jsonb)) > 0`);
    } else if (hasImages === 'false') {
      conditions.push(`jsonb_array_length(COALESCE(assets, '[]'::jsonb)) = 0`);
    }
    
    // Category filter
    if (categoryId) {
      const allCategoryIds = await getAllDescendantCategoryIds(categoryId);
      const categoryConditions = allCategoryIds.map(id => `categories @> '${id}'::jsonb`).join(' OR ');
      conditions.push(`(${categoryConditions})`);
    }
    
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    // Get total count
    const countResult = await pool.query(
      `SELECT COUNT(*) as count FROM raw.st_pricebook_materials ${whereClause}`,
      params
    );
    const totalCount = parseInt(countResult.rows[0]?.count || 0);
    
    // Get materials
    const materialsResult = await pool.query(
      `SELECT * FROM raw.st_pricebook_materials ${whereClause} ORDER BY display_name ASC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      [...params, take, skip]
    );
    const materials = materialsResult.rows;
    
    // Batch resolve images for all materials
    const stIds = materials.map(m => m.st_id);
    const imageMap = await resolveImageUrls('materials', stIds, tenantId);
    
    // Transform to expected format
    const data = materials.map(mat => ({
      id: mat.id,
      stId: mat.st_id.toString(),
      code: mat.code || '',
      name: mat.display_name || '',
      displayName: mat.display_name || '',
      description: mat.description || '',
      cost: parseFloat(mat.cost) || 0,
      price: parseFloat(mat.price) || 0,
      memberPrice: parseFloat(mat.member_price) || 0,
      active: mat.active ?? true,
      taxable: mat.taxable ?? true,
      primaryVendor: mat.primary_vendor || null,
      assets: mat.assets || [],
      image_url: imageMap[mat.st_id] || null,
      defaultAssetUrl: mat.assets?.[0]?.url ? `/images/db/materials/${mat.st_id}` : null,
    }));
    
    res.json({
      data,
      totalCount,
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      hasMore: skip + take < totalCount,
    });
  } catch (error) {
    console.error('Error fetching materials from DB:', error);
    res.status(500).json({ error: 'Failed to fetch materials', message: error.message });
  } finally {
    await pool.end();
  }
});

router.get('/materials', createPricebookListHandler(stEndpoints.materials.list));
router.get('/materials/export', createExportHandler(stEndpoints.materials.export));
router.get('/materials/:id', createPricebookGetHandler(stEndpoints.materials.get));
router.post('/materials', createCreateHandler(stEndpoints.materials.create));
router.patch('/materials/:id', createUpdateHandler(stEndpoints.materials.update, 'PATCH'));
router.delete('/materials/:id', createDeleteHandler(stEndpoints.materials.delete));

// ═══════════════════════════════════════════════════════════════
// MATERIALS MARKUP
// ═══════════════════════════════════════════════════════════════
router.get('/materials-markup', createListHandler(stEndpoints.materialsMarkup.list));
router.get('/materials-markup/:id', createGetHandler(stEndpoints.materialsMarkup.get));
router.post('/materials-markup', createCreateHandler(stEndpoints.materialsMarkup.create));
router.patch('/materials-markup/:id', createUpdateHandler(stEndpoints.materialsMarkup.update, 'PATCH'));
router.delete('/materials-markup/:id', createDeleteHandler(stEndpoints.materialsMarkup.delete));

// ═══════════════════════════════════════════════════════════════
// EQUIPMENT (with defaultAssetUrl)
// ═══════════════════════════════════════════════════════════════
router.get('/equipment', createPricebookListHandler(stEndpoints.equipment.list));
router.get('/equipment/:id', createPricebookGetHandler(stEndpoints.equipment.get));
router.post('/equipment', createCreateHandler(stEndpoints.equipment.create));
router.patch('/equipment/:id', createUpdateHandler(stEndpoints.equipment.update, 'PATCH'));
router.delete('/equipment/:id', createDeleteHandler(stEndpoints.equipment.delete));

// ═══════════════════════════════════════════════════════════════
// CATEGORIES (with defaultAssetUrl)
// ═══════════════════════════════════════════════════════════════
router.get('/categories', createPricebookListHandler(stEndpoints.categories.list));
router.get('/categories/:id', createPricebookGetHandler(stEndpoints.categories.get));
router.post('/categories', createCreateHandler(stEndpoints.categories.create));
router.patch('/categories/:id', createUpdateHandler(stEndpoints.categories.update, 'PATCH'));
router.delete('/categories/:id', createDeleteHandler(stEndpoints.categories.delete));

// ═══════════════════════════════════════════════════════════════
// DISCOUNTS AND FEES
// ═══════════════════════════════════════════════════════════════
router.get('/discounts-and-fees', createListHandler(stEndpoints.discountAndFees.list));
router.get('/discounts-and-fees/:id', createGetHandler(stEndpoints.discountAndFees.get));
router.post('/discounts-and-fees', createCreateHandler(stEndpoints.discountAndFees.create));
router.patch('/discounts-and-fees/:id', createUpdateHandler(stEndpoints.discountAndFees.update, 'PATCH'));
router.delete('/discounts-and-fees/:id', createDeleteHandler(stEndpoints.discountAndFees.delete));

// ═══════════════════════════════════════════════════════════════
// CLIENT SPECIFIC PRICING
// ═══════════════════════════════════════════════════════════════
router.get('/client-specific-pricing', createListHandler(stEndpoints.clientSpecificPricing.list));
router.patch('/client-specific-pricing/:id', createUpdateHandler(stEndpoints.clientSpecificPricing.update, 'PATCH'));

// ═══════════════════════════════════════════════════════════════
// BULK OPERATIONS
// ═══════════════════════════════════════════════════════════════
router.post('/bulk/import', createActionHandler(stEndpoints.pricebookBulk.import));
router.get('/bulk/export', createExportHandler(stEndpoints.pricebookBulk.export));

// ═══════════════════════════════════════════════════════════════
// IMAGES
// ═══════════════════════════════════════════════════════════════
router.post('/images', createActionHandler(stEndpoints.images.upload));

// GET /pricebook/images?path=Images/Service/xxx.jpg
// Proxies the ServiceTitan image endpoint and follows the 302 redirect
router.get('/images', async (req, res) => {
  try {
    const { path: imagePath } = req.query;
    
    if (!imagePath) {
      return res.status(400).json({ error: 'path query parameter is required' });
    }
    
    const tenantId = process.env.SERVICE_TITAN_TENANT_ID;
    const appKey = process.env.SERVICE_TITAN_APP_KEY;
    const accessToken = await getAccessToken();
    
    // Call the ST images endpoint - it returns a 302 redirect
    const url = `https://api.servicetitan.io/pricebook/v2/tenant/${tenantId}/images?path=${encodeURIComponent(imagePath)}`;
    
    // First request to get the redirect URL
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'ST-App-Key': appKey,
      },
      redirect: 'manual', // Don't follow redirect automatically
    });
    
    // Determine content type from file extension
    const ext = imagePath.split('.').pop()?.toLowerCase();
    const contentTypes = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
    };
    const defaultContentType = contentTypes[ext] || 'image/jpeg';
    
    // Handle 302 redirect
    if (response.status === 302) {
      const redirectUrl = response.headers.get('location');
      if (redirectUrl) {
        // Fetch the actual image from the redirect URL
        const imageResponse = await fetch(redirectUrl);
        if (imageResponse.ok) {
          const buffer = Buffer.from(await imageResponse.arrayBuffer());
          const contentType = imageResponse.headers.get('content-type') || defaultContentType;
          res.set('Content-Type', contentType);
          res.set('Cache-Control', 'public, max-age=86400');
          return res.send(buffer);
        }
      }
    }
    
    // If direct response with image data
    if (response.ok) {
      const buffer = Buffer.from(await response.arrayBuffer());
      res.set('Content-Type', defaultContentType);
      res.set('Cache-Control', 'public, max-age=86400');
      return res.send(buffer);
    }
    
    res.status(404).json({ error: 'Image not found', path: imagePath, status: response.status });
  } catch (error) {
    console.error('Image fetch error:', error.message);
    res.status(500).json({ error: 'Failed to fetch image', message: error.message });
  }
});

export default router;
