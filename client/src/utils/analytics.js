// src/utils/analytics.js
/**
 * PostHog analytics wrapper.
 * Safe no-op when VITE_POSTHOG_KEY is not configured.
 */

let _ph = null

export function initAnalytics() {
  const key = import.meta.env.VITE_POSTHOG_KEY
  if (!key) return

  import('posthog-js').then(({ default: posthog }) => {
    posthog.init(key, {
      api_host: import.meta.env.VITE_POSTHOG_HOST || 'https://app.posthog.com',
      capture_pageview: true,
      autocapture: false,
    })
    _ph = posthog
  }).catch(() => { /* posthog load failure is non-fatal */ })
}

export function identifyUser(uid, props = {}) {
  _ph?.identify(uid, props)
}

export function trackEvent(name, props = {}) {
  _ph?.capture(name, props)
}

export function resetAnalytics() {
  _ph?.reset()
}

// Pre-defined event constants to prevent typos
export const EVENTS = {
  ARCHITECTURE_GENERATED:  'architecture_generated',
  TEMPLATE_USED:           'template_used',
  SCAFFOLD_DOWNLOADED:     'scaffold_downloaded',
  PDF_EXPORTED:            'pdf_exported',
  SHARE_CREATED:           'share_created',
  SHARE_COPIED:            'share_link_copied',
  PROJECT_LOADED:          'project_loaded',
  AUTH_SIGNIN:             'auth_sign_in',
  AUTH_SIGNUP:             'auth_sign_up',
  COMMAND_PALETTE_OPENED:  'command_palette_opened',
  COMMAND_EXECUTED:        'command_executed',
}
