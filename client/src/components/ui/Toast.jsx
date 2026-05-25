// client/src/components/ui/Toast.jsx
// Lightweight toast notification component.
// Replaces all browser alert() calls throughout the app.
// Auto-dismisses after 5 seconds. Can be manually dismissed.

import { useEffect, useState } from 'react'

const TYPE_STYLES = {
  success: {
    background: 'rgba(16, 185, 129, 0.15)',
    border: '1px solid rgba(16, 185, 129, 0.35)',
    color: '#6ee7b7',
    icon: '✓',
  },
  error: {
    background: 'rgba(239, 68, 68, 0.15)',
    border: '1px solid rgba(239, 68, 68, 0.35)',
    color: '#fca5a5',
    icon: '✕',
  },
  warning: {
    background: 'rgba(234, 179, 8, 0.15)',
    border: '1px solid rgba(234, 179, 8, 0.35)',
    color: '#fde68a',
    icon: '⚠',
  },
  info: {
    background: 'rgba(59, 130, 246, 0.15)',
    border: '1px solid rgba(59, 130, 246, 0.35)',
    color: '#93c5fd',
    icon: 'ℹ',
  },
}

export default function Toast({ message, type = 'info', onDismiss, duration = 5000 }) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    if (!duration) return
    const t = setTimeout(() => {
      setVisible(false)
      setTimeout(onDismiss, 300) // wait for fade-out
    }, duration)
    return () => clearTimeout(t)
  }, [duration, onDismiss])

  const s = TYPE_STYLES[type] || TYPE_STYLES.info

  return (
    <div
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      style={{
        position: 'fixed',
        top: '1.25rem',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 99998,
        display: 'flex',
        alignItems: 'center',
        gap: '0.6rem',
        padding: '0.65rem 1.1rem',
        borderRadius: '0.75rem',
        fontSize: '0.83rem',
        fontWeight: 500,
        fontFamily: 'Inter, system-ui, sans-serif',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        background: s.background,
        border: s.border,
        color: s.color,
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        maxWidth: 'min(90vw, 480px)',
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.3s ease',
        pointerEvents: visible ? 'auto' : 'none',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}
    >
      <span aria-hidden="true" style={{ fontSize: '1rem', flexShrink: 0 }}>{s.icon}</span>
      <span style={{ flex: 1 }}>{message}</span>
      <button
        type="button"
        aria-label="Dismiss notification"
        onClick={() => { setVisible(false); setTimeout(onDismiss, 300) }}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'inherit',
          opacity: 0.6,
          fontSize: '1rem',
          lineHeight: 1,
          padding: '0 0.25rem',
          flexShrink: 0,
        }}
      >
        ×
      </button>
    </div>
  )
}
