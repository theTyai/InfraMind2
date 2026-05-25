import { Menu } from 'lucide-react'
import styles from './Topbar.module.css'

const STATE_LABELS = {
  idle: 'Ready to compose',
  loading: 'Building architecture',
  result: 'Workspace ready',
  error: 'Last request failed',
}

const STATUS_COLORS = {
  valid: styles.envReady,
  invalid: styles.envInvalid,
  missing: styles.envMissing,
}

export default function Topbar({ 
  state, 
  envKeyStatus, 
  searchValue, 
  onSearchChange, 
  onOpenCommand, 
  sidebarOpen, 
  onToggleSidebar,
  user,
  onOpenSettings
}) {
  return (
    <header className={styles.topbar}>
      <div className={styles.left}>
        {!sidebarOpen && (
          <button 
            type="button" 
            className={styles.menuToggle} 
            onClick={onToggleSidebar} 
            title="Expand Sidebar"
          >
            <Menu size={16} />
          </button>
        )}
        <div>
          <p className={styles.title}>AI Architecture Workspace</p>
          <p className={styles.subtitle}>{STATE_LABELS[state] || 'Ready to compose'}</p>
        </div>
      </div>

      <div className={styles.center}>
        <label className={styles.searchLabel} htmlFor="workspace-search">
          <input
            id="workspace-search"
            className={styles.searchInput}
            type="search"
            placeholder="Search workspace…"
            value={searchValue}
            onChange={(event) => onSearchChange(event.target.value)}
          />
        </label>
      </div>

      <div className={styles.controls}>
        <button type="button" className={styles.commandButton} onClick={onOpenCommand}>
          Cmd+K
        </button>
        <button type="button" className={styles.viewButton} onClick={() => alert("You are currently inside the active Architecture Workspace.")}>
          Workspace
        </button>
        {user ? (
          <div className={styles.avatar} title={`Signed in as ${user.name}`} onClick={onOpenSettings} style={{ cursor: 'pointer' }}>
            {user.name ? user.name[0].toUpperCase() : 'U'}
          </div>
        ) : (
          <div className={styles.avatar} onClick={onOpenSettings} style={{ cursor: 'pointer' }}>IM</div>
        )}
        <span className={`${styles.statusPill} ${styles.envReady}`}>
          <span className={styles.statusDot} />
          AI Engine: Online
        </span>
      </div>
    </header>
  )
}
