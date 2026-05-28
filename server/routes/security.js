// server/routes/security.js
const { fetchWithRetry } = require('../middleware/aiGateway');

const SECURITY_RESPONSE_SCHEMA = {
  type: 'OBJECT',
  required: ['securityScore', 'grade', 'summary', 'alerts'],
  properties: {
    securityScore: { type: 'INTEGER' },
    grade: { type: 'STRING' },
    summary: { type: 'STRING' },
    alerts: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        required: ['id', 'title', 'description', 'severity', 'owasp', 'cwe', 'remediation', 'target'],
        properties: {
          id: { type: 'STRING' },
          title: { type: 'STRING' },
          description: { type: 'STRING' },
          severity: { type: 'STRING' }, // "CRITICAL", "HIGH", "MEDIUM", "LOW"
          owasp: { type: 'STRING' },    // e.g. "API1:2023 - Broken Object Level Authorization"
          cwe: { type: 'STRING' },      // e.g. "CWE-285"
          remediation: { type: 'STRING' },
          target: { type: 'STRING' }     // route path or database table
        }
      }
    }
  }
};

const SECURITY_SYSTEM_INSTRUCTION = `You are an expert security auditor and penetration testing engineer specializing in API security and database hardening.
Your task is to analyze the planned architecture specification of a project (the tech stack, API endpoints, database schemas, and summary description) and perform a comprehensive security posture scan.

Look for vulnerability vectors such as:
1. Broken Object Level Authorization (BOLA / IDOR) on endpoints with ID parameters (e.g. missing auth or tenancy checks).
2. Broken User Authentication (endpoints that should be protected but aren't, or weak auth designs).
3. Insecure CORS policies or CORS configurations.
4. Secret leak hazards (storing keys, passwords, or PII unhashed in database schemas).
5. Injection risks (SQL/NoSQL/Command injection in routes processing input).
6. Missing Rate Limiting or DDoS exposures.

Format your output as valid JSON matching the provided schema.
Limit your alerts array to the top 5 most critical vulnerabilities to avoid output truncation.
For each alert, map it precisely to:
- OWASP Top 10 API Security Risks (2023 edition) or OWASP Top 10 (2021).
- Common Weakness Enumeration (CWE) identifier.
- Exact target endpoint or table.
- Detailed step-by-step remediation advice.

Ensure the overall score is an integer between 0 and 100, and the grade is A (90+), B (80-89), C (70-79), D (60-69), or F (below 60).
Be realistic: if the architecture is well-designed, give a fair score, but point out potential implementation pitfalls.
Keep the summary concise (max 3 sentences) to avoid output truncation.
`;

module.exports = function (app, db, admin, authMiddleware) {

  // POST /api/projects/:projectId/security/scan — Perform AI-driven security audit scan
  app.post('/api/projects/:projectId/security/scan', authMiddleware, async (req, res) => {
    if (!db) return res.status(500).json({ error: 'Database not initialized' });
    const userId = req.user.uid;
    const { projectId } = req.params;

    // Extract BYOK headers
    const customApiKey = req.headers['x-byok-api-key'];
    const customModelSetting = req.headers['x-byok-model'];

    const key = customApiKey || process.env.REACT_APP_GEMINI_API_KEY;
    if (!key) {
      return res.status(400).json({
        error: 'No Gemini API key configured. Provide an x-byok-api-key header or set REACT_APP_GEMINI_API_KEY.'
      });
    }

    try {
      // 1. Get project specs
      const projectRef = db.collection('users').doc(userId).collection('projects').doc(projectId);
      const projectSnap = await projectRef.get();
      if (!projectSnap.exists) return res.status(404).json({ error: 'Project not found' });

      // Load latest history snapshot
      const historySnap = await projectRef.collection('chatHistory')
        .orderBy('timestamp', 'desc')
        .limit(1)
        .get();

      if (historySnap.empty) {
        return res.status(400).json({ error: 'No planned system architecture specs found. Generate architecture first.' });
      }

      const latestArch = historySnap.docs[0].data().geminiResponse;

      // 2. Prepare payload for Gemini
      const selectedModel = customModelSetting || 'gemini-2.5-flash'; // Flash is fast and cheap for security reviews
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent`;

      const auditPrompt = `Perform a security audit scan on this planned architecture specification:
      
Project Title: ${latestArch.projectTitle}
Project Summary: ${latestArch.projectSummary}
Stack: ${JSON.stringify(latestArch.stack)}
APIs: ${JSON.stringify(latestArch.apis)}
Database Schema: ${JSON.stringify(latestArch.dbSchema)}
Deployment Strategy: ${JSON.stringify(latestArch.deploymentStrategy)}

Evaluate all components, detect vulnerabilities, map them to OWASP/CWE, and provide remediation.`;

      const requestBody = {
        system_instruction: {
          parts: [{ text: SECURITY_SYSTEM_INSTRUCTION }]
        },
        contents: [
          { role: 'user', parts: [{ text: auditPrompt }] }
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 8192,
          responseMimeType: 'application/json',
          responseSchema: SECURITY_RESPONSE_SCHEMA
        }
      };

      console.log(`[Security Scanner] Initiating scan for project ${projectId} using ${selectedModel}...`);

      const geminiRes = await fetchWithRetry(`${endpoint}?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      if (!geminiRes.ok) {
        const errDetails = await geminiRes.json().catch(() => ({}));
        const errMsg = errDetails?.error?.message || `Gemini API returned error status ${geminiRes.status}`;
        throw new Error(errMsg);
      }

      const data = await geminiRes.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

      let auditReport;
      try {
        auditReport = JSON.parse(rawText.trim());
      } catch (parseErr) {
        console.error('[Security Scanner] JSON Parsing failed on raw text:', rawText);
        throw new Error('AI returned an invalid security audit response schema.');
      }

      // 3. Save report to Firestore subcollection
      const securityReportsRef = projectRef.collection('securityReports');
      const newReportRef = securityReportsRef.doc();
      const serverTimestamp = admin.firestore.FieldValue.serverTimestamp();

      const reportPayload = {
        securityScore: auditReport.securityScore,
        grade: auditReport.grade,
        summary: auditReport.summary,
        alerts: auditReport.alerts,
        timestamp: serverTimestamp
      };

      await newReportRef.set(reportPayload);

      // 4. Update project document
      await projectRef.update({
        securityScore: auditReport.securityScore,
        securityGrade: auditReport.grade,
        lastSecurityScanAt: serverTimestamp
      });

      // Trigger notification alert if score drops or alerts exist
      try {
        const { triggerSecurityAlert } = require('../utils/notifications');
        await triggerSecurityAlert(userId, projectId, projectSnap.data().title || 'Project', auditReport.securityScore, auditReport.alerts, db);
      } catch (notifErr) {
        console.error('[Security API] Failed to trigger notification alert:', notifErr);
      }

      res.status(201).json({
        id: newReportRef.id,
        ...reportPayload,
        timestamp: new Date().toISOString()
      });

    } catch (err) {
      console.error('[Security API] Scan failed:', err);
      res.status(500).json({ error: `Security audit failed: ${err.message}` });
    }
  });

  // GET /api/projects/:projectId/security/history — Fetch security audit report history
  app.get('/api/projects/:projectId/security/history', authMiddleware, async (req, res) => {
    if (!db) return res.status(500).json({ error: 'Database not initialized' });
    const userId = req.user.uid;
    const { projectId } = req.params;

    try {
      const projectRef = db.collection('users').doc(userId).collection('projects').doc(projectId);
      const reportsRef = projectRef.collection('securityReports');
      const snapshot = await reportsRef.orderBy('timestamp', 'desc').limit(20).get();

      const reports = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        reports.push({
          id: doc.id,
          securityScore: data.securityScore,
          grade: data.grade,
          summary: data.summary,
          alerts: data.alerts,
          timestamp: data.timestamp ? data.timestamp.toDate().toISOString() : null
        });
      });

      res.json(reports);
    } catch (error) {
      console.error('[Security API] History fetch failed:', error);
      res.status(500).json({ error: 'Failed to fetch security audit history' });
    }
  });

  // POST /api/projects/:projectId/security/fix — Generate remediation plan
  app.post('/api/projects/:projectId/security/fix', authMiddleware, async (req, res) => {
    if (!db) return res.status(500).json({ error: 'Database not initialized' });
    const userId = req.user.uid;
    const { projectId } = req.params;

    try {
      const projectRef = db.collection('users').doc(userId).collection('projects').doc(projectId);
      const projectSnap = await projectRef.get();
      if (!projectSnap.exists) return res.status(404).json({ error: 'Project not found' });

      const reportsRef = projectRef.collection('securityReports');
      const latestReportSnap = await reportsRef.orderBy('timestamp', 'desc').limit(1).get();
      
      if (latestReportSnap.empty) {
        return res.status(400).json({ error: 'No security scan found. Run an audit first.' });
      }

      const latestReport = latestReportSnap.docs[0].data();
      
      if (!latestReport.alerts || latestReport.alerts.length === 0) {
        return res.json({
          securityScore: latestReport.securityScore,
          grade: latestReport.grade,
          fixes: []
        });
      }

      // Generate a mock response for now, in a real app this would call Gemini again
      // to generate detailed code snippets based on the alerts.
      const fixes = latestReport.alerts.map((alert, idx) => ({
        fixId: `fix-${idx}`,
        title: `Remediate ${alert.title}`,
        severity: alert.severity,
        category: alert.owasp || 'Security',
        what: alert.description,
        how: alert.remediation,
        codeHint: alert.target.includes('API') ? 
          `// Apply middleware to ${alert.target}\napp.use('${alert.target}', rateLimiter, authMiddleware);` :
          `-- Apply fix to ${alert.target}\nALTER TABLE ${alert.target} ADD COLUMN is_secure BOOLEAN;`,
        impact: 'Reduces vulnerability footprint'
      }));

      res.json({
        securityScore: latestReport.securityScore,
        grade: latestReport.grade,
        fixes
      });
    } catch (err) {
      console.error('[Security API] Fix generation failed:', err);
      res.status(500).json({ error: `Security fix generation failed: ${err.message}` });
    }
  });
};
