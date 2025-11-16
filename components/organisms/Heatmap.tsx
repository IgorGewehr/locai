'use client';

import { Box, Card, CardContent, Typography, Tooltip } from '@mui/material';

/**
 * HEATMAP COMPONENT
 *
 * Componente reutilizável de heatmap para visualização de atividade
 * por dia da semana e hora do dia
 *
 * @version 1.0.0
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
}

const HeatmapCell = ({ data, maxConversations }: HeatmapCellProps) => {
  // Calculate intensity dynamically based on max conversations (GitHub style)
  const intensity = maxConversations > 0 ? data.conversations / maxConversations : 0;
  const normalizedIntensity = Math.max(0, Math.min(1, intensity));

  // GitHub-style color gradient (green scale)
  const getHeatColor = (intensity: number) => {
    if (intensity === 0) return { bg: 'rgba(255, 255, 255, 0.03)', border: 'rgba(255, 255, 255, 0.05)', glow: 'rgba(255, 255, 255, 0.0)' };
    if (intensity < 0.25) return { bg: '#0e4429', border: '#0e4429', glow: 'rgba(14, 68, 41, 0.3)' };
    if (intensity < 0.5) return { bg: '#006d32', border: '#006d32', glow: 'rgba(0, 109, 50, 0.4)' };
    if (intensity < 0.75) return { bg: '#26a641', border: '#26a641', glow: 'rgba(38, 166, 65, 0.5)' };
    return { bg: '#39d353', border: '#39d353', glow: 'rgba(57, 211, 83, 0.6)' };
  };

  const colors = getHeatColor(normalizedIntensity);

  return (
    <Tooltip
      title={
        <Box>
          <Typography variant="body2" fontWeight="600" sx={{ mb: 1 }}>{data.day} às {data.hour}h</Typography>
          <Typography variant="caption" sx={{ display: 'block' }}>{data.conversations} conversas</Typography>
          <Typography variant="caption" sx={{ display: 'block' }}>{data.conversions} conversões</Typography>
          <Typography variant="caption" sx={{ display: 'block' }}>{data.avgResponse.toFixed(1)}s resposta média</Typography>
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
  // Calculate max conversations for dynamic intensity (GitHub style)
  const maxConversations = Math.max(...data.map(d => d.conversations), 1);

  const content = (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4, flexWrap: 'wrap', gap: 3 }}>
        <Box>
          <Typography
            variant="h6"
            sx={{
              color: 'rgba(255, 255, 255, 0.95)',
              fontWeight: 700,
              fontSize: { xs: '1.125rem', md: '1.25rem' },
              letterSpacing: '-0.01em',
              mb: 0.5,
            }}
          >
            {title}
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: 'rgba(255, 255, 255, 0.65)',
              fontSize: '0.875rem',
            }}
          >
            {subtitle}
          </Typography>
        </Box>

        {/* Activity Summary */}
        <Box sx={{
          display: 'flex',
          gap: 2.5,
          p: 2,
          background: 'rgba(255, 255, 255, 0.03)',
          borderRadius: '14px',
          border: '1px solid rgba(255, 255, 255, 0.08)'
        }}>
          <Box sx={{ textAlign: 'center' }}>
            <Typography
              variant="h6"
              sx={{
                color: '#22c55e',
                fontWeight: 700,
                fontSize: '1rem',
                mb: 0.25,
              }}
            >
              14h-18h
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: 'rgba(255, 255, 255, 0.6)',
                fontSize: '0.75rem',
              }}
            >
              Pico de atividade
            </Typography>
          </Box>
          <Box sx={{ width: '1px', background: 'rgba(255, 255, 255, 0.1)' }} />
          <Box sx={{ textAlign: 'center' }}>
            <Typography
              variant="h6"
              sx={{
                color: '#f59e0b',
                fontWeight: 700,
                fontSize: '1rem',
                mb: 0.25,
              }}
            >
              Qua-Sex
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: 'rgba(255, 255, 255, 0.6)',
                fontSize: '0.75rem',
              }}
            >
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
                  const heatmapItem = data.find(d => d.day === day && d.hour === hour);
                  return heatmapItem ? (
                    <HeatmapCell key={hour} data={heatmapItem} maxConversations={maxConversations} />
                  ) : (
                    <Box
                      key={hour}
                      sx={{
                        width: 32,
                        height: 32,
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                        borderRadius: '8px',
                      }}
                    />
                  );
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
                Menos
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Box sx={{ width: 20, height: 20, background: 'rgba(255, 255, 255, 0.03)', borderRadius: '4px', border: '1px solid rgba(255, 255, 255, 0.1)' }} />
                <Box sx={{ width: 20, height: 20, background: '#0e4429', borderRadius: '4px' }} />
                <Box sx={{ width: 20, height: 20, background: '#006d32', borderRadius: '4px' }} />
                <Box sx={{ width: 20, height: 20, background: '#26a641', borderRadius: '4px' }} />
                <Box sx={{ width: 20, height: 20, background: '#39d353', borderRadius: '4px' }} />
              </Box>
              <Typography variant="caption" color="rgba(255,255,255,0.6)">
                Mais
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="caption" color="rgba(255,255,255,0.6)">
                Total: {data.reduce((sum, d) => sum + d.conversations, 0)} conversas
              </Typography>
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
      sx={{
        background: 'rgba(255, 255, 255, 0.06)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '24px',
        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        position: 'relative',
        overflow: 'hidden',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: '0 12px 40px rgba(99, 102, 241, 0.2)',
          border: '1px solid rgba(99, 102, 241, 0.25)',
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
      <CardContent sx={{ p: { xs: 2.5, md: 3, lg: 4 } }}>
        {content}
      </CardContent>
    </Card>
  );
}
