// server/utils/redisClient.js
// Shared Redis client factory with graceful degradation.
// If REDIS_URL is not set, all methods return null and callers fall back to in-memory logic.

let Redis;
try {
  Redis = require('ioredis');
} catch {
  Redis = null;
}

let _client = null;
let _publisher = null;
let _subscriber = null;
let _initialized = false;

function createClient(url, role = 'client') {
  if (!Redis || !url) return null;
  try {
    const client = new Redis(url, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        if (times > 5) return null; // Stop retrying after 5 attempts
        return Math.min(times * 200, 2000);
      },
      lazyConnect: true,
    });

    client.on('connect', () => console.log(`[Redis] ${role} connected.`));
    client.on('error', (err) => console.warn(`[Redis] ${role} error (non-fatal):`, err.message));
    client.on('close', () => console.warn(`[Redis] ${role} connection closed.`));

    return client;
  } catch (err) {
    console.warn(`[Redis] Failed to create ${role} client:`, err.message);
    return null;
  }
}

function init() {
  if (_initialized) return;
  _initialized = true;

  const url = process.env.REDIS_URL;
  if (!url) {
    console.warn('[Redis] REDIS_URL not set. All Redis features will use in-memory fallback.');
    return;
  }

  _client = createClient(url, 'main');
  _publisher = createClient(url, 'publisher');
  _subscriber = createClient(url, 'subscriber');
}

/**
 * Returns the general-purpose Redis client (get/set/del/expire).
 * Returns null if Redis is unavailable.
 */
function getRedisClient() {
  init();
  return _client;
}

/**
 * Returns the Pub/Sub publisher client.
 * Returns null if Redis is unavailable.
 */
function getPublisher() {
  init();
  return _publisher;
}

/**
 * Returns the Pub/Sub subscriber client.
 * Returns null if Redis is unavailable.
 */
function getSubscriber() {
  init();
  return _subscriber;
}

/**
 * Returns true if Redis is configured and available.
 */
function isRedisAvailable() {
  init();
  return !!_client;
}

module.exports = { getRedisClient, getPublisher, getSubscriber, isRedisAvailable };
