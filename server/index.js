const path = require('path');
const fs = require('fs');

const clientEnvPath = path.join(__dirname, '../client/.env');
const rootEnvPath = path.join(__dirname, '../.env');

if (fs.existsSync(clientEnvPath)) {
  require('dotenv').config({ path: clientEnvPath });
} else {
  require('dotenv').config({ path: rootEnvPath });
}

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const admin = require('firebase-admin');

const app = express();

// Secure headers with Helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https://*"],
      connectSrc: ["'self'", "https://*"]
    }
  }
}));

// Restrict CORS origins to localhost and configuration variables
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://inframind2.vercel.app',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// Restrict request body size to 10MB to prevent DoS
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Initialize Firebase Admin
const serviceAccountVar = process.env.FIREBASE_SERVICE_ACCOUNT;
if (serviceAccountVar && serviceAccountVar !== 'your_firebase_service_account_json_string_here') {
  try {
    if (serviceAccountVar.trim().startsWith('{')) {
      const serviceAccount = JSON.parse(serviceAccountVar);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      console.log('Firebase Admin initialized with service account JSON from environment.');
    } else {
      // Treat as filepath
      const resolvedPath = path.isAbsolute(serviceAccountVar)
        ? serviceAccountVar
        : path.join(__dirname, serviceAccountVar);
      admin.initializeApp({
        credential: admin.credential.cert(require(resolvedPath))
      });
      console.log(`Firebase Admin initialized with service account file from: ${resolvedPath}`);
    }
  } catch (error) {
    console.error('Failed to initialize Firebase Admin with service account:', error);
    process.exit(1);
  }
} else {
  // Try default config or log warning
  try {
    admin.initializeApp();
    console.log('Firebase Admin initialized with default configuration.');
  } catch (error) {
    console.warn('Firebase Admin default initialization failed. Endpoints will fail unless service account credentials are provided.');
  }
}

let db = null;
try {
  db = admin.firestore();
} catch (e) {
  console.warn('Firestore database could not be initialized from admin SDK. Check your credentials.');
}

// Auth Middleware
async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }

  const token = authHeader.split('Bearer ')[1];
  if (!token || token === 'null' || token === 'undefined' || token.trim() === '') {
    console.warn(`[Auth] Blocked request to ${req.originalUrl || req.url} due to null/undefined/empty token`);
    return res.status(401).json({ error: 'Unauthorized: Empty or invalid token format' });
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error(`Error verifying Firebase token for ${req.originalUrl || req.url}:`, error);
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
}

// Register AI Gateway Routes
require('./routes/ai')(app, db, admin, authMiddleware);
require('./routes/githubAuth')(app, db, admin, authMiddleware);
require('./routes/drift')(app, db, admin, authMiddleware);
require('./routes/security')(app, db, admin, authMiddleware);
require('./routes/badge')(app, db, admin);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', firebaseInitialized: !!db });
});

// GET /api/projects - Get all projects for the user
app.get('/api/projects', authMiddleware, async (req, res) => {
  if (!db) {
    return res.status(500).json({ error: 'Database not initialized' });
  }

  const userId = req.user.uid;
  try {
    const projectsRef = db.collection('users').doc(userId).collection('projects');
    const snapshot = await projectsRef.orderBy('updatedAt', 'desc').get();

    const projects = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      projects.push({
        id: doc.id,
        title: data.title,
        summary: data.summary,
        shareId: data.shareId || null,
        isPublic: !!data.isPublic,
        metrics: {
          layers: data.layersCount || 0,
          apis: data.apisCount || 0
        },
        timestamp: data.updatedAt ? data.updatedAt.toDate().toISOString() : null
      });
    });

    res.json(projects);
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// GET /api/projects/:projectId/history - Get project chat history
app.get('/api/projects/:projectId/history', authMiddleware, async (req, res) => {
  if (!db) {
    return res.status(500).json({ error: 'Database not initialized' });
  }

  const userId = req.user.uid;
  const { projectId } = req.params;

  try {
    const { lazyMigrateProject } = require('./utils/dbNormalizer');
    await lazyMigrateProject(userId, projectId, db, admin);

    const historyRef = db.collection('users').doc(userId)
      .collection('projects').doc(projectId)
      .collection('chatHistory');

    const snapshot = await historyRef.orderBy('timestamp', 'asc').get();

    const history = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      history.push({
        id: doc.id,
        prompt: data.prompt,
        geminiResponse: data.geminiResponse,
        timestamp: data.timestamp ? data.timestamp.toDate().toISOString() : null
      });
    });

    res.json(history);
  } catch (error) {
    console.error('Error fetching project history:', error);
    res.status(500).json({ error: 'Failed to fetch project history' });
  }
});

// POST /api/projects/history - Save chat history entry
app.post('/api/projects/history', authMiddleware, async (req, res) => {
  if (!db) {
    return res.status(500).json({ error: 'Database not initialized' });
  }

  const userId = req.user.uid;
  let { projectId, projectTitle, projectSummary, prompt, geminiResponse } = req.body;

  if (!projectTitle || !prompt || !geminiResponse) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const userProjectsRef = db.collection('users').doc(userId).collection('projects');

    // Generate new projectId if not provided
    if (!projectId) {
      const newProjDoc = userProjectsRef.doc();
      projectId = newProjDoc.id;
    }

    const projectDocRef = userProjectsRef.doc(projectId);
    const serverTimestamp = admin.firestore.FieldValue.serverTimestamp();

    // Extract layers and apis count
    const layersCount = Array.isArray(geminiResponse.stack) ? geminiResponse.stack.length : 0;
    const apisCount = Array.isArray(geminiResponse.apis) ? geminiResponse.apis.length : 0;

    // Save project metadata
    await projectDocRef.set({
      title: projectTitle,
      summary: projectSummary || '',
      layersCount,
      apisCount,
      updatedAt: serverTimestamp
    }, { merge: true });

    // Add to chat history subcollection
    const chatHistoryRef = projectDocRef.collection('chatHistory');
    const newMsgDoc = chatHistoryRef.doc();
    const messageId = newMsgDoc.id;

    await newMsgDoc.set({
      prompt,
      geminiResponse,
      timestamp: serverTimestamp
    });

    // Normalize and save project details to subcollections
    const { normalizeAndSaveProject } = require('./utils/dbNormalizer');
    try {
      await normalizeAndSaveProject(userId, projectId, geminiResponse, db, admin);
    } catch (normErr) {
      console.error('[Server] Subcollection normalization failed, continuing to save history snapshot:', normErr);
    }

    const timestampISO = new Date().toISOString();

    res.status(201).json({
      messageId,
      projectId,
      prompt,
      geminiResponse,
      timestamp: timestampISO
    });
  } catch (error) {
    console.error('Error saving project history:', error);
    res.status(500).json({ error: 'Failed to save project history' });
  }
});

// GET /api/projects/:projectId/nodes - Get project nodes subcollection
app.get('/api/projects/:projectId/nodes', authMiddleware, async (req, res) => {
  if (!db) {
    return res.status(500).json({ error: 'Database not initialized' });
  }
  const userId = req.user.uid;
  const { projectId } = req.params;
  try {
    const { lazyMigrateProject } = require('./utils/dbNormalizer');
    await lazyMigrateProject(userId, projectId, db, admin);

    const nodesRef = db.collection('users').doc(userId)
      .collection('projects').doc(projectId)
      .collection('nodes');

    const snapshot = await nodesRef.get();
    const nodes = [];
    snapshot.forEach(doc => {
      nodes.push(doc.data());
    });
    res.json(nodes);
  } catch (error) {
    console.error('Error fetching nodes:', error);
    res.status(500).json({ error: 'Failed to fetch nodes' });
  }
});

// GET /api/projects/:projectId/edges - Get project edges subcollection
app.get('/api/projects/:projectId/edges', authMiddleware, async (req, res) => {
  if (!db) {
    return res.status(500).json({ error: 'Database not initialized' });
  }
  const userId = req.user.uid;
  const { projectId } = req.params;
  try {
    const { lazyMigrateProject } = require('./utils/dbNormalizer');
    await lazyMigrateProject(userId, projectId, db, admin);

    const edgesRef = db.collection('users').doc(userId)
      .collection('projects').doc(projectId)
      .collection('edges');

    const snapshot = await edgesRef.get();
    const edges = [];
    snapshot.forEach(doc => {
      edges.push(doc.data());
    });
    res.json(edges);
  } catch (error) {
    console.error('Error fetching edges:', error);
    res.status(500).json({ error: 'Failed to fetch edges' });
  }
});

// GET /api/projects/:projectId/schemas - Get project schemas subcollection
app.get('/api/projects/:projectId/schemas', authMiddleware, async (req, res) => {
  if (!db) {
    return res.status(500).json({ error: 'Database not initialized' });
  }
  const userId = req.user.uid;
  const { projectId } = req.params;
  try {
    const { lazyMigrateProject } = require('./utils/dbNormalizer');
    await lazyMigrateProject(userId, projectId, db, admin);

    const schemasRef = db.collection('users').doc(userId)
      .collection('projects').doc(projectId)
      .collection('schemas');

    const snapshot = await schemasRef.get();
    const schemas = [];
    snapshot.forEach(doc => {
      schemas.push(doc.data());
    });
    res.json(schemas);
  } catch (error) {
    console.error('Error fetching schemas:', error);
    res.status(500).json({ error: 'Failed to fetch schemas' });
  }
});

// GET /api/projects/:projectId/routes - Get project routes subcollection
app.get('/api/projects/:projectId/routes', authMiddleware, async (req, res) => {
  if (!db) {
    return res.status(500).json({ error: 'Database not initialized' });
  }
  const userId = req.user.uid;
  const { projectId } = req.params;
  try {
    const { lazyMigrateProject } = require('./utils/dbNormalizer');
    await lazyMigrateProject(userId, projectId, db, admin);

    const routesRef = db.collection('users').doc(userId)
      .collection('projects').doc(projectId)
      .collection('routes');

    const snapshot = await routesRef.orderBy('index', 'asc').get();
    const routes = [];
    snapshot.forEach(doc => {
      routes.push(doc.data());
    });
    res.json(routes);
  } catch (error) {
    console.error('Error fetching routes:', error);
    res.status(500).json({ error: 'Failed to fetch routes' });
  }
});

const PORT = process.env.PORT || 5000;

// ─── SHARE ENDPOINTS ──────────────────────────────────────────────────────────

// POST /api/projects/:projectId/share — make project publicly shareable
app.post('/api/projects/:projectId/share', authMiddleware, async (req, res) => {
  if (!db) return res.status(500).json({ error: 'Database not initialized' });
  const userId = req.user.uid;
  const { projectId } = req.params;

  try {
    const projectRef = db.collection('users').doc(userId).collection('projects').doc(projectId);
    const projectSnap = await projectRef.get();
    if (!projectSnap.exists) return res.status(404).json({ error: 'Project not found' });

    // Get latest history entry to share
    const historySnap = await projectRef.collection('chatHistory').orderBy('timestamp', 'desc').limit(1).get();
    if (historySnap.empty) return res.status(404).json({ error: 'No architecture to share' });

    const latestEntry = historySnap.docs[0].data();
    const projectData = projectSnap.data();

    // Check if already shared
    const existingShareId = projectData.shareId;
    if (existingShareId) {
      return res.json({ shareId: existingShareId, shareUrl: `/p/${existingShareId}` });
    }

    // Generate a share ID (nanoid-style using crypto)
    const shareId = Array.from(crypto.getRandomValues(new Uint8Array(8)))
      .map(b => b.toString(16).padStart(2, '0')).join('');

    // Write to top-level shares collection (public readable)
    await db.collection('shares').doc(shareId).set({
      shareId,
      ownerId: userId,
      projectId,
      title: projectData.title,
      summary: projectData.summary,
      architecture: latestEntry.geminiResponse,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Mark project as shared
    await projectRef.update({ shareId, isPublic: true });

    res.json({ shareId, shareUrl: `/p/${shareId}` });
  } catch (err) {
    console.error('Share creation failed:', err);
    res.status(500).json({ error: 'Failed to create share link' });
  }
});

// DELETE /api/projects/:projectId/share — revoke public share
app.delete('/api/projects/:projectId/share', authMiddleware, async (req, res) => {
  if (!db) return res.status(500).json({ error: 'Database not initialized' });
  const userId = req.user.uid;
  const { projectId } = req.params;

  try {
    const projectRef = db.collection('users').doc(userId).collection('projects').doc(projectId);
    const snap = await projectRef.get();
    if (!snap.exists) return res.status(404).json({ error: 'Project not found' });

    const { shareId } = snap.data();
    if (shareId) {
      await db.collection('shares').doc(shareId).delete();
      await projectRef.update({ shareId: null, isPublic: false });
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Share revocation failed:', err);
    res.status(500).json({ error: 'Failed to revoke share link' });
  }
});

// GET /api/profile — fetch authenticated user profile details
app.get('/api/profile', authMiddleware, async (req, res) => {
  if (!db) return res.status(500).json({ error: 'Database not initialized' });
  const userId = req.user.uid;
  try {
    const userRef = db.collection('users').doc(userId);
    const snap = await userRef.get();
    if (!snap.exists) {
      return res.json({ profile: null });
    }
    const data = snap.data();
    res.json({ profile: data.profile || null });
  } catch (err) {
    console.error('Fetch profile failed:', err);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

// POST /api/profile — update authenticated user profile details with unique username check
app.post('/api/profile', authMiddleware, async (req, res) => {
  if (!db) return res.status(500).json({ error: 'Database not initialized' });
  const userId = req.user.uid;
  const { username, name, photoUrl, githubUrl, twitterUrl, linkedinUrl } = req.body;

  if (!username || !username.trim()) {
    return res.status(400).json({ error: 'Username is required' });
  }
  const cleanUsername = username.trim().toLowerCase();

  try {
    // Check if the username is already taken by another user
    const usernameQuery = await db.collection('users')
      .where('profile.username', '==', cleanUsername)
      .get();

    const isTaken = !usernameQuery.empty && usernameQuery.docs.some(doc => doc.id !== userId);
    if (isTaken) {
      return res.status(400).json({ error: 'Username is already taken' });
    }

    const userRef = db.collection('users').doc(userId);
    const profileData = {
      username: cleanUsername,
      name: name?.trim() || '',
      photoUrl: photoUrl?.trim() || '',
      githubUrl: githubUrl?.trim() || '',
      twitterUrl: twitterUrl?.trim() || '',
      linkedinUrl: linkedinUrl?.trim() || ''
    };

    await userRef.set({ profile: profileData }, { merge: true });
    res.json({ success: true, profile: profileData });
  } catch (err) {
    console.error('Save profile failed:', err);
    res.status(500).json({ error: 'Failed to save user profile' });
  }
});

// GET /api/public/:shareId — public read (no auth required)
app.get('/api/public/:shareId', async (req, res) => {
  if (!db) return res.status(500).json({ error: 'Database not initialized' });
  const { shareId } = req.params;

  try {
    const shareSnap = await db.collection('shares').doc(shareId).get();
    if (!shareSnap.exists) return res.status(404).json({ error: 'Share not found or has been revoked' });

    const data = shareSnap.data();

    // Dynamically fetch owner's profile details
    let authorProfile = null;
    const ownerId = data.ownerId;
    if (ownerId) {
      const ownerSnap = await db.collection('users').doc(ownerId).get();
      if (ownerSnap.exists) {
        authorProfile = ownerSnap.data().profile || null;
      }
    }

    res.json({
      shareId: data.shareId,
      title: data.title,
      summary: data.summary,
      architecture: data.architecture,
      createdAt: data.createdAt?.toDate?.()?.toISOString?.() || null,
      author: authorProfile ? {
        username: authorProfile.username || '',
        name: authorProfile.name || '',
        photoUrl: authorProfile.photoUrl || '',
        githubUrl: authorProfile.githubUrl || '',
        twitterUrl: authorProfile.twitterUrl || '',
        linkedinUrl: authorProfile.linkedinUrl || ''
      } : null
    });
  } catch (err) {
    console.error('Public share fetch failed:', err);
    res.status(500).json({ error: 'Failed to fetch shared architecture' });
  }
});

// GET /api/public/:shareId/comments — fetch comments for shared link (publicly readable)
app.get('/api/public/:shareId/comments', async (req, res) => {
  if (!db) return res.status(500).json({ error: 'Database not initialized' });
  const { shareId } = req.params;
  try {
    const snapshot = await db.collection('shares').doc(shareId).collection('comments').orderBy('timestamp', 'asc').get();
    const comments = [];
    snapshot.forEach(doc => {
      comments.push(doc.data());
    });
    res.json(comments);
  } catch (err) {
    console.error('Fetch comments failed:', err);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

// GET /api/notifications — fetch user notifications
app.get('/api/notifications', authMiddleware, async (req, res) => {
  if (!db) return res.status(500).json({ error: 'Database not initialized' });
  const userId = req.user.uid;
  try {
    const notificationsRef = db.collection('users').doc(userId).collection('notifications');
    const snapshot = await notificationsRef.orderBy('timestamp', 'desc').limit(50).get();
    const notifications = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      notifications.push({
        id: doc.id,
        ...data
      });
    });
    res.json(notifications);
  } catch (err) {
    console.error('Fetch notifications failed:', err);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// POST /api/notifications/:notificationId/read — mark notification as read
app.post('/api/notifications/:notificationId/read', authMiddleware, async (req, res) => {
  if (!db) return res.status(500).json({ error: 'Database not initialized' });
  const userId = req.user.uid;
  const { notificationId } = req.params;
  try {
    const notificationRef = db.collection('users').doc(userId).collection('notifications').doc(notificationId);
    await notificationRef.update({ read: true });
    res.json({ success: true });
  } catch (err) {
    console.error('Mark notification read failed:', err);
    res.status(500).json({ error: 'Failed to update notification' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────

const http = require('http');
const server = http.createServer(app);

// Initialize WebSockets Collaboration Server
const { initCollaboration } = require('./utils/collaboration');
initCollaboration(server, db);

server.listen(PORT, () => {
  console.log(`Express and WebSocket server listening on port ${PORT}`);
});
