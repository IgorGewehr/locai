'use client';

import { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Paper,
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
  Schedule,
  Analytics,
  LocalFireDepartment,
  AccessTime,
  CheckCircle,
  Timeline,
  Refresh,
  CalendarToday,
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
  BarChart,
  Bar,
  AreaChart,
  Area,
  Cell
} from 'recharts';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useMetrics } from '@/lib/hooks/useMetrics';

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
  }) => (
    <Card sx={{
      background: 'rgba(255, 255, 255, 0.08)',
      backdropFilter: 'blur(20px)',
      border: '1px solid rgba(255, 255, 255, 0.15)',
      borderRadius: '20px',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      '&:hover': {
        transform: 'translateY(-4px)',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
        border: '1px solid rgba(255, 255, 255, 0.25)',
      }
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

        <Typography variant="h3" fontWeight="700" color="white" gutterBottom>
          {value}{suffix}
        </Typography>

        <Typography variant="h6" fontWeight="600" color="rgba(255, 255, 255, 0.9)" gutterBottom>
          {title}
        </Typography>

        <Typography variant="body2" color="rgba(255, 255, 255, 0.7)">
          {description}
        </Typography>
      </CardContent>
    </Card>
  );

  const HeatmapCell = ({ data }: { data: HeatmapData }) => {
    const intensity = data.conversations / 50; // Normalize to 0-1
    const normalizedIntensity = Math.max(0.1, Math.min(1, intensity));

    // Color gradient based on intensity
    const getHeatColor = (intensity: number) => {
      if (intensity < 0.2) return { bg: 'rgba(59, 130, 246, 0.2)', border: 'rgba(59, 130, 246, 0.3)', glow: 'rgba(59, 130, 246, 0.1)' };
      if (intensity < 0.4) return { bg: 'rgba(34, 197, 94, 0.3)', border: 'rgba(34, 197, 94, 0.4)', glow: 'rgba(34, 197, 94, 0.15)' };
      if (intensity < 0.6) return { bg: 'rgba(251, 191, 36, 0.4)', border: 'rgba(251, 191, 36, 0.5)', glow: 'rgba(251, 191, 36, 0.2)' };
      if (intensity < 0.8) return { bg: 'rgba(249, 115, 22, 0.5)', border: 'rgba(249, 115, 22, 0.6)', glow: 'rgba(249, 115, 22, 0.25)' };
      return { bg: 'rgba(239, 68, 68, 0.6)', border: 'rgba(239, 68, 68, 0.7)', glow: 'rgba(239, 68, 68, 0.3)' };
    };

    const colors = getHeatColor(normalizedIntensity);

    return (
      <Tooltip
        title={
          <Box>
            <Typography variant="body2" fontWeight="600">{data.day} às {data.hour}h</Typography>
            <Typography variant="caption">🗣️ {data.conversations} conversas</Typography><br/>
            <Typography variant="caption">✅ {data.conversions} conversões</Typography><br/>
            <Typography variant="caption">⏱️ {data.avgResponse.toFixed(1)}s resposta média</Typography>
          </Box>
        }
        arrow
        componentsProps={{
          tooltip: {
            sx: {
              bgcolor: 'rgba(0, 0, 0, 0.9)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '12px',
              backdropFilter: 'blur(10px)'
            }
          }
        }}
      >
        <Box
          sx={{
            width: 32,
            height: 32,
            background: colors.bg,
            border: `1px solid ${colors.border}`,
            borderRadius: '8px',
            cursor: 'pointer',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            '&:hover': {
              transform: 'scale(1.15) translateY(-2px)',
              background: colors.bg.replace(/[\d\.]+\)$/, '0.8)'),
              border: `2px solid ${colors.border}`,
              boxShadow: `0 8px 25px ${colors.glow}`,
              zIndex: 10
            },
            '&::before': {
              content: '""',
              position: 'absolute',
              top: '50%',
              left: '50%',
              width: normalizedIntensity > 0.5 ? '8px' : '6px',
              height: normalizedIntensity > 0.5 ? '8px' : '6px',
              borderRadius: '50%',
              background: normalizedIntensity > 0.7 ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.6)',
              transform: 'translate(-50%, -50%)',
              opacity: normalizedIntensity > 0.3 ? 1 : 0
            }
          }}
        />
      </Tooltip>
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
      <Card sx={{
        background: 'rgba(255, 255, 255, 0.08)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        borderRadius: '20px'
      }}>
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
            <Box>
              <Typography variant="h6" fontWeight="600" color="white" gutterBottom>
                🔥 Heatmap de Atividade
              </Typography>
              <Typography variant="body2" color="rgba(255,255,255,0.7)">
                Padrão de conversas por horário e dia da semana
              </Typography>
            </Box>

            {/* Activity Summary */}
            <Box sx={{
              display: 'flex',
              gap: 3,
              p: 2,
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h6" color="#22c55e" fontWeight="700">
                  14h-18h
                </Typography>
                <Typography variant="caption" color="rgba(255,255,255,0.7)">
                  Pico de atividade
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h6" color="#f59e0b" fontWeight="700">
                  Qua-Sex
                </Typography>
                <Typography variant="caption" color="rgba(255,255,255,0.7)">
                  Dias mais ativos
                </Typography>
              </Box>
            </Box>
          </Box>

          <Box sx={{ overflowX: 'auto', pb: 2 }}>
            <Box sx={{ minWidth: 800 }}>
              {/* Enhanced Hour labels */}
              <Box sx={{ display: 'flex', mb: 2, pl: 6 }}>
                {Array.from({ length: 24 }, (_, i) => (
                  <Box key={i} sx={{
                    width: 36,
                    textAlign: 'center',
                    p: 0.5
                  }}>
                    <Typography
                      variant="caption"
                      color={
                        (i >= 9 && i <= 12) || (i >= 14 && i <= 18)
                          ? "rgba(34, 197, 94, 0.9)"
                          : "rgba(255,255,255,0.6)"
                      }
                      fontWeight={
                        (i >= 9 && i <= 12) || (i >= 14 && i <= 18) ? 600 : 400
                      }
                    >
                      {i}h
                    </Typography>
                  </Box>
                ))}
              </Box>

              {/* Enhanced Heatmap grid with day indicators */}
              {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map((day, dayIndex) => (
                <Box key={day} sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                  <Box sx={{
                    width: 48,
                    mr: 2,
                    textAlign: 'center',
                    p: 1,
                    borderRadius: '8px',
                    background: dayIndex >= 2 && dayIndex <= 4
                      ? 'rgba(34, 197, 94, 0.1)'
                      : 'rgba(255, 255, 255, 0.05)',
                    border: dayIndex >= 2 && dayIndex <= 4
                      ? '1px solid rgba(34, 197, 94, 0.2)'
                      : '1px solid rgba(255, 255, 255, 0.1)'
                  }}>
                    <Typography
                      variant="body2"
                      color={
                        dayIndex >= 2 && dayIndex <= 4
                          ? "rgba(34, 197, 94, 0.9)"
                          : "rgba(255,255,255,0.8)"
                      }
                      fontWeight="600"
                    >
                      {day}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    {Array.from({ length: 24 }, (_, hour) => {
                      const heatmapItem = data.heatmapData.find(d => d.day === day && d.hour === hour);
                      return heatmapItem ? <HeatmapCell key={hour} data={heatmapItem} /> : null;
                    })}
                  </Box>
                </Box>
              ))}

              {/* Enhanced Legend */}
              <Box sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
                mt: 4,
                p: 3,
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '16px',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}>
                <Typography variant="body2" color="rgba(255,255,255,0.8)" fontWeight="600">
                  Intensidade:
                </Typography>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="caption" color="rgba(255,255,255,0.6)">
                    Baixa
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Box sx={{ width: 20, height: 20, background: 'rgba(59, 130, 246, 0.2)', borderRadius: '6px', border: '1px solid rgba(59, 130, 246, 0.3)' }} />
                    <Box sx={{ width: 20, height: 20, background: 'rgba(34, 197, 94, 0.3)', borderRadius: '6px', border: '1px solid rgba(34, 197, 94, 0.4)' }} />
                    <Box sx={{ width: 20, height: 20, background: 'rgba(251, 191, 36, 0.4)', borderRadius: '6px', border: '1px solid rgba(251, 191, 36, 0.5)' }} />
                    <Box sx={{ width: 20, height: 20, background: 'rgba(249, 115, 22, 0.5)', borderRadius: '6px', border: '1px solid rgba(249, 115, 22, 0.6)' }} />
                    <Box sx={{ width: 20, height: 20, background: 'rgba(239, 68, 68, 0.6)', borderRadius: '6px', border: '1px solid rgba(239, 68, 68, 0.7)' }} />
                  </Box>
                  <Typography variant="caption" color="rgba(255,255,255,0.6)">
                    Alta
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{
                      width: 12,
                      height: 12,
                      borderRadius: '50%',
                      background: 'rgba(255, 255, 255, 0.9)'
                    }} />
                    <Typography variant="caption" color="rgba(255,255,255,0.7)">
                      Ponto de intensidade
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}