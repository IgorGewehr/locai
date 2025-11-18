'use client';

import React from 'react';
import { Box, IconButton, Tooltip } from '@mui/material';
import { AccountBalanceWallet } from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import WalletBalance from './WalletBalance';

interface WalletHeaderProps {
  clientId?: string;
}

/**
 * WalletHeader - Compact wallet balance display for dashboard header
 * Shows balance and provides quick access to full wallet page
 */
export default function WalletHeader({ clientId }: WalletHeaderProps) {
  const router = useRouter();

  if (!clientId) {
    return (
      <Tooltip title="Acessar Carteira">
        <IconButton onClick={() => router.push('/dashboard/wallet')} sx={{ color: 'inherit' }}>
          <AccountBalanceWallet />
        </IconButton>
      </Tooltip>
    );
  }

  return (
    <Box
      onClick={() => router.push('/dashboard/wallet')}
      sx={{
        cursor: 'pointer',
        transition: 'transform 0.2s',
        '&:hover': {
          transform: 'scale(1.02)',
        },
      }}
    >
      <WalletBalance clientId={clientId} compact />
    </Box>
  );
}
