// src/components/workspace/ShareModal.jsx
import { useState, useEffect } from 'react'
import { X, Globe, Lock, Link2, Check, Loader2, AlertCircle, Users, UserPlus, Trash2 } from 'lucide-react'
import { useAuthContext } from '../../context/AuthContext.jsx'
import { useArchitectureStore } from '../../store/useArchitectureStore.js'
import { trackEvent, EVENTS } from '../../utils/analytics.js'
import styles from './ShareModal.module.css'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'

export default function ShareModal({ isOpen, onClose }) {
  const { appUser, getFreshToken } = useAuthContext()
  const currentProjectId = useArchitectureStore(s => s.currentProjectId)
  const projects = useArchitectureStore(s => s.projects)
  const fetchProjects = useArchitectureStore(s => s.fetchProjects)

  const [shareId, setShareId]     = useState(null)
  const [isPublic, setIsPublic]   = useState(false)
  const [loading, setLoading]     = useState(false)
  const [copied, setCopied]       = useState(false)
  const [error, setError]         = useState(null)

  // Collaborator states
  const [collabList, setCollabList]   = useState([])
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [collabLoading, setCollabLoading] = useState(false)
  const [isOwner, setIsOwner]         = useState(true)
  const [ownerEmail, setOwnerEmail]   = useState('')

  const shareUrl = shareId
    ? `${window.location.origin}/p/${shareId}`
    : null

  // Fetch collaborator details
  async function fetchCollaborators() {
    if (!currentProjectId) return
    setCollabLoading(true)
    try {
      const token = await getFreshToken()
      const res = await fetch(`${API_BASE}/projects/${currentProjectId}/collaborators`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setCollabList(data.collaboratorsList || [])
        setOwnerEmail(data.ownerEmail || '')
        setIsOwner(data.ownerId === appUser?.uid)
      }
    } catch (err) {
      console.error('Failed to fetch collaborators:', err)
    } finally {
      setCollabLoading(false)
    }
  }

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
      fetchCollaborators()
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

  async function handleInvite(e) {
    e.preventDefault()
    if (!inviteEmail.trim() || !currentProjectId) return
    setInviteLoading(true)
    setError(null)
    try {
      const token = await getFreshToken()
      const res = await fetch(`${API_BASE}/projects/${currentProjectId}/collaborators`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ email: inviteEmail.trim() })
      })
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to add collaborator');
      }
      setInviteEmail('')
      await fetchCollaborators()
    } catch (err) {
      setError(err.message)
    } finally {
      setInviteLoading(false)
    }
  }

  async function handleRemoveCollab(collabUid) {
    if (!currentProjectId) return
    if (!window.confirm('Are you sure you want to remove this collaborator?')) return
    setError(null)
    try {
      const token = await getFreshToken()
      const res = await fetch(`${API_BASE}/projects/${currentProjectId}/collaborators/${collabUid}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to remove collaborator');
      }
      await fetchCollaborators()
    } catch (err) {
      setError(err.message)
    }
  }

  if (!isOpen) return null

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerTitle}>
            <Globe size={18} className={styles.headerIcon} />
            <h3>Share & Collaborate</h3>
          </div>
          <button className={styles.closeBtn} onClick={onClose}><X size={16} /></button>
        </div>

        {/* Body */}
        <div className={styles.body}>
          {/* Public Share Section */}
          <div className={styles.sectionHeader}>
            <Globe size={14} />
            <span>Public Live Link</span>
          </div>
          <p className={styles.desc}>
            Make this architecture publicly viewable. Anyone with the link can see it — read-only.
          </p>

          <div className={styles.toggleRow}>
            <div className={styles.toggleLabel}>
              {isPublic
                ? <><Globe size={14} className={styles.publicIcon} /> Public link enabled</>
                : <><Lock size={14} className={styles.privateIcon} /> Private (only team members)</>
              }
            </div>
            {isOwner ? (
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
            ) : (
              <span className={styles.roleBadge}>Collaborator Read-Only</span>
            )}
          </div>

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

          {/* Divider */}
          <div className={styles.divider} />

          {/* Private Collaborators Section */}
          <div className={styles.sectionTitle}>
            <Users size={14} />
            <span>Teammates & Access Control</span>
          </div>
          <p className={styles.desc}>
            Add registered team members by email to grant them workspace access, real-time presence cursor tracking, and collaborative node review comments.
          </p>

          {isOwner ? (
            <form onSubmit={handleInvite} className={styles.inviteForm}>
              <input
                type="email"
                placeholder="colleague@company.com"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                className={styles.inviteInput}
                disabled={inviteLoading}
                required
              />
              <button 
                type="submit" 
                className={styles.inviteBtn}
                disabled={inviteLoading || !inviteEmail.trim()}
              >
                {inviteLoading ? <Loader2 size={14} className={styles.spin} /> : <><UserPlus size={14} /> Invite</>}
              </button>
            </form>
          ) : (
            <p className={styles.roleNotice}>
              💡 Only the project owner can invite or remove workspace members.
            </p>
          )}

          {error && (
            <div className={styles.errorBanner}>
              <AlertCircle size={14} />
              {error}
            </div>
          )}

          {/* Collaborator List */}
          <div className={styles.collabList}>
            {/* Owner Row */}
            <div className={styles.collabItem}>
              <div className={styles.collabInfo}>
                <strong>{ownerEmail || 'Owner'}</strong>
              </div>
              <span className={`${styles.roleBadge} ${styles.roleBadgeOwner}`}>Owner</span>
            </div>

            {/* Collaborators Rows */}
            {collabLoading ? (
              <div style={{ textAlign: 'center', padding: '8px', color: 'var(--text-muted)' }}>
                Loading teammates...
              </div>
            ) : (
              collabList.map(c => (
                <div key={c.uid} className={styles.collabItem}>
                  <div className={styles.collabInfo}>
                    <span>{c.email}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className={styles.roleBadge}>Collaborator</span>
                    {isOwner && (
                      <button
                        type="button"
                        onClick={() => handleRemoveCollab(c.uid)}
                        className={styles.removeCollabBtn}
                        title="Remove access"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
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
