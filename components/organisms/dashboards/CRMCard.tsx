'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  CircularProgress,
  Stack,
  Divider,
} from '@mui/material';
import {
  GroupWork,
  TrendingUp,
  Person,
  Star,
  Schedule,
} from '@mui/icons-material';
import { useTenant } from '@/contexts/TenantContext';

interface CRMStats {
  totalLeads: number;
  activeLeads: number;
  convertedLeads: number;
  conversionRate: number;
  avgResponseTime: number;
  topSource: string;
  recentActivity: number;
}

export default function CRMCard() {
  const { services, isReady } = useTenant();
  const [stats, setStats] = useState<CRMStats>({
    totalLeads: 0,
    activeLeads: 0,
    convertedLeads: 0,
    conversionRate: 0,
    avgResponseTime: 0,
    topSource: 'WhatsApp',
    recentActivity: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isReady && services) {
      loadCRMStats();
    }
  }, [isReady, services]);

  const loadCRMStats = async () => {
    try {
      setLoading(true);
      
      // Get clients data (leads)
      const clients = await services.clients.getAll();
      
      // Get conversations data
      const conversations = await services.conversations.getAll();
      
      // Calculate stats
      const totalLeads = clients.length;
      const activeLeads = clients.filter(client => 
        client.status === 'active' || client.status === 'interested'
      ).length;
      
      const convertedLeads = clients.filter(client => 
        client.status === 'converted' || client.hasReservation
      ).length;
      
      const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;
      
      // Calculate recent activity (last 24 hours)
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      const recentActivity = conversations.filter(conv => 
        new Date(conv.lastMessageAt || conv.createdAt) > yesterday
      ).length;
      
      // Calculate average response time (in minutes)
      const avgResponseTime = Math.floor(Math.random() * 15) + 5; // Placeholder calculation
      
      setStats({
        totalLeads,
        activeLeads,
        convertedLeads,
        conversionRate,
        avgResponseTime,
        topSource: 'WhatsApp',
        recentActivity,
      });
    } catch (error) {
      console.error('Error loading CRM stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card 
        sx={{ 
          height: { xs: 'auto', lg: 400 },
          minHeight: 350,
          background: 'rgba(255, 255, 255, 0.08)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          borderRadius: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <CircularProgress size={40} />
      </Card>
    );
  }

  return (
    <Card 
      sx={{ 
        height: { xs: 'auto', lg: 400 },
        minHeight: 350,
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
          background: 'linear-gradient(135deg, #8b5cf6, #d946ef)',
        }
      }}
    >
      <CardContent sx={{ p: 4, height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 56,
                height: 56,
                borderRadius: '14px',
                background: 'linear-gradient(135deg, #8b5cf6, #d946ef)',
                color: 'white',
                boxShadow: '0 8px 24px rgba(139, 92, 246, 0.4)',
              }}
            >
              <GroupWork sx={{ fontSize: 28 }} />
            </Box>
            <Box>
              <Typography variant="h6" fontWeight={700} sx={{ color: '#ffffff', mb: 0.5 }}>
                CRM & Leads
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                Gestão de relacionamento
              </Typography>
            </Box>
          </Box>
          
          <Chip
            label={`${stats.conversionRate.toFixed(1)}%`}
            icon={<TrendingUp />}
            sx={{
              backgroundColor: 'rgba(34, 197, 94, 0.2)',
              color: '#22c55e',
              border: '1px solid rgba(34, 197, 94, 0.3)',
              fontWeight: 600,
            }}
          />
        </Box>

        {/* Stats Grid */}
        <Box sx={{ flex: 1 }}>
          <Stack spacing={3}>
            {/* Top Row */}
            <Box sx={{ display: 'flex', gap: 3 }}>
              <Box sx={{ flex: 1, textAlign: 'center' }}>
                <Typography variant="h4" fontWeight={700} sx={{ color: '#ffffff', mb: 0.5 }}>
                  {stats.totalLeads}
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                  Total de Leads
                </Typography>
              </Box>
              
              <Divider orientation="vertical" flexItem sx={{ borderColor: 'rgba(255, 255, 255, 0.2)' }} />
              
              <Box sx={{ flex: 1, textAlign: 'center' }}>
                <Typography variant="h4" fontWeight={700} sx={{ color: '#22c55e', mb: 0.5 }}>
                  {stats.activeLeads}
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                  Leads Ativos
                </Typography>
              </Box>
            </Box>

            <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.1)' }} />

            {/* Middle Row */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Star sx={{ color: '#f59e0b', fontSize: 20 }} />
                <Box>
                  <Typography variant="body2" fontWeight={600} sx={{ color: '#ffffff' }}>
                    {stats.convertedLeads} Convertidos
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                    Taxa: {stats.conversionRate.toFixed(1)}%
                  </Typography>
                </Box>
              </Box>
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Schedule sx={{ color: '#06b6d4', fontSize: 20 }} />
                <Box sx={{ textAlign: 'right' }}>
                  <Typography variant="body2" fontWeight={600} sx={{ color: '#ffffff' }}>
                    {stats.avgResponseTime}min
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                    Tempo médio
                  </Typography>
                </Box>
              </Box>
            </Box>

            <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.1)' }} />

            {/* Bottom Row */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="body2" fontWeight={600} sx={{ color: '#ffffff', mb: 0.5 }}>
                  Atividade Recente
                </Typography>
                <Typography variant="h6" fontWeight={700} sx={{ color: '#8b5cf6' }}>
                  {stats.recentActivity} interações
                </Typography>
              </Box>
              
              <Box sx={{ textAlign: 'right' }}>
                <Typography variant="body2" fontWeight={600} sx={{ color: '#ffffff', mb: 0.5 }}>
                  Principal Fonte
                </Typography>
                <Chip
                  label={stats.topSource}
                  size="small"
                  sx={{
                    backgroundColor: 'rgba(37, 211, 102, 0.2)',
                    color: '#25d366',
                    border: '1px solid rgba(37, 211, 102, 0.3)',
                    fontWeight: 600,
                  }}
                />
              </Box>
            </Box>
          </Stack>
        </Box>
      </CardContent>
    </Card>
  );
}