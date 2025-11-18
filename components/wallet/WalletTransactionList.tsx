'use client';

import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  CircularProgress,
  Alert,
  Paper,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  AccountBalanceWallet,
  Refresh,
  AttachMoney,
  CardGiftcard,
  Build,
} from '@mui/icons-material';
import {
  WalletTransaction,
  WalletTransactionType,
  WalletTransactionStatus,
  WALLET_TRANSACTION_TYPE_LABELS,
  WALLET_TRANSACTION_STATUS_LABELS,
  WALLET_TRANSACTION_STATUS_COLORS,
} from '@/lib/types/wallet';

interface WalletTransactionListProps {
  clientId: string;
  limit?: number;
}

export default function WalletTransactionList({ clientId, limit = 50 }: WalletTransactionListProps) {
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/wallet/transactions?clientId=${clientId}&limit=${limit}`);
      const result = await response.json();

      if (result.success) {
        setTransactions(result.data);
      } else {
        setError(result.error || 'Erro ao carregar transações');
      }
    } catch (err) {
      console.error('Error fetching transactions:', err);
      setError('Erro ao carregar transações');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [clientId, limit]);

  const getTransactionIcon = (type: WalletTransactionType) => {
    switch (type) {
      case WalletTransactionType.CREDIT:
        return <TrendingUp sx={{ color: '#66BB6A' }} />;
      case WalletTransactionType.DEBIT:
        return <TrendingDown sx={{ color: '#EF5350' }} />;
      case WalletTransactionType.WITHDRAWAL:
        return <AccountBalanceWallet sx={{ color: '#42A5F5' }} />;
      case WalletTransactionType.REFUND:
        return <Refresh sx={{ color: '#AB47BC' }} />;
      case WalletTransactionType.PAYMENT:
        return <AttachMoney sx={{ color: '#FFA726' }} />;
      case WalletTransactionType.BONUS:
        return <CardGiftcard sx={{ color: '#66BB6A' }} />;
      case WalletTransactionType.ADJUSTMENT:
        return <Build sx={{ color: '#78909C' }} />;
      default:
        return <AccountBalanceWallet />;
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (date: any) => {
    if (!date) return '';
    const d = date.toDate ? date.toDate() : new Date(date);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {error}
      </Alert>
    );
  }

  if (transactions.length === 0) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="body1" color="text.secondary">
          Nenhuma transação encontrada
        </Typography>
      </Box>
    );
  }

  return (
    <Paper sx={{ borderRadius: 2 }}>
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Histórico de Transações
        </Typography>
      </Box>
      <List>
        {transactions.map((transaction) => (
          <ListItem
            key={transaction.id}
            sx={{
              borderBottom: 1,
              borderColor: 'divider',
              '&:last-child': { borderBottom: 0 },
            }}
          >
            <ListItemIcon>{getTransactionIcon(transaction.type)}</ListItemIcon>
            <ListItemText
              primary={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    {transaction.description}
                  </Typography>
                  <Chip
                    label={WALLET_TRANSACTION_STATUS_LABELS[transaction.status]}
                    size="small"
                    sx={{
                      backgroundColor: WALLET_TRANSACTION_STATUS_COLORS[transaction.status],
                      color: 'white',
                      fontSize: '0.75rem',
                    }}
                  />
                </Box>
              }
              secondary={
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mt: 0.5 }}>
                  <Typography variant="caption" color="text.secondary">
                    {WALLET_TRANSACTION_TYPE_LABELS[transaction.type]} • {formatDate(transaction.createdAt)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Saldo: {formatCurrency(transaction.balanceBefore)} → {formatCurrency(transaction.balanceAfter)}
                  </Typography>
                </Box>
              }
            />
            <Box sx={{ textAlign: 'right', minWidth: 100 }}>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 600,
                  color: transaction.type === WalletTransactionType.CREDIT ||
                         transaction.type === WalletTransactionType.BONUS ||
                         transaction.type === WalletTransactionType.REFUND
                    ? '#66BB6A'
                    : '#EF5350',
                }}
              >
                {(transaction.type === WalletTransactionType.CREDIT ||
                  transaction.type === WalletTransactionType.BONUS ||
                  transaction.type === WalletTransactionType.REFUND) && '+'}
                {(transaction.type === WalletTransactionType.DEBIT ||
                  transaction.type === WalletTransactionType.WITHDRAWAL ||
                  transaction.type === WalletTransactionType.PAYMENT) && '-'}
                {formatCurrency(transaction.amount)}
              </Typography>
            </Box>
          </ListItem>
        ))}
      </List>
    </Paper>
  );
}
