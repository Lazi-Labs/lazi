/**
 * Audit API Routes
 * Endpoints for viewing audit logs and entity history
 */

import { Router } from 'express';
import {
  getAuditLog,
  getRecordAuditLog,
  getRecentChanges,
  getChangeStats,
  getEntityHistory,
  getEntityVersion,
  compareEntityVersions,
  getEntityAtTime,
} from '../services/audit/index.js';
import { createModuleLogger } from '../utils/logger.js';

const logger = createModuleLogger('audit-routes');
const router = Router();

// ─────────────────────────────────────────────────────────
// CHANGE LOG
// ─────────────────────────────────────────────────────────

/**
 * GET /audit/changes
 * Get audit log entries with filters
 */
router.get('/changes', async (req, res) => {
  try {
    const result = await getAuditLog(req.query);
    res.json({ success: true, ...result });
  } catch (error) {
    logger.error('Failed to get audit log', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /audit/changes/recent
 * Get recent changes across all tables
 */
router.get('/changes/recent', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const changes = await getRecentChanges(limit);
    res.json({ success: true, changes });
  } catch (error) {
    logger.error('Failed to get recent changes', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /audit/changes/stats
 * Get change statistics
 */
router.get('/changes/stats', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const stats = await getChangeStats(days);
    res.json({ success: true, stats });
  } catch (error) {
    logger.error('Failed to get change stats', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /audit/changes/:table/:recordId
 * Get audit log for a specific record
 */
router.get('/changes/:table/:recordId', async (req, res) => {
  try {
    const { table, recordId } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    
    const changes = await getRecordAuditLog(table, recordId, limit);
    res.json({ success: true, changes });
  } catch (error) {
    logger.error('Failed to get record audit log', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─────────────────────────────────────────────────────────
// ENTITY HISTORY
// ─────────────────────────────────────────────────────────

/**
 * GET /audit/history/:entityType/:entityId
 * Get all versions of an entity
 */
router.get('/history/:entityType/:entityId', async (req, res) => {
  try {
    const { entityType, entityId } = req.params;
    
    const history = await getEntityHistory(entityType, entityId);
    res.json({ 
      success: true, 
      history,
      versions: history.length,
    });
  } catch (error) {
    logger.error('Failed to get entity history', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /audit/history/:entityType/:entityId/version/:version
 * Get a specific version of an entity
 */
router.get('/history/:entityType/:entityId/version/:version', async (req, res) => {
  try {
    const { entityType, entityId, version } = req.params;
    
    const entity = await getEntityVersion(entityType, entityId, parseInt(version));
    
    if (!entity) {
      return res.status(404).json({ success: false, error: 'Version not found' });
    }
    
    res.json({ success: true, entity });
  } catch (error) {
    logger.error('Failed to get entity version', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /audit/history/:entityType/:entityId/compare
 * Compare two versions of an entity
 */
router.get('/history/:entityType/:entityId/compare', async (req, res) => {
  try {
    const { entityType, entityId } = req.params;
    const { v1, v2 } = req.query;
    
    if (!v1 || !v2) {
      return res.status(400).json({ 
        success: false, 
        error: 'v1 and v2 query parameters are required' 
      });
    }
    
    const comparison = await compareEntityVersions(
      entityType, 
      entityId, 
      parseInt(v1), 
      parseInt(v2)
    );
    
    if (!comparison) {
      return res.status(404).json({ success: false, error: 'Versions not found' });
    }
    
    res.json({ success: true, comparison });
  } catch (error) {
    logger.error('Failed to compare versions', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /audit/history/:entityType/:entityId/at
 * Get entity state at a specific point in time
 */
router.get('/history/:entityType/:entityId/at', async (req, res) => {
  try {
    const { entityType, entityId } = req.params;
    const { timestamp } = req.query;
    
    if (!timestamp) {
      return res.status(400).json({ 
        success: false, 
        error: 'timestamp query parameter is required' 
      });
    }
    
    const entity = await getEntityAtTime(entityType, entityId, timestamp);
    
    if (!entity) {
      return res.status(404).json({ 
        success: false, 
        error: 'No version found at that time' 
      });
    }
    
    res.json({ success: true, entity });
  } catch (error) {
    logger.error('Failed to get entity at time', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─────────────────────────────────────────────────────────
// DASHBOARD
// ─────────────────────────────────────────────────────────

/**
 * GET /audit/dashboard
 * Get audit dashboard summary
 */
router.get('/dashboard', async (req, res) => {
  try {
    const [recentChanges, stats] = await Promise.all([
      getRecentChanges(10),
      getChangeStats(7),
    ]);
    
    res.json({
      success: true,
      recentChanges,
      stats,
    });
  } catch (error) {
    logger.error('Failed to get audit dashboard', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
