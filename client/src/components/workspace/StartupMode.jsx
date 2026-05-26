// client/src/components/workspace/StartupMode.jsx
// 🚀 Infrastructure Optimization Mode — Smart architecture generation toggle
//
// When enabled, patches every AI prompt to optimize for:
//   - Lean MVP architecture (minimal services, fast to ship)
//   - Free-tier hosting (Supabase, Vercel Hobby, MongoDB Atlas)
//   - Solo-developer or small-team operational complexity
//
// The setting persists in localStorage as 'inframind_startup_mode'

import { useState, useEffect } from 'react'
import styles from './StartupMode.module.css'

export const STARTUP_MODE_KEY = 'inframind_startup_mode'

export function getStartupModePromptSuffix() {
  if (localStorage.getItem(STARTUP_MODE_KEY) !== 'true') return ''
  return `

IMPORTANT — INFRASTRUCTURE OPTIMIZATION MODE IS ENABLED:
Optimize this architecture strictly for free-tier platforms:
- Prefer free-tier options (Supabase, Vercel Hobby, MongoDB Atlas) over self-hosted or complex managed services
- Avoid high-cost AWS RDS, Kafka, EKS services unless specifically asked
- Minimize operational complexity — keep the stack as simple as possible for solo devs or small teams`
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
        title={enabled ? 'Optimization Mode ON (Free-Tier bias) — click to disable' : 'Enable Optimization Mode for free-tier / lean MVP architecture'}
      >
        <span className={styles.rocketIcon}>🚀</span>
        <span className={styles.compactLabel}>Optimization Mode</span>
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
            <div className={styles.cardTitle}>Infrastructure Optimization Mode</div>
            <div className={styles.cardSubtitle}>
              Biases recommendations toward free tiers vs enterprise
            </div>
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          className={`${styles.toggle} ${enabled ? styles.toggleOn : ''}`}
          onClick={toggle}
          aria-label={`Infrastructure Optimization Mode ${enabled ? 'on' : 'off'}`}
        >
          <span className={styles.toggleThumb} />
        </button>
      </div>

      {enabled && (
        <div className={styles.activeHints}>
          <div className={styles.hint}>✓ Prefers free tiers: Supabase, Vercel Hobby, MongoDB Atlas</div>
          <div className={styles.hint}>✓ Avoids high-cost AWS RDS, Kafka, EKS services</div>
          <div className={styles.hint}>✓ Optimizes for solo dev / zero budget</div>
          <div className={styles.hint}>✓ Highlights zero-cost options</div>
        </div>
      )}

      {!enabled && (
        <p className={styles.desc}>
          When enabled, biases recommendations toward free-tier platforms (Supabase, Vercel Hobby, MongoDB Atlas). When disabled (default), biases toward professional-grade managed infrastructure (AWS RDS, Kafka, EKS).
        </p>
      )}
    </div>
  )
}
