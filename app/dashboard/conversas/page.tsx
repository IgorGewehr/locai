'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef, memo } from 'react';
import {
  Box, Typography, IconButton, InputBase, Avatar, Menu, MenuItem,
  ListItemIcon, ListItemText, CircularProgress, Divider, alpha,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button,
  Snackbar, Alert,
} from '@mui/material';
import {
  Search, Refresh, MoreVert, WhatsApp, Chat,
  ArrowBack, KeyboardArrowDown, DoneAll, MarkChatUnread, Edit,
  ErrorOutline,
} from '@mui/icons-material';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { useTenant } from '@/contexts/TenantContext';
import { useConversations } from '@/lib/hooks/useConversations';
import { useAIBlockStatus } from '@/lib/hooks/useAIBlockStatus';
import { useTenantServices } from '@/lib/hooks/useTenantServices';
import { logger } from '@/lib/utils/logger';
import { toDate } from '@/lib/utils/date-helpers';
import type { ConversationHeaderStatus, ConversationListSummary } from '@/lib/types/conversation';
import type { Lead } from '@/lib/types/crm';
import { computeTriageStatus, TRIAGE_CONFIG, type TriageStatus } from '@/lib/utils/triage';
import { normalizeBrazilPhone } from '@/lib/services/lead-lookup';
import AIControlButton from '@/components/organisms/conversations/AIControlButton';
import MessageBubble from '@/components/organisms/conversations/MessageBubble';
import MessageInput from '@/components/organisms/conversations/MessageInput';
import AssistantPinnedEntry from '@/components/organisms/conversations/AssistantPinnedEntry';
import AssistantChat from '@/components/organisms/conversations/AssistantChat';

const WA_COLOR = '#25D366';

const STATUS_FILTERS: { id: ConversationHeaderStatus | 'all'; label: string }[] = [
  { id: 'all', label: 'Todas' },
  { id: 'active', label: 'Ativas' },
  { id: 'completed', label: 'Concluídas' },
  { id: 'success', label: 'Sucesso' },
  { id: 'abandoned', label: 'Abandonadas' },
];

const CONV_STATUS_LABEL: Record<string, string> = {
  active: 'Ativa', completed: 'Concluída', success: 'Sucesso', abandoned: 'Abandonada', pending: 'Pendente',
};

function initials(name?: string, phone?: string): string {
  const src = (name || '').trim();
  if (src) {
    const parts = src.split(/\s+/);
    return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase();
  }
  return (phone || '?').slice(-2);
}

function relTime(d: Date | null): string {
  if (!d) return '';
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return 'agora';
  if (diff < 3600) return `${Math.floor(diff / 60)}min`;
  if (diff < 86400) return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

// ── Conversation row ──────────────────────────────────────────────
interface RowProps {
  conv: ConversationListSummary;
  selected: boolean;
  triage: TriageStatus | null;
  onSelect: (id: string) => void;
  onContextMenu: (e: React.MouseEvent, id: string) => void;
}
const ConversationRow = memo(({ conv, selected, triage, onSelect, onContextMenu }: RowProps) => {
  const unread = (conv.unreadCount ?? 0) > 0 || conv.isRead === false;
  const accent = triage ? TRIAGE_CONFIG[triage].color : 'transparent';

  return (
    <Box
      onClick={() => onSelect(conv.id)}
      onContextMenu={(e) => onContextMenu(e, conv.id)}
      sx={{
        display: 'flex', alignItems: 'center', gap: 1.25, px: 1.5, py: 1.25,
        cursor: 'pointer', position: 'relative',
        borderLeft: '3px solid', borderLeftColor: accent,
        bgcolor: selected ? 'rgba(220,38,38,0.1)' : 'transparent',
        transition: 'background 0.12s ease',
        '&:hover': { bgcolor: selected ? 'rgba(220,38,38,0.12)' : 'rgba(255,255,255,0.03)' },
      }}
    >
      {/* Avatar + channel badge */}
      <Box sx={{ position: 'relative', flexShrink: 0 }}>
        <Avatar sx={{ width: 42, height: 42, bgcolor: 'rgba(220,38,38,0.18)', color: '#fca5a5', fontSize: '0.875rem', fontWeight: 600 }}>
          {initials(conv.clientName, conv.clientPhone)}
        </Avatar>
        <Box sx={{
          position: 'absolute', bottom: -2, right: -2, width: 18, height: 18, borderRadius: '50%',
          bgcolor: '#0b0f1a', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <WhatsApp sx={{ fontSize: 12, color: WA_COLOR }} />
        </Box>
      </Box>

      {/* Text */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
          <Typography sx={{
            fontSize: '0.875rem', fontWeight: unread ? 700 : 500,
            color: unread ? '#f1f5f9' : 'rgba(255,255,255,0.82)',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {conv.clientName || conv.clientPhone}
          </Typography>
          <Typography sx={{ fontSize: '0.6875rem', color: 'rgba(255,255,255,0.4)', flexShrink: 0 }}>
            {relTime(toDate(conv.lastMessageAt))}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, mt: 0.25 }}>
          <Typography sx={{
            fontSize: '0.8125rem', color: unread ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.45)',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {conv.lastMessage || '—'}
          </Typography>
          {(conv.unreadCount ?? 0) > 0 && (
            <Box sx={{
              minWidth: 18, height: 18, px: 0.5, borderRadius: '9px', bgcolor: '#dc2626',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <Typography sx={{ fontSize: '0.6875rem', fontWeight: 700, color: '#fff' }}>
                {conv.unreadCount}
              </Typography>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
});
ConversationRow.displayName = 'ConversationRow';

// ── Messages list ─────────────────────────────────────────────────
const MessagesList = memo(({ messages, loading, endRef }: { messages: any[]; loading: boolean; endRef: React.RefObject<HTMLDivElement> }) => {
  const withDividers = useMemo(() => messages.map((m, i) => {
    const ts = toDate(m.clientMessageTimestamp || m.createdAt);
    const prev = i > 0 ? toDate(messages[i - 1].clientMessageTimestamp || messages[i - 1].createdAt) : null;
    const showDateDivider = !prev || (ts && prev && ts.toDateString() !== prev.toDateString());
    return { message: m, showDateDivider };
  }), [messages]);

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress size={24} sx={{ color: 'rgba(255,255,255,0.3)' }} /></Box>;
  }
  if (messages.length === 0) {
    return <Typography sx={{ textAlign: 'center', py: 6, color: 'rgba(255,255,255,0.4)', fontSize: '0.875rem' }}>Nenhuma mensagem nesta conversa.</Typography>;
  }
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      {withDividers.map(({ message, showDateDivider }) => (
        <MessageBubble key={message.id} message={message} showDateDivider={showDateDivider} />
      ))}
      <div ref={endRef} />
    </Box>
  );
});
MessagesList.displayName = 'MessagesList';

export default function ConversationsPage() {
  const searchParams = useSearchParams();
  const { tenantId, isReady } = useTenant();
  const { getFirebaseToken } = useAuth();
  const services = useTenantServices();

  const {
    conversations, selectedConversation, messages, loading, loadingMessages, error,
    stats, filters, setFilters, selectConversation, clearSelection, refresh,
    markAsRead, markAsUnread, updateStatus, renameConversation,
    hasMore, loadMoreConversations,
  } = useConversations({ tenantId: tenantId || '', autoLoad: isReady, limit: 50 });

  const handleListScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (hasMore && !loading && el.scrollHeight - el.scrollTop - el.clientHeight < 240) {
      loadMoreConversations();
    }
  }, [hasMore, loading, loadMoreConversations]);

  // P1-4: single AI-block source for both the header pill (AIControlButton)
  // and the input footer (MessageInput).
  const {
    blocked: aiBlocked, expiresAt: aiExpiresAt, loading: checkingAiStatus,
    error: aiError, enableManualMode, disableManualMode,
  } = useAIBlockStatus({
    phone: selectedConversation?.clientPhone, tenantId, getFirebaseToken,
  });

  const [searchText, setSearchText] = useState('');
  // Pinned "Assistente Sofia" channel: when true the right panel shows AssistantChat.
  const [selectedAssistant, setSelectedAssistant] = useState(false);
  const [assistantUnread, setAssistantUnread] = useState(0);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; id: string } | null>(null);
  const [statusMenuEl, setStatusMenuEl] = useState<null | HTMLElement>(null);
  const [leadMap, setLeadMap] = useState<Map<string, Lead>>(new Map());
  // P2: MUI rename dialog (replaces native prompt()).
  const [renameTarget, setRenameTarget] = useState<{ id: string; name: string } | null>(null);
  const [renameValue, setRenameValue] = useState('');
  // P1-6: feedback toast for failed manual sends / actions.
  const [toast, setToast] = useState<{ msg: string; severity: 'error' | 'success' } | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const deepLinkDone = useRef(false);

  // Load leads once → phone→lead map for triage accents/chips
  useEffect(() => {
    if (!services) return;
    services.leads.getAll(300)
      .then((all) => {
        const m = new Map<string, Lead>();
        all.forEach((l) => { if (l.phone) m.set(normalizeBrazilPhone(l.phone), l); });
        setLeadMap(m);
      })
      .catch((e) => logger.error('[Conversas] Failed to load leads', e instanceof Error ? e : undefined));
  }, [services]);

  const leadFor = useCallback((phone?: string): Lead | undefined => {
    if (!phone) return undefined;
    return leadMap.get(normalizeBrazilPhone(phone));
  }, [leadMap]);

  const triageFor = useCallback((phone?: string): TriageStatus | null => {
    const lead = leadFor(phone);
    return lead ? computeTriageStatus(lead) : null;
  }, [leadFor]);

  // Deep-link: ?phone= selects matching conversation once loaded
  useEffect(() => {
    const phone = searchParams.get('phone');
    if (!phone || deepLinkDone.current || conversations.length === 0) return;
    const target = normalizeBrazilPhone(phone);
    const match = conversations.find((c) => normalizeBrazilPhone(c.clientPhone) === target);
    if (match) {
      selectConversation(match.id);
      deepLinkDone.current = true;
    }
  }, [searchParams, conversations, selectConversation]);

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => setFilters((p) => ({ ...p, search: searchText })), 300);
    return () => clearTimeout(t);
  }, [searchText, setFilters]);

  // Auto-scroll
  useEffect(() => {
    if (messages.length > 0) endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length]);

  // P1-6: surface AI-status load errors instead of swallowing them.
  useEffect(() => {
    if (aiError) setToast({ msg: 'Não foi possível verificar o status da IA.', severity: 'error' });
  }, [aiError]);

  // Keep the pinned-entry unread badge fresh while the assistant thread is
  // closed (AssistantChat owns the live count once it's open). Light: fetch
  // on mount + when the tab regains focus, only if the panel isn't open.
  useEffect(() => {
    if (selectedAssistant) return;
    let cancelled = false;
    const fetchUnread = async () => {
      try {
        const token = await getFirebaseToken();
        if (!token) return;
        const res = await fetch('/api/agent/assistant/feed?limit=50', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && typeof data?.unread === 'number') setAssistantUnread(data.unread);
      } catch (e) {
        logger.error('[Conversas] assistant unread fetch failed', e instanceof Error ? e : undefined);
      }
    };
    fetchUnread();
    const onVis = () => { if (document.visibilityState === 'visible') fetchUnread(); };
    document.addEventListener('visibilitychange', onVis);
    return () => { cancelled = true; document.removeEventListener('visibilitychange', onVis); };
  }, [selectedAssistant, getFirebaseToken]);

  const handleSelect = useCallback(async (id: string) => {
    setSelectedAssistant(false);
    selectConversation(id);
    const conv = conversations.find((c) => c.id === id);
    if (conv && conv.isRead === false) await markAsRead(id);
  }, [selectConversation, conversations, markAsRead]);

  const handleSelectAssistant = useCallback(() => {
    clearSelection();
    setSelectedAssistant(true);
  }, [clearSelection]);

  // Deep-link reused by the closing-alert card "Abrir conversa" button.
  // Selects the matching conversation in-place (same normalizeBrazilPhone match
  // the ?phone= deep-link uses) and leaves the assistant thread.
  const openConversation = useCallback((phone: string) => {
    const target = normalizeBrazilPhone(phone);
    const match = conversations.find((c) => normalizeBrazilPhone(c.clientPhone) === target);
    setSelectedAssistant(false);
    if (match) {
      selectConversation(match.id);
      if (match.isRead === false) markAsRead(match.id);
    } else {
      // Conversation not in the loaded list — fall back to the URL deep-link.
      window.location.href = `/dashboard/conversas?phone=${encodeURIComponent(phone)}`;
    }
  }, [conversations, selectConversation, markAsRead]);

  const handleContextMenu = useCallback((e: React.MouseEvent, id: string) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX - 2, y: e.clientY - 4, id });
  }, []);

  const handleSend = useCallback(async (message: string) => {
    if (!selectedConversation || !tenantId) return;
    try {
      const token = await getFirebaseToken();
      const res = await fetch('/api/whatsapp/send-manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ tenantId, message, phone: selectedConversation.clientPhone }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Falha ao enviar mensagem');
    } catch (e) {
      // P1-6: give the operator real feedback — don't just silently restore text.
      setToast({ msg: e instanceof Error ? e.message : 'Falha ao enviar mensagem', severity: 'error' });
      throw e; // MessageInput restores the typed text on rejection
    }
  }, [selectedConversation, tenantId, getFirebaseToken]);

  const handleEnableManual = useCallback(async () => {
    try { await enableManualMode(1, 'Modo manual ativado pelo usuário'); }
    catch (e) {
      logger.error('[Conversas] enableManualMode failed', e instanceof Error ? e : undefined);
      setToast({ msg: 'Falha ao pausar a IA. Tente novamente.', severity: 'error' });
    }
  }, [enableManualMode]);

  // P2: confirm the rename via MUI dialog.
  const handleRenameConfirm = useCallback(async () => {
    if (!renameTarget) return;
    const name = renameValue.trim();
    if (!name) return;
    try {
      await renameConversation(renameTarget.id, name);
      setToast({ msg: 'Contato renomeado.', severity: 'success' });
    } catch (e) {
      logger.error('[Conversas] renameConversation failed', e instanceof Error ? e : undefined);
      setToast({ msg: 'Falha ao renomear o contato.', severity: 'error' });
    } finally {
      setRenameTarget(null);
    }
  }, [renameTarget, renameValue, renameConversation]);

  const selLead = leadFor(selectedConversation?.clientPhone);
  const selTriage = selLead ? computeTriageStatus(selLead) : null;

  if (!isReady) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}><CircularProgress sx={{ color: 'rgba(255,255,255,0.3)' }} /></Box>;
  }

  return (
    <Box sx={{
      height: { xs: 'calc(100vh - 64px)', md: 'calc(100vh - 96px)' },
      display: 'flex', borderRadius: '14px', overflow: 'hidden',
      border: '1px solid rgba(255,255,255,0.08)', bgcolor: '#0d1220',
    }}>
      {/* ── LEFT: list ─────────────────────────────── */}
      <Box sx={{
        width: { xs: '100%', md: 360 }, flexShrink: 0,
        borderRight: { md: '1px solid rgba(255,255,255,0.08)' },
        display: { xs: (selectedConversation || selectedAssistant) ? 'none' : 'flex', md: 'flex' }, flexDirection: 'column',
      }}>
        {/* Header */}
        <Box sx={{ p: 2, pb: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
            <Box>
              <Typography sx={{ fontSize: '1.125rem', fontWeight: 700, color: '#f1f5f9', lineHeight: 1.1 }}>Conversas</Typography>
              <Typography sx={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>{stats.total} conversas</Typography>
            </Box>
            <IconButton onClick={refresh} disabled={loading} size="small" sx={{ color: 'rgba(255,255,255,0.5)' }}>
              <Refresh fontSize="small" />
            </IconButton>
          </Box>

          {/* Search */}
          <Box sx={{
            display: 'flex', alignItems: 'center', gap: 1, px: 1.5, py: 0.75,
            bgcolor: 'rgba(255,255,255,0.04)', borderRadius: '10px',
            border: '1px solid rgba(255,255,255,0.06)',
          }}>
            <Search sx={{ fontSize: 18, color: 'rgba(255,255,255,0.4)' }} />
            <InputBase
              placeholder="Buscar conversas..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              sx={{ flex: 1, fontSize: '0.8125rem', color: '#e2e8f0', '& input::placeholder': { color: 'rgba(255,255,255,0.35)' } }}
            />
          </Box>
        </Box>

        {/* Status filter chips */}
        <Box sx={{ display: 'flex', gap: 0.75, px: 2, pb: 1.5, flexWrap: 'wrap' }}>
          {STATUS_FILTERS.map((s) => {
            const active = filters.status === s.id;
            return (
              <Box key={s.id} component="button" onClick={() => setFilters((p) => ({ ...p, status: s.id }))}
                sx={{
                  px: 1, py: 0.375, borderRadius: '14px', cursor: 'pointer', outline: 'none',
                  border: '1px solid', borderColor: active ? '#dc2626' : 'rgba(255,255,255,0.08)',
                  bgcolor: active ? 'rgba(220,38,38,0.14)' : 'transparent',
                  transition: 'all 0.12s ease', '&:hover': { borderColor: 'rgba(220,38,38,0.5)' },
                }}>
                <Typography sx={{ fontSize: '0.6875rem', fontWeight: 600, color: active ? '#f87171' : 'rgba(255,255,255,0.5)' }}>
                  {s.label}
                </Typography>
              </Box>
            );
          })}
        </Box>

        <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)' }} />

        {/* List */}
        <Box sx={{ flex: 1, overflowY: 'auto' }} onScroll={handleListScroll}>
          {/* Pinned Sofia assistant — always 1st, regardless of filters/state */}
          <AssistantPinnedEntry
            selected={selectedAssistant}
            unread={assistantUnread}
            onSelect={handleSelectAssistant}
          />
          <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)' }} />

          {loading && conversations.length === 0 ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress size={24} sx={{ color: 'rgba(255,255,255,0.3)' }} /></Box>
          ) : error && conversations.length === 0 ? (
            // P1-6: a load failure must NOT masquerade as "no conversations".
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5, py: 6, px: 2 }}>
              <ErrorOutline sx={{ fontSize: 32, color: 'rgba(248,113,113,0.7)' }} />
              <Typography sx={{ textAlign: 'center', color: 'rgba(248,113,113,0.9)', fontSize: '0.8125rem', fontWeight: 600 }}>
                {error}
              </Typography>
              <Box component="button" onClick={refresh}
                sx={{
                  px: 1.5, py: 0.625, borderRadius: '8px', cursor: 'pointer', outline: 'none',
                  border: '1px solid rgba(220,38,38,0.4)', bgcolor: 'rgba(220,38,38,0.1)',
                  color: '#f87171', fontSize: '0.75rem', fontWeight: 600,
                  '&:hover': { bgcolor: 'rgba(220,38,38,0.18)' },
                }}>
                Tentar novamente
              </Box>
            </Box>
          ) : conversations.length === 0 ? (
            <Typography sx={{ textAlign: 'center', py: 6, px: 2, color: 'rgba(255,255,255,0.4)', fontSize: '0.8125rem' }}>
              Nenhuma conversa encontrada.
            </Typography>
          ) : (
            <>
              {conversations.map((conv) => (
                <ConversationRow
                  key={conv.id}
                  conv={conv}
                  selected={selectedConversation?.id === conv.id}
                  triage={triageFor(conv.clientPhone)}
                  onSelect={handleSelect}
                  onContextMenu={handleContextMenu}
                />
              ))}
              {loading && conversations.length > 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                  <CircularProgress size={18} sx={{ color: 'rgba(255,255,255,0.3)' }} />
                </Box>
              )}
              {!hasMore && (
                <Typography sx={{ textAlign: 'center', py: 2, color: 'rgba(255,255,255,0.25)', fontSize: '0.6875rem' }}>
                  Todas as conversas carregadas
                </Typography>
              )}
            </>
          )}
        </Box>
      </Box>

      {/* ── RIGHT: chat ────────────────────────────── */}
      <Box sx={{
        flex: 1, minWidth: 0, display: { xs: (selectedConversation || selectedAssistant) ? 'flex' : 'none', md: 'flex' },
        flexDirection: 'column', bgcolor: '#0b0f1a',
      }}>
        {selectedAssistant ? (
          <AssistantChat
            active={selectedAssistant}
            onOpenConversation={openConversation}
            onUnreadChange={setAssistantUnread}
            onBack={() => setSelectedAssistant(false)}
          />
        ) : !selectedConversation ? (
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 1.5 }}>
            <Chat sx={{ fontSize: 56, color: 'rgba(255,255,255,0.12)' }} />
            <Typography sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9375rem', fontWeight: 500 }}>Selecione uma conversa</Typography>
            <Typography sx={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.8125rem' }}>Escolha uma conversa na lista para ver as mensagens</Typography>
          </Box>
        ) : (
          <>
            {/* Chat header */}
            <Box sx={{
              display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1.5,
              borderBottom: '1px solid rgba(255,255,255,0.08)', bgcolor: '#0d1220',
            }}>
              <IconButton onClick={clearSelection} size="small" sx={{ display: { xs: 'inline-flex', md: 'none' }, color: 'rgba(255,255,255,0.6)' }}>
                <ArrowBack fontSize="small" />
              </IconButton>

              <Avatar sx={{ width: 40, height: 40, bgcolor: 'rgba(220,38,38,0.18)', color: '#fca5a5', fontSize: '0.875rem', fontWeight: 600 }}>
                {initials(selectedConversation.clientName, selectedConversation.clientPhone)}
              </Avatar>

              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                  <Typography sx={{ fontSize: '0.9375rem', fontWeight: 600, color: '#f1f5f9' }}>
                    {selectedConversation.clientName || selectedConversation.clientPhone}
                  </Typography>
                  {/* channel chip */}
                  <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.375, px: 0.75, py: 0.125, borderRadius: '10px', bgcolor: alpha(WA_COLOR, 0.14) }}>
                    <WhatsApp sx={{ fontSize: 12, color: WA_COLOR }} />
                    <Typography sx={{ fontSize: '0.625rem', fontWeight: 600, color: WA_COLOR }}>WhatsApp</Typography>
                  </Box>
                  {/* triage chip */}
                  {selTriage && (
                    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.375, px: 0.75, py: 0.125, borderRadius: '10px', bgcolor: alpha(TRIAGE_CONFIG[selTriage].color, 0.14) }}>
                      <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: TRIAGE_CONFIG[selTriage].color }} />
                      <Typography sx={{ fontSize: '0.625rem', fontWeight: 600, color: TRIAGE_CONFIG[selTriage].color }}>{TRIAGE_CONFIG[selTriage].label}</Typography>
                    </Box>
                  )}
                  {/* lead tags */}
                  {selectedConversation.tags?.slice(0, 2).map((t) => (
                    <Box key={t} sx={{ px: 0.75, py: 0.125, borderRadius: '10px', bgcolor: 'rgba(255,255,255,0.06)' }}>
                      <Typography sx={{ fontSize: '0.625rem', fontWeight: 500, color: 'rgba(255,255,255,0.6)' }}>{t}</Typography>
                    </Box>
                  ))}
                </Box>
                <Typography sx={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)', mt: 0.25 }}>
                  {selectedConversation.clientPhone}
                </Typography>
              </Box>

              {/* actions */}
              <AIControlButton
                phone={selectedConversation.clientPhone}
                conversationName={selectedConversation.clientName}
                blocked={aiBlocked}
                expiresAt={aiExpiresAt}
                loading={checkingAiStatus}
                enableManualMode={enableManualMode}
                disableManualMode={disableManualMode}
              />
              <Box component="button" onClick={(e) => setStatusMenuEl(e.currentTarget)}
                sx={{
                  display: 'inline-flex', alignItems: 'center', gap: 0.25, px: 1, py: 0.5, borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.1)', bgcolor: 'transparent', cursor: 'pointer', outline: 'none',
                  '&:hover': { borderColor: 'rgba(255,255,255,0.2)' },
                }}>
                <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>
                  {CONV_STATUS_LABEL[selectedConversation.status] || selectedConversation.status}
                </Typography>
                <KeyboardArrowDown sx={{ fontSize: 16, color: 'rgba(255,255,255,0.5)' }} />
              </Box>
              <IconButton size="small" onClick={(e) => handleContextMenu(e as any, selectedConversation.id)} sx={{ color: 'rgba(255,255,255,0.5)' }}>
                <MoreVert fontSize="small" />
              </IconButton>
            </Box>

            {/* Messages */}
            <Box sx={{ flex: 1, overflowY: 'auto', p: 3 }}>
              <MessagesList messages={messages} loading={loadingMessages} endRef={endRef} />
            </Box>

            {/* Input */}
            <MessageInput
              aiBlocked={aiBlocked}
              checkingAiStatus={checkingAiStatus}
              onSendMessage={handleSend}
              onEnableManualMode={handleEnableManual}
            />
          </>
        )}
      </Box>

      {/* Status dropdown menu */}
      <Menu anchorEl={statusMenuEl} open={Boolean(statusMenuEl)} onClose={() => setStatusMenuEl(null)}>
        {(['active', 'completed', 'success', 'abandoned'] as ConversationHeaderStatus[]).map((s) => (
          <MenuItem key={s} onClick={() => { if (selectedConversation) updateStatus(selectedConversation.id, s); setStatusMenuEl(null); }}>
            <ListItemText>{CONV_STATUS_LABEL[s]}</ListItemText>
          </MenuItem>
        ))}
      </Menu>

      {/* Context menu */}
      <Menu open={contextMenu !== null} onClose={() => setContextMenu(null)} anchorReference="anchorPosition"
        anchorPosition={contextMenu ? { top: contextMenu.y, left: contextMenu.x } : undefined}>
        <MenuItem onClick={() => { if (contextMenu) { markAsRead(contextMenu.id); setContextMenu(null); } }}>
          <ListItemIcon><DoneAll fontSize="small" /></ListItemIcon><ListItemText>Marcar como lida</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => { if (contextMenu) { markAsUnread(contextMenu.id); setContextMenu(null); } }}>
          <ListItemIcon><MarkChatUnread fontSize="small" /></ListItemIcon><ListItemText>Marcar como não lida</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => {
          if (contextMenu) {
            const conv = conversations.find((c) => c.id === contextMenu.id);
            const initial = conv?.clientName || conv?.clientPhone || '';
            setRenameTarget({ id: contextMenu.id, name: initial });
            setRenameValue(initial);
            setContextMenu(null);
          }
        }}>
          <ListItemIcon><Edit fontSize="small" /></ListItemIcon><ListItemText>Renomear</ListItemText>
        </MenuItem>
      </Menu>

      {/* P2: Rename dialog (replaces native prompt()) */}
      <Dialog
        open={renameTarget !== null}
        onClose={() => setRenameTarget(null)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { bgcolor: '#111827', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px' } }}
      >
        <DialogTitle sx={{ color: '#f1f5f9', fontSize: '1rem', fontWeight: 700 }}>Renomear contato</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            variant="outlined"
            size="small"
            placeholder="Novo nome do contato"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleRenameConfirm(); }}
            sx={{
              mt: 1,
              '& .MuiOutlinedInput-root': {
                color: '#e2e8f0',
                '& fieldset': { borderColor: 'rgba(255,255,255,0.15)' },
                '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                '&.Mui-focused fieldset': { borderColor: '#dc2626' },
              },
              '& input::placeholder': { color: 'rgba(255,255,255,0.35)', opacity: 1 },
            }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setRenameTarget(null)} sx={{ color: 'rgba(255,255,255,0.6)', textTransform: 'none' }}>
            Cancelar
          </Button>
          <Button
            onClick={handleRenameConfirm}
            disabled={!renameValue.trim()}
            variant="contained"
            sx={{
              bgcolor: '#dc2626', color: '#fff', textTransform: 'none', fontWeight: 600, boxShadow: 'none',
              '&:hover': { bgcolor: '#b91c1c' },
              '&.Mui-disabled': { bgcolor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.3)' },
            }}
          >
            Salvar
          </Button>
        </DialogActions>
      </Dialog>

      {/* P1-6: action feedback toast */}
      <Snackbar
        open={toast !== null}
        autoHideDuration={4000}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {toast ? (
          <Alert
            onClose={() => setToast(null)}
            severity={toast.severity}
            variant="filled"
            sx={{ width: '100%' }}
          >
            {toast.msg}
          </Alert>
        ) : undefined}
      </Snackbar>
    </Box>
  );
}
