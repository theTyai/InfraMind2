const { parentPort } = require('worker_threads');

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
  if (!raw || typeof raw !== 'string' || !raw.trim()) {
    return { error: 'Empty or invalid text payload received from LLM' };
  }
  const cleaned = raw
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  try {
    return { data: JSON.parse(cleaned) };
  } catch (err1) {
    const block = extractJsonBlock(cleaned);
    if (!block) return { error: 'No JSON block found in response' };
    try {
      return { data: JSON.parse(block) };
    } catch (err2) {
      return { error: 'Failed to parse extracted JSON block', details: err2.message };
    }
  }
}

parentPort.on('message', (payload) => {
  try {
    const result = tryParseJson(payload);
    parentPort.postMessage(result);
  } catch (err) {
    parentPort.postMessage({ error: 'Worker unhandled exception', details: err.message });
  }
});

process.on('uncaughtException', (err) => {
  console.error('[JSON Worker Uncaught Exception]', err);
});

process.on('unhandledRejection', (err) => {
  console.error('[JSON Worker Unhandled Rejection]', err);
});
