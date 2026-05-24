'use client';

import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import {
    Grid,
    Card,
    CardContent,
    Typography,
    Box,
    LinearProgress,
    Paper,
    IconButton,
    Chip,
    Skeleton,
    Divider,
    Button,
    CircularProgress,
} from '@mui/material';
import {
    Home,
    CalendarMonth,
    People,
    AttachMoney,
    TrendingUp,
    TrendingDown,
    Refresh,
    WhatsApp,
    Settings,
    SmartToy,
} from '@mui/icons-material';
import WhatsAppStatusIndicator from '@/components/molecules/whatsapp/WhatsAppStatusIndicator';
import type { DashboardStats } from '@/lib/types';
import { db } from '@/lib/firebase/config';
import { useAuth } from '@/contexts/AuthProvider';
import { useTenant } from '@/contexts/TenantContext';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { logger } from '@/lib/utils/logger';
// 🚀 PERFORMANCE: Lazy load de componentes pesados
const AgendaCard = lazy(() => import('@/components/organisms/dashboards/AgendaCard'));
const ConversationsMetricsCard = lazy(() => import('@/components/organisms/dashboards/ConversationsMetricsCard').then(m => ({ default: m.ConversationsMetricsCard })));
const CreateVisitDialog = lazy(() => import('@/components/organisms/agenda/CreateVisitDialog'));
import { SafeRevolutionaryOnboarding } from '@/components/organisms/RevolutionaryOnboarding';
import { useRouter } from 'next/navigation';

const initialStats: DashboardStats = {
  totalProperties: 0,
  activeProperties: 0,
  totalReservations: 0,
  pendingReservations: 0,
  totalRevenue: 0,
  monthlyRevenue: 0,
  occupancyRate: 0,
  averageRating: 0,
};

// 🚀 PERFORMANCE: Loading placeholder component
const CardSkeleton = () => (
  <Card
    sx={{
      height: { xs: 'auto', md: 450, lg: 500 },
      minHeight: 400,
      background: 'rgba(255, 255, 255, 0.08)',
      backdropFilter: 'blur(20px)',
      border: '1px solid rgba(255, 255, 255, 0.15)',
      borderRadius: '24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}
  >
    <CircularProgress size={40} sx={{ color: 'rgba(99, 102, 241, 0.6)' }} />
  </Card>
);

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
}

function StatCard({ title, value, subtitle, icon, trend, color }: StatCardProps) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => { setMounted(true); }, []);

  const colorMap = {
    primary:   { accent: '#6366f1', iconBg: 'rgba(99,102,241,0.12)',  iconColor: '#818cf8' },
    secondary: { accent: '#8b5cf6', iconBg: 'rgba(139,92,246,0.12)', iconColor: '#a78bfa' },
    success:   { accent: '#10b981', iconBg: 'rgba(16,185,129,0.12)', iconColor: '#34d399' },
    warning:   { accent: '#f59e0b', iconBg: 'rgba(245,158,11,0.12)', iconColor: '#fbbf24' },
    error:     { accent: '#ef4444', iconBg: 'rgba(239,68,68,0.12)',  iconColor: '#f87171' },
  };
  const c = colorMap[color];

  return (
    <Card
      sx={{
        height: '100%',
        minHeight: { xs: 148, sm: 168 },
        bgcolor: '#111827',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '14px',
        position: 'relative',
        overflow: 'hidden',
        transition: 'border-color 0.2s ease, transform 0.2s ease',
        '&:hover': {
          borderColor: 'rgba(255,255,255,0.14)',
          transform: 'translateY(-2px)',
        },
        /* thin top accent line */
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0, left: 0, right: 0,
          height: '2px',
          background: c.accent,
          opacity: 0.7,
        },
      }}
    >
      <CardContent sx={{ p: { xs: 2.5, md: 3 }, height: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {/* Top row */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <Box
            sx={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 40, height: 40,
              borderRadius: '10px',
              bgcolor: c.iconBg,
              color: c.iconColor,
            }}
          >
            {icon}
          </Box>
          {trend && (
            <Box sx={{
              display: 'flex', alignItems: 'center', gap: 0.5,
              bgcolor: trend.isPositive ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
              borderRadius: '8px', px: 1, py: 0.375,
            }}>
              {trend.isPositive
                ? <TrendingUp sx={{ color: '#10b981', fontSize: 14 }} />
                : <TrendingDown sx={{ color: '#ef4444', fontSize: 14 }} />
              }
              <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: trend.isPositive ? '#10b981' : '#ef4444' }}>
                {!isNaN(trend.value) ? trend.value : 0}%
              </Typography>
            </Box>
          )}
        </Box>

        {/* Values */}
        <Box>
          <Typography sx={{
            fontSize: { xs: '1.625rem', md: '1.875rem' },
            fontWeight: 700,
            color: '#f1f5f9',
            letterSpacing: '-0.025em',
            lineHeight: 1.1,
            mb: 0.5,
          }}>
            {mounted ? (typeof value === 'number' && !isNaN(value) ? value.toLocaleString('pt-BR') : (value || '0')) : '—'}
          </Typography>
          <Typography sx={{ fontSize: '0.875rem', fontWeight: 500, color: 'rgba(255,255,255,0.6)', lineHeight: 1.3 }}>
            {title}
          </Typography>
          {subtitle && (
            <Typography sx={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)', mt: 0.25, lineHeight: 1.3 }}>
              {subtitle}
            </Typography>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const { services, tenantId, isReady } = useTenant();
  const [stats, setStats] = useState<DashboardStats>(initialStats);
  const [loading, setLoading] = useState(true);
  const [showVisitDialog, setShowVisitDialog] = useState(false);
  const [whatsappStats, setWhatsappStats] = useState({
    messagesTotal: 0,
    activeConversations: 0,
    avgResponseTime: 0,
    connected: false,
  });
  const [trends, setTrends] = useState({
    propertiesTrend: 0,
    reservationsTrend: 0,
    revenueTrend: 0,
    occupancyTrend: 0
  });

  // 🚀 OTIMIZAÇÃO: useCallback previne re-criação da função
  // e evita loop infinito no useEffect
  const fetchStats = useCallback(async () => {
    if (!services || !tenantId || !isReady) return;

    setLoading(true);
    try {
      // 🚀 OTIMIZAÇÃO: getAll() agora tem limit de 1000 docs (antes era ilimitado)
      const properties = await services.properties.getAll();
      const activeProperties = properties.filter((p: any) => p.isActive === true);

      // 🚀 OTIMIZAÇÃO: getAll() agora tem limit de 1000 docs
      const reservations = await services.reservations.getAll();
      const pendingReservations = reservations.filter((r: any) => r.status === 'pending');

      // Calculate monthly revenue and trends
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      
      const monthlyReservations = reservations.filter(r => {
        const date = (r.checkIn as any)?.toDate ? (r.checkIn as any).toDate() : new Date(r.checkIn);
        return date.getMonth() === currentMonth && date.getFullYear() === currentYear && r.status === 'confirmed';
      });
      
      const lastMonthReservations = reservations.filter(r => {
        const date = (r.checkIn as any)?.toDate ? (r.checkIn as any).toDate() : new Date(r.checkIn);
        return date.getMonth() === lastMonth && date.getFullYear() === lastMonthYear && r.status === 'confirmed';
      });

      const monthlyRevenue = monthlyReservations.reduce((total, r) => total + r.totalPrice, 0);
      const lastMonthRevenue = lastMonthReservations.reduce((total, r) => total + r.totalPrice, 0);
      const totalRevenue = reservations
        .filter(r => r.status === 'confirmed')
        .reduce((total, r) => total + r.totalPrice, 0);
        
      // Calculate trends
      const revenueTrend = lastMonthRevenue > 0 ? ((monthlyRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 : 0;
      const reservationsTrend = lastMonthReservations.length > 0 ? 
        ((monthlyReservations.length - lastMonthReservations.length) / lastMonthReservations.length) * 100 : 0;

      // Calculate occupancy rate
      const totalDays = activeProperties.length * 30; // Assuming 30 days
      const occupiedDays = reservations
        .filter(r => r.status === 'confirmed')
        .reduce((total, r) => {
          const checkIn = (r.checkIn as any)?.toDate ? (r.checkIn as any).toDate() : new Date(r.checkIn);
          const checkOut = (r.checkOut as any)?.toDate ? (r.checkOut as any).toDate() : new Date(r.checkOut);
          const days = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
          return total + days;
        }, 0);
      const occupancyRate = totalDays > 0 ? (occupiedDays / totalDays) * 100 : 0;

      // WhatsApp connection status - REMOVIDO para evitar erros 401
      // O status deve ser verificado apenas na página de settings quando necessário
      let whatsappConnected = false; // Sempre false por enquanto

      // Fetch WhatsApp stats from tenant-isolated collections
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const messagesQuery = query(
        collection(db, `tenants/${tenantId}/messages`),
        where('timestamp', '>=', Timestamp.fromDate(today))
      );
      const messagesSnapshot = await getDocs(messagesQuery);

      const conversationsQuery = query(
        collection(db, `tenants/${tenantId}/conversations`),
        where('status', '==', 'active')
      );
      const conversationsSnapshot = await getDocs(conversationsQuery);

      // Calculate average response time from real data
      let avgResponseTime = 0;
      if (messagesSnapshot.size > 0) {
        const messages = messagesSnapshot.docs.map(doc => doc.data());
        const botMessages = messages.filter(m => m.from === 'bot' && m.responseTime);
        if (botMessages.length > 0) {
          const totalResponseTime = botMessages.reduce((sum, m) => sum + (m.responseTime || 0), 0);
          avgResponseTime = totalResponseTime / botMessages.length;
        }
      }


      setStats({
        totalProperties: properties.length,
        activeProperties: activeProperties.length,
        totalReservations: reservations.length,
        pendingReservations: pendingReservations.length,
        totalRevenue,
        monthlyRevenue,
        occupancyRate,
        averageRating: 0, // Reviews system not implemented yet
      });

      setWhatsappStats({
        messagesTotal: messagesSnapshot.size,
        activeConversations: conversationsSnapshot.size,
        avgResponseTime: avgResponseTime,
        connected: whatsappConnected,
      });

      
      // Set calculated trends
      setTrends({
        propertiesTrend: 0, // Properties trend (growth in properties)
        reservationsTrend: Math.round(reservationsTrend),
        revenueTrend: Math.round(revenueTrend),
        occupancyTrend: 0 // Calculate based on previous month if needed
      });
    } catch (error) {
      logger.error('[Dashboard] Error fetching stats', {
        error: error instanceof Error ? error.message : 'Unknown error',
        tenantId,
      });
    } finally {
      setLoading(false);
    }
  }, [services, tenantId, isReady]); // Dependencies do useCallback

  // 🚀 OTIMIZAÇÃO: Removido 'services' das dependências
  // services agora é estável (via useMemo no TenantContext)
  // mas ainda assim, não precisamos dele como dependência aqui
  useEffect(() => {
    if (isReady && tenantId) {
      fetchStats();
    }
  }, [isReady, tenantId, fetchStats]); // fetchStats é estável via useCallback

  const refreshStats = async () => {
    await fetchStats();
  };

  return (
    <Box sx={{ pb: { xs: 4, md: 6 } }}>
      {/* Header Section */}
      <Box sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        mb: { xs: 3, md: 4 },
        flexDirection: { xs: 'column', sm: 'row' },
        gap: { xs: 2, sm: 0 }
      }}>
        <Box sx={{ textAlign: { xs: 'center', sm: 'left' } }}>
          <Typography
            variant="h3"
            component="h1"
            fontWeight="800"
            sx={{
              background: 'linear-gradient(135deg, #ffffff 0%, #c7d2fe 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              mb: 0.5,
              fontSize: { xs: '2rem', sm: '2.25rem', md: '2.5rem' },
              letterSpacing: '-0.02em'
            }}
          >
            Dashboard
          </Typography>
          <Typography
            variant="subtitle1"
            sx={{
              color: 'rgba(255, 255, 255, 0.75)',
              fontWeight: 500,
              fontSize: { xs: '0.9375rem', md: '1rem' }
            }}
          >
            Visão geral e métricas principais
          </Typography>
        </Box>

        <Box sx={{ display: { xs: 'none', md: 'block' } }}>
          <IconButton
            onClick={refreshStats}
            disabled={loading}
            sx={{
              background: 'rgba(99, 102, 241, 0.1)',
              border: '1px solid rgba(99, 102, 241, 0.2)',
              borderRadius: '14px',
              p: 2,
              width: 52,
              height: 52,
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                background: 'rgba(99, 102, 241, 0.2)',
                transform: 'translateY(-2px)',
                boxShadow: '0 8px 24px rgba(99, 102, 241, 0.3)',
              }
            }}
          >
            <Refresh sx={{ color: '#6366f1', fontSize: 24 }} />
          </IconButton>
        </Box>
      </Box>

      {loading && (
        <Box sx={{ mb: 3 }}>
          <LinearProgress
            sx={{
              height: 3,
              borderRadius: 1.5,
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              '& .MuiLinearProgress-bar': {
                background: 'linear-gradient(90deg, #6366f1 0%, #8b5cf6 100%)',
                borderRadius: 1.5,
              }
            }}
          />
        </Box>
      )}

      {/* Revolutionary Onboarding */}
      <Box sx={{ mb: { xs: 3, md: 4 } }}>
        <SafeRevolutionaryOnboarding variant="compact" />
      </Box>

      {/* Clean Grid Layout - Optimized Architecture */}
      <Grid container spacing={{ xs: 2.5, md: 3 }}>
        {/* Main Statistics Row - 4 Key Metrics */}
        {/* Mobile: Horizontal Carousel */}
        <Grid item xs={12} sx={{ display: { xs: 'block', lg: 'none' } }}>
          <Box
            sx={{
              display: 'flex',
              gap: 2,
              overflowX: 'auto',
              pb: 2,
              scrollSnapType: 'x mandatory',
              '&::-webkit-scrollbar': {
                height: 6,
              },
              '&::-webkit-scrollbar-track': {
                bgcolor: 'rgba(255, 255, 255, 0.05)',
                borderRadius: 3,
              },
              '&::-webkit-scrollbar-thumb': {
                bgcolor: 'rgba(99, 102, 241, 0.5)',
                borderRadius: 3,
                '&:hover': {
                  bgcolor: 'rgba(99, 102, 241, 0.7)',
                },
              },
            }}
          >
            <Box sx={{ minWidth: { xs: '85vw', sm: '45%' }, scrollSnapAlign: 'start' }}>
              <StatCard
                key={`properties-${stats.activeProperties}-${loading}`}
                title="Propriedades Ativas"
                value={stats.activeProperties}
                subtitle={`${stats.totalProperties} total`}
                icon={<Home sx={{ fontSize: { xs: 28, md: 32 } }} />}
                color="primary"
                trend={{ value: trends.propertiesTrend, isPositive: trends.propertiesTrend >= 0 }}
              />
            </Box>

            <Box sx={{ minWidth: { xs: '85vw', sm: '45%' }, scrollSnapAlign: 'start' }}>
              <StatCard
                key={`reservations-${stats.pendingReservations}-${loading}`}
                title="Reservas Pendentes"
                value={stats.pendingReservations}
                subtitle={`${stats.totalReservations} total`}
                icon={<CalendarMonth sx={{ fontSize: { xs: 28, md: 32 } }} />}
                color="secondary"
                trend={{ value: trends.reservationsTrend, isPositive: trends.reservationsTrend >= 0 }}
              />
            </Box>

            <Box sx={{ minWidth: { xs: '85vw', sm: '45%' }, scrollSnapAlign: 'start' }}>
              <StatCard
                key={`revenue-${stats.monthlyRevenue}-${loading}`}
                title="Receita Mensal"
                value={`R$ ${(isNaN(stats.monthlyRevenue) ? 0 : stats.monthlyRevenue / 1000).toFixed(1)}k`}
                subtitle={`R$ ${(isNaN(stats.totalRevenue) ? 0 : stats.totalRevenue / 1000).toFixed(0)}k total`}
                icon={<AttachMoney sx={{ fontSize: { xs: 28, md: 32 } }} />}
                color="success"
                trend={{ value: trends.revenueTrend, isPositive: trends.revenueTrend >= 0 }}
              />
            </Box>

            <Box sx={{ minWidth: { xs: '85vw', sm: '45%' }, scrollSnapAlign: 'start' }}>
              <StatCard
                key={`occupancy-${stats.occupancyRate}-${loading}`}
                title="Taxa de Ocupação"
                value={`${(isNaN(stats.occupancyRate) ? 0 : stats.occupancyRate).toFixed(1)}%`}
                subtitle={`${stats.activeProperties} propriedades ativas`}
                icon={<People sx={{ fontSize: { xs: 28, md: 32 } }} />}
                color="warning"
                trend={{ value: trends.occupancyTrend, isPositive: trends.occupancyTrend >= 0 }}
              />
            </Box>
          </Box>
        </Grid>

        {/* Desktop: Grid Layout */}
        <Grid item xs={12} sm={6} lg={3} sx={{ display: { xs: 'none', lg: 'block' } }}>
          <StatCard
            key={`properties-${stats.activeProperties}-${loading}`}
            title="Propriedades Ativas"
            value={stats.activeProperties}
            subtitle={`${stats.totalProperties} total`}
            icon={<Home sx={{ fontSize: { xs: 28, md: 32 } }} />}
            color="primary"
            trend={{ value: trends.propertiesTrend, isPositive: trends.propertiesTrend >= 0 }}
          />
        </Grid>

        <Grid item xs={12} sm={6} lg={3} sx={{ display: { xs: 'none', lg: 'block' } }}>
          <StatCard
            key={`reservations-${stats.pendingReservations}-${loading}`}
            title="Reservas Pendentes"
            value={stats.pendingReservations}
            subtitle={`${stats.totalReservations} total`}
            icon={<CalendarMonth sx={{ fontSize: { xs: 28, md: 32 } }} />}
            color="secondary"
            trend={{ value: trends.reservationsTrend, isPositive: trends.reservationsTrend >= 0 }}
          />
        </Grid>

        <Grid item xs={12} sm={6} lg={3} sx={{ display: { xs: 'none', lg: 'block' } }}>
          <StatCard
            key={`revenue-${stats.monthlyRevenue}-${loading}`}
            title="Receita Mensal"
            value={`R$ ${(isNaN(stats.monthlyRevenue) ? 0 : stats.monthlyRevenue / 1000).toFixed(1)}k`}
            subtitle={`R$ ${(isNaN(stats.totalRevenue) ? 0 : stats.totalRevenue / 1000).toFixed(0)}k total`}
            icon={<AttachMoney sx={{ fontSize: { xs: 28, md: 32 } }} />}
            color="success"
            trend={{ value: trends.revenueTrend, isPositive: trends.revenueTrend >= 0 }}
          />
        </Grid>

        <Grid item xs={12} sm={6} lg={3} sx={{ display: { xs: 'none', lg: 'block' } }}>
          <StatCard
            key={`occupancy-${stats.occupancyRate}-${loading}`}
            title="Taxa de Ocupação"
            value={`${(isNaN(stats.occupancyRate) ? 0 : stats.occupancyRate).toFixed(1)}%`}
            subtitle={`${stats.activeProperties} propriedades ativas`}
            icon={<People sx={{ fontSize: { xs: 28, md: 32 } }} />}
            color="warning"
            trend={{ value: trends.occupancyTrend, isPositive: trends.occupancyTrend >= 0 }}
          />
        </Grid>

        {/* Sofia Stats - Mobile: Modern Banking Style Layout, Desktop: Card */}
        <Grid item xs={12}>
          {/* Mobile View - Distributed Info Style */}
          <Box sx={{ display: { xs: 'block', md: 'none' } }}>
            {/* Sofia Title Banner */}
            <Box
              sx={{
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                borderRadius: '20px',
                p: 2.5,
                mb: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                boxShadow: '0 8px 32px rgba(99, 102, 241, 0.4)',
              }}
            >
              <Box>
                <Typography variant="h6" fontWeight={700} color="white" sx={{ mb: 0.5 }}>
                  Sofia AI Assistant
                </Typography>
                <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                  Atendimento Inteligente 24/7
                </Typography>
              </Box>
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: '12px',
                  bgcolor: 'rgba(255, 255, 255, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <SmartToy sx={{ fontSize: 28, color: 'white' }} />
              </Box>
            </Box>

            {/* Quick Stats - Banking Style */}
            <Grid container spacing={1.5} sx={{ mb: 2 }}>
              <Grid item xs={6}>
                <Paper
                  sx={{
                    p: 2,
                    background: 'rgba(255, 255, 255, 0.06)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '16px',
                  }}
                >
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                    Conversas Hoje
                  </Typography>
                  <Typography variant="h5" fontWeight={700} color="primary.main">
                    {whatsappStats.activeConversations}
                  </Typography>
                </Paper>
              </Grid>

              <Grid item xs={6}>
                <Paper
                  sx={{
                    p: 2,
                    background: 'rgba(255, 255, 255, 0.06)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '16px',
                  }}
                >
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                    Mensagens
                  </Typography>
                  <Typography variant="h5" fontWeight={700} color="secondary.main">
                    {whatsappStats.messagesTotal}
                  </Typography>
                </Paper>
              </Grid>

              <Grid item xs={12}>
                <Paper
                  sx={{
                    p: 2,
                    background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.1) 100%)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(16, 185, 129, 0.2)',
                    borderRadius: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                      Tempo Médio de Resposta
                    </Typography>
                    <Typography variant="h6" fontWeight={700} color="#10b981">
                      {whatsappStats.avgResponseTime > 0
                        ? `${whatsappStats.avgResponseTime.toFixed(1)}s`
                        : '<1s'}
                    </Typography>
                  </Box>
                  <Chip
                    label="Rápido"
                    size="small"
                    sx={{
                      bgcolor: 'rgba(16, 185, 129, 0.2)',
                      color: '#10b981',
                      fontWeight: 600,
                    }}
                  />
                </Paper>
              </Grid>
            </Grid>

            {/* Action Buttons */}
            <Grid container spacing={1.5}>
              <Grid item xs={6}>
                <Button
                  fullWidth
                  variant="outlined"
                  onClick={() => router.push('/dashboard/conversas')}
                  sx={{
                    borderRadius: '16px',
                    py: 1.5,
                    borderColor: 'rgba(99, 102, 241, 0.3)',
                    color: '#6366f1',
                    fontWeight: 600,
                    '&:hover': {
                      borderColor: '#6366f1',
                      bgcolor: 'rgba(99, 102, 241, 0.1)',
                    },
                  }}
                >
                  Conversas
                </Button>
              </Grid>
              <Grid item xs={6}>
                <Button
                  fullWidth
                  variant="outlined"
                  onClick={() => router.push('/dashboard/agenda')}
                  sx={{
                    borderRadius: '16px',
                    py: 1.5,
                    borderColor: 'rgba(139, 92, 246, 0.3)',
                    color: '#8b5cf6',
                    fontWeight: 600,
                    '&:hover': {
                      borderColor: '#8b5cf6',
                      bgcolor: 'rgba(139, 92, 246, 0.1)',
                    },
                  }}
                >
                  Agenda
                </Button>
              </Grid>
            </Grid>
          </Box>

          {/* Desktop View - Original Card */}
          <Box sx={{ display: { xs: 'none', md: 'block' } }}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Suspense fallback={<CardSkeleton />}>
                  <ConversationsMetricsCard />
                </Suspense>
              </Grid>

              <Grid item xs={12} md={6}>
                <Suspense fallback={<CardSkeleton />}>
                  <AgendaCard onCreateEvent={() => setShowVisitDialog(true)} />
                </Suspense>
              </Grid>
            </Grid>
          </Box>
        </Grid>

      </Grid>

      {/* Dialog para criar nova visita */}
      {/* 🚀 PERFORMANCE: Suspense para lazy loading do dialog */}
      <Suspense fallback={null}>
        <CreateVisitDialog
          open={showVisitDialog}
          onClose={() => setShowVisitDialog(false)}
          onSuccess={() => {
            setShowVisitDialog(false);
            // Recarregar dados se necessário
          }}
        />
      </Suspense>
    </Box>
  );
}