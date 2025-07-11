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
  Tabs,
  Tab,
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
  Button,
  ToggleButton,
  ToggleButtonGroup, Alert,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  AttachMoney,
  CalendarMonth,
  Home,
  People,
  ShowChart,
  Assessment,
  Download,
  Refresh,
  DateRange,
  BarChart,
  PieChart,
  Timeline,
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart as RechartsBarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import FinancialGoals from '@/components/dashboard/goals/FinancialGoals';

// Mock data for charts
const revenueData = [
  { month: 'Jan', revenue: 42000, reservations: 28 },
  { month: 'Fev', revenue: 38000, reservations: 24 },
  { month: 'Mar', revenue: 45000, reservations: 32 },
  { month: 'Abr', revenue: 52000, reservations: 38 },
  { month: 'Mai', revenue: 48000, reservations: 35 },
  { month: 'Jun', revenue: 58000, reservations: 42 },
];

const propertyPerformance = [
  { name: 'Casa na Praia - Ipanema', revenue: 18500, occupancy: 85, rating: 4.8 },
  { name: 'Apt Vista Mar - Copacabana', revenue: 12300, occupancy: 78, rating: 4.6 },
  { name: 'Villa Luxo - Búzios', revenue: 22000, occupancy: 92, rating: 4.9 },
  { name: 'Studio Centro - Leblon', revenue: 8500, occupancy: 65, rating: 4.5 },
  { name: 'Cobertura - Barra', revenue: 15200, occupancy: 73, rating: 4.7 },
];

const paymentMethodsData = [
  { name: 'PIX', value: 45, color: '#00875A' },
  { name: 'Cartão Crédito', value: 30, color: '#1976D2' },
  { name: 'Cartão Débito', value: 15, color: '#42A5F5' },
  { name: 'Transferência', value: 10, color: '#90CAF9' },
];

const sourceData = [
  { source: 'WhatsApp AI', bookings: 145, revenue: 87500 },
  { source: 'Website', bookings: 52, revenue: 31200 },
  { source: 'Manual', bookings: 23, revenue: 13800 },
  { source: 'Parceiros', bookings: 18, revenue: 10800 },
];

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`analytics-tabpanel-${index}`}
      aria-labelledby={`analytics-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

export default function AnalyticsPage() {
  const [period, setPeriod] = useState('month');
  const [activeTab, setActiveTab] = useState(0);
  const [viewType, setViewType] = useState<'chart' | 'table'>('chart');
  const [loading, setLoading] = useState(false);

  const refreshData = async () => {
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setLoading(false);
  };

  const totalRevenue = revenueData.reduce((sum, item) => sum + item.revenue, 0);
  const totalReservations = revenueData.reduce((sum, item) => sum + item.reservations, 0);
  const averageTicket = totalRevenue / totalReservations;
  const lastMonthRevenue = revenueData[revenueData.length - 2].revenue;
  const currentMonthRevenue = revenueData[revenueData.length - 1].revenue;
  const revenueGrowth = ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100;

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" fontWeight="bold">
          Analytics & Financeiro
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Período</InputLabel>
            <Select value={period} onChange={(e) => setPeriod(e.target.value)} label="Período">
              <MenuItem value="week">Última Semana</MenuItem>
              <MenuItem value="month">Último Mês</MenuItem>
              <MenuItem value="quarter">Último Trimestre</MenuItem>
              <MenuItem value="year">Último Ano</MenuItem>
            </Select>
          </FormControl>
          <Button
            variant="outlined"
            startIcon={<Download />}
            onClick={() => {/* Export logic */}}
          >
            Exportar
          </Button>
          <IconButton onClick={refreshData} disabled={loading}>
            <Refresh />
          </IconButton>
        </Box>
      </Box>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* KPI Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={2}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Receita Total
                  </Typography>
                  <Typography variant="h4" fontWeight="bold">
                    R$ {(totalRevenue / 1000).toFixed(1)}k
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                    <TrendingUp color="success" fontSize="small" />
                    <Typography variant="body2" color="success.main" sx={{ ml: 0.5 }}>
                      +{revenueGrowth.toFixed(1)}%
                    </Typography>
                  </Box>
                </Box>
                <AttachMoney color="primary" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={2}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Total de Reservas
                  </Typography>
                  <Typography variant="h4" fontWeight="bold">
                    {totalReservations}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                    <TrendingUp color="success" fontSize="small" />
                    <Typography variant="body2" color="success.main" sx={{ ml: 0.5 }}>
                      +12.5%
                    </Typography>
                  </Box>
                </Box>
                <CalendarMonth color="secondary" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={2}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Ticket Médio
                  </Typography>
                  <Typography variant="h4" fontWeight="bold">
                    R$ {averageTicket.toFixed(0)}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                    <TrendingDown color="error" fontSize="small" />
                    <Typography variant="body2" color="error.main" sx={{ ml: 0.5 }}>
                      -3.2%
                    </Typography>
                  </Box>
                </Box>
                <ShowChart color="warning" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={2}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Taxa de Ocupação
                  </Typography>
                  <Typography variant="h4" fontWeight="bold">
                    78.5%
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                    <TrendingUp color="success" fontSize="small" />
                    <Typography variant="body2" color="success.main" sx={{ ml: 0.5 }}>
                      +5.8%
                    </Typography>
                  </Box>
                </Box>
                <Home color="success" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Analytics Tabs */}
      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
            <Tab label="Receita" icon={<AttachMoney />} iconPosition="start" />
            <Tab label="Propriedades" icon={<Home />} iconPosition="start" />
            <Tab label="Métodos de Pagamento" icon={<Assessment />} iconPosition="start" />
            <Tab label="Origem das Reservas" icon={<People />} iconPosition="start" />
            <Tab label="Metas Financeiras" icon={<ShowChart />} iconPosition="start" />
          </Tabs>
        </Box>

        <CardContent>
          {/* Revenue Tab */}
          <TabPanel value={activeTab} index={0}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
              <ToggleButtonGroup
                value={viewType}
                exclusive
                onChange={(_, newValue) => newValue && setViewType(newValue)}
                size="small"
              >
                <ToggleButton value="chart">
                  <BarChart />
                </ToggleButton>
                <ToggleButton value="table">
                  <DateRange />
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>

            {viewType === 'chart' ? (
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR')}`} />
                  <Legend />
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="revenue"
                    stroke="#1976D2"
                    fill="#1976D2"
                    fillOpacity={0.6}
                    name="Receita"
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="reservations"
                    stroke="#F57C00"
                    name="Reservas"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Mês</TableCell>
                      <TableCell align="right">Receita</TableCell>
                      <TableCell align="right">Reservas</TableCell>
                      <TableCell align="right">Ticket Médio</TableCell>
                      <TableCell align="right">Variação</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {revenueData.map((row, index) => (
                      <TableRow key={row.month}>
                        <TableCell>{row.month}</TableCell>
                        <TableCell align="right">R$ {row.revenue.toLocaleString('pt-BR')}</TableCell>
                        <TableCell align="right">{row.reservations}</TableCell>
                        <TableCell align="right">R$ {(row.revenue / row.reservations).toFixed(0)}</TableCell>
                        <TableCell align="right">
                          {index > 0 && (
                            <Chip
                              label={`${((row.revenue - revenueData[index - 1].revenue) / revenueData[index - 1].revenue * 100).toFixed(1)}%`}
                              color={row.revenue > revenueData[index - 1].revenue ? 'success' : 'error'}
                              size="small"
                            />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </TabPanel>

          {/* Properties Performance Tab */}
          <TabPanel value={activeTab} index={1}>
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Propriedade</TableCell>
                    <TableCell align="right">Receita</TableCell>
                    <TableCell align="right">Taxa de Ocupação</TableCell>
                    <TableCell align="right">Avaliação</TableCell>
                    <TableCell align="right">Performance</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {propertyPerformance.map((property) => (
                    <TableRow key={property.name}>
                      <TableCell>{property.name}</TableCell>
                      <TableCell align="right">R$ {property.revenue.toLocaleString('pt-BR')}</TableCell>
                      <TableCell align="right">
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                          <LinearProgress
                            variant="determinate"
                            value={property.occupancy}
                            sx={{ width: 100, mr: 1 }}
                          />
                          {property.occupancy}%
                        </Box>
                      </TableCell>
                      <TableCell align="right">
                        <Chip label={`★ ${property.rating}`} size="small" color="primary" />
                      </TableCell>
                      <TableCell align="right">
                        {property.occupancy > 80 ? (
                          <Chip label="Excelente" color="success" size="small" />
                        ) : property.occupancy > 60 ? (
                          <Chip label="Bom" color="primary" size="small" />
                        ) : (
                          <Chip label="Atenção" color="warning" size="small" />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </TabPanel>

          {/* Payment Methods Tab */}
          <TabPanel value={activeTab} index={2}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPieChart>
                    <Pie
                      data={paymentMethodsData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => `${entry.name}: ${entry.value}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {paymentMethodsData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>
                  Detalhamento de Pagamentos
                </Typography>
                {paymentMethodsData.map((method) => (
                  <Box key={method.name} sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2">{method.name}</Typography>
                      <Typography variant="body2" fontWeight="bold">{method.value}%</Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={method.value}
                      sx={{
                        height: 8,
                        borderRadius: 4,
                        '& .MuiLinearProgress-bar': {
                          backgroundColor: method.color,
                        },
                      }}
                    />
                  </Box>
                ))}
              </Grid>
            </Grid>
          </TabPanel>

          {/* Booking Sources Tab */}
          <TabPanel value={activeTab} index={3}>
            <ResponsiveContainer width="100%" height={400}>
              <RechartsBarChart data={sourceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="source" />
                <YAxis yAxisId="left" orientation="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Bar yAxisId="left" dataKey="revenue" fill="#1976D2" name="Receita (R$)" />
                <Bar yAxisId="right" dataKey="bookings" fill="#F57C00" name="Reservas" />
              </RechartsBarChart>
            </ResponsiveContainer>

            <Box sx={{ mt: 3 }}>
              <Typography variant="h6" gutterBottom>
                Insights
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Alert severity="success">
                    O WhatsApp AI é responsável por <strong>62%</strong> das reservas e <strong>68%</strong> da receita total.
                  </Alert>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Alert severity="info">
                    A taxa de conversão do WhatsApp AI é <strong>3x maior</strong> que outros canais.
                  </Alert>
                </Grid>
              </Grid>
            </Box>
          </TabPanel>

          {/* Financial Goals Tab */}
          <TabPanel value={activeTab} index={4}>
            <FinancialGoals />
          </TabPanel>
        </CardContent>
      </Card>
    </Box>
  );
}