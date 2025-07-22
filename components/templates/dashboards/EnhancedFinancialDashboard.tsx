'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  IconButton,
  Chip,
  Avatar,
  Stack,
  LinearProgress,
  Skeleton,
  useTheme,
  alpha,
  Paper,
  Divider,
  Tooltip,
  Badge,
  Slide,
  Fade,
  Grow,
  Container,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  AccountBalance,
  AttachMoney,
  Assessment,
  Schedule,
  CheckCircle,
  Warning,
  Add,
  FilterList,
  Download,
  Refresh,
  MoreVert,
  ArrowUpward,
  ArrowDownward,
  CalendarToday,
  ShowChart,
  PieChart,
  BarChart,
} from '@mui/icons-material';
import {
  AreaChart,
  Area,
  BarChart as RechartsBarChart,
  Bar,
  LineChart,
  Line,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ChartTooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
} from 'recharts';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Transaction } from '@/lib/types';
import { useTenant } from '@/contexts/TenantContext';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const formatPercent = (value: number) => {
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
};

// Helper function to safely convert any date value to a Date object
const safeDate = (dateValue: any): Date | null => {
  if (dateValue instanceof Date) {
    return isNaN(dateValue.getTime()) ? null : dateValue;
  }
  if (typeof dateValue === 'string' || typeof dateValue === 'number') {
    const date = new Date(dateValue);
    return isNaN(date.getTime()) ? null : date;
  }
  // Handle Firebase Timestamp objects
  if (dateValue && typeof dateValue.toDate === 'function') {
    try {
      const date = dateValue.toDate();
      return isNaN(date.getTime()) ? null : date;
    } catch {
      return null;
    }
  }
  return null;
};

export default function EnhancedFinancialDashboard() {
  const theme = useTheme();
  const { services, isReady } = useTenant();
  const [animateCards, setAnimateCards] = useState(false);
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalIncome: 0,
    totalExpenses: 0,
    balance: 0,
    pendingIncome: 0,
    pendingExpenses: 0,
    transactionCount: {
      total: 0,
      pending: 0,
      completed: 0,
    },
    growth: {
      income: 0,
      expenses: 0,
      balance: 0,
    },
  });

  useEffect(() => {
    setAnimateCards(true);
    if (isReady && services) {
      loadFinancialData();
    }
  }, [isReady, services]);

  const loadFinancialData = async () => {
    if (!services) return;

    try {
      setLoading(true);

      // Fetch all transactions
      const allTransactions = await services.transactions.getAll();
      setTransactions(allTransactions);

      // Calculate current month stats
      const now = new Date();
      const currentMonthStart = startOfMonth(now);
      const currentMonthEnd = endOfMonth(now);

      const currentMonthTransactions = allTransactions.filter(t => {
        const transactionDate = safeDate(t.date);
        if (!transactionDate) {
          return false;
        }
        return transactionDate >= currentMonthStart && transactionDate <= currentMonthEnd;
      });

      // Calculate stats
      const completedIncome = currentMonthTransactions
        .filter(t => t.type === 'income' && t.status === 'completed')
        .reduce((sum, t) => sum + t.amount, 0);

      const completedExpenses = currentMonthTransactions
        .filter(t => t.type === 'expense' && t.status === 'completed')
        .reduce((sum, t) => sum + t.amount, 0);

      const pendingIncome = currentMonthTransactions
        .filter(t => t.type === 'income' && t.status === 'pending')
        .reduce((sum, t) => sum + t.amount, 0);

      const pendingExpenses = currentMonthTransactions
        .filter(t => t.type === 'expense' && t.status === 'pending')
        .reduce((sum, t) => sum + t.amount, 0);

      // Calculate previous month for growth comparison
      const previousMonthStart = startOfMonth(subMonths(now, 1));
      const previousMonthEnd = endOfMonth(subMonths(now, 1));

      const previousMonthTransactions = allTransactions.filter(t => {
        const transactionDate = safeDate(t.date);
        if (!transactionDate) {
          return false;
        }
        return transactionDate >= previousMonthStart && transactionDate <= previousMonthEnd;
      });

      const previousIncome = previousMonthTransactions
        .filter(t => t.type === 'income' && t.status === 'completed')
        .reduce((sum, t) => sum + t.amount, 0);

      const previousExpenses = previousMonthTransactions
        .filter(t => t.type === 'expense' && t.status === 'completed')
        .reduce((sum, t) => sum + t.amount, 0);

      // Calculate growth percentages
      const incomeGrowth = previousIncome > 0 
        ? ((completedIncome - previousIncome) / previousIncome) * 100 
        : 0;

      const expensesGrowth = previousExpenses > 0 
        ? ((completedExpenses - previousExpenses) / previousExpenses) * 100 
        : 0;

      const balance = completedIncome - completedExpenses;
      const previousBalance = previousIncome - previousExpenses;
      const balanceGrowth = previousBalance !== 0 
        ? ((balance - previousBalance) / Math.abs(previousBalance)) * 100 
        : 0;

      setStats({
        totalIncome: completedIncome,
        totalExpenses: completedExpenses,
        balance,
        pendingIncome,
        pendingExpenses,
        transactionCount: {
          total: currentMonthTransactions.length,
          pending: currentMonthTransactions.filter(t => t.status === 'pending').length,
          completed: currentMonthTransactions.filter(t => t.status === 'completed').length,
        },
        growth: {
          income: incomeGrowth,
          expenses: expensesGrowth,
          balance: balanceGrowth,
        },
      });

      // Generate monthly data for the last 6 months
      const monthlyDataArray = [];
      for (let i = 5; i >= 0; i--) {
        const monthStart = startOfMonth(subMonths(now, i));
        const monthEnd = endOfMonth(subMonths(now, i));
        
        const monthTransactions = allTransactions.filter(t => {
          const transactionDate = safeDate(t.date);
          if (!transactionDate) {
            return false;
          }
          return transactionDate >= monthStart && transactionDate <= monthEnd;
        });

        const monthIncome = monthTransactions
          .filter(t => t.type === 'income' && t.status === 'completed')
          .reduce((sum, t) => sum + t.amount, 0);

        const monthExpenses = monthTransactions
          .filter(t => t.type === 'expense' && t.status === 'completed')
          .reduce((sum, t) => sum + t.amount, 0);

        monthlyDataArray.push({
          month: format(monthStart, 'MMM', { locale: ptBR }),
          receitas: monthIncome,
          despesas: monthExpenses,
          lucro: monthIncome - monthExpenses,
        });
      }
      setMonthlyData(monthlyDataArray);

      // Calculate category data
      const categoryMap: Record<string, number> = {};
      currentMonthTransactions
        .filter(t => t.status === 'completed')
        .forEach(t => {
          categoryMap[t.category] = (categoryMap[t.category] || 0) + Math.abs(t.amount);
        });

      const categoryArray = Object.entries(categoryMap)
        .map(([name, value]) => ({ 
          name, 
          value,
          color: name === 'Reserva' ? '#10b981' : 
                name === 'Limpeza' ? '#ef4444' : 
                name === 'Manutenção' ? '#f59e0b' : 
                name === 'Comissão' ? '#8b5cf6' : '#6b7280'
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);

      setCategoryData(categoryArray);

    } catch (error) {
      console.error('Error loading financial data:', error);
      // Additional debugging for date-related errors
      if (error instanceof RangeError && error.message.includes('Invalid time value')) {
        console.error('Date formatting error detected. Check transaction dates in the database.');
      }
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = () => {
    loadFinancialData();
  };

  const MetricCard = ({ 
    title, 
    value, 
    growth, 
    icon, 
    color = 'primary',
    delay = 0,
  }: any) => {
    const isPositive = growth >= 0;
    
    return (
      <Slide direction="up" in={animateCards} timeout={800 + delay}>
        <Card
          sx={{
            height: '100%',
            background: `linear-gradient(135deg, ${alpha(theme.palette[color].main, 0.1)} 0%, ${alpha(theme.palette[color].main, 0.02)} 100%)`,
            border: `1px solid ${alpha(theme.palette[color].main, 0.2)}`,
            transition: 'all 0.3s ease',
            '&:hover': {
              transform: 'translateY(-4px)',
              boxShadow: `0 8px 24px ${alpha(theme.palette[color].main, 0.2)}`,
            },
          }}
        >
          <CardContent>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
              <Box>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  {title}
                </Typography>
                {loading ? (
                  <Skeleton width={120} height={32} />
                ) : (
                  <Typography variant="h4" fontWeight="bold" color={color + '.main'}>
                    {formatCurrency(value)}
                  </Typography>
                )}
                {loading ? (
                  <Skeleton width={80} height={20} sx={{ mt: 1 }} />
                ) : (
                  <Stack direction="row" alignItems="center" spacing={0.5} mt={1}>
                    {isPositive ? (
                      <ArrowUpward fontSize="small" color="success" />
                    ) : (
                      <ArrowDownward fontSize="small" color="error" />
                    )}
                    <Typography
                      variant="caption"
                      color={isPositive ? 'success.main' : 'error.main'}
                      fontWeight="medium"
                    >
                      {formatPercent(growth)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      vs mês anterior
                    </Typography>
                  </Stack>
                )}
              </Box>
              <Avatar
                sx={{
                  bgcolor: alpha(theme.palette[color].main, 0.1),
                  color: theme.palette[color].main,
                }}
              >
                {icon}
              </Avatar>
            </Stack>
            <LinearProgress
              variant="determinate"
              value={Math.min(Math.abs(growth), 100)}
              sx={{
                mt: 2,
                height: 4,
                borderRadius: 2,
                bgcolor: alpha(theme.palette[color].main, 0.1),
                '& .MuiLinearProgress-bar': {
                  bgcolor: theme.palette[color].main,
                },
              }}
            />
          </CardContent>
        </Card>
      </Slide>
    );
  };

  // Get recent transactions (last 5)
  const recentTransactions = transactions
    .filter(t => {
      const date = safeDate(t.date);
      return date !== null; // Only include valid dates
    })
    .sort((a, b) => {
      const dateA = safeDate(a.date);
      const dateB = safeDate(b.date);
      if (!dateA || !dateB) return 0;
      return dateB.getTime() - dateA.getTime();
    })
    .slice(0, 5);

  return (
    <Container maxWidth={false} sx={{ px: { xs: 2, sm: 3 } }}>
      {/* Action Bar */}
      <Fade in timeout={600}>
        <Paper
          elevation={0}
          sx={{
            p: 2,
            mb: 3,
            borderRadius: 2,
            bgcolor: 'background.default',
            border: `1px solid ${theme.palette.divider}`,
          }}
        >
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            justifyContent="space-between"
            alignItems={{ xs: 'stretch', sm: 'center' }}
            spacing={2}
          >
            <Typography variant="subtitle1" fontWeight="medium">
              Dashboard Financeiro
            </Typography>
            <Stack direction="row" spacing={1}>
              <Tooltip title="Atualizar dados">
                <span>
                  <IconButton onClick={onRefresh} disabled={loading}>
                    <Refresh />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title="Filtrar">
                <IconButton>
                  <FilterList />
                </IconButton>
              </Tooltip>
              <Tooltip title="Exportar">
                <IconButton>
                  <Download />
                </IconButton>
              </Tooltip>
            </Stack>
          </Stack>
        </Paper>
      </Fade>

      {/* KPI Cards */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Receitas"
            value={stats.totalIncome}
            growth={stats.growth.income}
            icon={<TrendingUp />}
            color="success"
            delay={0}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Despesas"
            value={stats.totalExpenses}
            growth={stats.growth.expenses}
            icon={<TrendingDown />}
            color="error"
            delay={100}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Saldo"
            value={stats.balance}
            growth={stats.growth.balance}
            icon={<AccountBalance />}
            color="primary"
            delay={200}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Pendente"
            value={stats.pendingIncome - stats.pendingExpenses}
            growth={0}
            icon={<Schedule />}
            color="warning"
            delay={300}
          />
        </Grid>
      </Grid>

      {/* Charts Section */}
      <Grid container spacing={3} mb={4}>
        {/* Financial Evolution */}
        <Grid item xs={12} lg={8}>
          <Grow in timeout={1000}>
            <Card
              sx={{
                height: '100%',
                background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.02)} 0%, ${alpha(theme.palette.primary.main, 0.05)} 100%)`,
              }}
            >
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
                  <Typography variant="h6" fontWeight="medium">
                    Evolução Financeira
                  </Typography>
                  <Chip
                    icon={<ShowChart />}
                    label="Últimos 6 meses"
                    size="small"
                    variant="outlined"
                  />
                </Stack>
                {loading ? (
                  <Skeleton variant="rectangular" height={300} />
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <ComposedChart data={monthlyData}>
                      <defs>
                        <linearGradient id="colorReceitas" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0.1} />
                        </linearGradient>
                        <linearGradient id="colorDespesas" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={alpha(theme.palette.divider, 0.5)} />
                      <XAxis dataKey="month" stroke={theme.palette.text.secondary} />
                      <YAxis stroke={theme.palette.text.secondary} tickFormatter={(value) => `${value / 1000}k`} />
                      <ChartTooltip
                        formatter={(value: number) => formatCurrency(value)}
                        contentStyle={{
                          backgroundColor: theme.palette.background.paper,
                          border: `1px solid ${theme.palette.divider}`,
                          borderRadius: 8,
                        }}
                      />
                      <Legend />
                      <Bar dataKey="receitas" fill="url(#colorReceitas)" radius={[8, 8, 0, 0]} />
                      <Bar dataKey="despesas" fill="url(#colorDespesas)" radius={[8, 8, 0, 0]} />
                      <Line
                        type="monotone"
                        dataKey="lucro"
                        stroke={theme.palette.primary.main}
                        strokeWidth={3}
                        dot={{ fill: theme.palette.primary.main, r: 6 }}
                        activeDot={{ r: 8 }}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </Grow>
        </Grid>

        {/* Category Distribution */}
        <Grid item xs={12} lg={4}>
          <Grow in timeout={1200}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" fontWeight="medium" mb={3}>
                  Distribuição por Categoria
                </Typography>
                {loading ? (
                  <Skeleton variant="rectangular" height={250} />
                ) : categoryData.length === 0 ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 250 }}>
                    <Typography color="text.secondary">Sem dados para exibir</Typography>
                  </Box>
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height={200}>
                      <RechartsPieChart>
                        <Pie
                          data={categoryData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {categoryData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <ChartTooltip formatter={(value: number) => formatCurrency(value)} />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                    <Stack spacing={1} mt={2}>
                      {categoryData.map((category, index) => (
                        <Stack
                          key={index}
                          direction="row"
                          justifyContent="space-between"
                          alignItems="center"
                        >
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <Box
                              sx={{
                                width: 12,
                                height: 12,
                                borderRadius: '50%',
                                bgcolor: category.color,
                              }}
                            />
                            <Typography variant="body2">{category.name}</Typography>
                          </Stack>
                          <Typography variant="body2" fontWeight="medium">
                            {formatCurrency(category.value)}
                          </Typography>
                        </Stack>
                      ))}
                    </Stack>
                  </>
                )}
              </CardContent>
            </Card>
          </Grow>
        </Grid>
      </Grid>

      {/* Recent Transactions and Alerts */}
      <Grid container spacing={3}>
        {/* Recent Transactions */}
        <Grid item xs={12} md={8}>
          <Fade in timeout={1400}>
            <Card>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
                  <Typography variant="h6" fontWeight="medium">
                    Transações Recentes
                  </Typography>
                  <Button size="small" endIcon={<ArrowUpward />}>
                    Ver todas
                  </Button>
                </Stack>
                {loading ? (
                  <Stack spacing={2}>
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} variant="rectangular" height={60} />
                    ))}
                  </Stack>
                ) : recentTransactions.length === 0 ? (
                  <Typography color="text.secondary" align="center" py={4}>
                    Nenhuma transação recente
                  </Typography>
                ) : (
                  <Stack spacing={2}>
                    {recentTransactions.map((transaction) => (
                      <Paper
                        key={transaction.id}
                        elevation={0}
                        sx={{
                          p: 2,
                          borderRadius: 2,
                          border: `1px solid ${theme.palette.divider}`,
                          transition: 'all 0.2s ease',
                          '&:hover': {
                            bgcolor: alpha(theme.palette.primary.main, 0.02),
                            transform: 'translateX(4px)',
                          },
                        }}
                      >
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Stack direction="row" spacing={2} alignItems="center">
                            <Avatar
                              sx={{
                                bgcolor: transaction.type === 'income'
                                  ? alpha(theme.palette.success.main, 0.1)
                                  : alpha(theme.palette.error.main, 0.1),
                                color: transaction.type === 'income'
                                  ? 'success.main'
                                  : 'error.main',
                              }}
                            >
                              {transaction.type === 'income' ? <ArrowUpward /> : <ArrowDownward />}
                            </Avatar>
                            <Box>
                              <Typography variant="body1" fontWeight="medium">
                                {transaction.description}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {(() => {
                                  const date = safeDate(transaction.date);
                                  if (!date) {
                                    return 'Data inválida';
                                  }
                                  return format(date, "dd 'de' MMMM 'às' HH:mm", { locale: ptBR });
                                })()}
                              </Typography>
                            </Box>
                          </Stack>
                          <Stack alignItems="flex-end">
                            <Typography
                              variant="body1"
                              fontWeight="bold"
                              color={transaction.type === 'income' ? 'success.main' : 'error.main'}
                            >
                              {transaction.type === 'income' ? '+' : '-'}
                              {formatCurrency(Math.abs(transaction.amount))}
                            </Typography>
                            <Chip
                              label={transaction.status === 'completed' ? 'Concluído' : 'Pendente'}
                              size="small"
                              color={transaction.status === 'completed' ? 'success' : 'warning'}
                              sx={{ mt: 0.5 }}
                            />
                          </Stack>
                        </Stack>
                      </Paper>
                    ))}
                  </Stack>
                )}
              </CardContent>
            </Card>
          </Fade>
        </Grid>

        {/* Alerts and Notifications */}
        <Grid item xs={12} md={4}>
          <Fade in timeout={1600}>
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight="medium" mb={3}>
                  Alertas e Notificações
                </Typography>
                <Stack spacing={2}>
                  <Alert
                    severity="success"
                    icon={<CheckCircle />}
                    title="Meta Atingida"
                    message="Receitas 15% acima do previsto"
                  />
                  <Alert
                    severity="warning"
                    icon={<Warning />}
                    title="Atenção"
                    message={`${stats.transactionCount.pending} transações pendentes`}
                  />
                  <Alert
                    severity="info"
                    icon={<Assessment />}
                    title="Relatório Disponível"
                    message="Relatório mensal pronto"
                  />
                </Stack>
              </CardContent>
            </Card>
          </Fade>
        </Grid>
      </Grid>
    </Container>
  );
}

interface AlertProps {
  severity: 'success' | 'warning' | 'info' | 'error';
  icon: React.ReactNode;
  title: string;
  message: string;
}

const Alert = ({ severity, icon, title, message }: AlertProps) => {
  const theme = useTheme();
  const colors = {
    success: theme.palette.success.main,
    warning: theme.palette.warning.main,
    info: theme.palette.info.main,
    error: theme.palette.error.main,
  };

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        borderRadius: 2,
        border: `1px solid ${alpha(colors[severity], 0.3)}`,
        bgcolor: alpha(colors[severity], 0.05),
      }}
    >
      <Stack direction="row" spacing={2} alignItems="flex-start">
        <Avatar
          sx={{
            bgcolor: alpha(colors[severity], 0.1),
            color: colors[severity],
            width: 40,
            height: 40,
          }}
        >
          {icon}
        </Avatar>
        <Box>
          <Typography variant="subtitle2" fontWeight="medium">
            {title}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {message}
          </Typography>
        </Box>
      </Stack>
    </Paper>
  );
};