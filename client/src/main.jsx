import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './styles/global.css'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { initAnalytics } from './utils/analytics.js'
import { initSyncManager } from './utils/syncManager.js'
import { getAuth } from 'firebase/auth'

// Initialize PostHog if configured
initAnalytics()

// Initialize Offline Sync Manager — replays IndexedDB queue on reconnect
initSyncManager({
  getToken: async () => {
    const auth = getAuth()
    const user = auth.currentUser
    if (!user) return null
    return user.getIdToken(/* forceRefresh */ false)
  },
  apiBase: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>
)
