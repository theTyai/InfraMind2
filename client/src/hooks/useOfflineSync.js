// client/src/hooks/useOfflineSync.js
// React hook that exposes the current network/sync state to UI components.
// 
// Returns:
//   isOnline  (bool) - Whether the browser reports it's online
//   isSyncing (bool) - Whether the sync manager is currently flushing
//   pendingCount (number) - Number of actions in the offline queue
//   lastSyncAt (Date|null) - Timestamp of the last successful sync
//
// Usage:
//   const { isOnline, pendingCount } = useOfflineSync()

import { useEffect, useState, useCallback } from 'react';
import { size as queueSize } from '../utils/offlineQueue';

export function useOfflineSync() {
  const [isOnline, setIsOnline]       = useState(navigator.onLine);
  const [isSyncing, setIsSyncing]     = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSyncAt, setLastSyncAt]   = useState(null);

  const refreshCount = useCallback(async () => {
    const count = await queueSize();
    setPendingCount(count);
  }, []);

  useEffect(() => {
    // Check initial queue size
    refreshCount();

    const handleOnline  = () => { setIsOnline(true);  refreshCount(); };
    const handleOffline = () => { setIsOnline(false); refreshCount(); };

    const handleSyncStart = () => { setIsSyncing(true);  refreshCount(); };
    const handleSyncEnd   = (e) => {
      setIsSyncing(false);
      setLastSyncAt(new Date());
      refreshCount();
    };

    window.addEventListener('online',  handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('inframind:sync:online',     handleOnline);
    window.addEventListener('inframind:sync:offline',    handleOffline);
    window.addEventListener('inframind:sync:sync_start', handleSyncStart);
    window.addEventListener('inframind:sync:sync_end',   handleSyncEnd);

    // Poll queue size every 15s to keep count fresh
    const interval = setInterval(refreshCount, 15_000);

    return () => {
      window.removeEventListener('online',  handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('inframind:sync:online',     handleOnline);
      window.removeEventListener('inframind:sync:offline',    handleOffline);
      window.removeEventListener('inframind:sync:sync_start', handleSyncStart);
      window.removeEventListener('inframind:sync:sync_end',   handleSyncEnd);
      clearInterval(interval);
    };
  }, [refreshCount]);

  return { isOnline, isSyncing, pendingCount, lastSyncAt };
}
