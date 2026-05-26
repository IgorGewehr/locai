'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef, memo } from 'react';
import {
  Box, Typography, IconButton, InputBase, Avatar, Menu, MenuItem,
  ListItemIcon, ListItemText, CircularProgress, Divider, alpha,
} from '@mui/material';
import {
  Search, Refresh, MoreVert, WhatsApp, Chat,
  ArrowBack, KeyboardArrowDown, DoneAll, MarkChatUnread, Edit,
  PanTool,
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
  manual?: boolean;
  onSelect: (id: string) => void;
  onContextMenu: (e: React.MouseEvent, id: string) => void;
}
const ConversationRow = memo(({ conv, selected, triage, manual, onSelect, onContextMenu }: RowProps) => {
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
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0, flex: 1 }}>
            <Typography sx={{
              fontSize: '0.875rem', fontWeight: unread ? 700 : 500,
              color: unread ? '#f1f5f9' : 'rgba(255,255,255,0.82)',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {conv.clientName || conv.clientPhone}
            </Typography>
            {manual && (
              <Box sx={{
                display: 'inline-flex', alignItems: 'center', gap: 0.25,
                px: 0.625, py: 0.125, borderRadius: '5px', flexShrink: 0,
                bgcolor: 'rgba(107,114,128,0.15)', border: '0.5px solid rgba(107,114,128,0.3)',
              }}>
                <PanTool sx={{ fontSize: 9, color: '#9ca3af' }} />
                <Typography sx={{ fontSize: '0.5625rem', color: '#9ca3af', fontWeight: 600, lineHeight: 1 }}>
                  Manual
                </Typography>
              </Box>
            )}
          </Box>
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

  const { blocked: aiBlocked, loading: checkingAiStatus, enableManualMode } = useAIBlockStatus({
    phone: selectedConversation?.clientPhone, tenantId, getFirebaseToken,
  });

  const [searchText, setSearchText] = useState('');
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; id: string } | null>(null);
  const [statusMenuEl, setStatusMenuEl] = useState<null | HTMLElement>(null);
  const [leadMap, setLeadMap] = useState<Map<string, Lead>>(new Map());
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

  const handleSelect = useCallback(async (id: string) => {
    selectConversation(id);
    const conv = conversations.find((c) => c.id === id);
    if (conv && conv.isRead === false) await markAsRead(id);
  }, [selectConversation, conversations, markAsRead]);

  const handleContextMenu = useCallback((e: React.MouseEvent, id: string) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX - 2, y: e.clientY - 4, id });
  }, []);

  const handleSend = useCallback(async (message: string) => {
    if (!selectedConversation || !tenantId) return;
    const token = await getFirebaseToken();
    const res = await fetch('/api/whatsapp/send-manual', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ tenantId, message, phone: selectedConversation.clientPhone }),
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Falha ao enviar mensagem');
  }, [selectedConversation, tenantId, getFirebaseToken]);

  const handleEnableManual = useCallback(async () => {
    try { await enableManualMode(1, 'Modo manual ativado pelo usuário'); }
    catch (e) { logger.error('[Conversas] enableManualMode failed', e instanceof Error ? e : undefined); }
  }, [enableManualMode]);

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
        display: { xs: selectedConversation ? 'none' : 'flex', md: 'flex' }, flexDirection: 'column',
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
          {loading && conversations.length === 0 ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress size={24} sx={{ color: 'rgba(255,255,255,0.3)' }} /></Box>
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
                  manual={(conv as any).aiBlocked === true}
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
        flex: 1, minWidth: 0, display: { xs: selectedConversation ? 'flex' : 'none', md: 'flex' },
        flexDirection: 'column', bgcolor: '#0b0f1a',
      }}>
        {!selectedConversation ? (
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
              <AIControlButton phone={selectedConversation.clientPhone} conversationName={selectedConversation.clientName} />
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
            const name = prompt('Novo nome do contato:', conv?.clientName || conv?.clientPhone || '');
            if (name?.trim()) renameConversation(contextMenu.id, name.trim());
            setContextMenu(null);
          }
        }}>
          <ListItemIcon><Edit fontSize="small" /></ListItemIcon><ListItemText>Renomear</ListItemText>
        </MenuItem>
      </Menu>
    </Box>
  );
}
