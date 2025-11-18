'use client';

import { Box, Card, CardContent, Typography, Tooltip, alpha, useTheme } from '@mui/material';
import { memo, useMemo } from 'react';
import { TrendingUp, AccessTime, CalendarToday } from '@mui/icons-material';

/**
 * HEATMAP COMPONENT - High Performance Edition
 *
 * Componente otimizado de heatmap para visualização de atividade
 * por dia da semana e hora do dia com animações suaves e design moderno
 *
 * @version 2.0.0 - Performance & Visual Upgrade
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
  maxConversations: number;
  index: number;
}

const HeatmapCell = memo(({ data, maxConversations, index }: HeatmapCellProps) => {
  const theme = useTheme();

  // Calculate intensity dynamically based on max conversations
  const intensity = useMemo(() => {
    const raw = maxConversations > 0 ? data.conversations / maxConversations : 0;
    return Math.max(0, Math.min(1, raw));
  }, [data.conversations, maxConversations]);

  // Modern gradient color palette (Purple-Blue-Green)
  const colors = useMemo(() => {
    if (intensity === 0) return {
      bg: alpha(theme.palette.background.paper, 0.03),
      border: alpha(theme.palette.divider, 0.1),
      glow: 'transparent',
      text: alpha(theme.palette.text.secondary, 0.3)
    };
    if (intensity < 0.2) return {
      bg: 'rgba(99, 102, 241, 0.15)',
      border: 'rgba(99, 102, 241, 0.3)',
      glow: 'rgba(99, 102, 241, 0.2)',
      text: 'rgba(99, 102, 241, 0.9)'
    };
    if (intensity < 0.4) return {
      bg: 'rgba(59, 130, 246, 0.25)',
      border: 'rgba(59, 130, 246, 0.4)',
      glow: 'rgba(59, 130, 246, 0.3)',
      text: 'rgba(59, 130, 246, 1)'
    };
    if (intensity < 0.6) return {
      bg: 'rgba(6, 182, 212, 0.35)',
      border: 'rgba(6, 182, 212, 0.5)',
      glow: 'rgba(6, 182, 212, 0.4)',
      text: 'rgba(6, 182, 212, 1)'
    };
    if (intensity < 0.8) return {
      bg: 'rgba(16, 185, 129, 0.45)',
      border: 'rgba(16, 185, 129, 0.6)',
      glow: 'rgba(16, 185, 129, 0.5)',
      text: 'rgba(16, 185, 129, 1)'
    };
    return {
      bg: 'rgba(34, 197, 94, 0.6)',
      border: 'rgba(34, 197, 94, 0.8)',
      glow: 'rgba(34, 197, 94, 0.6)',
      text: 'rgba(34, 197, 94, 1)'
    };
  }, [intensity, theme]);

  const conversionRate = useMemo(() => {
    return data.conversations > 0 ? ((data.conversions / data.conversations) * 100).toFixed(1) : '0.0';
  }, [data.conversations, data.conversions]);

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
                {data.conversations} conversas
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
          width: 34,
          height: 34,
          background: colors.bg,
          border: `1.5px solid ${colors.border}`,
          borderRadius: '10px',
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
            borderRadius: '12px'
          },
          // Pulsing animation for high activity
          ...(intensity > 0.7 && {
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
            width: intensity > 0.6 ? 10 : intensity > 0.3 ? 7 : 5,
            height: intensity > 0.6 ? 10 : intensity > 0.3 ? 7 : 5,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${alpha(theme.palette.common.white, 0.9)}, ${alpha(colors.text, 0.6)})`,
            opacity: intensity,
            animation: intensity > 0.8 ? 'glow 1.5s ease-in-out infinite' : 'none',
            '@keyframes glow': {
              '0%, 100%': { opacity: intensity },
              '50%': { opacity: Math.min(1, intensity * 1.3) }
            }
          } : {}
        }}
      />
    </Tooltip>
  );
}, (prevProps, nextProps) => {
  return prevProps.data.conversations === nextProps.data.conversations &&
         prevProps.maxConversations === nextProps.maxConversations;
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

  // Calculate statistics with useMemo for performance
  const stats = useMemo(() => {
    const maxConversations = Math.max(...data.map(d => d.conversations), 1);
    const totalConversations = data.reduce((sum, d) => sum + d.conversations, 0);
    const totalConversions = data.reduce((sum, d) => sum + d.conversions, 0);
    const avgConversionRate = totalConversations > 0 ? (totalConversions / totalConversations * 100) : 0;

    // Find peak hours
    const hourStats = new Map<number, number>();
    data.forEach(d => {
      hourStats.set(d.hour, (hourStats.get(d.hour) || 0) + d.conversations);
    });
    const peakHour = Array.from(hourStats.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || 0;

    // Find peak days
    const dayStats = new Map<string, number>();
    data.forEach(d => {
      dayStats.set(d.day, (dayStats.get(d.day) || 0) + d.conversations);
    });
    const peakDay = Array.from(dayStats.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Seg';

    return {
      maxConversations,
      totalConversations,
      totalConversions,
      avgConversionRate,
      peakHour,
      peakDay
    };
  }, [data]);

  const maxConversations = stats.maxConversations;

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
            }}
          >
            {subtitle}
          </Typography>
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

          {/* Conversion Rate Card */}
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
                CONVERSÕES
              </Typography>
            </Box>
            <Typography variant="h6" sx={{ color: '#6366f1', fontWeight: 800, fontSize: '1.5rem' }}>
              {stats.totalConversions}
            </Typography>
            <Typography variant="caption" sx={{ color: alpha(theme.palette.text.secondary, 0.6) }}>
              Total no período
            </Typography>
          </Box>
        </Box>
      </Box>

      <Box sx={{ overflowX: 'auto', pb: 2 }}>
        <Box sx={{ minWidth: 800 }}>
          {/* Enhanced Hour labels */}
          <Box sx={{ display: 'flex', mb: 2, pl: 7 }}>
            {Array.from({ length: 24 }, (_, i) => (
              <Box key={i} sx={{
                width: 38,
                textAlign: 'center',
                p: 0.5
              }}>
                <Typography
                  variant="caption"
                  sx={{
                    color: i === stats.peakHour
                      ? '#22c55e'
                      : alpha(theme.palette.text.secondary, 0.6),
                    fontWeight: i === stats.peakHour ? 700 : 500,
                    fontSize: i === stats.peakHour ? '0.8rem' : '0.75rem',
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
                <Box sx={{ display: 'flex', gap: 1 }}>
                  {Array.from({ length: 24 }, (_, hour) => {
                    const heatmapItem = data.find(d => d.day === day && d.hour === hour);
                    const cellIndex = dayIndex * 24 + hour;
                    return heatmapItem ? (
                      <HeatmapCell
                        key={hour}
                        data={heatmapItem}
                        maxConversations={maxConversations}
                        index={cellIndex}
                      />
                    ) : (
                      <Box
                        key={hour}
                        sx={{
                          width: 34,
                          height: 34,
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

          {/* Enhanced Legend */}
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
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography
                variant="body2"
                sx={{
                  color: theme.palette.text.primary,
                  fontWeight: 700,
                  fontSize: '0.9rem'
                }}
              >
                Escala de Intensidade
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Typography variant="caption" sx={{ color: alpha(theme.palette.text.secondary, 0.6), fontWeight: 500 }}>
                  Baixa
                </Typography>
                <Box sx={{ display: 'flex', gap: 0.75 }}>
                  {[
                    { bg: alpha(theme.palette.background.paper, 0.03), border: alpha(theme.palette.divider, 0.1) },
                    { bg: 'rgba(99, 102, 241, 0.15)', border: 'rgba(99, 102, 241, 0.3)' },
                    { bg: 'rgba(59, 130, 246, 0.25)', border: 'rgba(59, 130, 246, 0.4)' },
                    { bg: 'rgba(6, 182, 212, 0.35)', border: 'rgba(6, 182, 212, 0.5)' },
                    { bg: 'rgba(16, 185, 129, 0.45)', border: 'rgba(16, 185, 129, 0.6)' },
                    { bg: 'rgba(34, 197, 94, 0.6)', border: 'rgba(34, 197, 94, 0.8)' }
                  ].map((color, i) => (
                    <Box
                      key={i}
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
