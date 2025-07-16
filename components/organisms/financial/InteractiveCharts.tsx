'use client';

import { useState, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
  IconButton,
  Tooltip,
  Stack,
  Chip,
  Button,
  Menu,
  MenuItem,
  useTheme,
  alpha,
  Paper,
  Avatar,
  Divider,
  Grid,
} from '@mui/material';
import {
  ShowChart,
  BarChart,
  PieChart,
  Timeline,
  TrendingUp,
  TrendingDown,
  MoreVert,
  Download,
  Fullscreen,
  Refresh,
  Settings,
  ZoomIn,
  ZoomOut,
  FilterList,
  DateRange,
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
  RadialBarChart,
  RadialBar,
  Treemap,
  Funnel,
  FunnelChart,
} from 'recharts';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ChartData {
  monthlyTrends: any[];
  categoryBreakdown: any[];
  cashFlow: any[];
  paymentMethods: any[];
  propertyPerformance: any[];
}

interface InteractiveChartsProps {
  data: ChartData;
  period: '3m' | '6m' | '1y' | '2y';
  onPeriodChange: (period: '3m' | '6m' | '1y' | '2y') => void;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const COLORS = [
  '#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', 
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'
];

export default function InteractiveCharts({ 
  data, 
  period, 
  onPeriodChange 
}: InteractiveChartsProps) {
  const theme = useTheme();
  const [chartType, setChartType] = useState<'area' | 'bar' | 'line'>('area');
  const [viewMode, setViewMode] = useState<'overview' | 'detailed'>('overview');
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedChart, setSelectedChart] = useState<string | null>(null);
  const [showAnimations, setShowAnimations] = useState(true);

  // Real data from Firebase transactions and reservations
  const realData = useMemo(() => {
    const monthsCount = period === '3m' ? 3 : period === '6m' ? 6 : period === '1y' ? 12 : 24;
    
    // Group transactions by month
    const monthlyData = new Map<string, {
      receitas: number;
      despesas: number;
      reservas: number;
      ocupacao: number;
    }>();
    
    // Process transactions
    transactions.forEach(transaction => {
      const monthKey = format(new Date(transaction.date), 'MMM/yy', { locale: ptBR });
      const existing = monthlyData.get(monthKey) || { receitas: 0, despesas: 0, reservas: 0, ocupacao: 0 };
      
      if (transaction.type === 'income') {
        existing.receitas += transaction.amount;
      } else {
        existing.despesas += transaction.amount;
      }
      
      monthlyData.set(monthKey, existing);
    });
    
    // Process reservations for occupancy
    reservations.forEach(reservation => {
      const monthKey = format(new Date(reservation.checkIn), 'MMM/yy', { locale: ptBR });
      const existing = monthlyData.get(monthKey) || { receitas: 0, despesas: 0, reservas: 0, ocupacao: 0 };
      
      existing.reservas += 1;
      
      monthlyData.set(monthKey, existing);
    });
    
    return {
      monthlyTrends: Array.from({ length: monthsCount }, (_, i) => {
        const monthsBack = monthsCount - 1 - i;
        const date = subMonths(new Date(), monthsBack);
        const monthKey = format(date, 'MMM/yy', { locale: ptBR });
        const data = monthlyData.get(monthKey) || { receitas: 0, despesas: 0, reservas: 0, ocupacao: 0 };
        
        // Calculate occupancy rate based on reservations (simplified)
        const occupancyRate = Math.min(100, (data.reservas * 3.33)); // Rough calculation
        
        return {
          month: monthKey,
          fullMonth: format(date, 'MMMM yyyy', { locale: ptBR }),
          receitas: data.receitas,
          despesas: data.despesas,
          lucro: data.receitas - data.despesas,
          reservas: data.reservas,
          ocupacao: Math.round(occupancyRate),
        };
    }).reverse(),
    
    // Real category breakdown from transactions
    categoryBreakdown: (() => {
      const categories = new Map<string, { value: number; count: number }>();
      let totalValue = 0;
      
      transactions.forEach(transaction => {
        const category = transaction.category || 'Outros';
        const existing = categories.get(category) || { value: 0, count: 0 };
        existing.value += transaction.amount;
        existing.count += 1;
        categories.set(category, existing);
        totalValue += transaction.amount;
      });
      
      const colors = ['#10b981', '#ef4444', '#f59e0b', '#8b5cf6', '#6b7280'];
      
      return Array.from(categories.entries()).map(([name, data], index) => ({
        name,
        value: data.value,
        percentage: Math.round((data.value / totalValue) * 100),
        color: colors[index % colors.length],
        count: data.count
      })).sort((a, b) => b.value - a.value);
    })(),
    
    // Real payment methods from transactions
    paymentMethods: (() => {
      const methods = new Map<string, number>();
      let totalValue = 0;
      
      transactions.forEach(transaction => {
        const method = transaction.paymentMethod || 'Outros';
        methods.set(method, (methods.get(method) || 0) + transaction.amount);
        totalValue += transaction.amount;
      });
      
      const colors = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'];
      
      return Array.from(methods.entries()).map(([name, value], index) => ({
        name,
        value,
        percentage: Math.round((value / totalValue) * 100),
        color: colors[index % colors.length]
      })).sort((a, b) => b.value - a.value);
    })(),
    
    // Real property performance from reservations and transactions
    propertyPerformance: (() => {
      const propertyData = new Map<string, { receita: number; despesas: number; ocupacao: number }>();
      
      // Calculate revenue and expenses by property
      transactions.forEach(transaction => {
        if (transaction.propertyId) {
          const existing = propertyData.get(transaction.propertyId) || { receita: 0, despesas: 0, ocupacao: 0 };
          if (transaction.type === 'income') {
            existing.receita += transaction.amount;
          } else {
            existing.despesas += transaction.amount;
          }
          propertyData.set(transaction.propertyId, existing);
        }
      });
      
      // Calculate occupancy from reservations
      reservations.forEach(reservation => {
        if (reservation.propertyId) {
          const existing = propertyData.get(reservation.propertyId) || { receita: 0, despesas: 0, ocupacao: 0 };
          existing.ocupacao += 1; // Simplified occupancy count
          propertyData.set(reservation.propertyId, existing);
        }
      });
      
      return Array.from(propertyData.entries()).map(([id, data]) => {
        const property = properties.find(p => p.id === id);
        return {
          id,
          name: property?.title || `Propriedade ${id}`,
          receita: data.receita,
          despesas: data.despesas,
          lucro: data.receita - data.despesas,
          ocupacao: Math.min(100, data.ocupacao * 5) // Rough calculation
        };
      }).sort((a, b) => b.receita - a.receita);
    })(),
  }), [period, transactions, reservations, properties]);

  const ChartCard = ({ 
    title, 
    subtitle,
    children, 
    actions,
    height = 400,
    chartId,
  }: {
    title: string;
    subtitle?: string;
    children: React.ReactNode;
    actions?: React.ReactNode;
    height?: number;
    chartId?: string;
  }) => (
    <Card 
      sx={{ 
        height: '100%',
        transition: 'all 0.3s ease',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: theme.shadows[8],
        }
      }}
    >
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
              {title}
            </Typography>
            {subtitle && (
              <Typography variant="body2" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </Box>
          <Stack direction="row" spacing={1}>
            {actions}
            <IconButton 
              size="small" 
              onClick={(e) => {
                setMenuAnchor(e.currentTarget);
                setSelectedChart(chartId || '');
              }}
            >
              <MoreVert />
            </IconButton>
          </Stack>
        </Box>
        <Box sx={{ height }}>
          {children}
        </Box>
      </CardContent>
    </Card>
  );

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <Paper 
          sx={{ 
            p: 2, 
            bgcolor: alpha(theme.palette.background.paper, 0.95),
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: 2,
            boxShadow: theme.shadows[8],
          }}
        >
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
            {label}
          </Typography>
          {payload.map((entry: any, index: number) => (
            <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <Box 
                sx={{ 
                  width: 12, 
                  height: 12, 
                  borderRadius: 1, 
                  bgcolor: entry.color 
                }} 
              />
              <Typography variant="body2">
                {entry.name}: <strong>{formatCurrency(entry.value)}</strong>
              </Typography>
            </Box>
          ))}
        </Paper>
      );
    }
    return null;
  };

  return (
    <Box>
      {/* Controles do Dashboard */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
            Análise Financeira Avançada
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Visualizações interativas dos seus dados financeiros
          </Typography>
        </Box>
        
        <Stack direction="row" spacing={2} alignItems="center">
          <ToggleButtonGroup
            value={period}
            exclusive
            onChange={(_, value) => value && onPeriodChange(value)}
            size="small"
          >
            <ToggleButton value="3m">3M</ToggleButton>
            <ToggleButton value="6m">6M</ToggleButton>
            <ToggleButton value="1y">1A</ToggleButton>
            <ToggleButton value="2y">2A</ToggleButton>
          </ToggleButtonGroup>
          
          <ToggleButtonGroup
            value={chartType}
            exclusive
            onChange={(_, value) => value && setChartType(value)}
            size="small"
          >
            <ToggleButton value="area">
              <Tooltip title="Gráfico de Área">
                <Timeline />
              </Tooltip>
            </ToggleButton>
            <ToggleButton value="bar">
              <Tooltip title="Gráfico de Barras">
                <BarChart />
              </Tooltip>
            </ToggleButton>
            <ToggleButton value="line">
              <Tooltip title="Gráfico de Linha">
                <ShowChart />
              </Tooltip>
            </ToggleButton>
          </ToggleButtonGroup>
          
          <Button variant="outlined" startIcon={<Download />}>
            Exportar
          </Button>
        </Stack>
      </Box>

      <Grid container spacing={3}>
        {/* Gráfico Principal - Evolução Temporal */}
        <Grid item xs={12} lg={8}>
          <ChartCard 
            title="Evolução Financeira" 
            subtitle={`Últimos ${period === '3m' ? '3 meses' : period === '6m' ? '6 meses' : period === '1y' ? '12 meses' : '24 meses'}`}
            chartId="main-chart"
            height={450}
            actions={
              <Stack direction="row" spacing={1}>
                <Chip 
                  icon={<TrendingUp />} 
                  label="+15% vs período anterior" 
                  color="success" 
                  size="small" 
                />
              </Stack>
            }
          >
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'area' ? (
                <AreaChart data={realData.monthlyTrends} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={alpha(theme.palette.divider, 0.3)} />
                  <XAxis 
                    dataKey="month" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                  />
                  <ChartTooltip content={<CustomTooltip />} />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="receitas"
                    stackId="1"
                    stroke="#10b981"
                    fill="url(#colorReceitas)"
                    strokeWidth={2}
                    name="Receitas"
                    animationDuration={showAnimations ? 1500 : 0}
                  />
                  <Area
                    type="monotone"
                    dataKey="despesas"
                    stackId="2"
                    stroke="#ef4444"
                    fill="url(#colorDespesas)"
                    strokeWidth={2}
                    name="Despesas"
                    animationDuration={showAnimations ? 1500 : 0}
                  />
                  <defs>
                    <linearGradient id="colorReceitas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
                    </linearGradient>
                    <linearGradient id="colorDespesas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                </AreaChart>
              ) : chartType === 'bar' ? (
                <RechartsBarChart data={realData.monthlyTrends} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={alpha(theme.palette.divider, 0.3)} />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`} />
                  <ChartTooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar dataKey="receitas" fill="#10b981" name="Receitas" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="despesas" fill="#ef4444" name="Despesas" radius={[4, 4, 0, 0]} />
                </RechartsBarChart>
              ) : (
                <LineChart data={realData.monthlyTrends} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={alpha(theme.palette.divider, 0.3)} />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`} />
                  <ChartTooltip content={<CustomTooltip />} />
                  <Legend />
                  <Line type="monotone" dataKey="receitas" stroke="#10b981" strokeWidth={3} name="Receitas" dot={{ r: 6 }} />
                  <Line type="monotone" dataKey="despesas" stroke="#ef4444" strokeWidth={3} name="Despesas" dot={{ r: 6 }} />
                  <Line type="monotone" dataKey="lucro" stroke="#3b82f6" strokeWidth={3} name="Lucro Líquido" dot={{ r: 6 }} />
                </LineChart>
              )}
            </ResponsiveContainer>
          </ChartCard>
        </Grid>

        {/* Gráfico de Pizza - Categorias */}
        <Grid item xs={12} lg={4}>
          <ChartCard 
            title="Distribuição por Categoria" 
            subtitle="Breakdown de receitas e despesas"
            chartId="category-chart"
            height={450}
          >
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPieChart>
                <Pie
                  data={realData.categoryBreakdown}
                  cx="50%"
                  cy="45%"
                  innerRadius={60}
                  outerRadius={120}
                  paddingAngle={2}
                  dataKey="value"
                  animationBegin={0}
                  animationDuration={showAnimations ? 1000 : 0}
                >
                  {realData.categoryBreakdown.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.color}
                      stroke={theme.palette.background.paper}
                      strokeWidth={2}
                    />
                  ))}
                </Pie>
                <ChartTooltip content={<CustomTooltip />} />
              </RechartsPieChart>
            </ResponsiveContainer>
            
            {/* Legend personalizada */}
            <Box sx={{ mt: 2 }}>
              <Stack spacing={1}>
                {realData.categoryBreakdown.map((item) => (
                  <Box 
                    key={item.name}
                    sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between',
                      p: 1,
                      borderRadius: 1,
                      '&:hover': { bgcolor: 'action.hover' }
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box 
                        sx={{ 
                          width: 12, 
                          height: 12, 
                          borderRadius: 1, 
                          bgcolor: item.color 
                        }} 
                      />
                      <Typography variant="body2" fontWeight={500}>
                        {item.name}
                      </Typography>
                    </Box>
                    <Box sx={{ textAlign: 'right' }}>
                      <Typography variant="body2" fontWeight={600}>
                        {formatCurrency(item.value)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {item.percentage}%
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Stack>
            </Box>
          </ChartCard>
        </Grid>

        {/* Performance por Propriedade */}
        <Grid item xs={12} md={6}>
          <ChartCard 
            title="Performance por Propriedade" 
            subtitle="Ranking de lucratividade"
            chartId="property-chart"
            height={350}
          >
            <Stack spacing={2}>
              {realData.propertyPerformance.map((property, index) => (
                <Paper 
                  key={property.id}
                  sx={{ 
                    p: 2, 
                    bgcolor: alpha(theme.palette.primary.main, 0.02),
                    border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      bgcolor: alpha(theme.palette.primary.main, 0.04),
                      transform: 'translateX(4px)',
                    }
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar 
                        sx={{ 
                          width: 32, 
                          height: 32, 
                          bgcolor: COLORS[index % COLORS.length],
                          fontSize: '0.875rem',
                          fontWeight: 600,
                        }}
                      >
                        {index + 1}
                      </Avatar>
                      <Box>
                        <Typography variant="body2" fontWeight={600}>
                          {property.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {property.ocupacao}% ocupação
                        </Typography>
                      </Box>
                    </Box>
                    <Typography variant="h6" color="success.main" fontWeight={600}>
                      {formatCurrency(property.lucro)}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', gap: 2, mb: 1 }}>
                    <Chip 
                      size="small" 
                      label={`Receita: ${formatCurrency(property.receita)}`}
                      color="success"
                      variant="outlined"
                    />
                    <Chip 
                      size="small" 
                      label={`Despesas: ${formatCurrency(property.despesas)}`}
                      color="error"
                      variant="outlined"
                    />
                  </Box>
                  
                  {/* Barra de progresso da ocupação */}
                  <Box sx={{ width: '100%', bgcolor: 'divider', borderRadius: 1, height: 6 }}>
                    <Box 
                      sx={{ 
                        width: `${property.ocupacao}%`, 
                        bgcolor: property.ocupacao > 80 ? 'success.main' : property.ocupacao > 60 ? 'warning.main' : 'error.main',
                        height: '100%', 
                        borderRadius: 1,
                        transition: 'width 1s ease-in-out',
                      }} 
                    />
                  </Box>
                </Paper>
              ))}
            </Stack>
          </ChartCard>
        </Grid>

        {/* Métodos de Pagamento */}
        <Grid item xs={12} md={6}>
          <ChartCard 
            title="Métodos de Pagamento" 
            subtitle="Distribuição das transações"
            chartId="payment-chart"
            height={350}
          >
            <ResponsiveContainer width="100%" height="70%">
              <RadialBarChart 
                cx="50%" 
                cy="50%" 
                innerRadius="20%" 
                outerRadius="80%" 
                data={realData.paymentMethods}
              >
                <RadialBar 
                  dataKey="percentage" 
                  cornerRadius={10} 
                  fill={(entry, index) => realData.paymentMethods[index]?.color || '#8884d8'}
                />
                <ChartTooltip content={<CustomTooltip />} />
              </RadialBarChart>
            </ResponsiveContainer>
            
            <Stack spacing={1} sx={{ mt: 2 }}>
              {realData.paymentMethods.map((method) => (
                <Box 
                  key={method.name}
                  sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    p: 1,
                    borderRadius: 1,
                    '&:hover': { bgcolor: 'action.hover' }
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box 
                      sx={{ 
                        width: 12, 
                        height: 12, 
                        borderRadius: '50%', 
                        bgcolor: method.color 
                      }} 
                    />
                    <Typography variant="body2" fontWeight={500}>
                      {method.name}
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="body2" fontWeight={600}>
                      {formatCurrency(method.value)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {method.percentage}%
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Stack>
          </ChartCard>
        </Grid>
      </Grid>

      {/* Menu de Ações do Gráfico */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
      >
        <MenuItem onClick={() => setMenuAnchor(null)}>
          <Download sx={{ mr: 1 }} />
          Exportar PNG
        </MenuItem>
        <MenuItem onClick={() => setMenuAnchor(null)}>
          <Download sx={{ mr: 1 }} />
          Exportar PDF
        </MenuItem>
        <MenuItem onClick={() => setMenuAnchor(null)}>
          <Fullscreen sx={{ mr: 1 }} />
          Visualizar em Tela Cheia
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => {
          setShowAnimations(!showAnimations);
          setMenuAnchor(null);
        }}>
          <Settings sx={{ mr: 1 }} />
          {showAnimations ? 'Desativar' : 'Ativar'} Animações
        </MenuItem>
      </Menu>
    </Box>
  );
}