// server/utils/redisClient.js
// Shared Redis client factory with graceful degradation.
// If REDIS_URL is not set, all methods return null and callers fall back to in-memory logic.

let Redis;
try {
  Redis = require('ioredis');
} catch {
  Redis = null;
}

let client = null;
let publisher = null;
let subscriber = null;

function getRedisClient() {
  if (!process.env.REDIS_URL || !Redis) return null;
  if (!client) {
    try {
      client = new Redis(process.env.REDIS_URL, {
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false
      });
      client.on('error', (err) => console.error('[Redis Client Error]', err));
    } catch (err) {
      console.error('[Redis Initialization Error]', err);
      return null;
    }
  }
  return client;
}

function getPublisher() {
  if (!process.env.REDIS_URL || !Redis) return null;
  if (!publisher) {
    try {
      publisher = new Redis(process.env.REDIS_URL, {
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false
      });
      publisher.on('error', (err) => console.error('[Redis Publisher Error]', err));
    } catch (err) {
      console.error('[Redis Publisher Initialization Error]', err);
      return null;
    }
  }
  return publisher;
}

function getSubscriber() {
  if (!process.env.REDIS_URL || !Redis) return null;
  if (!subscriber) {
    try {
      subscriber = new Redis(process.env.REDIS_URL, {
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false
      });
      subscriber.on('error', (err) => console.error('[Redis Subscriber Error]', err));
    } catch (err) {
      console.error('[Redis Subscriber Initialization Error]', err);
      return null;
    }
  }
  return subscriber;
}

function isRedisAvailable() {
  return !!(process.env.REDIS_URL && Redis);
}

module.exports = {
  getRedisClient,
  getPublisher,
  getSubscriber,
  isRedisAvailable
};
