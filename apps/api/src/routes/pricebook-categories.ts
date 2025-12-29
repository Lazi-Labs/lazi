/**
 * Pricebook Categories API Routes
 * 
 * REST endpoints for CRM to interact with master.pricebook_categories
 * Can be mounted in Payload CMS or used as standalone Express router
 */

import { Router, Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';
import { queueFullSync, queueCategorySync } from '../workers/pricebook-category-sync.worker';

const router = Router();

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/lazi',
});

// ============================================================================
// TYPES
// ============================================================================

interface CategoryFilters {
  categoryType?: 'Materials' | 'Services';
  isActive?: boolean;
  isVisibleCrm?: boolean;
  parentStId?: number | null;
  search?: string;
  businessUnitId?: number;
}

interface ReorderPayload {
  newPosition: number;
  newParentStId?: number | null;
  useOverride?: boolean;
}

// ============================================================================
// MIDDLEWARE
// ============================================================================

// Extract tenant ID from auth or header
function getTenantId(req: Request): string {
  // In production, extract from JWT or session
  // For now, use header or default
  return (req.headers['x-tenant-id'] as string) || process.env.DEFAULT_TENANT_ID || '3222348440';
}

// Async handler wrapper
const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// ============================================================================
// GET /api/pricebook/categories
// List categories with filtering and pagination
// ============================================================================

router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
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

    // Build query
    const conditions: string[] = ['c.tenant_id = $1', 'c.is_archived = false'];
    const params: any[] = [tenantId];
    let paramIndex = 2;

    if (type && ['Materials', 'Services'].includes(type as string)) {
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
      params.push(parseInt(parent as string, 10));
    }

    if (search) {
      conditions.push(`(c.name ILIKE $${paramIndex} OR c.display_name ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (businessUnit) {
      conditions.push(`$${paramIndex++} = ANY(c.business_unit_ids)`);
      params.push(parseInt(businessUnit as string, 10));
    }

    // Validate sort column
    const allowedSortColumns = ['global_sort_order', 'name', 'created_at', 'updated_at', 'sort_order'];
    const safeSort = allowedSortColumns.includes(sortBy as string) ? sortBy : 'global_sort_order';
    const safeOrder = sortOrder === 'desc' ? 'DESC' : 'ASC';

    // Count total
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM master.pricebook_categories c WHERE ${conditions.join(' AND ')}`,
      params
    );
    const total = parseInt(countResult.rows[0].count, 10);

    // Fetch page
    const pageNum = Math.max(1, parseInt(page as string, 10));
    const limitNum = Math.min(500, Math.max(1, parseInt(limit as string, 10)));
    const offset = (pageNum - 1) * limitNum;

    params.push(limitNum, offset);

    const result = await pool.query(
      `
      SELECT 
        c.id,
        c.st_id,
        c.tenant_id,
        COALESCE(c.display_name, c.name) AS name,
        c.name AS original_name,
        c.display_name,
        c.description,
        c.image_url,
        c.category_type,
        c.parent_st_id,
        c.depth,
        c.path::text AS path,
        c.sort_order,
        c.global_sort_order,
        c.is_active,
        c.is_visible_crm,
        c.business_unit_ids,
        c.item_count,
        c.subcategory_count,
        c.last_synced_at,
        c.created_at,
        c.updated_at
      FROM master.pricebook_categories c
      WHERE ${conditions.join(' AND ')}
      ORDER BY c.${safeSort} ${safeOrder}
      LIMIT $${paramIndex++} OFFSET $${paramIndex}
      `,
      params
    );

    res.json({
      data: result.rows,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  })
);

// ============================================================================
// GET /api/pricebook/categories/tree
// Get hierarchical tree structure
// ============================================================================

router.get(
  '/tree',
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = getTenantId(req);
    const { type, includeInactive = 'false' } = req.query;

    const result = await pool.query(
      `SELECT master.get_category_tree($1, $2, $3) AS tree`,
      [
        tenantId,
        type || null,
        includeInactive === 'true',
      ]
    );

    res.json({
      data: result.rows[0]?.tree || [],
    });
  })
);

// ============================================================================
// GET /api/pricebook/categories/:stId
// Get single category with subcategories
// ============================================================================

router.get(
  '/:stId',
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = getTenantId(req);
    const { stId } = req.params;

    // Get category
    const categoryResult = await pool.query(
      `
      SELECT 
        c.*,
        COALESCE(c.display_name, c.name) AS display_name_computed,
        c.path::text AS path_text
      FROM master.pricebook_categories c
      WHERE c.st_id = $1 AND c.tenant_id = $2
      `,
      [stId, tenantId]
    );

    if (categoryResult.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    const category = categoryResult.rows[0];

    // Get subcategories
    const subcategoriesResult = await pool.query(
      `
      SELECT *
      FROM master.pricebook_subcategories
      WHERE parent_st_id = $1
      ORDER BY sort_order
      `,
      [stId]
    );

    // Get children (if any)
    const childrenResult = await pool.query(
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

    res.json({
      data: {
        ...category,
        subcategories: subcategoriesResult.rows,
        children: childrenResult.rows,
      },
    });
  })
);

// ============================================================================
// POST /api/pricebook/categories/:stId/reorder
// Reorder category (drag-and-drop)
// ============================================================================

router.post(
  '/:stId/reorder',
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = getTenantId(req);
    const { stId } = req.params;
    const { newPosition, newParentStId, useOverride = false }: ReorderPayload = req.body;

    if (typeof newPosition !== 'number') {
      return res.status(400).json({ error: 'newPosition is required and must be a number' });
    }

    // Call the reorder function
    const result = await pool.query(
      `SELECT master.reorder_category($1, $2, $3, $4) AS result`,
      [
        parseInt(stId, 10),
        newPosition,
        newParentStId ?? null,
        useOverride,
      ]
    );

    const reorderResult = result.rows[0]?.result;

    if (!reorderResult?.success) {
      return res.status(400).json({
        error: reorderResult?.error || 'Reorder failed',
      });
    }

    res.json({
      success: true,
      data: reorderResult,
    });
  })
);

// ============================================================================
// PATCH /api/pricebook/categories/:stId/visibility
// Toggle CRM visibility
// ============================================================================

router.patch(
  '/:stId/visibility',
  asyncHandler(async (req: Request, res: Response) => {
    const { stId } = req.params;
    const { visible, cascade = false } = req.body;

    if (typeof visible !== 'boolean') {
      return res.status(400).json({ error: 'visible must be a boolean' });
    }

    const result = await pool.query(
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
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = getTenantId(req);
    const { stId } = req.params;
    const { displayName, description, isVisibleCrm, isArchived } = req.body;

    const updates: string[] = [];
    const params: any[] = [parseInt(stId, 10), tenantId];
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

    const result = await pool.query(
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
  asyncHandler(async (req: Request, res: Response) => {
    const { stId } = req.params;
    const { includeInactive = 'false' } = req.query;

    const conditions = ['parent_st_id = $1'];
    if (includeInactive !== 'true') {
      conditions.push('is_active = true');
      conditions.push('is_visible_crm = true');
    }

    const result = await pool.query(
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
// POST /api/pricebook/categories/sync
// Trigger manual sync from raw to master
// ============================================================================

router.post(
  '/sync',
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = getTenantId(req);
    const { categoryType, stId } = req.body;

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
// GET /api/pricebook/categories/stats
// Get category statistics
// ============================================================================

router.get(
  '/stats/summary',
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = getTenantId(req);

    const result = await pool.query(
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
    const subResult = await pool.query(
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
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = getTenantId(req);
    const { stIds, visible }: { stIds: number[]; visible: boolean } = req.body;

    if (!Array.isArray(stIds) || stIds.length === 0) {
      return res.status(400).json({ error: 'stIds must be a non-empty array' });
    }

    if (typeof visible !== 'boolean') {
      return res.status(400).json({ error: 'visible must be a boolean' });
    }

    const result = await pool.query(
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

// ============================================================================
// ERROR HANDLER
// ============================================================================

router.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Pricebook Categories API Error:', err);
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
