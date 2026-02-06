// Redis Cache Layer (Upstash)
// Graceful fallback - if Redis is unavailable, requests hit the DB directly

const { Redis } = require('@upstash/redis');

let redis = null;

if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
  console.log('🔴 Redis cache connected (Upstash)');
} else {
  console.log('⚠️  Redis not configured - caching disabled');
}

/**
 * Get a cached value, or compute and cache it
 * Falls back to the compute function if Redis is unavailable
 *
 * @param {string} key - Cache key
 * @param {Function} computeFn - Async function to compute the value if not cached
 * @param {number} ttlSeconds - Time to live in seconds (default: 300 = 5 min)
 * @returns {Promise<any>} The cached or computed value
 */
async function cacheGet(key, computeFn, ttlSeconds = 300) {
  if (!redis) {
    return computeFn();
  }

  try {
    const cached = await redis.get(key);
    if (cached !== null && cached !== undefined) {
      return cached;
    }
  } catch (err) {
    console.error('Redis GET error:', err.message);
    // Fall through to compute
  }

  const value = await computeFn();

  try {
    await redis.set(key, JSON.stringify(value), { ex: ttlSeconds });
  } catch (err) {
    console.error('Redis SET error:', err.message);
  }

  return value;
}

/**
 * Invalidate cache keys by pattern prefix
 * Use after mutations (create/update/delete)
 *
 * @param {string} prefix - Key prefix to invalidate (e.g., 'programs:')
 */
async function cacheInvalidate(prefix) {
  if (!redis) return;

  try {
    // Upstash supports SCAN for pattern matching
    let cursor = 0;
    do {
      const [nextCursor, keys] = await redis.scan(cursor, { match: `${prefix}*`, count: 100 });
      cursor = nextCursor;
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } while (cursor !== 0);
  } catch (err) {
    console.error('Redis invalidate error:', err.message);
  }
}

/**
 * Delete a specific cache key
 *
 * @param {string} key - Cache key to delete
 */
async function cacheDel(key) {
  if (!redis) return;

  try {
    await redis.del(key);
  } catch (err) {
    console.error('Redis DEL error:', err.message);
  }
}

module.exports = { cacheGet, cacheInvalidate, cacheDel, redis };
