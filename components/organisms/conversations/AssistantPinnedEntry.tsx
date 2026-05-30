'use client';

import React, { memo } from 'react';
import { Box, Typography, Avatar } from '@mui/material';
import { AutoAwesome, PushPin } from '@mui/icons-material';

interface AssistantPinnedEntryProps {
  selected: boolean;
  unread: number;
  onSelect: () => void;
}

/**
 * Pinned "Assistente Sofia" entry — always the 1st item of the conversation
 * list, highlighted, regardless of filters. Selecting it shows <AssistantChat/>.
 */
const AssistantPinnedEntry = memo(({ selected, unread, onSelect }: AssistantPinnedEntryProps) => (
  <Box
    onClick={onSelect}
    sx={{
      display: 'flex',
      alignItems: 'center',
      gap: 1.25,
      px: 1.5,
      py: 1.375,
      cursor: 'pointer',
      position: 'relative',
      borderLeft: '3px solid',
      borderLeftColor: '#6366f1',
      bgcolor: selected ? 'rgba(99,102,241,0.22)' : 'rgba(99,102,241,0.1)',
      transition: 'background 0.12s ease',
      '&:hover': { bgcolor: selected ? 'rgba(99,102,241,0.26)' : 'rgba(99,102,241,0.16)' },
    }}
  >
    {/* Avatar with sparkle icon */}
    <Box sx={{ position: 'relative', flexShrink: 0 }}>
      <Avatar
        sx={{
          width: 42,
          height: 42,
          bgcolor: 'rgba(99,102,241,0.28)',
          color: '#c7d2fe',
        }}
      >
        <AutoAwesome sx={{ fontSize: 22 }} />
      </Avatar>
      <Box
        sx={{
          position: 'absolute',
          bottom: -2,
          right: -2,
          width: 18,
          height: 18,
          borderRadius: '50%',
          bgcolor: '#0b0f1a',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <PushPin sx={{ fontSize: 11, color: '#818cf8' }} />
      </Box>
    </Box>

    {/* Text */}
    <Box sx={{ flex: 1, minWidth: 0 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
        <Typography
          sx={{
            fontSize: '0.875rem',
            fontWeight: 700,
            color: '#f1f5f9',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          Assistente Sofia
        </Typography>
        {unread > 0 && (
          <Box
            sx={{
              minWidth: 18,
              height: 18,
              px: 0.5,
              borderRadius: '9px',
              bgcolor: '#6366f1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Typography sx={{ fontSize: '0.6875rem', fontWeight: 700, color: '#fff' }}>
              {unread > 99 ? '99+' : unread}
            </Typography>
          </Box>
        )}
      </Box>
      <Typography
        sx={{
          fontSize: '0.8125rem',
          color: 'rgba(199,210,254,0.75)',
          mt: 0.25,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        Chamados pra fechar e consultoria IA
      </Typography>
    </Box>
  </Box>
));

AssistantPinnedEntry.displayName = 'AssistantPinnedEntry';

export default AssistantPinnedEntry;
