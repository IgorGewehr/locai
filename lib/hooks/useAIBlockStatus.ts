import { useState, useEffect, useCallback, useRef } from 'react';
import { logger } from '@/lib/utils/logger';

interface UseAIBlockStatusProps {
  phone: string | undefined;
  tenantId: string | undefined;
  getFirebaseToken: () => Promise<string | null>;
}

interface AIBlockStatus {
  blocked: boolean;
  expiresAt: number | null;
  loading: boolean;
  error: string | null;
}

/**
 * Optimized hook for managing AI block status
 * - Reduced polling interval (60s instead of 30s)
 * - Prevents duplicate API calls
 * - Caches status to avoid flickering
 */
export function useAIBlockStatus({
  phone,
  tenantId,
  getFirebaseToken,
}: UseAIBlockStatusProps) {
  const [status, setStatus] = useState<AIBlockStatus>({
    blocked: false,
    expiresAt: null,
    loading: false,
    error: null,
  });

  const lastCheckRef = useRef<number>(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const phoneRef = useRef<string | undefined>(phone);

  // Check AI status
  const checkStatus = useCallback(async (force = false) => {
    if (!phone || !tenantId) {
      setStatus({ blocked: false, expiresAt: null, loading: false, error: null });
      return;
    }

    // Throttle requests - minimum 10 seconds between checks unless forced
    const now = Date.now();
    if (!force && now - lastCheckRef.current < 10000) {
      return;
    }

    // Abort any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    lastCheckRef.current = now;

    setStatus(prev => ({ ...prev, loading: true }));

    try {
      const token = await getFirebaseToken();
      if (!token) {
        setStatus(prev => ({ ...prev, loading: false }));
        return;
      }

      const response = await fetch(
        `/api/ai/block-conversation?phone=${encodeURIComponent(phone)}`,
        {
          headers: { 'Authorization': `Bearer ${token}` },
          signal: abortControllerRef.current.signal,
        }
      );

      if (!response.ok) {
        throw new Error('Failed to check status');
      }

      const result = await response.json();

      // Only update if phone hasn't changed
      if (phoneRef.current === phone) {
        setStatus({
          blocked: (result.success && result.data?.blocked) || false,
          expiresAt: result.data?.expiresAt ?? null,
          loading: false,
          error: null,
        });
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return; // Ignored aborted requests
      }

      logger.error('[AI-BLOCK] Error checking status', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      setStatus(prev => ({
        ...prev,
        loading: false,
        error: 'Failed to check AI status',
      }));
    }
  }, [phone, tenantId, getFirebaseToken]);

  // Enable manual mode (block AI)
  const enableManualMode = useCallback(async (duration = 1, reason?: string) => {
    if (!phone || !tenantId) return;

    setStatus(prev => ({ ...prev, loading: true }));

    try {
      const token = await getFirebaseToken();
      const response = await fetch('/api/ai/block-conversation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          phone,
          blocked: true,
          duration,
          reason: reason || 'Modo manual ativado pelo usuario',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to enable manual mode');
      }

      const result = await response.json().catch(() => null);
      setStatus({
        blocked: true,
        expiresAt: result?.data?.expiresAt ?? Date.now() + duration * 60 * 60 * 1000,
        loading: false,
        error: null,
      });
    } catch (error) {
      logger.error('[AI-BLOCK] Error enabling manual mode', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      setStatus(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to enable manual mode',
      }));

      throw error;
    }
  }, [phone, tenantId, getFirebaseToken]);

  // Disable manual mode (unblock AI)
  const disableManualMode = useCallback(async () => {
    if (!phone || !tenantId) return;

    setStatus(prev => ({ ...prev, loading: true }));

    try {
      const token = await getFirebaseToken();
      const response = await fetch('/api/ai/block-conversation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          phone,
          blocked: false,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to disable manual mode');
      }

      setStatus({ blocked: false, expiresAt: null, loading: false, error: null });
    } catch (error) {
      logger.error('[AI-BLOCK] Error disabling manual mode', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      setStatus(prev => ({
        ...prev,
        loading: false,
        error: 'Failed to disable manual mode',
      }));

      throw error;
    }
  }, [phone, tenantId, getFirebaseToken]);

  // Reset when phone changes
  useEffect(() => {
    phoneRef.current = phone;

    if (!phone || !tenantId) {
      setStatus({ blocked: false, expiresAt: null, loading: false, error: null });
      return;
    }

    // Check immediately when phone changes
    checkStatus(true);

    // Poll every 60 seconds (reduced from 30s for performance)
    const interval = setInterval(() => checkStatus(), 60000);

    return () => {
      clearInterval(interval);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [phone, tenantId, checkStatus]);

  return {
    blocked: status.blocked,
    expiresAt: status.expiresAt,
    loading: status.loading,
    error: status.error,
    enableManualMode,
    disableManualMode,
    refresh: () => checkStatus(true),
  };
}
