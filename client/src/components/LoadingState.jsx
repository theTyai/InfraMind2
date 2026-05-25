import { useEffect, useState } from 'react'
import styles from './LoadingState.module.css'

const STEPS = [
  { id: 1, label: 'Parsing product brief', status: 'Reading constraints, users, and product shape.' },
  { id: 2, label: 'Mapping core stack', status: 'Balancing fit, complexity, and developer familiarity.' },
  { id: 3, label: 'Drafting system design', status: 'Outlining boundaries between frontend, services, and data.' },
  { id: 4, label: 'Generating APIs and schema', status: 'Creating realistic routes and durable data models.' },
  { id: 5, label: 'Preparing rollout plan', status: 'Structuring deployment, scaling notes, and MVP phases.' },
]

export default function LoadingState() {
  const [active, setActive] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setActive((prev) => (prev + 1) % STEPS.length)
    }, 1100)

    return () => clearInterval(timer)
  }, [])

  return (
    <div className={styles.wrap}>
      <div className={styles.inner}>
        <div className={styles.heroRow}>
          <div className={styles.spinnerWrap}>
            <div className={styles.spinnerOrbit} />
            <div className={styles.spinnerCore} />
            <div className={styles.spinnerPulse} />
          </div>

          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>Generating workspace</p>
            <h2 className={styles.heading}>Building your architecture view</h2>
            <p className={styles.sub}>This usually takes 5 to 10 seconds and includes one repair pass if the JSON needs cleanup.</p>
          </div>
        </div>

        <div className={styles.timeline}>
          {STEPS.map((step, index) => (
            <div
              key={step.id}
              className={`${styles.step} ${index === active ? styles.stepActive : index < active ? styles.stepDone : ''}`}
            >
              <div className={styles.stepIndex}>{`0${step.id}`}</div>
              <div className={styles.stepBody}>
                <div className={styles.stepLabel}>{step.label}</div>
                <div className={styles.stepStatus}>{step.status}</div>
              </div>
              <div className={styles.stepState}>
                {index < active ? 'Done' : index === active ? 'Live' : 'Queued'}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
