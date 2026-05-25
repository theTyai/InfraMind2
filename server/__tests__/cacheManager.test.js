// server/__tests__/cacheManager.test.js
// Unit tests for the Redis-backed CQRS cache manager.
// Verifies that all operations gracefully no-op when Redis is unavailable.
// Run with: node --test server/__tests__/cacheManager.test.js

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

function freshRequire(modulePath) {
  delete require.cache[require.resolve(modulePath)];
  return require(modulePath);
}

describe('cacheManager (no Redis available)', () => {
  beforeEach(() => {
    delete process.env.REDIS_URL;
    // Clear redisClient module cache so it re-initializes without Redis
    ['../utils/redisClient', '../utils/cacheManager'].forEach(m => {
      try { delete require.cache[require.resolve(m)]; } catch {}
    });
  });

  it('setProjectSnapshot is a no-op when Redis is unavailable', async () => {
    const { setProjectSnapshot } = freshRequire('../utils/cacheManager');
    // Should not throw
    await assert.doesNotReject(() => setProjectSnapshot('proj1', { projectTitle: 'Test' }));
  });

  it('getProjectSnapshot returns null on cache miss (no Redis)', async () => {
    const { getProjectSnapshot } = freshRequire('../utils/cacheManager');
    const result = await getProjectSnapshot('proj1');
    assert.equal(result, null);
  });

  it('invalidateProjectSnapshot is a no-op when Redis is unavailable', async () => {
    const { invalidateProjectSnapshot } = freshRequire('../utils/cacheManager');
    await assert.doesNotReject(() => invalidateProjectSnapshot('proj1'));
  });

  it('setSubcollectionCache is a no-op when Redis is unavailable', async () => {
    const { setSubcollectionCache } = freshRequire('../utils/cacheManager');
    await assert.doesNotReject(() => setSubcollectionCache('proj1', 'nodes', []));
  });

  it('getSubcollectionCache returns null when Redis is unavailable', async () => {
    const { getSubcollectionCache } = freshRequire('../utils/cacheManager');
    const result = await getSubcollectionCache('proj1', 'nodes');
    assert.equal(result, null);
  });
});

describe('cacheManager (exports contract)', () => {
  it('exports all expected functions', () => {
    const mod = freshRequire('../utils/cacheManager');
    assert.ok(typeof mod.setProjectSnapshot === 'function');
    assert.ok(typeof mod.getProjectSnapshot === 'function');
    assert.ok(typeof mod.invalidateProjectSnapshot === 'function');
    assert.ok(typeof mod.setSubcollectionCache === 'function');
    assert.ok(typeof mod.getSubcollectionCache === 'function');
  });
});
