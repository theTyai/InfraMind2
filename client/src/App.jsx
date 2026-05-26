// src/App.jsx — Fixed: single AuthenticatedApp instance, home navigation, security, a11y
import { useCallback, useEffect, useState, useRef } from 'react'
import { Routes, Route, Navigate, useNavigate, useLocation, useParams } from 'react-router-dom'

import { useAuthContext } from './context/AuthContext.jsx'
import { useArchitecture } from './hooks/useArchitecture.js'
import { useArchitectureStore } from './store/useArchitectureStore.js'
import { exportToPdf } from './utils/exportPdf.js'
import { generateScaffold } from './utils/generateScaffold.js'
import { trackEvent, identifyUser, EVENTS } from './utils/analytics.js'

import AppShell from './components/layout/AppShell.jsx'
import LandingPage from './components/workspace/LandingPage.jsx'
import Dashboard from './components/workspace/Dashboard.jsx'
import GenerationStream from './components/workspace/GenerationStream.jsx'
import PublicShare from './components/workspace/PublicShare.jsx'
import CommandPalette from './components/ui/CommandPalette.jsx'
import AuthModal from './components/workspace/AuthModal.jsx'
import SettingsModal from './components/workspace/SettingsModal.jsx'
import TemplatesModal from './components/workspace/TemplatesModal.jsx'
import DocsModal from './components/workspace/DocsModal.jsx'
import SavedArchitecturesModal from './components/workspace/SavedArchitecturesModal.jsx'
import ShareModal from './components/workspace/ShareModal.jsx'
import ProfileModal from './components/workspace/ProfileModal.jsx'
import OfflineIndicator from './components/ui/OfflineIndicator.jsx'
import SkipLink from './components/ui/SkipLink.jsx'
import Toast from './components/ui/Toast.jsx'

// ── Loader ───────────────────────────────────────────────────────────────────
function Loader({ text = 'Loading…' }) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={text}
      style={{
        display: 'flex', height: '100vh', alignItems: 'center',
        justifyContent: 'center', background: '#050507',
        color: 'rgba(255,255,255,0.35)', fontFamily: 'Inter, sans-serif', fontSize: '0.88rem',
        gap: '10px'
      }}
    >
      <span
        aria-hidden="true"
        style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.1)', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }}
      />
      {text}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

// ── Toast hook ───────────────────────────────────────────────────────────────
function useToast() {
  const [toast, setToast] = useState(null)
  const show = useCallback((message, type = 'info') => {
    setToast({ message, type, id: Date.now() })
  }, [])
  const clear = useCallback(() => setToast(null), [])
  return { toast, show, clear }
}

// ── The single authenticated shell — mounted ONCE via wildcard route ──────────
// Reads location to decide which view to show, keeping all state alive.
function AuthenticatedApp({ modals, setModals, onAuthRequired }) {
  const { appUser, idToken, getFreshToken, logout } = useAuthContext()
  const { state, data, error, generate, reset, load } = useArchitecture()
  const navigate = useNavigate()
  const location = useLocation()
  const { projectId } = useParams()
  const { toast, show: showToast, clear: clearToast } = useToast()

  const [lastIdea, setLastIdea]         = useState('')
  const [exporting, setExporting]       = useState(false)
  const [selectedNode, setSelectedNode] = useState(null)
  const [search, setSearch]             = useState('')
  const [commandOpen, setCommandOpen]   = useState(false)
  const [activeMode, setActiveMode]     = useState('cto')

  const projects         = useArchitectureStore(s => s.projects)
  const chatHistories    = useArchitectureStore(s => s.chatHistories)
  const currentProjectId = useArchitectureStore(s => s.currentProjectId)
  const currentArch      = useArchitectureStore(s => s.currentArchitecture)
  const fetchProjects    = useArchitectureStore(s => s.fetchProjects)
  const clearStore       = useArchitectureStore(s => s.clearStore)

  // Determine current view from URL
  const isWorkspace = location.pathname.startsWith('/workspace')
  const isDashboard = location.pathname.startsWith('/dashboard')

  const [profile, setProfile] = useState(null)

  const fetchProfile = useCallback(async (token) => {
    if (!token || token === 'null' || token === 'undefined') return
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'}/profile`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        const d = await res.json()
        setProfile(d.profile || null)
      }
    } catch (err) {
      console.error('Failed to fetch profile:', err)
    }
  }, [])

  // Fetch projects on auth
  useEffect(() => {
    if (appUser && idToken) {
      fetchProjects(idToken)
      fetchProfile(idToken)
      identifyUser(appUser.uid, { email: appUser.email, name: appUser.displayName })
    } else {
      clearStore()
      setProfile(null)
    }
  }, [appUser, idToken, fetchProjects, clearStore, fetchProfile])

  // Apply saved theme on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('inframind_theme') || 'dark'
    document.documentElement.setAttribute('data-theme', savedTheme)
  }, [])

  // Handle GitHub OAuth Redirect Callbacks — use toast instead of alert()
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const githubStatus = params.get('github')
    if (githubStatus) {
      if (githubStatus === 'success') {
        showToast('🎉 GitHub account linked successfully!', 'success')
      } else {
        const msg = params.get('message') || 'GitHub OAuth authorization failed.'
        showToast(`GitHub error: ${decodeURIComponent(msg)}`, 'error')
      }
      navigate(location.pathname, { replace: true })
    }
  }, [location.search, location.pathname, navigate, showToast])

  // Sync lastIdea from project history
  useEffect(() => {
    if (currentProjectId && chatHistories[currentProjectId]) {
      const history = chatHistories[currentProjectId]
      const latest = history[history.length - 1]
      if (latest) setLastIdea(latest.prompt)
    }
  }, [currentProjectId, chatHistories])



  // Deep-linking: Load project from URL parameter on mount/change
  useEffect(() => {
    if (isWorkspace && projectId && idToken) {
      if (currentProjectId !== projectId && state !== 'loading') {
        load({ projectId, idToken })
      }
    }
  }, [isWorkspace, projectId, idToken, currentProjectId, state, load])

  // Ctrl+K / Cmd+K
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setCommandOpen(p => !p)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const handleSubmit = useCallback(async ({ idea, knownStack }) => {
    setLastIdea(idea)
    setSelectedNode(null)
    try {
      const token = await getFreshToken()
      if (!token) { onAuthRequired(); return }
      const newId = await generate({ idea, knownStack, idToken: token })
      if (newId) {
        navigate(`/workspace/${newId}`)
      }
      trackEvent(EVENTS.ARCHITECTURE_GENERATED, { stackCount: knownStack?.length || 0 })
    } catch (err) {
      console.error(err)
      showToast(err.message || 'Generation failed', 'error')
    }
  }, [generate, getFreshToken, onAuthRequired, showToast, navigate])

  const handleSelectRecent = useCallback(async (project) => {
    setSelectedNode(null)
    try {
      const token = await getFreshToken()
      if (!token) { onAuthRequired(); return }
      await load({ projectId: project.id, idToken: token })
      navigate(`/workspace/${project.id}`)
      trackEvent(EVENTS.PROJECT_LOADED, { projectId: project.id })
    } catch (err) {
      console.error('Load project error:', err)
    }
  }, [load, getFreshToken, onAuthRequired, navigate])

  // Reset architecture workspace state and return to dashboard
  const handleReset = useCallback(() => {
    setSelectedNode(null)
    useArchitectureStore.setState({
      currentProjectId: null,
      currentArchitecture: null,
      currentNodes: [],
      currentEdges: [],
      currentSchemas: [],
      currentRoutes: [],
      securityHistory: [],
      driftHistory: []
    })
    reset()
    navigate('/dashboard')
  }, [navigate, reset])

  const handleExport = useCallback(async () => {
    if (!data) return
    setExporting(true)
    try {
      await exportToPdf(data, lastIdea)
      trackEvent(EVENTS.PDF_EXPORTED, { projectId: currentProjectId })
    } catch (e) {
      console.error('PDF export failed:', e)
      showToast('PDF export failed: ' + e.message, 'error')
    } finally {
      setExporting(false)
    }
  }, [data, lastIdea, currentProjectId, showToast])

  const handleScaffold = useCallback(async () => {
    if (!data) return
    try {
      await generateScaffold(data)
      trackEvent(EVENTS.SCAFFOLD_DOWNLOADED, { projectId: currentProjectId })
    } catch (e) {
      console.error('Scaffold failed:', e)
      showToast('Scaffold failed: ' + e.message, 'error')
    }
  }, [data, currentProjectId, showToast])

  const handleLogout = useCallback(async () => {
    try { await logout(); handleReset() } catch (err) { console.error(err) }
  }, [logout, handleReset])

  // Effective data — prefer live state data, fallback to Zustand cache
  const effectiveData = data || currentArch

  // Loading stream overlay
  if (state === 'loading') return <GenerationStream />

  // Decide which view to render based on URL
  const showWorkspace = isWorkspace && (effectiveData || state === 'error')
  const showDashboard = isDashboard || (isWorkspace && !effectiveData && state !== 'error')

  return (
    <>
      {/* Toast notifications — replaces all alert() calls */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onDismiss={clearToast}
        />
      )}

      {showDashboard && (
        <Dashboard
          onSubmit={handleSubmit}
          user={appUser}
          onLogout={handleLogout}
          history={projects}
          onSelectRecent={handleSelectRecent}
          onOpenTemplates={() => setModals(m => ({ ...m, templates: true }))}
          onOpenSaved={() => setModals(m => ({ ...m, saved: true }))}
          onOpenDocs={() => setModals(m => ({ ...m, docs: true }))}
          onOpenSettings={() => setModals(m => ({ ...m, settings: true }))}
          onOpenProfile={() => setModals(m => ({ ...m, profile: true }))}
          profile={profile}
          onHome={handleReset}
        />
      )}

      {showWorkspace && (
        <AppShell
          state={state}
          data={effectiveData}
          error={error}
          lastIdea={lastIdea}
          history={projects}
          onSubmit={handleSubmit}
          onReset={handleReset}
          onHome={handleReset}
          onExport={handleExport}
          onScaffold={handleScaffold}
          onOpenShare={() => setModals(m => ({ ...m, share: true }))}
          exporting={exporting}
          envKeyStatus="valid"
          searchValue={search}
          onSearchChange={setSearch}
          onOpenCommand={() => setCommandOpen(true)}
          selectedNode={selectedNode}
          onSelectNode={setSelectedNode}
          activeMode={activeMode}
          setActiveMode={setActiveMode}
          onSelectProject={handleSelectRecent}
          user={appUser}
          onLogout={handleLogout}
          onOpenTemplates={() => setModals(m => ({ ...m, templates: true }))}
          onOpenSaved={() => setModals(m => ({ ...m, saved: true }))}
          onOpenDocs={() => setModals(m => ({ ...m, docs: true }))}
          onOpenSettings={() => setModals(m => ({ ...m, settings: true }))}
          onOpenProfile={() => setModals(m => ({ ...m, profile: true }))}
          profile={profile}
        />
      )}

      {/* Global overlays — always mounted */}
      <CommandPalette
        visible={commandOpen}
        onClose={() => setCommandOpen(false)}
        onExport={handleExport}
        onScaffold={handleScaffold}
        onShare={() => setModals(m => ({ ...m, share: true }))}
        onOpenSettings={() => setModals(m => ({ ...m, settings: true }))}
        onOpenDocs={() => setModals(m => ({ ...m, docs: true }))}
        onOpenTemplates={() => setModals(m => ({ ...m, templates: true }))}
        onSubmit={handleSubmit}
      />
      <SettingsModal isOpen={modals.settings} onClose={() => setModals(m => ({ ...m, settings: false }))} />
      <TemplatesModal
        isOpen={modals.templates}
        onClose={() => setModals(m => ({ ...m, templates: false }))}
        onSelectTemplate={handleSubmit}
      />
      <DocsModal isOpen={modals.docs} onClose={() => setModals(m => ({ ...m, docs: false }))} />
      <SavedArchitecturesModal
        isOpen={modals.saved}
        onClose={() => setModals(m => ({ ...m, saved: false }))}
        history={projects}
        onSelectProject={handleSelectRecent}
      />
      <ShareModal isOpen={modals.share} onClose={() => setModals(m => ({ ...m, share: false }))} />
      <ProfileModal
        isOpen={modals.profile}
        onClose={() => setModals(m => ({ ...m, profile: false }))}
        currentProfile={profile}
        onProfileUpdated={setProfile}
      />
    </>
  )
}

// ── Root App ─────────────────────────────────────────────────────────────────
export default function App() {
  const { appUser, loading, login, signup } = useAuthContext()
  const [modals, setModals] = useState({
    auth: false, settings: false, docs: false,
    templates: false, saved: false, share: false, profile: false,
  })

  if (loading) return <Loader text="Loading secure session…" />

  return (
    <>
      <SkipLink />
      <OfflineIndicator />
      <Routes>
        {/* ── Public: Landing ── */}
        <Route
          path="/"
          element={
            appUser
              ? <Navigate to="/dashboard" replace />
              : <>
                  <LandingPage
                    onOpenAuth={() => setModals(m => ({ ...m, auth: true }))}
                    onOpenDocs={() => setModals(m => ({ ...m, docs: true }))}
                  />
                  <AuthModal
                    isOpen={modals.auth}
                    onClose={() => setModals(m => ({ ...m, auth: false }))}
                    login={login} signup={signup}
                  />
                  <DocsModal isOpen={modals.docs} onClose={() => setModals(m => ({ ...m, docs: false }))} />
                </>
          }
        />

        {/* ── Public: Shared architecture ── */}
        <Route path="/p/:shareId" element={<PublicShare />} />
        <Route path="/embed/:shareId" element={<PublicShare embed />} />

        {/* ── Protected: Single AuthenticatedApp instance for ALL protected routes ──
             A single wildcard catch handles both /dashboard and /workspace/:id
             so state NEVER resets during navigation between the two views. ── */}
        <Route
          path="/dashboard"
          element={
            !appUser
              ? <Navigate to="/" replace />
              : <AuthenticatedApp
                  modals={modals}
                  setModals={setModals}
                  onAuthRequired={() => setModals(m => ({ ...m, auth: true }))}
                />
          }
        />
        <Route
          path="/workspace/:projectId?"
          element={
            !appUser
              ? <Navigate to="/" replace />
              : <AuthenticatedApp
                  modals={modals}
                  setModals={setModals}
                  onAuthRequired={() => setModals(m => ({ ...m, auth: true }))}
                />
          }
        />

        {/* ── Catch-all ── */}
        <Route path="*" element={<Navigate to={appUser ? '/dashboard' : '/'} replace />} />
      </Routes>
    </>
  )
}
