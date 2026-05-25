import { useState, useEffect } from 'react'
import Sidebar from './Sidebar.jsx'
import Topbar from './Topbar.jsx'
import Workspace from '../workspace/Workspace.jsx'
import InspectorPanel from './InspectorPanel.jsx'
import styles from './AppShell.module.css'

export default function AppShell(props) {
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' ? window.innerWidth <= 1024 : false)
  const [sidebarOpen, setSidebarOpen] = useState(() => typeof window !== 'undefined' ? window.innerWidth > 1024 : true)

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 1024
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
          collapsed={!sidebarOpen && !isMobile}
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
        />
        <div className={styles.workspaceContainer}>
          <div className={styles.workspaceLayout}>
            <div className={styles.workspaceContent}>
              <Workspace {...props} />
            </div>
            {props.selectedNode && (
              <div className={styles.inspectorSlot}>
                <InspectorPanel
                  state={props.state}
                  data={props.data}
                  exporting={props.exporting}
                  onExport={props.onExport}
                  selectedNode={props.selectedNode}
                  onSelectNode={props.onSelectNode}
                  onClose={() => props.onSelectNode(null)}
                  onSubmit={props.onSubmit}
                  lastIdea={props.lastIdea}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

