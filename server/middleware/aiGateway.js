// server/middleware/aiGateway.js
// AI Gateway middleware: per-user rate limiting, request tracing, fetch retry

const rateLimits = new Map(); // Map of userId -> array of timestamps

const WINDOW_MS    = 60 * 1000; // 1 minute
const MAX_REQUESTS = 15;        // standard users
const BYOK_MAX_RPM = 60;        // BYOK users get a higher but still finite limit

// ── Rate limit cleanup: evict stale entries every 5 minutes ──────────────────
// Prevents unbounded memory growth when users stop visiting.
const cleanupInterval = setInterval(() => {
  const now = Date.now();
  let evicted = 0;
  for (const [userId, timestamps] of rateLimits.entries()) {
    const fresh = timestamps.filter(t => now - t < WINDOW_MS);
    if (fresh.length === 0) {
      rateLimits.delete(userId);
      evicted++;
    } else {
      rateLimits.set(userId, fresh);
    }
  }
  if (evicted > 0) {
    console.log(`[AI Gateway] Rate limiter cleanup: evicted ${evicted} stale user entries.`);
  }
}, 5 * 60 * 1000);

// Prevent the interval from keeping Node alive after tests/shutdown
if (cleanupInterval.unref) cleanupInterval.unref();

/**
 * Per-user rate limiting middleware.
 * Standard users: 15 req/min. BYOK users: 60 req/min (still limited to prevent abuse).
 */
function aiRateLimiter(req, res, next) {
  const userId = req.user?.uid;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized: Missing user UID' });
  }

  const isByok = !!req.headers['x-byok-api-key'];
  const limit  = isByok ? BYOK_MAX_RPM : MAX_REQUESTS;
  const now    = Date.now();

  const userTimestamps = (rateLimits.get(userId) || []).filter(t => now - t < WINDOW_MS);
  userTimestamps.push(now);
  rateLimits.set(userId, userTimestamps);

  if (userTimestamps.length > limit) {
    const retryAfter = Math.ceil((userTimestamps[0] + WINDOW_MS - now) / 1000);
    console.warn(`[AI Gateway] Rate limit exceeded for user ${userId} (${isByok ? 'BYOK' : 'standard'}) — ${userTimestamps.length}/${limit} req/min`);
    res.setHeader('Retry-After', retryAfter);
    return res.status(429).json({
      error: isByok
        ? `Rate limit exceeded (${BYOK_MAX_RPM} req/min). Please wait ${retryAfter}s.`
        : 'Rate limit exceeded. Please wait a minute or use a custom API key in Settings.',
      retryAfter,
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

    // If rate-limited (429) or server error (5xx), retry
    if ((res.status === 429 || res.status >= 500) && retries > 0) {
      console.warn(`[AI Gateway] Fetch failed with status ${res.status}. Retrying in ${delay}ms... (Retries left: ${retries})`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return fetchWithRetry(url, options, retries - 1, delay * 2);
    }

    return res;
  } catch (error) {
    if (retries > 0) {
      console.warn(`[AI Gateway] Fetch network error. Retrying in ${delay}ms... (Retries left: ${retries}):`, error.message);
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
  const userId    = req.user?.uid;
  const isByok    = !!req.headers['x-byok-api-key'];

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
  fetchWithRetry,
};
