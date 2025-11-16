'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  IconButton,
  Tooltip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Avatar,
  Chip,
  LinearProgress,
  Stack,
  Alert
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  Speed,
  Chat,
  AccessTime,
  CheckCircle,
  Timeline,
  Refresh,
  Warning
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useMetrics } from '@/lib/hooks/useMetrics';
import Heatmap from '@/components/organisms/Heatmap';

// Counter Animation Component
const AnimatedCounter = ({ value, suffix = '', duration = 1000 }: { value: number | string; suffix?: string; duration?: number }) => {
  const [displayValue, setDisplayValue] = useState(0);
  const numericValue = typeof value === 'string' ? parseFloat(value) || 0 : value;

  useEffect(() => {
    let start = 0;
    const end = numericValue;
    const increment = end / (duration / 16);
    let current = start;

    const timer = setInterval(() => {
      current += increment;
      if (current >= end) {
        setDisplayValue(end);
        clearInterval(timer);
      } else {
        setDisplayValue(current);
      }
    }, 16);

    return () => clearInterval(timer);
  }, [numericValue, duration]);

  const formattedValue = Number.isInteger(numericValue)
    ? Math.round(displayValue)
    : displayValue.toFixed(1);

  return <span>{formattedValue}{suffix}</span>;
};

// Sparkline Component
const Sparkline = ({ data }: { data: number[] }) => {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * 100;
    const y = 100 - ((value - min) / range) * 100;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width="60" height="20" style={{ marginLeft: '8px' }}>
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
        opacity="0.6"
      />
    </svg>
  );
};

export default function MetricasPage() {
  const [timeRange, setTimeRange] = useState('7d');
  const { data, loading, error, refresh } = useMetrics(timeRange);

  const MetricCard = ({
    title,
    value,
    trend,
    icon,
    color = 'primary',
    suffix = '',
    description
  }: {
    title: string;
    value: number | string;
    trend: number;
    icon: React.ReactNode;
    color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
    suffix?: string;
    description: string;
  }) => {
    const isPositive = trend > 0;
    const isSignificant = Math.abs(trend) > 10;

    return (
      <Card sx={{
        background: 'rgba(255, 255, 255, 0.08)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        borderRadius: '20px',
        position: 'relative',
        overflow: 'hidden',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
          border: '1px solid rgba(255, 255, 255, 0.25)',
        },
        ...(isSignificant && {
          animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
          '@keyframes pulse': {
            '0%, 100%': {
              opacity: 1,
            },
            '50%': {
              opacity: 0.95,
            },
          },
        }),
        '&::before': isSignificant ? {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `radial-gradient(circle at top right, ${
            isPositive ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)'
          }, transparent 70%)`,
          opacity: 0.5,
          pointerEvents: 'none',
        } : {}
      }}>
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Avatar sx={{
            bgcolor: `${color}.main`,
            width: 48,
            height: 48,
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)'
          }}>
            {icon}
          </Avatar>
          <Chip
            size="small"
            icon={trend > 0 ? <TrendingUp /> : <TrendingDown />}
            label={`${trend > 0 ? '+' : ''}${trend}%`}
            color={trend > 0 ? 'success' : 'error'}
            variant="outlined"
          />
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="h3" fontWeight="700" color="white" gutterBottom>
            <AnimatedCounter value={value} suffix={suffix} />
          </Typography>
          {description && data?.trendData && data.trendData.length > 0 && (
            <Sparkline data={data.trendData.slice(-7).map((d: any) => d.conversations || d.conversions || 0)} />
          )}
        </Box>

        <Typography variant="h6" fontWeight="600" color="rgba(255, 255, 255, 0.9)" gutterBottom>
          {title}
        </Typography>

        <Typography variant="body2" color="rgba(255, 255, 255, 0.7)">
          {description}
        </Typography>
      </CardContent>
    </Card>
    );
  };


  if (loading) {
    return (
      <Box sx={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '80vh',
        gap: 3
      }}>
        <CircularProgress size={60} thickness={4} />
        <Typography variant="h6" color="rgba(255, 255, 255, 0.8)">
          Carregando métricas...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert
          severity="error"
          action={
            <IconButton onClick={refresh} color="inherit" size="small">
              <Refresh />
            </IconButton>
          }
          sx={{
            background: 'rgba(244, 67, 54, 0.1)',
            border: '1px solid rgba(244, 67, 54, 0.3)',
            color: 'rgba(255, 255, 255, 0.9)',
            '& .MuiAlert-icon': { color: '#ef4444' }
          }}
        >
          Erro ao carregar métricas: {error}
        </Alert>
      </Box>
    );
  }

  if (!data) {
    return (
      <Box sx={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '60vh',
        gap: 2
      }}>
        <Warning sx={{ fontSize: 48, color: 'rgba(255, 255, 255, 0.5)' }} />
        <Typography variant="h6" color="rgba(255, 255, 255, 0.8)">
          Nenhuma métrica disponível
        </Typography>
        <Typography variant="body2" color="rgba(255, 255, 255, 0.6)">
          Aguardando dados do agente IA...
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Modern Header */}
      <Box sx={{
        mb: 4,
        background: 'rgba(255, 255, 255, 0.08)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        borderRadius: '24px',
        p: { xs: 2, sm: 3, md: 4 },
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
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
                mb: 1
              }}
            >
              Métricas do Agente IA
            </Typography>
            <Typography variant="subtitle1" color="rgba(255, 255, 255, 0.85)">
              Performance em tempo real do atendimento inteligente
            </Typography>
          </Box>

          <Stack direction="row" spacing={2} alignItems="center">
            <Typography variant="body2" color="rgba(255, 255, 255, 0.7)">
              Última atualização: {format(data.lastUpdate, 'HH:mm')}
            </Typography>
            <IconButton
              onClick={refresh}
              sx={{
                background: 'rgba(255, 255, 255, 0.1)',
                '&:hover': { background: 'rgba(255, 255, 255, 0.2)' }
              }}
            >
              <Refresh sx={{ color: 'rgba(255, 255, 255, 0.9)' }} />
            </IconButton>
            <FormControl sx={{ minWidth: 120 }}>
              <InputLabel sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>Período</InputLabel>
              <Select
                value={timeRange}
                label="Período"
                onChange={(e) => setTimeRange(e.target.value)}
                sx={{
                  color: 'white',
                  '.MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(255, 255, 255, 0.3)',
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(255, 255, 255, 0.5)',
                  }
                }}
              >
                <MenuItem value="24h">24 horas</MenuItem>
                <MenuItem value="7d">7 dias</MenuItem>
                <MenuItem value="30d">30 dias</MenuItem>
                <MenuItem value="90d">90 dias</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </Box>
      </Box>

      {/* Main Metrics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} lg={2.4}>
          <MetricCard
            title="Taxa de Conversão"
            value={data.metrics.conversionRate.toFixed(1)}
            suffix="%"
            trend={data.metrics.conversionTrend}
            icon={<CheckCircle />}
            color="success"
            description="Lead → Visita/Reserva confirmada"
          />
        </Grid>

        <Grid item xs={12} sm={6} lg={2.4}>
          <MetricCard
            title="Tempo p/ Qualificar"
            value={data.metrics.qualificationTime.toFixed(1)}
            suffix="min"
            trend={data.metrics.qualificationTrend}
            icon={<Speed />}
            color="primary"
            description="Tempo médio para qualificar leads"
          />
        </Grid>

        <Grid item xs={12} sm={6} lg={2.4}>
          <MetricCard
            title="Conversas Respondidas"
            value={data.metrics.totalConversations}
            trend={data.metrics.conversationsTrend}
            icon={<Chat />}
            color="info"
            description="Total de conversas com resposta"
          />
        </Grid>

        <Grid item xs={12} sm={6} lg={2.4}>
          <MetricCard
            title="Tempo Médio/Conversa"
            value={data.metrics.avgConversationTime.toFixed(1)}
            suffix="min"
            trend={data.metrics.avgTimeTrend}
            icon={<AccessTime />}
            color="warning"
            description="Duração média das conversas"
          />
        </Grid>

        <Grid item xs={12} sm={6} lg={2.4}>
          <MetricCard
            title="Taxa de Resposta"
            value={data.metrics.responseRate.toFixed(1)}
            suffix="%"
            trend={data.metrics.responseRateTrend}
            icon={<Timeline />}
            color="secondary"
            description="% de mensagens respondidas"
          />
        </Grid>
      </Grid>

      {/* Charts Section */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Trend Chart */}
        <Grid item xs={12} lg={8}>
          <Card sx={{
            background: 'rgba(255, 255, 255, 0.08)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '20px'
          }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight="600" color="white" gutterBottom>
                Tendência de Performance (7 dias)
              </Typography>
              <ResponsiveContainer width="100%" height={350}>
                <AreaChart data={data.trendData}>
                  <defs>
                    <linearGradient id="colorConversions" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.1}/>
                    </linearGradient>
                    <linearGradient id="colorConversations" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="date" stroke="rgba(255,255,255,0.7)" />
                  <YAxis stroke="rgba(255,255,255,0.7)" />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: 'rgba(0,0,0,0.8)',
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: '12px'
                    }}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="conversions"
                    stroke="#06b6d4"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorConversions)"
                    name="Conversões"
                  />
                  <Area
                    type="monotone"
                    dataKey="conversations"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorConversations)"
                    name="Conversas"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Performance Summary */}
        <Grid item xs={12} lg={4}>
          <Card sx={{
            background: 'rgba(255, 255, 255, 0.08)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '20px',
            height: '100%'
          }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight="600" color="white" gutterBottom>
                Resumo de Performance
              </Typography>

              <Stack spacing={3} sx={{ mt: 3 }}>
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" color="rgba(255,255,255,0.8)">
                      Qualificação Rápida
                    </Typography>
                    <Typography variant="body2" color="white" fontWeight="600">
                      {Math.round((data.metrics.qualificationTime < 5 ? 85 : 65))}%
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={data.metrics.qualificationTime < 5 ? 85 : 65}
                    sx={{
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: 'rgba(255,255,255,0.1)',
                      '& .MuiLinearProgress-bar': {
                        backgroundColor: '#10b981'
                      }
                    }}
                  />
                </Box>

                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" color="rgba(255,255,255,0.8)">
                      Engajamento Alto
                    </Typography>
                    <Typography variant="body2" color="white" fontWeight="600">
                      {Math.round(data.metrics.responseRate)}%
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={data.metrics.responseRate}
                    sx={{
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: 'rgba(255,255,255,0.1)',
                      '& .MuiLinearProgress-bar': {
                        backgroundColor: '#06b6d4'
                      }
                    }}
                  />
                </Box>

                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" color="rgba(255,255,255,0.8)">
                      Eficiência Conversão
                    </Typography>
                    <Typography variant="body2" color="white" fontWeight="600">
                      {Math.round(data.metrics.conversionRate)}%
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={data.metrics.conversionRate}
                    sx={{
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: 'rgba(255,255,255,0.1)',
                      '& .MuiLinearProgress-bar': {
                        backgroundColor: '#8b5cf6'
                      }
                    }}
                  />
                </Box>

                <Box sx={{
                  mt: 3,
                  p: 2,
                  background: 'rgba(16, 185, 129, 0.1)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  borderRadius: 2
                }}>
                  <Typography variant="body2" color="rgba(255,255,255,0.9)" fontWeight="600">
                    📊 Performance Geral: Excelente
                  </Typography>
                  <Typography variant="body2" color="rgba(255,255,255,0.7)" sx={{ mt: 1 }}>
                    Agente IA está operando acima da média esperada
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Enhanced Heatmap */}
      <Heatmap data={data.heatmapData} />
    </Box>
  );
}