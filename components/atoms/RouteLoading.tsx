'use client';

import { Box, keyframes } from '@mui/material';

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;
const breathe = keyframes`
  0%, 100% { transform: scale(1); opacity: 0.85; }
  50% { transform: scale(1.12); opacity: 1; }
`;

/**
 * Standardized in-content route loader (red, elegant). Used by route-segment
 * loading.tsx files so module/slug navigation shows a consistent transition
 * without a full-screen takeover.
 */
export default function RouteLoading() {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        minHeight: '60vh',
      }}
    >
      <Box sx={{ position: 'relative', width: 52, height: 52 }}>
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            border: '3px solid rgba(255,255,255,0.08)',
            borderTopColor: '#dc2626',
            borderRightColor: 'rgba(220,38,38,0.55)',
            animation: `${spin} 0.85s linear infinite`,
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            inset: '36%',
            borderRadius: '50%',
            background: '#dc2626',
            boxShadow: '0 0 14px rgba(220,38,38,0.6)',
            animation: `${breathe} 1.6s ease-in-out infinite`,
          }}
        />
      </Box>
    </Box>
  );
}
