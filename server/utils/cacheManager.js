// server/utils/cacheManager.js
// Redis-backed CQRS Read Cache for architecture project snapshots.
// Provides near-instant canvas reads by caching the full project JSON in Redis.
// Falls back gracefully to returning null (caller queries Firestore) if Redis is unavailable.

const { getRedisClient } = require('./redisClient');

const CACHE_PREFIX = 'inframind:snapshot:';
const CACHE_TTL_SECONDS = 3600; // 1 hour

/**
 * Writes a flattened project architecture snapshot to Redis.
 * Called after every successful AI generation.
 * @param {string} projectId
 * @param {object} data - The full architecture JSON (geminiResponse shape)
 */
async function setProjectSnapshot(projectId, data) {
  const redis = getRedisClient();
  if (!redis) return; // Graceful no-op

  try {
    const key = `${CACHE_PREFIX}${projectId}`;
    await redis.set(key, JSON.stringify(data), 'EX', CACHE_TTL_SECONDS);
    console.log(`[Cache] Snapshot SET for project ${projectId} (TTL: ${CACHE_TTL_SECONDS}s)`);
  } catch (err) {
    console.warn(`[Cache] Failed to write snapshot for ${projectId}:`, err.message);
  }
}

/**
 * Retrieves a cached project snapshot from Redis.
 * Returns null on cache miss or Redis unavailability.
 * @param {string} projectId
 * @returns {object|null}
 */
async function getProjectSnapshot(projectId) {
  const redis = getRedisClient();
  if (!redis) return null; // Graceful miss

  try {
    const key = `${CACHE_PREFIX}${projectId}`;
    const raw = await redis.get(key);
    if (!raw) {
      console.log(`[Cache] MISS for project ${projectId}`);
      return null;
    }
    console.log(`[Cache] HIT for project ${projectId}`);
    return JSON.parse(raw);
  } catch (err) {
    console.warn(`[Cache] Failed to read snapshot for ${projectId}:`, err.message);
    return null;
  }
}

/**
 * Deletes a cached snapshot (call on re-generation or manual update).
 * @param {string} projectId
 */
async function invalidateProjectSnapshot(projectId) {
  const redis = getRedisClient();
  if (!redis) return;

  try {
    const key = `${CACHE_PREFIX}${projectId}`;
    await redis.del(key);
    console.log(`[Cache] Invalidated snapshot for project ${projectId}`);
  } catch (err) {
    console.warn(`[Cache] Failed to invalidate snapshot for ${projectId}:`, err.message);
  }
}

/**
 * Writes multiple key-value pairs with the same TTL (bulk set for subcollection data).
 * @param {string} projectId
 * @param {string} subKey - e.g. 'nodes', 'edges', 'schemas', 'routes'
 * @param {Array} data
 */
async function setSubcollectionCache(projectId, subKey, data) {
  const redis = getRedisClient();
  if (!redis) return;

  try {
    const key = `${CACHE_PREFIX}${projectId}:${subKey}`;
    await redis.set(key, JSON.stringify(data), 'EX', CACHE_TTL_SECONDS);
  } catch (err) {
    console.warn(`[Cache] Failed to write ${subKey} cache for ${projectId}:`, err.message);
  }
}

/**
 * Reads subcollection cache.
 * @param {string} projectId
 * @param {string} subKey
 * @returns {Array|null}
 */
async function getSubcollectionCache(projectId, subKey) {
  const redis = getRedisClient();
  if (!redis) return null;

  try {
    const key = `${CACHE_PREFIX}${projectId}:${subKey}`;
    const raw = await redis.get(key);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    console.warn(`[Cache] Failed to read ${subKey} cache for ${projectId}:`, err.message);
    return null;
  }
}

module.exports = {
  setProjectSnapshot,
  getProjectSnapshot,
  invalidateProjectSnapshot,
  setSubcollectionCache,
  getSubcollectionCache
};
