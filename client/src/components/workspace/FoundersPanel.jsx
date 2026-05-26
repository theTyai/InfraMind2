// client/src/components/workspace/FoundersPanel.jsx
// 🚀 Founders' Control Center: Cost, Viability, and MVP Scope Reducer

import { useMemo, useState } from 'react'
import { Rocket, Zap } from 'lucide-react'
import CostEstimator from './CostEstimator.jsx'
import { STARTUP_MODE_KEY } from './StartupMode.jsx'
import styles from './FoundersPanel.module.css'

export default function FoundersPanel({ architecture, onSubmit }) {
  const [reducing, setReducing] = useState(false)

  // Calculate stack viability metrics dynamically
  const viabilityMetrics = useMemo(() => {
    if (!architecture) return null

    const allText = JSON.stringify(architecture).toLowerCase()

    // Base scores
    let speed = 85  // Time-to-Market / speed to build
    let hiring = 80 // Easy to recruit developers
    let ops = 75    // Low Ops / maintenance overhead

    // Detect complex/heavy items that reduce speed & increase ops complexity
    if (allText.includes('kubernetes') || allText.includes('k8s') || allText.includes('gke') || allText.includes('eks')) {
      speed -= 20
      ops -= 25
    }
    if (allText.includes('kafka') || allText.includes('rabbitmq') || allText.includes('activemq')) {
      speed -= 10
      ops -= 12
    }
    if (allText.includes('cassandra') || allText.includes('couchbase') || allText.includes('hadoop')) {
      speed -= 15
      hiring -= 15
      ops -= 15
    }
    if (allText.includes('spring boot') || allText.includes('java') || allText.includes('angular') || allText.includes('dotnet') || allText.includes('.net')) {
      speed -= 8
    }
    if (allText.includes('rust') || allText.includes('cpp') || allText.includes('c++') || allText.includes('scala')) {
      speed -= 12
      hiring -= 25
    }

    // Detect simple/managed items that boost speed & ops simplicity
    if (allText.includes('supabase') || allText.includes('firebase') || allText.includes('firestore')) {
      speed += 12
      ops += 15
    }
    if (allText.includes('vercel') || allText.includes('netlify')) {
      speed += 10
      ops += 10
    }
    if (allText.includes('railway') || allText.includes('render') || allText.includes('fly.io')) {
      speed += 8
      ops += 8
    }
    if (allText.includes('react') || allText.includes('node.js') || allText.includes('express') || allText.includes('python')) {
      hiring += 12
    }

    // Clamp scores between 20 and 99
    speed = Math.max(20, Math.min(99, speed))
    hiring = Math.max(20, Math.min(99, hiring))
    ops = Math.max(20, Math.min(99, ops))

    const overall = Math.round((speed + hiring + ops) / 3)

    return { speed, hiring, ops, overall }
  }, [architecture])

  // Perform the MVP scope reduction
  const handleReduceScope = () => {
    if (!onSubmit || reducing) return
    setReducing(true)

    // Force Startup Mode on in localStorage so the refinement applies it
    localStorage.setItem(STARTUP_MODE_KEY, 'true')
    window.dispatchEvent(new CustomEvent('startupModeChange', { detail: { enabled: true } }))

    const reductionPrompt = 'Strip away all enterprise complexity, keep only free-tier services.'

    onSubmit({ idea: reductionPrompt, knownStack: [] })

    setTimeout(() => {
      setReducing(false)
    }, 3000)
  }

  if (!architecture) return null

  // Color grade based on overall score
  const scoreColor = viabilityMetrics?.overall >= 80 
    ? '#10b981' 
    : viabilityMetrics?.overall >= 60 
      ? '#f59e0b' 
      : '#ef4444'

  return (
    <div className={styles.panel}>
      <div className={styles.liveStatusRow}>
        <div className={styles.liveStatusLabel}>
          <Rocket size={14} className={styles.liveStatusIcon} />
          <span>Live Stack Status:</span>
          <strong style={{ color: scoreColor }}>{viabilityMetrics?.overall}% Viability</strong>
        </div>
        <div className={styles.gradientBarBg}>
          <div 
            className={styles.gradientBarFill} 
            style={{ 
              width: `${viabilityMetrics?.overall}%`, 
              background: `linear-gradient(90deg, ${scoreColor}, #3b82f6)` 
            }} 
          />
        </div>
        <button
          type="button"
          className={styles.miniReduceBtn}
          onClick={handleReduceScope}
          disabled={reducing}
          title="Simplify to Lean MVP Scope"
        >
          <Zap size={12} />
          {reducing ? 'Reducing...' : 'Simplify Scope'}
        </button>
      </div>
      <div className={styles.compactCostWrap}>
        <CostEstimator architecture={architecture} />
      </div>
    </div>
  )
}
