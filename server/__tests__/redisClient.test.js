// server/__tests__/redisClient.test.js
// Unit tests for the Redis client factory with graceful degradation.
// Run with: node --test server/__tests__/redisClient.test.js
// (Node 18+ built-in test runner, no extra deps required)

const { describe, it, before, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

// ── Helpers ──────────────────────────────────────────────────────────────────

function freshRequire(modulePath) {
  // Clear module cache so each test gets a fresh module state
  delete require.cache[require.resolve(modulePath)];
  return require(modulePath);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('redisClient (no REDIS_URL)', () => {
  beforeEach(() => {
    delete process.env.REDIS_URL;
  });

  it('getRedisClient returns null when REDIS_URL is unset', () => {
    const { getRedisClient } = freshRequire('../utils/redisClient');
    const client = getRedisClient();
    assert.equal(client, null, 'Expected null when Redis is not configured');
  });

  it('getPublisher returns null when REDIS_URL is unset', () => {
    const { getPublisher } = freshRequire('../utils/redisClient');
    const pub = getPublisher();
    assert.equal(pub, null);
  });

  it('getSubscriber returns null when REDIS_URL is unset', () => {
    const { getSubscriber } = freshRequire('../utils/redisClient');
    const sub = getSubscriber();
    assert.equal(sub, null);
  });

  it('isRedisAvailable returns false when REDIS_URL is unset', () => {
    const { isRedisAvailable } = freshRequire('../utils/redisClient');
    assert.equal(isRedisAvailable(), false);
  });
});

describe('redisClient (exports contract)', () => {
  it('exports expected functions', () => {
    const mod = freshRequire('../utils/redisClient');
    assert.ok(typeof mod.getRedisClient === 'function');
    assert.ok(typeof mod.getPublisher === 'function');
    assert.ok(typeof mod.getSubscriber === 'function');
    assert.ok(typeof mod.isRedisAvailable === 'function');
  });
});
