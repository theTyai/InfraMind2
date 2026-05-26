import { Plus, Home, Layers, BookOpen, Settings2, ChevronLeft, ChevronRight, LogOut, Clock, Cpu, Network, Users } from 'lucide-react'
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
  profile,
  workspaceView,
  setWorkspaceView
}) {
  // Auto-close sidebar on mobile when a link is clicked
  const handleNavClick = (callback) => {
    if (callback) callback();
    if (typeof window !== 'undefined' && window.innerWidth <= 768 && onClose) {
      onClose();
    }
  };

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

      {/* Home Group */}
      <div className={styles.navGroup}>
        <button 
          className={styles.navItem} 
          type="button" 
          onClick={() => handleNavClick(onHome)}
        >
          <Home size={14} style={{ marginRight: '8px' }} />
          {!collapsed && <span>Home</span>}
        </button>
      </div>

      {/* PROJECT Section */}
      <div className={styles.navGroup}>
        {!collapsed && <div className={styles.groupLabel}>PROJECT</div>}
        <button 
          className={`${styles.navItem} ${workspaceView === 'overview' ? styles.navItemActive : ''}`}
          type="button" 
          onClick={() => handleNavClick(() => setWorkspaceView('overview'))}
        >
          <Layers size={14} style={{ marginRight: '8px' }} />
          {!collapsed && <span>Overview</span>}
        </button>
        <button 
          className={`${styles.navItem} ${workspaceView === 'architecture' ? styles.navItemActive : ''}`}
          type="button" 
          onClick={() => handleNavClick(() => setWorkspaceView('architecture'))}
        >
          <Cpu size={14} style={{ marginRight: '8px' }} />
          {!collapsed && <span>Architecture</span>}
        </button>
        <button 
          className={`${styles.navItem} ${workspaceView === 'components' ? styles.navItemActive : ''}`}
          type="button" 
          onClick={() => handleNavClick(() => setWorkspaceView('components'))}
        >
          <Layers size={14} style={{ marginRight: '8px' }} />
          {!collapsed && <span>Components</span>}
        </button>
        <button 
          className={`${styles.navItem} ${workspaceView === 'dataflows' ? styles.navItemActive : ''}`}
          type="button" 
          onClick={() => handleNavClick(() => setWorkspaceView('dataflows'))}
        >
          <Network size={14} style={{ marginRight: '8px' }} />
          {!collapsed && <span>Data Flows</span>}
        </button>
        <button 
          className={`${styles.navItem} ${workspaceView === 'collaborators' ? styles.navItemActive : ''}`}
          type="button" 
          onClick={() => handleNavClick(() => setWorkspaceView('collaborators'))}
        >
          <Users size={14} style={{ marginRight: '8px' }} />
          {!collapsed && <span>Collaborators</span>}
        </button>
      </div>

      {/* LIBRARY Section */}
      <div className={styles.navGroup}>
        {!collapsed && <div className={styles.groupLabel}>LIBRARY</div>}
        <button 
          className={styles.navItem} 
          type="button" 
          onClick={() => handleNavClick(onOpenTemplates)}
        >
          <BookOpen size={14} style={{ marginRight: '8px' }} />
          {!collapsed && <span>Templates</span>}
        </button>
        <button 
          className={styles.navItem} 
          type="button" 
          onClick={() => handleNavClick(onOpenSaved)}
        >
          <Layers size={14} style={{ marginRight: '8px' }} />
          {!collapsed && <span>Recent Projects</span>}
        </button>
        {!collapsed && history && history.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px', paddingLeft: '22px' }}>
            {history.slice(0, 5).map((project) => (
              <button
                key={project.id}
                type="button"
                onClick={() => handleNavClick(() => onSelectProject && onSelectProject(project))}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-dim)',
                  fontSize: '0.72rem',
                  textAlign: 'left',
                  cursor: 'pointer',
                  padding: '4px 6px',
                  borderRadius: '4px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  width: '100%',
                  display: 'block',
                  transition: 'all 0.15s'
                }}
                onMouseEnter={(e) => { e.target.style.color = 'var(--text-primary)'; e.target.style.background = 'var(--bg-elevated)'; }}
                onMouseLeave={(e) => { e.target.style.color = 'var(--text-dim)'; e.target.style.background = 'transparent'; }}
              >
                📁 {project.projectTitle || project.lastIdea || 'Untitled Project'}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Settings at the bottom */}
      <div className={styles.navGroup} style={{ marginTop: 'auto', marginBottom: '8px' }}>
        <button 
          className={styles.navItem} 
          type="button" 
          onClick={() => handleNavClick(onOpenSettings)}
        >
          <Settings2 size={14} style={{ marginRight: '8px' }} />
          {!collapsed && <span>Settings</span>}
        </button>
      </div>

      {/* Brand Footer */}
      <div className={styles.brandFooter}>
        {!collapsed && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Logo size={20} showText={true} />
          </div>
        )}
        {onToggle && (
          <button
            type="button"
            className={styles.collapseBtn}
            onClick={onToggle}
            aria-label="Toggle Sidebar"
          >
            {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        )}
      </div>

    </aside>
  )
}
