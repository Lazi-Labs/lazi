/**
 * Cache Middleware
 * Express middleware for automatic response caching
 */

import { get, set, buildKey, getTTL, isCacheConnected } from '../services/cache/index.js';
import { createModuleLogger } from '../utils/logger.js';

const logger = createModuleLogger('cache-middleware');

/**
 * Create cache middleware for a specific entity type
 * @param {string} entityType - Entity type for TTL lookup
 * @param {function} keyBuilder - Function to build cache key from request
 */
export function cacheMiddleware(entityType, keyBuilder) {
  return async (req, res, next) => {
    // Skip caching for non-GET requests
    if (req.method !== 'GET') {
      return next();
    }
    
    // Skip if cache not connected
    if (!isCacheConnected()) {
      return next();
    }
    
    // Skip if cache bypass header is set
    if (req.headers['x-cache-bypass'] === 'true') {
      return next();
    }
    
    try {
      // Build cache key
      const cacheKey = keyBuilder ? keyBuilder(req) : buildDefaultKey(req, entityType);
      
      // Try to get from cache
      const cached = await get(cacheKey);
      
      if (cached !== null) {
        // Add cache headers
        res.set('X-Cache', 'HIT');
        res.set('X-Cache-Key', cacheKey);
        return res.json(cached);
      }
      
      // Cache miss - capture the response
      res.set('X-Cache', 'MISS');
      res.set('X-Cache-Key', cacheKey);
      
      // Store original json method
      const originalJson = res.json.bind(res);
      
      // Override json to cache the response
      res.json = async (data) => {
        // Only cache successful responses
        if (res.statusCode >= 200 && res.statusCode < 300) {
          const ttl = getTTL(entityType);
          await set(cacheKey, data, ttl);
          logger.debug('Response cached', { key: cacheKey, ttl });
        }
        
        return originalJson(data);
      };
      
      next();
      
    } catch (error) {
      logger.error('Cache middleware error', { error: error.message });
      next();
    }
  };
}

/**
 * Build default cache key from request
 */
function buildDefaultKey(req, entityType) {
  const parts = [entityType];
  
  // Add path parameters
  if (req.params.id) {
    parts.push(req.params.id);
  }
  
  // Add query parameters (sorted for consistency)
  const queryKeys = Object.keys(req.query).sort();
  if (queryKeys.length > 0) {
    const queryString = queryKeys
      .map(k => `${k}=${req.query[k]}`)
      .join('&');
    parts.push(queryString);
  }
  
  return buildKey(...parts);
}

/**
 * Cache middleware for list endpoints with pagination
 */
export function cacheListMiddleware(entityType) {
  return cacheMiddleware(entityType, (req) => {
    const { page = 1, limit = 50, sort, filter, ...otherParams } = req.query;
    
    const parts = ['list', entityType];
    
    // Add pagination
    parts.push(`p${page}`);
    parts.push(`l${limit}`);
    
    // Add sort if present
    if (sort) {
      parts.push(`s${sort}`);
    }
    
    // Add filter if present
    if (filter) {
      parts.push(`f${filter}`);
    }
    
    // Add other params
    const otherKeys = Object.keys(otherParams).sort();
    if (otherKeys.length > 0) {
      parts.push(otherKeys.map(k => `${k}=${otherParams[k]}`).join('_'));
    }
    
    return buildKey(...parts);
  });
}

/**
 * Cache middleware for single entity endpoints
 */
export function cacheEntityMiddleware(entityType) {
  return cacheMiddleware(entityType, (req) => {
    const id = req.params.id || req.params.st_id || req.params.stId;
    return buildKey(entityType, id);
  });
}

/**
 * Cache middleware for dashboard/stats endpoints
 */
export function cacheDashboardMiddleware() {
  return cacheMiddleware('DASHBOARD', (req) => {
    const { timeRange = '7d', ...params } = req.query;
    return buildKey('dashboard', timeRange, Object.keys(params).sort().join('_'));
  });
}

/**
 * No-cache middleware - explicitly skip caching
 */
export function noCacheMiddleware(req, res, next) {
  res.set('X-Cache', 'SKIP');
  res.set('Cache-Control', 'no-store');
  next();
}

/**
 * Cache control headers middleware
 */
export function cacheControlMiddleware(maxAge = 60) {
  return (req, res, next) => {
    if (req.method === 'GET') {
      res.set('Cache-Control', `public, max-age=${maxAge}`);
    } else {
      res.set('Cache-Control', 'no-store');
    }
    next();
  };
}

export default {
  cacheMiddleware,
  cacheListMiddleware,
  cacheEntityMiddleware,
  cacheDashboardMiddleware,
  noCacheMiddleware,
  cacheControlMiddleware,
};
