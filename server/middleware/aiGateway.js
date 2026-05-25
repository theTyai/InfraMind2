// server/middleware/aiGateway.js

const rateLimits = new Map(); // Map of userId -> array of timestamps

/**
 * Custom rate limiting middleware per user UID.
 * Limits users to 10 AI generation requests per minute.
 */
function aiRateLimiter(req, res, next) {
  const userId = req.user?.uid;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized: Missing user UID' });
  }

  // Bypass rate limiting for BYOK users
  if (req.headers['x-byok-api-key']) {
    return next();
  }

  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxRequests = 15;

  if (!rateLimits.has(userId)) {
    rateLimits.set(userId, []);
  }

  const userRequests = rateLimits.get(userId).filter(timestamp => now - timestamp < windowMs);
  userRequests.push(now);
  rateLimits.set(userId, userRequests);

  if (userRequests.length > maxRequests) {
    console.warn(`[AI Gateway] Rate limit exceeded for user ${userId}`);
    return res.status(429).json({
      error: 'Rate limit exceeded. Please wait a minute or use a custom API key in Settings.'
    });
  }

  next();
}

/**
 * Fetch wrapper with exponential backoff retry logic.
 * @param {string} url 
 * @param {object} options 
 * @param {number} retries 
 * @param {number} delay 
 */
async function fetchWithRetry(url, options, retries = 3, delay = 1000) {
  try {
    const res = await fetch(url, options);
    if (res.ok) return res;
    
    // If rate-limited (429) or server error (5xx), we retry
    if ((res.status === 429 || res.status >= 500) && retries > 0) {
      console.warn(`[AI Gateway] Fetch failed with status ${res.status}. Retrying in ${delay}ms... (Retries left: ${retries})`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return fetchWithRetry(url, options, retries - 1, delay * 2);
    }
    
    return res;
  } catch (error) {
    if (retries > 0) {
      console.warn(`[AI Gateway] Fetch encountered network error. Retrying in ${delay}ms... (Retries left: ${retries}):`, error.message);
      await new Promise(resolve => setTimeout(resolve, delay));
      return fetchWithRetry(url, options, retries - 1, delay * 2);
    }
    throw error;
  }
}

/**
 * Express middleware to trace AI request parameters and performance metadata.
 */
function aiRequestTracer(req, res, next) {
  const startTime = Date.now();
  const userId = req.user?.uid;
  const isByok = !!req.headers['x-byok-api-key'];

  // Override res.json to capture trace before responding
  const originalJson = res.json;
  res.json = function (data) {
    const duration = Date.now() - startTime;
    console.log(`[AI Tracing] User: ${userId} | BYOK: ${isByok} | Duration: ${duration}ms | Status: ${res.statusCode}`);
    return originalJson.apply(this, arguments);
  };

  next();
}

module.exports = {
  aiRateLimiter,
  aiRequestTracer,
  fetchWithRetry
};
