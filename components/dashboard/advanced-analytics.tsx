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
  InputLabel
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

// Advanced Analytics Dashboard Component
export default function AdvancedAnalytics() {
  const [timeRange, setTimeRange] = useState('30d');
  const [loading, setLoading] = useState(false);

  // Mock data - seria substituído por dados reais do Firebase
  const revenueData = [
    { month: 'Jan', revenue: 15000, bookings: 12, occupancy: 75 },
    { month: 'Fev', revenue: 18000, bookings: 15, occupancy: 82 },
    { month: 'Mar', revenue: 22000, bookings: 18, occupancy: 88 },
    { month: 'Abr', revenue: 19000, bookings: 16, occupancy: 79 },
    { month: 'Mai', revenue: 25000, bookings: 20, occupancy: 92 },
    { month: 'Jun', revenue: 28000, bookings: 22, occupancy: 95 }
  ];

  const propertyPerformance = [
    { name: 'Casa na Praia', revenue: 12000, bookings: 8, rating: 4.9, occupancy: 95 },
    { name: 'Apartamento Centro', revenue: 9500, bookings: 12, rating: 4.7, occupancy: 88 },
    { name: 'Cobertura Vista Mar', revenue: 15000, bookings: 5, rating: 5.0, occupancy: 92 },
    { name: 'Loft Moderno', revenue: 7800, bookings: 9, rating: 4.6, occupancy: 76 }
  ];

  const customerSegments = [
    { name: 'Famílias', value: 45, color: '#8884d8' },
    { name: 'Casais', value: 30, color: '#82ca9d' },
    { name: 'Viagem Negócios', value: 15, color: '#ffc658' },
    { name: 'Grupos Amigos', value: 10, color: '#ff7300' }
  ];

  const conversationMetrics = [
    { day: 'Seg', messages: 45, conversions: 8, responseTime: 1.2 },
    { day: 'Ter', messages: 52, conversions: 11, responseTime: 0.9 },
    { day: 'Qua', messages: 38, conversions: 7, responseTime: 1.5 },
    { day: 'Qui', messages: 61, conversions: 14, responseTime: 0.8 },
    { day: 'Sex', messages: 73, conversions: 16, responseTime: 1.1 },
    { day: 'Sáb', messages: 89, conversions: 22, responseTime: 1.3 },
    { day: 'Dom', messages: 67, conversions: 18, responseTime: 1.0 }
  ];

  const aiPerformanceMetrics = {
    totalConversations: 1247,
    successfulBookings: 186,
    conversionRate: 14.9,
    avgResponseTime: 1.1,
    customerSatisfaction: 4.8,
    autoResolutionRate: 78.5
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

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
                  {aiPerformanceMetrics.successfulBookings}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Reservas Fechadas
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Revenue and Bookings Trend */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Tendência de Receita e Reservas
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <RechartsTooltip 
                    formatter={(value, name) => [
                      name === 'revenue' ? formatCurrency(value as number) : value,
                      name === 'revenue' ? 'Receita' : name === 'bookings' ? 'Reservas' : 'Ocupação (%)'
                    ]}
                  />
                  <Legend />
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="revenue"
                    stackId="1"
                    stroke="#8884d8"
                    fill="#8884d8"
                    fillOpacity={0.3}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="bookings"
                    stroke="#82ca9d"
                    strokeWidth={3}
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
                Segmentação de Clientes
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={customerSegments}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
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

      {/* Conversation Performance */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Performance de Conversações por Dia da Semana
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={conversationMetrics}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <RechartsTooltip />
                  <Legend />
                  <Bar yAxisId="left" dataKey="messages" fill="#8884d8" name="Mensagens" />
                  <Bar yAxisId="left" dataKey="conversions" fill="#82ca9d" name="Conversões" />
                  <Line yAxisId="right" dataKey="responseTime" stroke="#ff7300" name="Tempo Resposta (s)" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Property Performance Table */}
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Performance por Propriedade
              </Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Propriedade</TableCell>
                      <TableCell align="right">Receita</TableCell>
                      <TableCell align="right">Reservas</TableCell>
                      <TableCell align="right">Avaliação</TableCell>
                      <TableCell align="right">Ocupação</TableCell>
                      <TableCell align="right">Performance</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {propertyPerformance.map((property, index) => (
                      <TableRow key={property.name}>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Avatar sx={{ bgcolor: 'primary.main' }}>
                              <Home />
                            </Avatar>
                            <Typography variant="body2" fontWeight="medium">
                              {property.name}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" fontWeight="bold">
                            {formatCurrency(property.revenue)}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Chip 
                            label={property.bookings} 
                            color="primary" 
                            size="small" 
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, justifyContent: 'flex-end' }}>
                            <Star sx={{ fontSize: 16, color: 'warning.main' }} />
                            <Typography variant="body2">
                              {property.rating}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell align="right">
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'flex-end' }}>
                            <LinearProgress
                              variant="determinate"
                              value={property.occupancy}
                              sx={{ width: 60, height: 8, borderRadius: 4 }}
                            />
                            <Typography variant="body2">
                              {property.occupancy}%
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell align="right">
                          {property.occupancy >= 90 ? (
                            <Chip label="Excelente" color="success" size="small" />
                          ) : property.occupancy >= 80 ? (
                            <Chip label="Bom" color="primary" size="small" />
                          ) : (
                            <Chip label="Melhorar" color="warning" size="small" />
                          )}
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