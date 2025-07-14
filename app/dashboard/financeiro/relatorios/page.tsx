'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Stack,
  Chip,
  IconButton,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  Download,
  Refresh,
  AttachMoney,
  Receipt,
  Assessment,
} from '@mui/icons-material';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Transaction } from '@/lib/types';
import { collection, query, orderBy, getDocs, where, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface FinancialMetrics {
  totalIncome: number;
  totalExpenses: number;
  netIncome: number;
  transactionCount: number;
  avgTransactionValue: number;
  monthlyGrowth: number;
}

interface ChartData {
  name: string;
  receita: number;
  despesa: number;
  saldo: number;
}

const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#6366f1', '#8b5cf6'];

export default function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('6m');
  const [metrics, setMetrics] = useState<FinancialMetrics>({
    totalIncome: 0,
    totalExpenses: 0,
    netIncome: 0,
    transactionCount: 0,
    avgTransactionValue: 0,
    monthlyGrowth: 0,
  });
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const loadReportsData = async () => {
    try {
      setLoading(true);

      // Calculate date range based on period
      const endDate = new Date();
      let startDate = new Date();
      
      switch (period) {
        case '3m':
          startDate = subMonths(endDate, 3);
          break;
        case '6m':
          startDate = subMonths(endDate, 6);
          break;
        case '1y':
          startDate = subMonths(endDate, 12);
          break;
        case '2y':
          startDate = subMonths(endDate, 24);
          break;
        default:
          startDate = subMonths(endDate, 6);
      }

      // Fetch transactions for the period
      const transactionsQuery = query(
        collection(db, 'transactions'),
        where('date', '>=', Timestamp.fromDate(startDate)),
        where('date', '<=', Timestamp.fromDate(endDate)),
        orderBy('date', 'desc')
      );

      const snapshot = await getDocs(transactionsQuery);
      const transactionData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date?.toDate() || new Date(),
      })) as Transaction[];

      setTransactions(transactionData);

      // Calculate metrics
      const completedTransactions = transactionData.filter(t => t.status === 'completed');
      const totalIncome = completedTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);
      
      const totalExpenses = completedTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);

      const netIncome = totalIncome - totalExpenses;
      const transactionCount = completedTransactions.length;
      const avgTransactionValue = transactionCount > 0 ? (totalIncome + totalExpenses) / transactionCount : 0;

      // Calculate monthly growth (comparing with previous period)
      const previousPeriodStart = new Date(startDate);
      const previousPeriodEnd = new Date(startDate);
      
      const periodDuration = endDate.getTime() - startDate.getTime();
      previousPeriodStart.setTime(startDate.getTime() - periodDuration);

      const previousQuery = query(
        collection(db, 'transactions'),
        where('date', '>=', Timestamp.fromDate(previousPeriodStart)),
        where('date', '<', Timestamp.fromDate(startDate)),
        orderBy('date', 'desc')
      );

      const previousSnapshot = await getDocs(previousQuery);
      const previousTransactions = previousSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date?.toDate() || new Date(),
      })) as Transaction[];

      const previousIncome = previousTransactions
        .filter(t => t.status === 'completed' && t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);

      const monthlyGrowth = previousIncome > 0 ? ((totalIncome - previousIncome) / previousIncome) * 100 : 0;

      setMetrics({
        totalIncome,
        totalExpenses,
        netIncome,
        transactionCount,
        avgTransactionValue,
        monthlyGrowth,
      });

      // Generate monthly chart data
      const monthlyData: ChartData[] = [];
      const months = Math.min(parseInt(period.replace(/[^0-9]/g, '')) * (period.includes('y') ? 12 : 1), 12);
      
      for (let i = months - 1; i >= 0; i--) {
        const monthStart = startOfMonth(subMonths(endDate, i));
        const monthEnd = endOfMonth(subMonths(endDate, i));
        
        const monthTransactions = completedTransactions.filter(t => 
          t.date >= monthStart && t.date <= monthEnd
        );
        
        const monthIncome = monthTransactions
          .filter(t => t.type === 'income')
          .reduce((sum, t) => sum + t.amount, 0);
        
        const monthExpenses = monthTransactions
          .filter(t => t.type === 'expense')
          .reduce((sum, t) => sum + t.amount, 0);

        monthlyData.push({
          name: format(monthStart, 'MMM/yy', { locale: ptBR }),
          receita: monthIncome,
          despesa: monthExpenses,
          saldo: monthIncome - monthExpenses,
        });
      }

      setChartData(monthlyData);

      // Generate category data for pie chart
      const categoryMap: Record<string, number> = {};
      completedTransactions.forEach(t => {
        if (t.type === 'income') {
          categoryMap[t.category] = (categoryMap[t.category] || 0) + t.amount;
        }
      });

      const categoryArray = Object.entries(categoryMap)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5); // Top 5 categories

      setCategoryData(categoryArray);

    } catch (error) {
      console.error('Error loading reports data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReportsData();
  }, [period]);

  const formatCurrency = (value: number) => {
    return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" component="h1" fontWeight={600}>
            Relatórios Financeiros
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Análises e insights financeiros detalhados
          </Typography>
        </Box>
        <Stack direction="row" spacing={2}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Período</InputLabel>
            <Select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              label="Período"
            >
              <MenuItem value="3m">3 meses</MenuItem>
              <MenuItem value="6m">6 meses</MenuItem>
              <MenuItem value="1y">1 ano</MenuItem>
              <MenuItem value="2y">2 anos</MenuItem>
            </Select>
          </FormControl>
          <IconButton onClick={loadReportsData} disabled={loading}>
            <Refresh />
          </IconButton>
          <Button variant="outlined" startIcon={<Download />}>
            Exportar
          </Button>
        </Stack>
      </Box>

      {/* Key Metrics */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Receita Total
                  </Typography>
                  <Typography variant="h5" fontWeight={600} color="success.main">
                    {formatCurrency(metrics.totalIncome)}
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
                    Despesas Totais
                  </Typography>
                  <Typography variant="h5" fontWeight={600} color="error.main">
                    {formatCurrency(metrics.totalExpenses)}
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
                    Lucro Líquido
                  </Typography>
                  <Typography 
                    variant="h5" 
                    fontWeight={600} 
                    color={metrics.netIncome >= 0 ? 'success.main' : 'error.main'}
                  >
                    {formatCurrency(metrics.netIncome)}
                  </Typography>
                </Box>
                <AttachMoney color={metrics.netIncome >= 0 ? 'success' : 'error'} />
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
                    Crescimento Mensal
                  </Typography>
                  <Typography 
                    variant="h5" 
                    fontWeight={600}
                    color={metrics.monthlyGrowth >= 0 ? 'success.main' : 'error.main'}
                  >
                    {metrics.monthlyGrowth >= 0 ? '+' : ''}{metrics.monthlyGrowth.toFixed(1)}%
                  </Typography>
                </Box>
                {metrics.monthlyGrowth >= 0 ? (
                  <TrendingUp color="success" />
                ) : (
                  <TrendingDown color="error" />
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts */}
      <Grid container spacing={3}>
        {/* Monthly Trends */}
        <Grid item xs={12} lg={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Tendências Mensais
              </Typography>
              <Box sx={{ height: 400 }}>
                {loading ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                    <Typography color="text.secondary">Carregando...</Typography>
                  </Box>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`} />
                      <Tooltip 
                        formatter={(value: number) => [formatCurrency(value), '']}
                        labelStyle={{ color: '#000' }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="receita" 
                        stackId="1" 
                        stroke="#10b981" 
                        fill="#10b981"
                        fillOpacity={0.6}
                        name="Receita"
                      />
                      <Area 
                        type="monotone" 
                        dataKey="despesa" 
                        stackId="2" 
                        stroke="#ef4444" 
                        fill="#ef4444"
                        fillOpacity={0.6}
                        name="Despesa"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Category Breakdown */}
        <Grid item xs={12} lg={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Receita por Categoria
              </Typography>
              <Box sx={{ height: 400 }}>
                {loading ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                    <Typography color="text.secondary">Carregando...</Typography>
                  </Box>
                ) : categoryData.length === 0 ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                    <Typography color="text.secondary">Sem dados para exibir</Typography>
                  </Box>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={120}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => [formatCurrency(value), 'Valor']} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Summary Stats */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Resumo do Período
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Receipt sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
                    <Typography variant="h4" fontWeight={600}>
                      {metrics.transactionCount}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Transações
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Assessment sx={{ fontSize: 40, color: 'secondary.main', mb: 1 }} />
                    <Typography variant="h4" fontWeight={600}>
                      {formatCurrency(metrics.avgTransactionValue)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Valor Médio
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <TrendingUp sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
                    <Typography variant="h4" fontWeight={600}>
                      {((metrics.totalIncome / (metrics.totalIncome + metrics.totalExpenses)) * 100).toFixed(1)}%
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      % Receita
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <AttachMoney sx={{ fontSize: 40, color: 'warning.main', mb: 1 }} />
                    <Typography variant="h4" fontWeight={600}>
                      {metrics.netIncome > 0 ? '+' : ''}{((metrics.netIncome / metrics.totalIncome) * 100).toFixed(1)}%
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Margem Líquida
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}