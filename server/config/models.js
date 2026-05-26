// server/config/models.js
// Centralized Model Registry for the AI Gateway

const MODEL_REGISTRY = {
  'gemini-3.5-flash': {
    id: 'gemini-3.5-flash',
    name: '3.5 Flash',
    description: 'Frontier-class default',
    isHealthy: true,
    cooldownUntil: 0,
    fallback: 'gemini-2.5-flash'
  },
  'gemini-2.5-flash': {
    id: 'gemini-2.5-flash',
    name: '2.5 Flash',
    description: 'Reliable fallback',
    isHealthy: true,
    cooldownUntil: 0,
    fallback: 'gemini-2.5-flash-lite'
  },
  'gemini-3.1-flash-lite': {
    id: 'gemini-3.1-flash-lite',
    name: '3.1 Flash-Lite',
    description: 'Low-latency tasks & JSON repair',
    isHealthy: true,
    cooldownUntil: 0,
    fallback: 'gemini-2.5-flash-lite'
  },
  'gemini-2.5-flash-lite': {
    id: 'gemini-2.5-flash-lite',
    name: '2.5 Flash-Lite',
    description: 'Lightweight budget fallback',
    isHealthy: true,
    cooldownUntil: 0,
    fallback: null // Absolute bottom
  },
  'gemini-2.5-pro': {
    id: 'gemini-2.5-pro',
    name: '2.5 Pro',
    description: 'Deep reasoning (Strictly Gated)',
    isHealthy: true,
    cooldownUntil: 0,
    fallback: 'gemini-3.5-flash'
  },
  'gemini-2.0-flash-001': {
    id: 'gemini-2.0-flash-001',
    name: '2.0 Flash (Legacy)',
    description: 'Legacy compatibility',
    isHealthy: true,
    cooldownUntil: 0,
    fallback: 'gemini-2.5-flash'
  }
};

/**
 * Checks if a model is currently healthy. If it is in a cooldown period,
 * checks if the cooldown has expired and restores health.
 */
function isModelHealthy(modelId) {
  const model = MODEL_REGISTRY[modelId];
  if (!model) return false;

  if (!model.isHealthy) {
    if (Date.now() > model.cooldownUntil) {
      // Cooldown expired, restore health
      model.isHealthy = true;
      model.cooldownUntil = 0;
      console.log(`[AI Gateway] Model ${modelId} has recovered and is marked healthy again.`);
      return true;
    }
    return false;
  }
  return true;
}

/**
 * Marks a model as degraded for a specific duration.
 */
function markModelDegraded(modelId, durationMs = 60000) {
  const model = MODEL_REGISTRY[modelId];
  if (model) {
    model.isHealthy = false;
    model.cooldownUntil = Date.now() + durationMs;
    console.warn(`[AI Gateway] Model ${modelId} marked as DEGRADED for ${durationMs}ms.`);
  }
}

/**
 * Resolves the best available model starting from the requested model,
 * traversing the fallback chain if the requested model is degraded.
 */
function resolveAvailableModel(requestedModelId) {
  let currentModelId = requestedModelId;
  let attempts = 0;
  
  while (currentModelId && attempts < 5) { // Prevent infinite loops
    if (isModelHealthy(currentModelId)) {
      return currentModelId;
    }
    
    // Model is degraded, fallback
    const model = MODEL_REGISTRY[currentModelId];
    console.warn(`[AI Gateway] Model ${currentModelId} is degraded. Falling back to ${model.fallback}...`);
    currentModelId = model.fallback;
    attempts++;
  }
  
  // If everything fails, just try the most basic one as a last ditch
  return 'gemini-2.5-flash-lite';
}

module.exports = {
  MODEL_REGISTRY,
  isModelHealthy,
  markModelDegraded,
  resolveAvailableModel
};
