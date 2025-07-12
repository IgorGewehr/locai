'use client';

import {
  Box,
  Typography,
  Avatar,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Stack,
  Tooltip,
  Paper,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  Home,
  Person,
  Schedule,
  CheckCircle,
  Cancel,
  MoreVert,
  Edit,
  Delete,
  Receipt,
  CalendarMonth,
} from '@mui/icons-material';
import { format, isToday, isYesterday, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useState } from 'react';
import { Transaction, Client } from '@/lib/types';
import { Property } from '@/lib/types/property';

interface TransactionTimelineProps {
  transactions: Transaction[];
  properties: Property[];
  clients: Client[];
  onEdit?: (transaction: Transaction) => void;
  onDelete?: (transactionId: string) => void;
  onConfirm?: (transactionId: string) => void;
  onCancel?: (transactionId: string) => void;
}

export default function TransactionTimeline({
  transactions,
  properties,
  clients,
  onEdit,
  onDelete,
  onConfirm,
  onCancel,
}: TransactionTimelineProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, transaction: Transaction) => {
    setAnchorEl(event.currentTarget);
    setSelectedTransaction(transaction);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedTransaction(null);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const getDateLabel = (date: Date) => {
    if (isToday(date)) return 'Hoje';
    if (isYesterday(date)) return 'Ontem';
    return format(date, "d 'de' MMMM", { locale: ptBR });
  };

  const getTimeAgo = (date: Date) => {
    return formatDistanceToNow(date, { addSuffix: true, locale: ptBR });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle sx={{ fontSize: 16, color: 'success.main' }} />;
      case 'pending':
        return <Schedule sx={{ fontSize: 16, color: 'warning.main' }} />;
      case 'cancelled':
        return <Cancel sx={{ fontSize: 16, color: 'error.main' }} />;
      default:
        return null;
    }
  };

  const getTransactionIcon = (transaction: Transaction) => {
    if (transaction.propertyId) return <Home />;
    if (transaction.clientId) return <Person />;
    if (transaction.type === 'income') return <TrendingUp />;
    return <TrendingDown />;
  };

  const getProperty = (propertyId?: string) => {
    if (!propertyId) return null;
    return properties.find(p => p.id === propertyId);
  };

  const getClient = (clientId?: string) => {
    if (!clientId) return null;
    return clients.find(c => c.id === clientId);
  };

  // Agrupar transações por data
  const groupedTransactions = transactions.reduce((groups, transaction) => {
    const date = format(transaction.date, 'yyyy-MM-dd');
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(transaction);
    return groups;
  }, {} as Record<string, Transaction[]>);

  return (
    <Stack spacing={3}>
      {Object.entries(groupedTransactions).map(([date, dayTransactions]) => (
        <Box key={date}>
          <Typography 
            variant="subtitle2" 
            color="text.secondary" 
            sx={{ mb: 2, fontWeight: 500 }}
          >
            {getDateLabel(new Date(date))}
          </Typography>

          <Stack spacing={2}>
            {dayTransactions.map((transaction) => {
              const property = getProperty(transaction.propertyId);
              const client = getClient(transaction.clientId);

              return (
                <Paper
                  key={transaction.id}
                  sx={{
                    p: 2,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    '&:hover': {
                      boxShadow: 2,
                      transform: 'translateY(-2px)',
                    },
                  }}
                  onClick={() => onEdit?.(transaction)}
                >
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                    <Avatar
                      sx={{
                        bgcolor: transaction.type === 'income' ? 'success.light' : 'error.light',
                        color: transaction.type === 'income' ? 'success.main' : 'error.main',
                        width: 40,
                        height: 40,
                      }}
                    >
                      {getTransactionIcon(transaction)}
                    </Avatar>

                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Box>
                          <Typography variant="body1" fontWeight={500}>
                            {transaction.description}
                          </Typography>
                          <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                            {property && (
                              <Chip
                                size="small"
                                icon={<Home sx={{ fontSize: 14 }} />}
                                label={property.title}
                                sx={{ height: 24 }}
                              />
                            )}
                            {client && (
                              <Chip
                                size="small"
                                icon={<Person sx={{ fontSize: 14 }} />}
                                label={client.name}
                                sx={{ height: 24 }}
                              />
                            )}
                            <Chip
                              size="small"
                              label={transaction.category}
                              sx={{ height: 24 }}
                            />
                          </Stack>
                        </Box>

                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box sx={{ textAlign: 'right' }}>
                            <Typography 
                              variant="h6" 
                              color={transaction.type === 'income' ? 'success.main' : 'error.main'}
                              fontWeight={600}
                            >
                              {transaction.type === 'expense' && '-'}
                              {formatCurrency(transaction.amount)}
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              {getStatusIcon(transaction.status)}
                              <Typography variant="caption" color="text.secondary">
                                {getTimeAgo(transaction.date)}
                              </Typography>
                            </Box>
                          </Box>

                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMenuOpen(e, transaction);
                            }}
                          >
                            <MoreVert fontSize="small" />
                          </IconButton>
                        </Box>
                      </Box>

                      {transaction.notes && (
                        <Typography 
                          variant="body2" 
                          color="text.secondary" 
                          sx={{ mt: 1, fontStyle: 'italic' }}
                        >
                          "{transaction.notes}"
                        </Typography>
                      )}

                      {transaction.tags && transaction.tags.length > 0 && (
                        <Stack direction="row" spacing={0.5} sx={{ mt: 1 }}>
                          {transaction.tags.map((tag) => (
                            <Chip
                              key={tag}
                              label={tag}
                              size="small"
                              variant="outlined"
                              sx={{ height: 20, fontSize: '0.7rem' }}
                            />
                          ))}
                        </Stack>
                      )}
                    </Box>
                  </Box>
                </Paper>
              );
            })}
          </Stack>
        </Box>
      ))}

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        onClick={handleMenuClose}
      >
        {selectedTransaction?.status === 'pending' && (
          <>
            <MenuItem 
              onClick={() => {
                onConfirm?.(selectedTransaction.id);
              }}
            >
              <CheckCircle sx={{ mr: 1, fontSize: 20, color: 'success.main' }} />
              Confirmar
            </MenuItem>
            <MenuItem 
              onClick={() => {
                onCancel?.(selectedTransaction.id);
              }}
            >
              <Cancel sx={{ mr: 1, fontSize: 20, color: 'error.main' }} />
              Cancelar
            </MenuItem>
          </>
        )}
        <MenuItem 
          onClick={() => {
            onEdit?.(selectedTransaction!);
          }}
        >
          <Edit sx={{ mr: 1, fontSize: 20 }} />
          Editar
        </MenuItem>
        <MenuItem 
          onClick={() => {
            onDelete?.(selectedTransaction!.id);
          }}
        >
          <Delete sx={{ mr: 1, fontSize: 20 }} />
          Excluir
        </MenuItem>
      </Menu>
    </Stack>
  );
}