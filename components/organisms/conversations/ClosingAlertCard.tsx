'use client';

import React, { memo, useState, useCallback } from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';
import { Person, Groups, EventAvailable, Home, Whatshot, ArrowForward } from '@mui/icons-material';
import type { AssistantAlertItem } from '@/lib/hooks/useAssistant';

interface ClosingAlertCardProps {
  alert: AssistantAlertItem;
  onOpen: (alert: AssistantAlertItem) => Promise<void>;
}

function urgencyLabel(ageMinutes: number): string {
  if (ageMinutes < 60) return `quente há ${Math.max(0, Math.round(ageMinutes))} min`;
  const hours = Math.floor(ageMinutes / 60);
  return `há ${hours}h`;
}

function fmtDate(iso?: string): string | null {
  if (!iso) return null;
  // iso is YYYY-MM-DD; render as DD/MM without timezone drift.
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (m) return `${m[3]}/${m[2]}`;
  return iso;
}

const Detail = memo(({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0 }}>
    <Box sx={{ display: 'inline-flex', color: 'rgba(165,180,252,0.85)', flexShrink: 0 }}>{icon}</Box>
    <Typography
      sx={{
        fontSize: '0.8125rem',
        color: 'rgba(226,232,240,0.9)',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}
    >
      {children}
    </Typography>
  </Box>
));
Detail.displayName = 'AlertDetail';

const ClosingAlertCard = memo(({ alert, onOpen }: ClosingAlertCardProps) => {
  const [opening, setOpening] = useState(false);
  const acknowledged = alert.status === 'acknowledged' || alert.status === 'resolved';

  const handleOpen = useCallback(async () => {
    if (opening) return;
    setOpening(true);
    try {
      await onOpen(alert);
    } finally {
      setOpening(false);
    }
  }, [opening, onOpen, alert]);

  const checkIn = fmtDate(alert.checkIn);
  const checkOut = fmtDate(alert.checkOut);
  const stay = checkIn && checkOut ? `${checkIn} → ${checkOut}` : checkIn || checkOut || null;

  return (
    <Box
      sx={{
        alignSelf: 'stretch',
        borderRadius: '14px',
        border: '1px solid rgba(99,102,241,0.4)',
        bgcolor: 'rgba(67,56,202,0.12)',
        boxShadow: '0 0 0 1px rgba(99,102,241,0.08), 0 8px 24px -16px rgba(99,102,241,0.6)',
        overflow: 'hidden',
        opacity: acknowledged ? 0.7 : 1,
        transition: 'opacity 0.15s ease',
      }}
    >
      {/* Header: title + urgency */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1,
          px: 2,
          py: 1.25,
          borderBottom: '1px solid rgba(99,102,241,0.2)',
          bgcolor: 'rgba(99,102,241,0.1)',
        }}
      >
        <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: 0.4, color: '#c7d2fe', textTransform: 'uppercase' }}>
          Pronto pra fechar
        </Typography>
        <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
          <Whatshot sx={{ fontSize: 15, color: '#fca5a5' }} />
          <Typography sx={{ fontSize: '0.6875rem', fontWeight: 600, color: '#fca5a5' }}>
            {urgencyLabel(alert.ageMinutes)}
          </Typography>
        </Box>
      </Box>

      {/* Body */}
      <Box sx={{ px: 2, py: 1.5, display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Detail icon={<Person sx={{ fontSize: 16 }} />}>
          <Box component="span" sx={{ fontWeight: 600, color: '#f1f5f9' }}>
            {alert.clientName || alert.phone}
          </Box>
        </Detail>

        {typeof alert.guests === 'number' && (
          <Detail icon={<Groups sx={{ fontSize: 16 }} />}>
            {alert.guests} {alert.guests === 1 ? 'hóspede' : 'hóspedes'}
          </Detail>
        )}

        {stay && <Detail icon={<EventAvailable sx={{ fontSize: 16 }} />}>{stay}</Detail>}

        {alert.propertyTitle && <Detail icon={<Home sx={{ fontSize: 16 }} />}>{alert.propertyTitle}</Detail>}

        {alert.summary && (
          <Typography
            sx={{
              fontSize: '0.8125rem',
              color: 'rgba(203,213,225,0.85)',
              lineHeight: 1.4,
              mt: 0.25,
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {alert.summary}
          </Typography>
        )}
      </Box>

      {/* Action */}
      <Box sx={{ px: 2, pb: 1.5 }}>
        <Box
          component="button"
          onClick={handleOpen}
          disabled={opening}
          sx={{
            width: '100%',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 0.75,
            px: 2,
            py: 1,
            borderRadius: '10px',
            border: 'none',
            outline: 'none',
            cursor: opening ? 'default' : 'pointer',
            bgcolor: '#4f46e5',
            color: '#fff',
            fontWeight: 600,
            fontSize: '0.8125rem',
            transition: 'background 0.15s ease',
            opacity: opening ? 0.7 : 1,
            '&:hover': opening ? {} : { bgcolor: '#4338ca' },
          }}
        >
          {opening ? (
            <CircularProgress size={16} sx={{ color: '#fff' }} />
          ) : (
            <>
              {acknowledged ? 'Reabrir conversa' : 'Abrir conversa'}
              <ArrowForward sx={{ fontSize: 16 }} />
            </>
          )}
        </Box>
      </Box>
    </Box>
  );
});

ClosingAlertCard.displayName = 'ClosingAlertCard';

export default ClosingAlertCard;
