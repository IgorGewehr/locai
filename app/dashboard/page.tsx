'use client';

import { useState, useEffect } from 'react';
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
    Skeleton, Divider, Button,
} from '@mui/material';
import {
    Home,
    CalendarMonth,
    People,
    AttachMoney,
    TrendingUp,
    TrendingDown,
    Refresh,
    WhatsApp, Settings,
} from '@mui/icons-material';
import type { DashboardStats } from '@/lib/types';
import { db } from '@/lib/firebase/config';
import { useTenant } from '@/contexts/TenantContext';
import { collection, query, where, getDocs, orderBy, limit, Timestamp } from 'firebase/firestore';
import MiniSiteWidget from '@/components/organisms/marketing/MiniSiteWidget';

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
  return (
    <Card 
      sx={{ 
        height: '100%',
        minHeight: { xs: 180, sm: 200, md: 220, lg: 240 },
        background: 'rgba(255, 255, 255, 0.08)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        borderRadius: { xs: '16px', md: '20px' },
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        position: 'relative',
        overflow: 'hidden',
        '&:hover': {
          transform: 'translateY(-8px)',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
          border: '1px solid rgba(99, 102, 241, 0.4)',
        },
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '4px',
          background: `linear-gradient(135deg, ${color === 'primary' ? '#6366f1, #8b5cf6' : 
            color === 'secondary' ? '#8b5cf6, #d946ef' : 
            color === 'success' ? '#10b981, #059669' :
            color === 'warning' ? '#f59e0b, #d97706' : '#ef4444, #dc2626'})`,
        }
      }}
    >
      <CardContent sx={{ 
        p: { xs: 3, sm: 4, md: 5 }, 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column', 
        justifyContent: 'space-between' 
      }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: { xs: 56, sm: 64, md: 72, lg: 80 },
              height: { xs: 56, sm: 64, md: 72, lg: 80 },
              borderRadius: { xs: '14px', md: '18px' },
              background: `linear-gradient(135deg, ${color === 'primary' ? '#6366f1, #8b5cf6' : 
                color === 'secondary' ? '#8b5cf6, #d946ef' : 
                color === 'success' ? '#10b981, #059669' :
                color === 'warning' ? '#f59e0b, #d97706' : '#ef4444, #dc2626'})`,
              color: 'white',
              boxShadow: `0 8px 24px ${color === 'primary' ? 'rgba(99, 102, 241, 0.4)' : 
                color === 'secondary' ? 'rgba(139, 92, 246, 0.4)' : 
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
                px: { xs: 1.5, md: 2 },
                py: { xs: 0.5, md: 1 },
                border: `1px solid ${trend.isPositive ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
              }}
            >
              {trend.isPositive ? (
                <TrendingUp sx={{ color: '#10b981', fontSize: { xs: 18, md: 20 } }} />
              ) : (
                <TrendingDown sx={{ color: '#ef4444', fontSize: { xs: 18, md: 20 } }} />
              )}
              <Typography
                variant="body2"
                color={trend.isPositive ? '#10b981' : '#ef4444'}
                fontWeight="700"
                sx={{ fontSize: { xs: '0.875rem', md: '1rem' } }}
              >
{!isNaN(trend.value) ? trend.value : 0}%
              </Typography>
            </Box>
          )}
        </Box>

        <Box sx={{ mt: { xs: 2, md: 3 } }}>
          <Typography 
            variant="h2" 
            fontWeight="800" 
            sx={{
              color: '#ffffff',
              mb: 1,
              fontSize: { xs: '2rem', sm: '2.25rem', md: '2.5rem', lg: '2.75rem' },
            }}
          >
{typeof value === 'number' && !isNaN(value) ? value.toLocaleString() : (value || '0')}
          </Typography>

          <Typography 
            variant="h6" 
            sx={{ 
              color: '#ffffff',
              fontWeight: 600,
              fontSize: { xs: '1.125rem', md: '1.25rem', lg: '1.375rem' },
              mb: 0.5
            }}
          >
            {title}
          </Typography>

          {subtitle && (
            <Typography 
              variant="body2" 
              sx={{ 
                color: 'rgba(255, 255, 255, 0.85)',
                fontSize: { xs: '0.875rem', md: '1rem' }
              }}
            >
              {subtitle}
            </Typography>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { services, isReady } = useTenant();
  const [stats, setStats] = useState<DashboardStats>(initialStats);
  const [loading, setLoading] = useState(true);
  const [whatsappStats, setWhatsappStats] = useState({
    messagesTotal: 0,
    activeConversations: 0,
    avgResponseTime: 0,
    connected: false,
  });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [trends, setTrends] = useState({
    propertiesTrend: 0,
    reservationsTrend: 0,
    revenueTrend: 0,
    occupancyTrend: 0
  });

  const fetchStats = async () => {
    if (!services || !isReady) return;
    
    setLoading(true);
    try {
      // Fetch properties
      const properties = await services.properties.getAll();
      const activeProperties = properties.filter(p => p.isActive === true);

      // Fetch reservations
      const reservations = await services.reservations.getAll();
      const pendingReservations = reservations.filter(r => r.status === 'pending');

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

      // Check WhatsApp connection status
      let whatsappConnected = false;
      try {
        // First check Web session
        const sessionResponse = await fetch('/api/whatsapp/session');
        if (sessionResponse.ok) {
          const sessionData = await sessionResponse.json();
          if (sessionData.data && sessionData.data.connected) {
            whatsappConnected = true;
          }
        }
        
        // If Web is not connected, check API
        if (!whatsappConnected) {
          const apiResponse = await fetch('/api/config/whatsapp');
          if (apiResponse.ok) {
            const apiData = await apiResponse.json();
            whatsappConnected = apiData.status === 'connected';
          }
        }
      } catch (error) {
        // WhatsApp connection check handled
      }

      // Fetch WhatsApp stats
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const messagesQuery = query(
        collection(db, 'messages'),
        where('timestamp', '>=', Timestamp.fromDate(today))
      );
      const messagesSnapshot = await getDocs(messagesQuery);

      const conversationsQuery = query(
        collection(db, 'conversations'),
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

      // Fetch recent activity - try multiple collections
      let activities = [];
      try {
        const activityQuery = query(
          collection(db, 'activity_logs'),
          orderBy('timestamp', 'desc'),
          limit(4)
        );
        const activitySnapshot = await getDocs(activityQuery);
        activities = activitySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
      } catch (error) {
        // If activity_logs doesn't exist, create fallback from recent reservations
        const recentReservations = reservations
          .sort((a, b) => new Date(b.createdAt || Date.now()).getTime() - new Date(a.createdAt || Date.now()).getTime())
          .slice(0, 2);
        
        const recentMessages = messagesSnapshot.docs
          .slice(0, 2)
          .map(doc => doc.data());
        
        activities = [
          ...recentReservations.map(r => ({
            id: r.id,
            action: 'Nova reserva criada',
            timestamp: r.createdAt || new Date(),
            description: `Reserva para ${r.propertyName || 'propriedade'}`
          })),
          ...recentMessages.map(m => ({
            id: m.id || Math.random().toString(),
            action: 'Nova mensagem WhatsApp',
            timestamp: m.timestamp || new Date(),
            description: 'Mensagem recebida via WhatsApp'
          }))
        ].slice(0, 4);
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

      setRecentActivity(activities);
      
      // Set calculated trends
      setTrends({
        propertiesTrend: 0, // Properties trend (growth in properties)
        reservationsTrend: Math.round(reservationsTrend),
        revenueTrend: Math.round(revenueTrend),
        occupancyTrend: 0 // Calculate based on previous month if needed
      });
    } catch (error) {

    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [services, isReady]);

  const refreshStats = async () => {
    await fetchStats();
  };

  return (
    <Box>
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
              fontSize: { xs: '2.125rem', sm: '2.5rem', md: '2.75rem', lg: '3rem' }
            }}
          >
            Dashboard
          </Typography>
          <Typography 
            variant="subtitle1" 
            sx={{ 
              color: 'rgba(255, 255, 255, 0.85)', 
              fontWeight: 500,
              fontSize: { xs: '1rem', md: '1.125rem', lg: '1.25rem' }
            }}
          >
            Visão geral do sistema imobiliário
          </Typography>
        </Box>
        <IconButton 
          onClick={refreshStats} 
          disabled={loading}
          sx={{
            background: 'rgba(99, 102, 241, 0.1)',
            border: '1px solid rgba(99, 102, 241, 0.2)',
            borderRadius: '12px',
            p: { xs: 1.5, md: 2 },
            width: { xs: 48, md: 56 },
            height: { xs: 48, md: 56 },
            '&:hover': {
              background: 'rgba(99, 102, 241, 0.2)',
              transform: 'scale(1.05)',
            }
          }}
        >
          <Refresh sx={{ color: '#6366f1', fontSize: { xs: 20, md: 24 } }} />
        </IconButton>
      </Box>

      {loading && (
        <Box sx={{ mb: 3 }}>
          <LinearProgress 
            sx={{ 
              height: 4,
              borderRadius: 2,
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              '& .MuiLinearProgress-bar': {
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                borderRadius: 2,
              }
            }} 
          />
        </Box>
      )}

      {/* Optimized Grid Layout for iPad */}
      <Grid container spacing={{ xs: 3, md: 4, lg: 5 }}>
        {/* Top Row - Main Statistics (Responsive for iPad) */}
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Propriedades Ativas"
            value={loading ? 0 : stats.activeProperties}
            subtitle={loading ? "Carregando..." : `${stats.totalProperties} total`}
            icon={<Home sx={{ fontSize: { xs: 32, md: 36, lg: 40 } }} />}
            color="primary"
            trend={{ value: trends.propertiesTrend, isPositive: trends.propertiesTrend >= 0 }}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Reservas Pendentes"
            value={loading ? 0 : stats.pendingReservations}
            subtitle={loading ? "Carregando..." : `${stats.totalReservations} total`}
            icon={<CalendarMonth sx={{ fontSize: { xs: 32, md: 36, lg: 40 } }} />}
            color="secondary"
            trend={{ value: trends.reservationsTrend, isPositive: trends.reservationsTrend >= 0 }}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Receita Mensal"
            value={loading ? "R$ 0" : `R$ ${(isNaN(stats.monthlyRevenue) ? 0 : stats.monthlyRevenue / 1000).toFixed(1)}k`}
            subtitle={loading ? "Carregando..." : `R$ ${(isNaN(stats.totalRevenue) ? 0 : stats.totalRevenue / 1000).toFixed(0)}k total`}
            icon={<AttachMoney sx={{ fontSize: { xs: 32, md: 36, lg: 40 } }} />}
            color="success"
            trend={{ value: trends.revenueTrend, isPositive: trends.revenueTrend >= 0 }}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Taxa de Ocupação"
            value={loading ? "0%" : `${(isNaN(stats.occupancyRate) ? 0 : stats.occupancyRate).toFixed(1)}%`}
            subtitle={loading ? "Carregando..." : `${stats.activeProperties} propriedades ativas`}
            icon={<People sx={{ fontSize: { xs: 32, md: 36, lg: 40 } }} />}
            color="warning"
            trend={{ value: trends.occupancyTrend, isPositive: trends.occupancyTrend >= 0 }}
          />
        </Grid>

        {/* Second Row - Detailed Information Cards (3 Equal Cards) */}
        <Grid item xs={12} lg={4}>
          <MiniSiteWidget tenantId="default-tenant" />
        </Grid>
        
        <Grid item xs={12} lg={4}>
          <Card 
            sx={{ 
              height: { xs: 'auto', lg: 400 },
              minHeight: 350,
              background: 'rgba(255, 255, 255, 0.08)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '20px',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: '0 16px 50px rgba(0, 0, 0, 0.4)',
              }
            }}
          >
            <CardContent sx={{ p: 4, height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 56,
                      height: 56,
                      borderRadius: '16px',
                      background: 'linear-gradient(135deg, #10b981, #059669)',
                      boxShadow: '0 8px 24px rgba(16, 185, 129, 0.4)',
                    }}
                  >
                    <WhatsApp sx={{ color: 'white', fontSize: 28 }} />
                  </Box>
                  <Box>
                    <Typography 
                      variant="h5" 
                      component="h2"
                      sx={{ 
                        color: '#ffffff',
                        fontWeight: 700,
                        fontSize: '1.5rem',
                        mb: 0.5
                      }}
                    >
                      WhatsApp AI
                    </Typography>
                    <Chip 
                      label={whatsappStats.connected ? "Conectado" : "Desconectado"} 
                      sx={{
                        background: whatsappStats.connected ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                        color: whatsappStats.connected ? '#10b981' : '#ef4444',
                        border: whatsappStats.connected ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
                        fontWeight: 600,
                        fontSize: '0.875rem',
                        height: 28,
                      }}
                    />
                  </Box>
                </Box>
                <IconButton 
                  href="/dashboard/settings"
                  sx={{
                    background: 'rgba(16, 185, 129, 0.1)',
                    border: '1px solid rgba(16, 185, 129, 0.2)',
                    color: '#10b981',
                    '&:hover': {
                      background: 'rgba(16, 185, 129, 0.2)',
                      transform: 'scale(1.05)',
                    }
                  }}
                >
                  <Settings />
                </IconButton>
              </Box>

              <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                <Box 
                  sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    p: 2,
                    borderRadius: '12px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    transition: 'all 0.2s',
                    '&:hover': {
                      background: 'rgba(255, 255, 255, 0.08)',
                    }
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                      💬 Mensagens hoje
                    </Typography>
                  </Box>
                  <Typography variant="h6" sx={{ color: '#ffffff', fontWeight: 700 }}>
                    {loading ? '-' : whatsappStats.messagesTotal}
                  </Typography>
                </Box>

                <Box 
                  sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    p: 2,
                    borderRadius: '12px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    transition: 'all 0.2s',
                    '&:hover': {
                      background: 'rgba(255, 255, 255, 0.08)',
                    }
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                      👥 Conversas ativas
                    </Typography>
                  </Box>
                  <Typography variant="h6" sx={{ color: '#ffffff', fontWeight: 700 }}>
                    {loading ? '-' : whatsappStats.activeConversations}
                  </Typography>
                </Box>

                <Box 
                  sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    p: 2,
                    borderRadius: '12px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    transition: 'all 0.2s',
                    '&:hover': {
                      background: 'rgba(255, 255, 255, 0.08)',
                    }
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                      ⚡ Tempo de resposta
                    </Typography>
                  </Box>
                  <Typography variant="h6" sx={{ color: '#ffffff', fontWeight: 700 }}>
                    {loading ? '-' : whatsappStats.avgResponseTime > 0 ? `${(isNaN(whatsappStats.avgResponseTime) ? 0 : whatsappStats.avgResponseTime).toFixed(1)}s` : 'N/A'}
                  </Typography>
                </Box>
              </Box>

              {whatsappStats.connected && (
                <>
                  <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.1)', my: 3 }} />
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <Button
                      variant="contained"
                      startIcon={<WhatsApp />}
                      href="/dashboard/conversations"
                      sx={{ 
                        flex: 1,
                        background: 'linear-gradient(135deg, #10b981, #059669)',
                        '&:hover': {
                          background: 'linear-gradient(135deg, #059669, #047857)',
                        },
                        textTransform: 'none',
                        fontWeight: 600,
                        py: 1.5,
                        borderRadius: '12px',
                      }}
                    >
                      Ver Conversas
                    </Button>
                  </Box>
                </>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} lg={4}>
          <Card 
            sx={{ 
              height: { xs: 'auto', lg: 400 },
              minHeight: 350,
              background: 'rgba(255, 255, 255, 0.08)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '20px',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: '0 16px 50px rgba(0, 0, 0, 0.4)',
              }
            }}
          >
            <CardContent sx={{ p: 4, height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 56,
                      height: 56,
                      borderRadius: '16px',
                      background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                      boxShadow: '0 8px 24px rgba(99, 102, 241, 0.4)',
                    }}
                  >
                    <TrendingUp sx={{ color: 'white', fontSize: 28 }} />
                  </Box>
                  <Box>
                    <Typography 
                      variant="h5" 
                      component="h2"
                      sx={{ 
                        color: '#ffffff',
                        fontWeight: 700,
                        fontSize: '1.5rem',
                        mb: 0.5
                      }}
                    >
                      Atividade Recente
                    </Typography>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        color: 'rgba(255, 255, 255, 0.7)',
                        fontSize: '0.875rem'
                      }}
                    >
                      Últimas 24 horas
                    </Typography>
                  </Box>
                </Box>
                <IconButton 
                  onClick={refreshStats}
                  sx={{
                    background: 'rgba(99, 102, 241, 0.1)',
                    border: '1px solid rgba(99, 102, 241, 0.2)',
                    color: '#6366f1',
                    '&:hover': {
                      background: 'rgba(99, 102, 241, 0.2)',
                      transform: 'scale(1.05)',
                    }
                  }}
                >
                  <Refresh />
                </IconButton>
              </Box>

              <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, overflow: 'auto' }}>
                {loading ? (
                  Array.from({ length: 4 }).map((_, index) => (
                    <Skeleton key={index} variant="rectangular" height={70} sx={{ borderRadius: '12px' }} />
                  ))
                ) : recentActivity.length > 0 ? (
                  recentActivity.map((item, index) => {
                    const getActivityIcon = () => {
                      if (item.action?.includes('reserva') || item.description?.includes('Reserva')) {
                        return { icon: '📅', color: '#8b5cf6' };
                      }
                      if (item.action?.includes('mensagem') || item.action?.includes('WhatsApp')) {
                        return { icon: '💬', color: '#10b981' };
                      }
                      if (item.action?.includes('cliente')) {
                        return { icon: '👤', color: '#3b82f6' };
                      }
                      if (item.action?.includes('propriedade')) {
                        return { icon: '🏠', color: '#f59e0b' };
                      }
                      return { icon: '📌', color: '#6b7280' };
                    };

                    const { icon, color } = getActivityIcon();
                    const timeAgo = item.timestamp ? new Date(item.timestamp.toDate ? item.timestamp.toDate() : item.timestamp) : new Date();
                    const formattedTime = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' }).format(
                      Math.ceil((timeAgo.getTime() - new Date().getTime()) / (1000 * 60)),
                      'minute'
                    );

                    return (
                      <Box 
                        key={index}
                        sx={{ 
                          display: 'flex', 
                          gap: 2,
                          p: 2,
                          borderRadius: '12px',
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          transition: 'all 0.2s',
                          cursor: 'pointer',
                          '&:hover': {
                            background: 'rgba(255, 255, 255, 0.08)',
                            transform: 'translateX(4px)',
                          }
                        }}
                        onClick={() => {
                          if (item.link) {
                            window.location.href = item.link;
                          }
                        }}
                      >
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 40,
                            height: 40,
                            borderRadius: '10px',
                            background: `${color}20`,
                            flexShrink: 0,
                          }}
                        >
                          <Typography sx={{ fontSize: '1.25rem' }}>{icon}</Typography>
                        </Box>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              color: '#ffffff',
                              fontSize: '0.9rem',
                              fontWeight: 500,
                              mb: 0.5,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {item.action || item.description || 'Atividade'}
                          </Typography>
                          <Typography 
                            variant="caption" 
                            sx={{ 
                              color: 'rgba(255, 255, 255, 0.6)',
                              fontSize: '0.8rem'
                            }}
                          >
                            {formattedTime}
                          </Typography>
                        </Box>
                      </Box>
                    );
                  })
                ) : (
                  <Box 
                    sx={{ 
                      flex: 1, 
                      display: 'flex', 
                      flexDirection: 'column', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      gap: 2
                    }}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 80,
                        height: 80,
                        borderRadius: '20px',
                        background: 'rgba(99, 102, 241, 0.1)',
                      }}
                    >
                      <Typography sx={{ fontSize: '2.5rem' }}>🎯</Typography>
                    </Box>
                    <Typography 
                      variant="body1" 
                      sx={{ 
                        color: 'rgba(255, 255, 255, 0.7)', 
                        textAlign: 'center' 
                      }}
                    >
                      Nenhuma atividade nas últimas 24 horas
                    </Typography>
                    <Typography 
                      variant="caption" 
                      sx={{ 
                        color: 'rgba(255, 255, 255, 0.5)', 
                        textAlign: 'center',
                        maxWidth: '80%'
                      }}
                    >
                      As atividades aparecerão aqui quando houver novas reservas, mensagens ou ações no sistema
                    </Typography>
                  </Box>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Quick Actions */}
        <Grid item xs={12}>
          <Card 
            sx={{ 
              height: 'auto',
              minHeight: 150,
              background: 'rgba(255, 255, 255, 0.08)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '20px',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: '0 16px 50px rgba(0, 0, 0, 0.4)',
              }
            }}
          >
            <CardContent sx={{ p: 4, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <Typography 
                variant="h5" 
                component="h2"
                sx={{ 
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '1.5rem',
                  mb: 3
                }}
              >
                Ações Rápidas
              </Typography>

              <Box sx={{ 
                display: 'flex', 
                gap: { xs: 1.5, md: 2 }, 
                flexWrap: 'wrap', 
                alignItems: 'center',
                justifyContent: { xs: 'center', sm: 'flex-start' }
              }}>
                <Chip
                  label="+ Propriedade"
                  clickable
                  sx={{
                    background: 'rgba(99, 102, 241, 0.2)',
                    color: '#c7d2fe',
                    border: '1px solid rgba(99, 102, 241, 0.3)',
                    fontWeight: 600,
                    fontSize: { xs: '0.875rem', md: '1rem' },
                    height: { xs: 44, md: 48 },
                    px: { xs: 2, md: 3 },
                    minWidth: { xs: 44, md: 48 },
                    '&:hover': {
                      background: 'rgba(99, 102, 241, 0.3)',
                      transform: 'scale(1.05)',
                    },
                    '&:active': {
                      transform: 'scale(0.98)',
                    }
                  }}
                  onClick={() => window.location.href = '/dashboard/properties/create'}
                />
                <Chip
                  label={`💬 Conversas (${whatsappStats.activeConversations})`}
                  clickable
                  sx={{
                    background: 'rgba(139, 92, 246, 0.2)',
                    color: '#d8b4fe',
                    border: '1px solid rgba(139, 92, 246, 0.3)',
                    fontWeight: 600,
                    fontSize: { xs: '0.875rem', md: '1rem' },
                    height: { xs: 44, md: 48 },
                    px: { xs: 2, md: 3 },
                    minWidth: { xs: 44, md: 48 },
                    '&:hover': {
                      background: 'rgba(139, 92, 246, 0.3)',
                      transform: 'scale(1.05)',
                    },
                    '&:active': {
                      transform: 'scale(0.98)',
                    }
                  }}
                  onClick={() => window.location.href = '/dashboard/conversations'}
                />
                <Chip
                  label="💰 Financeiro"
                  clickable
                  sx={{
                    background: 'rgba(16, 185, 129, 0.2)',
                    color: '#6ee7b7',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    fontWeight: 600,
                    fontSize: { xs: '0.875rem', md: '1rem' },
                    height: { xs: 44, md: 48 },
                    px: { xs: 2, md: 3 },
                    minWidth: { xs: 44, md: 48 },
                    '&:hover': {
                      background: 'rgba(16, 185, 129, 0.3)',
                      transform: 'scale(1.05)',
                    },
                    '&:active': {
                      transform: 'scale(0.98)',
                    }
                  }}
                  onClick={() => window.location.href = '/dashboard/financeiro'}
                />
                <Chip
                  label="⚙️ Configurações"
                  clickable
                  sx={{
                    background: 'rgba(245, 158, 11, 0.2)',
                    color: '#fde68a',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                    fontWeight: 600,
                    fontSize: { xs: '0.875rem', md: '1rem' },
                    height: { xs: 44, md: 48 },
                    px: { xs: 2, md: 3 },
                    minWidth: { xs: 44, md: 48 },
                    '&:hover': {
                      background: 'rgba(245, 158, 11, 0.3)',
                      transform: 'scale(1.05)',
                    },
                    '&:active': {
                      transform: 'scale(0.98)',
                    }
                  }}
                  onClick={() => window.location.href = '/dashboard/settings'}
                />
                <Chip
                  label="🌐 Mini-Site"
                  clickable
                  sx={{
                    background: 'rgba(236, 72, 153, 0.2)',
                    color: '#f9a8d4',
                    border: '1px solid rgba(236, 72, 153, 0.3)',
                    fontWeight: 600,
                    fontSize: { xs: '0.875rem', md: '1rem' },
                    height: { xs: 44, md: 48 },
                    px: { xs: 2, md: 3 },
                    minWidth: { xs: 44, md: 48 },
                    '&:hover': {
                      background: 'rgba(236, 72, 153, 0.3)',
                      transform: 'scale(1.05)',
                    },
                    '&:active': {
                      transform: 'scale(0.98)',
                    }
                  }}
                  onClick={() => window.location.href = '/dashboard/mini-site'}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}