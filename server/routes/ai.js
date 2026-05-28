// server/routes/ai.js

const { aiRateLimiter, aiRequestTracer, fetchWithRetry } = require('../middleware/aiGateway');
const AIGatewayService = require('../services/AIGatewayService');
const { Worker } = require('worker_threads');
const path = require('path');

const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  required: [
    'projectTitle',
    'projectSummary',
    'stack',
    'apis',
    'dbSchema',
    'mermaidDiagram',
    'userFlowDiagram',
    'architectureExplanation',
    'scalability',
    'deploymentStrategy',
    'mvpRoadmap',
  ],
  properties: {
    projectTitle: { type: 'STRING' },
    projectSummary: { type: 'STRING' },
    stack: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        required: ['layer', 'recommendation', 'reason', 'alternatives', 'fit'],
        properties: {
          layer: { type: 'STRING' },
          recommendation: { type: 'STRING' },
          reason: { type: 'STRING' },
          alternatives: {
            type: 'ARRAY',
            items: { type: 'STRING' },
          },
          fit: { type: 'STRING' },
        },
      },
    },
    apis: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        required: ['method', 'route', 'description'],
        properties: {
          method: { type: 'STRING' },
          route: { type: 'STRING' },
          description: { type: 'STRING' },
        },
      },
    },
    dbSchema: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        required: ['collection', 'fields'],
        properties: {
          collection: { type: 'STRING' },
          fields: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              required: ['name', 'type', 'note'],
              properties: {
                name: { type: 'STRING' },
                type: { type: 'STRING' },
                note: { type: 'STRING' },
              },
            },
          },
        },
      },
    },
    mermaidDiagram: { type: 'STRING' },
    userFlowDiagram: { type: 'STRING' },
    architectureExplanation: {
      type: 'OBJECT',
      required: ['whyThisStack', 'keyDecisions', 'tradeoffs'],
      properties: {
        whyThisStack: { type: 'STRING' },
        keyDecisions: {
          type: 'ARRAY',
          items: { type: 'STRING' },
        },
        tradeoffs: {
          type: 'ARRAY',
          items: { type: 'STRING' },
        },
      },
    },
    scalability: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        required: ['area', 'icon', 'detail'],
        properties: {
          area: { type: 'STRING' },
          icon: { type: 'STRING' },
          detail: { type: 'STRING' },
        },
      },
    },
    deploymentStrategy: {
      type: 'OBJECT',
      required: ['development', 'staging', 'production'],
      properties: {
        development: { type: 'STRING' },
        staging: { type: 'STRING' },
        production: { type: 'STRING' },
      },
    },
    mvpRoadmap: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        required: ['phase', 'duration', 'tasks'],
        properties: {
          phase: { type: 'STRING' },
          duration: { type: 'STRING' },
          tasks: {
            type: 'ARRAY',
            items: { type: 'STRING' },
          },
        },
      },
    },
    efficiencyScorecard: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        required: ['suggestion', 'reason'],
        properties: {
          suggestion: { type: 'STRING' },
          reason: { type: 'STRING' },
        },
      },
    },
  },
};

const SYSTEM_INSTRUCTION = `You are a senior software architect and principal engineer at a top tech company.
Your job is to analyze a project idea and the user's known tech stack, then produce a complete, production-ready architecture recommendation.

Return only JSON that matches the provided schema.

Rules for high conciseness to avoid truncation:
- projectTitle: You MUST generate a unique, creative, and highly specific title that accurately reflects the user's exact project idea. ABSOLUTELY NEVER use the generic title "High-Availability E-commerce Platform".
- projectSummary: MUST be a concise summary of the user's specific project idea.
- stack: must have 5-7 items. The "reason" for each item must be at most 1 short sentence (15 words max).
- apis: must have 6-8 realistic, project-specific routes (limit description to 10 words).
- dbSchema: must have 3 collections or tables with 3-4 fields each (limit note to 10 words).
- mermaidDiagram: must be a valid Mermaid flowchart TD diagram (graph TD)
  STRICT FORMATTING RULES:
  1. NEVER generate simple 'User -> Frontend -> Backend' diagrams. This is a failure state.
  2. MANDATORY CLUSTERING: You MUST use 'subgraph' blocks for every diagram. 
     - Cluster services using valid Mermaid syntax: subgraph Frontend["Frontend Layer"], subgraph API["API & Microservices Layer"], and subgraph Persistence["Persistence & External Layer"].
  3. MANDATORY NODES: If the user provides a simple project, you must INFER the professional structure:
     - Frontend: Client["<i class='fa fa-mobile'></i> Client (React/Next.js)"]
     - API Layer: Gateway["<i class='fa fa-network-wired'></i> API Gateway (Kong/Cloudflare)"], Auth["<i class='fa fa-shield'></i> Auth Service"], Core["<i class='fa fa-server'></i> Core Business Logic Service"]
     - Persistence: DB[("<i class='fa fa-database'></i> Primary Database (PostgreSQL)")], Cache[("<i class='fa fa-bolt'></i> Caching Layer (Redis)")], Ext["<i class='fa fa-plug'></i> External API Integration"]
  4. CONNECTION TYPES:
     - Use '-->' for synchronous API calls (e.g., API_Gateway -->|"Authenticate User"| Auth_Service).
     - Use '-.->' for asynchronous/caching/events (e.g., Service -.->|"Cache Data"| Redis).
  5. VISUAL HIERARCHY:
     - Service nodes MUST be rectangles.
     - Database/Cache nodes MUST be cylinders.
     - Use 'graph TD' for a Top-Down hierarchical view.
  6. CLICK HANDLERS: Append 'click' event handles to all primary architecture nodes so they can be selected in the UI. Example click binding format at the end of the diagram definition:
     click Client onNodeClick
     click Database onNodeClick
  7. CRITICAL SYNTAX RULE:
     - Always wrap node labels in double quotes (e.g., NodeID["Label"]).
     - NEVER use colons for edge labels. Instead, use the pipe syntax for connection descriptions: A -->|"Edge Label"| B.
     - Subgraph names must be in double quotes (e.g., subgraph "Edge Layer").
  8. ICON MANDATE: Use FontAwesome icons for all nodes to represent their function.
     - Wrap the label in a double-quoted string with an icon class prefix. Syntax: NodeID["<i class='fa fa-iconname'></i> Label"].
     - Mapping: Users/Clients (fa-user/fa-mobile), Services/APIs (fa-server/fa-code), Databases (fa-database), Auth (fa-shield), Caching (fa-bolt), Analytics (fa-chart-line), External (fa-plug).
  If you produce a diagram with fewer than 6 nodes, you have failed to provide an architectural representation. EXPLAIN the architecture in depth via the diagram complexity.
- userFlowDiagram: must be a valid Mermaid sequenceDiagram (max 4-5 steps to keep it short). Add event triggers or action labels to the lines between components (e.g., Client-->>API: GET /users).
- efficiencyScorecard: Generate 2-3 proactive suggestions (e.g., "Add Caching Layer") for the architecture. Limit reason to 1 short sentence.
- scalability: must have exactly 3 items, with details limited to 1 sentence.
- architectureExplanation: keyDecisions and tradeoffs must be short arrays of 3 items max. whyThisStack must be at most 1 sentence.
- deploymentStrategy: development, staging, production must be at most 1 sentence each.
- mvpRoadmap: must have 3 phases max with 3 tasks per phase max.
- fit: must be exactly "high", "medium", or "low".
- if the user already knows a technology that fits, use it and set fit to "high".
- keep all string values plain JSON-safe text.
`;

function extractJsonText(apiData) {
  const parts = apiData?.candidates?.[0]?.content?.parts || [];
  return parts
    .map((part) => (typeof part?.text === 'string' ? part.text : ''))
    .join('')
    .trim();
}

async function tryParseJson(raw) {
  return new Promise((resolve) => {
    const workerPath = path.join(__dirname, '../utils/jsonWorker.js');
    const worker = new Worker(workerPath);
    
    worker.on('message', (message) => {
      if (message.error) {
        console.warn('[JSON Worker Error]', message.error, message.details || '');
        resolve(null);
      } else {
        resolve(message.data);
      }
      worker.terminate();
    });
    
    worker.on('error', (err) => {
      console.error('[JSON Worker Fatal]', err);
      resolve(null);
      worker.terminate();
    });
    
    worker.on('exit', (code) => {
      if (code !== 0) {
        console.error(`[JSON Worker] stopped with exit code ${code}`);
        resolve(null);
      }
    });
    
    worker.postMessage(raw);
  });
}

function validateArchitectureShape(data) {
  if (!data || typeof data !== 'object') return false;
  return [
    typeof data.projectTitle === 'string',
    typeof data.projectSummary === 'string',
    Array.isArray(data.stack),
    Array.isArray(data.apis),
    Array.isArray(data.dbSchema),
    typeof data.mermaidDiagram === 'string',
    typeof data.userFlowDiagram === 'string',
    data.architectureExplanation && typeof data.architectureExplanation === 'object',
    Array.isArray(data.scalability),
    data.deploymentStrategy && typeof data.deploymentStrategy === 'object',
    Array.isArray(data.mvpRoadmap),
    Array.isArray(data.efficiencyScorecard),
  ].every(Boolean);
}

// Inline repair loop removed. Logic moved to AIGatewayService.

module.exports = function (app, db, admin, authMiddleware) {
  // Centralized route to handle AI requests securely via the AI Gateway
  app.post('/api/ai/generate', authMiddleware, aiRateLimiter, aiRequestTracer, async (req, res) => {
    if (!db) {
      return res.status(500).json({ error: 'Database not initialized' });
    }

    const userId = req.user.uid;
    const { idea, knownStack, projectId, startupMode, infrastructureMode, serviceOverrides, projectScalingStage } = req.body;

    if (!idea || !idea.trim()) {
      return res.status(400).json({ error: 'Idea prompt description is required' });
    }

    // Auto-selection evaluation: check if prompt mentions MVP, Simple, Lean, or Free
    const isZeroCostStartup = startupMode || 
      /mvp/i.test(idea) || 
      /simple/i.test(idea) || 
      /lean/i.test(idea) || 
      /free/i.test(idea);

    let promptModifier = '';
    
    // Determine scaling stage label
    const scalingLabels = {
      1: 'Lean MVP',
      2: 'Early Startup',
      3: 'High Growth',
      4: 'Planet Scale'
    };
    const scaleContext = scalingLabels[projectScalingStage] || 'Early Startup';

    promptModifier += `\\n\\nSCALING CONTEXT: Design this architecture for a ${scaleContext} phase.`;

    if (infrastructureMode === 'MANUAL_OVERRIDE' && serviceOverrides && Object.keys(serviceOverrides).length > 0) {
      promptModifier += `\\n\\nINFRASTRUCTURE STRATEGY: MANUAL_OVERRIDE. 
Strictly respect the user's service tier selections provided in the current state. The user has overridden the following services:
${JSON.stringify(serviceOverrides, null, 2)}
Do NOT change these services in your recommendation. Bind the architecture strictly to these service tiers.`;
    } else if (infrastructureMode === 'AUTO_FREE' || isZeroCostStartup) {
      promptModifier += `\\n\\nINFRASTRUCTURE STRATEGY: AUTO_FREE.
Bias all technology recommendations toward managed, free-tier services (e.g., Supabase Free, Vercel Hobby, MongoDB Atlas Free, Railway Starter). Do NOT recommend enterprise or highly complex self-hosted solutions unless absolutely necessary.`;
    } else {
      promptModifier += `\\n\\nIMPORTANT: Enterprise mode architecture.
- Feel free to recommend Kafka, Kubernetes, Multi-region Redis, AWS/GCP services, and multi-region replication if the requirements warrant scale or high throughput.`;
    }

    // Secure BYOK header extraction
    const customApiKey = req.headers['x-byok-api-key'];
    const customModelSetting = req.headers['x-byok-model'];

    // Determine the key and base model
    const key = customApiKey || process.env.REACT_APP_GEMINI_API_KEY;
    if (!key) {
      return res.status(400).json({
        error: 'No Gemini API key configured. Provide an x-byok-api-key header or set REACT_APP_GEMINI_API_KEY on the server.'
      });
    }

    let existingProjectTitle = '';
    let existingProjectSummary = '';
    if (projectId) {
      const projRef = db.collection('users').doc(userId).collection('projects').doc(projectId);
      const projSnap = await projRef.get();
      if (projSnap.exists) {
        existingProjectTitle = projSnap.data().title || '';
        existingProjectSummary = projSnap.data().summary || '';
      }
    }

    if (existingProjectTitle) {
      promptModifier += `\n\nCRITICAL CONTEXT: This is a refinement request for an existing project called "${existingProjectTitle}". Original concept: "${existingProjectSummary}". You MUST ensure the core concept of the project remains unchanged. You MUST keep the exact title "${existingProjectTitle}" in the "projectTitle" field. Do NOT change it.`;
    }

    const userPrompt = `Project idea: "${idea}"
User's known tech stack: ${knownStack && knownStack.length > 0 ? knownStack.join(', ') : 'Not specified - recommend the best choices'}

Generate a complete architecture recommendation. Where the user knows a technology that fits, use it. Where they do not know something or their known tech is not ideal, recommend better alternatives and explain why.${promptModifier}`;

    const requestBody = {
      system_instruction: {
        parts: [{ text: SYSTEM_INSTRUCTION }],
      },
      contents: [
        { role: 'user', parts: [{ text: userPrompt }] },
      ],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 8192,
        responseMimeType: 'application/json',
        responseSchema: RESPONSE_SCHEMA,
      },
    };

    let parsedResponse;
    let modelUsed;

    try {
      const gatewayResult = await AIGatewayService.generateArchitecture({
        requestBody,
        apiKey: key,
        intent: projectId ? 'REFINEMENT' : 'INITIAL_COMPILE',
        customModelSetting,
        RESPONSE_SCHEMA,
        extractJsonText,
        tryParseJson,
        validateArchitectureShape
      });
      parsedResponse = gatewayResult.parsedResponse;
      modelUsed = gatewayResult.modelUsed;
      
      // Pass the model used in the response headers for tracing
      res.set('X-AI-Gateway-Model', modelUsed);
    } catch (err) {
      console.error('[AI Gateway] Routing failed:', err);
      return res.status(err.message.includes('malformed data') ? 502 : 500).json({ error: err.message });
    }

    try {
      // Persist generation to Firestore
      const userProjectsRef = db.collection('users').doc(userId).collection('projects');
      let activeProjectId = projectId;
      if (!activeProjectId) {
        const newProjDoc = userProjectsRef.doc();
        activeProjectId = newProjDoc.id;
      }

      const projectDocRef = userProjectsRef.doc(activeProjectId);
      const serverTimestamp = admin.firestore.FieldValue.serverTimestamp();

      const layersCount = Array.isArray(parsedResponse.stack) ? parsedResponse.stack.length : 0;
      const apisCount = Array.isArray(parsedResponse.apis) ? parsedResponse.apis.length : 0;

      // Guarantee the project title does not change during refinement
      if (existingProjectTitle) {
        parsedResponse.projectTitle = existingProjectTitle;
        if (!parsedResponse.projectSummary) {
          parsedResponse.projectSummary = existingProjectSummary;
        }
      }

      const updateData = {
        title: parsedResponse.projectTitle,
        summary: parsedResponse.projectSummary || '',
        layersCount,
        apisCount,
        updatedAt: serverTimestamp
      };

      if (projectId) {
        // Clear previous scans status fields
        updateData.securityScore = admin.firestore.FieldValue.delete();
        updateData.securityGrade = admin.firestore.FieldValue.delete();
        updateData.lastSecurityScanAt = admin.firestore.FieldValue.delete();
        updateData.complianceScore = admin.firestore.FieldValue.delete();
        updateData.driftScore = admin.firestore.FieldValue.delete();
        updateData.lastDriftScanAt = admin.firestore.FieldValue.delete();

        // Delete documents in securityReports and driftHistory subcollections
        try {
          const secSnap = await projectDocRef.collection('securityReports').get();
          if (!secSnap.empty) {
            const batch = db.batch();
            secSnap.forEach(d => batch.delete(d.ref));
            await batch.commit();
          }
        } catch (secDelErr) {
          console.error('[AI Gateway] Failed to clear securityReports:', secDelErr);
        }

        try {
          const driftSnap = await projectDocRef.collection('driftHistory').get();
          if (!driftSnap.empty) {
            const batch = db.batch();
            driftSnap.forEach(d => batch.delete(d.ref));
            await batch.commit();
          }
        } catch (driftDelErr) {
          console.error('[AI Gateway] Failed to clear driftHistory:', driftDelErr);
        }
      }

      // Save metadata
      await projectDocRef.set(updateData, { merge: true });

      // Normalize and save project details to subcollections
      const { normalizeAndSaveProject } = require('../utils/dbNormalizer');
      try {
        await normalizeAndSaveProject(userId, activeProjectId, parsedResponse, db, admin);
      } catch (normErr) {
        console.error('[AI Gateway] Subcollection normalization failed, continuing to save history snapshot:', normErr);
      }

      // Save snapshot inside project's chatHistory subcollection
      const chatHistoryRef = projectDocRef.collection('chatHistory');
      const newMsgDoc = chatHistoryRef.doc();
      const messageId = newMsgDoc.id;

      await newMsgDoc.set({
        prompt: idea,
        geminiResponse: parsedResponse,
        timestamp: serverTimestamp
      });

      // Write to Redis Read Cache (CQRS) — invalidate old snapshot to force cache-aside on next read
      const { invalidateProjectSnapshot } = require('../utils/cacheManager');
      try {
        await invalidateProjectSnapshot(activeProjectId);
      } catch (cacheErr) {
        console.warn('[AI Gateway] Cache invalidation failed (non-fatal, relying on TTL fallback):', cacheErr.message);
      }

      const timestampISO = new Date().toISOString();

      // Return the saved metadata and snapshot details to the client
      res.status(201).json({
        messageId,
        projectId: activeProjectId,
        prompt: idea,
        geminiResponse: parsedResponse,
        timestamp: timestampISO,
        modelUsed
      });

    } catch (err) {
      console.error('[AI Gateway] Generation failed:', err);
      res.status(500).json({ error: 'Internal gateway error: Failed to process generation request.' });
    }
  });
};
