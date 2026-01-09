/**
 * Pricebook Organization API Routes
 * 
 * Health metrics, bulk operations, duplicates, saved views, audit log
 * 
 * Endpoints:
 * - GET  /api/pricebook/organization/health           - Overall health dashboard
 * - GET  /api/pricebook/organization/health/categories - Completeness by category
 * - GET  /api/pricebook/organization/needs-attention  - Prioritized work queue
 * - GET  /api/pricebook/organization/duplicates       - Potential duplicates
 * - GET  /api/pricebook/organization/anomalies        - Price/margin anomalies
 * - POST /api/pricebook/organization/bulk-update      - Bulk operations
 * - POST /api/pricebook/organization/bulk-review      - Bulk mark reviewed
 * - GET  /api/pricebook/organization/audit-log        - Recent changes
 * - GET  /api/pricebook/organization/progress         - User progress stats
 * - CRUD /api/pricebook/organization/saved-views      - Saved filter views
 */

import { Router } from 'express';
import { getPool } from '../db/schema-connection.js';
import { getCache, setCache, invalidateCache, cacheKey, CACHE_TTL } from '../utils/cache.js';
import { v4 as uuidv4 } from 'uuid';

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
// GET /api/pricebook/organization/health
// Overall health dashboard with scores and issue counts
// ============================================================================

router.get(
  '/health',
  asyncHandler(async (req, res) => {
    const tenantId = getTenantId(req);

    // Try cache first
    const cacheKeyStr = cacheKey('organization', 'health', tenantId);
    const cached = await getCache(cacheKeyStr);
    if (cached) {
      return res.json(cached);
    }

    const result = await pool.query(`
      SELECT * FROM crm.v_pricebook_health
      WHERE tenant_id = $1
    `, [tenantId]);

    // Transform into structured response
    const stats = result.rows.reduce((acc, row) => {
      acc[row.entity_type] = {
        total: parseInt(row.total) || 0,
        active: parseInt(row.active) || 0,
        reviewed: parseInt(row.reviewed) || 0,
        uncategorized: parseInt(row.uncategorized) || 0,
        no_image: parseInt(row.no_image) || 0,
        zero_price: parseInt(row.zero_price) || 0,
        no_description: parseInt(row.no_description) || 0,
        negative_margin: parseInt(row.negative_margin) || 0,
        high_margin: parseInt(row.high_margin) || 0,
      };
      return acc;
    }, {});

    // Calculate scores
    const calculateScore = (s) => {
      if (!s || s.total === 0) return 100;
      const issues = (s.uncategorized || 0) + (s.no_image || 0) + (s.zero_price || 0) + (s.no_description || 0);
      const maxIssues = s.active * 4;
      return Math.round(100 * (1 - issues / Math.max(maxIssues, 1)));
    };

    const materialScore = calculateScore(stats.materials);
    const serviceScore = calculateScore(stats.services);
    const overallScore = Math.round((materialScore + serviceScore) / 2);

    const response = {
      success: true,
      data: {
        overallScore,
        scores: {
          materials: materialScore,
          services: serviceScore,
        },
        stats,
        grade: overallScore >= 90 ? 'A' : overallScore >= 80 ? 'B' : overallScore >= 70 ? 'C' : overallScore >= 60 ? 'D' : 'F',
        totalIssues: Object.values(stats).reduce((sum, s) => 
          sum + (s.uncategorized || 0) + (s.no_image || 0) + (s.zero_price || 0) + (s.no_description || 0), 0
        ),
      },
    };

    await setCache(cacheKeyStr, response, CACHE_TTL.stats || 300);
    res.json(response);
  })
);

// ============================================================================
// GET /api/pricebook/organization/health/categories
// Data completeness by category (for heatmap)
// ============================================================================

router.get(
  '/health/categories',
  asyncHandler(async (req, res) => {
    const tenantId = getTenantId(req);
    const { entityType = 'materials' } = req.query;

    const result = await pool.query(`
      SELECT * FROM crm.v_category_completeness
      WHERE tenant_id = $1 AND entity_type = $2 AND total_items > 0
      ORDER BY total_items DESC
    `, [tenantId, entityType]);

    res.json({
      success: true,
      data: result.rows,
    });
  })
);

// ============================================================================
// GET /api/pricebook/organization/needs-attention
// Prioritized work queue - items with issues
// ============================================================================

router.get(
  '/needs-attention',
  asyncHandler(async (req, res) => {
    const tenantId = getTenantId(req);
    const {
      entityType = 'all',
      issueType,
      limit = '50',
      offset = '0',
    } = req.query;

    const limitNum = Math.min(200, parseInt(limit, 10));
    const offsetNum = parseInt(offset, 10);
    const queries = [];

    // Build issue conditions
    const buildIssueConditions = (prefix) => {
      const conditions = [];
      if (!issueType || issueType === 'uncategorized') {
        conditions.push(`(${prefix}.category_st_id IS NULL OR ${prefix}.category_st_id = 0)`);
      }
      if (!issueType || issueType === 'no_image') {
        conditions.push(`(${prefix}.image_url IS NULL OR ${prefix}.image_url = '')`);
      }
      if (!issueType || issueType === 'zero_price') {
        conditions.push(`(${prefix}.price IS NULL OR ${prefix}.price = 0)`);
      }
      if (!issueType || issueType === 'no_description') {
        conditions.push(`(${prefix}.description IS NULL OR ${prefix}.description = '')`);
      }
      if (!issueType || issueType === 'unreviewed') {
        conditions.push(`${prefix}.is_reviewed = false`);
      }
      return conditions.join(' OR ');
    };

    if (entityType === 'all' || entityType === 'materials') {
      queries.push(`
        SELECT 
          m.id,
          m.st_id,
          m.code,
          m.name,
          'material' as entity_type,
          m.price,
          m.cost,
          m.image_url,
          m.category_st_id,
          c.name as category_name,
          m.is_reviewed,
          m.health_score,
          ARRAY_REMOVE(ARRAY[
            CASE WHEN m.category_st_id IS NULL OR m.category_st_id = 0 THEN 'uncategorized' END,
            CASE WHEN m.image_url IS NULL OR m.image_url = '' THEN 'no_image' END,
            CASE WHEN m.price IS NULL OR m.price = 0 THEN 'zero_price' END,
            CASE WHEN m.description IS NULL OR m.description = '' THEN 'no_description' END,
            CASE WHEN m.is_reviewed = false THEN 'unreviewed' END
          ], NULL) as issues
        FROM master.pricebook_materials m
        LEFT JOIN master.pricebook_categories c ON c.st_id = m.category_st_id AND c.tenant_id = m.tenant_id
        WHERE m.tenant_id = '${tenantId}' AND m.active = true AND (${buildIssueConditions('m')})
      `);
    }

    if (entityType === 'all' || entityType === 'services') {
      queries.push(`
        SELECT 
          s.id,
          s.st_id,
          s.code,
          s.name,
          'service' as entity_type,
          s.price,
          0 as cost,
          s.image_url,
          s.category_st_id,
          c.name as category_name,
          s.is_reviewed,
          s.health_score,
          ARRAY_REMOVE(ARRAY[
            CASE WHEN s.category_st_id IS NULL OR s.category_st_id = 0 THEN 'uncategorized' END,
            CASE WHEN s.image_url IS NULL OR s.image_url = '' THEN 'no_image' END,
            CASE WHEN s.price IS NULL OR s.price = 0 THEN 'zero_price' END,
            CASE WHEN s.description IS NULL OR s.description = '' THEN 'no_description' END,
            CASE WHEN s.is_reviewed = false THEN 'unreviewed' END
          ], NULL) as issues
        FROM master.pricebook_services s
        LEFT JOIN master.pricebook_categories c ON c.st_id = s.category_st_id AND c.tenant_id = s.tenant_id
        WHERE s.tenant_id = '${tenantId}' AND s.active = true AND (${buildIssueConditions('s')})
      `);
    }

    const combinedQuery = `
      WITH items AS (
        ${queries.join(' UNION ALL ')}
      )
      SELECT *, COUNT(*) OVER() as total_count
      FROM items
      ORDER BY health_score ASC, array_length(issues, 1) DESC NULLS LAST
      LIMIT $1 OFFSET $2
    `;

    const result = await pool.query(combinedQuery, [limitNum, offsetNum]);

    res.json({
      success: true,
      data: result.rows.map(r => ({ ...r, total_count: undefined })),
      pagination: {
        total: parseInt(result.rows[0]?.total_count) || 0,
        limit: limitNum,
        offset: offsetNum,
      },
    });
  })
);

// ============================================================================
// GET /api/pricebook/organization/duplicates
// Potential duplicate items
// ============================================================================

router.get(
  '/duplicates',
  asyncHandler(async (req, res) => {
    const tenantId = getTenantId(req);
    const { entityType = 'materials', threshold = '0.7' } = req.query;
    const thresholdNum = parseFloat(threshold);

    // Check for existing pending groups first
    const existingGroups = await pool.query(`
      SELECT * FROM crm.pricebook_duplicate_groups
      WHERE tenant_id = $1 AND entity_type = $2 AND status = 'pending'
      ORDER BY similarity_score DESC
      LIMIT 50
    `, [tenantId, entityType]);

    if (existingGroups.rows.length > 0) {
      // Fetch item details for each group
      const table = entityType === 'materials' ? 'master.pricebook_materials' : 'master.pricebook_services';
      
      const groupsWithDetails = await Promise.all(
        existingGroups.rows.map(async (group) => {
          const items = await pool.query(`
            SELECT st_id, code, name, price, category_st_id, image_url
            FROM ${table}
            WHERE st_id = ANY($1) AND tenant_id = $2
          `, [group.member_st_ids, tenantId]);
          
          return {
            ...group,
            items: items.rows,
          };
        })
      );

      return res.json({
        success: true,
        data: groupsWithDetails,
        source: 'cached',
      });
    }

    // Run fresh duplicate detection
    const duplicates = await pool.query(`
      SELECT * FROM crm.find_potential_duplicates($1, $2, $3, 100)
    `, [tenantId, entityType, thresholdNum]);

    res.json({
      success: true,
      data: duplicates.rows,
      source: 'fresh',
    });
  })
);

// ============================================================================
// GET /api/pricebook/organization/anomalies
// Price and margin anomalies
// ============================================================================

router.get(
  '/anomalies',
  asyncHandler(async (req, res) => {
    const tenantId = getTenantId(req);

    const result = await pool.query(`
      WITH anomalies AS (
        -- Negative margin (selling below cost)
        SELECT 
          st_id, code, name, 'material' as entity_type,
          price, cost,
          ROUND(100.0 * (price - cost) / NULLIF(price, 0), 1) as margin_pct,
          'negative_margin' as anomaly_type,
          'Selling below cost' as anomaly_description
        FROM master.pricebook_materials
        WHERE tenant_id = $1 AND active = true 
          AND cost > 0 AND price > 0 AND price < cost

        UNION ALL

        -- Very high margin (>80%)
        SELECT 
          st_id, code, name, 'material' as entity_type,
          price, cost,
          ROUND(100.0 * (price - cost) / NULLIF(price, 0), 1) as margin_pct,
          'high_margin' as anomaly_type,
          'Unusually high margin (>80%)' as anomaly_description
        FROM master.pricebook_materials
        WHERE tenant_id = $1 AND active = true 
          AND cost > 0 AND price > 0 
          AND (price - cost) / price > 0.8

        UNION ALL

        -- Zero price materials
        SELECT 
          st_id, code, name, 'material' as entity_type,
          price, cost,
          0 as margin_pct,
          'zero_price' as anomaly_type,
          'Active item with $0 price' as anomaly_description
        FROM master.pricebook_materials
        WHERE tenant_id = $1 AND active = true AND (price IS NULL OR price = 0)

        UNION ALL

        -- Zero price services
        SELECT 
          st_id, code, name, 'service' as entity_type,
          price, 0 as cost,
          0 as margin_pct,
          'zero_price' as anomaly_type,
          'Active service with $0 price' as anomaly_description
        FROM master.pricebook_services
        WHERE tenant_id = $1 AND active = true AND (price IS NULL OR price = 0)
      )
      SELECT * FROM anomalies
      ORDER BY 
        CASE anomaly_type 
          WHEN 'negative_margin' THEN 1 
          WHEN 'zero_price' THEN 2 
          WHEN 'high_margin' THEN 3 
        END,
        ABS(COALESCE(margin_pct, 0)) DESC
      LIMIT 200
    `, [tenantId]);

    // Group by anomaly type
    const grouped = result.rows.reduce((acc, row) => {
      if (!acc[row.anomaly_type]) {
        acc[row.anomaly_type] = {
          type: row.anomaly_type,
          description: row.anomaly_description,
          items: [],
        };
      }
      acc[row.anomaly_type].items.push(row);
      return acc;
    }, {});

    res.json({
      success: true,
      data: Object.values(grouped),
      total: result.rowCount,
    });
  })
);

// ============================================================================
// POST /api/pricebook/organization/bulk-update
// Bulk update items (category, active, reviewed, price, etc.)
// ============================================================================

router.post(
  '/bulk-update',
  asyncHandler(async (req, res) => {
    const tenantId = getTenantId(req);
    const { entityType, stIds, updates, userId } = req.body;

    if (!entityType || !stIds || !Array.isArray(stIds) || stIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'entityType and stIds array required',
      });
    }

    const table = entityType === 'materials' ? 'master.pricebook_materials' :
                  entityType === 'services' ? 'master.pricebook_services' :
                  'master.pricebook_equipment';

    const batchId = uuidv4();

    // Build dynamic SET clause
    const allowedFields = [
      'category_st_id', 'active', 'is_reviewed', 'price', 'cost',
      'name', 'description', 'reviewed_by', 'reviewed_at',
    ];

    const setClauses = [];
    const values = [stIds, tenantId];
    let paramIndex = 3;

    for (const [field, value] of Object.entries(updates)) {
      if (allowedFields.includes(field)) {
        setClauses.push(`${field} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    }

    // Auto-set reviewed_at if marking as reviewed
    if (updates.is_reviewed === true && !updates.reviewed_at) {
      setClauses.push('reviewed_at = NOW()');
      if (userId && !updates.reviewed_by) {
        setClauses.push(`reviewed_by = $${paramIndex}`);
        values.push(userId);
        paramIndex++;
      }
    }

    if (setClauses.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid fields to update',
      });
    }

    setClauses.push('updated_at = NOW()');

    const query = `
      UPDATE ${table}
      SET ${setClauses.join(', ')}
      WHERE st_id = ANY($1) AND tenant_id = $2
      RETURNING st_id, name
    `;

    const result = await pool.query(query, values);

    // Log bulk action to audit
    await pool.query(`
      INSERT INTO crm.pricebook_audit_log 
      (tenant_id, user_id, action, entity_type, changes, batch_id, source)
      VALUES ($1, $2, 'bulk_update', $3, $4, $5, 'bulk')
    `, [
      tenantId,
      userId,
      entityType.replace(/s$/, ''),
      JSON.stringify({ updates, affected_count: result.rowCount, st_ids: stIds }),
      batchId,
    ]);

    // Update progress tracking
    if (userId) {
      const actionCounts = {
        items_reviewed: updates.is_reviewed === true ? result.rowCount : 0,
        items_categorized: updates.category_st_id ? result.rowCount : 0,
        items_priced: updates.price !== undefined ? result.rowCount : 0,
        total_actions: result.rowCount,
      };

      await pool.query(`
        INSERT INTO crm.pricebook_progress (tenant_id, user_id, date, items_reviewed, items_categorized, items_priced, total_actions)
        VALUES ($1, $2, CURRENT_DATE, $3, $4, $5, $6)
        ON CONFLICT (tenant_id, user_id, date) DO UPDATE SET
          items_reviewed = crm.pricebook_progress.items_reviewed + EXCLUDED.items_reviewed,
          items_categorized = crm.pricebook_progress.items_categorized + EXCLUDED.items_categorized,
          items_priced = crm.pricebook_progress.items_priced + EXCLUDED.items_priced,
          total_actions = crm.pricebook_progress.total_actions + EXCLUDED.total_actions
      `, [tenantId, userId, actionCounts.items_reviewed, actionCounts.items_categorized, actionCounts.items_priced, actionCounts.total_actions]);
    }

    // Invalidate caches
    await invalidateCache(`pricebook:${tenantId}:${entityType}:*`);
    await invalidateCache(`organization:health:${tenantId}`);

    res.json({
      success: true,
      updated: result.rowCount,
      batchId,
    });
  })
);

// ============================================================================
// POST /api/pricebook/organization/bulk-review
// Quick endpoint to mark items as reviewed
// ============================================================================

router.post(
  '/bulk-review',
  asyncHandler(async (req, res) => {
    const tenantId = getTenantId(req);
    const { entityType, stIds, reviewed = true, userId } = req.body;

    if (!entityType || !stIds || stIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'entityType and stIds required',
      });
    }

    const table = entityType === 'materials' ? 'master.pricebook_materials' :
                  entityType === 'services' ? 'master.pricebook_services' :
                  null;

    if (!table) {
      return res.status(400).json({ success: false, error: 'Invalid entityType' });
    }

    const result = await pool.query(`
      UPDATE ${table}
      SET is_reviewed = $1, reviewed_at = CASE WHEN $1 THEN NOW() ELSE NULL END, reviewed_by = $2, updated_at = NOW()
      WHERE st_id = ANY($3) AND tenant_id = $4
      RETURNING st_id
    `, [reviewed, userId, stIds, tenantId]);

    // Update progress
    if (userId && reviewed) {
      await pool.query(`
        INSERT INTO crm.pricebook_progress (tenant_id, user_id, date, items_reviewed, total_actions)
        VALUES ($1, $2, CURRENT_DATE, $3, $3)
        ON CONFLICT (tenant_id, user_id, date) DO UPDATE SET
          items_reviewed = crm.pricebook_progress.items_reviewed + EXCLUDED.items_reviewed,
          total_actions = crm.pricebook_progress.total_actions + EXCLUDED.total_actions
      `, [tenantId, userId, result.rowCount]);
    }

    // Invalidate caches
    await invalidateCache(`pricebook:${tenantId}:${entityType}:*`);
    await invalidateCache(`organization:health:${tenantId}`);

    res.json({
      success: true,
      updated: result.rowCount,
    });
  })
);

// ============================================================================
// GET /api/pricebook/organization/audit-log
// Recent changes with filtering
// ============================================================================

router.get(
  '/audit-log',
  asyncHandler(async (req, res) => {
    const tenantId = getTenantId(req);
    const { userId, entityType, days = '7', limit = '100' } = req.query;

    const params = [tenantId, parseInt(days, 10), parseInt(limit, 10)];
    let whereConditions = [`tenant_id = $1`, `created_at > NOW() - INTERVAL '1 day' * $2`];
    let paramIndex = 4;

    if (userId) {
      whereConditions.push(`user_id = $${paramIndex}`);
      params.push(userId);
      paramIndex++;
    }

    if (entityType) {
      whereConditions.push(`entity_type = $${paramIndex}`);
      params.push(entityType);
      paramIndex++;
    }

    const result = await pool.query(`
      SELECT 
        id, user_id, action, entity_type, entity_st_id, entity_name,
        changes, batch_id, source, created_at
      FROM crm.pricebook_audit_log
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY created_at DESC
      LIMIT $3
    `, params);

    // Group by date
    const grouped = result.rows.reduce((acc, row) => {
      const date = row.created_at.toISOString().split('T')[0];
      if (!acc[date]) acc[date] = [];
      acc[date].push(row);
      return acc;
    }, {});

    res.json({
      success: true,
      data: grouped,
      total: result.rowCount,
    });
  })
);

// ============================================================================
// GET /api/pricebook/organization/progress
// User progress and achievements
// ============================================================================

router.get(
  '/progress',
  asyncHandler(async (req, res) => {
    const tenantId = getTenantId(req);
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ success: false, error: 'userId required' });
    }

    // Daily progress last 30 days
    const dailyProgress = await pool.query(`
      SELECT date, items_reviewed, items_categorized, items_priced, items_imaged, duplicates_resolved, total_actions
      FROM crm.pricebook_progress
      WHERE tenant_id = $1 AND user_id = $2 AND date > CURRENT_DATE - INTERVAL '30 days'
      ORDER BY date DESC
    `, [tenantId, userId]);

    // Achievements
    const achievements = await pool.query(`
      SELECT achievement_key, achieved_at
      FROM crm.pricebook_achievements
      WHERE tenant_id = $1 AND user_id = $2
    `, [tenantId, userId]);

    // Totals
    const totals = dailyProgress.rows.reduce((acc, row) => {
      acc.reviewed += row.items_reviewed || 0;
      acc.categorized += row.items_categorized || 0;
      acc.priced += row.items_priced || 0;
      acc.imaged += row.items_imaged || 0;
      acc.duplicates += row.duplicates_resolved || 0;
      acc.total += row.total_actions || 0;
      return acc;
    }, { reviewed: 0, categorized: 0, priced: 0, imaged: 0, duplicates: 0, total: 0 });

    // Overall completion stats
    const completion = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE is_reviewed = true) as reviewed,
        COUNT(*) FILTER (WHERE category_st_id IS NOT NULL AND category_st_id > 0) as categorized,
        COUNT(*) FILTER (WHERE image_url IS NOT NULL AND image_url != '') as imaged,
        COUNT(*) FILTER (WHERE price > 0) as priced
      FROM master.pricebook_materials
      WHERE tenant_id = $1 AND active = true
    `, [tenantId]);

    const comp = completion.rows[0];
    const total = parseInt(comp.total) || 1;
    const completionPct = {
      overall: Math.round(100 * (parseInt(comp.reviewed) + parseInt(comp.categorized) + parseInt(comp.imaged) + parseInt(comp.priced)) / (total * 4)),
      reviewed: Math.round(100 * parseInt(comp.reviewed) / total),
      categorized: Math.round(100 * parseInt(comp.categorized) / total),
      imaged: Math.round(100 * parseInt(comp.imaged) / total),
      priced: Math.round(100 * parseInt(comp.priced) / total),
    };

    const today = dailyProgress.rows.find(r => r.date.toISOString().split('T')[0] === new Date().toISOString().split('T')[0]);

    res.json({
      success: true,
      data: {
        dailyProgress: dailyProgress.rows,
        totals,
        achievements: achievements.rows,
        completion: completionPct,
        today: today || null,
      },
    });
  })
);

// ============================================================================
// SAVED VIEWS CRUD
// ============================================================================

router.get(
  '/saved-views',
  asyncHandler(async (req, res) => {
    const tenantId = getTenantId(req);
    const { userId, entityType } = req.query;

    if (!userId) {
      return res.status(400).json({ success: false, error: 'userId required' });
    }

    const params = [tenantId, userId];
    let whereClause = 'tenant_id = $1 AND user_id = $2';

    if (entityType) {
      params.push(entityType);
      whereClause += ` AND entity_type = $${params.length}`;
    }

    const result = await pool.query(`
      SELECT * FROM crm.pricebook_saved_views
      WHERE ${whereClause}
      ORDER BY is_default DESC, name
    `, params);

    res.json({ success: true, data: result.rows });
  })
);

router.post(
  '/saved-views',
  asyncHandler(async (req, res) => {
    const tenantId = getTenantId(req);
    const { userId, name, entityType, filters, sortConfig, visibleColumns, isDefault } = req.body;

    if (!userId || !name || !entityType) {
      return res.status(400).json({ success: false, error: 'userId, name, and entityType required' });
    }

    // If setting as default, unset other defaults
    if (isDefault) {
      await pool.query(`
        UPDATE crm.pricebook_saved_views 
        SET is_default = false 
        WHERE tenant_id = $1 AND user_id = $2 AND entity_type = $3
      `, [tenantId, userId, entityType]);
    }

    const result = await pool.query(`
      INSERT INTO crm.pricebook_saved_views (tenant_id, user_id, name, entity_type, filters, sort_config, visible_columns, is_default)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [tenantId, userId, name, entityType, JSON.stringify(filters || {}), JSON.stringify(sortConfig || {}), JSON.stringify(visibleColumns || []), isDefault || false]);

    res.json({ success: true, data: result.rows[0] });
  })
);

router.delete(
  '/saved-views/:id',
  asyncHandler(async (req, res) => {
    const tenantId = getTenantId(req);
    const { id } = req.params;

    await pool.query(`
      DELETE FROM crm.pricebook_saved_views 
      WHERE id = $1 AND tenant_id = $2
    `, [id, tenantId]);

    res.json({ success: true });
  })
);

// ============================================================================
// POST /api/pricebook/organization/duplicates/merge
// Merge duplicate items
// ============================================================================

router.post(
  '/duplicates/merge',
  asyncHandler(async (req, res) => {
    const tenantId = getTenantId(req);
    const { entityType, keepStId, mergeStIds, userId } = req.body;

    if (!entityType || !keepStId || !mergeStIds || mergeStIds.length === 0) {
      return res.status(400).json({ success: false, error: 'entityType, keepStId, and mergeStIds required' });
    }

    const table = entityType === 'materials' ? 'master.pricebook_materials' : 'master.pricebook_services';

    // Mark merged items as inactive
    await pool.query(`
      UPDATE ${table}
      SET active = false, updated_at = NOW()
      WHERE st_id = ANY($1) AND tenant_id = $2
    `, [mergeStIds, tenantId]);

    // Update duplicate group if exists
    await pool.query(`
      UPDATE crm.pricebook_duplicate_groups
      SET status = 'merged', merged_into_st_id = $1, resolved_at = NOW(), resolved_by = $2
      WHERE tenant_id = $3 AND entity_type = $4 AND $1 = ANY(member_st_ids) AND status = 'pending'
    `, [keepStId, userId, tenantId, entityType]);

    // Log to audit
    await pool.query(`
      INSERT INTO crm.pricebook_audit_log 
      (tenant_id, user_id, action, entity_type, entity_st_id, changes, source)
      VALUES ($1, $2, 'merge_duplicates', $3, $4, $5, 'manual')
    `, [tenantId, userId, entityType.replace(/s$/, ''), keepStId, JSON.stringify({ merged_st_ids: mergeStIds })]);

    // Update progress
    if (userId) {
      await pool.query(`
        INSERT INTO crm.pricebook_progress (tenant_id, user_id, date, duplicates_resolved, total_actions)
        VALUES ($1, $2, CURRENT_DATE, $3, $3)
        ON CONFLICT (tenant_id, user_id, date) DO UPDATE SET
          duplicates_resolved = crm.pricebook_progress.duplicates_resolved + EXCLUDED.duplicates_resolved,
          total_actions = crm.pricebook_progress.total_actions + EXCLUDED.total_actions
      `, [tenantId, userId, mergeStIds.length]);
    }

    // Invalidate cache
    await invalidateCache(`pricebook:${tenantId}:${entityType}:*`);

    res.json({ success: true, kept: keepStId, merged: mergeStIds.length });
  })
);

router.post(
  '/duplicates/dismiss',
  asyncHandler(async (req, res) => {
    const tenantId = getTenantId(req);
    const { groupId, userId } = req.body;

    await pool.query(`
      UPDATE crm.pricebook_duplicate_groups
      SET status = 'dismissed', resolved_at = NOW(), resolved_by = $1
      WHERE id = $2 AND tenant_id = $3
    `, [userId, groupId, tenantId]);

    res.json({ success: true });
  })
);

// ============================================================================
// POST /api/pricebook/organization/recalculate-health
// Manually trigger health score recalculation
// ============================================================================

router.post(
  '/recalculate-health',
  asyncHandler(async (req, res) => {
    const tenantId = getTenantId(req);

    const result = await pool.query(`
      SELECT * FROM crm.update_health_scores($1)
    `, [tenantId]);

    // Invalidate health cache
    await invalidateCache(`organization:health:${tenantId}`);

    res.json({
      success: true,
      ...result.rows[0],
    });
  })
);

// ============================================================================
// PENDING SYNC ENDPOINTS
// ============================================================================

// GET /api/pricebook/organization/pending-sync
// Items with changes not pushed to ServiceTitan
router.get(
  '/pending-sync',
  asyncHandler(async (req, res) => {
    const tenantId = getTenantId(req);
    const { entityType, status = 'pending', limit = '100' } = req.query;

    let whereConditions = [`tenant_id = $1`, `sync_status = $2`];
    const params = [tenantId, status];

    if (entityType && entityType !== 'all') {
      params.push(entityType);
      whereConditions.push(`entity_type = $${params.length}`);
    }

    const result = await pool.query(`
      SELECT entity_type, st_id, code, name, sync_status, sync_error, pending_since, pending_changes
      FROM crm.v_pricebook_pending_sync
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY pending_since ASC
      LIMIT $${params.length + 1}
    `, [...params, parseInt(limit, 10)]);

    const counts = await pool.query(`SELECT * FROM crm.get_pending_sync_counts($1)`, [tenantId]);

    res.json({
      success: true,
      data: result.rows,
      counts: counts.rows.reduce((acc, row) => {
        acc[row.entity_type] = { 
          pending: parseInt(row.pending_count) || 0, 
          errors: parseInt(row.error_count) || 0, 
          oldest: row.oldest_pending 
        };
        return acc;
      }, {}),
      total: result.rowCount,
    });
  })
);

// GET /api/pricebook/organization/pending-sync/counts
// Quick count of pending items
router.get(
  '/pending-sync/counts',
  asyncHandler(async (req, res) => {
    const tenantId = getTenantId(req);
    const result = await pool.query(`SELECT * FROM crm.get_pending_sync_counts($1)`, [tenantId]);

    const counts = result.rows.reduce((acc, row) => {
      acc[row.entity_type] = { 
        pending: parseInt(row.pending_count) || 0, 
        errors: parseInt(row.error_count) || 0, 
        oldest: row.oldest_pending 
      };
      return acc;
    }, {});

    const totalPending = Object.values(counts).reduce((sum, c) => sum + c.pending, 0);
    const totalErrors = Object.values(counts).reduce((sum, c) => sum + c.errors, 0);

    res.json({ 
      success: true, 
      data: counts, 
      totalPending,
      totalErrors,
    });
  })
);

// POST /api/pricebook/organization/pending-sync/push
// Push pending changes to ServiceTitan
router.post(
  '/pending-sync/push',
  asyncHandler(async (req, res) => {
    const tenantId = getTenantId(req);
    const { entityType, stIds, userId } = req.body;

    if (!entityType || !stIds || stIds.length === 0) {
      return res.status(400).json({ success: false, error: 'entityType and stIds required' });
    }

    const results = { pushed: 0, failed: 0, errors: [] };

    if (entityType === 'service' || entityType === 'services') {
      const edits = await pool.query(`
        SELECT e.*, s.code, s.name 
        FROM crm.pricebook_service_edits e
        JOIN master.pricebook_services s ON s.st_id = e.st_pricebook_id AND s.tenant_id = e.tenant_id
        WHERE e.st_pricebook_id = ANY($1) AND e.tenant_id = $2 AND e.sync_status = 'pending'
      `, [stIds, tenantId]);

      for (const edit of edits.rows) {
        try {
          // Build the update payload for ServiceTitan
          const stPayload = {};
          if (edit.override_name) stPayload.name = edit.override_name;
          if (edit.override_description !== null) stPayload.description = edit.override_description;
          if (edit.override_price !== null) stPayload.price = edit.override_price;
          if (edit.override_active !== null) stPayload.active = edit.override_active;

          // TODO: Replace with actual ServiceTitan API call
          // const stResponse = await stRequest(`https://api.servicetitan.io/pricebook/v2/tenant/${tenantId}/services/${edit.st_pricebook_id}`, {
          //   method: 'PATCH',
          //   body: stPayload,
          // });

          // For now, mark as synced
          await pool.query(`
            UPDATE crm.pricebook_service_edits 
            SET sync_status = 'synced', synced_at = NOW()
            WHERE id = $1
          `, [edit.id]);

          await pool.query(`
            UPDATE master.pricebook_services 
            SET has_local_changes = false, updated_at = NOW()
            WHERE st_id = $1 AND tenant_id = $2
          `, [edit.st_pricebook_id, tenantId]);

          results.pushed++;
        } catch (err) {
          results.failed++;
          results.errors.push({ st_id: edit.st_pricebook_id, code: edit.code, error: err.message });
          
          await pool.query(`
            UPDATE crm.pricebook_service_edits 
            SET sync_status = 'error', sync_error = $1
            WHERE id = $2
          `, [err.message, edit.id]);
        }
      }
    }

    if (entityType === 'material' || entityType === 'materials') {
      // Handle new materials
      const newMaterials = await pool.query(`
        SELECT * FROM crm.pricebook_new_materials
        WHERE id = ANY($1) AND tenant_id = $2 AND pushed_to_st = false
      `, [stIds, tenantId]);

      for (const mat of newMaterials.rows) {
        try {
          // TODO: Replace with actual ServiceTitan API call
          await pool.query(`
            UPDATE crm.pricebook_new_materials 
            SET pushed_to_st = true, synced_at = NOW()
            WHERE id = $1
          `, [mat.id]);

          results.pushed++;
        } catch (err) {
          results.failed++;
          results.errors.push({ id: mat.id, code: mat.code, error: err.message });
          
          await pool.query(`
            UPDATE crm.pricebook_new_materials SET sync_error = $1 WHERE id = $2
          `, [err.message, mat.id]);
        }
      }

      // Handle material edits
      try {
        const edits = await pool.query(`
          SELECT e.*, m.code, m.name 
          FROM crm.pricebook_material_edits e
          JOIN master.pricebook_materials m ON m.st_id = e.st_pricebook_id AND m.tenant_id = e.tenant_id
          WHERE e.st_pricebook_id = ANY($1) AND e.tenant_id = $2 AND e.sync_status = 'pending'
        `, [stIds, tenantId]);

        for (const edit of edits.rows) {
          try {
            await pool.query(`
              UPDATE crm.pricebook_material_edits 
              SET sync_status = 'synced', synced_at = NOW()
              WHERE id = $1
            `, [edit.id]);

            await pool.query(`
              UPDATE master.pricebook_materials 
              SET has_local_changes = false, updated_at = NOW()
              WHERE st_id = $1 AND tenant_id = $2
            `, [edit.st_pricebook_id, tenantId]);

            results.pushed++;
          } catch (err) {
            results.failed++;
            results.errors.push({ st_id: edit.st_pricebook_id, code: edit.code, error: err.message });
          }
        }
      } catch (e) {
        // Table might not exist, ignore
      }
    }

    // Log to audit
    await pool.query(`
      INSERT INTO crm.pricebook_audit_log (tenant_id, user_id, action, entity_type, changes, source)
      VALUES ($1, $2, 'bulk_push_to_st', $3, $4, 'bulk')
    `, [tenantId, userId, entityType, JSON.stringify(results)]);

    await invalidateCache(`pricebook:${tenantId}:*`);

    res.json({ 
      success: true, 
      pushed: results.pushed, 
      failed: results.failed,
      errors: results.errors,
    });
  })
);

// POST /api/pricebook/organization/pending-sync/retry
// Retry failed pushes
router.post(
  '/pending-sync/retry',
  asyncHandler(async (req, res) => {
    const tenantId = getTenantId(req);
    const { entityType, stIds } = req.body;

    if (entityType === 'service' || entityType === 'services') {
      await pool.query(`
        UPDATE crm.pricebook_service_edits 
        SET sync_status = 'pending', sync_error = NULL
        WHERE st_pricebook_id = ANY($1) AND tenant_id = $2 AND sync_status = 'error'
      `, [stIds, tenantId]);
    }

    if (entityType === 'material' || entityType === 'materials') {
      await pool.query(`
        UPDATE crm.pricebook_new_materials 
        SET sync_error = NULL
        WHERE id = ANY($1) AND tenant_id = $2
      `, [stIds, tenantId]);

      try {
        await pool.query(`
          UPDATE crm.pricebook_material_edits 
          SET sync_status = 'pending', sync_error = NULL
          WHERE st_pricebook_id = ANY($1) AND tenant_id = $2 AND sync_status = 'error'
        `, [stIds, tenantId]);
      } catch (e) { /* table might not exist */ }
    }

    res.json({ success: true });
  })
);

export default router;
