import { useEffect, useState } from 'react'
import styles from './Workspace.module.css'

const STEPS = [
  { text: 'Analyzing requirements...', doneText: 'Analyzing requirements... [Done]' },
  { text: 'Selecting infrastructure...', doneText: 'Selecting infrastructure... [Done]' },
  { text: 'Designing system diagram...', doneText: 'Designing system diagram... [Done]' },
  { text: 'Compiling API specifications...', doneText: 'Compiling API specifications... [Done]' },
  { text: 'Assembling architecture strategy...', doneText: 'Assembling architecture strategy... [Done]' },
]

export default function GenerationStream() {
  const [currentStep, setCurrentStep] = useState(0)
  const [completedSteps, setCompletedSteps] = useState([])
  const [showInitializing, setShowInitializing] = useState(false)

  useEffect(() => {
    if (currentStep >= STEPS.length) {
      setShowInitializing(true)
      return
    }

    const interval = setTimeout(() => {
      // Mark previous step as completed
      setCompletedSteps((prev) => [...prev, currentStep])
      // Advance to next step
      setCurrentStep((prev) => prev + 1)
    }, 1200)

    return () => clearTimeout(interval)
  }, [currentStep])

  return (
    <div className={styles.engineRoomOverlay}>
      <div className={styles.engineRoomGlow}></div>
      <section className={styles.terminalContainer}>
        <div className={styles.terminalHeaderBar}>
          <div className={styles.terminalDots}>
            <span className={styles.terminalDotClose}></span>
            <span className={styles.terminalDotMinimize}></span>
            <span className={styles.terminalDotMaximize}></span>
          </div>
          <div className={styles.terminalTitle}>InfraMind Engine Room v2.5</div>
        </div>

        <div className={styles.terminalBody}>
          {completedSteps.map((idx) => (
            <div key={idx} className={styles.terminalLogLine}>
              <span className={styles.terminalPromptSign}>&gt;</span>
              <span className={styles.terminalSuccessText}>{STEPS[idx].doneText}</span>
            </div>
          ))}

          {currentStep < STEPS.length && (
            <div className={styles.terminalLogLine}>
              <span className={styles.terminalPromptSign}>&gt;</span>
              <span className={styles.terminalThinkingText}>
                {STEPS[currentStep].text} <span className={styles.inProgressBadge}>[In Progress]</span>
              </span>
              <span className={styles.terminalPulseCursor}>▌</span>
            </div>
          )}

          {showInitializing && (
            <div className={styles.terminalLogLine}>
              <span className={styles.terminalPromptSign}>&gt;</span>
              <span className={styles.terminalThinkingText}>
                Initializing Workspace IDE... <span className={styles.inProgressBadge}>[Ready]</span>
              </span>
              <span className={styles.terminalPulseCursor}>▌</span>
            </div>
          )}
        </div>

        <div className={styles.engineRoomProgress}>
          <div 
            className={styles.engineRoomProgressFill} 
            style={{ width: `${Math.min(((completedSteps.length + (showInitializing ? 1 : 0)) / (STEPS.length + 1)) * 100, 100)}%` }}
          ></div>
        </div>
      </section>
    </div>
  )
}
