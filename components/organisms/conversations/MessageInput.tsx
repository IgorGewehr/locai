'use client';

import React, { useState, useCallback, memo, useRef } from 'react';
import { Box, InputBase, IconButton, CircularProgress, Typography } from '@mui/material';
import { Send, SmartToy, PanTool } from '@mui/icons-material';

interface MessageInputProps {
  aiBlocked: boolean;
  checkingAiStatus: boolean;
  onSendMessage: (message: string) => Promise<void>;
  onEnableManualMode: () => Promise<void>;
}

const MessageInput = memo(({ aiBlocked, checkingAiStatus, onSendMessage, onEnableManualMode }: MessageInputProps) => {
  const [messageInput, setMessageInput] = useState('');
  const [sending, setSending] = useState(false);
  const [pausing, setPausing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSend = useCallback(async () => {
    const message = messageInput.trim();
    if (!message || sending) return;
    setSending(true);
    setMessageInput('');
    try {
      await onSendMessage(message);
    } catch {
      setMessageInput(message);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }, [messageInput, sending, onSendMessage]);

  const handlePause = useCallback(async () => {
    if (pausing || checkingAiStatus) return;
    setPausing(true);
    try {
      await onEnableManualMode();
    } finally {
      setPausing(false);
    }
  }, [pausing, checkingAiStatus, onEnableManualMode]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  // ── AI active: typing is locked until the human takes over ──────
  if (!aiBlocked) {
    const busy = pausing || checkingAiStatus;
    return (
      <Box sx={{ p: 2, borderTop: '1px solid rgba(255,255,255,0.08)', bgcolor: '#0d1220' }}>
        <Box
          sx={{
            display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5,
            borderRadius: '12px', border: '1px solid rgba(16,185,129,0.25)',
            bgcolor: 'rgba(16,185,129,0.06)',
          }}
        >
          <SmartToy sx={{ fontSize: 20, color: '#10b981', flexShrink: 0 }} />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600, color: '#10b981', lineHeight: 1.2 }}>
              A IA está respondendo este cliente
            </Typography>
            <Typography sx={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', mt: 0.25 }}>
              Pause a IA para assumir e digitar manualmente.
            </Typography>
          </Box>
          <Box
            component="button"
            onClick={handlePause}
            disabled={busy}
            sx={{
              display: 'inline-flex', alignItems: 'center', gap: 0.75,
              px: 1.75, py: 1, borderRadius: '10px', flexShrink: 0,
              border: '1px solid rgba(239,68,68,0.4)',
              bgcolor: 'rgba(239,68,68,0.12)',
              color: '#f87171', cursor: busy ? 'default' : 'pointer',
              fontWeight: 600, fontSize: '0.8125rem', outline: 'none',
              transition: 'all 0.15s ease',
              opacity: busy ? 0.6 : 1,
              '&:hover': busy ? {} : { bgcolor: 'rgba(239,68,68,0.2)', borderColor: 'rgba(239,68,68,0.6)' },
            }}
          >
            {busy ? <CircularProgress size={16} sx={{ color: '#f87171' }} /> : <PanTool sx={{ fontSize: 16 }} />}
            Assumir conversa
          </Box>
        </Box>
      </Box>
    );
  }

  // ── Manual mode: input enabled ──────────────────────────────────
  return (
    <Box sx={{ p: 2, borderTop: '1px solid rgba(255,255,255,0.08)', bgcolor: '#0d1220' }}>
      <Box
        sx={{
          display: 'flex', alignItems: 'flex-end', gap: 1,
          p: 0.5, pl: 2, borderRadius: '14px',
          border: '1px solid rgba(255,255,255,0.1)',
          bgcolor: 'rgba(255,255,255,0.04)',
          transition: 'border-color 0.15s ease',
          '&:focus-within': { borderColor: 'rgba(220,38,38,0.5)' },
        }}
      >
        <InputBase
          inputRef={inputRef}
          fullWidth
          multiline
          maxRows={5}
          autoFocus
          placeholder="Digite sua mensagem..."
          value={messageInput}
          onChange={(e) => setMessageInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={sending}
          sx={{
            flex: 1, fontSize: '0.875rem', color: '#e2e8f0', py: 1,
            '& textarea::placeholder': { color: 'rgba(255,255,255,0.35)', opacity: 1 },
          }}
        />
        <IconButton
          onClick={handleSend}
          disabled={!messageInput.trim() || sending}
          sx={{
            width: 40, height: 40, flexShrink: 0, bgcolor: '#dc2626', color: '#fff',
            transition: 'all 0.15s ease',
            '&:hover': { bgcolor: '#b91c1c' },
            '&.Mui-disabled': { bgcolor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.25)' },
          }}
        >
          {sending ? <CircularProgress size={18} sx={{ color: '#fff' }} /> : <Send sx={{ fontSize: 18 }} />}
        </IconButton>
      </Box>
      <Typography sx={{ fontSize: '0.6875rem', color: 'rgba(255,255,255,0.4)', mt: 0.75, ml: 0.5 }}>
        Modo manual ativo — a IA está pausada nesta conversa.
      </Typography>
    </Box>
  );
});

MessageInput.displayName = 'MessageInput';

export default MessageInput;
