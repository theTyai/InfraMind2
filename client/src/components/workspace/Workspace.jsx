import ArchitectureTabs from './ArchitectureTabs.jsx'
import styles from './Workspace.module.css'

export default function Workspace(props) {
  if (props.state === 'error' && props.error) {
    return (
      <div className={styles.errorContainer}>
        <div className={styles.errorIcon}>⚡</div>
        <h3 className={styles.errorTitle}>We hit a bump in the connection</h3>
        <p className={styles.errorDesc}>
          InfraMind couldn't reach the AI architect model. This usually happens due to Gemini API rate limits, temporary connection glitches, or a missing server-side environment key.
        </p>
        <div className={styles.errorActions}>
          <button 
            type="button" 
            className={styles.errorActionBtnPrimary} 
            onClick={() => props.onSubmit && props.onSubmit({ idea: props.lastIdea })}
          >
            Retry Generation
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
        data={props.data}
        idea={props.lastIdea}
        onExport={props.onExport}
        onScaffold={props.onScaffold}
        onOpenShare={props.onOpenShare}
        exporting={props.exporting}
        onSubmit={props.onSubmit}
        envKeyStatus={props.envKeyStatus}
        selectedNode={props.selectedNode}
        onSelectNode={props.onSelectNode}
      />
    </main>

  )
}
