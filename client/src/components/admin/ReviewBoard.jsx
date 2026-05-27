import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { LogOut, Download, AlertCircle, RefreshCw, Loader2 } from 'lucide-react'
import { useAuthContext } from '../../context/AuthContext'
import styles from './ReviewBoard.module.css'
import Logo from '../ui/Logo'

export default function ReviewBoard() {
  const { appUser, logout, getFreshToken } = useAuthContext()
  const navigate = useNavigate()
  
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Redirect if not the admin
  if (appUser?.email !== 'ashishinframind@gmail.com') {
    return <Navigate to="/dashboard" replace />
  }

  const fetchReviews = async () => {
    setLoading(true)
    setError(null)
    try {
      const token = await getFreshToken()
      const res = await fetch('/api/reviews', {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) throw new Error('Failed to fetch reviews')
      const data = await res.json()
      setReviews(data)
    } catch (err) {
      console.error(err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReviews()
  }, [])

  const handleLogout = async () => {
    await logout()
    navigate('/admin/login')
  }

  const downloadCSV = () => {
    if (reviews.length === 0) return
    
    // Extract headers based on the first review item
    // (excluding complex objects or filtering out internal IDs if necessary, 
    // but here we just export everything simple)
    const allKeys = new Set()
    reviews.forEach(r => Object.keys(r).forEach(k => allKeys.add(k)))
    const headers = Array.from(allKeys).filter(k => k !== 'timestamp' || typeof r[k] !== 'object')

    const csvRows = []
    // Header row
    csvRows.push(headers.join(','))

    // Data rows
    reviews.forEach(review => {
      const values = headers.map(header => {
        let val = review[header]
        if (header === 'timestamp' && val?._seconds) {
          val = new Date(val._seconds * 1000).toLocaleString()
        }
        if (val === null || val === undefined) val = ''
        // Escape quotes and wrap in quotes for CSV
        const strVal = String(val).replace(/"/g, '""')
        return `"${strVal}"`
      })
      csvRows.push(values.join(','))
    })

    const csvString = csvRows.join('\n')
    const blob = new Blob([csvString], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.setAttribute('hidden', '')
    a.setAttribute('href', url)
    a.setAttribute('download', `inframind_reviews_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  if (loading) {
    return (
      <div className={styles.loadingState}>
        <Loader2 className={styles.spinner} size={32} />
        <p>Loading reviews...</p>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <Logo size={32} showText={true} />
          <div className={styles.divider} />
          <h1 className={styles.title}>Review Board</h1>
        </div>
        <div className={styles.headerRight}>
          <button className={styles.actionBtn} onClick={fetchReviews} title="Refresh">
            <RefreshCw size={18} />
            Refresh
          </button>
          <button className={styles.actionBtn} onClick={downloadCSV} disabled={reviews.length === 0}>
            <Download size={18} />
            Export CSV
          </button>
          <button className={styles.logoutBtn} onClick={handleLogout}>
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </header>

      <main className={styles.main}>
        {error ? (
          <div className={styles.errorState}>
            <AlertCircle size={48} className={styles.errorIcon} />
            <h2>Error Loading Data</h2>
            <p>{error}</p>
            <button className={styles.actionBtn} onClick={fetchReviews}>Try Again</button>
          </div>
        ) : reviews.length === 0 ? (
          <div className={styles.emptyState}>
            <h2>No Reviews Yet</h2>
            <p>Once users submit feedback, it will appear here.</p>
          </div>
        ) : (
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Overall</th>
                  <th>Project Type</th>
                  <th>Top Feature</th>
                  <th>Would Recommend</th>
                  <th>Feedback Snippet</th>
                </tr>
              </thead>
              <tbody>
                {reviews.map(review => (
                  <tr key={review.id}>
                    <td>
                      {review.timestamp?._seconds 
                        ? new Date(review.timestamp._seconds * 1000).toLocaleDateString()
                        : 'Unknown'}
                    </td>
                    <td>
                      <span className={`${styles.badge} ${review.overallExperience >= 8 ? styles.badgeGood : review.overallExperience <= 4 ? styles.badgeBad : styles.badgeWarn}`}>
                        {review.overallExperience}/10
                      </span>
                    </td>
                    <td>{review.projectTypeTested || '-'}</td>
                    <td>{review.mostUsedFeature || '-'}</td>
                    <td>
                      {review.wouldRecommend === true ? 'Yes' : review.wouldRecommend === false ? 'No' : '-'}
                    </td>
                    <td className={styles.truncateCell}>
                      {review.openFeedback || review.missingFeatures || review.bugsFaced || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  )
}
