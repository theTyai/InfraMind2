// server/routes/drift.js
const { analyzeRepositoryDrift } = require('../utils/driftEngine');
const crypto = require('crypto');

module.exports = function (app, db, admin, authMiddleware) {

  // POST /api/projects/:projectId/github — Associate GitHub repo configuration with a project
  app.post('/api/projects/:projectId/github', authMiddleware, async (req, res) => {
    if (!db) return res.status(500).json({ error: 'Database not initialized' });
    const userId = req.user.uid;
    const { projectId } = req.params;
    const { githubRepo, githubBranch } = req.body;

    if (!githubRepo || !githubRepo.trim() || !githubRepo.includes('/')) {
      return res.status(400).json({ error: 'Valid repository format owner/repo is required' });
    }

    try {
      const projectRef = db.collection('users').doc(userId).collection('projects').doc(projectId);
      const snap = await projectRef.get();
      if (!snap.exists) return res.status(404).json({ error: 'Project not found' });

      await projectRef.update({
        githubRepo: githubRepo.trim(),
        githubBranch: githubBranch?.trim() || 'main',
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      res.json({ success: true, githubRepo, githubBranch: githubBranch || 'main' });
    } catch (err) {
      console.error('[Drift API] Failed to save GitHub settings:', err);
      res.status(500).json({ error: 'Failed to update repository settings' });
    }
  });

  // POST /api/projects/:projectId/drift/scan — Trigger manual repository drift scan
  app.post('/api/projects/:projectId/drift/scan', authMiddleware, async (req, res) => {
    if (!db) return res.status(500).json({ error: 'Database not initialized' });
    const userId = req.user.uid;
    const { projectId } = req.params;

    try {
      // 1. Get project details and user access token
      const projectRef = db.collection('users').doc(userId).collection('projects').doc(projectId);
      const projectSnap = await projectRef.get();
      if (!projectSnap.exists) return res.status(404).json({ error: 'Project not found' });

      const projectData = projectSnap.data();
      const { githubRepo, githubBranch } = projectData;

      if (!githubRepo) {
        return res.status(400).json({ error: 'No GitHub repository connected to this project.' });
      }

      const userSnap = await db.collection('users').doc(userId).get();
      const userData = userSnap.data() || {};
      const accessToken = userData.githubAccessToken;

      if (!accessToken) {
        return res.status(400).json({ error: 'GitHub account not linked. Please authorize GitHub in settings first.' });
      }

      // 2. Load latest planned architecture specs (latest chatHistory snapshot)
      const historySnap = await projectRef.collection('chatHistory')
        .orderBy('timestamp', 'desc')
        .limit(1)
        .get();

      if (historySnap.empty) {
        return res.status(400).json({ error: 'No planned system architecture specs found. Generate architecture first.' });
      }

      const latestArchitecture = historySnap.docs[0].data().geminiResponse;
      const plannedApis = latestArchitecture.apis || [];
      const plannedDbSchema = latestArchitecture.dbSchema || [];

      // 3. Perform drift scan using drift engine
      const [owner, repo] = githubRepo.split('/');
      console.log(`[Drift API] Initiating drift scan for ${githubRepo} on branch ${githubBranch || 'main'}...`);

      const scanResult = await analyzeRepositoryDrift(
        owner,
        repo,
        githubBranch,
        accessToken,
        plannedApis,
        plannedDbSchema
      );

      // 4. Save report to driftHistory subcollection
      const driftHistoryRef = projectRef.collection('driftHistory');
      const newReportRef = driftHistoryRef.doc();
      const serverTimestamp = admin.firestore.FieldValue.serverTimestamp();

      const reportData = {
        complianceScore: scanResult.complianceScore,
        driftScore: scanResult.driftScore,
        scannedBranch: scanResult.scannedBranch,
        scannedFilesCount: scanResult.scannedFilesCount,
        routes: scanResult.routes,
        collections: scanResult.collections,
        timestamp: serverTimestamp
      };

      await newReportRef.set(reportData);

      // 5. Update main project document with latest score
      await projectRef.update({
        complianceScore: scanResult.complianceScore,
        driftScore: scanResult.driftScore,
        lastDriftScanAt: serverTimestamp
      });

      // Trigger notification if compliance is below 90%
      if (scanResult.complianceScore < 90) {
        try {
          const { triggerDriftAlert } = require('../utils/notifications');
          await triggerDriftAlert(userId, projectId, projectData.title || 'Project', scanResult.complianceScore, scanResult, db);
        } catch (notifErr) {
          console.error('[Drift API] Failed to trigger notification alert:', notifErr);
        }
      }

      res.status(201).json({
        id: newReportRef.id,
        ...reportData,
        timestamp: new Date().toISOString()
      });

    } catch (err) {
      console.error('[Drift API] Scan execution failed:', err);
      res.status(500).json({ error: `Drift scan failed: ${err.message}` });
    }
  });

  // GET /api/projects/:projectId/drift/history — Get drift scan reports history
  app.get('/api/projects/:projectId/drift/history', authMiddleware, async (req, res) => {
    if (!db) return res.status(500).json({ error: 'Database not initialized' });
    const userId = req.user.uid;
    const { projectId } = req.params;

    try {
      const projectRef = db.collection('users').doc(userId).collection('projects').doc(projectId);
      const historyRef = projectRef.collection('driftHistory');
      const snapshot = await historyRef.orderBy('timestamp', 'desc').limit(20).get();

      const reports = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        reports.push({
          id: doc.id,
          complianceScore: data.complianceScore,
          driftScore: data.driftScore,
          scannedBranch: data.scannedBranch,
          scannedFilesCount: data.scannedFilesCount,
          routes: data.routes,
          collections: data.collections,
          timestamp: data.timestamp ? data.timestamp.toDate().toISOString() : null
        });
      });

      res.json(reports);
    } catch (error) {
      console.error('[Drift API] Failed to fetch history:', error);
      res.status(500).json({ error: 'Failed to fetch drift history' });
    }
  });

  // POST /api/webhooks/github — Webhook receiver for GitHub push & PR events
  app.post('/api/webhooks/github', async (req, res) => {
    if (!db) return res.status(500).json({ error: 'Database not initialized' });

    const signature = req.headers['x-hub-signature-256'];
    const event = req.headers['x-github-event'];

    // Optional Webhook HMAC signature validation
    const secret = process.env.GITHUB_WEBHOOK_SECRET;
    if (secret && signature) {
      const payloadString = JSON.stringify(req.body);
      const hmac = crypto.createHmac('sha256', secret);
      const digest = 'sha256=' + hmac.update(payloadString).digest('hex');
      if (signature !== `sha256=${digest}`) {
        return res.status(401).json({ error: 'Invalid webhook signature' });
      }
    }

    const payload = req.body;
    if (!payload || !payload.repository) {
      return res.status(400).json({ error: 'Invalid payload' });
    }

    const githubRepoName = payload.repository.full_name; // e.g. "owner/repo"
    console.log(`[GitHub Webhook] Received ${event} event for repo ${githubRepoName}`);

    res.status(200).json({ received: true }); // respond early to prevent timeout

    // Perform drift analysis asynchronously in background
    try {
      // Find all projects connected to this repository (across all users)
      const projectsQuery = await db.group('projects')
        .where('githubRepo', '==', githubRepoName)
        .get();

      if (projectsQuery.empty) {
        console.log(`[GitHub Webhook] No projects connected to repo ${githubRepoName}`);
        return;
      }

      for (const doc of projectsQuery.docs) {
        const projectData = doc.data();
        const projectId = doc.id;
        const projectRef = doc.ref;

        // Find owner ID from document path structure: /users/{uid}/projects/{projectId}
        const pathParts = projectRef.path.split('/');
        const ownerId = pathParts[1];

        // Fetch owner access token
        const ownerSnap = await db.collection('users').doc(ownerId).get();
        if (!ownerSnap.exists) continue;
        const ownerData = ownerSnap.data();
        const accessToken = ownerData.githubAccessToken;

        if (!accessToken) {
          console.warn(`[GitHub Webhook] Owner ${ownerId} has no access token linked`);
          continue;
        }

        // Determine target branch
        let targetBranch = projectData.githubBranch || 'main';

        // If push event, we can match branch
        if (event === 'push') {
          const refBranch = payload.ref.replace('refs/heads/', '');
          if (refBranch !== targetBranch) {
            console.log(`[GitHub Webhook] Push branch ${refBranch} does not match configured target ${targetBranch}. Skipping.`);
            continue;
          }
        }

        // If pull_request event, target branch is the PR head ref
        let prNumber = null;
        if (event === 'pull_request') {
          if (payload.action !== 'opened' && payload.action !== 'synchronize') {
            continue;
          }
          targetBranch = payload.pull_request.head.ref;
          prNumber = payload.pull_request.number;
        }

        // Load latest planned architecture specs
        const historySnap = await projectRef.collection('chatHistory')
          .orderBy('timestamp', 'desc')
          .limit(1)
          .get();

        if (historySnap.empty) continue;
        const latestArchitecture = historySnap.docs[0].data().geminiResponse;
        const plannedApis = latestArchitecture.apis || [];
        const plannedDbSchema = latestArchitecture.dbSchema || [];

        // Run analysis
        const [owner, repo] = githubRepoName.split('/');
        const scanResult = await analyzeRepositoryDrift(
          owner,
          repo,
          targetBranch,
          accessToken,
          plannedApis,
          plannedDbSchema
        );

        // Save report
        const serverTimestamp = admin.firestore.FieldValue.serverTimestamp();
        await projectRef.collection('driftHistory').add({
          complianceScore: scanResult.complianceScore,
          driftScore: scanResult.driftScore,
          scannedBranch: scanResult.scannedBranch,
          scannedFilesCount: scanResult.scannedFilesCount,
          routes: scanResult.routes,
          collections: scanResult.collections,
          timestamp: serverTimestamp,
          trigger: `webhook-${event}`
        });

        // Update score
        await projectRef.update({
          complianceScore: scanResult.complianceScore,
          driftScore: scanResult.driftScore,
          lastDriftScanAt: serverTimestamp
        });

        // Trigger notification if compliance is below 90%
        if (scanResult.complianceScore < 90) {
          try {
            const { triggerDriftAlert } = require('../utils/notifications');
            await triggerDriftAlert(ownerId, projectId, projectData.title || 'Project', scanResult.complianceScore, scanResult, db);
          } catch (notifErr) {
            console.error('[GitHub Webhook] Failed to trigger notification alert:', notifErr);
          }
        }

        console.log(`[GitHub Webhook] Completed drift scan for project ${projectId}. Score: ${scanResult.complianceScore}%`);

        // Post comment to PR if this is a PR event
        if (event === 'pull_request' && prNumber) {
          try {
            const commentBody = `### 🔍 InfraMind Architecture Compliance Report
**Branch:** \`${targetBranch}\`
**Compliance Score:** \`${scanResult.complianceScore}%\` | **Drift Score:** \`${scanResult.driftScore}%\`

#### 📊 Summary
- **API Routes:** ${scanResult.routes.matchingCount} / ${scanResult.routes.totalPlanned} matching
- **Database Tables:** ${scanResult.collections.matchingCount} / ${scanResult.collections.totalPlanned} matching

${scanResult.routes.missing.length > 0 ? `#### ⚠️ Missing API Routes in Code
| Method | Route | Description |
|--------|-------|-------------|
${scanResult.routes.missing.map(r => `| \`${r.method}\` | \`${r.route}\` | ${r.description} |`).join('\n')}
` : ''}
${scanResult.collections.missing.length > 0 ? `#### ⚠️ Missing Database Collections in Code
| Collection Name |
|-----------------|
${scanResult.collections.missing.map(c => `| \`${c}\` |`).join('\n')}
` : ''}

*Report generated automatically by [InfraMind](https://inframind.ai).*`;

            await fetch(`https://api.github.com/repos/${owner}/${repo}/issues/${prNumber}/comments`, {
              method: 'POST',
              headers: {
                'Authorization': `token ${accessToken}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json',
                'User-Agent': 'InfraMind-App'
              },
              body: JSON.stringify({ body: commentBody })
            });

            console.log(`[GitHub Webhook] Posted compliance comment to PR #${prNumber}`);
          } catch (commentErr) {
            console.error('[GitHub Webhook] Failed to comment on PR:', commentErr);
          }
        }
      }
    } catch (bgErr) {
      console.error('[GitHub Webhook] Background processor failed:', bgErr);
    }
  });
};

