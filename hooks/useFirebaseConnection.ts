/**
 * Hook to monitor Firebase connection status
 * Provides real-time feedback about connectivity issues
 */

import { useState, useEffect } from 'react';
import { connectionManager } from '@/lib/firebase/enhanced-firebase-config';
import { useSnackbar } from 'notistack';

interface ConnectionState {
  isOnline: boolean;
  isFirebaseConnected: boolean;
  retryCount: number;
  message?: string;
}

export function useFirebaseConnection() {
  const { enqueueSnackbar, closeSnackbar } = useSnackbar();
  const [connectionState, setConnectionState] = useState<ConnectionState>({
    isOnline: typeof window !== 'undefined' ? navigator.onLine : true,
    isFirebaseConnected: true,
    retryCount: 0,
  });
  
  const [offlineSnackbarId, setOfflineSnackbarId] = useState<string | number | null>(null);

  useEffect(() => {
    if (!connectionManager) return;

    // Subscribe to connection changes
    const unsubscribe = connectionManager.onConnectionChange((isOnline) => {
      setConnectionState(prev => ({
        ...prev,
        isOnline,
        isFirebaseConnected: isOnline,
        message: isOnline 
          ? 'Conexão restaurada' 
          : 'Você está offline. As alterações serão sincronizadas quando a conexão for restaurada.'
      }));

      // Show/hide snackbar notifications
      if (!isOnline && !offlineSnackbarId) {
        const id = enqueueSnackbar(
          'Modo offline: As alterações serão salvas localmente e sincronizadas quando a conexão for restaurada.',
          { 
            variant: 'warning',
            persist: true,
            preventDuplicate: true,
          }
        );
        setOfflineSnackbarId(id);
      } else if (isOnline && offlineSnackbarId) {
        closeSnackbar(offlineSnackbarId);
        setOfflineSnackbarId(null);
        enqueueSnackbar('Conexão restaurada! Sincronizando dados...', {
          variant: 'success',
          autoHideDuration: 3000,
        });
      }
    });

    // Monitor browser online/offline
    const handleOnline = () => {
      setConnectionState(prev => ({ ...prev, isOnline: true }));
    };

    const handleOffline = () => {
      setConnectionState(prev => ({ ...prev, isOnline: false }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      unsubscribe();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (offlineSnackbarId) {
        closeSnackbar(offlineSnackbarId);
      }
    };
  }, [enqueueSnackbar, closeSnackbar, offlineSnackbarId]);

  return connectionState;
}