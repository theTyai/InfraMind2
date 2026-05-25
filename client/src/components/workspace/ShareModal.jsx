// src/components/workspace/ShareModal.jsx
import { useState, useEffect } from 'react'
import { X, Globe, Lock, Link2, Check, Loader2, AlertCircle } from 'lucide-react'
import { useAuthContext } from '../../context/AuthContext.jsx'
import { useArchitectureStore } from '../../store/useArchitectureStore.js'
import { trackEvent, EVENTS } from '../../utils/analytics.js'
import styles from './ShareModal.module.css'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'

export default function ShareModal({ isOpen, onClose }) {
  const { getFreshToken } = useAuthContext()
  const currentProjectId = useArchitectureStore(s => s.currentProjectId)
  const projects = useArchitectureStore(s => s.projects)
  const fetchProjects = useArchitectureStore(s => s.fetchProjects)

  const [shareId, setShareId]     = useState(null)
  const [isPublic, setIsPublic]   = useState(false)
  const [loading, setLoading]     = useState(false)
  const [copied, setCopied]       = useState(false)
  const [error, setError]         = useState(null)

  const shareUrl = shareId
    ? `${window.location.origin}/p/${shareId}`
    : null

  // Sync state when modal opens or current project changes
  useEffect(() => {
    if (isOpen) {
      setError(null)
      setCopied(false)
      const currentProj = projects.find(p => p.id === currentProjectId)
      if (currentProj) {
        setIsPublic(!!currentProj.isPublic)
        setShareId(currentProj.shareId || null)
      } else {
        setIsPublic(false)
        setShareId(null)
      }
    }
  }, [isOpen, currentProjectId, projects])

  async function handleToggle() {
    if (!currentProjectId) return
    setLoading(true)
    setError(null)
    try {
      const token = await getFreshToken()
      if (!isPublic) {
        // Enable sharing
        const res = await fetch(`${API_BASE}/projects/${currentProjectId}/share`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` }
        })
        if (!res.ok) throw new Error((await res.json()).error)
        const data = await res.json()
        setShareId(data.shareId)
        setIsPublic(true)
        trackEvent(EVENTS.SHARE_CREATED, { projectId: currentProjectId })
      } else {
        // Revoke sharing
        await fetch(`${API_BASE}/projects/${currentProjectId}/share`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        })
        setShareId(null)
        setIsPublic(false)
      }
      // Sync local projects list in Zustand
      await fetchProjects(token)
    } catch (err) {
      setError(err.message || 'Failed to update share settings')
    } finally {
      setLoading(false)
    }
  }

  async function handleCopy() {
    if (!shareUrl) return
    await navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    trackEvent(EVENTS.SHARE_COPIED, { shareId })
    setTimeout(() => setCopied(false), 2500)
  }

  if (!isOpen) return null

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerTitle}>
            <Globe size={18} className={styles.headerIcon} />
            <h3>Share Architecture</h3>
          </div>
          <button className={styles.closeBtn} onClick={onClose}><X size={16} /></button>
        </div>

        {/* Body */}
        <div className={styles.body}>
          <p className={styles.desc}>
            Make this architecture publicly viewable. Anyone with the link can see it — without an account.
          </p>

          {/* Toggle Row */}
          <div className={styles.toggleRow}>
            <div className={styles.toggleLabel}>
              {isPublic
                ? <><Globe size={14} className={styles.publicIcon} /> Public link enabled</>
                : <><Lock size={14} className={styles.privateIcon} /> Private (only you)</>
              }
            </div>
            <button
              className={`${styles.toggle} ${isPublic ? styles.toggleOn : ''}`}
              onClick={handleToggle}
              disabled={loading || !currentProjectId}
              aria-label="Toggle public sharing"
            >
              {loading
                ? <Loader2 size={14} className={styles.spin} />
                : <span className={styles.toggleThumb} />
              }
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className={styles.errorBanner}>
              <AlertCircle size={14} />
              {error}
            </div>
          )}

          {/* Share Link */}
          {isPublic && shareUrl && (
            <div className={styles.linkBox}>
              <div className={styles.linkUrl}>
                <Link2 size={13} className={styles.linkIcon} />
                <span>{shareUrl}</span>
              </div>
              <button
                className={`${styles.copyBtn} ${copied ? styles.copyBtnDone : ''}`}
                onClick={handleCopy}
              >
                {copied ? <><Check size={13} /> Copied!</> : 'Copy link'}
              </button>
            </div>
          )}

          {/* Info */}
          <div className={styles.infoBox}>
            <p>🔒 Viewers cannot edit or regenerate the architecture.</p>
            <p>🌐 Your display name and username are shared on the page badge.</p>
            <p>🔗 Turn off to instantly revoke all access.</p>
          </div>
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <button className={styles.doneBtn} onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  )
}
