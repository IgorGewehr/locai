'use client';

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Box, Typography, InputBase, IconButton, CircularProgress, Avatar } from '@mui/material';
import { AutoAwesome, Send, Refresh, ErrorOutline, ArrowBack } from '@mui/icons-material';
import { useAssistant, type AssistantAlertItem, type AssistantFeedItem } from '@/lib/hooks/useAssistant';
import ClosingAlertCard from '@/components/organisms/conversations/ClosingAlertCard';

interface AssistantChatProps {
  /** Active so the hook only polls when the assistant thread is open. */
  active: boolean;
  /** Same deep-link already used by the page (openConversation → ?phone=...). */
  onOpenConversation: (phone: string) => void;
  /** Bubble unread count up so the pinned entry badge stays in sync. */
  onUnreadChange?: (unread: number) => void;
  /** Mobile back-to-list (xs only). */
  onBack?: () => void;
}

// ── Chat bubble for free conversation with the AI ───────────────────
function MsgBubble({ role, text }: { role: 'operator' | 'assistant'; text: string }) {
  const isOperator = role === 'operator';
  return (
    <Box sx={{ display: 'flex', justifyContent: isOperator ? 'flex-end' : 'flex-start' }}>
      <Box
        sx={{
          maxWidth: '78%',
          px: 1.75,
          py: 1.125,
          borderRadius: isOperator ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
          bgcolor: isOperator ? '#4f46e5' : 'rgba(255,255,255,0.05)',
          border: isOperator ? 'none' : '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <Typography
          sx={{
            fontSize: '0.875rem',
            lineHeight: 1.45,
            color: isOperator ? '#fff' : '#e2e8f0',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {text}
        </Typography>
      </Box>
    </Box>
  );
}

export default function AssistantChat({ active, onOpenConversation, onUnreadChange, onBack }: AssistantChatProps) {
  const { items, unread, loading, error, sending, refresh, sendMessage, ack } = useAssistant({ enabled: active });

  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  // Keep the pinned-entry badge in sync.
  useEffect(() => {
    onUnreadChange?.(unread);
  }, [unread, onUnreadChange]);

  // Auto-scroll to the newest item when the feed grows.
  useEffect(() => {
    if (items.length > 0) endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [items.length]);

  const handleOpen = useCallback(
    async (alert: AssistantAlertItem) => {
      // Ack first (mark acknowledged), then reuse the existing deep-link.
      try {
        await ack(alert.id);
      } catch {
        // Non-blocking: still open the conversation even if ack fails.
      }
      onOpenConversation(alert.phone);
    },
    [ack, onOpenConversation],
  );

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput('');
    try {
      await sendMessage(text);
    } catch {
      setInput(text); // restore on failure
    } finally {
      inputRef.current?.focus();
    }
  }, [input, sending, sendMessage]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  const feed = useMemo(() => items as AssistantFeedItem[], [items]);

  return (
    <>
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          px: 2,
          py: 1.5,
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          bgcolor: '#0d1220',
        }}
      >
        {onBack && (
          <IconButton
            onClick={onBack}
            size="small"
            sx={{ display: { xs: 'inline-flex', md: 'none' }, color: 'rgba(255,255,255,0.6)' }}
          >
            <ArrowBack fontSize="small" />
          </IconButton>
        )}
        <Avatar
          sx={{
            width: 40,
            height: 40,
            bgcolor: 'rgba(99,102,241,0.2)',
            color: '#c7d2fe',
          }}
        >
          <AutoAwesome sx={{ fontSize: 22 }} />
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontSize: '0.9375rem', fontWeight: 700, color: '#f1f5f9' }}>Assistente Sofia</Typography>
          <Typography sx={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)' }}>
            Chamados pra fechar e consultoria interna
          </Typography>
        </Box>
        <IconButton onClick={refresh} disabled={loading} size="small" sx={{ color: 'rgba(255,255,255,0.5)' }}>
          <Refresh fontSize="small" />
        </IconButton>
      </Box>

      {/* Feed */}
      <Box sx={{ flex: 1, overflowY: 'auto', p: 3 }}>
        {loading && feed.length === 0 ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress size={24} sx={{ color: 'rgba(255,255,255,0.3)' }} />
          </Box>
        ) : error && feed.length === 0 ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5, py: 6 }}>
            <ErrorOutline sx={{ fontSize: 32, color: 'rgba(248,113,113,0.7)' }} />
            <Typography sx={{ color: 'rgba(248,113,113,0.9)', fontSize: '0.8125rem', fontWeight: 600 }}>{error}</Typography>
            <Box
              component="button"
              onClick={refresh}
              sx={{
                px: 1.5,
                py: 0.625,
                borderRadius: '8px',
                cursor: 'pointer',
                outline: 'none',
                border: '1px solid rgba(99,102,241,0.4)',
                bgcolor: 'rgba(99,102,241,0.12)',
                color: '#c7d2fe',
                fontSize: '0.75rem',
                fontWeight: 600,
              }}
            >
              Tentar novamente
            </Box>
          </Box>
        ) : feed.length === 0 ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, py: 8, textAlign: 'center' }}>
            <AutoAwesome sx={{ fontSize: 48, color: 'rgba(99,102,241,0.3)' }} />
            <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9375rem', fontWeight: 500 }}>
              Nenhum chamado no momento
            </Typography>
            <Typography sx={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.8125rem', maxWidth: 320 }}>
              Quando a Sofia sinalizar um cliente pronto pra fechar, ele aparece aqui. Use o campo abaixo pra consultar a IA.
            </Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {feed.map((item) =>
              item.kind === 'alert' ? (
                <ClosingAlertCard key={item.id} alert={item} onOpen={handleOpen} />
              ) : (
                <MsgBubble key={item.id} role={item.role} text={item.text} />
              ),
            )}
            {sending && (
              <Box sx={{ display: 'flex', justifyContent: 'flex-start' }}>
                <Box
                  sx={{
                    px: 1.75,
                    py: 1.125,
                    borderRadius: '14px 14px 14px 4px',
                    bgcolor: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  <CircularProgress size={14} sx={{ color: 'rgba(199,210,254,0.8)' }} />
                </Box>
              </Box>
            )}
            <div ref={endRef} />
          </Box>
        )}
      </Box>

      {/* Input — free chat with the consulting AI */}
      <Box sx={{ p: 2, borderTop: '1px solid rgba(255,255,255,0.08)', bgcolor: '#0d1220' }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'flex-end',
            gap: 1,
            p: 0.5,
            pl: 2,
            borderRadius: '14px',
            border: '1px solid rgba(255,255,255,0.1)',
            bgcolor: 'rgba(255,255,255,0.04)',
            transition: 'border-color 0.15s ease',
            '&:focus-within': { borderColor: 'rgba(99,102,241,0.6)' },
          }}
        >
          <InputBase
            inputRef={inputRef}
            fullWidth
            multiline
            maxRows={5}
            placeholder="Pergunte à Sofia ou peça uma análise..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={sending}
            sx={{
              flex: 1,
              fontSize: '0.875rem',
              color: '#e2e8f0',
              py: 1,
              '& textarea::placeholder': { color: 'rgba(255,255,255,0.35)', opacity: 1 },
            }}
          />
          <IconButton
            onClick={handleSend}
            disabled={!input.trim() || sending}
            sx={{
              width: 40,
              height: 40,
              flexShrink: 0,
              bgcolor: '#4f46e5',
              color: '#fff',
              transition: 'all 0.15s ease',
              '&:hover': { bgcolor: '#4338ca' },
              '&.Mui-disabled': { bgcolor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.25)' },
            }}
          >
            {sending ? <CircularProgress size={18} sx={{ color: '#fff' }} /> : <Send sx={{ fontSize: 18 }} />}
          </IconButton>
        </Box>
      </Box>
    </>
  );
}
