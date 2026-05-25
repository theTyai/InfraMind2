// server/utils/collaboration.js
// WebSocket Collaboration Handler with Redis Pub/Sub backing.
// 
// Architecture:
//   - Each project room is a Redis Pub/Sub channel: `ws:room:{projectId}`
//   - Presence tracking uses a Redis Hash: `ws:presence:{projectId}` (TTL 120s)
//   - This allows multiple Express server instances to share WebSocket state
//   - Graceful fallback: if Redis is unavailable, uses in-memory Map (original behavior)

const WebSocket = require('ws');
const { getPublisher, getSubscriber, getRedisClient, isRedisAvailable } = require('./redisClient');

// In-memory fallback (single-process mode when Redis is unavailable)
const _inMemoryRooms = new Map(); // roomId -> Set<{ ws, userId, userName, photoUrl, cursor }>

const PRESENCE_TTL = 120; // seconds
const CHANNEL_PREFIX = 'ws:room:';
const PRESENCE_PREFIX = 'ws:presence:';

function initCollaboration(server, db) {
  const wss = new WebSocket.Server({ noServer: true });
  const redisMode = isRedisAvailable();

  if (redisMode) {
    console.log('[Collab] Running in Redis Pub/Sub mode (planet-scale).');
  } else {
    console.log('[Collab] Running in in-memory mode (single-process fallback).');
  }

  // Local registry: ws connection -> { roomId, userId, userName }
  // Used to route incoming Redis messages to the right local WS connections
  const localClients = new Map(); // ws -> { roomId, userId, userName, photoUrl }

  // Subscribe to incoming Redis Pub/Sub messages and forward to local WS clients
  if (redisMode) {
    const subscriber = getSubscriber();
    if (subscriber) {
      subscriber.on('message', (channel, message) => {
        const roomId = channel.replace(CHANNEL_PREFIX, '');
        try {
          const data = JSON.parse(message);
          // Deliver to all local WS clients in this room
          for (const [ws, meta] of localClients.entries()) {
            if (meta.roomId === roomId && ws.readyState === WebSocket.OPEN) {
              // For cursor events: don't echo back to sender
              if (data.type === 'cursor' && data.userId === meta.userId) continue;
              ws.send(message);
            }
          }
        } catch (err) {
          console.warn('[Collab] Failed to parse Redis message:', err.message);
        }
      });
    }
  }

  server.on('upgrade', (request, socket, head) => {
    const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
    if (url.pathname === '/api/collaboration') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    }
  });

  wss.on('connection', (ws) => {
    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message);

        switch (data.type) {

          case 'join': {
            const { roomId, userId, userName, photoUrl } = data;
            const meta = { roomId, userId, userName: userName || 'Anonymous', photoUrl: photoUrl || '' };
            localClients.set(ws, meta);

            if (redisMode) {
              // Subscribe this server to the room channel (idempotent)
              const subscriber = getSubscriber();
              const channel = `${CHANNEL_PREFIX}${roomId}`;
              await subscriber.subscribe(channel).catch(() => {});

              // Register presence in Redis Hash
              const redis = getRedisClient();
              const presenceKey = `${PRESENCE_PREFIX}${roomId}`;
              await redis.hset(presenceKey, userId, JSON.stringify({ userId, userName: meta.userName, photoUrl: meta.photoUrl }));
              await redis.expire(presenceKey, PRESENCE_TTL);

              // Broadcast fresh presence list
              await broadcastPresenceRedis(roomId);
            } else {
              // In-memory fallback
              if (!_inMemoryRooms.has(roomId)) _inMemoryRooms.set(roomId, new Set());
              _inMemoryRooms.get(roomId).add({ ws, ...meta, cursor: { x: 0, y: 0 } });
              broadcastPresenceInMemory(roomId);
            }
            break;
          }

          case 'cursor': {
            const meta = localClients.get(ws);
            if (!meta) return;

            const cursorMsg = JSON.stringify({
              type: 'cursor',
              userId: meta.userId,
              userName: meta.userName,
              x: data.x,
              y: data.y
            });

            if (redisMode) {
              const publisher = getPublisher();
              if (publisher) await publisher.publish(`${CHANNEL_PREFIX}${meta.roomId}`, cursorMsg).catch(() => {});
            } else {
              broadcastToOthersInMemory(meta.roomId, meta.userId, cursorMsg);
            }
            break;
          }

          case 'comment': {
            const meta = localClients.get(ws);
            if (!meta || !db) return;
            const { nodeId, commentText } = data;

            // Save to Firestore
            const { resolveProjectOwner } = require('./projectResolver');
            const ownerData = await resolveProjectOwner(meta.roomId, meta.userId, db);
            
            let commentRef;
            let ownerId = null;
            let projectName = 'Project';

            if (ownerData) {
              ownerId = ownerData.ownerId;
              commentRef = db.collection('users').doc(ownerId).collection('projects').doc(meta.roomId).collection('comments').doc();
              try {
                const pSnap = await db.collection('users').doc(ownerId).collection('projects').doc(meta.roomId).get();
                if (pSnap.exists) projectName = pSnap.data().title || 'Project';
              } catch {}
            } else {
              commentRef = db.collection('shares').doc(meta.roomId).collection('comments').doc();
            }

            const commentPayload = {
              id: commentRef.id,
              nodeId,
              text: commentText,
              author: meta.userName,
              userId: meta.userId,
              photoUrl: meta.photoUrl || '',
              timestamp: new Date().toISOString()
            };

            await commentRef.set(commentPayload);

            // Broadcast comment via Redis or in-memory
            const commentMsg = JSON.stringify({ type: 'comment', ...commentPayload });
            if (redisMode) {
              const publisher = getPublisher();
              if (publisher) await publisher.publish(`${CHANNEL_PREFIX}${meta.roomId}`, commentMsg).catch(() => {});
            } else {
              broadcastToAllInMemory(meta.roomId, commentMsg);
            }

            // Notification
            try {
              if (ownerData && ownerId && ownerId !== meta.userId) {
                const { triggerCommentAlert } = require('./notifications');
                await triggerCommentAlert(ownerId, meta.roomId, projectName, meta.userName, commentText, db);
              }
            } catch (notifErr) {
              console.error('[Collab] Notification failed:', notifErr);
            }
            break;
          }
        }
      } catch (err) {
        console.error('[Collab] Message processing failed:', err);
      }
    });

    ws.on('close', async () => {
      const meta = localClients.get(ws);
      if (!meta) return;

      localClients.delete(ws);

      if (redisMode) {
        const redis = getRedisClient();
        const presenceKey = `${PRESENCE_PREFIX}${meta.roomId}`;
        await redis.hdel(presenceKey, meta.userId).catch(() => {});
        await broadcastPresenceRedis(meta.roomId);
      } else {
        const room = _inMemoryRooms.get(meta.roomId);
        if (room) {
          for (const client of room) {
            if (client.userId === meta.userId) { room.delete(client); break; }
          }
          if (room.size === 0) _inMemoryRooms.delete(meta.roomId);
          else broadcastPresenceInMemory(meta.roomId);
        }
      }
    });
  });

  // ── Redis Helpers ──────────────────────────────────────────
  async function broadcastPresenceRedis(roomId) {
    const redis = getRedisClient();
    const publisher = getPublisher();
    if (!redis || !publisher) return;

    try {
      const presenceKey = `${PRESENCE_PREFIX}${roomId}`;
      const raw = await redis.hgetall(presenceKey);
      const users = raw ? Object.values(raw).map(v => JSON.parse(v)) : [];
      const msg = JSON.stringify({ type: 'presence', users });
      await publisher.publish(`${CHANNEL_PREFIX}${roomId}`, msg);
    } catch (err) {
      console.warn('[Collab] Failed to broadcast Redis presence:', err.message);
    }
  }

  // ── In-Memory Helpers (fallback) ───────────────────────────
  function broadcastPresenceInMemory(roomId) {
    const room = _inMemoryRooms.get(roomId);
    if (!room) return;
    const users = Array.from(room).map(u => ({ userId: u.userId, userName: u.userName, photoUrl: u.photoUrl, cursor: u.cursor }));
    broadcastToAllInMemory(roomId, JSON.stringify({ type: 'presence', users }));
  }

  function broadcastToAllInMemory(roomId, payload) {
    const room = _inMemoryRooms.get(roomId);
    if (!room) return;
    room.forEach(client => {
      if (client.ws.readyState === WebSocket.OPEN) client.ws.send(payload);
    });
  }

  function broadcastToOthersInMemory(roomId, senderUserId, payload) {
    const room = _inMemoryRooms.get(roomId);
    if (!room) return;
    room.forEach(client => {
      if (client.userId !== senderUserId && client.ws.readyState === WebSocket.OPEN) client.ws.send(payload);
    });
  }
}

module.exports = { initCollaboration };
