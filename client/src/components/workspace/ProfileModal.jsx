// src/components/workspace/ProfileModal.jsx
import { useState, useEffect, useRef } from 'react'
import { X, User, Shield, Github, Twitter, Linkedin, Check, Loader2, AlertCircle, Camera, Link } from 'lucide-react'
import { useAuthContext } from '../../context/AuthContext.jsx'
import styles from './ProfileModal.module.css'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'
const CLOUD_NAME = process.env.REACT_APP_CLOUDINARY_CLOUD_NAME || 'dydsp9cdj'
const UPLOAD_PRESET = process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET || 'inframind'

export default function ProfileModal({ isOpen, onClose, currentProfile, onProfileUpdated }) {
  const { getFreshToken } = useAuthContext()
  const fileInputRef = useRef(null)

  const [username, setUsername]   = useState('')
  const [name, setName]           = useState('')
  const [photoUrl, setPhotoUrl]   = useState('')
  const [github, setGithub]       = useState('')
  const [twitter, setTwitter]     = useState('')
  const [linkedin, setLinkedin]   = useState('')

  const [loading, setLoading]     = useState(false)
  const [uploading, setUploading] = useState(false)
  const [status, setStatus]       = useState('')
  const [error, setError]         = useState(null)

  useEffect(() => {
    if (isOpen) {
      setError(null)
      setStatus('')
      if (currentProfile) {
        setUsername(currentProfile.username || '')
        setName(currentProfile.name || '')
        setPhotoUrl(currentProfile.photoUrl || '')
        setGithub(currentProfile.githubUrl || '')
        setTwitter(currentProfile.twitterUrl || '')
        setLinkedin(currentProfile.linkedinUrl || '')
      } else {
        setUsername('')
        setName('')
        setPhotoUrl('')
        setGithub('')
        setTwitter('')
        setLinkedin('')
      }
    }
  }, [isOpen, currentProfile])

  if (!isOpen) return null

  // Cloudinary image upload with Base64 fallback
  async function handleFileChange(e) {
    const file = e.target.files[0]
    if (!file) return

    setUploading(true)
    setError(null)
    setStatus('')

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('upload_preset', UPLOAD_PRESET)

      const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error('Cloudinary configuration error or upload failed. Falling back to local Base64 storage.')
      }

      const result = await response.json()
      if (result.secure_url) {
        setPhotoUrl(result.secure_url)
        setStatus('Photo uploaded to Cloudinary successfully!')
      }
    } catch (err) {
      console.warn('Cloudinary upload failed, using local Base64 storage fallback:', err)
      // Fallback to Base64
      const reader = new FileReader()
      reader.onloadend = () => {
        setPhotoUrl(reader.result)
        setStatus('Photo stored locally as Base64 (Cloudinary fallback).')
      }
      reader.readAsDataURL(file)
    } finally {
      setUploading(false)
    }
  }

  async function handleSave(e) {
    e.preventDefault()
    if (!username.trim()) {
      setError('Username is required')
      return
    }

    // Basic username validation: alphanumeric + underscores
    const usernameRegex = /^[a-zA-Z0-9_]+$/
    if (!usernameRegex.test(username.trim())) {
      setError('Username can only contain letters, numbers, and underscores')
      return
    }

    setLoading(true)
    setError(null)
    setStatus('')

    try {
      const token = await getFreshToken()
      const res = await fetch(`${API_BASE}/profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          username: username.trim(),
          name: name.trim(),
          photoUrl: photoUrl.trim(),
          githubUrl: github.trim(),
          twitterUrl: twitter.trim(),
          linkedinUrl: linkedin.trim()
        })
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update profile')
      }

      setStatus('Profile updated successfully!')
      if (onProfileUpdated) {
        onProfileUpdated(data.profile)
      }
      setTimeout(() => {
        setStatus('')
        onClose()
      }, 1200)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.content} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.titleGroup}>
            <User size={18} className={styles.titleIcon} />
            <h3>User Profile Settings</h3>
          </div>
          <button type="button" className={styles.closeBtn} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} className={styles.form}>
          <div className={styles.scrollArea}>
            
            {/* Avatar Section */}
            <div className={styles.avatarSection}>
              <div className={styles.avatarWrapper}>
                {photoUrl ? (
                  <img src={photoUrl} alt="Avatar Preview" className={styles.avatarPreview} />
                ) : (
                  <div className={styles.avatarPlaceholder}>
                    <User size={32} />
                  </div>
                )}
                <button
                  type="button"
                  className={styles.uploadTrigger}
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  title="Upload avatar photo"
                >
                  {uploading ? <Loader2 size={14} className={styles.spin} /> : <Camera size={14} />}
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  accept="image/*"
                  onChange={handleFileChange}
                />
              </div>
              <p className={styles.avatarHint}>Click camera to upload your photo to Cloudinary</p>
            </div>

            {/* Field: Photo URL (alternative) */}
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <Link size={12} className={styles.sectionIcon} />
                <span>Avatar Image URL</span>
              </div>
              <input
                type="text"
                className={styles.input}
                placeholder="https://example.com/avatar.png"
                value={photoUrl}
                onChange={(e) => setPhotoUrl(e.target.value)}
              />
            </div>

            {/* Field: Username */}
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <Shield size={12} className={styles.sectionIcon} />
                <span>Unique Username *</span>
              </div>
              <p className={styles.sectionDesc}>Used to identify your shared architecture diagrams.</p>
              <input
                type="text"
                className={styles.input}
                placeholder="e.g. janesmith"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>

            {/* Field: Display Name */}
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <User size={12} className={styles.sectionIcon} />
                <span>Full Name</span>
              </div>
              <input
                type="text"
                className={styles.input}
                placeholder="e.g. Jane Smith"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            {/* Social Links */}
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <span>Social Links</span>
              </div>
              <p className={styles.sectionDesc}>Showcase your developer presence on shared portfolios.</p>
              
              <div className={styles.socialInputRow}>
                <Github size={16} className={styles.socialIcon} />
                <input
                  type="text"
                  className={styles.input}
                  placeholder="GitHub URL (e.g. https://github.com/username)"
                  value={github}
                  onChange={(e) => setGithub(e.target.value)}
                />
              </div>

              <div className={styles.socialInputRow}>
                <Twitter size={16} className={styles.socialIcon} />
                <input
                  type="text"
                  className={styles.input}
                  placeholder="Twitter URL (e.g. https://twitter.com/handle)"
                  value={twitter}
                  onChange={(e) => setTwitter(e.target.value)}
                />
              </div>

              <div className={styles.socialInputRow}>
                <Linkedin size={16} className={styles.socialIcon} />
                <input
                  type="text"
                  className={styles.input}
                  placeholder="LinkedIn URL (e.g. https://linkedin.com/in/profile)"
                  value={linkedin}
                  onChange={(e) => setLinkedin(e.target.value)}
                />
              </div>
            </div>

          </div>

          {/* Footer */}
          <div className={styles.footer}>
            {error && (
              <span className={styles.error}>
                <AlertCircle size={12} /> {error}
              </span>
            )}
            {status && (
              <span className={styles.status}>
                <Check size={12} /> {status}
              </span>
            )}
            <button type="submit" className={styles.saveBtn} disabled={loading || uploading}>
              {loading ? 'Saving Changes…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
