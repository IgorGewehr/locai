'use client';

/**
 * Conversations Metrics Card
 *
 * Displays real-time conversation metrics from Sofia AI
 * Auto-refreshes every 30 seconds
 *
 * @version 1.0.0
 */

import { useState, useEffect } from 'react';
import {
  Card,
  CardHeader,
  CardContent,
  Typography,
  Grid,
  Chip,
  Button,
  Box,
  Divider,
  Skeleton,
  Alert,
} from '@mui/material';
import { useAuth } from '@/contexts/AuthProvider';
import { useRouter } from 'next/navigation';
import { logger } from '@/lib/utils/logger';

interface ConversationMetrics {
  today: {
    total: number;
    active: number;
    completed: number;
    avgResponseTime: number;
  };
  week: {
    total: number;
    conversionRate?: number;
  };
}

export function ConversationsMetricsCard() {
  const { getFirebaseToken, tenantId } = useAuth();
  const router = useRouter();

  const [metrics, setMetrics] = useState<ConversationMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadMetrics() {
    try {
      const token = await getFirebaseToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch('/api/metrics/conversations', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();

      if (result.success && result.data) {
        setMetrics(result.data);
        setError(null);
      } else {
        throw new Error(result.error || 'Failed to load metrics');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load metrics';
      logger.error('[ConversationsMetricsCard] Failed to load metrics', {
        error: errorMessage,
        tenantId: tenantId?.substring(0, 8) + '***',
      });
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMetrics();

    // Auto-refresh every 30 seconds
    const interval = setInterval(loadMetrics, 30000);

    return () => clearInterval(interval);
  }, [tenantId]);

  if (loading) {
    return (
      <Card
        sx={{
          height: { xs: 'auto', md: 450, lg: 500 },
          minHeight: 400,
          background: 'rgba(255, 255, 255, 0.06)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '24px',
        }}
      >
        <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
          <Skeleton variant="text" width={200} height={32} sx={{ mb: 3 }} />
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Skeleton variant="rectangular" height={80} sx={{ borderRadius: '16px' }} />
            </Grid>
            <Grid item xs={6}>
              <Skeleton variant="rectangular" height={80} sx={{ borderRadius: '16px' }} />
            </Grid>
            <Grid item xs={12}>
              <Skeleton variant="rectangular" height={60} sx={{ borderRadius: '12px', mt: 2 }} />
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    );
  }

  if (error || !metrics) {
    return (
      <Card
        sx={{
          height: { xs: 'auto', md: 450, lg: 500 },
          minHeight: 400,
          background: 'rgba(255, 255, 255, 0.06)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '24px',
        }}
      >
        <CardContent sx={{ p: { xs: 2.5, md: 3 }, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <Alert
            severity="error"
            sx={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '12px',
            }}
            action={
              <Button
                size="small"
                onClick={loadMetrics}
                sx={{
                  color: '#ef4444',
                  '&:hover': {
                    background: 'rgba(239, 68, 68, 0.1)',
                  },
                }}
              >
                Tentar Novamente
              </Button>
            }
          >
            {error || 'Erro ao carregar métricas'}
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const formatResponseTime = (seconds: number) => {
    if (seconds < 60) {
      return `${seconds}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  return (
    <Card
      sx={{
        height: { xs: 'auto', md: 450, lg: 500 },
        minHeight: 400,
        background: 'rgba(255, 255, 255, 0.06)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '24px',
        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        position: 'relative',
        overflow: 'hidden',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: '0 12px 40px rgba(99, 102, 241, 0.3)',
          border: '1px solid rgba(99, 102, 241, 0.3)',
        },
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '3px',
          background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
        },
      }}
    >
      <CardContent
        sx={{
          p: { xs: 2.5, md: 3 },
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Typography
            variant="h6"
            sx={{
              color: 'rgba(255, 255, 255, 0.95)',
              fontWeight: 700,
              fontSize: { xs: '1.125rem', md: '1.25rem' },
              letterSpacing: '-0.01em',
            }}
          >
            💬 Conversas com Sofia
          </Typography>
          <Chip
            label="Hoje"
            size="small"
            sx={{
              background: 'rgba(99, 102, 241, 0.15)',
              color: '#c7d2fe',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              fontWeight: 600,
              fontSize: '0.75rem',
            }}
          />
        </Box>

        {/* Main Metrics */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={6}>
            <Box
              sx={{
                p: 2,
                borderRadius: '16px',
                background: 'rgba(99, 102, 241, 0.1)',
                border: '1px solid rgba(99, 102, 241, 0.2)',
              }}
            >
              <Typography
                variant="h3"
                sx={{
                  color: '#6366f1',
                  fontWeight: 800,
                  fontSize: { xs: '1.75rem', md: '2rem' },
                  letterSpacing: '-0.02em',
                  mb: 0.5,
                }}
              >
                {metrics.today.total}
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  color: 'rgba(255, 255, 255, 0.65)',
                  fontSize: '0.8125rem',
                  fontWeight: 500,
                }}
              >
                Conversas
              </Typography>
            </Box>
          </Grid>

          <Grid item xs={6}>
            <Box
              sx={{
                p: 2,
                borderRadius: '16px',
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.2)',
              }}
            >
              <Typography
                variant="h3"
                sx={{
                  color: '#10b981',
                  fontWeight: 800,
                  fontSize: { xs: '1.75rem', md: '2rem' },
                  letterSpacing: '-0.02em',
                  mb: 0.5,
                }}
              >
                {formatResponseTime(metrics.today.avgResponseTime)}
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  color: 'rgba(255, 255, 255, 0.65)',
                  fontSize: '0.8125rem',
                  fontWeight: 500,
                }}
              >
                Tempo Médio
              </Typography>
            </Box>
          </Grid>
        </Grid>

        {/* Status Chips */}
        <Grid container spacing={1.5} sx={{ mb: 3 }}>
          <Grid item xs={6}>
            <Box
              sx={{
                p: 1.5,
                borderRadius: '12px',
                background: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.2)',
                textAlign: 'center',
              }}
            >
              <Typography
                variant="body2"
                sx={{
                  color: '#10b981',
                  fontWeight: 700,
                  fontSize: '0.875rem',
                }}
              >
                ✅ {metrics.today.completed}
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  color: 'rgba(255, 255, 255, 0.6)',
                  fontSize: '0.75rem',
                }}
              >
                Concluídas
              </Typography>
            </Box>
          </Grid>

          <Grid item xs={6}>
            <Box
              sx={{
                p: 1.5,
                borderRadius: '12px',
                background: 'rgba(245, 158, 11, 0.08)',
                border: '1px solid rgba(245, 158, 11, 0.2)',
                textAlign: 'center',
              }}
            >
              <Typography
                variant="body2"
                sx={{
                  color: '#f59e0b',
                  fontWeight: 700,
                  fontSize: '0.875rem',
                }}
              >
                ⚡ {metrics.today.active}
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  color: 'rgba(255, 255, 255, 0.6)',
                  fontSize: '0.75rem',
                }}
              >
                Ativas
              </Typography>
            </Box>
          </Grid>
        </Grid>

        {/* Week Summary */}
        <Box
          sx={{
            p: 2,
            borderRadius: '14px',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            mb: 'auto',
          }}
        >
          <Typography
            variant="body2"
            sx={{
              color: 'rgba(255, 255, 255, 0.85)',
              fontSize: '0.875rem',
              lineHeight: 1.6,
            }}
          >
            📈 Semana:{' '}
            <Box component="span" sx={{ fontWeight: 700, color: '#fff' }}>
              {metrics.week.total} conversas
            </Box>
            {metrics.week.conversionRate !== undefined && (
              <>
                {' • Taxa de conversão: '}
                <Box
                  component="span"
                  sx={{
                    fontWeight: 700,
                    color: metrics.week.conversionRate > 50 ? '#10b981' : '#f59e0b',
                  }}
                >
                  {metrics.week.conversionRate}%
                </Box>
              </>
            )}
          </Typography>
        </Box>

        {/* Action Button */}
        <Button
          fullWidth
          onClick={() => router.push('/dashboard/metricas')}
          sx={{
            mt: 2.5,
            py: 1.25,
            borderRadius: '12px',
            background: 'rgba(99, 102, 241, 0.12)',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            color: '#c7d2fe',
            fontWeight: 600,
            fontSize: '0.875rem',
            textTransform: 'none',
            transition: 'all 0.2s',
            '&:hover': {
              background: 'rgba(99, 102, 241, 0.2)',
              borderColor: 'rgba(99, 102, 241, 0.4)',
              transform: 'translateY(-2px)',
            },
          }}
        >
          Ver Detalhes →
        </Button>
      </CardContent>
    </Card>
  );
}
