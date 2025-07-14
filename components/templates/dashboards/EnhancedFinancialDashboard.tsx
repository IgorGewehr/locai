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

interface FinancialStats {
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  pendingIncome: number;
  pendingExpenses: number;
  transactionCount: {
    total: number;
    pending: number;
    completed: number;
  };
  growth: {
    income: number;
    expenses: number;
    balance: number;
  };
  byCategory: Record<string, number>;
}

interface EnhancedFinancialDashboardProps {
  stats: FinancialStats;
  isLoading?: boolean;
  onRefresh?: () => void;
  onFilter?: () => void;
  onExport?: () => void;
}

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

export default function EnhancedFinancialDashboard({
  stats,
  isLoading = false,
  onRefresh,
  onFilter,
  onExport,
}: EnhancedFinancialDashboardProps) {
  const theme = useTheme();
  const [animateCards, setAnimateCards] = useState(false);

  useEffect(() => {
    setAnimateCards(true);
  }, []);

  // Gerar dados mock para demonstração
  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const date = subMonths(new Date(), 5 - i);
    return {
      month: format(date, 'MMM', { locale: ptBR }),
      receitas: Math.random() * 50000 + 30000,
      despesas: Math.random() * 30000 + 15000,
      lucro: Math.random() * 25000 + 10000,
    };
  });

  const categoryData = [
    { name: 'Hospedagem', value: 45000, color: '#10b981' },
    { name: 'Manutenção', value: 12000, color: '#ef4444' },
    { name: 'Limpeza', value: 8000, color: '#f59e0b' },
    { name: 'Comissões', value: 6000, color: '#8b5cf6' },
    { name: 'Outros', value: 4000, color: '#6b7280' },
  ];

  const recentTransactions = [
    { id: 1, description: 'Hospedagem - Apto 101', value: 2500, type: 'income', date: new Date() },
    { id: 2, description: 'Limpeza - Apto 201', value: -150, type: 'expense', date: new Date() },
    { id: 3, description: 'Hospedagem - Casa 5', value: 4200, type: 'income', date: new Date() },
    { id: 4, description: 'Manutenção - Apto 101', value: -380, type: 'expense', date: new Date() },
  ];

  const MetricCard = ({ 
    title, 
    value, 
    growth, 
    icon, 
    color, 
    delay = 0,
    subtitle,
    progress,
  }: {
    title: string;
    value: string;
    growth?: number;
    icon: React.ReactNode;
    color: string;
    delay?: number;
    subtitle?: string;
    progress?: number;
  }) => (
    <Grow in={animateCards} timeout={600} style={{ transitionDelay: `${delay}ms` }}>
      <Card 
        sx={{ 
          height: '100%',
          background: `linear-gradient(135deg, ${alpha(theme.palette[color as keyof typeof theme.palette].main, 0.1)} 0%, ${alpha(theme.palette[color as keyof typeof theme.palette].main, 0.05)} 100%)`,
          border: `1px solid ${alpha(theme.palette[color as keyof typeof theme.palette].main, 0.2)}`,
          transition: 'all 0.3s ease',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: theme.shadows[8],
            border: `1px solid ${alpha(theme.palette[color as keyof typeof theme.palette].main, 0.4)}`,
          }
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                {value}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {title}
              </Typography>
              {subtitle && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                  {subtitle}
                </Typography>
              )}
            </Box>
            <Avatar 
              sx={{ 
                width: 56, 
                height: 56,
                bgcolor: alpha(theme.palette[color as keyof typeof theme.palette].main, 0.1),
                color: theme.palette[color as keyof typeof theme.palette].main,
              }}
            >
              {icon}
            </Avatar>
          </Box>

          {progress !== undefined && (
            <Box sx={{ mb: 2 }}>
              <LinearProgress 
                variant="determinate" 
                value={progress} 
                sx={{ 
                  height: 6, 
                  borderRadius: 3,
                  bgcolor: alpha(theme.palette[color as keyof typeof theme.palette].main, 0.1),
                  '& .MuiLinearProgress-bar': {
                    bgcolor: theme.palette[color as keyof typeof theme.palette].main,
                  }
                }} 
              />
            </Box>
          )}

          {growth !== undefined && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {growth >= 0 ? (
                <TrendingUp sx={{ fontSize: 18, color: 'success.main' }} />
              ) : (
                <TrendingDown sx={{ fontSize: 18, color: 'error.main' }} />
              )}
              <Typography 
                variant="body2" 
                color={growth >= 0 ? 'success.main' : 'error.main'}
                sx={{ fontWeight: 500 }}
              >
                {formatPercent(growth)} vs mês anterior
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>
    </Grow>
  );

  const ChartCard = ({ 
    title, 
    children, 
    actions,
    delay = 0,
  }: {
    title: string;
    children: React.ReactNode;
    actions?: React.ReactNode;
    delay?: number;
  }) => (
    <Slide direction="up" in={animateCards} timeout={800} style={{ transitionDelay: `${delay}ms` }}>
      <Card sx={{ height: '100%', overflow: 'hidden' }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {title}
            </Typography>
            {actions}
          </Box>
          {children}
        </CardContent>
      </Card>
    </Slide>
  );

  if (isLoading) {
    return (
      <Container maxWidth="xl">
        <Grid container spacing={3}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Grid item xs={12} sm={6} md={3} key={i}>
              <Card>
                <CardContent>
                  <Skeleton variant="rectangular" height={120} />
                </CardContent>
              </Card>
            </Grid>
          ))}
          <Grid item xs={12} md={8}>
            <Card>
              <CardContent>
                <Skeleton variant="rectangular" height={400} />
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Skeleton variant="rectangular" height={400} />
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Header */}
      <Fade in={true} timeout={400}>
        <Box sx={{ mb: 4 }}>
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: { xs: 'flex-start', md: 'center' },
            flexDirection: { xs: 'column', md: 'row' },
            gap: 2
          }}>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                Dashboard Financeiro
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Acompanhe suas receitas, despesas e performance financeira
              </Typography>
            </Box>
            <Stack direction="row" spacing={1}>
              <Tooltip title="Atualizar dados">
                <IconButton onClick={onRefresh} size="large">
                  <Refresh />
                </IconButton>
              </Tooltip>
              <Tooltip title="Filtros">
                <IconButton onClick={onFilter} size="large">
                  <FilterList />
                </IconButton>
              </Tooltip>
              <Tooltip title="Exportar">
                <IconButton onClick={onExport} size="large">
                  <Download />
                </IconButton>
              </Tooltip>
              <Button 
                variant="contained" 
                startIcon={<Add />}
                size="large"
                sx={{ 
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 600,
                }}
              >
                Nova Transação
              </Button>
            </Stack>
          </Box>
        </Box>
      </Fade>

      {/* KPI Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Receitas do Mês"
            value={formatCurrency(stats?.totalIncome || 0)}
            growth={stats?.growth?.income}
            icon={<ArrowUpward />}
            color="success"
            delay={100}
            subtitle={`${stats?.transactionCount?.completed || 0} transações`}
            progress={75}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Despesas do Mês"
            value={formatCurrency(stats?.totalExpenses || 0)}
            growth={stats?.growth?.expenses}
            icon={<ArrowDownward />}
            color="error"
            delay={200}
            subtitle="Controle seus gastos"
            progress={45}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Saldo Líquido"
            value={formatCurrency(stats?.balance || 0)}
            growth={stats?.growth?.balance}
            icon={<AccountBalance />}
            color={stats?.balance >= 0 ? "primary" : "error"}
            delay={300}
            subtitle="Lucro do período"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="A Receber"
            value={formatCurrency(stats?.pendingIncome || 0)}
            icon={<Schedule />}
            color="warning"
            delay={400}
            subtitle={`${stats?.transactionCount?.pending || 0} pendências`}
            progress={60}
          />
        </Grid>
      </Grid>

      {/* Charts */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} lg={8}>
          <ChartCard 
            title="Evolução Financeira (6 meses)"
            delay={500}
            actions={
              <Stack direction="row" spacing={1}>
                <Chip icon={<ShowChart />} label="Linha" size="small" />
                <Chip icon={<BarChart />} label="Barras" size="small" variant="outlined" />
              </Stack>
            }
          >
            <Box sx={{ height: 400 }}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={monthlyData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={alpha(theme.palette.divider, 0.3)} />
                  <XAxis 
                    dataKey="month" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: theme.palette.text.secondary }}
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: theme.palette.text.secondary }}
                    tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
                  />
                  <ChartTooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{
                      backgroundColor: theme.palette.background.paper,
                      border: `1px solid ${theme.palette.divider}`,
                      borderRadius: theme.shape.borderRadius,
                      boxShadow: theme.shadows[8],
                    }}
                  />
                  <Legend />
                  <Bar dataKey="receitas" fill="#10b981" name="Receitas" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="despesas" fill="#ef4444" name="Despesas" radius={[4, 4, 0, 0]} />
                  <Line 
                    type="monotone" 
                    dataKey="lucro" 
                    stroke="#3b82f6" 
                    strokeWidth={3}
                    name="Lucro"
                    dot={{ fill: '#3b82f6', strokeWidth: 2, r: 6 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </Box>
          </ChartCard>
        </Grid>

        <Grid item xs={12} lg={4}>
          <ChartCard 
            title="Distribuição por Categoria"
            delay={600}
            actions={
              <IconButton size="small">
                <MoreVert />
              </IconButton>
            }
          >
            <Box sx={{ height: 400 }}>
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={120}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <ChartTooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{
                      backgroundColor: theme.palette.background.paper,
                      border: `1px solid ${theme.palette.divider}`,
                      borderRadius: theme.shape.borderRadius,
                      boxShadow: theme.shadows[8],
                    }}
                  />
                </RechartsPieChart>
              </ResponsiveContainer>
              
              {/* Legend customizada */}
              <Box sx={{ mt: 2 }}>
                <Grid container spacing={1}>
                  {categoryData.map((item) => (
                    <Grid item xs={6} key={item.name}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box 
                          sx={{ 
                            width: 12, 
                            height: 12, 
                            borderRadius: 1, 
                            bgcolor: item.color 
                          }} 
                        />
                        <Typography variant="caption" color="text.secondary">
                          {item.name}
                        </Typography>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            </Box>
          </ChartCard>
        </Grid>
      </Grid>

      {/* Recent Transactions */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Slide direction="up" in={animateCards} timeout={800} style={{ transitionDelay: '700ms' }}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Transações Recentes
                  </Typography>
                  <Button variant="outlined" size="small">
                    Ver Todas
                  </Button>
                </Box>
                
                <Stack spacing={2}>
                  {recentTransactions.map((transaction, index) => (
                    <Fade in={true} timeout={400} style={{ transitionDelay: `${800 + index * 100}ms` }} key={transaction.id}>
                      <Paper 
                        sx={{ 
                          p: 2, 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'space-between',
                          transition: 'all 0.2s ease',
                          '&:hover': {
                            transform: 'translateX(4px)',
                            boxShadow: theme.shadows[4],
                          }
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Avatar 
                            sx={{ 
                              bgcolor: transaction.type === 'income' ? 'success.light' : 'error.light',
                              color: transaction.type === 'income' ? 'success.main' : 'error.main',
                            }}
                          >
                            {transaction.type === 'income' ? <ArrowUpward /> : <ArrowDownward />}
                          </Avatar>
                          <Box>
                            <Typography variant="body1" sx={{ fontWeight: 500 }}>
                              {transaction.description}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {format(transaction.date, 'dd/MM/yyyy HH:mm')}
                            </Typography>
                          </Box>
                        </Box>
                        <Typography 
                          variant="h6" 
                          color={transaction.type === 'income' ? 'success.main' : 'error.main'}
                          sx={{ fontWeight: 600 }}
                        >
                          {transaction.value > 0 ? '+' : ''}{formatCurrency(transaction.value)}
                        </Typography>
                      </Paper>
                    </Fade>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Slide>
        </Grid>

        <Grid item xs={12} md={4}>
          <Slide direction="up" in={animateCards} timeout={800} style={{ transitionDelay: '800ms' }}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                  Alertas e Notificações
                </Typography>
                
                <Stack spacing={2}>
                  <Paper sx={{ p: 2, bgcolor: alpha(theme.palette.warning.main, 0.1), border: `1px solid ${alpha(theme.palette.warning.main, 0.2)}` }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Warning sx={{ color: 'warning.main', fontSize: 20 }} />
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        Pagamentos Atrasados
                      </Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      3 pagamentos pendentes há mais de 5 dias
                    </Typography>
                  </Paper>

                  <Paper sx={{ p: 2, bgcolor: alpha(theme.palette.info.main, 0.1), border: `1px solid ${alpha(theme.palette.info.main, 0.2)}` }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Assessment sx={{ color: 'info.main', fontSize: 20 }} />
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        Meta do Mês
                      </Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      75% da meta de receita atingida
                    </Typography>
                    <LinearProgress 
                      variant="determinate" 
                      value={75} 
                      sx={{ mt: 1, height: 6, borderRadius: 3 }}
                    />
                  </Paper>

                  <Paper sx={{ p: 2, bgcolor: alpha(theme.palette.success.main, 0.1), border: `1px solid ${alpha(theme.palette.success.main, 0.2)}` }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <CheckCircle sx={{ color: 'success.main', fontSize: 20 }} />
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        Crescimento Mensal
                      </Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      +15% comparado ao mês anterior
                    </Typography>
                  </Paper>
                </Stack>
              </CardContent>
            </Card>
          </Slide>
        </Grid>
      </Grid>
    </Container>
  );
}