'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { logger } from '@/lib/utils/logger';

// ── Feed item contract (pinned — see contract #3) ────────────────────
export interface AssistantAlertItem {
  kind: 'alert';
  id: string;
  status: string;
  createdAt: string; // ISO
  clientName?: string;
  phone: string;
  guests?: number;
  checkIn?: string;
  checkOut?: string;
  propertyTitle?: string;
  summary: string;
  deepLink: string;
  ageMinutes: number;
}

export interface AssistantMessageItem {
  kind: 'message';
  id: string;
  role: 'operator' | 'assistant';
  text: string;
  createdAt: string; // ISO
}

export type AssistantFeedItem = AssistantAlertItem | AssistantMessageItem;

interface FeedResponse {
  ok: boolean;
  items: AssistantFeedItem[];
  unread: number;
}

interface UseAssistantState {
  items: AssistantFeedItem[];
  unread: number;
  loading: boolean;
  error: string | null;
  sending: boolean;
}

/**
 * Hook for the internal "Assistente Sofia" channel.
 * - Loads the mixed feed (closing alerts + free chat) via GET.
 * - Posts operator messages via POST and appends the reply.
 * - Light polling, only while the tab is visible.
 * - Provides ack() for the "Abrir conversa" card action.
 */
export function useAssistant({ enabled }: { enabled: boolean }) {
  const { getFirebaseToken } = useAuth();
  const [state, setState] = useState<UseAssistantState>({
    items: [],
    unread: 0,
    loading: false,
    error: null,
    sending: false,
  });

  const inFlightRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  const authHeaders = useCallback(async (): Promise<Record<string, string> | null> => {
    const token = await getFirebaseToken();
    if (!token) return null;
    return { Authorization: `Bearer ${token}` };
  }, [getFirebaseToken]);

  const loadFeed = useCallback(
    async (silent = false) => {
      if (inFlightRef.current) return;
      inFlightRef.current = true;

      if (abortRef.current) abortRef.current.abort();
      abortRef.current = new AbortController();

      if (!silent) setState((p) => ({ ...p, loading: true, error: null }));
      try {
        const headers = await authHeaders();
        if (!headers) {
          setState((p) => ({ ...p, loading: false }));
          return;
        }
        const res = await fetch('/api/agent/assistant/feed?limit=50', {
          headers,
          signal: abortRef.current.signal,
        });
        if (!res.ok) throw new Error('Falha ao carregar o feed do assistente');
        const data = (await res.json()) as FeedResponse;
        setState((p) => ({
          ...p,
          items: Array.isArray(data.items) ? data.items : [],
          unread: typeof data.unread === 'number' ? data.unread : 0,
          loading: false,
          error: null,
        }));
      } catch (e) {
        if (e instanceof Error && e.name === 'AbortError') return;
        logger.error('[Assistant] loadFeed failed', e instanceof Error ? e : undefined);
        setState((p) => ({ ...p, loading: false, error: 'Falha ao carregar o feed do assistente.' }));
      } finally {
        inFlightRef.current = false;
      }
    },
    [authHeaders],
  );

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      setState((p) => ({ ...p, sending: true, error: null }));
      try {
        const headers = await authHeaders();
        if (!headers) throw new Error('Sessão expirada. Faça login novamente.');
        const res = await fetch('/api/agent/assistant/message', {
          method: 'POST',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: trimmed }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || 'Falha ao falar com a IA');
        }
        setState((p) => ({ ...p, sending: false }));
        // Reload to pick up the persisted operator + assistant messages in order.
        await loadFeed(true);
      } catch (e) {
        logger.error('[Assistant] sendMessage failed', e instanceof Error ? e : undefined);
        setState((p) => ({ ...p, sending: false }));
        throw e;
      }
    },
    [authHeaders, loadFeed],
  );

  const ack = useCallback(
    async (alertId: string) => {
      try {
        const headers = await authHeaders();
        if (!headers) return;
        const res = await fetch('/api/agent/assistant/ack', {
          method: 'POST',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({ alertId }),
        });
        if (!res.ok) throw new Error('Falha ao confirmar o chamado');
        // Optimistically mark the alert acknowledged locally.
        setState((p) => ({
          ...p,
          items: p.items.map((it) =>
            it.kind === 'alert' && it.id === alertId ? { ...it, status: 'acknowledged' } : it,
          ),
        }));
      } catch (e) {
        logger.error('[Assistant] ack failed', e instanceof Error ? e : undefined);
        throw e;
      }
    },
    [authHeaders],
  );

  // Initial load + light polling, only while enabled and tab is visible.
  useEffect(() => {
    if (!enabled) return;

    loadFeed(false);

    let interval: ReturnType<typeof setInterval> | null = null;

    const start = () => {
      if (interval) return;
      interval = setInterval(() => {
        if (document.visibilityState === 'visible') loadFeed(true);
      }, 20000);
    };
    const stop = () => {
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        loadFeed(true);
        start();
      } else {
        stop();
      }
    };

    if (document.visibilityState === 'visible') start();
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
      if (abortRef.current) abortRef.current.abort();
    };
  }, [enabled, loadFeed]);

  return {
    items: state.items,
    unread: state.unread,
    loading: state.loading,
    error: state.error,
    sending: state.sending,
    refresh: () => loadFeed(true),
    sendMessage,
    ack,
  };
}
