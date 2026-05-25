// server/utils/cacheManager.js
// Redis-backed CQRS Read Cache for architecture project snapshots.
// Provides near-instant canvas reads by caching the full project JSON in Redis.
// Falls back gracefully when Redis is unavailable.

const { getRedisClient } = require('./redisClient');

const CACHE_TTL = 3600; // 1 hour

async function setProjectSnapshot(projectId, data) {
  const client = getRedisClient();
  if (!client) return;
  try {
    const key = `project:snapshot:${projectId}`;
    await client.setex(key, CACHE_TTL, JSON.stringify(data));
  } catch (err) {
    console.error('[Cache Set Error]', err);
  }
}

async function getProjectSnapshot(projectId) {
  const client = getRedisClient();
  if (!client) return null;
  try {
    const key = `project:snapshot:${projectId}`;
    const cached = await client.get(key);
    return cached ? JSON.parse(cached) : null;
  } catch (err) {
    console.error('[Cache Get Error]', err);
    return null;
  }
}

async function invalidateProjectSnapshot(projectId) {
  const client = getRedisClient();
  if (!client) return;
  try {
    const key = `project:snapshot:${projectId}`;
    const subkeys = [
      `project:sub:${projectId}:nodes`,
      `project:sub:${projectId}:apis`,
      `project:sub:${projectId}:dbSchema`,
      `project:sub:${projectId}:models`
    ];
    await client.del(key, ...subkeys);
  } catch (err) {
    console.error('[Cache Del Error]', err);
  }
}

async function setSubcollectionCache(projectId, subcollection, data) {
  const client = getRedisClient();
  if (!client) return;
  try {
    const key = `project:sub:${projectId}:${subcollection}`;
    await client.setex(key, CACHE_TTL, JSON.stringify(data));
  } catch (err) {
    console.error('[Cache Set Sub Error]', err);
  }
}

async function getSubcollectionCache(projectId, subcollection) {
  const client = getRedisClient();
  if (!client) return null;
  try {
    const key = `project:sub:${projectId}:${subcollection}`;
    const cached = await client.get(key);
    return cached ? JSON.parse(cached) : null;
  } catch (err) {
    console.error('[Cache Get Sub Error]', err);
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
