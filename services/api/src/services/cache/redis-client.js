/**
 * Redis Client for Caching
 * Dedicated connection for cache operations (separate from BullMQ)
 */

import IORedis from 'ioredis';
import config from '../../config/index.js';
import { createModuleLogger } from '../../utils/logger.js';

const logger = createModuleLogger('cache-redis');

// Cache-specific Redis options
const cacheOptions = {
  host: config.redis.host,
  port: config.redis.port,
  db: config.redis.db,
  keyPrefix: 'cache:',
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    logger.warn(`Redis cache retry attempt ${times}, delay: ${delay}ms`);
    return delay;
  },
  lazyConnect: true,
};

if (config.redis.password) {
  cacheOptions.password = config.redis.password;
}

// Singleton cache client
let cacheClient = null;

/**
 * Get or create the cache Redis client
 */
export function getCacheClient() {
  if (!cacheClient) {
    cacheClient = new IORedis(cacheOptions);
    
    cacheClient.on('connect', () => {
      logger.info('Cache Redis connected', { 
        host: config.redis.host, 
        port: config.redis.port,
        prefix: 'cache:'
      });
    });
    
    cacheClient.on('error', (err) => {
      logger.error('Cache Redis error', { error: err.message });
    });
    
    cacheClient.on('close', () => {
      logger.warn('Cache Redis connection closed');
    });
  }
  
  return cacheClient;
}

/**
 * Connect to Redis (call on startup)
 */
export async function connectCache() {
  const client = getCacheClient();
  
  if (client.status === 'ready') {
    return client;
  }
  
  try {
    await client.connect();
    logger.info('Cache Redis connected successfully');
    return client;
  } catch (error) {
    logger.error('Failed to connect cache Redis', { error: error.message });
    throw error;
  }
}

/**
 * Disconnect from Redis (call on shutdown)
 */
export async function disconnectCache() {
  if (cacheClient) {
    await cacheClient.quit();
    cacheClient = null;
    logger.info('Cache Redis disconnected');
  }
}

/**
 * Check if cache is connected
 */
export function isCacheConnected() {
  return cacheClient?.status === 'ready';
}

export default {
  getCacheClient,
  connectCache,
  disconnectCache,
  isCacheConnected,
};
