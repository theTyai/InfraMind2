// server/utils/secretsMasker.js
// Strips hardcoded credentials and API keys from strings before they are
// sent to any AI model. Prevents accidental exfiltration of secrets.

const MASKING_PATTERNS = [
  // OpenAI API keys
  { pattern: /sk-[a-zA-Z0-9]{48}/g, placeholder: '[API_KEY_MASKED]' },
  // Google Gemini API keys
  { pattern: /AIzaSy[a-zA-Z0-9-_]{33}/g, placeholder: '[API_KEY_MASKED]' },
  // Generic password assignments in config/env
  { pattern: /(password|passwd|secret|private_key|token)\s*[:=]\s*['"]?[a-zA-Z0-9-_$#%^&*()+={}[\]:;<>?,./~`]+['"]?/gi, placeholder: '$1: "[CREDENTIAL_MASKED]"' },
  // Connection strings (MongoDB, PostgreSQL, Redis)
  { pattern: /mongodb(\+srv)?:\/\/[a-zA-Z0-9_.-]+:[a-zA-Z0-9_.-]+@[a-zA-Z0-9_.-]+/g, placeholder: 'mongodb$1://[USER]:[PASSWORD]@[HOST]' },
  { pattern: /postgres(ql)?:\/\/[a-zA-Z0-9_.-]+:[a-zA-Z0-9_.-]+@[a-zA-Z0-9_.-]+/g, placeholder: 'postgres$1://[USER]:[PASSWORD]@[HOST]' },
  { pattern: /redis:\/\/[a-zA-Z0-9_.-]+:[a-zA-Z0-9_.-]+@[a-zA-Z0-9_.-]+/g, placeholder: 'redis://[USER]:[PASSWORD]@[HOST]' },
  // AWS Keys
  { pattern: /AKIA[0-9A-Z]{16}/g, placeholder: '[AWS_KEY_MASKED]' }
];

function maskSecrets(text) {
  if (typeof text !== 'string') return text;
  let masked = text;
  for (const item of MASKING_PATTERNS) {
    masked = masked.replace(item.pattern, item.placeholder);
  }
  return masked;
}

module.exports = {
  maskSecrets
};
