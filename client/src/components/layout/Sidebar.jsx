import { Plus, Home, Layers, BookOpen, Settings2, ChevronLeft, ChevronRight, LogOut, Clock, Cpu } from 'lucide-react'
import Logo from '../ui/Logo.jsx'
import styles from './Sidebar.module.css'

export default function Sidebar({
  collapsed,
  history = [],
  onNewProject,
  onClose,
  onToggle,
  onSelectProject,
  activeIdea,
  user,
  onLogout,
  onOpenTemplates,
  onOpenSaved,
  onOpenDocs,
  onOpenSettings,
  onHome,
  onOpenProfile,
  profile
}) {
  return (
    <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''}`}>

      {/* ── TOP: User Profile ── */}
      {user && (
        <div 
          className={styles.userBlock} 
          onClick={onOpenProfile} 
          style={{ cursor: 'pointer' }}
          title="Click to view/edit profile"
        >
          <div className={styles.userAvatar} title={profile?.name || user.name}>
            {profile?.photoUrl ? (
              <img src={profile.photoUrl} alt="" className={styles.userAvatarImg} />
            ) : (
              user.name ? user.name[0].toUpperCase() : 'U'
            )}
          </div>
          {!collapsed && (
            <div className={styles.userMeta}>
              <span className={styles.userName}>{profile?.name || user.name}</span>
              {profile?.username ? (
                <span className={styles.userUsername}>@{profile.username}</span>
              ) : (
                <span className={styles.userEmail} title={user.email}>{user.email}</span>
              )}
            </div>
          )}
          {!collapsed && (
            <button
              type="button"
              className={styles.logoutBtn}
              onClick={(e) => {
                e.stopPropagation()
                onLogout()
              }}
              title="Sign out"
            >
              <LogOut size={13} />
            </button>
          )}
        </div>
      )}

      {/* ── Dashboard Home & New Architecture Buttons ── */}
      <div className={styles.navButtonsGroup}>
        <button 
          className={styles.homeBtn} 
          type="button" 
          onClick={onHome}
          title={collapsed ? "Go to Dashboard" : undefined}
        >
          <Home size={14} style={{ flexShrink: 0 }} />
          {!collapsed && <span>Home Dashboard</span>}
        </button>

        <button 
          className={styles.newBtn} 
          type="button" 
          onClick={onNewProject}
          title={collapsed ? "New Architecture" : undefined}
        >
          <Plus size={14} style={{ flexShrink: 0 }} />
          {!collapsed && <span>New Architecture</span>}
        </button>
      </div>

      {/* ── Active Project Brief (if any) ── */}
      {activeIdea && !collapsed && (
        <div className={styles.activeCard}>
          <div className={styles.activeCardLabel}>
            <Cpu size={11} />
            Active
          </div>
          <p className={styles.activeCardText} title={activeIdea}>
            {activeIdea.length > 100 ? `${activeIdea.slice(0, 97)}…` : activeIdea}
          </p>
        </div>
      )}

      {/* ── Past Projects (scrollable) ── */}
      {!collapsed && (
        <div className={styles.projectsSection}>
          <div className={styles.sectionLabel}>
            <Clock size={11} />
            Past Projects
          </div>
          <div className={styles.projectList}>
            {history.length === 0 ? (
              <div className={styles.emptyState}>
                No projects yet.<br />Generate your first architecture above.
              </div>
            ) : (
              history.slice(0, 8).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={styles.projectItem}
                  onClick={() => onSelectProject && onSelectProject(item)}
                  title={item.title || 'Untitled project'}
                >
                  <div className={styles.projectDot} />
                  <div className={styles.projectMeta}>
                    <span className={styles.projectName}>{item.title || 'Untitled project'}</span>
                    <span className={styles.projectStats}>
                      {item.metrics?.layers || 0}L · {item.metrics?.apis || 0} APIs
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* ── Spacer ── */}
      <div className={styles.spacer} />

      {/* ── Settings / Docs ── */}
      <div className={styles.bottomNav}>
        <button
          type="button"
          className={styles.bottomNavBtn}
          onClick={onOpenDocs}
          title={collapsed ? "Documentation" : undefined}
        >
          <BookOpen size={14} style={{ flexShrink: 0 }} />
          {!collapsed && <span>Documentation</span>}
        </button>
        <button
          type="button"
          className={styles.bottomNavBtn}
          onClick={onOpenSettings}
          title={collapsed ? "Settings" : undefined}
        >
          <Settings2 size={14} style={{ flexShrink: 0 }} />
          {!collapsed && <span>Settings</span>}
        </button>
        {collapsed && (
          <button
            type="button"
            className={styles.bottomNavBtn}
            onClick={onLogout}
            title="Sign out"
          >
            <LogOut size={14} style={{ flexShrink: 0, color: '#ef4444' }} />
          </button>
        )}
      </div>

      {/* ── Company Branding (very bottom) ── */}
      <div className={styles.brandFooter}>
        {!collapsed && (
          <div onClick={onHome} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }} title="Go to Dashboard">
            <Logo size={22} showText={true} />
          </div>
        )}
        {onToggle && (
          <button
            type="button"
            className={styles.collapseBtn}
            onClick={onToggle}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        )}
      </div>

    </aside>
  )
}
