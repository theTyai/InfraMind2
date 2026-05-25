// client/src/components/ui/OfflineIndicator.jsx
// Shows a tasteful offline/sync status banner at the bottom of the screen.
// Appears only when the user is offline OR has pending queued actions.
// Disappears automatically once back online and queue is empty.

import { useOfflineSync } from '../../hooks/useOfflineSync';

export default function OfflineIndicator() {
  const { isOnline, isSyncing, pendingCount, lastSyncAt } = useOfflineSync();

  // Only show if offline or actively syncing or there are pending items
  const visible = !isOnline || isSyncing || pendingCount > 0;

  if (!visible) return null;

  const message = !isOnline
    ? `Offline — ${pendingCount > 0 ? `${pendingCount} action${pendingCount > 1 ? 's' : ''} queued` : 'changes will sync when reconnected'}`
    : isSyncing
    ? `Syncing ${pendingCount} pending action${pendingCount !== 1 ? 's' : ''}…`
    : pendingCount > 0
    ? `${pendingCount} action${pendingCount !== 1 ? 's' : ''} pending sync`
    : null;

  if (!message) return null;

  const isError = !isOnline && !isSyncing;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        bottom: '1.25rem',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.5rem 1rem',
        borderRadius: '2rem',
        fontSize: '0.78rem',
        fontWeight: 500,
        fontFamily: 'Inter, system-ui, sans-serif',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        background: isError
          ? 'rgba(239, 68, 68, 0.15)'
          : isSyncing
          ? 'rgba(59, 130, 246, 0.15)'
          : 'rgba(234, 179, 8, 0.15)',
        border: `1px solid ${
          isError ? 'rgba(239,68,68,0.35)' : isSyncing ? 'rgba(59,130,246,0.35)' : 'rgba(234,179,8,0.35)'
        }`,
        color: isError ? '#fca5a5' : isSyncing ? '#93c5fd' : '#fde68a',
        boxShadow: '0 4px 24px rgba(0,0,0,0.35)',
        userSelect: 'none',
        transition: 'opacity 0.3s ease',
        whiteSpace: 'nowrap',
      }}
    >
      {/* Icon */}
      {isError ? (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <line x1="1" y1="1" x2="23" y2="23" />
          <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55M5 12.55a10.94 10.94 0 0 1 5.17-2.39M10.71 5.05A16 16 0 0 1 22.56 9M1.42 9a15.91 15.91 0 0 1 4.7-2.88M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01" />
        </svg>
      ) : isSyncing ? (
        <svg
          width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2.5"
          style={{ animation: 'spin 1s linear infinite' }}
        >
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      )}

      {message}

      {lastSyncAt && !isError && !isSyncing && (
        <span style={{ opacity: 0.55, marginLeft: '0.25rem' }}>
          · synced {_formatRelative(lastSyncAt)}
        </span>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function _formatRelative(date) {
  const diffSec = Math.round((Date.now() - date.getTime()) / 1000);
  if (diffSec < 10) return 'just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  return `${Math.round(diffSec / 60)}m ago`;
}
