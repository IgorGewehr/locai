'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Popover,
  ToggleButtonGroup,
  ToggleButton,
  Button,
  Tooltip,
} from '@mui/material';
import {
  SmartToy as AIIcon,
  PersonOutline as ManualIcon,
  AccessTime as ClockIcon,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { useTenant } from '@/contexts/TenantContext';
import { logger } from '@/lib/utils/logger';

interface AIControlButtonProps {
  phone: string;
  conversationName?: string;
}

const DURATIONS = [
  { value: 1, label: '1h' },
  { value: 2, label: '2h' },
  { value: 4, label: '4h' },
  { value: 24, label: '24h' },
];

export default function AIControlButton({ phone, conversationName }: AIControlButtonProps) {
  const { tenantId } = useTenant();
  const [blocked, setBlocked] = useState(false);
  const [blockExpiry, setBlockExpiry] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedDuration, setSelectedDuration] = useState(1);

  useEffect(() => {
    if (!tenantId || !phone) { setLoading(false); return; }

    let mounted = true;
    const check = async () => {
      try {
        const res = await fetch(`/api/ai/block-conversation?phone=${encodeURIComponent(phone)}`);
        const data = await res.json();
        if (mounted && data.success) {
          setBlocked(data.data.blocked ?? false);
          setBlockExpiry(data.data.expiresAt ?? null);
        }
      } catch { /* silent */ }
      finally { if (mounted) setLoading(false); }
    };

    check();
    const t = setInterval(check, 120_000);
    return () => { mounted = false; clearInterval(t); };
  }, [tenantId, phone]);

  const toggle = async (block: boolean, duration?: number) => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/ai/block-conversation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, blocked: block, duration: block ? duration : undefined }),
      });
      const data = await res.json();
      if (data.success) {
        setBlocked(block);
        setBlockExpiry(data.data?.expiresAt ?? null);
        setAnchorEl(null);
      }
    } catch (e) {
      logger.error('[AIControlButton] toggle error', { error: e });
    } finally {
      setSubmitting(false);
    }
  };

  const expiryLabel = blockExpiry
    ? new Date(blockExpiry).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : null;

  if (loading) {
    return <CircularProgress size={16} sx={{ color: 'rgba(255,255,255,0.3)' }} />;
  }

  return (
    <>
      <Tooltip title={blocked ? `IA pausada${expiryLabel ? ` até ${expiryLabel}` : ''} — clique para reativar` : 'IA ativa — clique para pausar'} arrow>
        <Box
          component="button"
          onClick={(e: React.MouseEvent<HTMLElement>) => {
            if (blocked) {
              toggle(false);
            } else {
              setAnchorEl(e.currentTarget);
            }
          }}
          disabled={submitting}
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.75,
            px: 1.25,
            py: 0.625,
            borderRadius: '20px',
            border: '1px solid',
            borderColor: blocked ? 'rgba(239,68,68,0.35)' : 'rgba(99,102,241,0.35)',
            bgcolor: blocked ? 'rgba(239,68,68,0.08)' : 'rgba(99,102,241,0.08)',
            cursor: submitting ? 'not-allowed' : 'pointer',
            transition: 'all 0.18s ease',
            opacity: submitting ? 0.6 : 1,
            outline: 'none',
            '&:hover': {
              borderColor: blocked ? 'rgba(239,68,68,0.6)' : 'rgba(99,102,241,0.6)',
              bgcolor: blocked ? 'rgba(239,68,68,0.13)' : 'rgba(99,102,241,0.13)',
            },
          }}
        >
          {submitting ? (
            <CircularProgress size={12} sx={{ color: blocked ? '#f87171' : '#818cf8' }} />
          ) : blocked ? (
            <ManualIcon sx={{ fontSize: 14, color: '#f87171' }} />
          ) : (
            <AIIcon sx={{ fontSize: 14, color: '#818cf8' }} />
          )}

          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={blocked ? 'manual' : 'ia'}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.14 }}
            >
              <Typography
                component="span"
                sx={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: blocked ? '#f87171' : '#818cf8',
                  lineHeight: 1,
                  whiteSpace: 'nowrap',
                }}
              >
                {blocked ? 'Manual' : 'IA ativa'}
              </Typography>
            </motion.span>
          </AnimatePresence>

          {blocked && expiryLabel && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
              <ClockIcon sx={{ fontSize: 11, color: 'rgba(248,113,113,0.7)' }} />
              <Typography sx={{ fontSize: '0.6875rem', color: 'rgba(248,113,113,0.8)', lineHeight: 1 }}>
                {expiryLabel}
              </Typography>
            </Box>
          )}
        </Box>
      </Tooltip>

      {/* Duration picker popover — only appears when activating manual mode */}
      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{
          sx: {
            mt: 1,
            bgcolor: '#111827',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '12px',
            boxShadow: '0 16px 40px rgba(0,0,0,0.5)',
            p: 2,
            minWidth: 220,
          },
        }}
      >
        <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600, color: 'rgba(255,255,255,0.8)', mb: 0.5 }}>
          Pausar IA para
        </Typography>
        <Typography sx={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', mb: 1.5 }}>
          {conversationName || phone}
        </Typography>

        <ToggleButtonGroup
          value={selectedDuration}
          exclusive
          onChange={(_, v) => v && setSelectedDuration(v)}
          fullWidth
          size="small"
          sx={{
            mb: 1.5,
            '& .MuiToggleButton-root': {
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.5)',
              fontSize: '0.8125rem',
              fontWeight: 500,
              py: 0.625,
              '&.Mui-selected': {
                bgcolor: 'rgba(99,102,241,0.2)',
                borderColor: 'rgba(99,102,241,0.5)',
                color: '#818cf8',
              },
            },
          }}
        >
          {DURATIONS.map(d => (
            <ToggleButton key={d.value} value={d.value}>{d.label}</ToggleButton>
          ))}
        </ToggleButtonGroup>

        <Button
          fullWidth
          variant="contained"
          onClick={() => toggle(true, selectedDuration)}
          disabled={submitting}
          startIcon={submitting ? <CircularProgress size={14} color="inherit" /> : <ManualIcon />}
          sx={{
            bgcolor: 'rgba(239,68,68,0.15)',
            color: '#f87171',
            border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: '8px',
            fontWeight: 600,
            fontSize: '0.8125rem',
            textTransform: 'none',
            '&:hover': { bgcolor: 'rgba(239,68,68,0.22)' },
            boxShadow: 'none',
          }}
        >
          {submitting ? 'Pausando...' : 'Ativar modo manual'}
        </Button>
      </Popover>
    </>
  );
}
