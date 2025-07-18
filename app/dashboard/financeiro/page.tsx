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
    <Box sx={{ 
      background: 'linear-gradient(135deg, #f8faff 0%, #e3f2fd 100%)',
      minHeight: '100vh',
      borderRadius: 2,
      p: { xs: 4, md: 5 }
    }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: { xs: 4, md: 5 } }}>
        <Box>
          <Typography variant="h4" component="h1" fontWeight={600} sx={{ color: '#1565c0', fontSize: { xs: '1.75rem', md: '2rem', lg: '2.25rem' } }}>
            Financeiro
          </Typography>
          <Typography variant="subtitle1" sx={{ color: '#1e3a8a', fontWeight: 500, fontSize: { xs: '1rem', md: '1.125rem' } }}>
            Visão geral das finanças e transações
          </Typography>
        </Box>
        <IconButton onClick={loadData} disabled={loading}>
          <Refresh />
        </IconButton>
      </Box>

      {/* Navigation Cards */}
      <Grid container spacing={{ xs: 3, md: 4 }} sx={{ mb: { xs: 4, md: 5 } }}>
        <Grid item xs={12} md={4}>
          <Card
            sx={{
              cursor: 'pointer',
              transition: 'all 0.2s',
              background: 'linear-gradient(135deg, #ffffff 0%, #f8faff 100%)',
              border: '1px solid rgba(21, 101, 192, 0.1)',
              borderRadius: 3,
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
              '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)' }
            }}
            onClick={() => router.push('/dashboard/financeiro/transacoes')}
          >
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Receipt sx={{ fontSize: 40, color: '#1565c0' }} />
                <Box>
                  <Typography variant="h6" fontWeight={600} sx={{ color: '#1565c0' }}>
                    Transações
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#1e3a8a', fontWeight: 500 }}>
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
              background: 'linear-gradient(135deg, #ffffff 0%, #fff3e0 100%)',
              border: '1px solid rgba(255, 152, 0, 0.2)',
              borderRadius: 3,
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
              '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)' }
            }}
            onClick={() => router.push('/dashboard/financeiro/cobrancas')}
          >
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Payment sx={{ fontSize: 40, color: '#e65100' }} />
                <Box>
                  <Typography variant="h6" fontWeight={600} sx={{ color: '#e65100' }}>
                    Cobranças
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#bf360c', fontWeight: 500 }}>
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
              background: 'linear-gradient(135deg, #ffffff 0%, #e8f5e8 100%)',
              border: '1px solid rgba(76, 175, 80, 0.2)',
              borderRadius: 3,
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
              '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)' }
            }}
            onClick={() => router.push('/dashboard/financeiro/relatorios')}
          >
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Assessment sx={{ fontSize: 40, color: '#2e7d32' }} />
                <Box>
                  <Typography variant="h6" fontWeight={600} sx={{ color: '#2e7d32' }}>
                    Relatórios
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#1b5e20', fontWeight: 500 }}>
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
          <Card sx={{ 
            background: 'linear-gradient(135deg, #ffffff 0%, #f8faff 100%)',
            border: '1px solid rgba(21, 101, 192, 0.1)',
            borderRadius: 3,
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)'
          }}>
            <CardContent>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="subtitle2" sx={{ color: '#1e3a8a', fontWeight: 500 }}>
                    Saldo Total
                  </Typography>
                  <Typography variant="h5" fontWeight={600} color={overview.totalBalance >= 0 ? '#2e7d32' : '#d32f2f'}>
                    R$ {overview.totalBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </Typography>
                </Box>
                {overview.totalBalance >= 0 ? (
                  <TrendingUp sx={{ color: '#2e7d32' }} />
                ) : (
                  <TrendingDown sx={{ color: '#d32f2f' }} />
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            background: 'linear-gradient(135deg, #ffffff 0%, #e8f5e8 100%)',
            border: '1px solid rgba(76, 175, 80, 0.2)',
            borderRadius: 3,
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)'
          }}>
            <CardContent>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="subtitle2" sx={{ color: '#1b5e20', fontWeight: 500 }}>
                    Receita Mensal
                  </Typography>
                  <Typography variant="h5" fontWeight={600} sx={{ color: '#2e7d32' }}>
                    R$ {overview.monthlyIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </Typography>
                </Box>
                <TrendingUp sx={{ color: '#2e7d32' }} />
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            background: 'linear-gradient(135deg, #ffffff 0%, #ffebee 100%)',
            border: '1px solid rgba(244, 67, 54, 0.2)',
            borderRadius: 3,
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)'
          }}>
            <CardContent>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="subtitle2" sx={{ color: '#b71c1c', fontWeight: 500 }}>
                    Despesas Mensais
                  </Typography>
                  <Typography variant="h5" fontWeight={600} sx={{ color: '#d32f2f' }}>
                    R$ {overview.monthlyExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </Typography>
                </Box>
                <TrendingDown sx={{ color: '#d32f2f' }} />
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            background: 'linear-gradient(135deg, #ffffff 0%, #fff3e0 100%)',
            border: '1px solid rgba(255, 152, 0, 0.2)',
            borderRadius: 3,
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)'
          }}>
            <CardContent>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="subtitle2" sx={{ color: '#bf360c', fontWeight: 500 }}>
                    Pendentes
                  </Typography>
                  <Typography variant="h5" fontWeight={600} sx={{ color: '#e65100' }}>
                    {overview.pendingTransactions}
                  </Typography>
                </Box>
                <Receipt sx={{ color: '#e65100' }} />
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Transactions */}
        <Grid item xs={12}>
          <Card sx={{ 
            background: 'linear-gradient(135deg, #ffffff 0%, #f8faff 100%)',
            border: '1px solid rgba(21, 101, 192, 0.1)',
            borderRadius: 3,
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)'
          }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" fontWeight={600} sx={{ color: '#1565c0' }}>
                  Transações Recentes
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => router.push('/dashboard/financeiro/transacoes')}
                  sx={{ 
                    borderColor: '#1565c0',
                    color: '#1565c0',
                    '&:hover': {
                      borderColor: '#1565c0',
                      backgroundColor: 'rgba(21, 101, 192, 0.04)'
                    }
                  }}
                >
                  Ver Todas
                </Button>
              </Box>
              <Divider sx={{ mb: 2 }} />
              
              {loading ? (
                <Typography sx={{ color: '#1e3a8a', fontWeight: 500 }}>Carregando...</Typography>
              ) : overview.recentTransactions.length === 0 ? (
                <Typography sx={{ color: '#1e3a8a', fontWeight: 500 }}>Nenhuma transação encontrada</Typography>
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
                        border: '1px solid rgba(21, 101, 192, 0.1)',
                        borderRadius: 2,
                        background: 'rgba(248, 250, 255, 0.5)',
                        '&:hover': {
                          background: 'rgba(248, 250, 255, 0.8)',
                          transform: 'translateY(-1px)',
                          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
                        },
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <Box>
                        <Typography variant="subtitle2" sx={{ color: '#1565c0', fontWeight: 600 }}>
                          {transaction.description}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#1e3a8a', fontWeight: 500 }}>
                          {transaction.date.toLocaleDateString('pt-BR')} • {transaction.category}
                        </Typography>
                      </Box>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Typography
                          variant="subtitle1"
                          fontWeight={600}
                          color={transaction.type === 'income' ? '#2e7d32' : '#d32f2f'}
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