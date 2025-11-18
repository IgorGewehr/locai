'use client';

import React, { useEffect, useState } from 'react';
import { Box, Typography, IconButton, Tooltip, CircularProgress } from '@mui/material';
import { AccountBalanceWallet, Refresh } from '@mui/icons-material';
import { useTenant } from '@/contexts/TenantContext';

interface WalletBalanceProps {
  clientId?: string;
  compact?: boolean;
}

interface WalletData {
  balance: number;
  pendingBalance: number;
  totalEarned: number;
  totalWithdrawn: number;
}

export default function WalletBalance({ clientId, compact = false }: WalletBalanceProps) {
  const { tenantId } = useTenant();
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBalance = async () => {
    if (!tenantId || !clientId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/wallet/balance?clientId=${clientId}`);
      const result = await response.json();

      if (result.success) {
        setWallet(result.data);
      } else {
        setError(result.error || 'Erro ao carregar saldo');
      }
    } catch (err) {
      console.error('Error fetching wallet balance:', err);
      setError('Erro ao carregar saldo');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBalance();
  }, [tenantId, clientId]);

  if (!clientId) return null;

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <CircularProgress size={20} />
        <Typography variant="body2" color="text.secondary">
          Carregando...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography variant="body2" color="error">
          {error}
        </Typography>
        <IconButton size="small" onClick={fetchBalance}>
          <Refresh fontSize="small" />
        </IconButton>
      </Box>
    );
  }

  if (!wallet) return null;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  if (compact) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          px: 2,
          py: 1,
          borderRadius: 2,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
        }}
      >
        <AccountBalanceWallet fontSize="small" />
        <Box>
          <Typography variant="caption" sx={{ opacity: 0.9, display: 'block' }}>
            Saldo Disponível
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 600, lineHeight: 1 }}>
            {formatCurrency(wallet.balance)}
          </Typography>
        </Box>
        <Tooltip title="Atualizar saldo">
          <IconButton size="small" onClick={fetchBalance} sx={{ color: 'white', ml: 'auto' }}>
            <Refresh fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        p: 3,
        borderRadius: 3,
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        boxShadow: '0 8px 32px rgba(102, 126, 234, 0.25)',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AccountBalanceWallet />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Minha Carteira
          </Typography>
        </Box>
        <Tooltip title="Atualizar saldo">
          <IconButton size="small" onClick={fetchBalance} sx={{ color: 'white' }}>
            <Refresh />
          </IconButton>
        </Tooltip>
      </Box>

      <Box sx={{ mb: 3 }}>
        <Typography variant="body2" sx={{ opacity: 0.9, mb: 0.5 }}>
          Saldo Disponível
        </Typography>
        <Typography variant="h3" sx={{ fontWeight: 700 }}>
          {formatCurrency(wallet.balance)}
        </Typography>
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 2,
          pt: 2,
          borderTop: '1px solid rgba(255, 255, 255, 0.2)',
        }}
      >
        <Box>
          <Typography variant="caption" sx={{ opacity: 0.9, display: 'block' }}>
            Pendente
          </Typography>
          <Typography variant="body1" sx={{ fontWeight: 600 }}>
            {formatCurrency(wallet.pendingBalance)}
          </Typography>
        </Box>
        <Box>
          <Typography variant="caption" sx={{ opacity: 0.9, display: 'block' }}>
            Total Ganho
          </Typography>
          <Typography variant="body1" sx={{ fontWeight: 600 }}>
            {formatCurrency(wallet.totalEarned)}
          </Typography>
        </Box>
        <Box>
          <Typography variant="caption" sx={{ opacity: 0.9, display: 'block' }}>
            Total Sacado
          </Typography>
          <Typography variant="body1" sx={{ fontWeight: 600 }}>
            {formatCurrency(wallet.totalWithdrawn)}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
