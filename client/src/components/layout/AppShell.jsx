import { useState, useEffect, useMemo } from 'react'
import Sidebar from './Sidebar.jsx'
import Topbar from './Topbar.jsx'
import Workspace from '../workspace/Workspace.jsx'
import InspectorPanel from './InspectorPanel.jsx'
import Footer from '../Footer.jsx'
import styles from './AppShell.module.css'
import { useArchitectureStore } from '../../store/useArchitectureStore.js'
import { useAuthContext } from '../../context/AuthContext.jsx'
import { Sparkles } from 'lucide-react'

export default function AppShell({ activeMode, setActiveMode, ...props }) {
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' ? window.innerWidth <= 768 : false)
  const [sidebarOpen, setSidebarOpen] = useState(() => typeof window !== 'undefined' ? window.innerWidth > 768 : true)
  const [workspaceView, setWorkspaceView] = useState('overview')

  const { appUser, getFreshToken } = useAuthContext()
  const currentProjectId = useArchitectureStore(s => s.currentProjectId)

  const [presenceUsers, setPresenceUsers] = useState([])
  const [remoteCursors, setRemoteCursors] = useState({})
  const [allComments, setAllComments]     = useState([])
  const [socket, setSocket]               = useState(null)
  const diagnostics = useMemo(() => {
    if (!props.data) return []
    const alerts = []
    const allText = JSON.stringify(props.data).toLowerCase()
    
    if (allText.includes('postgresql') || allText.includes('mongodb') || allText.includes('mysql')) {
      if (!allText.includes('redis') && !allText.includes('memcached')) {
        alerts.push('Redis caching missing (potential DB bottleneck)')
      }
    }
    if (allText.includes('express') || allText.includes('node.js') || allText.includes('fastapi')) {
      if (!allText.includes('rate limit') && !allText.includes('helmet') && !allText.includes('jwt')) {
        alerts.push('API endpoints lack rate limiting or secure token rules')
      }
    }
    if (allText.includes('kubernetes') || allText.includes('docker')) {
      if (!allText.includes('prometheus') && !allText.includes('grafana') && !allText.includes('datadog')) {
        alerts.push('No telemetry/monitoring agent detected')
      }
    }
    if (alerts.length === 0) {
      alerts.push('Architecture complies with basic standard practices')
    }
    return alerts
  }, [props.data])

  // 1. Fetch comments (Bypassed if backend is inactive to prevent 404 console errors)
  useEffect(() => {
    if (!currentProjectId) return
    const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'
    
    const loadComments = async () => {
      // Silently return if this is a static demo without a running backend
      if (!import.meta.env.VITE_API_BASE_URL && window.location.hostname === 'localhost') {
        return;
      }
      try {
        const res = await fetch(`${API_BASE}/projects/${currentProjectId}/comments`, {
          headers: { 'Authorization': `Bearer ${await appUser?.getIdToken()}` }
        })
        if (res.ok) {
          const data = await res.json()
          setAllComments(data)
        }
      } catch (err) {
        // Silently swallow connection errors
      }
    }

    loadComments()
  }, [currentProjectId])

  // 2. Establish WebSockets Collaboration Connection (Bypassed if no backend to prevent WS error logs)
  useEffect(() => {
    if (!currentProjectId || !appUser) return

    // Silently return if this is a static demo without a running backend
    if (!import.meta.env.VITE_API_BASE_URL && window.location.hostname === 'localhost') {
      return;
    }

    const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const apiHost = API_BASE.replace(/^https?:\/\//, '').replace(/\/api$/, '')
    const wsUrl = `${wsProtocol}//${apiHost}/api/collaboration`

    let ws
    try {
      ws = new WebSocket(wsUrl)
    } catch (e) {
      return // silently fail if WebSocket not supported
    }

    setSocket(ws)

    const localUserId = appUser.uid
    const localUserName = appUser.displayName || appUser.email?.split('@')[0] || 'Teammate'
    const localPhotoUrl = appUser.photoURL || ''

    ws.onopen = () => {
      ws.send(JSON.stringify({
        type: 'join',
        roomId: currentProjectId,
        userId: localUserId,
        userName: localUserName,
        photoUrl: localPhotoUrl
      }))
    }

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)
        if (msg.type === 'presence') {
          setPresenceUsers(msg.users.filter(u => u.userId !== localUserId))
        } else if (msg.type === 'cursor') {
          setRemoteCursors(prev => ({
            ...prev,
            [msg.userId]: { userName: msg.userName, x: msg.x, y: msg.y }
          }))
        } else if (msg.type === 'comment') {
          setAllComments(prev => [...prev, msg])
        }
      } catch (err) {
        console.error('Error parsing WebSocket message:', err)
      }
    }

    ws.onerror = () => {
      // Collaboration unavailable — silently fail
    }

    ws.onclose = () => {
      // Connection closed — this is normal
    }

    return () => {
      ws.close()
    }
  }, [currentProjectId, appUser])

  // 3. Broadcast Mouse Movement
  useEffect(() => {
    if (!socket || socket.readyState !== WebSocket.OPEN) return

    let lastSend = 0
    const handleMouseMove = (e) => {
      const now = Date.now()
      if (now - lastSend > 50) {
        socket.send(JSON.stringify({
          type: 'cursor',
          x: e.clientX,
          y: e.clientY
        }))
        lastSend = now
      }
    }

    window.addEventListener('mousemove', handleMouseMove)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
    }
  }, [socket])

  // 4. Submit New Comment via Socket
  const handleAddComment = (nodeId, commentText) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'comment',
        nodeId,
        commentText
      }))
    }
  }

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768
      setIsMobile(mobile)
      if (mobile) {
        setSidebarOpen(false)
      } else {
        setSidebarOpen(true)
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    if (props.selectedNode) {
      localStorage.setItem('inframind_checklist_diagram', 'true')
    }
  }, [props.selectedNode])

  return (
    <div className={`${styles.shell} ${!sidebarOpen ? styles.sidebarCollapsed : ''}`}>
      {/* Sidebar Backdrop for Mobile */}
      {sidebarOpen && (
        <div 
          className={styles.sidebarBackdrop} 
          onClick={() => setSidebarOpen(false)}
        />
      )}
      {/* Sidebar Slot */}
      <aside className={`${styles.sidebarSlot} ${sidebarOpen ? styles.sidebarOpen : ''}`}>
        <Sidebar
          collapsed={isMobile ? false : !sidebarOpen}
          history={props.history}
          onNewProject={props.onReset}
          onToggle={() => setSidebarOpen(p => !p)}
          onClose={() => setSidebarOpen(false)}
          onSelectProject={props.onSelectProject}
          activeIdea={props.lastIdea}
          user={props.user}
          onLogout={props.onLogout}
          onOpenTemplates={props.onOpenTemplates}
          onOpenSaved={props.onOpenSaved}
          onOpenDocs={props.onOpenDocs}
          onOpenSettings={props.onOpenSettings}
          onHome={props.onHome}
          onOpenProfile={props.onOpenProfile}
          profile={props.profile}
          workspaceView={workspaceView}
          setWorkspaceView={setWorkspaceView}
        />
      </aside>

      {/* Main Column */}
      <div className={styles.centerColumn}>
        <Topbar
          state={props.state}
          envKeyStatus={props.envKeyStatus}
          searchValue={props.searchValue}
          onSearchChange={props.onSearchChange}
          onOpenCommand={props.onOpenCommand}
          user={props.user}
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen(p => !p)}
          onOpenSettings={props.onOpenSettings}
          presenceUsers={presenceUsers}
          activeMode={activeMode}
          setActiveMode={setActiveMode}
          projectName={props.data?.projectTitle || props.lastIdea || 'Untitled System'}
          onSubmit={props.onSubmit}
        />
        <div className={styles.workspaceContainer}>
          <div className={styles.workspaceLayout}>
            <div className={styles.workspaceContent}>
              <Workspace 
                {...props} 
                comments={allComments}
                onAddComment={handleAddComment}
                activeMode={activeMode}
                setActiveMode={setActiveMode}
                workspaceView={workspaceView}
                setWorkspaceView={setWorkspaceView}
              />
              <Footer />
            </div>
          </div>
        </div>
      </div>


      {/* Shared Cursors Overlay */}
      {Object.entries(remoteCursors).map(([userId, cursor]) => (
        <div 
          key={userId}
          style={{
            position: 'fixed',
            left: cursor.x,
            top: cursor.y,
            pointerEvents: 'none',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            transform: 'translate(-2px, -2px)',
            transition: 'left 0.08s ease-out, top 0.08s ease-out'
          }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M0 0L14 4.5L7.5 7L5 13.5L0 0Z" fill="#2563eb" stroke="#fff" strokeWidth="1" />
          </svg>
          <span 
            style={{
              fontSize: '9px',
              fontWeight: 'bold',
              background: '#2563eb',
              color: '#fff',
              padding: '2px 6px',
              borderRadius: '4px',
              boxShadow: '0 2px 10px rgba(0,0,0,0.5)',
              whiteSpace: 'nowrap'
            }}
          >
            {cursor.userName}
          </span>
        </div>
      ))}
    </div>
  )
}
