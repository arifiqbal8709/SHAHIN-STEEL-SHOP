import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { syncAPI } from '../services/api';

const SyncContext = createContext();

export const SyncProvider = ({ children }) => {
  const [isSynced, setIsSynced] = useState(true);
  const [lastSyncTime, setLastSyncTime] = useState(new Date());
  const [lastSaleId, setLastSaleId] = useState(null);
  const [syncStatusText, setSyncStatusText] = useState('Connected to MySQL Cloud');

  const checkSync = useCallback(async () => {
    try {
      const res = await syncAPI.checkStatus();
      if (res && res.success) {
        setIsSynced(true);
        setLastSyncTime(new Date());
        
        // If a new sale arrived from another device, dispatch sync event
        if (res.lastSaleId && lastSaleId && res.lastSaleId !== lastSaleId) {
          console.log('[Multi-Device Sync] Detected new sale from another device:', res.lastSaleId);
          window.dispatchEvent(new CustomEvent('shahin-cloud-sync', { detail: res }));
        }
        if (res.lastSaleId) {
          setLastSaleId(res.lastSaleId);
        }
      }
    } catch (err) {
      console.warn('[Sync Ping] Temporary sync latency:', err.message);
      setIsSynced(false);
    }
  }, [lastSaleId]);

  useEffect(() => {
    // Initial sync
    checkSync();
    // Poll every 15 seconds for multi-device sync
    const interval = setInterval(checkSync, 15000);
    return () => clearInterval(interval);
  }, [checkSync]);

  const forceSyncNow = async () => {
    setSyncStatusText('Syncing...');
    await checkSync();
    setSyncStatusText('Connected to MySQL Cloud');
  };

  return (
    <SyncContext.Provider value={{
      isSynced,
      lastSyncTime,
      syncStatusText,
      forceSyncNow
    }}>
      {children}
    </SyncContext.Provider>
  );
};

export const useSync = () => useContext(SyncContext);

