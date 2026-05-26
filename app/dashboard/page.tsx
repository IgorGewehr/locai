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
    People,
    TrendingUp,
    TrendingDown,
    Refresh,
    WhatsApp,
    SmartToy,
    NotificationsActive,
} from '@mui/icons-material';
import { toDate } from '@/lib/utils/date-helpers';
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
    <CircularProgress size={40} sx={{ color: 'rgba(220, 38, 38, 0.6)' }} />
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
    primary:   { accent: '#dc2626', iconBg: 'rgba(220,38,38,0.12)',  iconColor: '#f87171' },
    secondary: { accent: '#dc2626', iconBg: 'rgba(220, 38, 38,0.12)', iconColor: '#f87171' },
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
  const [agentMetrics, setAgentMetrics] = useState({
    leadsThisMonth: 0,
    totalLeads: 0,
    needsYou: 0,
    hot: 0,
    warm: 0,
    cold: 0,
  });

  // 🚀 OTIMIZAÇÃO: useCallback previne re-criação da função
  // e evita loop infinito no useEffect
  const fetchStats = useCallback(async () => {
    if (!services || !tenantId || !isReady) return;

    setLoading(true);
    try {
      // Properties (real — shown by the agent)
      const properties = await services.properties.getAll();
      const activeProperties = properties.filter((p: any) => p.isActive === true);

      // Leads — the agent's core output: classification, temperature, escalations
      const leads = await services.leads.getAll(500);
      const now = new Date();
      const leadsThisMonth = leads.filter((l: any) => {
        const d = toDate(l.createdAt);
        return d && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }).length;
      let needsYou = 0, hot = 0, warm = 0, cold = 0;
      leads.forEach((l: any) => {
        if (l.escalation?.active) needsYou++;
        if (l.temperature === 'hot') hot++;
        else if (l.temperature === 'warm') warm++;
        else cold++;
      });

      // WhatsApp / Sofia stats from tenant-isolated collections
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

      // Average response time from real bot messages
      let avgResponseTime = 0;
      if (messagesSnapshot.size > 0) {
        const messages = messagesSnapshot.docs.map(doc => doc.data());
        const botMessages = messages.filter(m => m.from === 'bot' && m.responseTime);
        if (botMessages.length > 0) {
          const totalResponseTime = botMessages.reduce((sum, m) => sum + (m.responseTime || 0), 0);
          avgResponseTime = totalResponseTime / botMessages.length;
        }
      }

      setStats(prev => ({
        ...prev,
        totalProperties: properties.length,
        activeProperties: activeProperties.length,
      }));

      setAgentMetrics({ leadsThisMonth, totalLeads: leads.length, needsYou, hot, warm, cold });

      setWhatsappStats({
        messagesTotal: messagesSnapshot.size,
        activeConversations: conversationsSnapshot.size,
        avgResponseTime,
        connected: false,
      });
    } catch (error) {
      logger.error('[Dashboard] Error fetching stats', error instanceof Error ? error : undefined);
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

  const mainCards: { id: string; title: string; value: string | number; subtitle: string; icon: React.ReactNode; color: StatCardProps['color'] }[] = [
    { id: 'properties', title: 'Propriedades Ativas', value: stats.activeProperties, subtitle: `${stats.totalProperties} no total`, icon: <Home sx={{ fontSize: { xs: 28, md: 32 } }} />, color: 'primary' },
    { id: 'leads', title: 'Leads novos (mês)', value: agentMetrics.leadsThisMonth, subtitle: `${agentMetrics.totalLeads} no total`, icon: <People sx={{ fontSize: { xs: 28, md: 32 } }} />, color: 'primary' },
    { id: 'conversas', title: 'Conversas ativas', value: whatsappStats.activeConversations, subtitle: `${whatsappStats.messagesTotal} msgs hoje`, icon: <WhatsApp sx={{ fontSize: { xs: 28, md: 32 } }} />, color: 'success' },
    { id: 'needs', title: 'Precisam de você', value: agentMetrics.needsYou, subtitle: 'atendimentos escalados pela IA', icon: <NotificationsActive sx={{ fontSize: { xs: 28, md: 32 } }} />, color: 'error' },
  ];

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
              background: 'linear-gradient(135deg, #ffffff 0%, #fca5a5 100%)',
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
              background: 'rgba(220, 38, 38, 0.1)',
              border: '1px solid rgba(220, 38, 38, 0.2)',
              borderRadius: '14px',
              p: 2,
              width: 52,
              height: 52,
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                background: 'rgba(220, 38, 38, 0.2)',
                transform: 'translateY(-2px)',
                boxShadow: '0 8px 24px rgba(220, 38, 38, 0.3)',
              }
            }}
          >
            <Refresh sx={{ color: '#dc2626', fontSize: 24 }} />
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
                background: 'linear-gradient(90deg, #dc2626 0%, #dc2626 100%)',
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
        {/* Main Statistics Row — agent-driven metrics */}
        {/* Mobile: Horizontal Carousel */}
        <Grid item xs={12} sx={{ display: { xs: 'block', lg: 'none' } }}>
          <Box
            sx={{
              display: 'flex',
              gap: 2,
              overflowX: 'auto',
              pb: 2,
              scrollSnapType: 'x mandatory',
              '&::-webkit-scrollbar': { height: 6 },
              '&::-webkit-scrollbar-track': { bgcolor: 'rgba(255, 255, 255, 0.05)', borderRadius: 3 },
              '&::-webkit-scrollbar-thumb': {
                bgcolor: 'rgba(220, 38, 38, 0.5)',
                borderRadius: 3,
                '&:hover': { bgcolor: 'rgba(220, 38, 38, 0.7)' },
              },
            }}
          >
            {mainCards.map((card) => (
              <Box key={card.id} sx={{ minWidth: { xs: '85vw', sm: '45%' }, scrollSnapAlign: 'start' }}>
                <StatCard title={card.title} value={card.value} subtitle={card.subtitle} icon={card.icon} color={card.color} />
              </Box>
            ))}
          </Box>
        </Grid>

        {/* Desktop: Grid Layout */}
        {mainCards.map((card) => (
          <Grid key={card.id} item xs={12} sm={6} lg={3} sx={{ display: { xs: 'none', lg: 'block' } }}>
            <StatCard title={card.title} value={card.value} subtitle={card.subtitle} icon={card.icon} color={card.color} />
          </Grid>
        ))}

        {/* Lead temperature strip */}
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', bgcolor: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', p: 2.5 }}>
            <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, color: 'rgba(255,255,255,0.6)', mr: 1, alignSelf: 'center' }}>
              Leads por temperatura
            </Typography>
            {[
              { label: 'Quentes', value: agentMetrics.hot, color: '#fb923c' },
              { label: 'Mornos', value: agentMetrics.warm, color: '#94a3b8' },
              { label: 'Frios', value: agentMetrics.cold, color: '#64748b' },
            ].map((t) => (
              <Box key={t.label} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: t.color }} />
                <Typography sx={{ fontSize: '0.9375rem', fontWeight: 700, color: '#f1f5f9' }}>{t.value}</Typography>
                <Typography sx={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.45)' }}>{t.label}</Typography>
              </Box>
            ))}
          </Box>
        </Grid>

        {/* Sofia Stats - Mobile: Modern Banking Style Layout, Desktop: Card */}
        <Grid item xs={12}>
          {/* Mobile View - Distributed Info Style */}
          <Box sx={{ display: { xs: 'block', md: 'none' } }}>
            {/* Sofia Title Banner */}
            <Box
              sx={{
                background: 'linear-gradient(135deg, #dc2626 0%, #dc2626 100%)',
                borderRadius: '20px',
                p: 2.5,
                mb: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                boxShadow: '0 8px 32px rgba(220, 38, 38, 0.4)',
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
                    borderColor: 'rgba(220, 38, 38, 0.3)',
                    color: '#dc2626',
                    fontWeight: 600,
                    '&:hover': {
                      borderColor: '#dc2626',
                      bgcolor: 'rgba(220, 38, 38, 0.1)',
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
                    borderColor: 'rgba(220, 38, 38, 0.3)',
                    color: '#dc2626',
                    fontWeight: 600,
                    '&:hover': {
                      borderColor: '#dc2626',
                      bgcolor: 'rgba(220, 38, 38, 0.1)',
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