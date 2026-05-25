// server/utils/secretsMasker.js
// Strips hardcoded credentials and API keys from strings before they are
// sent to any AI model. Prevents accidental exfiltration of secrets.

const MASKING_PATTERNS = [
  // OpenAI API keys
  { pattern: /sk-[a-zA-Z0-9]{20,}/g, label: 'OPENAI_KEY' },
  // OpenAI Project keys
  { pattern: /sk-proj-[a-zA-Z0-9_-]{20,}/g, label: 'OPENAI_PROJ_KEY' },
  // Google / Firebase API keys
  { pattern: /AIza[0-9A-Za-z_-]{35}/g, label: 'GOOGLE_API_KEY' },
  // AWS Access Key IDs
  { pattern: /AKIA[0-9A-Z]{16}/g, label: 'AWS_ACCESS_KEY' },
  // AWS Secret Access Keys (40-char base64-like)
  { pattern: /(?<![A-Z0-9])[A-Za-z0-9+/]{40}(?![A-Za-z0-9+/=])/g, label: 'AWS_SECRET_KEY' },
  // GitHub Personal Access Tokens
  { pattern: /ghp_[a-zA-Z0-9]{36}/g, label: 'GITHUB_PAT' },
  { pattern: /github_pat_[a-zA-Z0-9_]{82}/g, label: 'GITHUB_FINE_PAT' },
  // Generic Bearer tokens (long alphanumeric)
  { pattern: /Bearer\s+[A-Za-z0-9\-_.~+/]+=*/gi, label: 'BEARER_TOKEN' },
  // MongoDB connection URIs
  { pattern: /mongodb(\+srv)?:\/\/[^\s"'`\]}>]+/gi, label: 'MONGODB_URI' },
  // PostgreSQL / MySQL URIs
  { pattern: /postgres(ql)?:\/\/[^\s"'`\]}>]+/gi, label: 'POSTGRES_URI' },
  { pattern: /mysql:\/\/[^\s"'`\]}>]+/gi, label: 'MYSQL_URI' },
  // Redis URIs with passwords
  { pattern: /redis:\/\/:[^\s"'`@\]}>]+@[^\s"'`\]}>]+/gi, label: 'REDIS_URI' },
  // Generic password assignments: password="..." or password: "..."
  { pattern: /(password|passwd|secret|api_key|apikey|token|private_key)\s*[:=]\s*["'`]([^"'`\s]{6,})["'`]/gi, label: 'CREDENTIAL' },
  // Hex strings that look like secrets (32-64 hex chars)
  { pattern: /\b[0-9a-f]{32,64}\b/g, label: 'HEX_SECRET' },
  // JWT tokens (three base64 segments)
  { pattern: /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g, label: 'JWT_TOKEN' },
];

/**
 * Masks all detected secrets in the input string with [REDACTED:TYPE] placeholders.
 * @param {string} text - The text to sanitize.
 * @returns {string} - Sanitized text safe to send to an external AI.
 */
function maskSecrets(text) {
  if (typeof text !== 'string' || !text) return text;

  let masked = text;
  let redactionCount = 0;

  for (const { pattern, label } of MASKING_PATTERNS) {
    const before = masked;
    masked = masked.replace(pattern, (match) => {
      // Preserve the key name for credential assignments (group 1), mask value only
      if (label === 'CREDENTIAL') {
        const keyMatch = match.match(/^(\w+)\s*[:=]\s*/i);
        if (keyMatch) {
          return `${keyMatch[0]}[REDACTED:${label}]`;
        }
      }
      return `[REDACTED:${label}]`;
    });
    if (masked !== before) redactionCount++;
  }

  if (redactionCount > 0) {
    console.warn(`[SecretsMasker] Masked ${redactionCount} sensitive pattern type(s) before AI call.`);
  }

  return masked;
}

/**
 * Masks secrets in an object's string values (shallow).
 * Useful for sanitizing structured payloads.
 * @param {object} obj
 * @returns {object}
 */
function maskObjectSecrets(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = maskSecrets(value);
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map(v => typeof v === 'string' ? maskSecrets(v) : v);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

module.exports = { maskSecrets, maskObjectSecrets };
