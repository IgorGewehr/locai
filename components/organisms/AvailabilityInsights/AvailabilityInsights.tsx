'use client';

import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Alert,
  AlertTitle,
  Button,
  CircularProgress,
  Chip,
  Divider,
  LinearProgress,
  useTheme,
  alpha,
  Stack,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  TrendingFlat,
  AttachMoney,
  EventAvailable,
  Block,
  Refresh,
  Info,
  Warning,
  CheckCircle,
  Error,
  AutoAwesome,
  CompareArrows,
  CalendarMonth,
  Insights as InsightsIcon,
} from '@mui/icons-material';
import { Property } from '@/lib/types/property';
import { useAvailabilityInsights } from '@/lib/hooks/useAvailabilityInsights';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AvailabilityInsightsProps {
  property: Property;
  startDate?: Date;
  endDate?: Date;
}

const ICON_MAP: Record<string, React.ReactNode> = {
  '🎉': <CheckCircle sx={{ fontSize: 40 }} />,
  '💰': <AttachMoney sx={{ fontSize: 40 }} />,
  '⚠️': <Warning sx={{ fontSize: 40 }} />,
  '📈': <TrendingUp sx={{ fontSize: 40 }} />,
  '📉': <TrendingDown sx={{ fontSize: 40 }} />,
  '📅': <CalendarMonth sx={{ fontSize: 40 }} />,
  '🔥': <AutoAwesome sx={{ fontSize: 40 }} />,
  '✅': <CheckCircle sx={{ fontSize: 40 }} />,
  '🚫': <Block sx={{ fontSize: 40 }} />,
  '🎯': <CheckCircle sx={{ fontSize: 40 }} />,
  '💡': <InsightsIcon sx={{ fontSize: 40 }} />,
};

export default function AvailabilityInsights({
  property,
  startDate,
  endDate,
}: AvailabilityInsightsProps) {
  const theme = useTheme();
  const { metrics, insights, loading, error, refresh } = useAvailabilityInsights(
    property,
    startDate,
    endDate
  );

  if (loading) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <CircularProgress />
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          Analisando disponibilidade...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error">
        <AlertTitle>Erro ao carregar insights</AlertTitle>
        {error}
      </Alert>
    );
  }

  const getTrendIcon = (value: number | undefined) => {
    if (value === undefined) return <TrendingFlat />;
    if (value > 5) return <TrendingUp color="success" />;
    if (value < -5) return <TrendingDown color="error" />;
    return <TrendingFlat color="action" />;
  };

  const getTrendColor = (value: number | undefined) => {
    if (value === undefined) return 'default';
    if (value > 5) return 'success';
    if (value < -5) return 'error';
    return 'default';
  };

  return (
    <Box>
      {/* Header */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          mb: 3,
          background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, ${alpha(theme.palette.success.main, 0.05)} 100%)`,
          border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
          borderRadius: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <InsightsIcon sx={{ fontSize: 40, color: 'primary.main' }} />
            <Box>
              <Typography variant="h5" fontWeight={700}>
                Insights de Disponibilidade
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Análise inteligente dos próximos 30 dias
              </Typography>
            </Box>
          </Box>
          <Tooltip title="Atualizar análise">
            <IconButton onClick={refresh} color="primary">
              <Refresh />
            </IconButton>
          </Tooltip>
        </Box>
      </Paper>

      {/* Key Metrics */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                  TAXA DE OCUPAÇÃO
                </Typography>
                {getTrendIcon(metrics.occupancyChange)}
              </Box>
              <Typography variant="h3" fontWeight={700} color="primary.main">
                {metrics.occupancyRate.toFixed(0)}%
              </Typography>
              {metrics.previousOccupancyRate !== undefined && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    vs {metrics.previousOccupancyRate.toFixed(0)}% mês anterior
                  </Typography>
                  {metrics.occupancyChange !== undefined && (
                    <Chip
                      label={`${metrics.occupancyChange > 0 ? '+' : ''}${metrics.occupancyChange.toFixed(0)}%`}
                      size="small"
                      color={getTrendColor(metrics.occupancyChange)}
                      sx={{ height: 20, fontSize: '0.7rem' }}
                    />
                  )}
                </Box>
              )}
              <LinearProgress
                variant="determinate"
                value={metrics.occupancyRate}
                sx={{
                  mt: 2,
                  height: 8,
                  borderRadius: 4,
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                }}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                  RECEITA PROJETADA
                </Typography>
                <AttachMoney color="success" />
              </Box>
              <Typography variant="h3" fontWeight={700} color="success.main">
                R$ {metrics.projectedRevenue.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
              </Typography>
              {metrics.previousRevenue !== undefined && metrics.revenueChange !== undefined && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    vs R$ {metrics.previousRevenue.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                  </Typography>
                  <Chip
                    label={`${metrics.revenueChange > 0 ? '+' : ''}${metrics.revenueChange.toFixed(0)}%`}
                    size="small"
                    color={getTrendColor(metrics.revenueChange)}
                    sx={{ height: 20, fontSize: '0.7rem' }}
                  />
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                  DIAS DISPONÍVEIS
                </Typography>
                <EventAvailable color="info" />
              </Box>
              <Typography variant="h3" fontWeight={700} color="info.main">
                {metrics.availableDays}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                de {metrics.totalDays} dias totais
              </Typography>
              <LinearProgress
                variant="determinate"
                value={(metrics.availableDays / metrics.totalDays) * 100}
                sx={{
                  mt: 2,
                  height: 8,
                  borderRadius: 4,
                  bgcolor: alpha(theme.palette.info.main, 0.1),
                }}
                color="info"
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                  DIÁRIA MÉDIA
                </Typography>
                <AttachMoney color="warning" />
              </Box>
              <Typography variant="h3" fontWeight={700} color="warning.main">
                R$ {metrics.averageDailyRate.toFixed(0)}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                considerando preços especiais
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Weekend vs Weekday Comparison */}
      <Paper elevation={0} sx={{ p: 3, mb: 3, border: `1px solid ${theme.palette.divider}` }}>
        <Typography variant="h6" fontWeight={600} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CompareArrows />
          Fins de Semana vs Dias Úteis
        </Typography>
        <Divider sx={{ my: 2 }} />
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" fontWeight={600}>
                  Fins de Semana
                </Typography>
                <Typography variant="h6" fontWeight={700} color="primary.main">
                  {metrics.weekendOccupancy.toFixed(0)}%
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={metrics.weekendOccupancy}
                sx={{ height: 10, borderRadius: 5 }}
              />
            </Box>
          </Grid>
          <Grid item xs={12} md={6}>
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" fontWeight={600}>
                  Dias Úteis
                </Typography>
                <Typography variant="h6" fontWeight={700} color="secondary.main">
                  {metrics.weekdayOccupancy.toFixed(0)}%
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={metrics.weekdayOccupancy}
                sx={{ height: 10, borderRadius: 5 }}
                color="secondary"
              />
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Insights */}
      <Typography variant="h6" fontWeight={600} gutterBottom sx={{ mb: 2 }}>
        💡 Recomendações Inteligentes
      </Typography>
      <Grid container spacing={2}>
        {insights.length === 0 ? (
          <Grid item xs={12}>
            <Alert severity="info" icon={<Info />}>
              Nenhum insight disponível no momento. Continue monitorando sua propriedade!
            </Alert>
          </Grid>
        ) : (
          insights.map((insight, index) => (
            <Grid item xs={12} key={index}>
              <Alert
                severity={insight.type}
                icon={ICON_MAP[insight.icon] || <Info />}
                action={
                  insight.actionable && (
                    <Button size="small" color="inherit">
                      {insight.actionLabel}
                    </Button>
                  )
                }
                sx={{
                  '& .MuiAlert-icon': {
                    fontSize: 40,
                  },
                }}
              >
                <AlertTitle sx={{ fontWeight: 700 }}>{insight.title}</AlertTitle>
                {insight.description}
              </Alert>
            </Grid>
          ))
        )}
      </Grid>

      {/* Summary Stats */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          mt: 3,
          bgcolor: alpha(theme.palette.info.main, 0.05),
          border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
        }}
      >
        <Typography variant="subtitle2" fontWeight={600} gutterBottom>
          📊 Resumo Detalhado
        </Typography>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={6} sm={3}>
            <Typography variant="caption" color="text.secondary">
              Total de Dias
            </Typography>
            <Typography variant="h6" fontWeight={600}>
              {metrics.totalDays}
            </Typography>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Typography variant="caption" color="text.secondary">
              Dias Reservados
            </Typography>
            <Typography variant="h6" fontWeight={600} color="success.main">
              {metrics.reservedDays}
            </Typography>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Typography variant="caption" color="text.secondary">
              Dias Bloqueados
            </Typography>
            <Typography variant="h6" fontWeight={600} color="error.main">
              {metrics.blockedDays}
            </Typography>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Typography variant="caption" color="text.secondary">
              Dias Disponíveis
            </Typography>
            <Typography variant="h6" fontWeight={600} color="info.main">
              {metrics.availableDays}
            </Typography>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
}
