// client/src/components/workspace/StartupMode.jsx
// 🚀 Startup Mode — Smart architecture generation toggle
//
// When enabled, patches every AI prompt to optimize for:
//   - Lean MVP architecture (minimal services, fast to ship)
//   - Startup-budget hosting (Railway, Render, Vercel, Supabase)
//   - Solo-developer or small-team operational complexity
//   - Bootstrap-friendly tech choices (avoid Kubernetes, CDC, etc.)
//
// The setting persists in localStorage as 'inframind_startup_mode'

import { useState, useEffect } from 'react'
import styles from './StartupMode.module.css'

export const STARTUP_MODE_KEY = 'inframind_startup_mode'

export function getStartupModePromptSuffix() {
  if (localStorage.getItem(STARTUP_MODE_KEY) !== 'true') return ''
  return `

IMPORTANT — STARTUP MODE IS ENABLED:
Optimize this architecture for a lean startup/indie developer context:
- Prefer managed services over self-hosted (Supabase > self-hosted Postgres, Railway > ECS)
- Avoid Kubernetes, CDC pipelines, multi-region unless strictly required
- Minimize operational complexity — a solo developer or team of 2-3 must be able to run this
- Prefer Vercel/Netlify (frontend), Railway/Render (backend), Supabase/PlanetScale (DB)
- Prefer serverless where appropriate to reduce idle costs
- Recommend free tiers and startup pricing plans where available
- Avoid enterprise tools (Datadog Pro, Splunk, Confluent Cloud) — prefer PostHog, Sentry free, Upstash
- Favor TypeScript/Node.js, Python, or Go for simplicity and hiring ease
- Keep the stack as small as possible — every service added is a service to maintain
- Provide a "v1 launch" path and a clear "scale when needed" path separately`
}

export default function StartupMode({ compact = false }) {
  const [enabled, setEnabled] = useState(
    () => localStorage.getItem(STARTUP_MODE_KEY) === 'true'
  )

  useEffect(() => {
    localStorage.setItem(STARTUP_MODE_KEY, enabled ? 'true' : 'false')
    // Dispatch custom event so other components can react
    window.dispatchEvent(new CustomEvent('startupModeChange', { detail: { enabled } }))
  }, [enabled])

  const toggle = () => setEnabled(p => !p)

  if (compact) {
    return (
      <button
        type="button"
        className={`${styles.compactToggle} ${enabled ? styles.compactOn : ''}`}
        onClick={toggle}
        aria-pressed={enabled}
        title={enabled ? 'Startup Mode ON — click to disable' : 'Enable Startup Mode for lean MVP architecture'}
      >
        <span className={styles.rocketIcon}>🚀</span>
        <span className={styles.compactLabel}>Startup Mode</span>
        <span className={`${styles.dot} ${enabled ? styles.dotOn : ''}`} />
      </button>
    )
  }

  return (
    <div className={`${styles.card} ${enabled ? styles.cardOn : ''}`}>
      <div className={styles.cardHeader}>
        <div className={styles.cardTitleRow}>
          <span className={styles.rocketBig}>🚀</span>
          <div>
            <div className={styles.cardTitle}>Startup Mode</div>
            <div className={styles.cardSubtitle}>
              Optimized for lean MVPs & indie devs
            </div>
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          className={`${styles.toggle} ${enabled ? styles.toggleOn : ''}`}
          onClick={toggle}
          aria-label={`Startup Mode ${enabled ? 'on' : 'off'}`}
        >
          <span className={styles.toggleThumb} />
        </button>
      </div>

      {enabled && (
        <div className={styles.activeHints}>
          <div className={styles.hint}>✓ Prefers Vercel, Railway, Supabase, Render</div>
          <div className={styles.hint}>✓ Avoids Kubernetes & enterprise infra</div>
          <div className={styles.hint}>✓ Optimizes for solo dev / small team</div>
          <div className={styles.hint}>✓ Highlights free-tier options</div>
          <div className={styles.hint}>✓ Provides v1 launch + scale paths</div>
        </div>
      )}

      {!enabled && (
        <p className={styles.desc}>
          When enabled, all architecture generations are biased toward startup-friendly,
          low-cost, low-ops tech choices. Perfect for founders, indie hackers, and bootcamp grads.
        </p>
      )}
    </div>
  )
}
