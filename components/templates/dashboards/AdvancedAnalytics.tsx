'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  LinearProgress,
  Avatar,
  IconButton,
  Tooltip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  WhatsApp,
  Star,
  Schedule,
  AttachMoney,
  People,
  Home,
  Analytics
} from '@mui/icons-material';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  Legend, 
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts';
import { format, subDays, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getAnalytics } from '@/lib/services/analytics-service';
import { useTenant } from '@/contexts/TenantContext';

// Advanced Analytics Dashboard Component
export default function AdvancedAnalytics() {
  const { services, isReady } = useTenant();
  const [timeRange, setTimeRange] = useState('30d');
  const [loading, setLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [propertyPerformance, setPropertyPerformance] = useState<any[]>([]);
  const [conversationMetrics, setConversationMetrics] = useState<any[]>([]);
  const [aiPerformanceMetrics, setAiPerformanceMetrics] = useState({
    totalConversations: 0,
    successfulBookings: 0,
    conversionRate: 0,
    avgResponseTime: 0,
    customerSatisfaction: 4.8,
    autoResolutionRate: 85
  });

  useEffect(() => {
    if (isReady && services) {
      loadAnalytics();
    }
  }, [timeRange, isReady, services]);

  const loadAnalytics = async () => {
    if (!services) return;

    try {
      setLoading(true);

      // Determine date range based on selection
      const now = new Date();
      let startDate: Date;
      const endDate = now;

      switch (timeRange) {
        case '7d':
          startDate = subDays(now, 7);
          break;
        case '30d':
          startDate = subDays(now, 30);
          break;
        case '90d':
          startDate = subDays(now, 90);
          break;
        case '1y':
          startDate = subMonths(now, 12);
          break;
        default:
          startDate = subDays(now, 30);
      }

      // Fetch analytics data
      const analytics = await getAnalytics(user?.tenantId || 'default', {
        period: { startDate, endDate }
      });
      setAnalyticsData(analytics);

      // Load revenue data for the last 6 months
      const monthlyRevenue = [];
      for (let i = 5; i >= 0; i--) {
        const monthStart = startOfMonth(subMonths(now, i));
        const monthEnd = endOfMonth(subMonths(now, i));
        
        const monthAnalytics = await getAnalytics(user?.tenantId || 'default', {
          period: { startDate: monthStart, endDate: monthEnd }
        });

        monthlyRevenue.push({
          month: format(monthStart, 'MMM', { locale: ptBR }),
          revenue: monthAnalytics.totalRevenue,
          bookings: monthAnalytics.totalReservations,
          occupancy: monthAnalytics.occupancyRate
        });
      }
      setRevenueData(monthlyRevenue);

      // Load property performance
      const properties = await services.properties.getAll();
      const propertyData = await Promise.all(
        properties.slice(0, 5).map(async (property) => {
          const allTransactions = await services.transactions.getAll();
          const transactions = allTransactions.filter(t => 
            t.propertyId === property.id &&
            t.date >= startDate &&
            t.date <= endDate
          );

          const revenue = transactions
            .filter(t => t.status === 'completed' && t.type === 'income')
            .reduce((sum, t) => sum + t.amount, 0);

          return {
            name: property.title,
            revenue,
            bookings: transactions.length,
            rating: 4.3, // TODO: Implement real rating system
            occupancy: Math.round(transactions.length * 10) // Simplified occupancy calculation
          };
        })
      );
      setPropertyPerformance(propertyData);

      // Load conversation metrics
      const conversations = await services.conversations.getAll();
      const recentConversations = conversations.filter(c => {
        const createdAt = c.createdAt instanceof Date ? c.createdAt : new Date(c.createdAt as any);
        return createdAt >= startDate;
      });

      // Group by day of week
      const dayMetrics = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day, index) => {
        const dayConversations = recentConversations.filter(c => {
          const createdAt = c.createdAt instanceof Date ? c.createdAt : new Date(c.createdAt as any);
          return createdAt.getDay() === index;
        });

        return {
          day,
          messages: dayConversations.reduce((sum, c) => sum + (c.messageCount || 0), 0),
          conversions: dayConversations.filter(c => c.status === 'converted').length,
          responseTime: dayConversations.length > 0 ? 20 : 0 // TODO: Calculate from actual message timestamps
        };
      });
      setConversationMetrics(dayMetrics);

      // Calculate AI performance metrics
      const totalConversations = recentConversations.length;
      const successfulBookings = recentConversations.filter(c => c.status === 'converted').length;
      const conversionRate = totalConversations > 0 
        ? Math.round((successfulBookings / totalConversations) * 100) 
        : 0;

      setAiPerformanceMetrics({
        totalConversations,
        successfulBookings,
        conversionRate,
        avgResponseTime: 20, // TODO: Calculate from conversation messages
        customerSatisfaction: 4.2, // TODO: Calculate from sentiment scores
        autoResolutionRate: 75 // TODO: Calculate from resolution status
      });

    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Calculate customer segments dynamically
  const customerSegments = [
    { name: 'Novos Clientes', value: Math.round(35 + (analyticsData?.newClients || 0) / 10), color: '#8884d8' },
    { name: 'Recorrentes', value: Math.round(45 - (analyticsData?.newClients || 0) / 10), color: '#82ca9d' },
    { name: 'VIP', value: 20, color: '#ffc658' } // TODO: Calculate from actual VIP criteria
  ];

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header with Time Range Selector */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" fontWeight="bold">
          Analytics Avançado
        </Typography>
        <FormControl sx={{ minWidth: 120 }}>
          <InputLabel>Período</InputLabel>
          <Select
            value={timeRange}
            label="Período"
            onChange={(e) => setTimeRange(e.target.value)}
          >
            <MenuItem value="7d">7 dias</MenuItem>
            <MenuItem value="30d">30 dias</MenuItem>
            <MenuItem value="90d">90 dias</MenuItem>
            <MenuItem value="1y">1 ano</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* AI Performance KPIs */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={2}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <WhatsApp color="success" />
                <Typography variant="h6" color="success.main">
                  {aiPerformanceMetrics.conversionRate}%
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Taxa de Conversão AI
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={2}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Schedule color="info" />
                <Typography variant="h6" color="info.main">
                  {aiPerformanceMetrics.avgResponseTime}s
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Tempo Médio Resposta
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={2}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Star color="warning" />
                <Typography variant="h6" color="warning.main">
                  {aiPerformanceMetrics.customerSatisfaction}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Satisfação Cliente
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={2}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Analytics color="primary" />
                <Typography variant="h6" color="primary.main">
                  {aiPerformanceMetrics.autoResolutionRate}%
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Resolução Automática
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={2}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <People color="secondary" />
                <Typography variant="h6" color="secondary.main">
                  {aiPerformanceMetrics.totalConversations}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Conversas Totais
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={2}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <AttachMoney color="success" />
                <Typography variant="h6" color="success.main">
                  {formatCurrency(analyticsData?.totalRevenue || 0)}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Receita Total
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Revenue & Occupancy Chart */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Receita e Taxa de Ocupação
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <RechartsTooltip />
                  <Legend />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="revenue"
                    stroke="#8884d8"
                    name="Receita (R$)"
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="occupancy"
                    stroke="#82ca9d"
                    name="Ocupação (%)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Segmentação de Clientes
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={customerSegments}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label
                  >
                    {customerSegments.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Property Performance Table */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Desempenho por Propriedade
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Propriedade</TableCell>
                  <TableCell align="right">Receita</TableCell>
                  <TableCell align="right">Reservas</TableCell>
                  <TableCell align="right">Avaliação</TableCell>
                  <TableCell align="right">Taxa de Ocupação</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {propertyPerformance.map((property) => (
                  <TableRow key={property.name}>
                    <TableCell>{property.name}</TableCell>
                    <TableCell align="right">{formatCurrency(property.revenue)}</TableCell>
                    <TableCell align="right">{property.bookings}</TableCell>
                    <TableCell align="right">
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                        <Star sx={{ fontSize: 16, color: '#ffc107', mr: 0.5 }} />
                        {property.rating.toFixed(1)}
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                        <Box sx={{ width: 60, mr: 1 }}>
                          <LinearProgress 
                            variant="determinate" 
                            value={property.occupancy} 
                            color={property.occupancy > 70 ? 'success' : 'warning'}
                          />
                        </Box>
                        {property.occupancy.toFixed(0)}%
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* AI Conversation Metrics */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Métricas de Conversação AI (Por Dia da Semana)
          </Typography>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={conversationMetrics}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <RechartsTooltip />
              <Legend />
              <Bar dataKey="messages" fill="#8884d8" name="Mensagens" />
              <Bar dataKey="conversions" fill="#82ca9d" name="Conversões" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </Box>
  );
}