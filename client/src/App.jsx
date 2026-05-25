// src/App.jsx — Stable single AuthenticatedApp instance + correct prop names
import { useCallback, useEffect, useState } from 'react'
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

// ── Loader ───────────────────────────────────────────────────────────────────
function Loader({ text = 'Loading…' }) {
  return (
    <div style={{
      display: 'flex', height: '100vh', alignItems: 'center',
      justifyContent: 'center', background: '#050507',
      color: 'rgba(255,255,255,0.35)', fontFamily: 'Inter, sans-serif', fontSize: '0.88rem',
      gap: '10px'
    }}>
      <span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.1)', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
      {text}
    </div>
  )
}

// ── The single authenticated shell — mounted ONCE, never torn down ────────────
// It reads location to decide which view to show, keeping all state alive.
function AuthenticatedApp({ modals, setModals, onAuthRequired }) {
  const { appUser, idToken, getFreshToken, logout } = useAuthContext()
  const { state, data, error, generate, reset, load } = useArchitecture()
  const navigate = useNavigate()
  const location = useLocation()
  const { projectId } = useParams()

  const [lastIdea, setLastIdea]         = useState('')
  const [exporting, setExporting]       = useState(false)
  const [selectedNode, setSelectedNode] = useState(null)
  const [search, setSearch]             = useState('')
  const [commandOpen, setCommandOpen]   = useState(false)

  const projects         = useArchitectureStore(s => s.projects)
  const chatHistories    = useArchitectureStore(s => s.chatHistories)
  const currentProjectId = useArchitectureStore(s => s.currentProjectId)
  const currentArch      = useArchitectureStore(s => s.currentArchitecture)
  const fetchProjects    = useArchitectureStore(s => s.fetchProjects)
  const clearStore       = useArchitectureStore(s => s.clearStore)

  // Determine current view from URL
  const isWorkspace = location.pathname.startsWith('/workspace')
  const isDashboard = location.pathname === '/dashboard' || location.pathname === '/'

  const [profile, setProfile] = useState(null)

  const fetchProfile = useCallback(async (token) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'}/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (res.ok) {
        const data = await res.json()
        setProfile(data.profile || null)
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
      identifyUser(appUser.uid, { email: appUser.email, name: appUser.name })
    } else {
      clearStore()
      setProfile(null)
    }
  }, [appUser, idToken, fetchProjects, clearStore, fetchProfile])

  // Sync lastIdea from project history
  useEffect(() => {
    if (currentProjectId && chatHistories[currentProjectId]) {
      const history = chatHistories[currentProjectId]
      const latest = history[history.length - 1]
      if (latest) setLastIdea(latest.prompt)
    }
  }, [currentProjectId, chatHistories])

  // Navigate to workspace once generation/load completes
  useEffect(() => {
    if (state === 'result' && currentProjectId) {
      const target = `/workspace/${currentProjectId}`
      if (location.pathname !== target) {
        navigate(target, { replace: true })
      }
    }
  }, [state, currentProjectId, navigate, location.pathname])

  // Deep-linking: Load project from URL parameter on mount/change
  useEffect(() => {
    if (isWorkspace && projectId && idToken) {
      if (currentProjectId !== projectId && state !== 'loading') {
        load({ projectId, idToken })
      }
    }
  }, [isWorkspace, projectId, idToken, currentProjectId, state, load])

  // Ctrl+K
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
      await generate({ idea, knownStack, idToken: token })
      trackEvent(EVENTS.ARCHITECTURE_GENERATED, { stackCount: knownStack?.length || 0 })
    } catch (err) {
      console.error(err)
    }
  }, [generate, getFreshToken, onAuthRequired])

  // ← THE KEY FIX: this handler loads a project AND navigates
  const handleSelectRecent = useCallback(async (project) => {
    setSelectedNode(null)
    try {
      const token = await getFreshToken()
      if (!token) { onAuthRequired(); return }
      await load({ projectId: project.id, idToken: token })
      // Navigation happens via the useEffect above when state → 'result'
      trackEvent(EVENTS.PROJECT_LOADED, { projectId: project.id })
    } catch (err) {
      console.error('Load project error:', err)
    }
  }, [load, getFreshToken, onAuthRequired])

  const handleReset = useCallback(() => {
    setSelectedNode(null)
    useArchitectureStore.getState().setCurrentProjectId(null)
    reset()
    navigate('/dashboard')
  }, [reset, navigate])

  const handleExport = useCallback(async () => {
    if (!data) return
    setExporting(true)
    try {
      await exportToPdf(data, lastIdea)
      trackEvent(EVENTS.PDF_EXPORTED, { projectId: currentProjectId })
    } catch (e) {
      console.error('PDF export failed:', e)
      alert('PDF export failed: ' + e.message)
    } finally {
      setExporting(false)
    }
  }, [data, lastIdea, currentProjectId])

  const handleScaffold = useCallback(async () => {
    if (!data) return
    try {
      await generateScaffold(data)
      trackEvent(EVENTS.SCAFFOLD_DOWNLOADED, { projectId: currentProjectId })
    } catch (e) {
      console.error('Scaffold failed:', e)
      alert('Scaffold failed: ' + e.message)
    }
  }, [data, currentProjectId])

  const handleLogout = useCallback(async () => {
    try { await logout(); handleReset() } catch (err) { console.error(err) }
  }, [logout, handleReset])

  // Effective data — prefer live state data, fallback to Zustand cache
  const effectiveData = data || currentArch

  // Loading stream overlay
  if (state === 'loading') return <GenerationStream />

  // Decide which view to render based on URL
  // Dashboard: /dashboard or /workspace with no data yet
  // Workspace: /workspace/* with data
  const showWorkspace = isWorkspace && (effectiveData || state === 'error')
  const showDashboard = isDashboard || (isWorkspace && !effectiveData && state !== 'error')

  return (
    <>
      {showDashboard && (
        <Dashboard
          onSubmit={handleSubmit}
          user={appUser}
          onLogout={handleLogout}
          history={projects}
          onSelectRecent={handleSelectRecent}   // ← correct prop name for Dashboard
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
          onSelectProject={handleSelectRecent}   // ← correct prop name for Sidebar
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

      {/* ── Protected: Dashboard + Workspace share ONE AuthenticatedApp instance ──
           Both routes render the same component — URL determines which view shows.
           State (useArchitecture) lives here and never unmounts on navigation. ── */}
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
  )
}
