// server/routes/githubAuth.js
const crypto = require('crypto');

module.exports = function (app, db, admin, authMiddleware) {
  const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID || '';
  const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET || '';
  const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
  const API_BASE_URL = process.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

  // Endpoint to generate GitHub OAuth URL
  app.get('/api/auth/github/url', authMiddleware, async (req, res) => {
    const userId = req.user.uid;

    if (!GITHUB_CLIENT_ID) {
      return res.status(500).json({ error: 'GitHub Client ID not configured on server' });
    }

    // Use user's UID as state to map it back on callback
    const state = userId; 
    const callbackUrl = `${API_BASE_URL}/auth/github/callback`;
    
    const githubUrl = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent(callbackUrl)}&scope=repo,read:org&state=${state}`;

    res.json({ url: githubUrl });
  });

  // OAuth callback endpoint from GitHub
  app.get('/api/auth/github/callback', async (req, res) => {
    const { code, state } = req.query;

    if (!code || !state) {
      return res.redirect(`${FRONTEND_URL}/dashboard?github=error&message=missing_parameters`);
    }

    // The state contains the Firebase UID
    const userId = state;

    try {
      // Exchange code for Access Token
      const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          client_id: GITHUB_CLIENT_ID,
          client_secret: GITHUB_CLIENT_SECRET,
          code
        })
      });

      if (!tokenRes.ok) {
        throw new Error(`GitHub OAuth token exchange failed with status ${tokenRes.status}`);
      }

      const tokenData = await tokenRes.json();
      
      if (tokenData.error) {
        throw new Error(tokenData.error_description || tokenData.error);
      }

      const accessToken = tokenData.access_token;
      if (!accessToken) {
        throw new Error('Access token not returned from GitHub');
      }

      if (!db) {
        throw new Error('Database not initialized');
      }

      // Save access token to user profile
      const userRef = db.collection('users').doc(userId);
      await userRef.set({
        githubAccessToken: accessToken,
        githubLinkedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });

      console.log(`[GitHub Auth] Successfully linked GitHub account for user: ${userId}`);
      res.redirect(`${FRONTEND_URL}/dashboard?github=success`);

    } catch (err) {
      console.error('[GitHub Auth] OAuth callback failed:', err);
      res.redirect(`${FRONTEND_URL}/dashboard?github=error&message=${encodeURIComponent(err.message)}`);
    }
  });

  // Endpoint to unlink GitHub account
  app.post('/api/auth/github/unlink', authMiddleware, async (req, res) => {
    if (!db) {
      return res.status(500).json({ error: 'Database not initialized' });
    }
    const userId = req.user.uid;
    try {
      const userRef = db.collection('users').doc(userId);
      await userRef.update({
        githubAccessToken: admin.firestore.FieldValue.delete(),
        githubLinkedAt: admin.firestore.FieldValue.delete()
      });
      res.json({ success: true });
    } catch (error) {
      console.error('[GitHub Auth] Unlink failed:', error);
      res.status(500).json({ error: 'Failed to unlink GitHub account' });
    }
  });

  // Endpoint to fetch GitHub integration status
  app.get('/api/auth/github/status', authMiddleware, async (req, res) => {
    if (!db) {
      return res.status(500).json({ error: 'Database not initialized' });
    }
    const userId = req.user.uid;
    try {
      const userSnap = await db.collection('users').doc(userId).get();
      if (!userSnap.exists) {
        return res.json({ linked: false });
      }
      const data = userSnap.data();
      res.json({
        linked: !!data.githubAccessToken,
        linkedAt: data.githubLinkedAt ? data.githubLinkedAt.toDate().toISOString() : null
      });
    } catch (error) {
      console.error('[GitHub Auth] Status fetch failed:', error);
      res.status(500).json({ error: 'Failed to get integration status' });
    }
  });
};
