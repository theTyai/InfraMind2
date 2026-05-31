import { useEffect, useState } from 'react'
import ArchitectureTabs from './ArchitectureTabs.jsx'
import { useArchitectureStore } from '../../store/useArchitectureStore.js'
import styles from './Workspace.module.css'

export default function Workspace(props) {
  const cooldownUntil = useArchitectureStore(state => state.cooldownUntil);
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (cooldownUntil > Date.now()) {
      const update = () => {
        const left = Math.ceil((cooldownUntil - Date.now()) / 1000);
        if (left <= 0) setRemaining(0);
        else setRemaining(left);
      };
      update();
      const interval = setInterval(update, 1000);
      return () => clearInterval(interval);
    } else {
      setRemaining(0);
    }
  }, [cooldownUntil]);

  const isCoolingDown = remaining > 0;

  if (props.state === 'error' && props.error) {
    return (
      <div className={styles.errorContainer} role="alert">
        <div className={styles.errorIcon}>⚡</div>
        <h3 className={styles.errorTitle}>We hit a bump in the connection</h3>
        <p className={styles.errorDesc}>
          {typeof props.error === 'string' && props.error.includes('System busy') 
            ? props.error 
            : "InfraMind couldn't reach the AI architect model. This usually happens due to Gemini API rate limits, temporary connection glitches, or a missing server-side environment key."}
        </p>
        <div className={styles.errorActions}>
          <button 
            type="button" 
            className={styles.errorActionBtnPrimary} 
            onClick={() => props.onSubmit && props.onSubmit({ idea: props.lastIdea })}
            disabled={isCoolingDown}
          >
            {isCoolingDown ? `Wait ${remaining}s...` : 'Retry Generation'}
          </button>
          <button 
            type="button" 
            className={styles.errorActionBtnSecondary} 
            onClick={props.onReset}
          >
            Return to Dashboard
          </button>
        </div>
        <p className={styles.errorTip}>
          💡 <strong>Pro Tip:</strong> You can add your own custom <strong>Gemini API Key</strong> in the Settings menu (under Workspace Settings) to bypass shared limits entirely.
        </p>
      </div>
    )
  }

  if (!props.data) {
    return <div className={styles.emptyState}>Preparing workspace canvas…</div>
  }

  return (
    <main className={styles.workspace}>
      <ArchitectureTabs
        {...props}
        data={props.data}
        idea={props.lastIdea}
        activeMode={props.activeMode}
        setActiveMode={props.setActiveMode}
      />
    </main>
  )
}
