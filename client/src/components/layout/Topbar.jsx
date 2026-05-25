import { Menu, Bell } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { useArchitectureStore } from '../../store/useArchitectureStore.js'
import { useAuthContext } from '../../context/AuthContext.jsx'
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
  onOpenSettings,
  presenceUsers = []
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  
  const { idToken } = useAuthContext();
  const notifications = useArchitectureStore(s => s.notifications) || [];
  const fetchNotifications = useArchitectureStore(s => s.fetchNotifications);
  const markNotificationRead = useArchitectureStore(s => s.markNotificationRead);

  useEffect(() => {
    if (idToken) {
      fetchNotifications(idToken);
    }
  }, [idToken, fetchNotifications]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleMarkAllRead = async () => {
    if (!idToken) return;
    const unread = notifications.filter(n => !n.read);
    await Promise.all(unread.map(n => markNotificationRead(n.id, idToken)));
  };

  const handleNotificationClick = async (n) => {
    if (!n.read && idToken) {
      await markNotificationRead(n.id, idToken);
    }
  };

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
        {/* Presence Avatars */}
        {presenceUsers && presenceUsers.length > 0 && (
          <div className={styles.presenceAvatars}>
            {presenceUsers.map(u => (
              <div key={u.userId} className={styles.presenceAvatar} title={u.userName}>
                {u.photoUrl ? (
                  <img src={u.photoUrl} alt="" className={styles.presenceAvatarImg} />
                ) : (
                  u.userName ? u.userName[0].toUpperCase() : 'U'
                )}
              </div>
            ))}
          </div>
        )}

        {/* Notifications Bell */}
        {user && (
          <div className={styles.bellContainer} ref={dropdownRef}>
            <button 
              type="button" 
              className={styles.bellBtn} 
              onClick={() => setDropdownOpen(!dropdownOpen)}
              title="Notifications"
            >
              <Bell size={16} />
              {unreadCount > 0 && <span className={styles.badge}>{unreadCount}</span>}
            </button>
            
            {dropdownOpen && (
              <div className={styles.notificationsDropdown}>
                <div className={styles.dropdownHeader}>
                  <h4>Notifications</h4>
                  {unreadCount > 0 && (
                    <button type="button" className={styles.markAllBtn} onClick={handleMarkAllRead}>
                      Mark all read
                    </button>
                  )}
                </div>
                <div className={styles.notificationList}>
                  {notifications.length === 0 ? (
                    <div className={styles.emptyNotifications}>No notifications yet</div>
                  ) : (
                    notifications.map((n) => (
                      <div 
                        key={n.id} 
                        className={`${styles.notificationItem} ${!n.read ? styles.unreadItem : ''}`}
                        onClick={() => handleNotificationClick(n)}
                      >
                        <span className={styles.notificationTitle}>{n.title}</span>
                        <span className={styles.notificationBody}>{n.body}</span>
                        <span className={styles.notificationTime}>
                          {n.timestamp ? new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}

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
