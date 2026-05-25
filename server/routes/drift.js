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
      const { resolveProjectOwner } = require('../utils/projectResolver');
      const ownerData = await resolveProjectOwner(projectId, userId, db);
      if (!ownerData || ownerData.ownerId !== userId) {
        return res.status(403).json({ error: 'Only the project owner can configure repository integrations.' });
      }
      const ownerId = ownerData.ownerId;

      const projectRef = db.collection('users').doc(ownerId).collection('projects').doc(projectId);
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
      const { resolveProjectOwner } = require('../utils/projectResolver');
      const ownerData = await resolveProjectOwner(projectId, userId, db);
      if (!ownerData || (ownerData.ownerId !== userId && !ownerData.collaborators.includes(userId))) {
        return res.status(403).json({ error: 'Access denied' });
      }
      const ownerId = ownerData.ownerId;

      const projectRef = db.collection('users').doc(ownerId).collection('projects').doc(projectId);
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
          await triggerDriftAlert(ownerId, projectId, projectData.title || 'Project', scanResult.complianceScore, scanResult, db);
        } catch (notifErr) {
          console.error('[Drift API] Failed to trigger notification alert:', notifErr);
        }
      }

      // ── Security Regression Check (Shift-Left Automation) ──────────────
      // If new undocumented routes appeared that weren't in the architecture,
      // analyze them for security risk patterns and fire a regression alert.
      const extraRoutes = scanResult.routes?.extra || [];
      if (extraRoutes.length > 0) {
        try {
          const regressionAlerts = detectSecurityRegressions(extraRoutes);
          if (regressionAlerts.length > 0) {
            console.warn(`[Security Regression] Detected ${regressionAlerts.length} high-risk undocumented route(s) in project ${projectId}`);
            
            // Save regression alert to Firestore
            const regressionRef = projectRef.collection('securityRegressions').doc();
            await regressionRef.set({
              triggeredBy: 'drift_scan',
              driftReportId: newReportRef.id,
              alerts: regressionAlerts,
              extraRoutes,
              timestamp: serverTimestamp
            });

            // Fire notification to project owner
            try {
              const { triggerSecurityRegressionAlert } = require('../utils/notifications');
              if (typeof triggerSecurityRegressionAlert === 'function') {
                await triggerSecurityRegressionAlert(
                  ownerId, projectId, projectData.title || 'Project',
                  regressionAlerts, db
                );
              }
            } catch (notifErr) {
              // Notification utility may not have this method yet — non-fatal
              console.warn('[Drift API] Security regression notification skipped:', notifErr.message);
            }
          }
        } catch (regrErr) {
          console.warn('[Drift API] Security regression check failed (non-fatal):', regrErr.message);
        }
      }
      // ────────────────────────────────────────────────────────────────────

      res.status(201).json({
        id: newReportRef.id,
        ...reportData,
        timestamp: new Date().toISOString(),
        securityRegressions: extraRoutes.length > 0 ? detectSecurityRegressions(extraRoutes) : []
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
      const { resolveProjectOwner } = require('../utils/projectResolver');
      const ownerData = await resolveProjectOwner(projectId, userId, db);
      if (!ownerData || (ownerData.ownerId !== userId && !ownerData.collaborators.includes(userId))) {
        return res.status(403).json({ error: 'Access denied' });
      }
      const ownerId = ownerData.ownerId;

      const projectRef = db.collection('users').doc(ownerId).collection('projects').doc(projectId);
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
${scanResult.routes.missing.map(r => `- \`${r.method} ${r.route}\` (${r.description})`).join('\n')}
` : ''}
${scanResult.collections.missing.length > 0 ? `#### ⚠️ Missing Database Collections in Code
${scanResult.collections.missing.map(c => `- \`${c}\``).join('\n')}
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

// ── Security Regression Detector ─────────────────────────────────────────────
// Analyzes undocumented routes for high-risk security patterns.
// Called automatically after every drift scan that finds extra routes.

const HIGH_RISK_PATTERNS = [
  {
    id: 'UNAUTH_DELETE',
    test: (r) => r.method === 'DELETE',
    title: 'Undocumented DELETE endpoint',
    description: 'DELETE routes that were not planned may allow unauthorized data destruction.',
    severity: 'HIGH',
    owasp: 'API5:2023 - Broken Function Level Authorization'
  },
  {
    id: 'ADMIN_PATH',
    test: (r) => /\/(admin|root|superuser|internal|sys|manage)(\b|\/)/i.test(r.route),
    title: 'Undocumented admin route',
    description: 'Admin-like paths that are not in the architecture specification may bypass access controls.',
    severity: 'CRITICAL',
    owasp: 'API1:2023 - Broken Object Level Authorization'
  },
  {
    id: 'BULK_OPERATION',
    test: (r) => /\/(bulk|batch|mass|all|export|dump)\b/i.test(r.route),
    title: 'Undocumented bulk operation route',
    description: 'Bulk data endpoints can enable mass data extraction if not properly authorized.',
    severity: 'HIGH',
    owasp: 'API4:2023 - Unrestricted Resource Consumption'
  },
  {
    id: 'UNPLANNED_AUTH',
    test: (r) => /\/(auth|login|token|oauth|verify|reset|password)\b/i.test(r.route),
    title: 'Undocumented authentication route',
    description: 'Unplanned auth endpoints may bypass the designed authentication flow.',
    severity: 'CRITICAL',
    owasp: 'API2:2023 - Broken Authentication'
  },
  {
    id: 'DEBUG_ENDPOINT',
    test: (r) => /\/(debug|test|dev|health|ping|status|metrics|info)\b/i.test(r.route),
    title: 'Undocumented debug/info endpoint',
    description: 'Debug endpoints may expose internal system state to unauthorized users.',
    severity: 'MEDIUM',
    owasp: 'API9:2023 - Improper Inventory Management'
  }
];

function detectSecurityRegressions(extraRoutes) {
  const alerts = [];

  for (const route of extraRoutes) {
    for (const pattern of HIGH_RISK_PATTERNS) {
      if (pattern.test(route)) {
        // Avoid duplicate alerts for same pattern
        if (!alerts.find(a => a.id === pattern.id && a.route === route.route)) {
          alerts.push({
            id: `${pattern.id}_${route.method}_${route.route.replace(/\W/g, '_')}`,
            patternId: pattern.id,
            title: pattern.title,
            description: pattern.description,
            severity: pattern.severity,
            owasp: pattern.owasp,
            route: route.route,
            method: route.method,
            detectedAt: new Date().toISOString()
          });
        }
      }
    }
  }

  return alerts;
}
