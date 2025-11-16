"use client";

import { useState, useEffect, useCallback } from 'react';
import { logger } from '@/lib/utils/logger';

/**
 * 🌐 Online Status Hook
 *
 * Detecta status de conectividade e fornece feedback ao usuário
 *
 * Features:
 * - Detecção online/offline
 * - Auto-refresh ao reconectar
 * - Callbacks customizados
 * - Logging automático
 *
 * Usage:
 * ```tsx
 * const { isOnline, wasOffline } = useOnlineStatus({
 *   onOnline: () => console.log('Connected!'),
 *   onOffline: () => console.log('Disconnected!')
 * });
 *
 * if (!isOnline) {
 *   return <OfflineMessage />;
 * }
 * ```
 */

interface UseOnlineStatusOptions {
  /**
   * Callback executado quando conexão é restaurada
   */
  onOnline?: () => void;

  /**
   * Callback executado quando conexão é perdida
   */
  onOffline?: () => void;

  /**
   * Auto-refresh página ao reconectar (default: false)
   */
  autoRefreshOnReconnect?: boolean;

  /**
   * Delay em ms antes de executar auto-refresh (default: 1000)
   */
  refreshDelay?: number;
}

export function useOnlineStatus(options: UseOnlineStatusOptions = {}) {
  const {
    onOnline,
    onOffline,
    autoRefreshOnReconnect = false,
    refreshDelay = 1000,
  } = options;

  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [wasOffline, setWasOffline] = useState<boolean>(false);

  const handleOnline = useCallback(() => {
    logger.info('🌐 [OnlineStatus] Connection restored');
    setIsOnline(true);

    // Marcar que estivemos offline
    setWasOffline(true);

    // Callback customizado
    if (onOnline) {
      try {
        onOnline();
      } catch (error) {
        logger.error('❌ [OnlineStatus] Error in onOnline callback', {
          error: error instanceof Error ? error.message : 'Unknown',
        });
      }
    }

    // Auto-refresh se habilitado
    if (autoRefreshOnReconnect) {
      logger.info('🔄 [OnlineStatus] Auto-refreshing page after reconnection');
      setTimeout(() => {
        window.location.reload();
      }, refreshDelay);
    }
  }, [onOnline, autoRefreshOnReconnect, refreshDelay]);

  const handleOffline = useCallback(() => {
    logger.warn('⚠️ [OnlineStatus] Connection lost');
    setIsOnline(false);
    setWasOffline(true);

    // Callback customizado
    if (onOffline) {
      try {
        onOffline();
      } catch (error) {
        logger.error('❌ [OnlineStatus] Error in onOffline callback', {
          error: error instanceof Error ? error.message : 'Unknown',
        });
      }
    }
  }, [onOffline]);

  useEffect(() => {
    // Verificar suporte a API
    if (typeof window === 'undefined' || !('addEventListener' in window)) {
      logger.warn('⚠️ [OnlineStatus] Browser does not support online/offline events');
      return;
    }

    // Listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Log status inicial
    logger.info('🌐 [OnlineStatus] Hook initialized', {
      isOnline: navigator.onLine,
    });

    // Cleanup
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [handleOnline, handleOffline]);

  return {
    /**
     * Status de conexão atual
     */
    isOnline,

    /**
     * Indica se estivemos offline em algum momento
     * Útil para mostrar mensagem "Conexão restaurada"
     */
    wasOffline,

    /**
     * Limpar flag wasOffline
     */
    clearOfflineFlag: useCallback(() => {
      setWasOffline(false);
    }, []),
  };
}

/**
 * 🛡️ Offline Message Component Helper
 *
 * Componente reutilizável para mostrar mensagem offline
 *
 * Usage:
 * ```tsx
 * import { OfflineMessage } from '@/lib/hooks/useOnlineStatus';
 *
 * if (!isOnline) {
 *   return <OfflineMessage />;
 * }
 * ```
 */
export function useOfflineMessage() {
  const { isOnline, wasOffline, clearOfflineFlag } = useOnlineStatus({
    autoRefreshOnReconnect: false,
  });

  return {
    isOnline,
    wasOffline,
    clearOfflineFlag,
    OfflineIndicator: () => {
      if (isOnline && !wasOffline) return null;

      return (
        <div
          style={{
            position: 'fixed',
            bottom: 16,
            right: 16,
            zIndex: 9999,
            padding: '12px 24px',
            borderRadius: '8px',
            backgroundColor: isOnline ? '#4caf50' : '#f44336',
            color: 'white',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            fontWeight: 500,
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.3s ease',
          }}
        >
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: 'white',
              animation: isOnline ? 'none' : 'pulse 2s infinite',
            }}
          />
          {isOnline ? (
            <span>✓ Conexão restaurada</span>
          ) : (
            <span>⚠ Sem conexão com internet</span>
          )}
        </div>
      );
    },
  };
}

export default useOnlineStatus;
