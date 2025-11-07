/**
 * Onboarding Step Card Component
 * Individual card for each onboarding step with smooth animations
 */

'use client';

import React from 'react';
import {
  Card,
  CardContent,
  Box,
  Typography,
  Button,
  Chip,
  Stack,
  Fade,
  useTheme,
  useMediaQuery,
  alpha,
  Tooltip,
} from '@mui/material';
import {
  CheckCircle,
  RadioButtonUnchecked,
  Schedule,
  ArrowForward,
  Info,
  PlayCircle,
  HelpOutline,
} from '@mui/icons-material';
import { RevolutionaryOnboardingStep } from '@/lib/types/revolutionary-onboarding';
import { motion, AnimatePresence } from 'framer-motion';

// Icon mapping
import {
  Home,
  WhatsApp,
  EventAvailable,
  Share,
} from '@mui/icons-material';

const ICON_MAP: Record<string, React.ElementType> = {
  Home,
  WhatsApp,
  SmartToy: EventAvailable,
  EventAvailable,
  Share,
};

interface OnboardingStepCardProps {
  step: RevolutionaryOnboardingStep;
  isActive: boolean;
  isCompleted: boolean;
  isSkipped: boolean;
  onAction: () => void;
  onComplete: () => void;
  onSkip?: () => void;
  onShowTips?: () => void;
  onWatchVideo?: () => void;
  compact?: boolean;
  loading?: boolean;
}

const MotionCard = motion(Card);
const MotionBox = motion(Box);

export default function OnboardingStepCard({
  step,
  isActive,
  isCompleted,
  isSkipped,
  onAction,
  onComplete,
  onSkip,
  onShowTips,
  onWatchVideo,
  compact = false,
  loading = false,
}: OnboardingStepCardProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const Icon = ICON_MAP[step.icon] || Home;

  // Animation variants
  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.4,
        ease: 'easeOut',
      },
    },
    exit: {
      opacity: 0,
      scale: 0.95,
      transition: {
        duration: 0.2,
      },
    },
  };

  const pulseVariants = {
    initial: { scale: 1 },
    pulse: {
      scale: [1, 1.05, 1],
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: 'easeInOut',
      },
    },
  };

  const iconContainerVariants = {
    idle: { rotate: 0 },
    hover: {
      rotate: [0, -10, 10, -10, 0],
      transition: { duration: 0.5 },
    },
  };

  // Background gradient based on state
  const getBackgroundGradient = () => {
    if (isCompleted) {
      return `linear-gradient(135deg, ${alpha('#10b981', 0.15)}, ${alpha('#059669', 0.1)})`;
    }
    if (isActive) {
      return `linear-gradient(135deg, ${alpha('#6366f1', 0.2)}, ${alpha('#8b5cf6', 0.15)})`;
    }
    if (isSkipped) {
      return alpha(theme.palette.background.paper, 0.3);
    }
    return alpha(theme.palette.background.paper, 0.5);
  };

  // Border color based on state
  const getBorderColor = () => {
    if (isCompleted) return alpha('#10b981', 0.4);
    if (isActive) return alpha('#6366f1', 0.6);
    if (isSkipped) return alpha(theme.palette.divider, 0.2);
    return alpha(theme.palette.divider, 0.3);
  };

  // Icon background gradient
  const getIconGradient = () => {
    if (isCompleted) return 'linear-gradient(135deg, #10b981, #059669)';
    if (isActive) return 'linear-gradient(135deg, #6366f1, #8b5cf6)';
    return `linear-gradient(135deg, ${alpha('#ffffff', 0.1)}, ${alpha('#ffffff', 0.05)})`;
  };

  return (
    <MotionCard
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      whileHover={!isSkipped ? { y: -4, transition: { duration: 0.2 } } : {}}
      sx={{
        background: getBackgroundGradient(),
        border: `2px solid ${getBorderColor()}`,
        borderRadius: compact ? '12px' : '16px',
        opacity: isSkipped ? 0.6 : 1,
        transition: 'all 0.3s ease',
        overflow: 'visible',
        position: 'relative',
        '&:hover': {
          boxShadow: isActive || isCompleted
            ? `0 12px 40px ${alpha(isCompleted ? '#10b981' : '#6366f1', 0.3)}`
            : 'none',
        },
      }}
    >
      {/* Active indicator line */}
      <AnimatePresence>
        {isActive && !isCompleted && (
          <MotionBox
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            exit={{ scaleX: 0 }}
            transition={{ duration: 0.4 }}
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '4px',
              background: 'linear-gradient(90deg, #6366f1, #8b5cf6, #d946ef)',
              transformOrigin: 'left',
            }}
          />
        )}
      </AnimatePresence>

      <CardContent sx={{ p: { xs: 2, md: compact ? 2.5 : 3 } }}>
        <Stack spacing={2}>
          {/* Header */}
          <Stack direction="row" spacing={2} alignItems="flex-start">
            {/* Icon */}
            <MotionBox
              variants={iconContainerVariants}
              initial="idle"
              whileHover="hover"
              component={motion.div}
              sx={{
                width: { xs: 48, md: compact ? 52 : 60 },
                height: { xs: 48, md: compact ? 52 : 60 },
                borderRadius: compact ? '10px' : '12px',
                background: getIconGradient(),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                boxShadow: isActive ? `0 8px 24px ${alpha('#6366f1', 0.4)}` : 'none',
              }}
            >
              {isCompleted ? (
                <CheckCircle
                  sx={{
                    color: 'white',
                    fontSize: { xs: 28, md: compact ? 30 : 32 },
                  }}
                />
              ) : (
                <Icon
                  sx={{
                    color: isActive || isCompleted ? 'white' : alpha('#ffffff', 0.6),
                    fontSize: { xs: 24, md: compact ? 26 : 28 },
                  }}
                />
              )}
            </MotionBox>

            {/* Content */}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              {/* Badges */}
              <Stack direction="row" spacing={1} sx={{ mb: 1 }} flexWrap="wrap" gap={0.5}>
                <Chip
                  label={`Passo ${step.order}`}
                  size="small"
                  sx={{
                    backgroundColor: isActive
                      ? alpha('#6366f1', 0.2)
                      : alpha(theme.palette.background.paper, 0.5),
                    color: isActive ? '#a5b4fc' : alpha('#ffffff', 0.6),
                    fontWeight: 600,
                    fontSize: '0.75rem',
                    height: 22,
                  }}
                />

                {isCompleted && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  >
                    <Chip
                      icon={<CheckCircle sx={{ fontSize: 14 }} />}
                      label="Concluído"
                      size="small"
                      sx={{
                        backgroundColor: alpha('#10b981', 0.15),
                        color: '#6ee7b7',
                        border: `1px solid ${alpha('#10b981', 0.3)}`,
                        fontWeight: 600,
                        fontSize: '0.75rem',
                        height: 22,
                      }}
                    />
                  </motion.div>
                )}

                {step.isOptional && !isCompleted && !isSkipped && (
                  <Chip
                    label="Opcional"
                    size="small"
                    sx={{
                      backgroundColor: alpha('#f59e0b', 0.15),
                      color: '#fbbf24',
                      border: `1px solid ${alpha('#f59e0b', 0.3)}`,
                      fontWeight: 600,
                      fontSize: '0.75rem',
                      height: 22,
                    }}
                  />
                )}

                {isSkipped && (
                  <Chip
                    label="Pulado"
                    size="small"
                    sx={{
                      backgroundColor: alpha('#6b7280', 0.15),
                      color: '#9ca3af',
                      fontWeight: 600,
                      fontSize: '0.75rem',
                      height: 22,
                    }}
                  />
                )}
              </Stack>

              {/* Title */}
              <Typography
                variant={compact ? 'body1' : 'h6'}
                sx={{
                  color: 'white',
                  fontWeight: 600,
                  mb: 0.5,
                  fontSize: { xs: '0.95rem', md: compact ? '1rem' : '1.125rem' },
                }}
              >
                {step.title}
              </Typography>

              {/* Description */}
              <Typography
                variant="body2"
                sx={{
                  color: alpha('#ffffff', 0.7),
                  mb: 1,
                  fontSize: { xs: '0.8125rem', md: compact ? '0.875rem' : '0.9375rem' },
                  lineHeight: 1.5,
                }}
              >
                {step.description}
              </Typography>

              {/* Estimated time */}
              {step.estimatedMinutes && (
                <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mb: 1.5 }}>
                  <Schedule sx={{ fontSize: 16, color: alpha('#ffffff', 0.5) }} />
                  <Typography variant="caption" sx={{ color: alpha('#ffffff', 0.5) }}>
                    ~{step.estimatedMinutes} min
                  </Typography>
                </Stack>
              )}

              {/* Guidance text */}
              {step.guidanceText && isActive && !isCompleted && (
                <Fade in={true}>
                  <Box
                    sx={{
                      p: 1.5,
                      borderRadius: '8px',
                      backgroundColor: alpha('#6366f1', 0.1),
                      border: `1px solid ${alpha('#6366f1', 0.2)}`,
                      mb: 1.5,
                    }}
                  >
                    <Stack direction="row" spacing={1}>
                      <Info sx={{ fontSize: 18, color: '#a5b4fc', flexShrink: 0 }} />
                      <Typography
                        variant="caption"
                        sx={{ color: '#c7d2fe', lineHeight: 1.5, fontSize: '0.8125rem' }}
                      >
                        {step.guidanceText}
                      </Typography>
                    </Stack>
                  </Box>
                </Fade>
              )}
            </Box>
          </Stack>

          {/* Always visible content */}
          <Stack spacing={1.5}>
            <Stack spacing={1.5}>
              {/* Help buttons */}
              {(step.tips || step.videoUrl) && !isCompleted && (
                <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                  {step.tips && onShowTips && (
                    <Tooltip title="Ver dicas e instruções" arrow>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<HelpOutline />}
                        onClick={onShowTips}
                        sx={{
                          borderColor: alpha('#f59e0b', 0.3),
                          color: '#fbbf24',
                          fontSize: '0.8125rem',
                          '&:hover': {
                            borderColor: alpha('#f59e0b', 0.5),
                            backgroundColor: alpha('#f59e0b', 0.1),
                          },
                        }}
                      >
                        Ver Dicas
                      </Button>
                    </Tooltip>
                  )}

                  {step.videoUrl && onWatchVideo && (
                    <Tooltip title="Assistir vídeo tutorial" arrow>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<PlayCircle />}
                        onClick={onWatchVideo}
                        sx={{
                          borderColor: alpha('#ec4899', 0.3),
                          color: '#f9a8d4',
                          fontSize: '0.8125rem',
                          '&:hover': {
                            borderColor: alpha('#ec4899', 0.5),
                            backgroundColor: alpha('#ec4899', 0.1),
                          },
                        }}
                      >
                        Vídeo Tutorial
                      </Button>
                    </Tooltip>
                  )}
                </Stack>
              )}

              {/* Action buttons */}
              {!isCompleted && !isSkipped && (
                <Stack direction="row" spacing={1.5} flexWrap="wrap" gap={1}>
                  <Tooltip title={`Ir para ${step.title.toLowerCase()}`} arrow>
                    <Button
                      variant="contained"
                      size={isMobile ? 'medium' : 'large'}
                      endIcon={<ArrowForward />}
                      onClick={onAction}
                      disabled={loading}
                      fullWidth={isMobile}
                      sx={{
                        background: isActive
                          ? 'linear-gradient(135deg, #10b981, #059669)'
                          : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                        boxShadow: isActive
                          ? `0 4px 16px ${alpha('#10b981', 0.3)}`
                          : `0 4px 16px ${alpha('#6366f1', 0.3)}`,
                        fontWeight: 600,
                        '&:hover': {
                          transform: 'translateY(-2px)',
                          boxShadow: isActive
                            ? `0 6px 20px ${alpha('#10b981', 0.4)}`
                            : `0 6px 20px ${alpha('#6366f1', 0.4)}`,
                        },
                        transition: 'all 0.2s ease',
                      }}
                    >
                      {loading ? 'Processando...' : step.hasEmbeddedDialog ? 'Começar Agora' : 'Ir para Tarefa'}
                    </Button>
                  </Tooltip>

                  {!loading && (
                    <>
                      <Button
                        variant="outlined"
                        size={isMobile ? 'medium' : 'large'}
                        startIcon={<CheckCircle />}
                        onClick={onComplete}
                        sx={{
                          borderColor: alpha('#10b981', 0.3),
                          color: '#6ee7b7',
                          fontWeight: 600,
                          '&:hover': {
                            borderColor: alpha('#10b981', 0.5),
                            backgroundColor: alpha('#10b981', 0.1),
                          },
                        }}
                      >
                        Marcar Concluído
                      </Button>

                      {step.isOptional && onSkip && (
                        <Button
                          variant="outlined"
                          size={isMobile ? 'medium' : 'large'}
                          onClick={onSkip}
                          sx={{
                            borderColor: alpha('#ffffff', 0.2),
                            color: alpha('#ffffff', 0.7),
                            fontWeight: 600,
                            '&:hover': {
                              borderColor: alpha('#ffffff', 0.3),
                              backgroundColor: alpha('#ffffff', 0.05),
                            },
                          }}
                        >
                          Pular
                        </Button>
                      )}
                    </>
                  )}
                </Stack>
              )}

              {/* Sidebar reference (after completion) */}
              {isCompleted && step.sidebarReference && (
                <Fade in={true}>
                  <Box
                    sx={{
                      p: 1.5,
                      borderRadius: '8px',
                      backgroundColor: alpha('#10b981', 0.1),
                      border: `1px solid ${alpha('#10b981', 0.2)}`,
                    }}
                  >
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Info sx={{ fontSize: 18, color: '#6ee7b7', flexShrink: 0 }} />
                      <Typography
                        variant="caption"
                        sx={{ color: '#d1fae5', lineHeight: 1.5, fontSize: '0.8125rem' }}
                      >
                        {step.sidebarReference.description}
                      </Typography>
                    </Stack>
                  </Box>
                </Fade>
              )}
            </Stack>
          </Stack>
        </Stack>
      </CardContent>
    </MotionCard>
  );
}
