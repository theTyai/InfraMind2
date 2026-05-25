// server/routes/ai.js

const { aiRateLimiter, aiRequestTracer, fetchWithRetry } = require('../middleware/aiGateway');
const { maskSecrets } = require('../utils/secretsMasker');
const { setProjectSnapshot, invalidateProjectSnapshot } = require('../utils/cacheManager');

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
  },
};

const SYSTEM_INSTRUCTION = `You are a senior software architect and principal engineer at a top tech company.
Your job is to analyze a project idea and the user's known tech stack, then produce a complete, production-ready architecture recommendation.

Return only JSON that matches the provided schema.

Rules for high conciseness to avoid truncation:
- stack: must have 5-7 items. The "reason" for each item must be at most 1 short sentence (15 words max).
- apis: must have 6-8 realistic, project-specific routes (limit description to 10 words).
- dbSchema: must have 3 collections or tables with 3-4 fields each (limit note to 10 words).
- mermaidDiagram: must be a valid Mermaid flowchart TD diagram (graph TD)
  - Do NOT use subgraphs (subgraph ... end) to keep the diagram layout flat, clean, and avoid parsing syntax errors.
  - Ensure all node shapes are modern and labels are concise. Use shapes like [Client], ((Gateway)), [(Database)], etc.
  - Append 'click' event handles to all primary architecture nodes so they can be selected in the UI. Example click binding format at the end of the diagram definition:
    click Client onNodeClick
    click Database onNodeClick
- userFlowDiagram: must be a valid Mermaid sequenceDiagram (max 4-5 steps to keep it short).
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

function tryParseJson(raw) {
  if (!raw) return null;
  const cleaned = raw
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const block = extractJsonBlock(cleaned);
    if (!block) return null;
    try {
      return JSON.parse(block);
    } catch {
      return null;
    }
  }
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
  ].every(Boolean);
}

/**
 * Step-Function Self-Healing AI Repair.
 * Instead of regex-patching broken JSON, we send the specific parse error
 * back to Gemini as a follow-up turn in the conversation.
 * This "Chat-with-the-LLM" pattern is far more reliable than regex repair.
 */
async function selfHealingRepair(rawText, originalPrompt, key, endpoint) {
  if (!rawText) return null;

  // Extract the exact parse error so we can tell Gemini what went wrong
  let parseError = 'Malformed JSON structure';
  try {
    JSON.parse(rawText);
    return tryParseJson(rawText); // It was actually valid — return it
  } catch (err) {
    parseError = err.message;
  }

  console.warn(`[AI Self-Heal] Step-Function repair initiated. Error: ${parseError}`);

  const healingBody = {
    system_instruction: {
      parts: [{ text: 'You are a JSON repair specialist. You receive a broken JSON string and a syntax error description. Return ONLY the corrected, complete, valid JSON. No markdown, no commentary.' }],
    },
    contents: [
      { role: 'user', parts: [{ text: originalPrompt }] },
      { role: 'model', parts: [{ text: rawText.slice(0, 8000) }] }, // Truncate to avoid token overflow
      {
        role: 'user',
        parts: [{
          text: `The JSON you returned has a syntax error: "${parseError}". Please fix the JSON and return only the corrected, complete JSON object with no other text.`
        }]
      }
    ],
    generationConfig: {
      temperature: 0,
      maxOutputTokens: 4096,
      responseMimeType: 'application/json',
      responseSchema: RESPONSE_SCHEMA,
    },
  };

  try {
    const healRes = await fetchWithRetry(`${endpoint}?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(healingBody),
    });

    if (!healRes.ok) {
      console.warn('[AI Self-Heal] Repair request failed with status:', healRes.status);
      return null;
    }

    const healData = await healRes.json().catch(() => null);
    const healedRaw = extractJsonText(healData);
    const healedParsed = tryParseJson(healedRaw);

    if (validateArchitectureShape(healedParsed)) {
      console.log('[AI Self-Heal] Step-Function repair succeeded ✓');
      return healedParsed;
    }

    console.warn('[AI Self-Heal] Repaired JSON still invalid. Giving up.');
    return null;
  } catch (err) {
    console.error('[AI Self-Heal] Repair loop threw:', err.message);
    return null;
  }
}

module.exports = function (app, db, admin, authMiddleware) {
  // Centralized route to handle AI requests securely via the AI Gateway
  app.post('/api/ai/generate', authMiddleware, aiRateLimiter, aiRequestTracer, async (req, res) => {
    if (!db) {
      return res.status(500).json({ error: 'Database not initialized' });
    }

    const userId = req.user.uid;
    const { idea, knownStack, projectId } = req.body;

    if (!idea || !idea.trim()) {
      return res.status(400).json({ error: 'Idea prompt description is required' });
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

    // Determine model routing (Pro for compile/initial create, Flash for refinements/drafts)
    let selectedModel = 'gemini-2.5-pro';
    if (customModelSetting) {
      selectedModel = customModelSetting;
    } else if (projectId) {
      // It is a refinement, use faster/cheaper Flash
      selectedModel = 'gemini-2.5-flash';
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent`;

    const userPrompt = `Project idea: "${maskSecrets(idea)}"
User's known tech stack: ${knownStack && knownStack.length > 0 ? knownStack.join(', ') : 'Not specified - recommend the best choices'}

Generate a complete architecture recommendation. Where the user knows a technology that fits, use it. Where they do not know something or their known tech is not ideal, recommend better alternatives and explain why.`;

    const requestBody = {
      system_instruction: {
        parts: [{ text: SYSTEM_INSTRUCTION }],
      },
      contents: [
        { role: 'user', parts: [{ text: userPrompt }] },
      ],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 4096,
        responseMimeType: 'application/json',
        responseSchema: RESPONSE_SCHEMA,
      },
    };

    try {
      console.log(`[AI Gateway] Routing generation to model ${selectedModel} (BYOK: ${!!customApiKey})`);
      let geminiRes = await fetchWithRetry(`${endpoint}?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      // FALLBACK ROUTING: If Pro fails or is rate-limited, fall back to Flash
      if (!geminiRes.ok && selectedModel === 'gemini-2.5-pro' && !customModelSetting) {
        console.warn(`[AI Gateway] Routing to gemini-2.5-pro failed with status ${geminiRes.status}. Falling back to gemini-2.5-flash...`);
        selectedModel = 'gemini-2.5-flash';
        const fallbackEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent`;
        
        geminiRes = await fetchWithRetry(`${fallbackEndpoint}?key=${key}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        });
      }

      if (!geminiRes.ok) {
        const errDetails = await geminiRes.json().catch(() => ({}));
        const errMsg = errDetails?.error?.message || `Gemini API returned error status ${geminiRes.status}`;
        return res.status(geminiRes.status).json({ error: errMsg });
      }

      const data = await geminiRes.json();
      const rawText = extractJsonText(data);
      let parsedResponse = tryParseJson(rawText);

      // Perform Step-Function self-healing if malformed JSON is returned
      if (!parsedResponse || !validateArchitectureShape(parsedResponse)) {
        console.warn('[AI Gateway] Gemini returned malformed JSON. Initiating Step-Function self-healing...');
        const repairEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent`;
        parsedResponse = await selfHealingRepair(rawText, userPrompt, key, repairEndpoint);
        
        if (!parsedResponse) {
          return res.status(502).json({
            error: 'AI returned malformed data and the self-healing pipeline failed. Please modify your prompt and try again.'
          });
        }
      }

      // Persist generation to Firestore
      let targetUserId = userId;
      let activeProjectId = projectId;
      
      if (activeProjectId) {
        const { resolveProjectOwner } = require('../utils/projectResolver');
        const ownerData = await resolveProjectOwner(activeProjectId, userId, db);
        if (!ownerData || (ownerData.ownerId !== userId && !ownerData.collaborators.includes(userId))) {
          return res.status(403).json({ error: 'Access denied to this project.' });
        }
        targetUserId = ownerData.ownerId;
      } else {
        const userProjectsRef = db.collection('users').doc(userId).collection('projects');
        const newProjDoc = userProjectsRef.doc();
        activeProjectId = newProjDoc.id;
        
        // Register new project in projectOwners
        await db.collection('projectOwners').doc(activeProjectId).set({
          ownerId: userId,
          collaborators: [],
          collaboratorEmails: []
        });
      }

      const projectDocRef = db.collection('users').doc(targetUserId).collection('projects').doc(activeProjectId);
      const serverTimestamp = admin.firestore.FieldValue.serverTimestamp();

      const layersCount = Array.isArray(parsedResponse.stack) ? parsedResponse.stack.length : 0;
      const apisCount = Array.isArray(parsedResponse.apis) ? parsedResponse.apis.length : 0;

      // Save metadata
      await projectDocRef.set({
        title: parsedResponse.projectTitle,
        summary: parsedResponse.projectSummary || '',
        layersCount,
        apisCount,
        updatedAt: serverTimestamp
      }, { merge: true });

      // Normalize and save project details to subcollections
      const { normalizeAndSaveProject } = require('../utils/dbNormalizer');
      try {
        await normalizeAndSaveProject(targetUserId, activeProjectId, parsedResponse, db, admin);
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

      // Write to Redis Read Cache (CQRS) — invalidate old snapshot first
      try {
        await invalidateProjectSnapshot(activeProjectId);
        await setProjectSnapshot(activeProjectId, parsedResponse);
      } catch (cacheErr) {
        console.warn('[AI Gateway] Cache write failed (non-fatal):', cacheErr.message);
      }

      const timestampISO = new Date().toISOString();

      // Return the saved metadata and snapshot details to the client
      res.status(201).json({
        messageId,
        projectId: activeProjectId,
        prompt: idea,
        geminiResponse: parsedResponse,
        timestamp: timestampISO
      });

    } catch (err) {
      console.error('[AI Gateway] Generation failed:', err);
      res.status(500).json({ error: 'Internal gateway error: Failed to process generation request.' });
    }
  });
};
