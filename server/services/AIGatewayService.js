// server/services/AIGatewayService.js

const { markModelDegraded, resolveAvailableModel, isModelHealthy } = require('../config/models');
const { fetchWithRetry } = require('../middleware/aiGateway');
const CircuitBreaker = require('opossum');

const MODEL_MAP = {
    INITIAL_COMPILE: ["gemma-4-31b-it", "gemma-4-26b-a4b-it", "gemini-3.5-flash", "gemini-2.5-pro"],
    REFINEMENT: ["gemini-3.1-flash-lite", "gemini-2.5-flash"],
    METADATA_ANALYSIS: ["gemini-3.1-flash-lite"]
};

class AIGatewayService {
  /**
   * Generates architecture by securely calling the Gemini API through the gateway.
   * Handles JSON parsing, validation, and zero-temperature repair loops.
   */
  static async _generateArchitectureCore({
    requestBody,
    apiKey,
    intent = 'INITIAL_COMPILE',
    customModelSetting = null,
    RESPONSE_SCHEMA,
    extractJsonText,
    tryParseJson,
    validateArchitectureShape
  }) {
    let candidates = MODEL_MAP[intent] || MODEL_MAP.METADATA_ANALYSIS;
    if (customModelSetting) {
      candidates = [customModelSetting, ...candidates];
    }

    let geminiRes = null;
    let selectedModel = null;
    let lastError = null;

    for (const modelId of candidates) {
      if (!isModelHealthy(modelId)) continue;
      
      selectedModel = modelId;
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent`;
      console.log(`[AI Gateway] Routing generation to model ${selectedModel} (Intent: ${intent})`);

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 12000); // 12s hard timeout

        geminiRes = await fetchWithRetry(`${endpoint}?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
          signal: controller.signal
        });
        
        clearTimeout(timeout);

        if (!geminiRes.ok) {
          if (geminiRes.status === 429 || geminiRes.status === 503 || geminiRes.status >= 500) {
            markModelDegraded(selectedModel, 120000); // 2 minutes blacklist
            console.warn(`[AI Gateway] Model ${selectedModel} blacklisted for 2 minutes (HTTP ${geminiRes.status}).`);
            lastError = new Error(`HTTP ${geminiRes.status}`);
            continue; // Try next model
          }
          const errDetails = await geminiRes.json().catch(() => ({}));
          throw new Error(errDetails?.error?.message || `Gemini API returned error status ${geminiRes.status}`);
        }
        
        break; // Success
      } catch (err) {
        console.error(`[AI Gateway] Failed ${selectedModel}: ${err.message}`);
        if (err.message.includes('timeout') || err.message.includes('network') || err.name === 'AbortError') {
          markModelDegraded(selectedModel, 120000);
          console.warn(`[AI Gateway] Model ${selectedModel} blacklisted for 2 minutes due to timeout.`);
          lastError = err;
          continue;
        }
        throw err;
      }
    }

    if (!geminiRes || !geminiRes.ok) {
      throw new Error("All attempts failed. Please wait a moment.");
    }

    const data = await geminiRes.json();
    const rawText = extractJsonText(data);
    let parsedResponse = await tryParseJson(rawText);

    // Malformed JSON Repair Pipeline
    if (!parsedResponse || !validateArchitectureShape(parsedResponse)) {
      console.warn(`[AI Gateway] ${selectedModel} returned malformed JSON. Initiating zero-temperature repair loop...`);
      parsedResponse = await this.repairJson(rawText, apiKey, RESPONSE_SCHEMA, extractJsonText, tryParseJson, validateArchitectureShape);
      
      if (!parsedResponse) {
        throw new Error('AI returned malformed data and the repair loop failed. Please modify your prompt and try again.');
      }
    }

    return {
      parsedResponse,
      modelUsed: selectedModel
    };
  }

  /**
   * Pipes broken JSON into a high-speed model with a strict repair instruction.
   */
  static async repairJson(rawBrokenJson, apiKey, RESPONSE_SCHEMA, extractJsonText, tryParseJson, validateArchitectureShape) {
    // Always use 3.1-flash-lite for repairs due to speed and low cost, or fallback to 2.5-flash
    const repairModel = resolveAvailableModel('gemini-3.1-flash-lite');
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${repairModel}:generateContent`;

    const repairInstruction = `You repair malformed JSON.
Return only valid JSON that matches the provided schema.
Do not add commentary, markdown, or extra keys.
Preserve the original meaning as closely as possible.`;

    const repairBody = {
      system_instruction: {
        parts: [{ text: repairInstruction }],
      },
      contents: [
        {
          role: 'user',
          parts: [
            { text: `Fix this malformed architecture JSON and return valid JSON only:\n\n${rawBrokenJson}` },
          ],
        },
      ],
      generationConfig: {
        temperature: 0,
        maxOutputTokens: 8192,
        responseMimeType: 'application/json',
        responseSchema: RESPONSE_SCHEMA,
      },
    };

    try {
      const repairRes = await fetchWithRetry(`${endpoint}?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(repairBody),
      });

      if (!repairRes.ok) return null;
      const repairData = await repairRes.json().catch(() => null);
      const repairedRaw = extractJsonText(repairData);
      const repairedParsed = await tryParseJson(repairedRaw);
      return validateArchitectureShape(repairedParsed) ? repairedParsed : null;
    } catch (err) {
      console.error('[AI Gateway] Repair loop failed:', err);
      return null;
    }
  }

  static async generateArchitecture(params) {
    return await breaker.fire(params);
  }
}

const options = {
  timeout: 60000, // 60 seconds timeout (LLM requests can be slow)
  errorThresholdPercentage: 50, // Trip if 50% of requests fail
  resetTimeout: 60000 // Wait 60 seconds before trying again
};

// Wrap the core logic in a breaker
const breaker = new CircuitBreaker(async (params) => {
  return await AIGatewayService._generateArchitectureCore(params);
}, options);

// Define a fallback so the app returns a clean message instead of crashing
breaker.fallback(() => ({
  error: "AI service is temporarily unavailable. Please try again in a minute."
}));

module.exports = AIGatewayService;
