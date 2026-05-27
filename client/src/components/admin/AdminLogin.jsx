import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { LogIn, Lock, Mail } from 'lucide-react'
import { useAuthContext } from '../../context/AuthContext'
import styles from './AdminLogin.module.css'
import Logo from '../ui/Logo'

export default function AdminLogin() {
  const { appUser, login } = useAuthContext()
  const navigate = useNavigate()
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Redirect if already logged in as admin
  if (appUser?.email === 'ashishinframind@gmail.com') {
    return <Navigate to="/admin/reviews" replace />
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await login(email, password)
      navigate('/admin/reviews')
    } catch (err) {
      console.error('Admin Login Error', err)
      setError(err.message || 'Failed to sign in. Check credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.loginCard}>
        <div className={styles.header}>
          <Logo size={40} showText={true} />
          <h1 className={styles.title}>Admin Portal</h1>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Email</label>
            <div className={styles.inputWrapper}>
              <Mail className={styles.inputIcon} size={18} />
              <input
                type="email"
                required
                className={styles.input}
                placeholder="admin@inframind.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>Password</label>
            <div className={styles.inputWrapper}>
              <Lock className={styles.inputIcon} size={18} />
              <input
                type="password"
                required
                className={styles.input}
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>
          </div>
          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? 'Authenticating...' : (
              <>
                <LogIn size={18} /> Login to Admin
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
