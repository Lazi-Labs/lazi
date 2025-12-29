/**
 * Pricebook Categories API Routes
 * 
 * REST endpoints for CRM to interact with master.pricebook_categories
 * Can be mounted in Payload CMS or used as standalone Express router
 */

import { Router } from 'express';
import { getPool } from '../db/schema-connection.js';
import { resolveImageUrls } from '../services/imageResolver.js';

// Socket.io event emitters
import {
  emitCategoriesSynced,
  emitCategoryUpdated,
  emitCategoriesPushed,
  emitSyncStarted,
  emitSyncCompleted,
  emitSyncFailed,
} from '../utils/socket-events.js';

// Redis cache utilities
import { getCache, setCache, invalidateCache, cacheKey, CACHE_TTL } from '../utils/cache.js';

// Worker functions will be injected via app.set() or imported dynamically
let queueFullSync = null;
let queueCategorySync = null;

// Set worker functions (called from server initialization)
export function setWorkerFunctions(fullSync, categorySync) {
  queueFullSync = fullSync;
  queueCategorySync = categorySync;
}

const router = Router();

// ============================================================================
// MIDDLEWARE
// ============================================================================

// Extract tenant ID from auth or header
function getTenantId(req) {
  // In production, extract from JWT or session
  // For now, use header or default
  return req.headers['x-tenant-id'] || process.env.DEFAULT_TENANT_ID || '3222348440';
}

// Async handler wrapper
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// ============================================================================
// GET /api/pricebook/categories
// List categories with filtering and pagination
// ============================================================================

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const tenantId = getTenantId(req);
    const {
      type,
      active,
      visible,
      parent,
      search,
      businessUnit,
      page = '1',
      limit = '100',
      sortBy = 'global_sort_order',
      sortOrder = 'asc',
    } = req.query;

    // Try cache first (skip cache if searching)
    if (!search) {
      const cacheKeyStr = cacheKey('categories', tenantId, type || 'all', active || 'all', page, limit);
      const cached = await getCache(cacheKeyStr);
      if (cached) {
        console.log(`[CACHE HIT] ${cacheKeyStr}`);
        return res.json(cached);
      }
    }

    // Build query
    const conditions = ['c.tenant_id = $1', 'c.is_archived = false'];
    const params = [tenantId];
    let paramIndex = 2;

    if (type && ['Materials', 'Services'].includes(type)) {
      conditions.push(`c.category_type = $${paramIndex++}`);
      params.push(type);
    }

    if (active !== undefined) {
      conditions.push(`c.is_active = $${paramIndex++}`);
      params.push(active === 'true');
    }

    if (visible !== undefined) {
      conditions.push(`c.is_visible_crm = $${paramIndex++}`);
      params.push(visible === 'true');
    }

    if (parent === 'null') {
      conditions.push(`c.parent_st_id IS NULL`);
    } else if (parent) {
      conditions.push(`c.parent_st_id = $${paramIndex++}`);
      params.push(parseInt(parent, 10));
    }

    if (search) {
      conditions.push(`(c.name ILIKE $${paramIndex} OR c.display_name ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (businessUnit) {
      conditions.push(`$${paramIndex++} = ANY(c.business_unit_ids)`);
      params.push(parseInt(businessUnit, 10));
    }

    // Validate sort column
    const allowedSortColumns = ['global_sort_order', 'name', 'created_at', 'updated_at', 'sort_order'];
    const safeSort = allowedSortColumns.includes(sortBy) ? sortBy : 'global_sort_order';
    const safeOrder = sortOrder === 'desc' ? 'DESC' : 'ASC';

    // Count total
    const countResult = await getPool().query(
      `SELECT COUNT(*) FROM master.pricebook_categories c WHERE ${conditions.join(' AND ')}`,
      params
    );
    const total = parseInt(countResult.rows[0].count, 10);

    // Fetch page
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(500, Math.max(1, parseInt(limit, 10)));
    const offset = (pageNum - 1) * limitNum;

    params.push(limitNum, offset);

    const result = await getPool().query(
      `
      SELECT 
        c.id,
        c.st_id,
        c.tenant_id,
        -- Merge pending overrides: use override values if they exist
        COALESCE(po.override_name, c.display_name, c.name) AS name,
        c.name AS original_name,
        c.display_name,
        COALESCE(po.override_description, c.description) AS description,
        c.image_url,
        -- Flag if there's a pending image override
        CASE WHEN po.override_image_data IS NOT NULL THEN true ELSE false END AS has_pending_image,
        po.delete_image,
        c.category_type,
        COALESCE(po.override_parent_id, c.parent_st_id) AS parent_st_id,
        c.depth,
        c.path::text AS path,
        COALESCE(po.override_position, c.sort_order) AS sort_order,
        c.global_sort_order,
        c.is_active,
        c.is_visible_crm,
        c.business_unit_ids,
        c.item_count,
        c.subcategory_count,
        c.last_synced_at,
        c.created_at,
        c.updated_at,
        -- Include pending sync status
        COALESCE(po.pending_sync, false) AS has_pending_changes,
        po.override_name,
        po.override_position,
        po.override_parent_id
      FROM master.pricebook_categories c
      LEFT JOIN crm.pricebook_overrides po 
        ON po.st_pricebook_id = c.st_id 
        AND po.item_type = 'category'
      WHERE ${conditions.join(' AND ')}
      ORDER BY COALESCE(po.override_position, c.sort_order) ${safeOrder}, c.st_id ${safeOrder}
      LIMIT $${paramIndex++} OFFSET $${paramIndex}
      `,
      params
    );

    // Batch resolve images for all categories
    const stIds = result.rows.map(c => c.st_id);
    const imageMap = await resolveImageUrls('categories', stIds, tenantId);
    
    // Add resolved image URLs to each category
    const categoriesWithImages = result.rows.map(c => ({
      ...c,
      image_url: imageMap[c.st_id] || null,
    }));

    const response = {
      data: categoriesWithImages,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    };

    // Cache the result (skip if searching)
    if (!search) {
      const cacheKeyStr = cacheKey('categories', tenantId, type || 'all', active || 'all', page, limit);
      await setCache(cacheKeyStr, response, CACHE_TTL.categories);
    }

    res.json(response);
  })
);

// ============================================================================
// GET /api/pricebook/categories/tree
// Get hierarchical tree structure
// ============================================================================

router.get(
  '/tree',
  asyncHandler(async (req, res) => {
    const tenantId = getTenantId(req);
    const { type, includeInactive = 'false' } = req.query;
    const pool = getPool();

    try {
      // Get all top-level categories with overrides applied
      const categoriesQuery = `
        SELECT 
          c.st_id,
          COALESCE(o.override_name, c.name) AS name,
          COALESCE(o.override_display_name, c.display_name) AS display_name,
          COALESCE(o.override_description, c.description) AS description,
          COALESCE(o.override_active, c.is_active) AS active,
          COALESCE(o.override_position, c.sort_order) AS sort_order,
          c.category_type,
          c.depth,
          c.parent_st_id,
          COALESCE(c.s3_image_url, c.image_url) AS image_url,
          c.business_unit_ids,
          c.is_visible_crm,
          o.pending_sync AS has_pending_changes,
          c.last_synced_at,
          c.updated_at
        FROM master.pricebook_categories c
        LEFT JOIN crm.pricebook_overrides o 
          ON o.st_pricebook_id = c.st_id 
          AND o.tenant_id = c.tenant_id
          AND o.item_type = 'category'
        WHERE c.tenant_id = $1
          AND c.parent_st_id IS NULL
          ${type ? 'AND c.category_type = $2' : ''}
          ${includeInactive === 'false' ? 'AND COALESCE(o.override_active, c.is_active) = true' : ''}
        ORDER BY COALESCE(o.override_position, c.sort_order) ASC
      `;

      const categoryParams = type ? [tenantId, type] : [tenantId];
      const categoriesResult = await pool.query(categoriesQuery, categoryParams);

      // Get all subcategories with overrides applied
      const subcatsQuery = `
        SELECT 
          s.st_id,
          s.parent_st_id,
          s.root_category_st_id,
          s.depth,
          s.path,
          COALESCE(o.override_name, s.name) AS name,
          COALESCE(o.override_display_name, s.display_name) AS display_name,
          COALESCE(o.override_description, s.description) AS description,
          COALESCE(o.override_active, s.is_active) AS active,
          COALESCE(o.override_position, s.sort_order) AS sort_order,
          s.category_type,
          COALESCE(s.s3_image_url, s.image_url) AS image_url,
          s.business_unit_ids,
          o.pending_sync AS has_pending_changes
        FROM master.pricebook_subcategories s
        LEFT JOIN crm.pricebook_overrides o 
          ON o.st_pricebook_id = s.st_id 
          AND o.tenant_id = s.tenant_id
          AND o.item_type = 'subcategory'
        WHERE s.tenant_id = $1
          ${includeInactive === 'false' ? 'AND COALESCE(o.override_active, s.is_active) = true' : ''}
        ORDER BY s.depth, COALESCE(o.override_position, s.sort_order)
      `;

      const subcatsResult = await pool.query(subcatsQuery, [tenantId]);

      // Get business units for resolving names
      const busResult = await pool.query(
        `SELECT st_id, name FROM raw.st_business_units WHERE tenant_id = $1`,
        [tenantId]
      );
      
      const businessUnitsMap = new Map(busResult.rows.map(b => [b.st_id.toString(), b.name]));

      // Helper functions
      const parseJson = (value, defaultValue) => {
        if (!value) return defaultValue;
        if (typeof value === 'object') return value;
        if (Array.isArray(value)) return value;
        try {
          return JSON.parse(value);
        } catch {
          return defaultValue;
        }
      };

      const resolveBusinessUnits = (ids) => {
        const parsed = parseJson(ids, []);
        return parsed.map(id => ({
          st_id: id,
          name: businessUnitsMap.get(id.toString()) || `BU ${id}`,
        }));
      };

      const buildSubcategoryTree = (subcats, parentStId, depth) => {
        return subcats
          .filter(s => s.parent_st_id === parentStId && s.depth === depth)
          .map(s => ({
            ...s,
            business_unit_ids: parseJson(s.business_unit_ids, []),
            business_units: resolveBusinessUnits(s.business_unit_ids),
            has_pending_changes: s.has_pending_changes === true,
            subcategories: buildSubcategoryTree(subcats, s.st_id, depth + 1),
          }));
      };

      // Build hierarchy
      const categories = categoriesResult.rows.map(cat => ({
        ...cat,
        business_unit_ids: parseJson(cat.business_unit_ids, []),
        business_units: resolveBusinessUnits(cat.business_unit_ids),
        has_pending_changes: cat.has_pending_changes === true,
        subcategories: buildSubcategoryTree(
          subcatsResult.rows.filter(s => s.root_category_st_id === cat.st_id),
          cat.st_id,
          1
        ),
      }));

      res.json({
        data: categories,
        count: categories.length,
        total_subcategories: subcatsResult.rows.length,
      });
    } catch (error) {
      throw error;
    }
  })
);

// ============================================================================
// ERROR TRACKING & AUTO-FIX (must be before /:stId routes)
// ============================================================================

// In-memory error store (in production, use Redis or database)
const pricebookErrors = new Map();

// Helper to add an error
function addPricebookError(type, error, context = {}) {
  const id = `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const errorEntry = {
    id,
    type, // 'pull' or 'push'
    timestamp: new Date().toISOString(),
    error: typeof error === 'string' ? error : error.message || String(error),
    context,
    status: 'pending',
    autoFixAttempts: 0,
    resolution: null,
  };
  pricebookErrors.set(id, errorEntry);
  
  // Keep only last 100 errors
  if (pricebookErrors.size > 100) {
    const oldest = Array.from(pricebookErrors.keys())[0];
    pricebookErrors.delete(oldest);
  }
  
  return errorEntry;
}

// GET /api/pricebook/categories/errors - List all errors
router.get(
  '/errors',
  asyncHandler(async (req, res) => {
    const errors = Array.from(pricebookErrors.values())
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    res.json({
      errors,
      total: errors.length,
      pullCount: errors.filter(e => e.type === 'pull').length,
      pushCount: errors.filter(e => e.type === 'push').length,
    });
  })
);

// DELETE /api/pricebook/categories/errors - Clear all errors
router.delete(
  '/errors',
  asyncHandler(async (req, res) => {
    const count = pricebookErrors.size;
    pricebookErrors.clear();
    res.json({ success: true, cleared: count });
  })
);

// ============================================================================
// GET /api/pricebook/categories/pending
// Get all pending overrides that haven't been pushed to ST
// MUST be before /:stId routes to avoid being caught by parameterized route
// ============================================================================

router.get(
  '/pending',
  asyncHandler(async (req, res) => {
    // Get category overrides
    const categoryResult = await getPool().query(`
      SELECT 
        po.*,
        mc.st_id,
        mc.name as original_name,
        mc.display_name,
        mc.category_type,
        'category' as type
      FROM crm.pricebook_overrides po
      JOIN master.pricebook_categories mc ON mc.st_id = po.st_pricebook_id
      WHERE po.pending_sync = true
        AND po.item_type = 'category'
      ORDER BY po.updated_at DESC
    `);

    // Get subcategory overrides
    const subcategoryResult = await getPool().query(`
      SELECT 
        po.*,
        ms.st_id,
        ms.name as original_name,
        ms.display_name,
        'subcategory' as type
      FROM crm.pricebook_overrides po
      JOIN master.pricebook_subcategories ms ON ms.st_id = po.st_pricebook_id
      WHERE po.pending_sync = true
        AND po.item_type = 'subcategory'
      ORDER BY po.updated_at DESC
    `);

    res.json({
      data: [...categoryResult.rows, ...subcategoryResult.rows],
      count: categoryResult.rowCount + subcategoryResult.rowCount,
      categories: categoryResult.rowCount,
      subcategories: subcategoryResult.rowCount,
    });
  })
);

// DELETE /api/pricebook/categories/errors/:id - Clear specific error
router.delete(
  '/errors/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const deleted = pricebookErrors.delete(id);
    res.json({ success: deleted, id });
  })
);

// POST /api/pricebook/categories/errors/:id/auto-fix - Attempt auto-fix
router.post(
  '/errors/:id/auto-fix',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const errorEntry = pricebookErrors.get(id);
    
    if (!errorEntry) {
      return res.status(404).json({ error: 'Error not found' });
    }
    
    // Update status
    errorEntry.status = 'fixing';
    errorEntry.autoFixAttempts++;
    
    try {
      // Analyze the error and attempt fix
      const analysis = await analyzeAndFixError(errorEntry);
      
      errorEntry.status = analysis.fixed ? 'fixed' : 'failed';
      errorEntry.resolution = analysis.resolution;
      
      res.json({
        success: analysis.fixed,
        analysis: analysis.analysis,
        resolution: analysis.resolution,
        actions: analysis.actions,
      });
    } catch (err) {
      errorEntry.status = 'failed';
      errorEntry.resolution = `Auto-fix failed: ${err.message}`;
      
      res.status(500).json({
        success: false,
        error: err.message,
      });
    }
  })
);

// ============================================================================
// GET /api/pricebook/categories/:stId
// Get single category with subcategories
// ============================================================================

router.get(
  '/:stId',
  asyncHandler(async (req, res) => {
    const tenantId = getTenantId(req);
    const { stId } = req.params;

    // Get category with pending overrides merged
    const categoryResult = await getPool().query(
      `
      SELECT 
        c.*,
        COALESCE(po.override_name, c.display_name, c.name) AS display_name_computed,
        c.path::text AS path_text,
        COALESCE(po.pending_sync, false) AS has_pending_changes,
        po.override_name,
        po.override_position,
        po.override_parent_id
      FROM master.pricebook_categories c
      LEFT JOIN crm.pricebook_overrides po 
        ON po.st_pricebook_id = c.st_id 
        AND po.item_type = 'category'
      WHERE c.st_id = $1 AND c.tenant_id = $2
      `,
      [stId, tenantId]
    );

    if (categoryResult.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    const category = categoryResult.rows[0];

    // Get ALL subcategories (including nested) and build tree - with CRM overrides merged
    const subcategoriesResult = await getPool().query(
      `
      SELECT 
        ms.st_id, ms.parent_st_id, ms.parent_subcategory_st_id, ms.tenant_id,
        COALESCE(po.override_name, ms.display_name, ms.name) AS name,
        ms.name AS original_name,
        ms.display_name,
        ms.image_url,
        ms.sort_order, 
        ms.is_active, ms.is_visible_crm, ms.item_count, ms.depth, ms.path::text as path,
        ms.last_synced_at, ms.created_at, ms.updated_at,
        COALESCE(po.pending_sync, false) AS has_pending_changes,
        CASE WHEN po.override_image_data IS NOT NULL THEN true ELSE false END AS has_pending_image,
        po.delete_image
      FROM master.pricebook_subcategories ms
      LEFT JOIN crm.pricebook_overrides po 
        ON po.st_pricebook_id = ms.st_id 
        AND po.item_type = 'subcategory'
      WHERE ms.parent_st_id = $1
      ORDER BY ms.depth, ms.sort_order
      `,
      [stId]
    );

    // Get children (if any)
    const childrenResult = await getPool().query(
      `
      SELECT 
        st_id,
        COALESCE(display_name, name) AS name,
        image_url,
        is_active,
        is_visible_crm,
        sort_order,
        item_count
      FROM master.pricebook_categories
      WHERE parent_st_id = $1 AND is_archived = false
      ORDER BY sort_order
      `,
      [stId]
    );

    // Build nested tree from flat subcategories
    const subcategoriesTree = buildSubcategoryTree(subcategoriesResult.rows);

    res.json({
      data: {
        ...category,
        subcategories: subcategoriesTree,
        children: childrenResult.rows,
      },
    });
  })
);

// Helper function to build nested tree from flat subcategories
function buildSubcategoryTree(flatSubcategories) {
  const map = new Map();
  const roots = [];

  // First pass: create map of all subcategories
  for (const sub of flatSubcategories) {
    map.set(sub.st_id.toString(), { ...sub, children: [] });
  }

  // Second pass: build tree structure
  for (const sub of flatSubcategories) {
    const node = map.get(sub.st_id.toString());
    if (sub.parent_subcategory_st_id) {
      const parent = map.get(sub.parent_subcategory_st_id.toString());
      if (parent) {
        parent.children.push(node);
      } else {
        // Parent not found, treat as root
        roots.push(node);
      }
    } else {
      // No parent subcategory, this is a root-level subcategory
      roots.push(node);
    }
  }

  return roots;
}

// ============================================================================
// GET /api/pricebook/categories/:stId/subcategories/tree
// Get all subcategories for a category as a nested tree structure
// ============================================================================

router.get(
  '/:stId/subcategories/tree',
  asyncHandler(async (req, res) => {
    const tenantId = getTenantId(req);
    const { stId } = req.params;

    // Fetch all subcategories for this category, ordered by path for proper nesting
    const result = await getPool().query(`
      SELECT 
        st_id,
        parent_st_id,
        parent_subcategory_st_id,
        name,
        COALESCE(display_name, name) as display_name,
        image_url,
        sort_order,
        is_active,
        is_visible_crm,
        depth,
        path::text as path,
        item_count
      FROM master.pricebook_subcategories
      WHERE parent_st_id = $1 AND tenant_id = $2
      ORDER BY path, sort_order
    `, [stId, tenantId]);

    // Build nested tree from flat results
    const tree = buildSubcategoryTree(result.rows);

    // Get depth statistics
    const depthStats = {};
    for (const row of result.rows) {
      depthStats[row.depth] = (depthStats[row.depth] || 0) + 1;
    }

    res.json({
      success: true,
      data: tree,
      total: result.rows.length,
      depthStats,
    });
  })
);

// ============================================================================
// GET /api/pricebook/categories/:stId/subcategories/flat
// Get all subcategories for a category as a flat list with hierarchy info
// ============================================================================

router.get(
  '/:stId/subcategories/flat',
  asyncHandler(async (req, res) => {
    const tenantId = getTenantId(req);
    const { stId } = req.params;
    const { depth } = req.query;

    let query = `
      SELECT 
        st_id,
        parent_st_id,
        parent_subcategory_st_id,
        name,
        COALESCE(display_name, name) as display_name,
        image_url,
        sort_order,
        is_active,
        is_visible_crm,
        depth,
        path::text as path,
        item_count
      FROM master.pricebook_subcategories
      WHERE parent_st_id = $1 AND tenant_id = $2
    `;
    const params = [stId, tenantId];

    if (depth) {
      query += ` AND depth = $3`;
      params.push(parseInt(depth, 10));
    }

    query += ` ORDER BY depth, path, sort_order`;

    const result = await getPool().query(query, params);

    res.json({
      success: true,
      data: result.rows,
      total: result.rows.length,
    });
  })
);

// ============================================================================
// POST /api/pricebook/categories/:stId/reorder
// Reorder category (drag-and-drop)
// ============================================================================

router.post(
  '/:stId/reorder',
  asyncHandler(async (req, res) => {
    const tenantId = getTenantId(req);
    const { stId } = req.params;
    const { newPosition, newParentStId } = req.body;

    if (typeof newPosition !== 'number') {
      return res.status(400).json({ error: 'newPosition is required and must be a number' });
    }

    // Get current category info for response
    const currentResult = await getPool().query(`
      SELECT st_id, name, sort_order, parent_st_id 
      FROM master.pricebook_categories 
      WHERE st_id = $1
    `, [parseInt(stId, 10)]);

    if (currentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    const current = currentResult.rows[0];
    const oldPosition = current.sort_order;

    // Save to crm.pricebook_overrides for pending sync
    await getPool().query(`
      INSERT INTO crm.pricebook_overrides (
        st_pricebook_id, item_type, override_position, override_parent_id,
        pending_sync, created_at, updated_at
      ) VALUES ($1, 'category', $2, $3, true, NOW(), NOW())
      ON CONFLICT (st_pricebook_id, item_type) 
      DO UPDATE SET
        override_position = EXCLUDED.override_position,
        override_parent_id = EXCLUDED.override_parent_id,
        pending_sync = true,
        updated_at = NOW()
    `, [parseInt(stId, 10), newPosition, newParentStId ?? null]);

    // Also update master table for immediate UI feedback
    await getPool().query(`
      UPDATE master.pricebook_categories
      SET 
        sort_order = $2,
        parent_st_id = COALESCE($3, parent_st_id),
        updated_at = NOW()
      WHERE st_id = $1
    `, [parseInt(stId, 10), newPosition, newParentStId ?? null]);

    // Emit socket event for real-time update
    emitCategoryUpdated(tenantId, {
      stId: parseInt(stId, 10),
      name: current.name,
      changes: ['sort_order', 'position'],
    });

    // Invalidate cache after reorder
    await invalidateCache(`pricebook:${tenantId}:*`);

    res.json({
      success: true,
      stId: parseInt(stId, 10),
      oldPosition,
      newPosition,
      message: 'Category reordered. Use Push To ST to sync changes.',
    });
  })
);

// ============================================================================
// POST /api/pricebook/subcategories/:stId/reorder
// Reorder subcategory (drag-and-drop)
// ============================================================================

router.post(
  '/subcategories/:stId/reorder',
  asyncHandler(async (req, res) => {
    const tenantId = getTenantId(req);
    const { stId } = req.params;
    const { newPosition, newParentSubcategoryStId } = req.body;

    if (typeof newPosition !== 'number') {
      return res.status(400).json({ error: 'newPosition is required and must be a number' });
    }

    // Get current subcategory info
    const currentResult = await getPool().query(`
      SELECT st_id, name, sort_order, parent_st_id, parent_subcategory_st_id, depth
      FROM master.pricebook_subcategories 
      WHERE st_id = $1
    `, [parseInt(stId, 10)]);

    if (currentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Subcategory not found' });
    }

    const current = currentResult.rows[0];
    const oldPosition = current.sort_order;
    const effectiveParentSubcategoryStId = newParentSubcategoryStId !== undefined 
      ? newParentSubcategoryStId 
      : current.parent_subcategory_st_id;

    // Save to crm.pricebook_overrides for pending sync
    await getPool().query(`
      INSERT INTO crm.pricebook_overrides (
        st_pricebook_id, item_type, override_position, override_parent_id,
        pending_sync, created_at, updated_at
      ) VALUES ($1, 'subcategory', $2, $3, true, NOW(), NOW())
      ON CONFLICT (st_pricebook_id, item_type) 
      DO UPDATE SET
        override_position = EXCLUDED.override_position,
        override_parent_id = EXCLUDED.override_parent_id,
        pending_sync = true,
        updated_at = NOW()
    `, [parseInt(stId, 10), newPosition, effectiveParentSubcategoryStId]);

    // Update master table for immediate UI feedback
    await getPool().query(`
      UPDATE master.pricebook_subcategories
      SET 
        sort_order = $2,
        parent_subcategory_st_id = $3,
        updated_at = NOW()
      WHERE st_id = $1
    `, [parseInt(stId, 10), newPosition, effectiveParentSubcategoryStId]);

    // Emit socket event for real-time update
    emitCategoryUpdated(tenantId, {
      stId: parseInt(stId, 10),
      name: current.name,
      changes: ['sort_order', 'position'],
    });

    // Invalidate cache after subcategory reorder
    await invalidateCache(`pricebook:${tenantId}:*`);

    res.json({
      success: true,
      stId: parseInt(stId, 10),
      oldPosition,
      newPosition,
      parentChanged: effectiveParentSubcategoryStId !== current.parent_subcategory_st_id,
      message: 'Subcategory reordered. Use Push To ST to sync changes.',
    });
  })
);

// ============================================================================
// PATCH /api/pricebook/categories/:stId/visibility
// Toggle CRM visibility
// ============================================================================

router.patch(
  '/:stId/visibility',
  asyncHandler(async (req, res) => {
    const { stId } = req.params;
    const { visible, cascade = false } = req.body;

    if (typeof visible !== 'boolean') {
      return res.status(400).json({ error: 'visible must be a boolean' });
    }

    const result = await getPool().query(
      `SELECT master.toggle_category_visibility($1, $2, $3) AS result`,
      [parseInt(stId, 10), visible, cascade]
    );

    res.json({
      success: true,
      data: result.rows[0]?.result,
    });
  })
);

// ============================================================================
// PATCH /api/pricebook/categories/:stId
// Update category (display name, description, etc.)
// ============================================================================

router.patch(
  '/:stId',
  asyncHandler(async (req, res) => {
    const tenantId = getTenantId(req);
    const { stId } = req.params;
    const { displayName, description, isVisibleCrm, isArchived } = req.body;

    const updates = [];
    const params = [parseInt(stId, 10), tenantId];
    let paramIndex = 3;

    if (displayName !== undefined) {
      updates.push(`display_name = $${paramIndex++}`);
      params.push(displayName || null);
    }

    if (description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      params.push(description);
    }

    if (isVisibleCrm !== undefined) {
      updates.push(`is_visible_crm = $${paramIndex++}`);
      params.push(isVisibleCrm);
    }

    if (isArchived !== undefined) {
      updates.push(`is_archived = $${paramIndex++}`);
      params.push(isArchived);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const result = await getPool().query(
      `
      UPDATE master.pricebook_categories
      SET ${updates.join(', ')}, updated_at = NOW()
      WHERE st_id = $1 AND tenant_id = $2
      RETURNING *
      `,
      params
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json({
      success: true,
      data: result.rows[0],
    });
  })
);

// ============================================================================
// GET /api/pricebook/categories/:stId/subcategories
// Get subcategories for a category
// ============================================================================

router.get(
  '/:stId/subcategories',
  asyncHandler(async (req, res) => {
    const { stId } = req.params;
    const { includeInactive = 'false' } = req.query;

    const conditions = ['parent_st_id = $1'];
    if (includeInactive !== 'true') {
      conditions.push('is_active = true');
      conditions.push('is_visible_crm = true');
    }

    const result = await getPool().query(
      `
      SELECT *
      FROM master.pricebook_subcategories
      WHERE ${conditions.join(' AND ')}
      ORDER BY sort_order
      `,
      [stId]
    );

    res.json({
      data: result.rows,
    });
  })
);

// ============================================================================
// POST /api/pricebook/categories/push
// Push local category configuration changes to ServiceTitan
// ============================================================================

router.post(
  '/push',
  asyncHandler(async (req, res) => {
    const tenantId = getTenantId(req);

    console.log('[PUSH] Starting push to ServiceTitan for tenant:', tenantId);

    // Get all pending overrides - detect actual item type by checking both tables
    // This fixes the bug where item_type='category' but st_id is actually a subcategory
    const pendingResult = await getPool().query(`
      SELECT 
        po.*,
        CASE 
          WHEN mc.st_id IS NOT NULL THEN 'category'
          WHEN ms.st_id IS NOT NULL THEN 'subcategory'
          ELSE 'unknown'
        END as actual_item_type,
        COALESCE(mc.name, ms.name) as original_name,
        mc.category_type,
        ms.parent_st_id
      FROM crm.pricebook_overrides po
      LEFT JOIN master.pricebook_categories mc ON mc.st_id = po.st_pricebook_id
      LEFT JOIN master.pricebook_subcategories ms ON ms.st_id = po.st_pricebook_id
      WHERE po.pending_sync = true
    `);

    const pendingOverrides = pendingResult.rows;
    
    console.log('[PUSH] Found', pendingOverrides.length, 'pending overrides');
    
    // Log each pending override for debugging
    for (const po of pendingOverrides) {
      console.log(`[PUSH] Override id=${po.id} st_id=${po.st_pricebook_id} stored_type=${po.item_type} actual_type=${po.actual_item_type} has_image=${!!po.override_image_data}`);
    }

    if (pendingOverrides.length === 0) {
      return res.json({
        success: true,
        message: 'No pending changes to push',
        updated: 0,
        failed: 0,
      });
    }

    const results = {
      updated: 0,
      failed: 0,
      errors: [],
      categories: 0,
      subcategories: 0,
    };

    const accessToken = await getServiceTitanToken();

    // Process each pending override
    for (const override of pendingOverrides) {
      try {
        const stId = override.st_pricebook_id;
        
        // Build update payload from overrides
        const updatePayload = {};
        if (override.override_name) updatePayload.name = override.override_name;
        if (override.override_description) updatePayload.description = override.override_description;
        if (override.override_position !== null) updatePayload.position = override.override_position;

        let stSuccess = true;
        let newImageUrl = null;

        // Handle image upload to ServiceTitan
        if (override.override_image_data) {
          // Upload new image to ServiceTitan using POST /images endpoint
          const formData = new FormData();
          const imageBlob = new Blob([override.override_image_data], { type: override.override_image_mime_type });
          formData.append('file', imageBlob, override.override_image_filename || 'image.jpg');

          const imageResponse = await fetch(
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

          if (imageResponse.ok) {
            const imageResult = await imageResponse.json();
            // The response should contain the new image path/url
            newImageUrl = imageResult.url || imageResult.path || imageResult.imageUrl;
            // Add image to the category update payload
            if (newImageUrl) {
              updatePayload.image = newImageUrl;
            }
          } else {
            const error = await imageResponse.text();
            results.failed++;
            results.errors.push({ stId, error: `Image upload failed: ${error}` });
            stSuccess = false;
          }
        } else if (override.delete_image) {
          // Set image to null/empty to remove it
          updatePayload.image = null;
        }

        // Use actual_item_type (detected from DB) instead of stored item_type (may be wrong)
        const isSubcategory = override.actual_item_type === 'subcategory';
        
        console.log(`[PUSH] Processing st_id=${stId} actual_type=${override.actual_item_type} payload=${JSON.stringify(updatePayload)}`);
        
        // Only call ServiceTitan API for categories (subcategories don't have a direct PATCH endpoint)
        // Subcategory changes are stored locally and displayed from CRM overrides
        if (!isSubcategory && stSuccess && Object.keys(updatePayload).length > 0) {
          const apiEndpoint = `https://api.servicetitan.io/pricebook/v2/tenant/${tenantId}/categories/${stId}`;
          console.log(`[PUSH] Calling ST API: PATCH ${apiEndpoint}`);
          
          const stResponse = await fetch(apiEndpoint, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`,
              'ST-App-Key': process.env.SERVICE_TITAN_APP_KEY,
            },
            body: JSON.stringify(updatePayload),
          });
          
          const responseText = await stResponse.text();
          console.log(`[PUSH] ST Response for ${stId}: status=${stResponse.status} body=${responseText}`);
          
          stSuccess = stResponse.ok;
          if (!stSuccess) {
            results.failed++;
            results.errors.push({ 
              id: override.id,
              stId, 
              type: override.actual_item_type, 
              status: stResponse.status,
              error: responseText 
            });
            
            // Log error for tracking
            addPricebookError('push', `ST API ${stResponse.status}: ${responseText}`, {
              stId,
              itemType: override.actual_item_type,
              operation: 'push_category',
              tenantId,
            });
          }
        } else if (isSubcategory && stSuccess && Object.keys(updatePayload).length > 0) {
          // Subcategories ARE categories in ST - they use the same /categories endpoint with parentId
          // Add parentId to payload to identify it as a subcategory
          updatePayload.parentId = override.parent_st_id;
          
          const apiEndpoint = `https://api.servicetitan.io/pricebook/v2/tenant/${tenantId}/categories/${stId}`;
          console.log(`[PUSH] Calling ST API for subcategory: PATCH ${apiEndpoint}`);
          console.log(`[PUSH] Subcategory payload:`, JSON.stringify(updatePayload));
          
          const stResponse = await fetch(apiEndpoint, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`,
              'ST-App-Key': process.env.SERVICE_TITAN_APP_KEY,
            },
            body: JSON.stringify(updatePayload),
          });
          
          const responseText = await stResponse.text();
          console.log(`[PUSH] ST Response for subcategory ${stId}: status=${stResponse.status} body=${responseText}`);
          
          stSuccess = stResponse.ok;
          if (!stSuccess) {
            results.failed++;
            results.errors.push({ 
              id: override.id,
              stId, 
              type: 'subcategory', 
              status: stResponse.status,
              error: responseText 
            });
            
            addPricebookError('push', `ST API ${stResponse.status}: ${responseText}`, {
              stId,
              itemType: 'subcategory',
              operation: 'push_subcategory',
              tenantId,
            });
          }
        } else if (isSubcategory) {
          console.log(`[PUSH] No payload changes for subcategory ${stId} - skipping ST API call`);
        }

        if (stSuccess) {
          // Update the appropriate master table and crm.pricebook_overrides
          if (isSubcategory) {
            // Clear pending sync and position override after successful ST push
            await getPool().query(`
              UPDATE crm.pricebook_overrides
              SET
                pending_sync = false,
                last_synced_at = NOW(),
                override_image_data = NULL,
                delete_image = false,
                override_position = NULL,
                updated_at = NOW()
              WHERE id = $1
            `, [override.id]);

            // Update master subcategory table with new values
            await getPool().query(`
              UPDATE master.pricebook_subcategories
              SET
                display_name = COALESCE($2, display_name),
                image_url = COALESCE($3, image_url),
                sort_order = COALESCE($4, sort_order),
                updated_at = NOW()
              WHERE st_id = $1
            `, [stId, override.override_name, newImageUrl, override.override_position]);
            results.subcategories++;
          } else {
            // For categories: clear image data and position override after successful ST upload
            // Since ST now has the correct position, we can clear the override
            await getPool().query(`
              UPDATE crm.pricebook_overrides
              SET
                pending_sync = false,
                last_synced_at = NOW(),
                override_image_data = NULL,
                delete_image = false,
                override_position = NULL,
                override_parent_id = NULL,
                updated_at = NOW()
              WHERE id = $1
            `, [override.id]);

            // Update master table with new values
            await getPool().query(`
              UPDATE master.pricebook_categories
              SET
                display_name = COALESCE($2, display_name),
                description = COALESCE($3, description),
                sort_order = COALESCE($4, sort_order),
                image_url = COALESCE($5, image_url),
                updated_at = NOW()
              WHERE st_id = $1
            `, [stId, override.override_name, override.override_description, override.override_position, newImageUrl]);

            // Also update raw table position to match what we pushed to ST
            // This keeps raw in sync without needing a full pull
            if (override.override_position !== null) {
              await getPool().query(`
                UPDATE raw.st_pricebook_categories
                SET position = $2, fetched_at = NOW()
                WHERE st_id = $1
              `, [stId, override.override_position]);
            }

            results.categories++;
          }
          
          results.updated++;
        }
      } catch (err) {
        results.failed++;
        results.errors.push({ stId: override.st_pricebook_id, error: err.message });
        
        // Log error for tracking
        addPricebookError('push', err.message, {
          stId: override.st_pricebook_id,
          itemType: override.item_type,
          operation: 'push_override',
          tenantId,
        });
      }
    }

    // Emit push completed event
    emitCategoriesPushed(tenantId, {
      count: results.updated + results.failed,
      success: results.updated,
      failed: results.failed,
    });

    // Invalidate cache after push
    await invalidateCache(`pricebook:${tenantId}:*`);

    res.json({
      success: results.failed === 0,
      message: `Pushed ${results.updated} changes (${results.categories} categories, ${results.subcategories} subcategories), ${results.failed} failed`,
      ...results,
    });
  })
);

// ============================================================================
// POST /api/pricebook/categories/:stId/override
// Save category override to crm.pricebook_overrides (pending changes)
// ============================================================================

router.post(
  '/:stId/override',
  asyncHandler(async (req, res) => {
    const { stId } = req.params;
    const { name, description, notes } = req.body;

    // Upsert into crm.pricebook_overrides
    const result = await getPool().query(`
      INSERT INTO crm.pricebook_overrides (
        st_pricebook_id, item_type, override_name, override_description, 
        internal_notes, pending_sync, created_at, updated_at
      ) VALUES ($1, 'category', $2, $3, $4, true, NOW(), NOW())
      ON CONFLICT (st_pricebook_id, item_type) 
      DO UPDATE SET
        override_name = COALESCE(EXCLUDED.override_name, crm.pricebook_overrides.override_name),
        override_description = COALESCE(EXCLUDED.override_description, crm.pricebook_overrides.override_description),
        internal_notes = COALESCE(EXCLUDED.internal_notes, crm.pricebook_overrides.internal_notes),
        pending_sync = true,
        updated_at = NOW()
      RETURNING *
    `, [stId, name || null, description || null, notes || null]);

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Override saved. Use Push To ST to sync changes.',
    });
  })
);

// ============================================================================
// POST /api/pricebook/categories/:stId/image
// Upload/update category image override
// ============================================================================

router.post(
  '/:stId/image',
  asyncHandler(async (req, res) => {
    const { stId } = req.params;
    const { imageData, mimeType, filename, deleteImage } = req.body;

    if (deleteImage) {
      // Mark image for deletion
      const result = await getPool().query(`
        INSERT INTO crm.pricebook_overrides (
          st_pricebook_id, item_type, delete_image, pending_sync, created_at, updated_at
        ) VALUES ($1, 'category', true, true, NOW(), NOW())
        ON CONFLICT (st_pricebook_id, item_type) 
        DO UPDATE SET
          delete_image = true,
          override_image_data = NULL,
          override_image_mime_type = NULL,
          override_image_filename = NULL,
          pending_sync = true,
          updated_at = NOW()
        RETURNING *
      `, [stId]);

      return res.json({
        success: true,
        data: result.rows[0],
        message: 'Image marked for deletion. Use Push To ST to sync changes.',
      });
    }

    if (!imageData || !mimeType) {
      return res.status(400).json({ error: 'imageData and mimeType are required' });
    }

    // Decode base64 image data
    const imageBuffer = Buffer.from(imageData, 'base64');

    // Upsert into crm.pricebook_overrides
    const result = await getPool().query(`
      INSERT INTO crm.pricebook_overrides (
        st_pricebook_id, item_type, override_image_data, override_image_mime_type,
        override_image_filename, delete_image, pending_sync, created_at, updated_at
      ) VALUES ($1, 'category', $2, $3, $4, false, true, NOW(), NOW())
      ON CONFLICT (st_pricebook_id, item_type) 
      DO UPDATE SET
        override_image_data = EXCLUDED.override_image_data,
        override_image_mime_type = EXCLUDED.override_image_mime_type,
        override_image_filename = EXCLUDED.override_image_filename,
        delete_image = false,
        pending_sync = true,
        updated_at = NOW()
      RETURNING id, st_pricebook_id, item_type, override_image_filename, pending_sync
    `, [stId, imageBuffer, mimeType, filename || 'image.jpg']);

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Image saved. Use Push To ST to sync changes.',
    });
  })
);

// ============================================================================
// GET /api/pricebook/categories/:stId/image/preview
// Get the pending image override (for preview before push)
// ============================================================================

router.get(
  '/:stId/image/preview',
  asyncHandler(async (req, res) => {
    const { stId } = req.params;

    const result = await getPool().query(`
      SELECT override_image_data, override_image_mime_type, override_image_filename, delete_image
      FROM crm.pricebook_overrides
      WHERE st_pricebook_id = $1 AND item_type = 'category'
    `, [stId]);

    if (result.rows.length === 0 || !result.rows[0].override_image_data) {
      return res.status(404).json({ error: 'No pending image override found' });
    }

    const { override_image_data, override_image_mime_type } = result.rows[0];
    
    res.set('Content-Type', override_image_mime_type);
    res.set('Cache-Control', 'no-cache');
    res.send(override_image_data);
  })
);

// ============================================================================
// SUBCATEGORY ENDPOINTS
// ============================================================================

// POST /api/pricebook/categories/subcategories/:stId/override
// Save subcategory override to crm.pricebook_overrides
router.post(
  '/subcategories/:stId/override',
  asyncHandler(async (req, res) => {
    const { stId } = req.params;
    const { name, description, notes } = req.body;

    const result = await getPool().query(`
      INSERT INTO crm.pricebook_overrides (
        st_pricebook_id, item_type, override_name, override_description, 
        internal_notes, pending_sync, created_at, updated_at
      ) VALUES ($1, 'subcategory', $2, $3, $4, true, NOW(), NOW())
      ON CONFLICT (st_pricebook_id, item_type) 
      DO UPDATE SET
        override_name = COALESCE(EXCLUDED.override_name, crm.pricebook_overrides.override_name),
        override_description = COALESCE(EXCLUDED.override_description, crm.pricebook_overrides.override_description),
        internal_notes = COALESCE(EXCLUDED.internal_notes, crm.pricebook_overrides.internal_notes),
        pending_sync = true,
        updated_at = NOW()
      RETURNING *
    `, [stId, name || null, description || null, notes || null]);

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Subcategory override saved. Use Push To ST to sync changes.',
    });
  })
);

// POST /api/pricebook/categories/subcategories/:stId/image
// Upload/update subcategory image override
router.post(
  '/subcategories/:stId/image',
  asyncHandler(async (req, res) => {
    const { stId } = req.params;
    const { imageData, mimeType, filename, deleteImage } = req.body;

    if (deleteImage) {
      const result = await getPool().query(`
        INSERT INTO crm.pricebook_overrides (
          st_pricebook_id, item_type, delete_image, pending_sync, created_at, updated_at
        ) VALUES ($1, 'subcategory', true, true, NOW(), NOW())
        ON CONFLICT (st_pricebook_id, item_type) 
        DO UPDATE SET
          delete_image = true,
          override_image_data = NULL,
          override_image_mime_type = NULL,
          override_image_filename = NULL,
          pending_sync = true,
          updated_at = NOW()
        RETURNING *
      `, [stId]);

      return res.json({
        success: true,
        data: result.rows[0],
        message: 'Subcategory image marked for deletion.',
      });
    }

    if (!imageData || !mimeType) {
      return res.status(400).json({ error: 'imageData and mimeType are required' });
    }

    const imageBuffer = Buffer.from(imageData, 'base64');

    const result = await getPool().query(`
      INSERT INTO crm.pricebook_overrides (
        st_pricebook_id, item_type, override_image_data, override_image_mime_type,
        override_image_filename, delete_image, pending_sync, created_at, updated_at
      ) VALUES ($1, 'subcategory', $2, $3, $4, false, true, NOW(), NOW())
      ON CONFLICT (st_pricebook_id, item_type) 
      DO UPDATE SET
        override_image_data = EXCLUDED.override_image_data,
        override_image_mime_type = EXCLUDED.override_image_mime_type,
        override_image_filename = EXCLUDED.override_image_filename,
        delete_image = false,
        pending_sync = true,
        updated_at = NOW()
      RETURNING id, st_pricebook_id, item_type, override_image_filename, pending_sync
    `, [stId, imageBuffer, mimeType, filename || 'image.jpg']);

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Subcategory image saved. Use Push To ST to sync changes.',
    });
  })
);

// GET /api/pricebook/categories/subcategories/:stId/image/preview
router.get(
  '/subcategories/:stId/image/preview',
  asyncHandler(async (req, res) => {
    const { stId } = req.params;

    const result = await getPool().query(`
      SELECT override_image_data, override_image_mime_type, delete_image
      FROM crm.pricebook_overrides
      WHERE st_pricebook_id = $1 AND item_type = 'subcategory'
    `, [stId]);

    if (result.rows.length === 0 || !result.rows[0].override_image_data) {
      return res.status(404).json({ error: 'No pending image override found' });
    }

    const { override_image_data, override_image_mime_type } = result.rows[0];
    
    res.set('Content-Type', override_image_mime_type);
    res.set('Cache-Control', 'no-cache');
    res.send(override_image_data);
  })
);

// Helper function to get ServiceTitan access token
async function getServiceTitanToken() {
  const response = await fetch('https://auth.servicetitan.io/connect/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: process.env.SERVICE_TITAN_CLIENT_ID,
      client_secret: process.env.SERVICE_TITAN_CLIENT_SECRET,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to get ServiceTitan access token');
  }

  const data = await response.json();
  return data.access_token;
}

// ============================================================================
// POST /api/pricebook/categories/sync
// Pull from ServiceTitan API → raw.* → master.*
// This is the FULL sync that actually fetches fresh data from ST
// ============================================================================

router.post(
  '/sync',
  asyncHandler(async (req, res) => {
    const tenantId = getTenantId(req);
    const { categoryType, stId, incremental = false } = req.body;

    console.log('[PULL] Starting sync from ServiceTitan for tenant:', tenantId);
    const startTime = Date.now();

    // Emit sync started event
    emitSyncStarted(tenantId, 'pricebook-categories');

    try {
      // Step 1: Get last sync timestamp for incremental sync
      let modifiedAfter = null;
      if (incremental) {
        const lastSync = await getPool().query(`
          SELECT MAX(fetched_at) as last_fetch 
          FROM raw.st_pricebook_categories 
          WHERE tenant_id = $1
        `, [tenantId]);
        modifiedAfter = lastSync.rows[0]?.last_fetch;
        console.log('[PULL] Incremental sync, last fetch:', modifiedAfter);
      }

      // Step 2: Fetch categories from ServiceTitan API
      const accessToken = await getServiceTitanToken();
      const stCategories = await fetchCategoriesFromST(tenantId, accessToken, modifiedAfter);
      console.log(`[PULL] Fetched ${stCategories.length} categories from ServiceTitan`);

      // Step 3: Upsert to raw.st_pricebook_categories
      let upsertedCount = 0;
      for (const cat of stCategories) {
        await getPool().query(`
          INSERT INTO raw.st_pricebook_categories (
            st_id, tenant_id, name, active, description, image, 
            parent_id, position, category_type, subcategories, 
            business_unit_ids, fetched_at, full_data
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), $12)
          ON CONFLICT (st_id) DO UPDATE SET
            name = EXCLUDED.name,
            active = EXCLUDED.active,
            description = EXCLUDED.description,
            image = EXCLUDED.image,
            parent_id = EXCLUDED.parent_id,
            position = EXCLUDED.position,
            category_type = EXCLUDED.category_type,
            subcategories = EXCLUDED.subcategories,
            business_unit_ids = EXCLUDED.business_unit_ids,
            fetched_at = NOW(),
            full_data = EXCLUDED.full_data
        `, [
          cat.id,
          tenantId,
          cat.name,
          cat.active ?? true,
          cat.description,
          cat.image,
          cat.parentId,
          cat.position,
          cat.categoryType,
          JSON.stringify(cat.subcategories || []),
          cat.businessUnitIds || [],
          cat,
        ]);
        upsertedCount++;
      }
      console.log(`[PULL] Upserted ${upsertedCount} categories to raw table`);

      // Step 4: Queue raw→master sync (BullMQ job)
      const duration = Date.now() - startTime;
      
      // Emit sync completed events
      emitCategoriesSynced(tenantId, {
        count: stCategories.length,
        type: categoryType || 'all',
        incremental: incremental && !!modifiedAfter,
      });
      emitSyncCompleted(tenantId, {
        entity: 'pricebook-categories',
        fetched: stCategories.length,
        duration,
      });

      // Invalidate cache after sync
      await invalidateCache(`pricebook:${tenantId}:*`);

      // CRITICAL: Ensure sort_order matches raw.position immediately
      // This is a fallback in case the BullMQ worker hasn't processed yet
      const sortSyncResult = await getPool().query(`
        UPDATE master.pricebook_categories m
        SET sort_order = r.position, updated_at = NOW()
        FROM raw.st_pricebook_categories r
        WHERE m.st_id = r.st_id 
          AND m.tenant_id = r.tenant_id::text
          AND (m.sort_order IS NULL OR m.sort_order != r.position)
      `);
      console.log(`[SYNC] Sort order synced from raw.position: ${sortSyncResult.rowCount} rows updated`);
      
      if (queueFullSync) {
        const job = await queueFullSync(tenantId, categoryType);
        console.log(`[PULL] Queued raw→master sync job: ${job.id}`);
        
        return res.json({
          success: true,
          fetched: stCategories.length,
          upserted: upsertedCount,
          incremental: incremental && !!modifiedAfter,
          jobId: job.id,
          message: `Fetched ${stCategories.length} categories from ServiceTitan, sync job queued`,
        });
      } else {
        return res.json({
          success: true,
          fetched: stCategories.length,
          upserted: upsertedCount,
          incremental: incremental && !!modifiedAfter,
          message: `Fetched ${stCategories.length} categories from ServiceTitan (worker not available for raw→master sync)`,
        });
      }
    } catch (error) {
      console.error('[PULL] Error:', error);
      
      // Emit sync failed event
      emitSyncFailed(tenantId, {
        entity: 'pricebook-categories',
        error: error.message,
      });
      
      // Log error for tracking
      addPricebookError('pull', error.message, {
        tenantId,
        operation: 'sync_from_st',
      });
      
      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  })
);

// Helper function to fetch all categories from ServiceTitan API with pagination
async function fetchCategoriesFromST(tenantId, accessToken, modifiedAfter = null) {
  let url = `https://api.servicetitan.io/pricebook/v2/tenant/${tenantId}/categories?pageSize=200`;
  if (modifiedAfter) {
    url += `&modifiedOnOrAfter=${new Date(modifiedAfter).toISOString()}`;
  }

  const allCategories = [];
  let hasMore = true;
  let page = 1;
  let continuationToken = null;

  while (hasMore) {
    let pageUrl = url;
    if (continuationToken) {
      pageUrl += `&continuationToken=${encodeURIComponent(continuationToken)}`;
    }
    
    console.log(`[PULL] Fetching page ${page} from ST API`);
    
    const response = await fetch(pageUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'ST-App-Key': process.env.SERVICE_TITAN_APP_KEY,
      },
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`ST API error: ${response.status} - ${err}`);
    }

    const data = await response.json();
    allCategories.push(...(data.data || []));

    hasMore = data.hasMore || false;
    continuationToken = data.continuationToken || null;
    page++;
    
    // Safety limit
    if (page > 50) {
      console.warn('[PULL] Hit page limit, stopping pagination');
      break;
    }
  }

  return allCategories;
}

// Legacy endpoint for single category sync (kept for backwards compatibility)
router.post(
  '/sync-legacy',
  asyncHandler(async (req, res) => {
    const tenantId = getTenantId(req);
    const { categoryType, stId } = req.body;

    if (!queueFullSync || !queueCategorySync) {
      return res.status(503).json({
        success: false,
        error: 'Pricebook sync worker not initialized. Check REDIS_URL configuration.',
      });
    }

    if (stId) {
      // Single category sync
      const job = await queueCategorySync(parseInt(stId, 10), tenantId);
      return res.json({
        success: true,
        message: 'Single category sync queued',
        jobId: job.id,
      });
    }

    // Full sync
    const job = await queueFullSync(tenantId, categoryType);
    res.json({
      success: true,
      message: 'Full sync queued',
      jobId: job.id,
    });
  })
);

// ============================================================================
// POST /api/pricebook/categories/:stId/pull
// Pull a single category/subcategory directly from ServiceTitan API
// This fetches fresh data from ST, updates raw, then syncs to master
// ============================================================================

router.post(
  '/:stId/pull',
  asyncHandler(async (req, res) => {
    const tenantId = getTenantId(req);
    const { stId } = req.params;
    const { isSubcategory = false, parentStId } = req.body;

    try {
      const accessToken = await getServiceTitanToken();

      // Fetch the category from ServiceTitan
      const stResponse = await fetch(
        `https://api.servicetitan.io/pricebook/v2/tenant/${tenantId}/categories/${stId}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'ST-App-Key': process.env.SERVICE_TITAN_APP_KEY,
          },
        }
      );

      if (!stResponse.ok) {
        const error = await stResponse.text();
        return res.status(stResponse.status).json({ 
          success: false, 
          error: `ServiceTitan API error: ${error}` 
        });
      }

      const categoryData = await stResponse.json();

      // Update raw table
      await getPool().query(`
        INSERT INTO raw.st_pricebook_categories (
          st_id, tenant_id, name, active, description, image, 
          parent_id, position, category_type, subcategories, 
          business_unit_ids, fetched_at, full_data
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), $12)
        ON CONFLICT (st_id) DO UPDATE SET
          name = EXCLUDED.name,
          active = EXCLUDED.active,
          description = EXCLUDED.description,
          image = EXCLUDED.image,
          parent_id = EXCLUDED.parent_id,
          position = EXCLUDED.position,
          category_type = EXCLUDED.category_type,
          subcategories = EXCLUDED.subcategories,
          business_unit_ids = EXCLUDED.business_unit_ids,
          fetched_at = NOW(),
          full_data = EXCLUDED.full_data
      `, [
        categoryData.id,
        tenantId,
        categoryData.name,
        categoryData.active ?? true,
        categoryData.description,
        categoryData.image,
        categoryData.parentId,
        categoryData.position,
        categoryData.categoryType,
        JSON.stringify(categoryData.subcategories || []),
        categoryData.businessUnitIds || [],
        categoryData,
      ]);

      // Update master table
      if (isSubcategory && parentStId) {
        // Update subcategory
        await getPool().query(`
          UPDATE master.pricebook_subcategories
          SET 
            name = $2,
            image_url = $3,
            sort_order = $4,
            is_active = $5,
            last_synced_at = NOW(),
            updated_at = NOW()
          WHERE st_id = $1
        `, [
          categoryData.id,
          categoryData.name,
          categoryData.image,
          categoryData.position || 0,
          categoryData.active ?? true,
        ]);
      } else {
        // Update category
        await getPool().query(`
          UPDATE master.pricebook_categories
          SET 
            name = $2,
            description = $3,
            image_url = $4,
            sort_order = $5,
            is_active = $6,
            last_synced_at = NOW(),
            updated_at = NOW()
          WHERE st_id = $1
        `, [
          categoryData.id,
          categoryData.name,
          categoryData.description,
          categoryData.image,
          categoryData.position || 0,
          categoryData.active ?? true,
        ]);
      }

      // Also sync subcategories if present - fetch each one individually to get images
      let subcategoriesSynced = 0;
      if (categoryData.subcategories && categoryData.subcategories.length > 0) {
        for (const sub of categoryData.subcategories) {
          // Fetch subcategory directly from ST to get its image (bulk fetch returns null for subcategory images)
          try {
            const subResponse = await fetch(
              `https://api.servicetitan.io/pricebook/v2/tenant/${tenantId}/categories/${sub.id}`,
              {
                headers: {
                  'Authorization': `Bearer ${accessToken}`,
                  'ST-App-Key': process.env.SERVICE_TITAN_APP_KEY,
                },
              }
            );
            
            if (subResponse.ok) {
              const subData = await subResponse.json();
              // Use the directly fetched data which includes the correct image
              await syncSubcategoryRecursive(subData, categoryData.id, tenantId, null);
              subcategoriesSynced++;
              
              // Recursively fetch nested subcategories
              if (subData.subcategories && subData.subcategories.length > 0) {
                for (const nested of subData.subcategories) {
                  await fetchAndSyncSubcategory(nested.id, categoryData.id, tenantId, subData.id, accessToken, 2);
                }
              }
            } else {
              // Fallback to bulk data if individual fetch fails
              await syncSubcategoryRecursive(sub, categoryData.id, tenantId, null);
              subcategoriesSynced++;
            }
          } catch (subErr) {
            console.error(`Failed to fetch subcategory ${sub.id}:`, subErr.message);
            // Fallback to bulk data
            await syncSubcategoryRecursive(sub, categoryData.id, tenantId, null);
            subcategoriesSynced++;
          }
        }
      }

      res.json({
        success: true,
        message: `Pulled ${isSubcategory ? 'subcategory' : 'category'} ${stId} from ServiceTitan`,
        data: {
          stId: categoryData.id,
          name: categoryData.name,
          image: categoryData.image,
          subcategoriesCount: subcategoriesSynced,
        },
      });

    } catch (error) {
      console.error('Pull from ST failed:', error);
      
      // Log error for tracking
      addPricebookError('pull', error.message, {
        stId,
        isSubcategory,
        parentStId,
        tenantId,
        operation: 'pull_category',
      });
      
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  })
);

// Helper to fetch and sync a subcategory individually from ServiceTitan
async function fetchAndSyncSubcategory(subId, parentCategoryStId, tenantId, parentSubcategoryStId, accessToken, depth = 1) {
  try {
    const response = await fetch(
      `https://api.servicetitan.io/pricebook/v2/tenant/${tenantId}/categories/${subId}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'ST-App-Key': process.env.SERVICE_TITAN_APP_KEY,
        },
      }
    );
    
    if (response.ok) {
      const subData = await response.json();
      await syncSubcategoryRecursive(subData, parentCategoryStId, tenantId, parentSubcategoryStId, depth);
      
      // Recursively fetch nested subcategories
      if (subData.subcategories && subData.subcategories.length > 0) {
        for (const nested of subData.subcategories) {
          await fetchAndSyncSubcategory(nested.id, parentCategoryStId, tenantId, subData.id, accessToken, depth + 1);
        }
      }
    }
  } catch (err) {
    console.error(`Failed to fetch subcategory ${subId}:`, err.message);
  }
}

// Helper to recursively sync subcategories
async function syncSubcategoryRecursive(sub, parentCategoryStId, tenantId, parentSubcategoryStId, depth = 1) {
  // Upsert this subcategory
  await getPool().query(`
    INSERT INTO master.pricebook_subcategories (
      st_id, parent_st_id, parent_subcategory_st_id, tenant_id, 
      name, image_url, sort_order, is_active, depth, last_synced_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
    ON CONFLICT (st_id) DO UPDATE SET
      name = EXCLUDED.name,
      image_url = EXCLUDED.image_url,
      sort_order = EXCLUDED.sort_order,
      is_active = EXCLUDED.is_active,
      depth = EXCLUDED.depth,
      parent_subcategory_st_id = EXCLUDED.parent_subcategory_st_id,
      last_synced_at = NOW(),
      updated_at = NOW()
  `, [
    sub.id,
    parentCategoryStId,
    parentSubcategoryStId,
    tenantId,
    sub.name,
    sub.image,
    sub.position || 0,
    sub.active ?? true,
    depth,
  ]);

  // Recurse into nested subcategories
  if (sub.subcategories && sub.subcategories.length > 0) {
    for (const nested of sub.subcategories) {
      await syncSubcategoryRecursive(nested, parentCategoryStId, tenantId, sub.id, depth + 1);
    }
  }
}

// ============================================================================
// GET /api/pricebook/categories/stats
// Get category statistics
// ============================================================================

router.get(
  '/stats/summary',
  asyncHandler(async (req, res) => {
    const tenantId = getTenantId(req);

    const result = await getPool().query(
      `
      SELECT 
        category_type,
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE is_active) AS active,
        COUNT(*) FILTER (WHERE NOT is_active) AS inactive,
        COUNT(*) FILTER (WHERE is_visible_crm) AS visible,
        COUNT(*) FILTER (WHERE NOT is_visible_crm) AS hidden,
        SUM(item_count) AS total_items,
        SUM(subcategory_count) AS total_subcategories,
        MAX(last_synced_at) AS last_synced
      FROM master.pricebook_categories
      WHERE tenant_id = $1 AND is_archived = false
      GROUP BY category_type
      `,
      [tenantId]
    );

    // Also get subcategory stats
    const subResult = await getPool().query(
      `
      SELECT 
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE is_active) AS active
      FROM master.pricebook_subcategories
      WHERE tenant_id = $1
      `,
      [tenantId]
    );

    res.json({
      data: {
        byType: result.rows,
        subcategories: subResult.rows[0],
      },
    });
  })
);

// ============================================================================
// POST /api/pricebook/categories/bulk-visibility
// Bulk update visibility
// ============================================================================

router.post(
  '/bulk-visibility',
  asyncHandler(async (req, res) => {
    const tenantId = getTenantId(req);
    const { stIds, visible } = req.body;

    if (!Array.isArray(stIds) || stIds.length === 0) {
      return res.status(400).json({ error: 'stIds must be a non-empty array' });
    }

    if (typeof visible !== 'boolean') {
      return res.status(400).json({ error: 'visible must be a boolean' });
    }

    const result = await getPool().query(
      `
      UPDATE master.pricebook_categories
      SET is_visible_crm = $1, updated_at = NOW()
      WHERE st_id = ANY($2::bigint[]) AND tenant_id = $3
      RETURNING st_id
      `,
      [visible, stIds, tenantId]
    );

    res.json({
      success: true,
      updatedCount: result.rowCount,
      updatedIds: result.rows.map((r) => r.st_id),
    });
  })
);

// Auto-fix analysis function
async function analyzeAndFixError(errorEntry) {
  const { type, error, context } = errorEntry;
  
  let analysis = '';
  let resolution = '';
  let fixed = false;
  const actions = [];
  
  // Analyze common error patterns
  if (error.includes('Image not found') || error.includes('404')) {
    analysis = 'Image resource not found on ServiceTitan. This could be because:\n' +
      '1. The image was deleted from ServiceTitan\n' +
      '2. The image path is incorrect\n' +
      '3. The image hasn\'t been uploaded yet';
    
    if (context.stId) {
      // Try to refresh the category data
      try {
        const tenantId = context.tenantId || process.env.DEFAULT_TENANT_ID;
        const accessToken = await getServiceTitanToken();
        
        const stResponse = await fetch(
          `https://api.servicetitan.io/pricebook/v2/tenant/${tenantId}/categories/${context.stId}`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'ST-App-Key': process.env.SERVICE_TITAN_APP_KEY,
            },
          }
        );
        
        if (stResponse.ok) {
          const data = await stResponse.json();
          resolution = `Refreshed category data. Current image: ${data.image || 'none'}`;
          actions.push({ action: 'refresh', stId: context.stId, newImage: data.image });
          fixed = true;
        } else {
          resolution = 'Could not refresh category from ServiceTitan';
        }
      } catch (e) {
        resolution = `Refresh failed: ${e.message}`;
      }
    }
  } else if (error.includes('pending_sync') || error.includes('No pending changes')) {
    analysis = 'No pending changes found. This could mean:\n' +
      '1. Changes were already pushed\n' +
      '2. The item_type in crm.pricebook_overrides is incorrect\n' +
      '3. The st_pricebook_id doesn\'t match any category/subcategory';
    
    // Check the overrides table
    try {
      const result = await getPool().query(`
        SELECT po.*, 
          CASE WHEN mc.st_id IS NOT NULL THEN 'category' 
               WHEN ms.st_id IS NOT NULL THEN 'subcategory' 
               ELSE 'unknown' END as actual_type
        FROM crm.pricebook_overrides po
        LEFT JOIN master.pricebook_categories mc ON mc.st_id = po.st_pricebook_id
        LEFT JOIN master.pricebook_subcategories ms ON ms.st_id = po.st_pricebook_id
        WHERE po.pending_sync = true
        LIMIT 10
      `);
      
      if (result.rows.length > 0) {
        const mismatches = result.rows.filter(r => r.item_type !== r.actual_type && r.actual_type !== 'unknown');
        if (mismatches.length > 0) {
          // Fix the item_type mismatches
          for (const row of mismatches) {
            await getPool().query(`
              UPDATE crm.pricebook_overrides 
              SET item_type = $1 
              WHERE id = $2
            `, [row.actual_type, row.id]);
            actions.push({ action: 'fix_item_type', id: row.id, from: row.item_type, to: row.actual_type });
          }
          resolution = `Fixed ${mismatches.length} item_type mismatches`;
          fixed = true;
        } else {
          resolution = `Found ${result.rows.length} pending overrides, no type mismatches detected`;
        }
      } else {
        resolution = 'No pending overrides found in database';
      }
    } catch (e) {
      resolution = `Database check failed: ${e.message}`;
    }
  } else if (error.includes('PATCH') || error.includes('API error')) {
    analysis = 'ServiceTitan API call failed. Common causes:\n' +
      '1. Invalid or expired access token\n' +
      '2. Category/subcategory doesn\'t exist in ServiceTitan\n' +
      '3. Invalid payload format\n' +
      '4. Rate limiting';
    
    resolution = 'Recommend retrying the push operation after verifying the item exists in ServiceTitan';
  } else if (error.includes('subcategory') && error.includes('image')) {
    analysis = 'Subcategory image issue. Note: ServiceTitan does not support direct subcategory image updates via API.\n' +
      'Subcategory images are stored locally in crm.pricebook_overrides.';
    
    resolution = 'Subcategory images are handled locally. Check if override_image_data exists in crm.pricebook_overrides.';
  } else {
    analysis = `Unknown error type. Error message: ${error}\n\nContext: ${JSON.stringify(context, null, 2)}`;
    resolution = 'Manual investigation required. Check server logs for more details.';
  }
  
  return { analysis, resolution, fixed, actions };
}

// ============================================================================
// CRM OVERRIDE WORKFLOW
// ============================================================================

/**
 * POST /api/pricebook/categories/:stId/override
 * Create or update a local override (doesn't push to ST yet)
 */
router.post(
  '/:stId/override',
  asyncHandler(async (req, res) => {
    const { stId } = req.params;
    const tenantId = getTenantId(req);
    const {
      name,
      displayName,
      description,
      position,
      parentId,
      active,
      businessUnitIds,
      imageUrl,
    } = req.body;

    const pool = getPool();

    try {
      // Determine item type (category or subcategory)
      const catCheck = await pool.query(
        'SELECT 1 FROM master.pricebook_categories WHERE st_id = $1 AND tenant_id = $2',
        [stId, tenantId]
      );
      const itemType = catCheck.rows.length > 0 ? 'category' : 'subcategory';

      // Upsert override
      const result = await pool.query(`
        INSERT INTO crm.pricebook_overrides (
          st_pricebook_id, tenant_id, item_type,
          override_name, override_display_name, override_description, 
          override_position, override_parent_id, override_active, 
          override_business_unit_ids, override_image_url,
          pending_sync, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true, NOW())
        ON CONFLICT (st_pricebook_id, tenant_id, item_type) DO UPDATE SET
          override_name = COALESCE($4, crm.pricebook_overrides.override_name),
          override_display_name = COALESCE($5, crm.pricebook_overrides.override_display_name),
          override_description = COALESCE($6, crm.pricebook_overrides.override_description),
          override_position = COALESCE($7, crm.pricebook_overrides.override_position),
          override_parent_id = COALESCE($8, crm.pricebook_overrides.override_parent_id),
          override_active = COALESCE($9, crm.pricebook_overrides.override_active),
          override_business_unit_ids = COALESCE($10, crm.pricebook_overrides.override_business_unit_ids),
          override_image_url = COALESCE($11, crm.pricebook_overrides.override_image_url),
          pending_sync = true,
          updated_at = NOW()
        RETURNING *
      `, [
        stId,
        tenantId,
        itemType,
        name || null,
        displayName || null,
        description || null,
        position || null,
        parentId || null,
        active !== undefined ? active : null,
        businessUnitIds ? JSON.stringify(businessUnitIds) : null,
        imageUrl || null,
      ]);

      // Invalidate cache
      await invalidateCache(`categories:${tenantId}:*`);

      res.json({
        success: true,
        override: result.rows[0],
        message: 'Override saved. Use /push to sync to ServiceTitan.',
      });
    } catch (error) {
      throw error;
    }
  })
);

/**
 * POST /api/pricebook/categories/push
 * Push all pending overrides to ServiceTitan
 */
router.post(
  '/push',
  asyncHandler(async (req, res) => {
    const tenantId = getTenantId(req);
    const pool = getPool();

    try {
      // Get all pending overrides
      const pending = await pool.query(`
        SELECT o.*, 
               COALESCE(c.name, s.name) as original_name,
               COALESCE(c.category_type, s.category_type) as category_type
        FROM crm.pricebook_overrides o
        LEFT JOIN master.pricebook_categories c 
          ON c.st_id = o.st_pricebook_id AND c.tenant_id = o.tenant_id AND o.item_type = 'category'
        LEFT JOIN master.pricebook_subcategories s
          ON s.st_id = o.st_pricebook_id AND s.tenant_id = o.tenant_id AND o.item_type = 'subcategory'
        WHERE o.tenant_id = $1 AND o.pending_sync = true
      `, [tenantId]);

      if (pending.rows.length === 0) {
        return res.json({ success: true, pushed: 0, message: 'No pending changes' });
      }

      const accessToken = await getServiceTitanToken();
      const results = { success: [], failed: [] };

      for (const override of pending.rows) {
        try {
          // Build ST update payload
          const payload = {};
          if (override.override_name) payload.name = override.override_name;
          if (override.override_display_name) payload.displayName = override.override_display_name;
          if (override.override_description !== null) payload.description = override.override_description;
          if (override.override_position !== null) payload.position = override.override_position;
          if (override.override_parent_id !== null) payload.parentId = override.override_parent_id;
          if (override.override_active !== null) payload.active = override.override_active;
          if (override.override_business_unit_ids) {
            payload.businessUnitIds = JSON.parse(override.override_business_unit_ids);
          }

          // Push to ServiceTitan
          const response = await fetch(
            `https://api.servicetitan.io/pricebook/v2/tenant/${tenantId}/categories/${override.st_pricebook_id}`,
            {
              method: 'PATCH',
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'ST-App-Key': process.env.SERVICE_TITAN_APP_KEY,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(payload),
            }
          );

          if (!response.ok) {
            throw new Error(`ServiceTitan API error: ${response.status} ${await response.text()}`);
          }

          // Clear override values after successful push
          await pool.query(`
            UPDATE crm.pricebook_overrides
            SET 
              pending_sync = false,
              override_position = NULL,
              override_parent_id = NULL,
              override_name = NULL,
              override_display_name = NULL,
              override_description = NULL,
              override_active = NULL,
              override_business_unit_ids = NULL,
              override_image_url = NULL,
              sync_error = NULL,
              last_synced_at = NOW(),
              updated_at = NOW()
            WHERE id = $1
          `, [override.id]);

          // Update master table with pushed values
          if (override.item_type === 'category') {
            await pool.query(`
              UPDATE master.pricebook_categories
              SET 
                sort_order = COALESCE($1, sort_order),
                name = COALESCE($2, name),
                is_active = COALESCE($3, is_active),
                updated_at = NOW()
              WHERE st_id = $4 AND tenant_id = $5
            `, [
              override.override_position,
              override.override_name,
              override.override_active,
              override.st_pricebook_id,
              tenantId
            ]);
          } else {
            await pool.query(`
              UPDATE master.pricebook_subcategories
              SET 
                sort_order = COALESCE($1, sort_order),
                name = COALESCE($2, name),
                is_active = COALESCE($3, is_active),
                updated_at = NOW()
              WHERE st_id = $4 AND tenant_id = $5
            `, [
              override.override_position,
              override.override_name,
              override.override_active,
              override.st_pricebook_id,
              tenantId
            ]);
          }

          results.success.push(override.st_pricebook_id);
        } catch (err) {
          console.error(`[Push] Failed ${override.st_pricebook_id}:`, err.message);
          
          // Store error
          await pool.query(`
            UPDATE crm.pricebook_overrides
            SET sync_error = $1, updated_at = NOW()
            WHERE id = $2
          `, [err.message, override.id]);

          results.failed.push({ 
            stId: override.st_pricebook_id, 
            error: err.message 
          });
        }
      }

      // Invalidate cache
      await invalidateCache(`categories:${tenantId}:*`);

      res.json({
        success: true,
        pushed: results.success.length,
        failed: results.failed.length,
        results,
      });
    } catch (error) {
      throw error;
    }
  })
);

/**
 * DELETE /api/pricebook/categories/:stId/override
 * Discard local changes and revert to ST values
 */
router.delete(
  '/:stId/override',
  asyncHandler(async (req, res) => {
    const { stId } = req.params;
    const tenantId = getTenantId(req);
    const pool = getPool();

    try {
      await pool.query(`
        DELETE FROM crm.pricebook_overrides
        WHERE st_pricebook_id = $1 AND tenant_id = $2
      `, [stId, tenantId]);

      // Invalidate cache
      await invalidateCache(`categories:${tenantId}:*`);

      res.json({
        success: true,
        message: 'Override discarded. Category reverted to ServiceTitan values.',
      });
    } catch (error) {
      throw error;
    }
  })
);

// ============================================================================
// ERROR HANDLER
// ============================================================================

router.use((err, req, res, next) => {
  console.error('Pricebook Categories API Error:', err);
  
  // Log error for tracking
  addPricebookError('api', err.message, {
    path: req.path,
    method: req.method,
    body: req.body,
  });
  
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

export default router;

// ============================================================================
// PAYLOAD CMS INTEGRATION
// ============================================================================

/**
 * Mount in Payload CMS:
 * 
 * // payload.config.ts
 * import pricebookCategoriesRouter from './api/routes/pricebook-categories';
 * 
 * export default buildConfig({
 *   // ...
 *   express: {
 *     middleware: [
 *       (app) => {
 *         app.use('/api/pricebook/categories', pricebookCategoriesRouter);
 *       },
 *     ],
 *   },
 * });
 */
