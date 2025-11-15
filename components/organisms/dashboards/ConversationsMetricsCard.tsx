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
      <Card sx={{ height: '100%' }}>
        <CardHeader title={<Skeleton width={200} />} />
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Skeleton variant="rectangular" height={60} />
            </Grid>
            <Grid item xs={6}>
              <Skeleton variant="rectangular" height={60} />
            </Grid>
            <Grid item xs={12}>
              <Skeleton variant="rectangular" height={40} />
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    );
  }

  if (error || !metrics) {
    return (
      <Card sx={{ height: '100%' }}>
        <CardHeader title="💬 Conversas com Sofia" />
        <CardContent>
          <Alert
            severity="error"
            action={
              <Button size="small" onClick={loadMetrics}>
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
    <Card sx={{ height: '100%' }}>
      <CardHeader
        title="💬 Conversas com Sofia"
        action={
          <Chip label="Hoje" size="small" color="primary" variant="outlined" />
        }
      />
      <CardContent>
        <Grid container spacing={2}>
          {/* Main metrics */}
          <Grid item xs={6}>
            <Box>
              <Typography variant="h3" color="primary" fontWeight="bold">
                {metrics.today.total}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Conversas
              </Typography>
            </Box>
          </Grid>

          <Grid item xs={6}>
            <Box>
              <Typography variant="h3" color="success.main" fontWeight="bold">
                {formatResponseTime(metrics.today.avgResponseTime)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Tempo Médio
              </Typography>
            </Box>
          </Grid>

          <Grid item xs={12}>
            <Divider />
          </Grid>

          {/* Status breakdown */}
          <Grid item xs={6}>
            <Chip
              label={`✅ ${metrics.today.completed} concluídas`}
              size="small"
              color="success"
              variant="outlined"
              sx={{ width: '100%' }}
            />
          </Grid>

          <Grid item xs={6}>
            <Chip
              label={`⚡ ${metrics.today.active} ativas`}
              size="small"
              color="warning"
              variant="outlined"
              sx={{ width: '100%' }}
            />
          </Grid>

          {/* Week summary */}
          <Grid item xs={12}>
            <Box
              sx={{
                mt: 1,
                p: 1.5,
                bgcolor: 'background.default',
                borderRadius: 1,
              }}
            >
              <Typography variant="body2" color="text.secondary">
                📈 Semana: <strong>{metrics.week.total} conversas</strong>
                {metrics.week.conversionRate !== undefined && (
                  <>
                    {' '}
                    • Taxa de conversão:{' '}
                    <strong style={{ color: metrics.week.conversionRate > 50 ? '#2e7d32' : '#ed6c02' }}>
                      {metrics.week.conversionRate}%
                    </strong>
                  </>
                )}
              </Typography>
            </Box>
          </Grid>
        </Grid>

        {/* Action button */}
        <Box sx={{ mt: 2 }}>
          <Button
            fullWidth
            variant="outlined"
            onClick={() => router.push('/dashboard/metricas')}
          >
            Ver Detalhes →
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
}
