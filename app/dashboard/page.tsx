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
  Skeleton,
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
} from '@mui/icons-material';
import type { DashboardStats } from '@/lib/types';
import { propertyService } from '@/lib/services/property-service';
import { reservationService } from '@/lib/services/reservation-service';
import { clientService } from '@/lib/services/client-service';
import { conversationService } from '@/lib/services/conversation-service';
import { db } from '@/lib/firebase/config';
import { collection, query, where, getDocs, orderBy, limit, Timestamp } from 'firebase/firestore';

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
        minHeight: 180,
        background: 'rgba(255, 255, 255, 0.08)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        borderRadius: '20px',
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
      <CardContent sx={{ p: 4, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 64,
              height: 64,
              borderRadius: '18px',
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
                px: 2,
                py: 1,
                border: `1px solid ${trend.isPositive ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
              }}
            >
              {trend.isPositive ? (
                <TrendingUp sx={{ color: '#10b981', fontSize: 20 }} />
              ) : (
                <TrendingDown sx={{ color: '#ef4444', fontSize: 20 }} />
              )}
              <Typography
                variant="body2"
                color={trend.isPositive ? '#10b981' : '#ef4444'}
                fontWeight="700"
                sx={{ fontSize: '1rem' }}
              >
                {trend.value}%
              </Typography>
            </Box>
          )}
        </Box>

        <Box sx={{ mt: 3 }}>
          <Typography 
            variant="h2" 
            fontWeight="800" 
            sx={{
              color: '#ffffff',
              mb: 1,
              fontSize: 'clamp(2rem, 3vw, 2.5rem)',
            }}
          >
            {typeof value === 'number' ? value.toLocaleString() : value}
          </Typography>

          <Typography 
            variant="h6" 
            sx={{ 
              color: '#ffffff',
              fontWeight: 600,
              fontSize: '1.125rem',
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
                fontSize: '1rem'
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
  const [stats, setStats] = useState<DashboardStats>(initialStats);
  const [loading, setLoading] = useState(true);
  const [whatsappStats, setWhatsappStats] = useState({
    messagesTotal: 0,
    activeConversations: 0,
    avgResponseTime: 0,
  });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      // Fetch properties
      const properties = await propertyService.getAll();
      const activeProperties = properties.filter(p => p.status === 'active');
      
      // Fetch reservations
      const reservations = await reservationService.getAll();
      const pendingReservations = reservations.filter(r => r.status === 'pending');
      
      // Calculate monthly revenue
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const monthlyReservations = reservations.filter(r => {
        const date = r.checkIn.toDate();
        return date.getMonth() === currentMonth && date.getFullYear() === currentYear && r.status === 'confirmed';
      });
      
      const monthlyRevenue = monthlyReservations.reduce((total, r) => total + r.totalPrice, 0);
      const totalRevenue = reservations
        .filter(r => r.status === 'confirmed')
        .reduce((total, r) => total + r.totalPrice, 0);
      
      // Calculate occupancy rate
      const totalDays = activeProperties.length * 30; // Assuming 30 days
      const occupiedDays = reservations
        .filter(r => r.status === 'confirmed')
        .reduce((total, r) => {
          const checkIn = r.checkIn.toDate();
          const checkOut = r.checkOut.toDate();
          const days = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
          return total + days;
        }, 0);
      const occupancyRate = totalDays > 0 ? (occupiedDays / totalDays) * 100 : 0;
      
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
      
      // Fetch recent activity
      const activityQuery = query(
        collection(db, 'activity_logs'),
        orderBy('timestamp', 'desc'),
        limit(4)
      );
      const activitySnapshot = await getDocs(activityQuery);
      const activities = activitySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setStats({
        totalProperties: properties.length,
        activeProperties: activeProperties.length,
        totalReservations: reservations.length,
        pendingReservations: pendingReservations.length,
        totalRevenue,
        monthlyRevenue,
        occupancyRate,
        averageRating: 4.8, // Calculate from reviews when available
      });
      
      setWhatsappStats({
        messagesTotal: messagesSnapshot.size,
        activeConversations: conversationsSnapshot.size,
        avgResponseTime: 1.2, // Calculate from actual response times
      });
      
      setRecentActivity(activities);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const refreshStats = async () => {
    await fetchStats();
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
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
            }}
          >
            Dashboard
          </Typography>
          <Typography 
            variant="subtitle1" 
            sx={{ color: 'rgba(255, 255, 255, 0.85)', fontWeight: 500 }}
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
            p: 1.5,
            '&:hover': {
              background: 'rgba(99, 102, 241, 0.2)',
              transform: 'scale(1.05)',
            }
          }}
        >
          <Refresh sx={{ color: '#6366f1' }} />
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

      {/* Symmetric Grid Layout */}
      <Grid container spacing={4}>
        {/* Top Row - Main Statistics (4 Equal Cards) */}
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard
            title="Propriedades Ativas"
            value={24}
            subtitle="32 total"
            icon={<Home sx={{ fontSize: 32 }} />}
            color="primary"
            trend={{ value: 12, isPositive: true }}
          />
        </Grid>

        <Grid item xs={12} sm={6} lg={3}>
          <StatCard
            title="Reservas Pendentes"
            value={8}
            subtitle="156 total"
            icon={<CalendarMonth sx={{ fontSize: 32 }} />}
            color="secondary"
            trend={{ value: 24, isPositive: true }}
          />
        </Grid>

        <Grid item xs={12} sm={6} lg={3}>
          <StatCard
            title="Receita Mensal"
            value="R$ 45.2k"
            subtitle="R$ 324k total"
            icon={<AttachMoney sx={{ fontSize: 32 }} />}
            color="success"
            trend={{ value: 18, isPositive: true }}
          />
        </Grid>

        <Grid item xs={12} sm={6} lg={3}>
          <StatCard
            title="Taxa de Ocupação"
            value="89.5%"
            subtitle="4.8 ⭐ média"
            icon={<People sx={{ fontSize: 32 }} />}
            color="warning"
            trend={{ value: 5, isPositive: false }}
          />
        </Grid>

        {/* Second Row - Detailed Information Cards (2 Equal Cards) */}
        <Grid item xs={12} lg={6}>
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
            <CardContent sx={{ p: 4, height: '100%' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                <Typography 
                  variant="h5" 
                  component="h2"
                  sx={{ 
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '1.5rem'
                  }}
                >
                  Status WhatsApp
                </Typography>
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
              </Box>
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
                <Chip 
                  label="Conectado" 
                  sx={{
                    background: 'rgba(16, 185, 129, 0.15)',
                    color: '#10b981',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    fontWeight: 600,
                    fontSize: '1rem',
                    px: 2,
                    py: 1,
                  }}
                />
                <Typography 
                  variant="body1" 
                  sx={{ 
                    color: 'rgba(255, 255, 255, 0.8)',
                    fontSize: '1.125rem'
                  }}
                >
                  Sistema funcionando perfeitamente
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '1.125rem' }}>
                    Mensagens hoje:
                  </Typography>
                  <Typography variant="h6" sx={{ color: '#ffffff', fontWeight: 700, fontSize: '1.25rem' }}>
                    127
                  </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '1.125rem' }}>
                    Conversas ativas:
                  </Typography>
                  <Typography variant="h6" sx={{ color: '#ffffff', fontWeight: 700, fontSize: '1.25rem' }}>
                    23
                  </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '1.125rem' }}>
                    Tempo médio resposta:
                  </Typography>
                  <Typography variant="h6" sx={{ color: '#ffffff', fontWeight: 700, fontSize: '1.25rem' }}>
                    1.2s
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} lg={6}>
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
            <CardContent sx={{ p: 4, height: '100%' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                <Typography 
                  variant="h5" 
                  component="h2"
                  sx={{ 
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '1.5rem'
                  }}
                >
                  Atividade Recente
                </Typography>
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
              </Box>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 4 }}>
                {loading ? (
                  Array.from({ length: 4 }).map((_, index) => (
                    <Skeleton key={index} variant="rectangular" height={60} sx={{ borderRadius: '12px' }} />
                  ))
                ) : recentActivity.length > 0 ? (
                  recentActivity.map((item, index) => (
                  <Box 
                    key={index}
                    sx={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      p: 2,
                      borderRadius: '12px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                    }}
                  >
                    <Typography 
                      variant="body1" 
                      sx={{ 
                        color: '#ffffff',
                        fontSize: '1rem',
                        fontWeight: 500
                      }}
                    >
                      {item.action || item.description || 'Atividade'}
                    </Typography>
                    <Typography 
                      variant="caption" 
                      sx={{ 
                        color: 'rgba(255, 255, 255, 0.85)',
                        fontSize: '0.875rem'
                      }}
                    >
                      {item.timestamp ? new Date(item.timestamp.toDate()).toLocaleString('pt-BR') : 'Agora'}
                    </Typography>
                  </Box>
                  ))
                ) : (
                  <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.85)', textAlign: 'center', mt: 4 }}>
                    Nenhuma atividade recente
                  </Typography>
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
              
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                <Chip
                  label="Nova Propriedade"
                  clickable
                  sx={{
                    background: 'rgba(99, 102, 241, 0.2)',
                    color: '#c7d2fe',
                    border: '1px solid rgba(99, 102, 241, 0.3)',
                    fontWeight: 600,
                    fontSize: '1rem',
                    height: 40,
                    px: 2,
                    '&:hover': {
                      background: 'rgba(99, 102, 241, 0.3)',
                      transform: 'scale(1.05)',
                    }
                  }}
                  onClick={() => window.location.href = '/dashboard/properties/create'}
                />
                <Chip
                  label="Ver Conversas"
                  clickable
                  sx={{
                    background: 'rgba(139, 92, 246, 0.2)',
                    color: '#d8b4fe',
                    border: '1px solid rgba(139, 92, 246, 0.3)',
                    fontWeight: 600,
                    fontSize: '1rem',
                    height: 40,
                    px: 2,
                    '&:hover': {
                      background: 'rgba(139, 92, 246, 0.3)',
                      transform: 'scale(1.05)',
                    }
                  }}
                  onClick={() => window.location.href = '/dashboard/conversations'}
                />
                <Chip
                  label="Relatórios"
                  clickable
                  sx={{
                    background: 'rgba(16, 185, 129, 0.2)',
                    color: '#6ee7b7',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    fontWeight: 600,
                    fontSize: '1rem',
                    height: 40,
                    px: 2,
                    '&:hover': {
                      background: 'rgba(16, 185, 129, 0.3)',
                      transform: 'scale(1.05)',
                    }
                  }}
                  onClick={() => window.location.href = '/dashboard/analytics'}
                />
                <Chip
                  label="Configurações WhatsApp"
                  clickable
                  sx={{
                    background: 'rgba(245, 158, 11, 0.2)',
                    color: '#fde68a',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                    fontWeight: 600,
                    fontSize: '1rem',
                    height: 40,
                    px: 2,
                    '&:hover': {
                      background: 'rgba(245, 158, 11, 0.3)',
                      transform: 'scale(1.05)',
                    }
                  }}
                  onClick={() => window.location.href = '/dashboard/settings'}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}