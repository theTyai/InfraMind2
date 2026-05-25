import { useState, useEffect } from 'react'
import { X, Settings, Shield, Sliders, Trash2, Check } from 'lucide-react'
import styles from './SettingsModal.module.css'

export default function SettingsModal({ isOpen, onClose }) {
  const [key, setKey] = useState('')
  const [model, setModel] = useState('gemini-2.5-flash')
  const [theme, setTheme] = useState('glassmorphism')
  const [statusMessage, setStatusMessage] = useState('')

  useEffect(() => {
    if (isOpen) {
      setKey(localStorage.getItem('inframind_api_key') || '')
      setModel(localStorage.getItem('inframind_model') || 'gemini-2.5-flash')
      setTheme(localStorage.getItem('inframind_theme') || 'glassmorphism')
      setStatusMessage('')
    }
  }, [isOpen])

  if (!isOpen) return null

  function handleSave(e) {
    e.preventDefault()
    
    // Save API key
    if (key.trim()) {
      localStorage.setItem('inframind_api_key', key.trim())
    } else {
      localStorage.removeItem('inframind_api_key')
    }

    // Save Model
    localStorage.setItem('inframind_model', model)

    // Save Theme
    localStorage.setItem('inframind_theme', theme)
    document.documentElement.setAttribute('data-theme', theme)

    localStorage.setItem('inframind_checklist_key', 'true')

    setStatusMessage('Settings saved successfully!')
    setTimeout(() => {
      setStatusMessage('')
      onClose()
    }, 1200)
  }

  function handleClearCache() {
    if (window.confirm('Are you sure you want to clear your local workspace cache? This will reset custom preferences.')) {
      localStorage.removeItem('inframind_api_key')
      localStorage.removeItem('inframind_model')
      localStorage.removeItem('inframind_theme')
      setKey('')
      setModel('gemini-2.5-flash')
      setTheme('glassmorphism')
      document.documentElement.removeAttribute('data-theme')
      
      setStatusMessage('Cache cleared successfully!')
      setTimeout(() => setStatusMessage(''), 2000)
    }
  }

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.content} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.titleGroup}>
            <Settings size={18} className={styles.titleIcon} />
            <h3>Workspace Settings</h3>
          </div>
          <button type="button" className={styles.closeBtn} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSave} className={styles.form}>
          <div className={styles.scrollArea}>
            {/* Section 1: API Configuration */}
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <Shield size={14} className={styles.sectionIcon} />
                <span>Gemini API Key</span>
              </div>
              <p className={styles.sectionDesc}>
                By default, requests are routed using the server environment key. Enter a custom key to override.
              </p>
              <input
                type="password"
                className={styles.input}
                placeholder="AIzaSy..."
                value={key}
                onChange={(e) => setKey(e.target.value)}
              />
            </div>

            {/* Section 2: Model Configuration */}
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <Sliders size={14} className={styles.sectionIcon} />
                <span>AI Architecture Model</span>
              </div>
              <p className={styles.sectionDesc}>
                Select the model level for generation recommendations and reasoning.
              </p>
              <select
                className={styles.select}
                value={model}
                onChange={(e) => setModel(e.target.value)}
              >
                <option value="gemini-2.5-flash">Gemini 2.5 Flash (Fast, default)</option>
                <option value="gemini-2.5-pro">Gemini 2.5 Pro (Deep Reasoning)</option>
              </select>
            </div>

            {/* Section 3: Theme Configuration */}
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <Sliders size={14} className={styles.sectionIcon} />
                <span>Interface Theme</span>
              </div>
              <p className={styles.sectionDesc}>
                Choose your UI presentation styling mode.
              </p>
              <select
                className={styles.select}
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
              >
                <option value="glassmorphism">Glassmorphic Dark (Recommended)</option>
                <option value="neon">Cyberpunk Neon</option>
                <option value="slate">Classic Slate</option>
              </select>
            </div>
          </div>

          <div className={styles.footer}>
            <button
              type="button"
              className={styles.clearBtn}
              onClick={handleClearCache}
              title="Reset Cache"
            >
              <Trash2 size={14} /> Reset
            </button>
            <div className={styles.actions}>
              {statusMessage && (
                <span className={styles.status}>
                  <Check size={12} /> {statusMessage}
                </span>
              )}
              <button type="submit" className={styles.saveBtn}>
                Save Changes
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
