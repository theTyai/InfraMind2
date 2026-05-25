// src/components/ErrorBoundary.jsx
import { Component } from 'react'
import styles from './ErrorBoundary.module.css'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null, showDetails: false }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo })
    console.error('[InfraMind] Uncaught render error:', error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null, showDetails: false })
    if (this.props.onReset) this.props.onReset()
    else window.location.href = '/dashboard'
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div className={styles.wrapper}>
        <div className={styles.card}>
          <div className={styles.iconRow}>
            <div className={styles.iconBg}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"/>
              </svg>
            </div>
          </div>

          <div className={styles.eyebrow}>InfraMind · Error Boundary</div>
          <h1 className={styles.title}>Something went wrong</h1>
          <p className={styles.desc}>
            An unexpected error occurred in the workspace. Your projects are safe — this is an isolated UI crash.
          </p>

          <div className={styles.actions}>
            <button className={styles.primaryBtn} onClick={this.handleReset}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                <path d="M3 3v5h5"/>
              </svg>
              Back to Dashboard
            </button>
            <button className={styles.secondaryBtn} onClick={() => window.location.reload()}>
              Reload page
            </button>
          </div>

          <button
            className={styles.detailsToggle}
            onClick={() => this.setState(s => ({ showDetails: !s.showDetails }))}
          >
            {this.state.showDetails ? '▲ Hide' : '▼ Show'} error details
          </button>

          {this.state.showDetails && (
            <pre className={styles.errorPre}>
              {this.state.error?.toString()}
              {'\n\n'}
              {this.state.errorInfo?.componentStack}
            </pre>
          )}
        </div>
      </div>
    )
  }
}
