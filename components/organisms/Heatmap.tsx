'use client';

import { Box, Card, CardContent, Typography, Tooltip, alpha, useTheme } from '@mui/material';
import { memo, useMemo } from 'react';
import { TrendingUp, AccessTime, CalendarToday, Info } from '@mui/icons-material';

/**
 * HEATMAP COMPONENT - Data-Driven Intensity Calculation
 *
 * Componente de heatmap com cálculo inteligente de intensidade
 * baseado em percentis e thresholds dinâmicos
 *
 * @version 3.0.0 - Fixed intensity calculation with percentile-based scaling
 */

export interface HeatmapData {
  hour: number;
  day: string;
  conversations: number;
  conversions: number;
  avgResponse: number;
}

interface HeatmapCellProps {
  data: HeatmapData;
  stats: HeatmapStats;
  index: number;
}

interface HeatmapStats {
  // Percentiles for intelligent scaling
  p0: number;      // Min (0th percentile)
  p25: number;     // 25th percentile
  p50: number;     // Median (50th percentile)
  p75: number;     // 75th percentile
  p90: number;     // 90th percentile
  p95: number;     // 95th percentile
  p99: number;     // 99th percentile
  max: number;     // Maximum value

  // Summary stats
  totalConversations: number;
  totalConversions: number;
  peakHour: number;
  peakDay: string;
  cellsWithData: number;
  totalCells: number;
}

/**
 * Calculate percentiles from sorted array
 */
function getPercentile(sortedArray: number[], percentile: number): number {
  if (sortedArray.length === 0) return 0;
  const index = Math.ceil((percentile / 100) * sortedArray.length) - 1;
  return sortedArray[Math.max(0, index)];
}

/**
 * Calculate comprehensive statistics for intelligent scaling
 */
function calculateHeatmapStats(data: HeatmapData[]): HeatmapStats {
  // Extract all conversation counts and sort
  const values = data.map(d => d.conversations).sort((a, b) => a - b);
  const nonZeroValues = values.filter(v => v > 0);

  // Calculate percentiles
  const p0 = values[0] || 0;
  const p25 = getPercentile(values, 25);
  const p50 = getPercentile(values, 50);
  const p75 = getPercentile(values, 75);
  const p90 = getPercentile(values, 90);
  const p95 = getPercentile(values, 95);
  const p99 = getPercentile(values, 99);
  const max = values[values.length - 1] || 0;

  // Find peak hour and day
  const hourCounts = new Map<number, number>();
  const dayCounts = new Map<string, number>();

  data.forEach(d => {
    hourCounts.set(d.hour, (hourCounts.get(d.hour) || 0) + d.conversations);
    dayCounts.set(d.day, (dayCounts.get(d.day) || 0) + d.conversations);
  });

  const peakHour = Array.from(hourCounts.entries())
    .sort((a, b) => b[1] - a[1])[0]?.[0] || 0;
  const peakDay = Array.from(dayCounts.entries())
    .sort((a, b) => b[1] - a[1])[0]?.[0] || 'Seg';

  return {
    p0,
    p25,
    p50,
    p75,
    p90,
    p95,
    p99,
    max,
    totalConversations: data.reduce((sum, d) => sum + d.conversations, 0),
    totalConversions: data.reduce((sum, d) => sum + d.conversions, 0),
    peakHour,
    peakDay,
    cellsWithData: nonZeroValues.length,
    totalCells: data.length
  };
}

/**
 * Calculate intensity using percentile-based scaling
 * Returns value between 0-1 representing intensity level
 */
function calculateIntensity(value: number, stats: HeatmapStats): number {
  // No data
  if (value === 0) return 0;

  // Handle edge case: all values are the same
  if (stats.max === stats.p0) {
    return value > 0 ? 0.5 : 0; // Medium intensity if has data
  }

  // Use logarithmic scale for better distribution
  // This handles skewed data where most cells have low values
  const logValue = Math.log(value + 1);
  const logMax = Math.log(stats.max + 1);
  const logP50 = Math.log(stats.p50 + 1);

  // Calculate base intensity using log scale
  let intensity = logValue / logMax;

  // Apply percentile-based adjustment for better visual distribution
  if (value <= stats.p25) {
    // Bottom 25% -> map to 0.1-0.3 intensity
    intensity = 0.1 + (value / stats.p25) * 0.2;
  } else if (value <= stats.p50) {
    // 25-50% -> map to 0.3-0.5 intensity
    intensity = 0.3 + ((value - stats.p25) / (stats.p50 - stats.p25)) * 0.2;
  } else if (value <= stats.p75) {
    // 50-75% -> map to 0.5-0.7 intensity
    intensity = 0.5 + ((value - stats.p50) / (stats.p75 - stats.p50)) * 0.2;
  } else if (value <= stats.p90) {
    // 75-90% -> map to 0.7-0.85 intensity
    intensity = 0.7 + ((value - stats.p75) / (stats.p90 - stats.p75)) * 0.15;
  } else {
    // Top 10% -> map to 0.85-1.0 intensity
    intensity = 0.85 + ((value - stats.p90) / (stats.max - stats.p90)) * 0.15;
  }

  return Math.max(0, Math.min(1, intensity));
}

/**
 * Get color scheme based on intensity level
 */
function getIntensityColors(intensity: number, theme: any) {
  if (intensity === 0) return {
    bg: alpha(theme.palette.background.paper, 0.03),
    border: alpha(theme.palette.divider, 0.1),
    glow: 'transparent',
    text: alpha(theme.palette.text.secondary, 0.3),
    label: 'Sem dados'
  };

  // Very low: 0.1-0.3 (Purple)
  if (intensity < 0.3) return {
    bg: 'rgba(139, 92, 246, 0.12)',
    border: 'rgba(139, 92, 246, 0.25)',
    glow: 'rgba(139, 92, 246, 0.15)',
    text: 'rgba(139, 92, 246, 0.9)',
    label: 'Muito baixo'
  };

  // Low: 0.3-0.5 (Blue)
  if (intensity < 0.5) return {
    bg: 'rgba(59, 130, 246, 0.18)',
    border: 'rgba(59, 130, 246, 0.35)',
    glow: 'rgba(59, 130, 246, 0.25)',
    text: 'rgba(59, 130, 246, 1)',
    label: 'Baixo'
  };

  // Medium: 0.5-0.7 (Cyan)
  if (intensity < 0.7) return {
    bg: 'rgba(6, 182, 212, 0.25)',
    border: 'rgba(6, 182, 212, 0.45)',
    glow: 'rgba(6, 182, 212, 0.35)',
    text: 'rgba(6, 182, 212, 1)',
    label: 'Médio'
  };

  // High: 0.7-0.85 (Orange)
  if (intensity < 0.85) return {
    bg: 'rgba(251, 146, 60, 0.35)',
    border: 'rgba(251, 146, 60, 0.55)',
    glow: 'rgba(251, 146, 60, 0.45)',
    text: 'rgba(251, 146, 60, 1)',
    label: 'Alto'
  };

  // Very high: 0.85-1.0 (Red)
  return {
    bg: 'rgba(239, 68, 68, 0.45)',
    border: 'rgba(239, 68, 68, 0.65)',
    glow: 'rgba(239, 68, 68, 0.55)',
    text: 'rgba(239, 68, 68, 1)',
    label: 'Muito alto'
  };
}

const HeatmapCell = memo(({ data, stats, index }: HeatmapCellProps) => {
  const theme = useTheme();

  const intensity = useMemo(() => {
    return calculateIntensity(data.conversations, stats);
  }, [data.conversations, stats]);

  const colors = useMemo(() => {
    return getIntensityColors(intensity, theme);
  }, [intensity, theme]);

  const conversionRate = useMemo(() => {
    return data.conversations > 0 ? ((data.conversions / data.conversations) * 100).toFixed(1) : '0.0';
  }, [data.conversations, data.conversions]);

  // Calculate percentile rank for display
  const percentileRank = useMemo(() => {
    if (data.conversations === 0) return 0;
    if (data.conversations >= stats.p99) return 99;
    if (data.conversations >= stats.p95) return 95;
    if (data.conversations >= stats.p90) return 90;
    if (data.conversations >= stats.p75) return 75;
    if (data.conversations >= stats.p50) return 50;
    if (data.conversations >= stats.p25) return 25;
    return 10;
  }, [data.conversations, stats]);

  return (
    <Tooltip
      title={
        <Box sx={{ p: 0.5 }}>
          <Typography variant="body2" fontWeight="700" sx={{ mb: 1.5, color: colors.text }}>
            {data.day} às {data.hour}:00
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CalendarToday sx={{ fontSize: 12, opacity: 0.7 }} />
              <Typography variant="caption" sx={{ opacity: 0.9 }}>
                <strong>{data.conversations}</strong> conversas
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <TrendingUp sx={{ fontSize: 12, opacity: 0.7 }} />
              <Typography variant="caption" sx={{ opacity: 0.9 }}>
                {data.conversions} conversões ({conversionRate}%)
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <AccessTime sx={{ fontSize: 12, opacity: 0.7 }} />
              <Typography variant="caption" sx={{ opacity: 0.9 }}>
                {data.avgResponse.toFixed(1)}s resposta média
              </Typography>
            </Box>
            <Box sx={{
              mt: 1,
              pt: 1,
              borderTop: `1px solid ${alpha(theme.palette.divider, 0.2)}`
            }}>
              <Typography variant="caption" sx={{ opacity: 0.7, fontStyle: 'italic' }}>
                Intensidade: <strong>{colors.label}</strong> (Top {100 - percentileRank}%)
              </Typography>
            </Box>
          </Box>
        </Box>
      }
      arrow
      placement="top"
      enterDelay={200}
      leaveDelay={0}
      componentsProps={{
        tooltip: {
          sx: {
            bgcolor: alpha(theme.palette.background.paper, 0.98),
            color: theme.palette.text.primary,
            border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
            borderRadius: '16px',
            backdropFilter: 'blur(20px)',
            boxShadow: `0 8px 32px ${alpha(theme.palette.common.black, 0.3)}`,
            maxWidth: 280
          }
        },
        arrow: {
          sx: {
            color: alpha(theme.palette.background.paper, 0.98),
            '&::before': {
              border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
            }
          }
        }
      }}
    >
      <Box
        sx={{
          width: 36,
          height: 36,
          background: colors.bg,
          border: `1.5px solid ${colors.border}`,
          borderRadius: '11px',
          cursor: 'pointer',
          transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          animation: `fadeInScale 0.4s ease-out ${index * 0.01}s both`,
          '@keyframes fadeInScale': {
            '0%': {
              opacity: 0,
              transform: 'scale(0.8)'
            },
            '100%': {
              opacity: 1,
              transform: 'scale(1)'
            }
          },
          '&:hover': {
            transform: 'scale(1.25) translateY(-3px) rotate(2deg)',
            background: colors.bg,
            border: `2px solid ${colors.border}`,
            boxShadow: `0 12px 35px ${colors.glow}, 0 0 20px ${colors.glow}`,
            zIndex: 100,
            borderRadius: '13px'
          },
          // Pulsing animation for very high activity
          ...(intensity >= 0.85 && {
            animation: `fadeInScale 0.4s ease-out ${index * 0.01}s both, pulse 2s ease-in-out infinite`,
            '@keyframes pulse': {
              '0%, 100%': {
                boxShadow: `0 0 0 0 ${colors.glow}`
              },
              '50%': {
                boxShadow: `0 0 0 8px transparent`
              }
            }
          }),
          // Inner glow dot
          '&::after': intensity > 0 ? {
            content: '""',
            position: 'absolute',
            width: intensity >= 0.7 ? 11 : intensity >= 0.4 ? 8 : 6,
            height: intensity >= 0.7 ? 11 : intensity >= 0.4 ? 8 : 6,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${alpha(theme.palette.common.white, 0.9)}, ${alpha(colors.text, 0.6)})`,
            opacity: Math.max(0.4, intensity),
            animation: intensity >= 0.85 ? 'glow 1.5s ease-in-out infinite' : 'none',
            '@keyframes glow': {
              '0%, 100%': { opacity: Math.max(0.4, intensity) },
              '50%': { opacity: Math.min(1, intensity * 1.3) }
            }
          } : {}
        }}
      />
    </Tooltip>
  );
}, (prevProps, nextProps) => {
  return prevProps.data.conversations === nextProps.data.conversations &&
         prevProps.stats.max === nextProps.stats.max;
});

interface HeatmapProps {
  data: HeatmapData[];
  showCard?: boolean;
  title?: string;
  subtitle?: string;
}

export default function Heatmap({
  data,
  showCard = true,
  title = 'Mapa de Calor de Atividade',
  subtitle = 'Padrão de conversas por horário e dia da semana'
}: HeatmapProps) {
  const theme = useTheme();

  // Calculate comprehensive statistics
  const stats = useMemo(() => calculateHeatmapStats(data), [data]);

  // Data sparsity indicator
  const dataSparsity = useMemo(() => {
    const percentage = (stats.cellsWithData / stats.totalCells) * 100;
    return {
      percentage,
      label: percentage === 0 ? 'Sem dados' :
             percentage < 20 ? 'Dados esparsos' :
             percentage < 50 ? 'Dados parciais' :
             percentage < 80 ? 'Boa cobertura' :
             'Cobertura completa',
      color: percentage === 0 ? theme.palette.error.main :
             percentage < 20 ? theme.palette.warning.main :
             percentage < 50 ? theme.palette.info.main :
             theme.palette.success.main
    };
  }, [stats, theme]);

  const content = (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 4, flexWrap: 'wrap', gap: 3 }}>
        <Box>
          <Typography
            variant="h5"
            sx={{
              color: theme.palette.text.primary,
              fontWeight: 800,
              fontSize: { xs: '1.25rem', md: '1.5rem' },
              letterSpacing: '-0.02em',
              mb: 0.5,
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            {title}
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: alpha(theme.palette.text.secondary, 0.8),
              fontSize: '0.9rem',
              mb: 1
            }}
          >
            {subtitle}
          </Typography>

          {/* Data Quality Indicator */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
            <Info sx={{ fontSize: 16, color: dataSparsity.color }} />
            <Typography variant="caption" sx={{ color: dataSparsity.color, fontWeight: 600 }}>
              {dataSparsity.label} ({dataSparsity.percentage.toFixed(1)}% com dados)
            </Typography>
          </Box>
        </Box>

        {/* Enhanced Activity Summary Cards */}
        <Box sx={{
          display: 'flex',
          gap: 2,
          flexWrap: 'wrap'
        }}>
          {/* Peak Hour Card */}
          <Box sx={{
            p: 2,
            minWidth: 120,
            background: `linear-gradient(135deg, ${alpha('#22c55e', 0.1)}, ${alpha('#16a34a', 0.15)})`,
            borderRadius: '16px',
            border: `1.5px solid ${alpha('#22c55e', 0.2)}`,
            backdropFilter: 'blur(10px)',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            '&:hover': {
              transform: 'translateY(-4px)',
              boxShadow: `0 12px 24px ${alpha('#22c55e', 0.2)}`,
              borderColor: alpha('#22c55e', 0.4)
            }
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <AccessTime sx={{ fontSize: 18, color: '#22c55e' }} />
              <Typography variant="caption" sx={{ color: alpha(theme.palette.text.secondary, 0.7), fontWeight: 600 }}>
                HORÁRIO PICO
              </Typography>
            </Box>
            <Typography variant="h6" sx={{ color: '#22c55e', fontWeight: 800, fontSize: '1.5rem' }}>
              {stats.peakHour}:00
            </Typography>
            <Typography variant="caption" sx={{ color: alpha(theme.palette.text.secondary, 0.6) }}>
              Maior atividade
            </Typography>
          </Box>

          {/* Peak Day Card */}
          <Box sx={{
            p: 2,
            minWidth: 120,
            background: `linear-gradient(135deg, ${alpha('#f59e0b', 0.1)}, ${alpha('#d97706', 0.15)})`,
            borderRadius: '16px',
            border: `1.5px solid ${alpha('#f59e0b', 0.2)}`,
            backdropFilter: 'blur(10px)',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            '&:hover': {
              transform: 'translateY(-4px)',
              boxShadow: `0 12px 24px ${alpha('#f59e0b', 0.2)}`,
              borderColor: alpha('#f59e0b', 0.4)
            }
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <CalendarToday sx={{ fontSize: 18, color: '#f59e0b' }} />
              <Typography variant="caption" sx={{ color: alpha(theme.palette.text.secondary, 0.7), fontWeight: 600 }}>
                DIA PICO
              </Typography>
            </Box>
            <Typography variant="h6" sx={{ color: '#f59e0b', fontWeight: 800, fontSize: '1.5rem' }}>
              {stats.peakDay}
            </Typography>
            <Typography variant="caption" sx={{ color: alpha(theme.palette.text.secondary, 0.6) }}>
              Dia mais ativo
            </Typography>
          </Box>

          {/* Total Conversations Card */}
          <Box sx={{
            p: 2,
            minWidth: 120,
            background: `linear-gradient(135deg, ${alpha('#6366f1', 0.1)}, ${alpha('#4f46e5', 0.15)})`,
            borderRadius: '16px',
            border: `1.5px solid ${alpha('#6366f1', 0.2)}`,
            backdropFilter: 'blur(10px)',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            '&:hover': {
              transform: 'translateY(-4px)',
              boxShadow: `0 12px 24px ${alpha('#6366f1', 0.2)}`,
              borderColor: alpha('#6366f1', 0.4)
            }
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <TrendingUp sx={{ fontSize: 18, color: '#6366f1' }} />
              <Typography variant="caption" sx={{ color: alpha(theme.palette.text.secondary, 0.7), fontWeight: 600 }}>
                TOTAL
              </Typography>
            </Box>
            <Typography variant="h6" sx={{ color: '#6366f1', fontWeight: 800, fontSize: '1.5rem' }}>
              {stats.totalConversations}
            </Typography>
            <Typography variant="caption" sx={{ color: alpha(theme.palette.text.secondary, 0.6) }}>
              Conversas no período
            </Typography>
          </Box>
        </Box>
      </Box>

      <Box sx={{ overflowX: 'auto', pb: 2 }}>
        <Box sx={{ minWidth: 1050 }}>
          {/* Enhanced Hour labels */}
          <Box sx={{ display: 'flex', mb: 3, pl: 8, gap: 0.5 }}>
            {Array.from({ length: 24 }, (_, i) => (
              <Box key={i} sx={{
                width: 40,
                textAlign: 'center',
                p: 1
              }}>
                <Typography
                  variant="body2"
                  sx={{
                    color: i === stats.peakHour
                      ? '#22c55e'
                      : alpha(theme.palette.text.secondary, 0.7),
                    fontWeight: i === stats.peakHour ? 800 : 600,
                    fontSize: i === stats.peakHour ? '0.95rem' : '0.85rem',
                    letterSpacing: '-0.01em'
                  }}
                >
                  {i}h
                </Typography>
              </Box>
            ))}
          </Box>

          {/* Enhanced Heatmap grid with day indicators */}
          {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map((day, dayIndex) => {
            const isDayPeak = day === stats.peakDay;

            return (
              <Box key={day} sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                <Box sx={{
                  width: 56,
                  mr: 2,
                  textAlign: 'center',
                  p: 1.25,
                  borderRadius: '12px',
                  background: isDayPeak
                    ? `linear-gradient(135deg, ${alpha('#f59e0b', 0.15)}, ${alpha('#d97706', 0.2)})`
                    : alpha(theme.palette.background.paper, 0.05),
                  border: isDayPeak
                    ? `1.5px solid ${alpha('#f59e0b', 0.3)}`
                    : `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    transform: 'translateX(4px)',
                    borderColor: isDayPeak ? alpha('#f59e0b', 0.5) : alpha(theme.palette.divider, 0.2)
                  }
                }}>
                  <Typography
                    variant="body2"
                    sx={{
                      color: isDayPeak ? '#f59e0b' : theme.palette.text.secondary,
                      fontWeight: isDayPeak ? 700 : 600,
                      fontSize: isDayPeak ? '0.9rem' : '0.85rem'
                    }}
                  >
                    {day}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1.5 }}>
                  {Array.from({ length: 24 }, (_, hour) => {
                    const heatmapItem = data.find(d => d.day === day && d.hour === hour);
                    const cellIndex = dayIndex * 24 + hour;
                    return heatmapItem ? (
                      <HeatmapCell
                        key={hour}
                        data={heatmapItem}
                        stats={stats}
                        index={cellIndex}
                      />
                    ) : (
                      <Box
                        key={hour}
                        sx={{
                          width: 36,
                          height: 36,
                          background: alpha(theme.palette.background.paper, 0.02),
                          border: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
                          borderRadius: '10px',
                          opacity: 0.4,
                          animation: `fadeInScale 0.4s ease-out ${cellIndex * 0.01}s both`,
                          '@keyframes fadeInScale': {
                            '0%': { opacity: 0, transform: 'scale(0.8)' },
                            '100%': { opacity: 0.4, transform: 'scale(1)' }
                          }
                        }}
                      />
                    );
                  })}
                </Box>
              </Box>
            );
          })}

          {/* Enhanced Legend with Percentile Information */}
          <Box sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 3,
            mt: 4,
            p: 3,
            background: `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.05)}, ${alpha(theme.palette.background.paper, 0.08)})`,
            borderRadius: '20px',
            border: `1px solid ${alpha(theme.palette.divider, 0.15)}`,
            backdropFilter: 'blur(10px)'
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
              <Typography
                variant="body2"
                sx={{
                  color: theme.palette.text.primary,
                  fontWeight: 700,
                  fontSize: '0.9rem'
                }}
              >
                Escala de Intensidade (Percentil)
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Typography variant="caption" sx={{ color: alpha(theme.palette.text.secondary, 0.6), fontWeight: 500 }}>
                  Baixa
                </Typography>
                <Box sx={{ display: 'flex', gap: 0.75 }}>
                  {[
                    { bg: alpha(theme.palette.background.paper, 0.03), border: alpha(theme.palette.divider, 0.1), label: '0' },
                    { bg: 'rgba(139, 92, 246, 0.12)', border: 'rgba(139, 92, 246, 0.25)', label: '<30%' },
                    { bg: 'rgba(59, 130, 246, 0.18)', border: 'rgba(59, 130, 246, 0.35)', label: '30-50%' },
                    { bg: 'rgba(6, 182, 212, 0.25)', border: 'rgba(6, 182, 212, 0.45)', label: '50-70%' },
                    { bg: 'rgba(251, 146, 60, 0.35)', border: 'rgba(251, 146, 60, 0.55)', label: '70-85%' },
                    { bg: 'rgba(239, 68, 68, 0.45)', border: 'rgba(239, 68, 68, 0.65)', label: '>85%' }
                  ].map((color, i) => (
                    <Tooltip key={i} title={color.label} arrow>
                      <Box
                        sx={{
                          width: 24,
                          height: 24,
                          background: color.bg,
                          border: `1.5px solid ${color.border}`,
                          borderRadius: '6px',
                          transition: 'all 0.2s ease',
                          '&:hover': {
                            transform: 'scale(1.15) translateY(-2px)',
                            boxShadow: `0 4px 12px ${color.border}`
                          }
                        }}
                      />
                    </Tooltip>
                  ))}
                </Box>
                <Typography variant="caption" sx={{ color: alpha(theme.palette.text.secondary, 0.6), fontWeight: 500 }}>
                  Alta
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h6" sx={{ color: theme.palette.primary.main, fontWeight: 800 }}>
                  {stats.totalConversations}
                </Typography>
                <Typography variant="caption" sx={{ color: alpha(theme.palette.text.secondary, 0.7) }}>
                  Total conversas
                </Typography>
              </Box>
              <Box sx={{ width: '1px', height: 32, background: alpha(theme.palette.divider, 0.2) }} />
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h6" sx={{ color: '#22c55e', fontWeight: 800 }}>
                  {stats.totalConversions}
                </Typography>
                <Typography variant="caption" sx={{ color: alpha(theme.palette.text.secondary, 0.7) }}>
                  Conversões
                </Typography>
              </Box>
              <Box sx={{ width: '1px', height: 32, background: alpha(theme.palette.divider, 0.2) }} />
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h6" sx={{ color: theme.palette.info.main, fontWeight: 800 }}>
                  {stats.p50}
                </Typography>
                <Typography variant="caption" sx={{ color: alpha(theme.palette.text.secondary, 0.7) }}>
                  Mediana
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );

  if (!showCard) {
    return content;
  }

  return (
    <Card
      elevation={0}
      sx={{
        background: `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.8)}, ${alpha(theme.palette.background.paper, 0.95)})`,
        backdropFilter: 'blur(24px)',
        border: `1.5px solid ${alpha(theme.palette.divider, 0.12)}`,
        borderRadius: '28px',
        transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: `0 8px 32px ${alpha(theme.palette.common.black, 0.1)}`,
        '&:hover': {
          transform: 'translateY(-6px)',
          boxShadow: `0 20px 60px ${alpha(theme.palette.primary.main, 0.15)}, 0 8px 32px ${alpha(theme.palette.common.black, 0.2)}`,
          borderColor: alpha(theme.palette.primary.main, 0.3),
        },
        // Animated gradient border on top
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '4px',
          background: 'linear-gradient(90deg, #6366f1, #8b5cf6, #ec4899, #f59e0b, #10b981)',
          backgroundSize: '200% 100%',
          animation: 'gradientMove 3s ease infinite',
          '@keyframes gradientMove': {
            '0%, 100%': { backgroundPosition: '0% 50%' },
            '50%': { backgroundPosition: '100% 50%' }
          }
        },
        // Subtle glow effect
        '&::after': {
          content: '""',
          position: 'absolute',
          top: '-50%',
          left: '-50%',
          width: '200%',
          height: '200%',
          background: `radial-gradient(circle, ${alpha(theme.palette.primary.main, 0.05)} 0%, transparent 70%)`,
          opacity: 0,
          transition: 'opacity 0.4s ease',
          pointerEvents: 'none'
        },
        '&:hover::after': {
          opacity: 1
        }
      }}
    >
      <CardContent sx={{ p: { xs: 3, md: 4, lg: 5 } }}>
        {content}
      </CardContent>
    </Card>
  );
}

HeatmapCell.displayName = 'HeatmapCell';
