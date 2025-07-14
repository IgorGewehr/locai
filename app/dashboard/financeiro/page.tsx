'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  Chip,
  Stack,
  IconButton,
  Divider,
} from '@mui/material';
import {
  Receipt,
  Payment,
  Assessment,
  Add,
  TrendingUp,
  TrendingDown,
  Refresh,
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { Transaction } from '@/lib/types';
import { collection, query, orderBy, limit, getDocs, where, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

interface FinancialOverview {
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  pendingTransactions: number;
  recentTransactions: Transaction[];
}

export default function FinancialPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<FinancialOverview>({
    totalBalance: 0,
    monthlyIncome: 0,
    monthlyExpenses: 0,
    pendingTransactions: 0,
    recentTransactions: [],
  });

  const loadData = async () => {
    try {
      setLoading(true);

      // Get current month range
      const now = new Date();
      const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      // Fetch all transactions
      const transactionsQuery = query(
        collection(db, 'transactions'),
        orderBy('date', 'desc')
      );
      const transactionsSnapshot = await getDocs(transactionsQuery);
      const allTransactions = transactionsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date?.toDate() || new Date(),
      })) as Transaction[];

      // Calculate monthly income and expenses
      const monthlyTransactions = allTransactions.filter(t => {
        const transDate = t.date;
        return transDate >= startOfCurrentMonth && transDate <= endOfCurrentMonth;
      });

      const monthlyIncome = monthlyTransactions
        .filter(t => t.type === 'income' && t.status === 'completed')
        .reduce((sum, t) => sum + t.amount, 0);

      const monthlyExpenses = monthlyTransactions
        .filter(t => t.type === 'expense' && t.status === 'completed')
        .reduce((sum, t) => sum + t.amount, 0);

      // Calculate total balance
      const totalBalance = allTransactions
        .filter(t => t.status === 'completed')
        .reduce((sum, t) => sum + (t.type === 'income' ? t.amount : -t.amount), 0);

      // Count pending transactions
      const pendingTransactions = allTransactions.filter(t => t.status === 'pending').length;

      // Get recent transactions (last 5)
      const recentTransactions = allTransactions.slice(0, 5);

      setOverview({
        totalBalance,
        monthlyIncome,
        monthlyExpenses,
        pendingTransactions,
        recentTransactions,
      });

    } catch (error) {
      console.error('Error loading financial data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" component="h1" fontWeight={600}>
            Financeiro
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Visão geral das finanças e transações
          </Typography>
        </Box>
        <IconButton onClick={loadData} disabled={loading}>
          <Refresh />
        </IconButton>
      </Box>

      {/* Navigation Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={4}>
          <Card
            sx={{
              cursor: 'pointer',
              transition: 'all 0.2s',
              '&:hover': { transform: 'translateY(-2px)', boxShadow: 3 }
            }}
            onClick={() => router.push('/dashboard/financeiro/transacoes')}
          >
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Receipt color="primary" sx={{ fontSize: 40 }} />
                <Box>
                  <Typography variant="h6" fontWeight={600}>
                    Transações
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Gerenciar receitas e despesas
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card
            sx={{
              cursor: 'pointer',
              transition: 'all 0.2s',
              '&:hover': { transform: 'translateY(-2px)', boxShadow: 3 }
            }}
            onClick={() => router.push('/dashboard/financeiro/cobrancas')}
          >
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Payment color="warning" sx={{ fontSize: 40 }} />
                <Box>
                  <Typography variant="h6" fontWeight={600}>
                    Cobranças
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Automatizar e acompanhar cobranças
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card
            sx={{
              cursor: 'pointer',
              transition: 'all 0.2s',
              '&:hover': { transform: 'translateY(-2px)', boxShadow: 3 }
            }}
            onClick={() => router.push('/dashboard/financeiro/relatorios')}
          >
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Assessment color="success" sx={{ fontSize: 40 }} />
                <Box>
                  <Typography variant="h6" fontWeight={600}>
                    Relatórios
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Análises e dashboards
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Financial Overview */}
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Saldo Total
                  </Typography>
                  <Typography variant="h5" fontWeight={600} color={overview.totalBalance >= 0 ? 'success.main' : 'error.main'}>
                    R$ {overview.totalBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </Typography>
                </Box>
                {overview.totalBalance >= 0 ? (
                  <TrendingUp color="success" />
                ) : (
                  <TrendingDown color="error" />
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Receita Mensal
                  </Typography>
                  <Typography variant="h5" fontWeight={600} color="success.main">
                    R$ {overview.monthlyIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </Typography>
                </Box>
                <TrendingUp color="success" />
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Despesas Mensais
                  </Typography>
                  <Typography variant="h5" fontWeight={600} color="error.main">
                    R$ {overview.monthlyExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </Typography>
                </Box>
                <TrendingDown color="error" />
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Pendentes
                  </Typography>
                  <Typography variant="h5" fontWeight={600} color="warning.main">
                    {overview.pendingTransactions}
                  </Typography>
                </Box>
                <Receipt color="warning" />
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Transactions */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" fontWeight={600}>
                  Transações Recentes
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => router.push('/dashboard/financeiro/transacoes')}
                >
                  Ver Todas
                </Button>
              </Box>
              <Divider sx={{ mb: 2 }} />
              
              {loading ? (
                <Typography color="text.secondary">Carregando...</Typography>
              ) : overview.recentTransactions.length === 0 ? (
                <Typography color="text.secondary">Nenhuma transação encontrada</Typography>
              ) : (
                <Stack spacing={2}>
                  {overview.recentTransactions.map((transaction) => (
                    <Box
                      key={transaction.id}
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        p: 2,
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 1,
                      }}
                    >
                      <Box>
                        <Typography variant="subtitle2">
                          {transaction.description}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {transaction.date.toLocaleDateString('pt-BR')} • {transaction.category}
                        </Typography>
                      </Box>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Typography
                          variant="subtitle1"
                          fontWeight={600}
                          color={transaction.type === 'income' ? 'success.main' : 'error.main'}
                        >
                          {transaction.type === 'income' ? '+' : '-'}R$ {transaction.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </Typography>
                        <Chip
                          label={transaction.status === 'completed' ? 'Concluída' : 'Pendente'}
                          size="small"
                          color={transaction.status === 'completed' ? 'success' : 'warning'}
                          variant="outlined"
                        />
                      </Stack>
                    </Box>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}