// server/utils/collaboration.js
const WebSocket = require('ws');

const rooms = new Map(); // roomId -> Set of client objects

function initCollaboration(server, db) {
  const wss = new WebSocket.Server({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);

    if (url.pathname === '/api/collaboration') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    }
  });

  wss.on('connection', (ws) => {
    let currentRoomId = null;
    let currentUser = null;

    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message);

        switch (data.type) {
          case 'join': {
            const { roomId, userId, userName, photoUrl } = data;
            currentRoomId = roomId;
            currentUser = {
              ws,
              userId,
              userName: userName || 'Anonymous Developer',
              photoUrl: photoUrl || '',
              cursor: { x: 0, y: 0 }
            };

            if (!rooms.has(roomId)) {
              rooms.set(roomId, new Set());
            }
            rooms.get(roomId).add(currentUser);

            // Broadcast presence update
            broadcastPresence(roomId);
            break;
          }

          case 'cursor': {
            if (!currentRoomId || !currentUser) return;
            currentUser.cursor = { x: data.x, y: data.y };

            // Broadcast cursor update to other clients in room
            broadcastToOthers(currentRoomId, currentUser.userId, {
              type: 'cursor',
              userId: currentUser.userId,
              userName: currentUser.userName,
              x: data.x,
              y: data.y
            });
            break;
          }

          case 'comment': {
            if (!currentRoomId || !currentUser || !db) return;
            const { nodeId, commentText } = data;

            // Save comment to Firestore
            const commentRef = db.collection('shares').doc(currentRoomId).collection('comments').doc();
            const commentPayload = {
              id: commentRef.id,
              nodeId,
              text: commentText,
              author: currentUser.userName,
              userId: currentUser.userId,
              photoUrl: currentUser.photoUrl || '',
              timestamp: new Date().toISOString()
            };

            await commentRef.set(commentPayload);

            // Broadcast comment to everyone in the room
            broadcastToAll(currentRoomId, {
              type: 'comment',
              ...commentPayload
            });

            // Trigger notification alert for project owner
            try {
              const shareSnap = await db.collection('shares').doc(currentRoomId).get();
              if (shareSnap.exists) {
                const shareData = shareSnap.data();
                const ownerId = shareData.ownerId;
                const projectName = shareData.title || 'Project';
                const projectId = shareData.projectId;

                // Do not notify the owner if they wrote it
                if (ownerId && ownerId !== currentUser.userId) {
                  const { triggerCommentAlert } = require('./notifications');
                  await triggerCommentAlert(ownerId, projectId, projectName, currentUser.userName, commentText, db);
                }
              }
            } catch (notifErr) {
              console.error('[WebSockets] Failed to trigger comment notification:', notifErr);
            }
            break;
          }
        }
      } catch (err) {
        console.error('[WebSockets] Message processing failed:', err);
      }
    });

    ws.on('close', () => {
      if (currentRoomId && currentUser) {
        const room = rooms.get(currentRoomId);
        if (room) {
          room.delete(currentUser);
          if (room.size === 0) {
            rooms.delete(currentRoomId);
          } else {
            broadcastPresence(currentRoomId);
          }
        }
      }
    });
  });

  function broadcastPresence(roomId) {
    const room = rooms.get(roomId);
    if (!room) return;

    const users = Array.from(room).map(u => ({
      userId: u.userId,
      userName: u.userName,
      photoUrl: u.photoUrl,
      cursor: u.cursor
    }));

    broadcastToAll(roomId, {
      type: 'presence',
      users
    });
  }

  function broadcastToAll(roomId, data) {
    const room = rooms.get(roomId);
    if (!room) return;

    const payload = JSON.stringify(data);
    room.forEach(client => {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(payload);
      }
    });
  }

  function broadcastToOthers(roomId, senderUserId, data) {
    const room = rooms.get(roomId);
    if (!room) return;

    const payload = JSON.stringify(data);
    room.forEach(client => {
      if (client.userId !== senderUserId && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(payload);
      }
    });
  }
}

module.exports = { initCollaboration };
