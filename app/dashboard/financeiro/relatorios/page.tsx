'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  ToggleButton,
  ToggleButtonGroup,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  LinearProgress,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  Download,
  Print,
  CalendarMonth,
  Home,
  Person,
  AttachMoney,
  CheckCircle,
  Schedule,
  Warning,
  ArrowUpward,
  ArrowDownward,
} from '@mui/icons-material';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ChartTooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { format, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Transaction, Client } from '@/lib/types';
import { Property } from '@/lib/types/property';
import { transactionService } from '@/lib/services/transaction-service';
import { propertyService, clientService } from '@/lib/firebase/firestore';
import { useAuth } from '@/lib/hooks/useAuth';

interface ReportData {
  period: string;
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
  transactions: Transaction[];
  byProperty: { [propertyId: string]: { income: number; expenses: number; profit: number } };
  byCategory: { [category: string]: number };
  topClients: Array<{ clientId: string; name: string; total: number; transactions: number }>;
  occupancyRate: number;
  growthRate: number;
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function RelatoriosFinanceirosPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [reportType, setReportType] = useState<'monthly' | 'quarterly' | 'yearly'>('monthly');
  const [selectedPeriod, setSelectedPeriod] = useState(format(new Date(), 'yyyy-MM'));
  const [properties, setProperties] = useState<Property[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [reportData, setReportData] = useState<ReportData | null>(null);

  useEffect(() => {
    loadData();
  }, [reportType, selectedPeriod]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Carregar dados relacionados
      const [propertiesData, clientsData] = await Promise.all([
        propertyService.getAll(),
        clientService.getAll(),
      ]);

      setProperties(propertiesData);
      setClients(clientsData);

      // Determinar período do relatório
      let startDate: Date;
      let endDate: Date;

      if (reportType === 'monthly') {
        const [year, month] = selectedPeriod.split('-').map(Number);
        startDate = startOfMonth(new Date(year, month - 1));
        endDate = endOfMonth(new Date(year, month - 1));
      } else if (reportType === 'quarterly') {
        const [year, quarter] = selectedPeriod.split('-Q').map(Number);
        const startMonth = (quarter - 1) * 3;
        startDate = new Date(year, startMonth, 1);
        endDate = endOfMonth(new Date(year, startMonth + 2));
      } else {
        const year = parseInt(selectedPeriod);
        startDate = startOfYear(new Date(year, 0));
        endDate = endOfYear(new Date(year, 0));
      }

      // Buscar transações do período
      const { transactions } = await transactionService.getFiltered({
        startDate,
        endDate,
      });

      // Processar dados do relatório
      const reportData = await processReportData(transactions, propertiesData, clientsData, startDate, endDate);
      setReportData(reportData);

    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const processReportData = async (
    transactions: Transaction[], 
    properties: Property[], 
    clients: Client[],
    startDate: Date,
    endDate: Date
  ): Promise<ReportData> => {
    // Calcular totais
    const totalIncome = transactions
      .filter(t => t.type === 'income' && t.status === 'completed')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpenses = transactions
      .filter(t => t.type === 'expense' && t.status === 'completed')
      .reduce((sum, t) => sum + t.amount, 0);

    const netProfit = totalIncome - totalExpenses;

    // Agrupar por propriedade
    const byProperty: ReportData['byProperty'] = {};
    transactions.forEach(t => {
      if (t.propertyId && t.status === 'completed') {
        if (!byProperty[t.propertyId]) {
          byProperty[t.propertyId] = { income: 0, expenses: 0, profit: 0 };
        }
        if (t.type === 'income') {
          byProperty[t.propertyId].income += t.amount;
        } else {
          byProperty[t.propertyId].expenses += t.amount;
        }
        byProperty[t.propertyId].profit = byProperty[t.propertyId].income - byProperty[t.propertyId].expenses;
      }
    });

    // Agrupar por categoria
    const byCategory: ReportData['byCategory'] = {};
    transactions
      .filter(t => t.status === 'completed')
      .forEach(t => {
        if (!byCategory[t.category]) {
          byCategory[t.category] = 0;
        }
        byCategory[t.category] += t.amount;
      });

    // Top clientes
    const clientTotals: { [clientId: string]: { total: number; count: number } } = {};
    transactions
      .filter(t => t.type === 'income' && t.status === 'completed' && t.clientId)
      .forEach(t => {
        if (!clientTotals[t.clientId!]) {
          clientTotals[t.clientId!] = { total: 0, count: 0 };
        }
        clientTotals[t.clientId!].total += t.amount;
        clientTotals[t.clientId!].count++;
      });

    const topClients = Object.entries(clientTotals)
      .map(([clientId, data]) => ({
        clientId,
        name: clients.find(c => c.id === clientId)?.name || 'Cliente',
        total: data.total,
        transactions: data.count,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    // Taxa de ocupação (simplificada)
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const occupiedDays = transactions
      .filter(t => t.type === 'income' && t.category === 'reservation')
      .length * 3; // Assumindo 3 dias por reserva em média
    const occupancyRate = (occupiedDays / (totalDays * properties.length)) * 100;

    // Taxa de crescimento (comparado com período anterior)
    const previousPeriodStart = subMonths(startDate, 1);
    const previousPeriodEnd = subMonths(endDate, 1);
    const previousTransactions = await transactionService.getAll();
    const previousIncome = previousTransactions
      .filter(t => {
        const tDate = t.date instanceof Date ? t.date : new Date(t.date);
        return t.type === 'income' && 
               t.status === 'completed' &&
               tDate >= previousPeriodStart && 
               tDate <= previousPeriodEnd;
      })
      .reduce((sum, t) => sum + t.amount, 0);
    
    const growthRate = previousIncome > 0 
      ? Math.round(((totalIncome - previousIncome) / previousIncome) * 100 * 10) / 10
      : 0;

    return {
      period: format(startDate, 'MMMM yyyy', { locale: ptBR }),
      totalIncome,
      totalExpenses,
      netProfit,
      transactions,
      byProperty,
      byCategory,
      topClients,
      occupancyRate,
      growthRate,
    };
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const handleExport = (format: 'pdf' | 'excel') => {
    // Implementar exportação
    console.log(`Exportando relatório em formato ${format}`);
  };

  const getAvailablePeriods = () => {
    const periods = [];
    const now = new Date();

    if (reportType === 'monthly') {
      for (let i = 0; i < 12; i++) {
        const date = subMonths(now, i);
        periods.push({
          value: format(date, 'yyyy-MM'),
          label: format(date, 'MMMM yyyy', { locale: ptBR }),
        });
      }
    } else if (reportType === 'quarterly') {
      const currentYear = now.getFullYear();
      const currentQuarter = Math.floor(now.getMonth() / 3) + 1;
      
      for (let year = currentYear; year >= currentYear - 2; year--) {
        for (let q = 4; q >= 1; q--) {
          if (year === currentYear && q > currentQuarter) continue;
          periods.push({
            value: `${year}-Q${q}`,
            label: `${q}º Trimestre ${year}`,
          });
        }
      }
    } else {
      const currentYear = now.getFullYear();
      for (let year = currentYear; year >= currentYear - 5; year--) {
        periods.push({
          value: year.toString(),
          label: year.toString(),
        });
      }
    }

    return periods;
  };

  if (loading || !reportData) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <LinearProgress sx={{ width: '50%' }} />
      </Box>
    );
  }

  // Preparar dados para gráficos - usando dados reais
  const monthlyData = reportData?.monthlyRevenue?.map((revenue, index) => {
    const date = subMonths(new Date(), (reportData?.monthlyRevenue?.length || 1) - 1 - index);
    const expenses = reportData?.monthlyExpenses?.[index] || 0;
    return {
      month: format(date, 'MMM', { locale: ptBR }),
      receitas: revenue,
      despesas: expenses,
    };
  }) || [];

  const categoryData = Object.entries(reportData.byCategory)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const propertyPerformance = Object.entries(reportData?.byProperty || {})
    .map(([propertyId, data]) => ({
      name: properties.find(p => p.id === propertyId)?.title || 'Propriedade',
      ...data,
    }))
    .sort((a, b) => b.profit - a.profit);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" fontWeight={600}>
          Relatórios Financeiros
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Tooltip title="Exportar PDF">
            <IconButton onClick={() => handleExport('pdf')}>
              <Print />
            </IconButton>
          </Tooltip>
          <Tooltip title="Exportar Excel">
            <IconButton onClick={() => handleExport('excel')}>
              <Download />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Seleção de Período */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <ToggleButtonGroup
          value={reportType}
          exclusive
          onChange={(_, newType) => newType && setReportType(newType)}
          size="small"
        >
          <ToggleButton value="monthly">Mensal</ToggleButton>
          <ToggleButton value="quarterly">Trimestral</ToggleButton>
          <ToggleButton value="yearly">Anual</ToggleButton>
        </ToggleButtonGroup>

        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Período</InputLabel>
          <Select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            label="Período"
          >
            {getAvailablePeriods().map(period => (
              <MenuItem key={period.value} value={period.value}>
                {period.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {/* KPI Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom variant="body2">
                    Receita Total
                  </Typography>
                  <Typography variant="h5" fontWeight={600} color="success.main">
                    {formatCurrency(reportData?.totalIncome || 0)}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                    <TrendingUp sx={{ fontSize: 16, color: 'success.main', mr: 0.5 }} />
                    <Typography variant="caption" color="success.main">
                      +{reportData?.growthRate || 0}% vs período anterior
                    </Typography>
                  </Box>
                </Box>
                <ArrowUpward sx={{ color: 'success.main', fontSize: 32 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom variant="body2">
                    Despesas
                  </Typography>
                  <Typography variant="h5" fontWeight={600} color="error.main">
                    {formatCurrency(reportData?.totalExpenses || 0)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    {reportData?.totalIncome ? ((reportData.totalExpenses / reportData.totalIncome) * 100).toFixed(1) : '0'}% da receita
                  </Typography>
                </Box>
                <ArrowDownward sx={{ color: 'error.main', fontSize: 32 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom variant="body2">
                    Lucro Líquido
                  </Typography>
                  <Typography variant="h5" fontWeight={600} color="primary.main">
                    {formatCurrency(reportData?.netProfit || 0)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    Margem: {reportData?.totalIncome ? ((reportData.netProfit / reportData.totalIncome) * 100).toFixed(1) : '0'}%
                  </Typography>
                </Box>
                <AttachMoney sx={{ color: 'primary.main', fontSize: 32 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom variant="body2">
                    Taxa de Ocupação
                  </Typography>
                  <Typography variant="h5" fontWeight={600}>
                    {reportData?.occupancyRate?.toFixed(1) || '0'}%
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    {properties.length} propriedades
                  </Typography>
                </Box>
                <Home sx={{ color: 'text.secondary', fontSize: 32 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Gráficos */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Evolução Mensal
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <ChartTooltip formatter={(value: number) => formatCurrency(value)} />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="receitas"
                    stackId="1"
                    stroke="#10b981"
                    fill="#10b981"
                    fillOpacity={0.6}
                  />
                  <Area
                    type="monotone"
                    dataKey="despesas"
                    stackId="2"
                    stroke="#ef4444"
                    fill="#ef4444"
                    fillOpacity={0.6}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Receitas por Categoria
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <ChartTooltip formatter={(value: number) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabelas */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Desempenho por Propriedade
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Propriedade</TableCell>
                      <TableCell align="right">Receita</TableCell>
                      <TableCell align="right">Despesa</TableCell>
                      <TableCell align="right">Lucro</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {propertyPerformance.map((property) => (
                      <TableRow key={property.name}>
                        <TableCell>{property.name}</TableCell>
                        <TableCell align="right" sx={{ color: 'success.main' }}>
                          {formatCurrency(property.income)}
                        </TableCell>
                        <TableCell align="right" sx={{ color: 'error.main' }}>
                          {formatCurrency(property.expenses)}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600 }}>
                          {formatCurrency(property.profit)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Top 10 Clientes
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Cliente</TableCell>
                      <TableCell align="center">Transações</TableCell>
                      <TableCell align="right">Total</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {reportData?.topClients?.map((client, index) => (
                      <TableRow key={client.clientId}>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Person sx={{ fontSize: 20, color: 'text.secondary' }} />
                            {client.name}
                          </Box>
                        </TableCell>
                        <TableCell align="center">
                          <Chip label={client.transactions} size="small" />
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600 }}>
                          {formatCurrency(client.total)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}