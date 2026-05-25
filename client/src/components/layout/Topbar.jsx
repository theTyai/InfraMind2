import { Menu, Bell, X, Search } from 'lucide-react'
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
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [searchExpanded, setSearchExpanded] = useState(false)
  const dropdownRef = useRef(null)
  const searchRef   = useRef(null)

  const { idToken } = useAuthContext()
  const notifications      = useArchitectureStore(s => s.notifications) || []
  const fetchNotifications = useArchitectureStore(s => s.fetchNotifications)
  const markNotificationRead = useArchitectureStore(s => s.markNotificationRead)

  useEffect(() => {
    if (idToken) {
      fetchNotifications(idToken)
    }
  }, [idToken, fetchNotifications])

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Close search on Escape
  useEffect(() => {
    if (!searchExpanded) return
    const handler = (e) => {
      if (e.key === 'Escape') {
        setSearchExpanded(false)
        onSearchChange('')
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [searchExpanded, onSearchChange])

  const unreadCount = notifications.filter(n => !n.read).length

  const handleMarkAllRead = async () => {
    if (!idToken) return
    const unread = notifications.filter(n => !n.read)
    await Promise.all(unread.map(n => markNotificationRead(n.id, idToken)))
  }

  const handleNotificationClick = async (n) => {
    if (!n.read && idToken) {
      await markNotificationRead(n.id, idToken)
    }
    setDropdownOpen(false)
  }

  // Status dot color
  const statusState = state === 'result' ? 'valid' : state === 'error' ? 'invalid' : 'valid'

  return (
    <header className={styles.topbar} role="banner">
      <div className={styles.left}>
        {/* Sidebar toggle — aria-label so screen readers understand purpose */}
        <button
          type="button"
          className={styles.menuToggle}
          onClick={onToggleSidebar}
          aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          aria-expanded={sidebarOpen}
          title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          <Menu size={16} aria-hidden="true" />
        </button>

        <div>
          <p className={styles.title}>InfraMind</p>
        </div>
      </div>

      {/* Search — hidden on mobile, expands on demand */}
      <div className={`${styles.center} ${searchExpanded ? styles.searchExpanded : ''}`}>
        {searchExpanded ? (
          <div className={styles.searchMobileWrap}>
            <label className={styles.searchLabel} htmlFor="workspace-search">
              <input
                id="workspace-search"
                ref={searchRef}
                className={styles.searchInput}
                type="search"
                placeholder="Search workspace…"
                value={searchValue}
                onChange={e => onSearchChange(e.target.value)}
                autoFocus
                aria-label="Search workspace"
              />
            </label>
            <button
              type="button"
              className={styles.searchCloseBtn}
              onClick={() => { setSearchExpanded(false); onSearchChange('') }}
              aria-label="Close search"
            >
              <X size={14} aria-hidden="true" />
            </button>
          </div>
        ) : (
          <label className={styles.searchLabel} htmlFor="workspace-search-desktop">
            <input
              id="workspace-search-desktop"
              className={styles.searchInput}
              type="search"
              placeholder="Search workspace…"
              value={searchValue}
              onChange={e => onSearchChange(e.target.value)}
              aria-label="Search workspace"
            />
          </label>
        )}
      </div>

      <div className={styles.controls}>
        {/* Presence Avatars — max 4 shown */}
        {presenceUsers.length > 0 && (
          <div
            className={styles.presenceAvatars}
            aria-label={`${presenceUsers.length} collaborator${presenceUsers.length > 1 ? 's' : ''} online`}
            role="group"
          >
            {presenceUsers.slice(0, 4).map(u => (
              <div
                key={u.userId}
                className={styles.presenceAvatar}
                title={u.userName}
                aria-label={u.userName}
              >
                {u.photoUrl ? (
                  <img src={u.photoUrl} alt={u.userName} className={styles.presenceAvatarImg} />
                ) : (
                  <span aria-hidden="true">{u.userName ? u.userName[0].toUpperCase() : 'U'}</span>
                )}
              </div>
            ))}
            {presenceUsers.length > 4 && (
              <div className={styles.presenceMore} aria-label={`+${presenceUsers.length - 4} more`}>
                +{presenceUsers.length - 4}
              </div>
            )}
          </div>
        )}

        {/* Mobile Search Trigger */}
        <button
          type="button"
          className={styles.searchMobileTrigger}
          onClick={() => setSearchExpanded(true)}
          aria-label="Search workspace"
        >
          <Search size={16} aria-hidden="true" />
        </button>

        {/* Notifications Bell */}
        {user && (
          <div className={styles.bellContainer} ref={dropdownRef}>
            <button
              type="button"
              className={styles.bellBtn}
              onClick={() => setDropdownOpen(p => !p)}
              aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
              aria-expanded={dropdownOpen}
              aria-haspopup="menu"
            >
              <Bell size={16} aria-hidden="true" />
              {unreadCount > 0 && (
                <span className={styles.badge} aria-hidden="true">{unreadCount}</span>
              )}
            </button>

            {dropdownOpen && (
              <div
                className={styles.notificationsDropdown}
                role="menu"
                aria-label="Notifications"
              >
                <div className={styles.dropdownHeader}>
                  <h4 id="notif-heading">Notifications</h4>
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      className={styles.markAllBtn}
                      onClick={handleMarkAllRead}
                    >
                      Mark all read
                    </button>
                  )}
                </div>
                <div className={styles.notificationList} role="list" aria-labelledby="notif-heading">
                  {notifications.length === 0 ? (
                    <div className={styles.emptyNotifications}>No notifications yet</div>
                  ) : (
                    notifications.map(n => (
                      <div
                        key={n.id}
                        className={`${styles.notificationItem} ${!n.read ? styles.unreadItem : ''}`}
                        onClick={() => handleNotificationClick(n)}
                        role="menuitem"
                        tabIndex={0}
                        onKeyDown={e => e.key === 'Enter' && handleNotificationClick(n)}
                        aria-label={`${n.title}${!n.read ? ' (unread)' : ''}`}
                      >
                        <span className={styles.notificationTitle}>{n.title}</span>
                        {/* FIX: was n.body — Firestore stores 'message' field */}
                        <span className={styles.notificationBody}>{n.message || n.body}</span>
                        <span className={styles.notificationTime}>
                          {n.timestamp
                            ? new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : ''}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Command Palette Trigger */}
        <button
          type="button"
          className={styles.commandButton}
          onClick={onOpenCommand}
          aria-label="Open command palette (Ctrl+K)"
          title="Command Palette (Ctrl+K)"
        >
          <span aria-hidden="true">⌘K</span>
        </button>

        {/* User Avatar */}
        {user ? (
          <button
            type="button"
            className={styles.avatar}
            title={`Settings — signed in as ${user.displayName || user.email}`}
            onClick={onOpenSettings}
            aria-label={`Open settings for ${user.displayName || user.email}`}
          >
            {user.displayName ? user.displayName[0].toUpperCase() : 'U'}
          </button>
        ) : (
          <button
            type="button"
            className={styles.avatar}
            onClick={onOpenSettings}
            aria-label="Open settings"
          >
            IM
          </button>
        )}
      </div>
    </header>
  )
}

