// server/services/AIGatewayService.js

const { markModelDegraded, resolveAvailableModel } = require('../config/models');
const { fetchWithRetry } = require('../middleware/aiGateway');

class AIGatewayService {
  /**
   * Intelligently routes the request to the appropriate model tier based on task complexity.
   */
  static determineOptimalModel(intent, customModelSetting) {
    if (customModelSetting) {
      return resolveAvailableModel(customModelSetting);
    }
    
    // High-complexity / reasoning tasks
    if (intent === 'INITIAL_COMPILE' || intent === 'SECURITY_AUDIT' || intent === 'SCALABILITY_ANALYSIS') {
      return resolveAvailableModel('gemini-3.5-flash');
    }
    
    // Fast, lightweight refinements
    if (intent === 'REFINEMENT') {
      return resolveAvailableModel('gemini-3.1-flash-lite');
    }
    
    // Default to the reliable 2.5 flash
    return resolveAvailableModel('gemini-2.5-flash');
  }

  /**
   * Generates architecture by securely calling the Gemini API through the gateway.
   * Handles JSON parsing, validation, and zero-temperature repair loops.
   */
  static async generateArchitecture({
    requestBody,
    apiKey,
    intent = 'INITIAL_COMPILE',
    customModelSetting = null,
    RESPONSE_SCHEMA,
    extractJsonText,
    tryParseJson,
    validateArchitectureShape
  }) {
    let selectedModel = this.determineOptimalModel(intent, customModelSetting);
    let endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent`;

    console.log(`[AI Gateway] Routing generation to model ${selectedModel} (Intent: ${intent})`);
    
    let geminiRes;
    try {
      geminiRes = await fetchWithRetry(`${endpoint}?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      // Graceful degradation on 429/503 during execution
      if (!geminiRes.ok && (geminiRes.status === 429 || geminiRes.status >= 500)) {
        console.warn(`[AI Gateway] ${selectedModel} returned status ${geminiRes.status}. Triggering graceful degradation...`);
        markModelDegraded(selectedModel, 60000); // Degrade for 60s
        
        // Re-resolve a new fallback model
        selectedModel = resolveAvailableModel(selectedModel);
        endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent`;
        console.log(`[AI Gateway] Fallback Routing generation to model ${selectedModel}`);
        
        geminiRes = await fetchWithRetry(`${endpoint}?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        });
      }

      if (!geminiRes.ok) {
        const errDetails = await geminiRes.json().catch(() => ({}));
        const errMsg = errDetails?.error?.message || `Gemini API returned error status ${geminiRes.status}`;
        throw new Error(errMsg);
      }
    } catch (err) {
      console.error('[AI Gateway] Fetch failed entirely:', err);
      throw err;
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
        maxOutputTokens: 4096,
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
}

module.exports = AIGatewayService;
