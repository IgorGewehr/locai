'use client';

import { useState, useEffect, useCallback, memo } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  CircularProgress,
  Stack,
  Divider,
  LinearProgress,
} from '@mui/material';
import {
  Analytics,
  TrendingUp,
  Speed,
  ChatBubble,
  Timer,
  Assessment,
} from '@mui/icons-material';
import { useTenant } from '@/contexts/TenantContext';

interface MetricsStats {
  conversionRate: number;
  qualificationTime: number;
  conversationsResponded: number;
  avgConversationTime: number;
  totalConversations: number;
  responseRate: number;
  trend: {
    conversions: number;
    qualification: number;
    engagement: number;
  };
}

// 🚀 PERFORMANCE: Memoized component
function MetricsCard() {
  const { tenantId, isReady } = useTenant();
  const [stats, setStats] = useState<MetricsStats>({
    conversionRate: 0,
    qualificationTime: 0,
    conversationsResponded: 0,
    avgConversationTime: 0,
    totalConversations: 0,
    responseRate: 0,
    trend: {
      conversions: 0,
      qualification: 0,
      engagement: 0,
    },
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isReady && tenantId) {
      loadMetricsStats();
    }
  }, [isReady, tenantId, loadMetricsStats]); // 🚀 PERFORMANCE: Dependências corretas

  // 🚀 PERFORMANCE: useCallback previne re-criação
  const loadMetricsStats = useCallback(async () => {
    try {
      setLoading(true);

      // Call metrics API to get real data
      const response = await fetch(`/api/metrics/analytics?period=7d`, {
        headers: {
          'x-tenant-id': tenantId,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const metricsData = data.data;

        setStats({
          conversionRate: metricsData.conversions?.leadToVisit || 0,
          qualificationTime: metricsData.qualificationTimes?.avg || 0,
          conversationsResponded: metricsData.engagement?.totalConversations || 0,
          avgConversationTime: metricsData.avgConversationTime?.avg || 0,
          totalConversations: metricsData.engagement?.totalConversations || 0,
          responseRate: metricsData.engagement?.responseRate || 0,
          trend: {
            conversions: metricsData.conversions?.change || 0,
            qualification: metricsData.qualificationTimes?.change || 0,
            engagement: metricsData.engagement?.change || 0,
          },
        });
      } else {
        // Fallback to empty data
        setStats({
          conversionRate: 0,
          qualificationTime: 0,
          conversationsResponded: 0,
          avgConversationTime: 0,
          totalConversations: 0,
          responseRate: 0,
          trend: {
            conversions: 0,
            qualification: 0,
            engagement: 0,
          },
        });
      }
    } catch (error) {
      console.error('Error loading metrics stats:', error);
      // Set empty stats on error
      setStats({
        conversionRate: 0,
        qualificationTime: 0,
        conversationsResponded: 0,
        avgConversationTime: 0,
        totalConversations: 0,
        responseRate: 0,
        trend: {
          conversions: 0,
          qualification: 0,
          engagement: 0,
        },
      });
    } finally {
      setLoading(false);
    }
  }, [tenantId]); // 🚀 PERFORMANCE: Dependência explícita

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
        cursor: 'pointer',
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
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
        }
      }}
      onClick={() => window.location.href = '/dashboard/metricas'}
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
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                color: 'white',
                boxShadow: '0 8px 24px rgba(99, 102, 241, 0.4)',
              }}
            >
              <Analytics sx={{ fontSize: 28 }} />
            </Box>
            <Box>
              <Typography variant="h6" fontWeight={700} sx={{ color: '#ffffff', mb: 0.5 }}>
                Métricas IA
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                Performance da Sofia
              </Typography>
            </Box>
          </Box>

          <Chip
            label={`${stats.responseRate.toFixed(1)}%`}
            icon={<TrendingUp />}
            sx={{
              backgroundColor: stats.trend.engagement >= 0 ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
              color: stats.trend.engagement >= 0 ? '#22c55e' : '#ef4444',
              border: `1px solid ${stats.trend.engagement >= 0 ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
              fontWeight: 600,
            }}
          />
        </Box>

        {/* Main Metrics - Simplified */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <Stack spacing={3}>
            {/* Top Row - Key Metrics */}
            <Box sx={{ display: 'flex', gap: 3 }}>
              <Box sx={{ flex: 1, textAlign: 'center' }}>
                <Typography variant="h4" fontWeight={700} sx={{ color: '#ffffff', mb: 0.5 }}>
                  {stats.conversionRate.toFixed(1)}%
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                  Taxa de Conversão
                </Typography>
              </Box>

              <Divider orientation="vertical" flexItem sx={{ borderColor: 'rgba(255, 255, 255, 0.2)' }} />

              <Box sx={{ flex: 1, textAlign: 'center' }}>
                <Typography variant="h4" fontWeight={700} sx={{ color: '#10b981', mb: 0.5 }}>
                  {stats.qualificationTime > 0 ? `${stats.qualificationTime.toFixed(1)}min` : '--'}
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                  Qualificação
                </Typography>
              </Box>
            </Box>

            {/* Response Rate Progress */}
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="body2" fontWeight={600} sx={{ color: '#ffffff' }}>
                  Taxa de Resposta
                </Typography>
                <Typography variant="h6" sx={{ color: '#ffffff', fontWeight: 700 }}>
                  {stats.responseRate.toFixed(1)}%
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={Math.min(stats.responseRate, 100)}
                sx={{
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  '& .MuiLinearProgress-bar': {
                    background: stats.responseRate >= 80 ?
                      'linear-gradient(135deg, #10b981, #059669)' :
                      stats.responseRate >= 60 ?
                      'linear-gradient(135deg, #f59e0b, #d97706)' :
                      'linear-gradient(135deg, #ef4444, #dc2626)',
                    borderRadius: 4,
                  }
                }}
              />
            </Box>

            {/* Bottom Stats */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h6" fontWeight={700} sx={{ color: '#06b6d4', mb: 0.5 }}>
                  {stats.totalConversations}
                </Typography>
                <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                  Conversas
                </Typography>
              </Box>

              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h6" fontWeight={700} sx={{ color: '#8b5cf6', mb: 0.5 }}>
                  {stats.avgConversationTime > 0 ? `${stats.avgConversationTime.toFixed(1)}m` : '--'}
                </Typography>
                <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                  Tempo Médio
                </Typography>
              </Box>
            </Box>
          </Stack>
        </Box>

        {/* Action Hint */}
        <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <Typography
            variant="caption"
            sx={{
              color: 'rgba(255, 255, 255, 0.6)',
              textAlign: 'center',
              display: 'block'
            }}
          >
            Clique para ver métricas detalhadas
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
}

// 🚀 PERFORMANCE: Export memoized component
export default memo(MetricsCard);