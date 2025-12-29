/**
 * Cache Management Routes
 * API endpoints for cache operations
 */

import { Router } from 'express';
import { 
  getStats, 
  invalidate, 
  invalidateEntity, 
  flushAll,
  get,
  TTL_CONFIG 
} from '../services/cache/index.js';
import { warmupCache, warmupEntity } from '../services/cache/warmup.js';
import { 
  triggerInvalidation, 
  isListenerRunning 
} from '../services/cache/invalidation.js';
import { createModuleLogger } from '../utils/logger.js';

const logger = createModuleLogger('cache-routes');
const router = Router();

/**
 * GET /cache/stats
 * Get cache statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await getStats();
    
    res.json({
      success: true,
      cache: stats,
      invalidationListener: isListenerRunning(),
      ttlConfig: TTL_CONFIG,
    });
    
  } catch (error) {
    logger.error('Failed to get cache stats', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /cache/get/:key
 * Get a specific cache key (for debugging)
 */
router.get('/get/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const value = await get(key);
    
    res.json({
      success: true,
      key,
      found: value !== null,
      value,
    });
    
  } catch (error) {
    logger.error('Failed to get cache key', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /cache/invalidate
 * Invalidate cache by pattern or entity
 */
router.post('/invalidate', async (req, res) => {
  try {
    const { pattern, entityType, entityId } = req.body;
    
    let deletedCount = 0;
    
    if (pattern) {
      deletedCount = await invalidate(pattern);
    } else if (entityType) {
      deletedCount = await invalidateEntity(entityType, entityId);
    } else {
      return res.status(400).json({ 
        success: false, 
        error: 'Provide either pattern or entityType' 
      });
    }
    
    res.json({
      success: true,
      deletedCount,
      pattern: pattern || `${entityType}:${entityId || '*'}`,
    });
    
  } catch (error) {
    logger.error('Failed to invalidate cache', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /cache/warmup
 * Run cache warmup
 */
router.post('/warmup', async (req, res) => {
  try {
    const { entityType, entityId } = req.body;
    
    let result;
    
    if (entityType && entityId) {
      // Warm up specific entity
      const success = await warmupEntity(entityType, entityId);
      result = { success, entityType, entityId };
    } else {
      // Full warmup
      result = await warmupCache();
    }
    
    res.json(result);
    
  } catch (error) {
    logger.error('Failed to warmup cache', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /cache/flush
 * Flush all cache (dangerous!)
 */
router.post('/flush', async (req, res) => {
  try {
    const { confirm } = req.body;
    
    if (confirm !== 'FLUSH_ALL_CACHE') {
      return res.status(400).json({ 
        success: false, 
        error: 'Confirmation required. Send { "confirm": "FLUSH_ALL_CACHE" }' 
      });
    }
    
    const success = await flushAll();
    
    res.json({
      success,
      message: success ? 'Cache flushed' : 'Flush failed',
    });
    
  } catch (error) {
    logger.error('Failed to flush cache', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /cache/health
 * Cache health check
 */
router.get('/health', async (req, res) => {
  try {
    const stats = await getStats();
    
    const healthy = stats.connected;
    
    res.status(healthy ? 200 : 503).json({
      healthy,
      cache: stats,
      listener: isListenerRunning(),
    });
    
  } catch (error) {
    res.status(503).json({ 
      healthy: false, 
      error: error.message 
    });
  }
});

export default router;
