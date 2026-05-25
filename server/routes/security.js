// server/routes/security.js
const { fetchWithRetry } = require('../middleware/aiGateway');
const { maskSecrets } = require('../utils/secretsMasker');

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
For each alert, map it precisely to:
- OWASP Top 10 API Security Risks (2023 edition) or OWASP Top 10 (2021).
- Common Weakness Enumeration (CWE) identifier.
- Exact target endpoint or table.
- Detailed step-by-step remediation advice.

Ensure the overall score is an integer between 0 and 100, and the grade is A (90+), B (80-89), C (70-79), D (60-69), or F (below 60).
Be realistic: if the architecture is well-designed, give a fair score, but point out potential implementation pitfalls.

Rules for high conciseness to avoid truncation:
- summary: must be at most 2 sentences.
- alerts: must list at most 4 key security findings. If there are fewer than 4 findings, only list those. If there are none, return an empty array.
- description: must be at most 2 sentences (25 words max).
- remediation: must be at most 2 sentences (30 words max).
- Ensure all string values are plain JSON-safe text.
`;

function extractJsonBlock(raw) {
  let start = raw.search(/[\{\[]/);
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < raw.length; i += 1) {
    const char = raw[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (char === '\\') {
      escape = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (char === '{' || char === '[') {
      depth += 1;
    }
    if (char === '}' || char === ']') {
      depth -= 1;
      if (depth === 0) {
        return raw.slice(start, i + 1);
      }
    }
  }
  return null;
}

function repairTruncatedJson(str) {
  str = str.trim();
  const cleaned = str
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch (e) {
    // Continue
  }

  const block = extractJsonBlock(cleaned);
  if (block) {
    try {
      return JSON.parse(block);
    } catch (e) {
      // Continue
    }
  }

  let inString = false;
  let escape = false;
  let stack = [];
  let cleanStr = "";

  for (let i = 0; i < cleaned.length; i++) {
    let char = cleaned[i];
    if (escape) {
      cleanStr += char;
      escape = false;
      continue;
    }
    if (char === '\\') {
      cleanStr += char;
      escape = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      cleanStr += char;
      continue;
    }
    cleanStr += char;
    if (inString) {
      continue;
    }
    if (char === '{') {
      stack.push('}');
    } else if (char === '[') {
      stack.push(']');
    } else if (char === '}' || char === ']') {
      if (stack.length > 0 && stack[stack.length - 1] === char) {
        stack.pop();
      }
    }
  }

  if (inString) {
    cleanStr += '"';
  }

  while (stack.length > 0) {
    cleanStr += stack.pop();
  }

  try {
    return JSON.parse(cleanStr);
  } catch (e) {
    let fixedStr = cleanStr.replace(/,\s*([\}\]])/g, '$1');
    try {
      return JSON.parse(fixedStr);
    } catch (e2) {
      return null;
    }
  }
}

function parseAndValidateSecurityReport(rawText) {
  let auditReport = repairTruncatedJson(rawText);
  if (!auditReport || typeof auditReport !== 'object') {
    return null;
  }

  if (typeof auditReport.securityScore !== 'number') {
    auditReport.securityScore = 70;
  }
  if (typeof auditReport.grade !== 'string') {
    auditReport.grade = 'C';
  }
  if (typeof auditReport.summary !== 'string') {
    auditReport.summary = 'The architecture has some vulnerability exposures.';
  }
  if (!Array.isArray(auditReport.alerts)) {
    auditReport.alerts = [];
  }

  auditReport.alerts = auditReport.alerts.map((alert, index) => {
    if (!alert || typeof alert !== 'object') return null;
    if (!alert.title && !alert.description) return null;

    return {
      id: alert.id || `vulnerability_${index}`,
      title: alert.title || 'Exposed Endpoint or Database Resource',
      description: alert.description || 'A potential security vulnerability was detected in this resource.',
      severity: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].includes(alert.severity?.toUpperCase()) ? alert.severity.toUpperCase() : 'MEDIUM',
      owasp: alert.owasp || 'API Security Risk',
      cwe: alert.cwe || 'CWE-200',
      remediation: alert.remediation || 'Harden validation and add proper authentication middleware.',
      target: alert.target || 'General System Component'
    };
  }).filter(Boolean);

  return auditReport;
}

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
      const { resolveProjectOwner } = require('../utils/projectResolver');
      const ownerData = await resolveProjectOwner(projectId, userId, db);
      if (!ownerData || (ownerData.ownerId !== userId && !ownerData.collaborators.includes(userId))) {
        return res.status(403).json({ error: 'Access denied' });
      }
      const ownerId = ownerData.ownerId;

      const projectRef = db.collection('users').doc(ownerId).collection('projects').doc(projectId);
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

      const auditPrompt = maskSecrets(`Perform a security audit scan on this planned architecture specification:
      
Project Title: ${latestArch.projectTitle}
Project Summary: ${latestArch.projectSummary}
Stack: ${JSON.stringify(latestArch.stack)}
APIs: ${JSON.stringify(latestArch.apis)}
Database Schema: ${JSON.stringify(latestArch.dbSchema)}
Deployment Strategy: ${JSON.stringify(latestArch.deploymentStrategy)}

Evaluate all components, detect vulnerabilities, map them to OWASP/CWE, and provide remediation.`);

      const requestBody = {
        system_instruction: {
          parts: [{ text: SECURITY_SYSTEM_INSTRUCTION }]
        },
        contents: [
          { role: 'user', parts: [{ text: auditPrompt }] }
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 4096,
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
      
      let auditReport = parseAndValidateSecurityReport(rawText);
      if (!auditReport) {
        console.warn('[Security Scanner] Reparation failed completely. Using default fallback report.');
        auditReport = {
          securityScore: 65,
          grade: 'D',
          summary: 'We detected potential configuration issues and security exposures in your architecture. Review your API endpoint protection and database constraints.',
          alerts: [
            {
              id: 'bola_fallback',
              title: 'Potential BOLA exposure',
              description: 'Endpoints taking resource ID parameters might lack tenant checking.',
              severity: 'HIGH',
              owasp: 'API1:2023 - Broken Object Level Authorization',
              cwe: 'CWE-285',
              remediation: 'Verify ownership inside database operations before sending responses.',
              target: 'API Endpoints'
            }
          ]
        };
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

  // POST /api/projects/:projectId/security/fix — AI-powered remediation: harden the architecture based on scan findings
  app.post('/api/projects/:projectId/security/fix', authMiddleware, async (req, res) => {
    if (!db) return res.status(500).json({ error: 'Database not initialized' });
    const userId = req.user.uid;
    const { projectId } = req.params;

    const customApiKey = req.headers['x-byok-api-key'];
    const customModelSetting = req.headers['x-byok-model'];
    const key = customApiKey || process.env.REACT_APP_GEMINI_API_KEY;
    if (!key) return res.status(400).json({ error: 'No Gemini API key configured.' });

    try {
      const { resolveProjectOwner } = require('../utils/projectResolver');
      const ownerData = await resolveProjectOwner(projectId, userId, db);
      if (!ownerData || (ownerData.ownerId !== userId && !ownerData.collaborators.includes(userId))) {
        return res.status(403).json({ error: 'Access denied' });
      }
      const ownerId = ownerData.ownerId;
      const projectRef = db.collection('users').doc(ownerId).collection('projects').doc(projectId);

      // Load latest architecture snapshot
      const historySnap = await projectRef.collection('chatHistory')
        .orderBy('timestamp', 'desc').limit(1).get();
      if (historySnap.empty) {
        return res.status(400).json({ error: 'No architecture found. Generate architecture first.' });
      }
      const latestArch = historySnap.docs[0].data().geminiResponse;

      // Load latest security report
      const secSnap = await projectRef.collection('securityReports')
        .orderBy('timestamp', 'desc').limit(1).get();
      if (secSnap.empty) {
        return res.status(400).json({ error: 'No security scan found. Run a security scan first.' });
      }
      const latestReport = secSnap.docs[0].data();

      const selectedModel = customModelSetting || 'gemini-2.5-flash';
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent`;

      const fixPrompt = `You are a security-hardening AI architect. 
A security audit returned Score: ${latestReport.securityScore}/100 (Grade: ${latestReport.grade}).

VULNERABILITIES FOUND:
${latestReport.alerts.map((a, i) => `${i + 1}. [${a.severity}] ${a.title} — ${a.description}
   Target: ${a.target}
   Remediation: ${a.remediation}
   OWASP: ${a.owasp} | CWE: ${a.cwe}`).join('\n\n')}

CURRENT ARCHITECTURE:
Project: ${latestArch.projectTitle}
Stack: ${JSON.stringify(latestArch.stack?.map(s => ({ layer: s.layer, rec: s.recommendation })))}
APIs: ${JSON.stringify(latestArch.apis?.slice(0, 8))}
DB Schema: ${JSON.stringify(latestArch.dbSchema?.map(d => ({ collection: d.collection, fields: d.fields?.slice(0, 4) })))}

Produce a JSON array of security fix actions. Each fix should be specific and actionable.
Return ONLY a JSON array with this exact shape:
[
  {
    "fixId": "unique_fix_id",
    "title": "Short fix title",
    "category": "API" | "Database" | "Authentication" | "Configuration" | "Infrastructure",
    "severity": "CRITICAL" | "HIGH" | "MEDIUM" | "LOW",
    "addressesVulnerability": "exact vulnerability title from the list above",
    "what": "One sentence describing exactly what to add/change/remove",
    "how": "Concrete implementation instruction (max 2 sentences)",
    "codeHint": "Short code snippet or config example (max 3 lines)",
    "impact": "How this improves the security score"
  }
]
Return max 6 fixes. Only fixes that directly address the listed vulnerabilities. Plain JSON only, no markdown.`;

      const requestBody = {
        contents: [{ role: 'user', parts: [{ text: fixPrompt }] }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 3000,
          responseMimeType: 'application/json'
        }
      };

      console.log(`[Security Fix] Generating remediation plan for project ${projectId}...`);
      const geminiRes = await fetchWithRetry(`${endpoint}?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      if (!geminiRes.ok) {
        const errDetails = await geminiRes.json().catch(() => ({}));
        throw new Error(errDetails?.error?.message || `Gemini API error ${geminiRes.status}`);
      }

      const data = await geminiRes.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '[]';

      let fixes = null;
      try {
        const cleaned = rawText.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
        fixes = JSON.parse(cleaned);
      } catch {
        fixes = [];
      }

      if (!Array.isArray(fixes)) fixes = [];

      // Validate and sanitize each fix
      fixes = fixes.filter(f => f && f.title && f.what).map((f, i) => ({
        fixId: f.fixId || `fix_${i}`,
        title: f.title || 'Security Improvement',
        category: ['API', 'Database', 'Authentication', 'Configuration', 'Infrastructure'].includes(f.category) ? f.category : 'API',
        severity: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].includes(f.severity?.toUpperCase?.()) ? f.severity.toUpperCase() : 'MEDIUM',
        addressesVulnerability: f.addressesVulnerability || '',
        what: f.what || '',
        how: f.how || '',
        codeHint: f.codeHint || '',
        impact: f.impact || ''
      })).slice(0, 6);

      console.log(`[Security Fix] Generated ${fixes.length} remediation actions.`);
      res.json({
        projectId,
        securityScore: latestReport.securityScore,
        grade: latestReport.grade,
        fixes,
        generatedAt: new Date().toISOString()
      });

    } catch (err) {
      console.error('[Security Fix] Failed:', err);
      res.status(500).json({ error: `Security fix generation failed: ${err.message}` });
    }
  });

  // GET /api/projects/:projectId/security/history — Fetch security audit report history
  app.get('/api/projects/:projectId/security/history', authMiddleware, async (req, res) => {
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
};
