import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

const CACHE_TTL = {
  categories: 60,      // 1 minute
  categoryTree: 120,   // 2 minutes
  pending: 10,         // 10 seconds (changes frequently)
};

export async function getCache(key) {
  try {
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Cache get error:', error.message);
    return null;
  }
}

export async function setCache(key, data, ttlSeconds = 60) {
  try {
    await redis.setex(key, ttlSeconds, JSON.stringify(data));
  } catch (error) {
    console.error('Cache set error:', error.message);
  }
}

export async function invalidateCache(pattern) {
  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
      console.log(`[CACHE] Invalidated ${keys.length} keys matching ${pattern}`);
    }
  } catch (error) {
    console.error('Cache invalidate error:', error.message);
  }
}

export function cacheKey(type, tenantId, ...parts) {
  return `pricebook:${tenantId}:${type}:${parts.join(':')}`;
}

export { redis, CACHE_TTL };
