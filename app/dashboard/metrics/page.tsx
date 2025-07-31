'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import type { Lead } from '@/lib/types/crm';
import type { Property } from '@/lib/types/property';
import type { Reservation } from '@/lib/types/reservation';
import type { Conversation } from '@/lib/types/conversation';;
import {
  Box,
  Typography,
  Card,
  Grid,
  Tabs,
  Tab,
  Button,
  Chip,
  Avatar,
  IconButton,
  Alert,
  LinearProgress,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Paper,
  Stack,
  Tooltip,
  CircularProgress,
} from '@mui/material';
import {
  Assessment,
  TrendingUp,
  TrendingDown,
  LocationOn,
  AttachMoney,
  People,
  Home,
  CalendarMonth,
  Chat,
  Insights,
  AutoGraph,
  Analytics,
  PieChart,
  BarChart,
  ShowChart,
  Star,
  Favorite,
  Schedule,
  Event,
  Weekend,
  WbSunny,
  AcUnit,
  Pool,
  Wifi,
  LocalParking,
  Pets,
  Kitchen,
  Tv,
  FitnessCenter,
  Spa,
  Restaurant,
  LocalLaundryService,
  Balcony,
  Refresh,
} from '@mui/icons-material';
import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, LineChart, Line, Area, AreaChart, Legend } from 'recharts';
import { format, startOfMonth, endOfMonth, subMonths, isWeekend, isSameMonth, parseISO, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface MetricsData {
  properties: Property[];
  reservations: Reservation[];
  leads: Lead[];
  conversations: Conversation[];
}

interface AmenityInsight {
  name: string;
  icon: React.ReactNode;
  bookingRate: number;
  averagePrice: number;
  demandScore: number;
  properties: number;
}

interface SeasonalPattern {
  period: string;
  bookings: number;
  revenue: number;
  averagePrice: number;
  occupancyRate: number;
  growthRate: number;
}

interface LocationInsight {
  area: string;
  properties: number;
  averagePrice: number;
  bookingRate: number;
  priceGrowth: number;
  popularityScore: number;
}

interface ConversationInsight {
  topic: string;
  frequency: number;
  conversionRate: number;
  averageResponseTime: number;
  sentiment: 'positive' | 'neutral' | 'negative';
}

export default function MetricsPage() {
  const { services, isReady } = useTenant();
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState(0);
  const [metricsData, setMetricsData] = useState<MetricsData>({
    properties: [],
    reservations: [],
    leads: [],
    conversations: []
  });
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadAllData();
  }, [services, isReady]);

  const loadAllData = async (isRefresh = false) => {
    if (!services || !isReady) return;
    
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      console.log('📊 [Metrics] Carregando dados para análise...');
      
      const [properties, reservations, leads, conversations] = await Promise.all([
        services.properties.getAll(),
        services.reservations?.getAll() || [],
        services.leads.getAll(),
        services.conversations?.getAll() || []
      ]);

      setMetricsData({
        properties: properties || [],
        reservations: reservations || [],
        leads: leads || [],
        conversations: conversations || []
      });

      console.log('✅ [Metrics] Dados carregados:', {
        properties: properties?.length || 0,
        reservations: reservations?.length || 0,
        leads: leads?.length || 0,
        conversations: conversations?.length || 0
      });

    } catch (error) {
      console.error('❌ [Metrics] Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // 🏠 ANÁLISE DE COMODIDADES
  const amenityInsights = useMemo((): AmenityInsight[] => {
    const { properties, reservations } = metricsData;
    if (!properties.length) return [];

    const amenityMap = new Map<string, {
      properties: Property[],
      bookings: number,
      revenue: number
    }>();

    // Mapear comodidades para ícones
    const amenityIcons: Record<string, React.ReactNode> = {
      'Piscina': <Pool />,
      'Wi-Fi': <Wifi />,
      'Estacionamento': <LocalParking />,
      'Pet Friendly': <Pets />,
      'Cozinha': <Kitchen />,
      'TV': <Tv />,
      'Academia': <FitnessCenter />,
      'Spa': <Spa />,
      'Restaurante': <Restaurant />,
      'Lavanderia': <LocalLaundryService />,
      'Varanda': <Balcony />,
      'Ar Condicionado': <AcUnit />,
    };

    // Processar comodidades
    properties.forEach(property => {
      const amenities = property.amenities || [];
      amenities.forEach(amenity => {
        if (!amenityMap.has(amenity)) {
          amenityMap.set(amenity, { properties: [], bookings: 0, revenue: 0 });
        }
        amenityMap.get(amenity)!.properties.push(property);
      });
    });

    // Calcular métricas de reservas por comodidade
    reservations.forEach(reservation => {
      const property = properties.find(p => p.id === reservation.propertyId);
      if (property && reservation.status !== 'cancelled') {
        const amenities = property.amenities || [];
        amenities.forEach(amenity => {
          const data = amenityMap.get(amenity);
          if (data) {
            data.bookings++;
            data.revenue += reservation.totalAmount || 0;
          }
        });
      }
    });

    return Array.from(amenityMap.entries()).map(([name, data]) => {
      const bookingRate = data.properties.length > 0 ? (data.bookings / data.properties.length) : 0;
      const averagePrice = data.bookings > 0 ? (data.revenue / data.bookings) : 0;
      const demandScore = bookingRate * 100;

      return {
        name,
        icon: amenityIcons[name] || <Star />,
        bookingRate,
        averagePrice,
        demandScore,
        properties: data.properties.length
      };
    }).sort((a, b) => b.demandScore - a.demandScore);
  }, [metricsData]);

  // 📅 ANÁLISE SAZONAL
  const seasonalPatterns = useMemo((): SeasonalPattern[] => {
    const { reservations } = metricsData;
    if (!reservations.length) return [];

    const monthlyData = new Map<string, {
      bookings: number;
      revenue: number;
      totalNights: number;
    }>();

    reservations.forEach(reservation => {
      if (reservation.status === 'cancelled') return;
      
      const date = new Date(reservation.checkIn);
      const monthKey = format(date, 'yyyy-MM');
      
      if (!monthlyData.has(monthKey)) {
        monthlyData.set(monthKey, { bookings: 0, revenue: 0, totalNights: 0 });
      }
      
      const data = monthlyData.get(monthKey)!;
      data.bookings++;
      data.revenue += reservation.totalAmount || 0;
      data.totalNights += reservation.nights || 1;
    });

    const patterns = Array.from(monthlyData.entries()).map(([monthKey, data]) => {
      const averagePrice = data.bookings > 0 ? data.revenue / data.bookings : 0;
      const occupancyRate = Math.min((data.totalNights / 30) * 100, 100);
      
      return {
        period: format(parseISO(monthKey + '-01'), 'MMM yyyy', { locale: ptBR }),
        bookings: data.bookings,
        revenue: data.revenue,
        averagePrice,
        occupancyRate,
        growthRate: 0 // Calcular depois
      };
    }).sort((a, b) => b.revenue - a.revenue);

    // Calcular crescimento
    for (let i = 1; i < patterns.length; i++) {
      const current = patterns[i];
      const previous = patterns[i - 1];
      if (previous.revenue > 0) {
        current.growthRate = ((current.revenue - previous.revenue) / previous.revenue) * 100;
      }
    }

    return patterns;
  }, [metricsData]);

  // 📍 ANÁLISE DE LOCALIZAÇÃO
  const locationInsights = useMemo((): LocationInsight[] => {
    const { properties, reservations } = metricsData;
    if (!properties.length) return [];

    const locationMap = new Map<string, {
      properties: Property[],
      bookings: number,
      revenue: number,
      totalValue: number;
    }>();

    properties.forEach(property => {
      const area = property.address?.neighborhood || property.address?.city || 'Não informado';
      if (!locationMap.has(area)) {
        locationMap.set(area, { properties: [], bookings: 0, revenue: 0, totalValue: 0 });
      }
      const data = locationMap.get(area)!;
      data.properties.push(property);
      data.totalValue += property.basePrice || 0;
    });

    reservations.forEach(reservation => {
      const property = properties.find(p => p.id === reservation.propertyId);
      if (property && reservation.status !== 'cancelled') {
        const area = property.address?.neighborhood || property.address?.city || 'Não informado';
        const data = locationMap.get(area);
        if (data) {
          data.bookings++;
          data.revenue += reservation.totalAmount || 0;
        }
      }
    });

    return Array.from(locationMap.entries()).map(([area, data]) => {
      const averagePrice = data.properties.length > 0 ? data.totalValue / data.properties.length : 0;
      const bookingRate = data.properties.length > 0 ? data.bookings / data.properties.length : 0;
      const popularityScore = bookingRate * averagePrice / 100;

      return {
        area,
        properties: data.properties.length,
        averagePrice,
        bookingRate,
        priceGrowth: 0, // Calcular com dados históricos
        popularityScore
      };
    }).sort((a, b) => b.popularityScore - a.popularityScore);
  }, [metricsData]);

  // 💬 ANÁLISE DE CONVERSAS
  const conversationInsights = useMemo((): ConversationInsight[] => {
    const { conversations, leads } = metricsData;
    if (!conversations.length) return [];

    // Tópicos comuns (palavras-chave)
    const keywords = [
      { topic: 'Preço', keywords: ['preço', 'valor', 'caro', 'barato', 'desconto', 'promoção'] },
      { topic: 'Localização', keywords: ['localização', 'endereço', 'perto', 'longe', 'centro', 'praia'] },
      { topic: 'Comodidades', keywords: ['piscina', 'wifi', 'estacionamento', 'cozinha', 'ar condicionado'] },
      { topic: 'Disponibilidade', keywords: ['disponível', 'livre', 'reservar', 'agenda', 'data'] },
      { topic: 'Cancelamento', keywords: ['cancelar', 'desistir', 'mudança', 'problema'] }
    ];

    const topicStats = keywords.map(({ topic, keywords: keywordList }) => {
      let frequency = 0;
      let conversions = 0;
      let totalResponseTime = 0;
      let responseCount = 0;

      conversations.forEach(conversation => {
        const messages = conversation.messages || [];
        const hasKeywords = messages.some(message => 
          keywordList.some(keyword => 
            (message.content || '').toLowerCase().includes(keyword.toLowerCase())
          )
        );

        if (hasKeywords) {
          frequency++;
          
          // Verificar se converteu (cliente virou lead won)
          const lead = leads.find(l => l.phone === conversation.whatsappPhone);
          if (lead?.status === 'won') {
            conversions++;
          }

          // Calcular tempo de resposta médio
          for (let i = 1; i < messages.length; i++) {
            if (messages[i-1].sender === 'user' && messages[i].sender === 'agent') {
              const responseTime = new Date(messages[i].timestamp).getTime() - new Date(messages[i-1].timestamp).getTime();
              if (responseTime > 0 && responseTime < 3600000) { // Menos de 1 hora
                totalResponseTime += responseTime;
                responseCount++;
              }
            }
          }
        }
      });

      const conversionRate = frequency > 0 ? (conversions / frequency) * 100 : 0;
      const averageResponseTime = responseCount > 0 ? totalResponseTime / responseCount : 0;
      
      return {
        topic,
        frequency,
        conversionRate,
        averageResponseTime: Math.round(averageResponseTime / 60000), // minutos
        sentiment: conversionRate > 50 ? 'positive' as const : 
                  conversionRate > 20 ? 'neutral' as const : 'negative' as const
      };
    }).sort((a, b) => b.frequency - a.frequency);

    return topicStats;
  }, [metricsData]);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658'];

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Analisando dados...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ 
        display: 'flex', 
        flexDirection: { xs: 'column', sm: 'row' },
        justifyContent: 'space-between', 
        alignItems: { xs: 'stretch', sm: 'center' }, 
        mb: 3,
        gap: 2
      }}>
        <Box>
          <Typography variant="h4" component="h1" fontWeight={600} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Assessment color="primary" />
            Métricas Avançadas
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Insights de data science para otimização do negócio imobiliário
          </Typography>
        </Box>
        <Box sx={{ 
          display: 'flex', 
          gap: 2,
          alignItems: 'center'
        }}>
          <Button
            variant="outlined"
            startIcon={refreshing ? <CircularProgress size={20} /> : <Refresh />}
            onClick={() => loadAllData(true)}
            disabled={refreshing}
          >
            {refreshing ? 'Atualizando...' : 'Atualizar Dados'}
          </Button>
        </Box>
      </Box>

      {/* Data Overview */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={3}>
          <Card sx={{ p: 2, textAlign: 'center' }}>
            <Home sx={{ fontSize: 32, color: 'primary.main', mb: 1 }} />
            <Typography variant="h5" fontWeight={600}>{metricsData.properties.length}</Typography>
            <Typography variant="body2" color="text.secondary">Propriedades</Typography>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card sx={{ p: 2, textAlign: 'center' }}>
            <CalendarMonth sx={{ fontSize: 32, color: 'success.main', mb: 1 }} />
            <Typography variant="h5" fontWeight={600}>{metricsData.reservations.length}</Typography>
            <Typography variant="body2" color="text.secondary">Reservas</Typography>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card sx={{ p: 2, textAlign: 'center' }}>
            <People sx={{ fontSize: 32, color: 'warning.main', mb: 1 }} />
            <Typography variant="h5" fontWeight={600}>{metricsData.leads.length}</Typography>
            <Typography variant="body2" color="text.secondary">Leads</Typography>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card sx={{ p: 2, textAlign: 'center' }}>
            <Chat sx={{ fontSize: 32, color: 'info.main', mb: 1 }} />
            <Typography variant="h5" fontWeight={600}>{metricsData.conversations.length}</Typography>
            <Typography variant="body2" color="text.secondary">Conversas</Typography>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Card sx={{ mb: 3 }}>
        <Tabs 
          value={selectedTab} 
          onChange={(_, newValue) => setSelectedTab(newValue)}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label="🏠 Comodidades" />
          <Tab label="📅 Sazonalidade" />
          <Tab label="📍 Localização" />
          <Tab label="💬 Conversas" />
          <Tab label="📊 Insights" />
        </Tabs>
      </Card>

      {/* Tab Panels */}
      {selectedTab === 0 && (
        <Grid container spacing={3}>
          <Grid item xs={12} lg={8}>
            <Card sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Star color="primary" />
                Análise de Comodidades
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Comodidades mais demandadas e seu impacto nas reservas
              </Typography>
              
              <List>
                {amenityInsights.slice(0, 8).map((amenity, index) => (
                  <ListItem key={amenity.name} sx={{ px: 0 }}>
                    <ListItemIcon>
                      <Avatar sx={{ bgcolor: 'primary.light' }}>
                        {amenity.icon}
                      </Avatar>
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Typography variant="subtitle1" fontWeight={500}>
                            {amenity.name}
                          </Typography>
                          <Chip 
                            label={`${amenity.properties} propriedades`}
                            size="small"
                            color="primary"
                            variant="outlined"
                          />
                        </Box>
                      }
                      secondary={
                        <Box sx={{ mt: 1 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                            <Typography variant="caption" color="text.secondary">
                              Score de Demanda: {amenity.demandScore.toFixed(1)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Preço Médio: R$ {amenity.averagePrice.toLocaleString('pt-BR')}
                            </Typography>
                          </Box>
                          <LinearProgress 
                            variant="determinate" 
                            value={Math.min(amenity.demandScore, 100)} 
                            sx={{ height: 6, borderRadius: 3 }}
                          />
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </Card>
          </Grid>
          
          <Grid item xs={12} lg={4}>
            <Card sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Top 5 Comodidades
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <RechartsPieChart>
                  <Pie
                    data={amenityInsights.slice(0, 5).map((item, index) => ({
                      name: item.name,
                      value: item.demandScore,
                      fill: COLORS[index % COLORS.length]
                    }))}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value.toFixed(1)}`}
                  >
                    {amenityInsights.slice(0, 5).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                </RechartsPieChart>
              </ResponsiveContainer>
            </Card>
          </Grid>
        </Grid>
      )}

      {selectedTab === 1 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Event color="primary" />
                Padrões Sazonais de Reservas
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Análise temporal para identificar picos de demanda e oportunidades
              </Typography>
              
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={seasonalPatterns}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <RechartsTooltip />
                  <Legend />
                  <Area 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="revenue" 
                    stackId="1"
                    stroke="#8884d8" 
                    fill="#8884d8" 
                    fillOpacity={0.6}
                    name="Receita (R$)"
                  />
                  <Line 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="bookings" 
                    stroke="#82ca9d" 
                    name="Número de Reservas"
                    strokeWidth={3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </Card>
          </Grid>
          
          <Grid item xs={12}>
            <Grid container spacing={2}>
              {seasonalPatterns.slice(0, 6).map((pattern, index) => (
                <Grid item xs={12} sm={6} md={4} key={pattern.period}>
                  <Card sx={{ p: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="h6" fontWeight={600}>
                        {pattern.period}
                      </Typography>
                      <Chip 
                        label={pattern.growthRate > 0 ? `+${pattern.growthRate.toFixed(1)}%` : `${pattern.growthRate.toFixed(1)}%`}
                        color={pattern.growthRate > 0 ? 'success' : 'error'}
                        size="small"
                        icon={pattern.growthRate > 0 ? <TrendingUp /> : <TrendingDown />}
                      />
                    </Box>
                    <Stack spacing={1}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="text.secondary">Reservas:</Typography>
                        <Typography variant="body2" fontWeight={500}>{pattern.bookings}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="text.secondary">Receita:</Typography>
                        <Typography variant="body2" fontWeight={500}>R$ {pattern.revenue.toLocaleString('pt-BR')}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="text.secondary">Ocupação:</Typography>
                        <Typography variant="body2" fontWeight={500}>{pattern.occupancyRate.toFixed(1)}%</Typography>
                      </Box>
                    </Stack>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Grid>
        </Grid>
      )}

      {selectedTab === 2 && (
        <Grid container spacing={3}>
          <Grid item xs={12} lg={8}>
            <Card sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <LocationOn color="primary" />
                Performance por Localização
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Análise de demanda e precificação por região
              </Typography>
              
              <ResponsiveContainer width="100%" height={400}>
                <RechartsBarChart data={locationInsights}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="area" angle={-45} textAnchor="end" height={100} />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <RechartsTooltip />
                  <Legend />
                  <Bar yAxisId="left" dataKey="averagePrice" fill="#8884d8" name="Preço Médio (R$)" />
                  <Bar yAxisId="right" dataKey="bookingRate" fill="#82ca9d" name="Taxa de Reserva" />
                </RechartsBarChart>
              </ResponsiveContainer>
            </Card>
          </Grid>
          
          <Grid item xs={12} lg={4}>
            <Card sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Ranking de Localização
              </Typography>
              <List>
                {locationInsights.slice(0, 5).map((location, index) => (
                  <ListItem key={location.area} sx={{ px: 0 }}>
                    <ListItemIcon>
                      <Avatar sx={{ bgcolor: index < 3 ? 'warning.main' : 'grey.300' }}>
                        {index + 1}
                      </Avatar>
                    </ListItemIcon>
                    <ListItemText
                      primary={location.area}
                      secondary={
                        <Box>
                          <Typography variant="caption" display="block">
                            {location.properties} propriedades
                          </Typography>
                          <Typography variant="caption" color="success.main">
                            Score: {location.popularityScore.toFixed(2)}
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </Card>
          </Grid>
        </Grid>
      )}

      {selectedTab === 3 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Chat color="primary" />
                Insights de Conversas com IA
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Análise dos tópicos mais discutidos e taxa de conversão
              </Typography>
              
              <Grid container spacing={2}>
                {conversationInsights.map((insight, index) => (
                  <Grid item xs={12} sm={6} md={4} key={insight.topic}>
                    <Card sx={{ 
                      p: 2, 
                      border: '1px solid',
                      borderColor: insight.sentiment === 'positive' ? 'success.light' : 
                                  insight.sentiment === 'neutral' ? 'warning.light' : 'error.light'
                    }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="h6" fontWeight={600}>
                          {insight.topic}
                        </Typography>
                        <Chip 
                          label={insight.sentiment === 'positive' ? '😊' : 
                                insight.sentiment === 'neutral' ? '😐' : '😔'}
                          color={insight.sentiment === 'positive' ? 'success' : 
                                insight.sentiment === 'neutral' ? 'warning' : 'error'}
                          size="small"
                        />
                      </Box>
                      <Stack spacing={1}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2" color="text.secondary">Frequência:</Typography>
                          <Typography variant="body2" fontWeight={500}>{insight.frequency}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2" color="text.secondary">Conversão:</Typography>
                          <Typography variant="body2" fontWeight={500}>{insight.conversionRate.toFixed(1)}%</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2" color="text.secondary">Resp. Média:</Typography>
                          <Typography variant="body2" fontWeight={500}>{insight.averageResponseTime}min</Typography>
                        </Box>
                        <LinearProgress 
                          variant="determinate" 
                          value={insight.conversionRate} 
                          sx={{ 
                            mt: 1,
                            height: 6, 
                            borderRadius: 3,
                            '& .MuiLinearProgress-bar': {
                              backgroundColor: insight.sentiment === 'positive' ? 'success.main' : 
                                            insight.sentiment === 'neutral' ? 'warning.main' : 'error.main'
                            }
                          }}
                        />
                      </Stack>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Card>
          </Grid>
        </Grid>
      )}

      {selectedTab === 4 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                🧠 Insights de Inteligência de Negócio
              </Typography>
              <Typography variant="body2">
                Recomendações baseadas na análise completa dos seus dados
              </Typography>
            </Alert>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Card sx={{ p: 3, height: '100%' }}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Insights color="primary" />
                Oportunidades Identificadas
              </Typography>
              <Stack spacing={2}>
                {amenityInsights.length > 0 && (
                  <Alert severity="success">
                    <Typography variant="subtitle2">
                      🏊‍♂️ Comodidade em Alta: {amenityInsights[0]?.name}
                    </Typography>
                    <Typography variant="body2">
                      Score de demanda: {amenityInsights[0]?.demandScore.toFixed(1)}. 
                      Considere adicionar esta comodidade em mais propriedades.
                    </Typography>
                  </Alert>
                )}
                
                {seasonalPatterns.length > 0 && (
                  <Alert severity="warning">
                    <Typography variant="subtitle2">
                      📅 Melhor Período: {seasonalPatterns[0]?.period}
                    </Typography>
                    <Typography variant="body2">
                      Receita de R$ {seasonalPatterns[0]?.revenue.toLocaleString('pt-BR')}. 
                      Prepare campanhas especiais para este período.
                    </Typography>
                  </Alert>
                )}
                
                {locationInsights.length > 0 && (
                  <Alert severity="info">
                    <Typography variant="subtitle2">
                      📍 Região Promissora: {locationInsights[0]?.area}
                    </Typography>
                    <Typography variant="body2">
                      Score de popularidade: {locationInsights[0]?.popularityScore.toFixed(2)}. 
                      Considere expandir nesta região.
                    </Typography>
                  </Alert>
                )}
                
                {conversationInsights.length > 0 && (
                  <Alert severity="error">
                    <Typography variant="subtitle2">
                      💬 Tópico de Atenção: {conversationInsights[0]?.topic}
                    </Typography>
                    <Typography variant="body2">
                      Taxa de conversão: {conversationInsights[0]?.conversionRate.toFixed(1)}%. 
                      Melhore as respostas da IA para este tópico.
                    </Typography>
                  </Alert>
                )}
              </Stack>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Card sx={{ p: 3, height: '100%' }}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <AutoGraph color="primary" />
                Próximas Ações Recomendadas
              </Typography>
              <Stack spacing={2}>
                <Paper sx={{ p: 2, bgcolor: 'success.light', color: 'success.contrastText' }}>
                  <Typography variant="subtitle2" gutterBottom>
                    🎯 Otimização de Preços
                  </Typography>
                  <Typography variant="body2">
                    Ajustar preços nas regiões de alta demanda para maximizar receita
                  </Typography>
                </Paper>
                
                <Paper sx={{ p: 2, bgcolor: 'info.light', color: 'info.contrastText' }}>
                  <Typography variant="subtitle2" gutterBottom>
                    🤖 Melhoria da IA
                  </Typography>
                  <Typography variant="body2">
                    Treinar respostas para tópicos com baixa conversão
                  </Typography>
                </Paper>
                
                <Paper sx={{ p: 2, bgcolor: 'warning.light', color: 'warning.contrastText' }}>
                  <Typography variant="subtitle2" gutterBottom>
                    📈 Expansão Estratégica
                  </Typography>
                  <Typography variant="body2">
                    Investir em propriedades nas localizações de melhor performance
                  </Typography>
                </Paper>
                
                <Paper sx={{ p: 2, bgcolor: 'secondary.light', color: 'secondary.contrastText' }}>
                  <Typography variant="subtitle2" gutterBottom>
                    🎉 Campanhas Sazonais
                  </Typography>
                  <Typography variant="body2">
                    Preparar promoções para os períodos de maior demanda identificados
                  </Typography>
                </Paper>
              </Stack>
            </Card>
          </Grid>
        </Grid>
      )}
    </Box>
  );
}