/**
 * Rate Limiting Middleware
 * Uses Redis for distributed rate limiting
 */

import { createModuleLogger } from '../utils/logger.js';
import { tooManyRequests } from '../utils/api-response.js';

const logger = createModuleLogger('rate-limit');

// In-memory store for when Redis is not available
const memoryStore = new Map();

/**
 * Clean up expired entries from memory store
 */
function cleanupMemoryStore() {
  const now = Date.now();
  for (const [key, value] of memoryStore.entries()) {
    if (value.resetAt < now) {
      memoryStore.delete(key);
    }
  }
}

// Run cleanup every minute
setInterval(cleanupMemoryStore, 60000);

/**
 * Get rate limit key for request
 */
function getKey(req, keyGenerator) {
  if (typeof keyGenerator === 'function') {
    return keyGenerator(req);
  }
  
  // Default: use IP address
  return req.ip || req.connection.remoteAddress || 'unknown';
}

/**
 * Memory-based rate limiter (fallback)
 */
async function checkMemoryLimit(key, limit, windowMs) {
  const now = Date.now();
  const record = memoryStore.get(key);
  
  if (!record || record.resetAt < now) {
    // New window
    memoryStore.set(key, {
      count: 1,
      resetAt: now + windowMs,
    });
    return { allowed: true, remaining: limit - 1, resetAt: now + windowMs };
  }
  
  if (record.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: record.resetAt };
  }
  
  record.count++;
  return { allowed: true, remaining: limit - record.count, resetAt: record.resetAt };
}

/**
 * Redis-based rate limiter
 */
async function checkRedisLimit(redis, key, limit, windowMs) {
  const now = Date.now();
  const windowKey = `ratelimit:${key}:${Math.floor(now / windowMs)}`;
  
  try {
    const multi = redis.multi();
    multi.incr(windowKey);
    multi.pexpire(windowKey, windowMs);
    const results = await multi.exec();
    
    const count = results[0][1];
    const resetAt = (Math.floor(now / windowMs) + 1) * windowMs;
    
    if (count > limit) {
      return { allowed: false, remaining: 0, resetAt };
    }
    
    return { allowed: true, remaining: limit - count, resetAt };
  } catch (error) {
    logger.warn('Redis rate limit check failed, falling back to memory', { error: error.message });
    return checkMemoryLimit(key, limit, windowMs);
  }
}

/**
 * Create rate limiter middleware
 */
export function rateLimit(options = {}) {
  const {
    windowMs = 60000,        // 1 minute window
    limit = 100,             // 100 requests per window
    keyGenerator = null,     // Custom key generator function
    skip = null,             // Function to skip rate limiting
    redis = null,            // Redis client (optional)
    message = 'Too many requests, please try again later',
  } = options;
  
  return async (req, res, next) => {
    // Check if we should skip rate limiting
    if (skip && skip(req)) {
      return next();
    }
    
    const key = getKey(req, keyGenerator);
    
    let result;
    if (redis) {
      result = await checkRedisLimit(redis, key, limit, windowMs);
    } else {
      result = await checkMemoryLimit(key, limit, windowMs);
    }
    
    // Set rate limit headers
    res.set('X-RateLimit-Limit', limit);
    res.set('X-RateLimit-Remaining', Math.max(0, result.remaining));
    res.set('X-RateLimit-Reset', Math.ceil(result.resetAt / 1000));
    
    if (!result.allowed) {
      const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000);
      logger.warn('Rate limit exceeded', { key, limit, retryAfter });
      return tooManyRequests(res, message, retryAfter);
    }
    
    next();
  };
}

/**
 * Pre-configured rate limiters
 */
export const rateLimiters = {
  // Standard API rate limit
  api: rateLimit({
    windowMs: 60000,
    limit: 100,
  }),
  
  // Strict rate limit for sensitive endpoints
  strict: rateLimit({
    windowMs: 60000,
    limit: 10,
  }),
  
  // Relaxed rate limit for read-only endpoints
  relaxed: rateLimit({
    windowMs: 60000,
    limit: 300,
  }),
  
  // Auth endpoints
  auth: rateLimit({
    windowMs: 900000, // 15 minutes
    limit: 5,
    message: 'Too many authentication attempts, please try again later',
  }),
};

export default rateLimit;
