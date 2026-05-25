// client/src/utils/offlineQueue.js
// IndexedDB-backed offline action queue for resilient offline support.
//
// Architecture:
//   - Uses IndexedDB (via the browser's built-in API) to persist a queue of
//     pending actions when the user is offline or the server is unreachable.
//   - On reconnect, the SyncManager flushes the queue in FIFO order.
//   - Each entry is timestamped and carries a unique ID so duplicates can be
//     detected on the server side (idempotency key).
//
// Supported action types:
//   - 'save_history'  : POST /api/projects/history
//   - 'comment'       : WebSocket comment message
//   - 'collab_op'     : Generic collaborative operation (future CRDT ops)

const DB_NAME = 'inframind_offline';
const DB_VERSION = 1;
const STORE_NAME = 'action_queue';

// ─── DB Init ──────────────────────────────────────────────────────────────────

let _db = null;

function openDb() {
  if (_db) return Promise.resolve(_db);

  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('by_timestamp', 'timestamp', { unique: false });
      }
    };

    req.onsuccess = (event) => {
      _db = event.target.result;
      resolve(_db);
    };

    req.onerror = (event) => {
      console.error('[OfflineQueue] Failed to open IndexedDB:', event.target.error);
      reject(event.target.error);
    };
  });
}

// ─── Core Helpers ─────────────────────────────────────────────────────────────

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Enqueues an action to the offline queue.
 * @param {string} type - Action type (e.g. 'save_history', 'comment')
 * @param {object} payload - The action payload
 * @returns {Promise<string>} - The generated action ID (idempotency key)
 */
export async function enqueue(type, payload) {
  try {
    const db = await openDb();
    const id = generateId();
    const entry = {
      id,
      type,
      payload,
      timestamp: Date.now(),
      retries: 0,
    };

    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.add(entry);
      req.onsuccess = () => resolve(id);
      req.onerror = (e) => reject(e.target.error);
    });

    console.log(`[OfflineQueue] Enqueued action [${type}] id=${id}`);
    return id;
  } catch (err) {
    console.warn('[OfflineQueue] enqueue failed (non-fatal):', err);
    return null;
  }
}

/**
 * Returns all pending actions in FIFO order (ordered by timestamp).
 * @returns {Promise<Array>}
 */
export async function getAll() {
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const index = store.index('by_timestamp');
      const req = index.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = (e) => reject(e.target.error);
    });
  } catch (err) {
    console.warn('[OfflineQueue] getAll failed:', err);
    return [];
  }
}

/**
 * Removes a successfully replayed action from the queue.
 * @param {string} id
 */
export async function remove(id) {
  try {
    const db = await openDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = (e) => reject(e.target.error);
    });
  } catch (err) {
    console.warn('[OfflineQueue] remove failed:', err);
  }
}

/**
 * Increments retry count for a failed action.
 * If retries exceed max, remove it to avoid blocking the queue forever.
 * @param {string} id
 * @param {number} maxRetries
 */
export async function incrementRetry(id, maxRetries = 3) {
  try {
    const db = await openDb();
    const entry = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result);
      req.onerror = (e) => reject(e.target.error);
    });

    if (!entry) return;

    entry.retries = (entry.retries || 0) + 1;

    if (entry.retries > maxRetries) {
      console.warn(`[OfflineQueue] Action ${id} exceeded max retries (${maxRetries}). Discarding.`);
      await remove(id);
      return;
    }

    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(entry);
      req.onsuccess = () => resolve();
      req.onerror = (e) => reject(e.target.error);
    });
  } catch (err) {
    console.warn('[OfflineQueue] incrementRetry failed:', err);
  }
}

/**
 * Clears the entire queue (use with caution — data loss risk).
 */
export async function clearAll() {
  try {
    const db = await openDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = (e) => reject(e.target.error);
    });
    console.log('[OfflineQueue] Cleared all pending actions.');
  } catch (err) {
    console.warn('[OfflineQueue] clearAll failed:', err);
  }
}

/**
 * Returns the current queue size.
 * @returns {Promise<number>}
 */
export async function size() {
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.count();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(0);
    });
  } catch {
    return 0;
  }
}
