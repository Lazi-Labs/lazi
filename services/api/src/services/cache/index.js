/**
 * Cache Service
 * Redis-based caching with TTL management and pattern invalidation
 */

import { getCacheClient, connectCache, isCacheConnected } from './redis-client.js';
import { createModuleLogger } from '../../utils/logger.js';

const logger = createModuleLogger('cache');

// TTL Configuration by entity type (in seconds)
export const TTL_CONFIG = {
  // Frequently changing data - short TTL
  CUSTOMER: 300,           // 5 minutes
  JOB: 60,                 // 1 minute
  APPOINTMENT: 30,         // 30 seconds
  INVOICE: 120,            // 2 minutes
  ESTIMATE: 120,           // 2 minutes
  
  // Reference data - longer TTL
  TECHNICIAN: 600,         // 10 minutes
  BUSINESS_UNIT: 3600,     // 1 hour
  JOB_TYPE: 3600,          // 1 hour
  CAMPAIGN: 3600,          // 1 hour
  LOCATION: 300,           // 5 minutes
  
  // Pricebook - rarely changes
  PRICEBOOK_SERVICE: 3600, // 1 hour
  PRICEBOOK_MATERIAL: 3600,// 1 hour
  PRICEBOOK_EQUIPMENT: 3600,// 1 hour
  PRICEBOOK_CATEGORY: 3600,// 1 hour
  
  // Aggregates and dashboards
  DASHBOARD: 30,           // 30 seconds
  STATS: 60,               // 1 minute
  LIST: 120,               // 2 minutes (for paginated lists)
  
  // Default
  DEFAULT: 300,            // 5 minutes
};

// Cache key prefixes by entity
const KEY_PREFIXES = {
  customer: 'customer',
  job: 'job',
  appointment: 'appointment',
  invoice: 'invoice',
  estimate: 'estimate',
  technician: 'technician',
  businessUnit: 'business_unit',
  jobType: 'job_type',
  campaign: 'campaign',
  location: 'location',
  pricebook: 'pricebook',
  dashboard: 'dashboard',
  stats: 'stats',
  list: 'list',
};

/**
 * Build a cache key
 */
export function buildKey(prefix, ...parts) {
  return [prefix, ...parts].filter(Boolean).join(':');
}

/**
 * Get TTL for an entity type
 */
export function getTTL(entityType) {
  const key = entityType.toUpperCase().replace(/-/g, '_');
  return TTL_CONFIG[key] || TTL_CONFIG.DEFAULT;
}

/**
 * Get a value from cache
 */
export async function get(key) {
  if (!isCacheConnected()) {
    return null;
  }
  
  try {
    const client = getCacheClient();
    const value = await client.get(key);
    
    if (value) {
      logger.debug('Cache hit', { key });
      return JSON.parse(value);
    }
    
    logger.debug('Cache miss', { key });
    return null;
    
  } catch (error) {
    logger.error('Cache get error', { key, error: error.message });
    return null;
  }
}

/**
 * Set a value in cache with TTL
 */
export async function set(key, value, ttl = TTL_CONFIG.DEFAULT) {
  if (!isCacheConnected()) {
    return false;
  }
  
  try {
    const client = getCacheClient();
    const serialized = JSON.stringify(value);
    
    await client.setex(key, ttl, serialized);
    
    logger.debug('Cache set', { key, ttl });
    return true;
    
  } catch (error) {
    logger.error('Cache set error', { key, error: error.message });
    return false;
  }
}

/**
 * Delete a specific key from cache
 */
export async function del(key) {
  if (!isCacheConnected()) {
    return false;
  }
  
  try {
    const client = getCacheClient();
    await client.del(key);
    
    logger.debug('Cache delete', { key });
    return true;
    
  } catch (error) {
    logger.error('Cache delete error', { key, error: error.message });
    return false;
  }
}

/**
 * Invalidate cache by pattern (uses SCAN for safety)
 */
export async function invalidate(pattern) {
  if (!isCacheConnected()) {
    return 0;
  }
  
  try {
    const client = getCacheClient();
    let cursor = '0';
    let deletedCount = 0;
    
    // Use SCAN to find matching keys (safe for production)
    do {
      const [newCursor, keys] = await client.scan(
        cursor,
        'MATCH',
        `cache:${pattern}`,
        'COUNT',
        100
      );
      
      cursor = newCursor;
      
      if (keys.length > 0) {
        // Remove the prefix since client already adds it
        const keysWithoutPrefix = keys.map(k => k.replace('cache:', ''));
        await client.del(...keysWithoutPrefix);
        deletedCount += keys.length;
      }
      
    } while (cursor !== '0');
    
    logger.info('Cache invalidated', { pattern, deletedCount });
    return deletedCount;
    
  } catch (error) {
    logger.error('Cache invalidate error', { pattern, error: error.message });
    return 0;
  }
}

/**
 * Invalidate cache for a specific entity
 */
export async function invalidateEntity(entityType, entityId) {
  const prefix = KEY_PREFIXES[entityType] || entityType;
  const pattern = entityId ? `${prefix}:${entityId}*` : `${prefix}:*`;
  return invalidate(pattern);
}

/**
 * Get or set pattern - fetch from cache or execute getter and cache result
 */
export async function getOrSet(key, getter, ttl = TTL_CONFIG.DEFAULT) {
  // Try cache first
  const cached = await get(key);
  if (cached !== null) {
    return cached;
  }
  
  // Execute getter
  const value = await getter();
  
  // Cache the result
  if (value !== null && value !== undefined) {
    await set(key, value, ttl);
  }
  
  return value;
}

/**
 * Get multiple keys at once
 */
export async function mget(...keys) {
  if (!isCacheConnected() || keys.length === 0) {
    return {};
  }
  
  try {
    const client = getCacheClient();
    const values = await client.mget(...keys);
    
    const result = {};
    keys.forEach((key, index) => {
      if (values[index]) {
        result[key] = JSON.parse(values[index]);
      }
    });
    
    return result;
    
  } catch (error) {
    logger.error('Cache mget error', { error: error.message });
    return {};
  }
}

/**
 * Set multiple keys at once
 */
export async function mset(entries, ttl = TTL_CONFIG.DEFAULT) {
  if (!isCacheConnected() || Object.keys(entries).length === 0) {
    return false;
  }
  
  try {
    const client = getCacheClient();
    const pipeline = client.pipeline();
    
    for (const [key, value] of Object.entries(entries)) {
      pipeline.setex(key, ttl, JSON.stringify(value));
    }
    
    await pipeline.exec();
    
    logger.debug('Cache mset', { count: Object.keys(entries).length, ttl });
    return true;
    
  } catch (error) {
    logger.error('Cache mset error', { error: error.message });
    return false;
  }
}

/**
 * Get cache stats
 */
export async function getStats() {
  if (!isCacheConnected()) {
    return { connected: false };
  }
  
  try {
    const client = getCacheClient();
    const info = await client.info('memory');
    const dbSize = await client.dbsize();
    
    // Parse memory info
    const usedMemory = info.match(/used_memory:(\d+)/)?.[1];
    const usedMemoryHuman = info.match(/used_memory_human:([^\r\n]+)/)?.[1];
    
    return {
      connected: true,
      keys: dbSize,
      usedMemory: parseInt(usedMemory) || 0,
      usedMemoryHuman: usedMemoryHuman?.trim() || 'unknown',
    };
    
  } catch (error) {
    logger.error('Cache stats error', { error: error.message });
    return { connected: false, error: error.message };
  }
}

/**
 * Flush all cache (use with caution!)
 */
export async function flushAll() {
  if (!isCacheConnected()) {
    return false;
  }
  
  try {
    const client = getCacheClient();
    
    // Only flush keys with our prefix (safer than FLUSHDB)
    let cursor = '0';
    let deletedCount = 0;
    
    do {
      const [newCursor, keys] = await client.scan(cursor, 'MATCH', 'cache:*', 'COUNT', 100);
      cursor = newCursor;
      
      if (keys.length > 0) {
        const keysWithoutPrefix = keys.map(k => k.replace('cache:', ''));
        await client.del(...keysWithoutPrefix);
        deletedCount += keys.length;
      }
    } while (cursor !== '0');
    
    logger.warn('Cache flushed', { deletedCount });
    return true;
    
  } catch (error) {
    logger.error('Cache flush error', { error: error.message });
    return false;
  }
}

export default {
  TTL_CONFIG,
  buildKey,
  getTTL,
  get,
  set,
  del,
  invalidate,
  invalidateEntity,
  getOrSet,
  mget,
  mset,
  getStats,
  flushAll,
  connectCache,
  isCacheConnected,
};
