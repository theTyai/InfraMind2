function getGeminiDetails() {
  const key = localStorage.getItem('inframind_api_key') || process.env.REACT_APP_GEMINI_API_KEY
  const model = localStorage.getItem('inframind_model') || 'gemini-2.5-flash'
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`
  return { key, endpoint }
}

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
}

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
`

function extractJsonText(apiData) {
  const parts = apiData?.candidates?.[0]?.content?.parts || []
  return parts
    .map((part) => (typeof part?.text === 'string' ? part.text : ''))
    .join('')
    .trim()
}

function extractJsonBlock(raw) {
  let start = raw.search(/[\{\[]/)
  if (start === -1) return null

  let depth = 0
  let inString = false
  let escape = false
  for (let i = start; i < raw.length; i += 1) {
    const char = raw[i]
    if (escape) {
      escape = false
      continue
    }
    if (char === '\\') {
      escape = true
      continue
    }
    if (char === '"') {
      inString = !inString
      continue
    }
    if (inString) continue
    if (char === '{' || char === '[') {
      depth += 1
    }
    if (char === '}' || char === ']') {
      depth -= 1
      if (depth === 0) {
        return raw.slice(start, i + 1)
      }
    }
  }

  return null
}

function tryParseJson(raw) {
  if (!raw) return null

  const cleaned = raw
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()

  try {
    return JSON.parse(cleaned)
  } catch {
    const block = extractJsonBlock(cleaned)
    if (!block) return null

    try {
      return JSON.parse(block)
    } catch {
      return null
    }
  }
}

function validateArchitectureShape(data) {
  if (!data || typeof data !== 'object') return false

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
  ].every(Boolean)
}

async function repairArchitectureJson(raw, key, endpoint) {
  if (!raw) return null

  const repairInstruction = `You repair malformed JSON.
Return only valid JSON that matches the provided schema.
Do not add commentary, markdown, or extra keys.
Preserve the original meaning as closely as possible.`

  const repairBody = {
    system_instruction: {
      parts: [{ text: repairInstruction }],
    },
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: `Fix this malformed architecture JSON and return valid JSON only:\n\n${raw}`,
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0,
      maxOutputTokens: 4096,
      responseMimeType: 'application/json',
      responseSchema: RESPONSE_SCHEMA,
    },
  }

  const repairRes = await fetch(`${endpoint}?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(repairBody),
  })

  if (!repairRes.ok) return null

  const repairData = await repairRes.json().catch(() => null)
  const repairedRaw = extractJsonText(repairData)
  const repairedParsed = tryParseJson(repairedRaw)

  return validateArchitectureShape(repairedParsed) ? repairedParsed : null
}

export async function generateArchitecture({ idea, knownStack }) {
  const { key, endpoint } = getGeminiDetails()

  if (!key) {
    throw new Error('No Gemini API key found. Add REACT_APP_GEMINI_API_KEY in your .env or configure a custom API key in Settings.')
  }

  if (!/^AIza[\w-]{20,}$/.test(key)) {
    throw new Error('Gemini API key format looks invalid. Google AI Studio keys usually start with "AIza". Check your key configuration.')
  }

  const userPrompt = `Project idea: "${idea}"

User's known tech stack: ${knownStack.length > 0 ? knownStack.join(', ') : 'Not specified - recommend the best choices'}

Generate a complete architecture recommendation. Where the user knows a technology that fits, use it. Where they do not know something or their known tech is not ideal, recommend better alternatives and explain why.`

  const body = {
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
  }

  const res = await fetch(`${endpoint}?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    const apiMessage = err?.error?.message || `Gemini API error: ${res.status}`

    if (/api key not valid/i.test(apiMessage)) {
      throw new Error('Gemini rejected the API key. Verify the key configuration in .env or Settings.')
    }

    throw new Error(apiMessage)
  }

  const data = await res.json()
  const raw = extractJsonText(data)
  const parsed = tryParseJson(raw)

  if (validateArchitectureShape(parsed)) {
    return parsed
  }

  const repaired = await repairArchitectureJson(raw, key, endpoint)
  if (validateArchitectureShape(repaired)) {
    return repaired
  }

  const retryBody = {
    system_instruction: {
      parts: [{ text: `${SYSTEM_INSTRUCTION}\n\nIf the previous result was malformed, retry and return only valid JSON. Do not include markdown, explanations, or non-JSON text.` }],
    },
    contents: [
      { role: 'user', parts: [{ text: userPrompt }] },
    ],
    generationConfig: {
      temperature: 0,
      maxOutputTokens: 4096,
      responseMimeType: 'application/json',
      responseSchema: RESPONSE_SCHEMA,
    },
  }

  const retryRes = await fetch(`${endpoint}?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(retryBody),
  })

  if (!retryRes.ok) {
    const err = await retryRes.json().catch(() => ({}))
    const apiMessage = err?.error?.message || `Gemini API error: ${retryRes.status}`
    throw new Error(apiMessage)
  }

  const retryData = await retryRes.json()
  const retryRaw = extractJsonText(retryData)
  const retryParsed = tryParseJson(retryRaw)

  if (validateArchitectureShape(retryParsed)) {
    return retryParsed
  }

  const retryRepaired = await repairArchitectureJson(retryRaw, key, endpoint)
  if (validateArchitectureShape(retryRepaired)) {
    return retryRepaired
  }

  throw new Error('Gemini returned malformed architecture JSON after retry. Please check your prompt and try again.')
}
