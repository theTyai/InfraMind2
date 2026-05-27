import { useState } from 'react'
import { X, Mail, Lock, User, Shield } from 'lucide-react'
import { updateProfile } from 'firebase/auth'
import { auth } from '../../utils/firebase'
import { useAuthContext } from '../../context/AuthContext'
import Logo from '../ui/Logo.jsx'
import styles from './AuthModal.module.css'

export default function AuthModal({ isOpen, onClose, login, signup }) {
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState('Engineer')
  const [goal, setGoal] = useState('MVP')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { loginWithGoogle } = useAuthContext()

  if (!isOpen) return null

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (!email.trim() || !password.trim()) {
      setError('Please fill in all fields')
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      setLoading(false)
      return
    }

    try {
      if (isSignUp) {
        await signup(email.trim(), password.trim())
        const userName = name.trim() || email.split('@')[0]
        if (auth.currentUser) {
          await updateProfile(auth.currentUser, { displayName: userName })
        }
        localStorage.setItem('inframind_role', role)
        localStorage.setItem('inframind_goal', goal)
      } else {
        await login(email.trim(), password.trim())
      }
      // Reset form
      setEmail('')
      setPassword('')
      setName('')
      onClose()
    } catch (err) {
      console.error(err)
      let msg = err.message || 'Authentication failed.'
      if (err.code === 'auth/email-already-in-use') {
        msg = 'This email address is already in use.'
      } else if (err.code === 'auth/invalid-credential') {
        msg = 'Invalid email or password.'
      } else if (err.code === 'auth/weak-password') {
        msg = 'Password is too weak.'
      } else if (err.code === 'auth/invalid-email') {
        msg = 'Invalid email address.'
      }
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogleLogin() {
    setError('')
    setLoading(true)
    try {
      await loginWithGoogle()
      onClose()
    } catch (err) {
      console.error(err)
      setError(err.message || 'Google authentication failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <Logo size={24} showText={true} />
          <button type="button" className={styles.closeBtn} onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {/* Form Container */}
        <div className={styles.content}>
          <div className={styles.tabs}>
            <button 
              type="button" 
              className={`${styles.tab} ${!isSignUp ? styles.activeTab : ''}`}
              onClick={() => { setIsSignUp(false); setError(''); }}
              disabled={loading}
            >
              Sign In
            </button>
            <button 
              type="button" 
              className={`${styles.tab} ${isSignUp ? styles.activeTab : ''}`}
              onClick={() => { setIsSignUp(true); setError(''); }}
              disabled={loading}
            >
              Create Account
            </button>
          </div>

          <form onSubmit={handleSubmit} className={styles.form}>
            {isSignUp && (
              <div className={styles.inputField}>
                <label htmlFor="auth-name" className={styles.label}>Full Name</label>
                <div className={styles.inputWrap}>
                  <User size={16} className={styles.inputIcon} />
                  <input
                    id="auth-name"
                    type="text"
                    className={styles.input}
                    placeholder="John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>
            )}

            <div className={styles.inputField}>
              <label htmlFor="auth-email" className={styles.label}>Email Address</label>
              <div className={styles.inputWrap}>
                <Mail size={16} className={styles.inputIcon} />
                <input
                  id="auth-email"
                  type="email"
                  className={styles.input}
                  placeholder="developer@inframind.ai"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            <div className={styles.inputField}>
              <label htmlFor="auth-password" className={styles.label}>Password</label>
              <div className={styles.inputWrap}>
                <Lock size={16} className={styles.inputIcon} />
                <input
                  id="auth-password"
                  type="password"
                  className={styles.input}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            {isSignUp && (
              <>
                <div className={styles.inputField}>
                  <label htmlFor="auth-role" className={styles.label}>Your Role</label>
                  <div className={styles.inputWrap}>
                    <select
                      id="auth-role"
                      className={styles.select}
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      disabled={loading}
                    >
                      <option value="Engineer">Software Engineer</option>
                      <option value="Architect">Solutions Architect</option>
                      <option value="DevOps">DevOps / SRE</option>
                      <option value="CTO">CTO / Founder</option>
                    </select>
                  </div>
                </div>

                <div className={styles.inputField}>
                  <label htmlFor="auth-goal" className={styles.label}>Primary Goal</label>
                  <div className={styles.inputWrap}>
                    <select
                      id="auth-goal"
                      className={styles.select}
                      value={goal}
                      onChange={(e) => setGoal(e.target.value)}
                      disabled={loading}
                    >
                      <option value="MVP">Prototyping MVPs</option>
                      <option value="Docs">System Documentation</option>
                      <option value="Tech">Exploring Tech Stacks</option>
                    </select>
                  </div>
                </div>
              </>
            )}

            {error && <div className={styles.error}>{error}</div>}

            <div className={styles.demoTip}>
              <Shield size={12} className={styles.tipIcon} />
              <span>InfraMind authentication database is secured with SSL.</span>
            </div>

            <button type="submit" className={styles.submitBtn} disabled={loading}>
              {loading ? 'Authenticating...' : isSignUp ? 'Get Started' : 'Sign In'}
            </button>
            
            <div className={styles.divider}>
              <span>or</span>
            </div>

            <button 
              type="button" 
              className={styles.googleBtn} 
              onClick={handleGoogleLogin} 
              disabled={loading}
            >
              <svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
