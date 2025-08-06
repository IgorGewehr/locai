'use client';

import { useState, useEffect } from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  IconButton,
  Chip,
  LinearProgress,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Tooltip,
  Alert,
  useTheme,
  Tab,
  Tabs,
} from '@mui/material';
import {
  Analytics,
  TrendingUp,
  TrendingDown,
  Refresh,
  SmartToy,
  WhatsApp,
  Home,
  People,
  EventAvailable,
  Insights,
  Star,
  CalendarMonth,
  AttachMoney,
  Schedule,
  LocationOn,
  Wifi,
  Pool,
  DirectionsCar,
  Kitchen,
  Balcony,
  FitnessCenter,
  Warning,
  CheckCircle,
  Speed,
  MonetizationOn,
} from '@mui/icons-material';
import { useTenant } from '@/contexts/TenantContext';
import { format, parseISO, isSameDay, differenceInDays, startOfWeek, endOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import AIMetricsDashboard from '@/components/organisms/metrics/AIMetricsDashboard';
import EnhancedMetricsDashboard from '@/components/organisms/metrics/EnhancedMetricsDashboard';

interface MetricCard {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: { value: number; isPositive: boolean };
  icon: React.ReactNode;
  color: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  insights?: string[];
}

interface AmenityStats {
  amenity: string;
  icon: React.ReactNode;
  inquiries: number;
  percentage: number;
  trend: number;
}

interface HolidayStats {
  holiday: string;
  date: string;
  inquiries: number;
  averagePrice: number;
  trend: number;
}

interface AIInsight {
  type: 'success' | 'warning' | 'info';
  title: string;
  description: string;
  actionable: boolean;
  priority: 'high' | 'medium' | 'low';
}

const MetricCardComponent = ({ title, value, subtitle, trend, icon, color, insights }: MetricCard) => {
  const theme = useTheme();
  
  return (
    <Card 
      sx={{ 
        height: '100%',
        minHeight: { xs: 200, md: 240 },
        background: 'rgba(255, 255, 255, 0.08)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        borderRadius: '20px',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        position: 'relative',
        overflow: 'hidden',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: '0 16px 50px rgba(0, 0, 0, 0.4)',
        },
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '4px',
          background: `linear-gradient(135deg, ${color === 'primary' ? '#8b5cf6, #6366f1' : 
            color === 'secondary' ? '#06b6d4, #0891b2' : 
            color === 'success' ? '#10b981, #059669' :
            color === 'warning' ? '#f59e0b, #d97706' : '#ef4444, #dc2626'})`,
        }
      }}
    >
      <CardContent sx={{ p: 4, height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 64,
              height: 64,
              borderRadius: '16px',
              background: `linear-gradient(135deg, ${color === 'primary' ? '#8b5cf6, #6366f1' : 
                color === 'secondary' ? '#06b6d4, #0891b2' : 
                color === 'success' ? '#10b981, #059669' :
                color === 'warning' ? '#f59e0b, #d97706' : '#ef4444, #dc2626'})`,
              color: 'white',
              boxShadow: `0 8px 24px ${color === 'primary' ? 'rgba(139, 92, 246, 0.4)' : 
                color === 'secondary' ? 'rgba(6, 182, 212, 0.4)' : 
                color === 'success' ? 'rgba(16, 185, 129, 0.4)' :
                color === 'warning' ? 'rgba(245, 158, 11, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
            }}
          >
            {icon}
          </Box>
          {trend && (
            <Box 
              sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 1,
                background: trend.isPositive ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                borderRadius: '12px',
                px: 2,
                py: 1,
                border: `1px solid ${trend.isPositive ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
              }}
            >
              {trend.isPositive ? (
                <TrendingUp sx={{ color: '#10b981', fontSize: 18 }} />
              ) : (
                <TrendingDown sx={{ color: '#ef4444', fontSize: 18 }} />
              )}
              <Typography
                variant="body2"
                color={trend.isPositive ? '#10b981' : '#ef4444'}
                fontWeight="700"
                sx={{ fontSize: '0.875rem' }}
              >
                {Math.abs(trend.value)}%
              </Typography>
            </Box>
          )}
        </Box>

        <Box sx={{ flex: 1 }}>
          <Typography 
            variant="h3" 
            fontWeight="800" 
            sx={{
              color: '#ffffff',
              mb: 1,
              fontSize: { xs: '2rem', md: '2.25rem' },
            }}
          >
            {typeof value === 'number' && !isNaN(value) ? value.toLocaleString() : (value || '0')}
          </Typography>

          <Typography 
            variant="h6" 
            sx={{ 
              color: '#ffffff',
              fontWeight: 600,
              fontSize: '1.125rem',
              mb: 1
            }}
          >
            {title}
          </Typography>

          {subtitle && (
            <Typography 
              variant="body2" 
              sx={{ 
                color: 'rgba(255, 255, 255, 0.7)',
                fontSize: '0.875rem',
                mb: 2
              }}
            >
              {subtitle}
            </Typography>
          )}

          {insights && insights.length > 0 && (
            <Box sx={{ mt: 'auto' }}>
              {insights.slice(0, 2).map((insight, index) => (
                <Typography
                  key={index}
                  variant="caption"
                  sx={{
                    color: 'rgba(255, 255, 255, 0.6)',
                    fontSize: '0.75rem',
                    display: 'block',
                    lineHeight: 1.4,
                    mb: 0.5,
                  }}
                >
                  • {insight}
                </Typography>
              ))}
            </Box>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

export default function MetricsPage() {
  const theme = useTheme();
  const { services, isReady } = useTenant();
  const [loading, setLoading] = useState(true);
  const [agentMetrics, setAgentMetrics] = useState<any>(null);
  const [businessMetrics, setBusinessMetrics] = useState<any>(null);
  const [topAmenities, setTopAmenities] = useState<AmenityStats[]>([]);
  const [holidayStats, setHolidayStats] = useState<HolidayStats[]>([]);
  const [aiInsights, setAiInsights] = useState<AIInsight[]>([]);
  const [tabValue, setTabValue] = useState(0);

  const loadMetrics = async () => {
    if (!services || !isReady) return;
    
    setLoading(true);
    try {
      // Load AI Agent Metrics
      const agentResponse = await fetch('/api/agent/metrics');
      if (agentResponse.ok) {
        const agentData = await agentResponse.json();
        setAgentMetrics(agentData.data);
      }

      // Load business data for analysis
      const [properties, reservations, conversations, clients] = await Promise.all([
        services.properties.getAll(),
        services.reservations.getAll(),
        services.conversations.getAll(),
        services.clients.getAll(),
      ]);

      // Calculate comprehensive business metrics
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

      // Recent data for trends
      const recentReservations = reservations.filter(r => {
        const date = (r.createdAt as any)?.toDate ? (r.createdAt as any).toDate() : new Date(r.createdAt);
        return date >= thirtyDaysAgo;
      });

      const previousReservations = reservations.filter(r => {
        const date = (r.createdAt as any)?.toDate ? (r.createdAt as any).toDate() : new Date(r.createdAt);
        return date >= sixtyDaysAgo && date < thirtyDaysAgo;
      });

      // Recent conversations for WhatsApp analysis
      const recentConversations = conversations.filter(c => {
        const date = (c.createdAt as any)?.toDate ? (c.createdAt as any).toDate() : new Date(c.createdAt);
        return date >= thirtyDaysAgo;
      });

      // Calculate metrics
      const conversionRate = recentConversations.length > 0 
        ? (recentReservations.length / recentConversations.length) * 100 
        : 0;
      const previousConversionRate = previousReservations.length / Math.max(1, conversations.filter(c => {
        const date = (c.createdAt as any)?.toDate ? (c.createdAt as any).toDate() : new Date(c.createdAt);
        return date >= sixtyDaysAgo && date < thirtyDaysAgo;
      }).length) * 100;

      const conversionTrend = conversionRate - previousConversionRate;

      // Revenue calculations
      const monthlyRevenue = recentReservations
        .filter(r => r.status === 'confirmed')
        .reduce((sum, r) => sum + r.totalPrice, 0);
      
      const previousMonthRevenue = previousReservations
        .filter(r => r.status === 'confirmed')
        .reduce((sum, r) => sum + r.totalPrice, 0);

      const revenueTrend = previousMonthRevenue > 0 
        ? ((monthlyRevenue - previousMonthRevenue) / previousMonthRevenue) * 100 
        : 0;

      // Average response time calculation
      const responseTimeCalculations = recentConversations.map(c => c.avgResponseTime).filter(Boolean);
      const avgResponseTime = responseTimeCalculations.length > 0 
        ? responseTimeCalculations.reduce((sum, time) => sum + time, 0) / responseTimeCalculations.length 
        : 0;
      
      // Amenity analysis from conversations
      const amenityKeywords = {
        'wifi': ['wifi', 'internet', 'conexão'],
        'pool': ['piscina', 'pool'],
        'parking': ['estacionamento', 'garagem', 'vaga'],
        'kitchen': ['cozinha', 'kitchen', 'fogão'],
        'balcony': ['varanda', 'sacada', 'balcão'],
        'gym': ['academia', 'gym', 'ginástica']
      };

      const amenityStats: { [key: string]: number } = {};
      
      // Analyze conversation messages for amenity mentions
      for (const conversation of recentConversations) {
        const messages = conversation.messages || [];
        for (const message of messages) {
          if (message.from === 'user') {
            const text = message.text?.toLowerCase() || '';
            Object.entries(amenityKeywords).forEach(([amenity, keywords]) => {
              if (keywords.some(keyword => text.includes(keyword))) {
                amenityStats[amenity] = (amenityStats[amenity] || 0) + 1;
              }
            });
          }
        }
      }

      const topAmenitiesList: AmenityStats[] = Object.entries(amenityStats)
        .map(([amenity, count]) => ({
          amenity: amenity.charAt(0).toUpperCase() + amenity.slice(1),
          icon: getAmenityIcon(amenity),
          inquiries: count,
          percentage: (count / Math.max(1, recentConversations.length)) * 100,
          trend: Math.random() * 20 - 10 // Simulated trend for now
        }))
        .sort((a, b) => b.inquiries - a.inquiries)
        .slice(0, 6);

      // Holiday analysis
      const brazilianHolidays = [
        { name: 'Carnaval', month: 2 },
        { name: 'Páscoa', month: 3 },
        { name: 'Festa Junina', month: 6 },
        { name: 'Férias de Julho', month: 7 },
        { name: 'Independência', month: 9 },
        { name: 'Natal/Ano Novo', month: 12 }
      ];

      const holidayAnalysis: HolidayStats[] = brazilianHolidays.map(holiday => {
        const holidayReservations = reservations.filter(r => {
          const checkIn = (r.checkIn as any)?.toDate ? (r.checkIn as any).toDate() : new Date(r.checkIn);
          return checkIn.getMonth() + 1 === holiday.month;
        });
        
        const avgPrice = holidayReservations.length > 0 
          ? holidayReservations.reduce((sum, r) => sum + r.totalPrice, 0) / holidayReservations.length
          : 0;

        return {
          holiday: holiday.name,
          date: `${holiday.month}/2024`,
          inquiries: holidayReservations.length,
          averagePrice: avgPrice,
          trend: Math.random() * 30 - 15 // Simulated trend
        };
      }).sort((a, b) => b.inquiries - a.inquiries);

      // AI Insights Generation
      const insights: AIInsight[] = [];

      // Conversion insight
      if (conversionRate < 15) {
        insights.push({
          type: 'warning',
          title: 'Taxa de Conversão Baixa',
          description: `Apenas ${conversionRate.toFixed(1)}% das conversas resultam em reservas. Considere melhorar as respostas do AI ou oferecer incentivos.`,
          actionable: true,
          priority: 'high'
        });
      }

      // Response time insight
      if (avgResponseTime > 10) {
        insights.push({
          type: 'warning',
          title: 'Tempo de Resposta Elevado',
          description: `Tempo médio de resposta de ${avgResponseTime.toFixed(1)}s pode estar afetando a experiência. Otimize o AI agent.`,
          actionable: true,
          priority: 'medium'
        });
      }

      // Top amenity insight
      if (topAmenitiesList.length > 0) {
        const topAmenity = topAmenitiesList[0];
        insights.push({
          type: 'success',
          title: 'Comodidade Mais Procurada',
          description: `${topAmenity.amenity} é mencionada em ${topAmenity.percentage.toFixed(1)}% das conversas. Destaque isso nos anúncios.`,
          actionable: true,
          priority: 'medium'
        });
      }

      // Revenue trend insight
      if (revenueTrend > 20) {
        insights.push({
          type: 'success',
          title: 'Crescimento de Receita',
          description: `Receita cresceu ${revenueTrend.toFixed(1)}% no último mês. Continue com as estratégias atuais.`,
          actionable: false,
          priority: 'low'
        });
      }

      setBusinessMetrics({
        conversionRate,
        conversionTrend,
        monthlyRevenue,
        revenueTrend,
        avgResponseTime,
        totalConversations: recentConversations.length,
        totalReservations: recentReservations.length,
        activeProperties: properties.filter(p => p.isActive).length
      });

      setTopAmenities(topAmenitiesList);
      setHolidayStats(holidayAnalysis);
      setAiInsights(insights);

    } catch (error) {
      console.error('Error loading metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAmenityIcon = (amenity: string) => {
    const icons: { [key: string]: React.ReactNode } = {
      wifi: <Wifi sx={{ fontSize: 24 }} />,
      pool: <Pool sx={{ fontSize: 24 }} />,
      parking: <DirectionsCar sx={{ fontSize: 24 }} />,
      kitchen: <Kitchen sx={{ fontSize: 24 }} />,
      balcony: <Balcony sx={{ fontSize: 24 }} />,
      gym: <FitnessCenter sx={{ fontSize: 24 }} />
    };
    return icons[amenity] || <Home sx={{ fontSize: 24 }} />;
  };

  useEffect(() => {
    loadMetrics();
  }, [services, isReady]);

  const refreshMetrics = async () => {
    await loadMetrics();
  };

  if (loading) {
    return (
      <Box sx={{ p: 4 }}>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h3" fontWeight="700" sx={{ color: '#ffffff', mb: 1 }}>
            Métricas & Insights
          </Typography>
          <Typography variant="subtitle1" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
            Carregando análise estratégica do negócio...
          </Typography>
        </Box>
        <LinearProgress 
          sx={{ 
            height: 4,
            borderRadius: 2,
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            '& .MuiLinearProgress-bar': {
              background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
              borderRadius: 2,
            }
          }} 
        />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        mb: { xs: 4, md: 5 },
        flexDirection: { xs: 'column', sm: 'row' },
        gap: { xs: 2, sm: 0 }
      }}>
        <Box sx={{ textAlign: { xs: 'center', sm: 'left' } }}>
          <Typography 
            variant="h3" 
            component="h1" 
            fontWeight="700"
            sx={{
              background: 'linear-gradient(135deg, #ffffff 0%, #a5b4fc 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              mb: 1,
              fontSize: { xs: '2.125rem', sm: '2.5rem', md: '2.75rem' }
            }}
          >
            Métricas & Insights
          </Typography>
          <Typography 
            variant="subtitle1" 
            sx={{ 
              color: 'rgba(255, 255, 255, 0.85)', 
              fontWeight: 500,
              fontSize: { xs: '1rem', md: '1.125rem' }
            }}
          >
            Análise estratégica para otimização do negócio
          </Typography>
        </Box>
        <IconButton 
          onClick={refreshMetrics} 
          disabled={loading}
          sx={{
            background: 'rgba(139, 92, 246, 0.1)',
            border: '1px solid rgba(139, 92, 246, 0.2)',
            borderRadius: '12px',
            p: 2,
            width: 56,
            height: 56,
            '&:hover': {
              background: 'rgba(139, 92, 246, 0.2)',
              transform: 'scale(1.05)',
            }
          }}
        >
          <Refresh sx={{ color: '#8b5cf6', fontSize: 24 }} />
        </IconButton>
      </Box>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 4 }}>
        <Tabs 
          value={tabValue} 
          onChange={(e, newValue) => setTabValue(newValue)}
          sx={{
            '& .MuiTab-root': {
              color: 'rgba(255, 255, 255, 0.7)',
              fontWeight: 500,
              '&.Mui-selected': {
                color: '#8b5cf6',
              }
            },
            '& .MuiTabs-indicator': {
              backgroundColor: '#8b5cf6',
            }
          }}
        >
          <Tab label="Métricas Gerais" />
          <Tab label="Inteligência de Conversas" />
          <Tab label="IA Avançada" />
        </Tabs>
      </Box>

      {/* Tab Content */}
      {tabValue === 0 && (

      <Grid container spacing={{ xs: 3, md: 4 }}>
        {/* Main Metrics Row */}
        <Grid item xs={12} sm={6} md={3}>
          <MetricCardComponent
            title="Taxa de Conversão"
            value={`${(businessMetrics?.conversionRate || 0).toFixed(1)}%`}
            subtitle="WhatsApp → Reservas"
            icon={<TrendingUp sx={{ fontSize: 28 }} />}
            color="success"
            trend={{ 
              value: Math.abs(businessMetrics?.conversionTrend || 0), 
              isPositive: (businessMetrics?.conversionTrend || 0) >= 0 
            }}
            insights={[
              `${businessMetrics?.totalConversations || 0} conversas este mês`,
              `${businessMetrics?.totalReservations || 0} reservas confirmadas`
            ]}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <MetricCardComponent
            title="Receita Mensal"
            value={`R$ ${((businessMetrics?.monthlyRevenue || 0) / 1000).toFixed(1)}k`}
            subtitle="Últimos 30 dias"
            icon={<AttachMoney sx={{ fontSize: 28 }} />}
            color="primary"
            trend={{ 
              value: Math.abs(businessMetrics?.revenueTrend || 0), 
              isPositive: (businessMetrics?.revenueTrend || 0) >= 0 
            }}
            insights={[
              `${businessMetrics?.totalReservations || 0} reservas ativas`,
              `Ticket médio: R$ ${businessMetrics?.monthlyRevenue && businessMetrics?.totalReservations ? (businessMetrics.monthlyRevenue / businessMetrics.totalReservations).toFixed(0) : 0}`
            ]}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <MetricCardComponent
            title="Tempo Resposta AI"
            value={`${(businessMetrics?.avgResponseTime || 0).toFixed(1)}s`}
            subtitle="Média WhatsApp"
            icon={<SmartToy sx={{ fontSize: 28 }} />}
            color="secondary"
            trend={{ 
              value: 15, 
              isPositive: (businessMetrics?.avgResponseTime || 0) < 8 
            }}
            insights={[
              `${agentMetrics?.totalRequests || 0} interações processadas`,
              `${((agentMetrics?.cacheHitRate || 0) * 100).toFixed(1)}% cache hit rate`
            ]}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <MetricCardComponent
            title="Propriedades Ativas"
            value={businessMetrics?.activeProperties || 0}
            subtitle="Disponíveis para locação"
            icon={<Home sx={{ fontSize: 28 }} />}
            color="warning"
            insights={[
              `Taxa ocupação estimada: 78%`,
              `Média por propriedade: R$ 2.1k`
            ]}
          />
        </Grid>

        {/* AI Insights Section */}
        <Grid item xs={12}>
          <Card 
            sx={{ 
              background: 'rgba(255, 255, 255, 0.08)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '20px',
            }}
          >
            <CardContent sx={{ p: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 48,
                    height: 48,
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                    color: 'white',
                  }}
                >
                  <Insights sx={{ fontSize: 24 }} />
                </Box>
                <Typography variant="h5" fontWeight={700} sx={{ color: '#ffffff' }}>
                  Insights Estratégicos
                </Typography>
              </Box>

              <Grid container spacing={3}>
                {aiInsights.map((insight, index) => (
                  <Grid item xs={12} md={6} key={index}>
                    <Alert
                      severity={insight.type}
                      icon={insight.type === 'success' ? <CheckCircle /> : <Warning />}
                      sx={{
                        background: `rgba(${insight.type === 'success' ? '16, 185, 129' : insight.type === 'warning' ? '245, 158, 11' : '59, 130, 246'}, 0.1)`,
                        border: `1px solid rgba(${insight.type === 'success' ? '16, 185, 129' : insight.type === 'warning' ? '245, 158, 11' : '59, 130, 246'}, 0.2)`,
                        borderRadius: '12px',
                        '& .MuiAlert-message': {
                          color: '#ffffff',
                        }
                      }}
                    >
                      <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 0.5 }}>
                        {insight.title}
                      </Typography>
                      <Typography variant="body2" sx={{ opacity: 0.8 }}>
                        {insight.description}
                      </Typography>
                    </Alert>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Amenities Analysis */}
        <Grid item xs={12} md={6}>
          <Card 
            sx={{ 
              height: '100%',
              background: 'rgba(255, 255, 255, 0.08)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '20px',
            }}
          >
            <CardContent sx={{ p: 4 }}>
              <Typography variant="h6" fontWeight={700} sx={{ color: '#ffffff', mb: 3 }}>
                Comodidades Mais Procuradas
              </Typography>
              <List sx={{ p: 0 }}>
                {topAmenities.map((amenity, index) => (
                  <ListItem
                    key={amenity.amenity}
                    sx={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      borderRadius: '12px',
                      mb: 1.5,
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                    }}
                  >
                    <ListItemIcon sx={{ color: '#ffffff', minWidth: 40 }}>
                      {amenity.icon}
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="body1" fontWeight={600} sx={{ color: '#ffffff' }}>
                            {amenity.amenity}
                          </Typography>
                          <Chip
                            label={`${amenity.inquiries} menções`}
                            size="small"
                            sx={{
                              backgroundColor: 'rgba(139, 92, 246, 0.2)',
                              color: '#a78bfa',
                              fontSize: '0.75rem',
                            }}
                          />
                        </Box>
                      }
                      secondary={
                        <Box sx={{ mt: 1 }}>
                          <LinearProgress 
                            variant="determinate" 
                            value={amenity.percentage} 
                            sx={{
                              height: 6,
                              borderRadius: 3,
                              backgroundColor: 'rgba(255, 255, 255, 0.1)',
                              '& .MuiLinearProgress-bar': {
                                background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                                borderRadius: 3,
                              }
                            }}
                          />
                          <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)', mt: 0.5, display: 'block' }}>
                            {amenity.percentage.toFixed(1)}% das conversas
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Holiday Analysis */}
        <Grid item xs={12} md={6}>
          <Card 
            sx={{ 
              height: '100%',
              background: 'rgba(255, 255, 255, 0.08)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '20px',
            }}
          >
            <CardContent sx={{ p: 4 }}>
              <Typography variant="h6" fontWeight={700} sx={{ color: '#ffffff', mb: 3 }}>
                Análise por Feriados
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ color: 'rgba(255, 255, 255, 0.7)', border: 'none', pb: 2 }}>
                        Período
                      </TableCell>
                      <TableCell align="right" sx={{ color: 'rgba(255, 255, 255, 0.7)', border: 'none', pb: 2 }}>
                        Reservas
                      </TableCell>
                      <TableCell align="right" sx={{ color: 'rgba(255, 255, 255, 0.7)', border: 'none', pb: 2 }}>
                        Preço Médio
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {holidayStats.slice(0, 5).map((holiday) => (
                      <TableRow key={holiday.holiday}>
                        <TableCell 
                          sx={{ 
                            color: '#ffffff', 
                            border: 'none',
                            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                            py: 2
                          }}
                        >
                          <Typography variant="body2" fontWeight={600}>
                            {holiday.holiday}
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                            {holiday.date}
                          </Typography>
                        </TableCell>
                        <TableCell 
                          align="right" 
                          sx={{ 
                            color: '#ffffff', 
                            border: 'none',
                            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                            py: 2
                          }}
                        >
                          <Typography variant="body2" fontWeight={600}>
                            {holiday.inquiries}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }}>
                            {holiday.trend > 0 ? (
                              <TrendingUp sx={{ fontSize: 14, color: '#10b981' }} />
                            ) : (
                              <TrendingDown sx={{ fontSize: 14, color: '#ef4444' }} />
                            )}
                            <Typography 
                              variant="caption" 
                              sx={{ 
                                color: holiday.trend > 0 ? '#10b981' : '#ef4444',
                                fontSize: '0.7rem'
                              }}
                            >
                              {Math.abs(holiday.trend).toFixed(0)}%
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell 
                          align="right" 
                          sx={{ 
                            color: '#ffffff', 
                            border: 'none',
                            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                            py: 2
                          }}
                        >
                          <Typography variant="body2" fontWeight={600}>
                            R$ {(holiday.averagePrice / 1000).toFixed(1)}k
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Performance Summary */}
        {agentMetrics && (
          <Grid item xs={12}>
            <Card 
              sx={{ 
                background: 'rgba(255, 255, 255, 0.08)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '20px',
              }}
            >
              <CardContent sx={{ p: 4 }}>
                <Typography variant="h6" fontWeight={700} sx={{ color: '#ffffff', mb: 3 }}>
                  Performance do AI Agent
                </Typography>
                <Grid container spacing={4}>
                  <Grid item xs={12} sm={6} md={3}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: 64,
                          height: 64,
                          borderRadius: '16px',
                          background: 'linear-gradient(135deg, #10b981, #059669)',
                          color: 'white',
                          mx: 'auto',
                          mb: 2,
                        }}
                      >
                        <Speed sx={{ fontSize: 28 }} />
                      </Box>
                      <Typography variant="h4" fontWeight={700} sx={{ color: '#ffffff', mb: 0.5 }}>
                        {agentMetrics.totalRequests || 0}
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                        Total de Requisições
                      </Typography>
                    </Box>
                  </Grid>

                  <Grid item xs={12} sm={6} md={3}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: 64,
                          height: 64,
                          borderRadius: '16px',
                          background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                          color: 'white',
                          mx: 'auto',
                          mb: 2,
                        }}
                      >
                        <MonetizationOn sx={{ fontSize: 28 }} />
                      </Box>
                      <Typography variant="h4" fontWeight={700} sx={{ color: '#ffffff', mb: 0.5 }}>
                        R$ {(agentMetrics.projectedMonthlyCost || 0).toFixed(0)}
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                        Custo Projetado/Mês
                      </Typography>
                    </Box>
                  </Grid>

                  <Grid item xs={12} sm={6} md={3}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: 64,
                          height: 64,
                          borderRadius: '16px',
                          background: 'linear-gradient(135deg, #06b6d4, #0891b2)',
                          color: 'white',
                          mx: 'auto',
                          mb: 2,
                        }}
                      >
                        <Analytics sx={{ fontSize: 28 }} />
                      </Box>
                      <Typography variant="h4" fontWeight={700} sx={{ color: '#ffffff', mb: 0.5 }}>
                        {((agentMetrics.cacheHitRate || 0) * 100).toFixed(0)}%
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                        Eficiência Cache
                      </Typography>
                    </Box>
                  </Grid>

                  <Grid item xs={12} sm={6} md={3}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: 64,
                          height: 64,
                          borderRadius: '16px',
                          background: agentMetrics.errorRate < 0.05 
                            ? 'linear-gradient(135deg, #10b981, #059669)'
                            : 'linear-gradient(135deg, #ef4444, #dc2626)',
                          color: 'white',
                          mx: 'auto',
                          mb: 2,
                        }}
                      >
                        <CheckCircle sx={{ fontSize: 28 }} />
                      </Box>
                      <Typography variant="h4" fontWeight={700} sx={{ color: '#ffffff', mb: 0.5 }}>
                        {((1 - (agentMetrics.errorRate || 0)) * 100).toFixed(1)}%
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                        Taxa de Sucesso
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>
      )}

      {/* AI Insights Tab */}
      {tabValue === 1 && (
        <AIMetricsDashboard />
      )}

      {/* Enhanced AI Tab */}
      {tabValue === 2 && (
        <EnhancedMetricsDashboard />
      )}
    </Box>
  );
}