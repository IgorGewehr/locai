'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  LinearProgress,
  Chip,
  Stack,
  IconButton,
  Collapse,
  Fade,
  useTheme,
  useMediaQuery,
  alpha,
  CircularProgress,
  Tooltip,
} from '@mui/material';
import {
  Home,
  WhatsApp,
  SmartToy,
  Share,
  CheckCircle,
  Close,
  ExpandMore,
  ExpandLess,
  ArrowForward,
  Celebration,
  PlayArrow,
  Schedule as ScheduleIcon,
  CheckCircleOutline,
} from '@mui/icons-material';
import { useOnboarding } from '@/lib/hooks/useOnboarding';
import { OnboardingStep, OnboardingStepId } from '@/lib/types/onboarding';
import { logger } from '@/lib/utils/logger';

// Mapa de ícones
const ICON_MAP: Record<string, any> = {
  Home,
  WhatsApp,
  SmartToy,
  Share,
};

interface OnboardingWidgetProps {
  variant?: 'compact' | 'full';
}

export default function OnboardingWidget({ variant = 'compact' }: OnboardingWidgetProps) {
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [expanded, setExpanded] = useState(false);
  const [processingStep, setProcessingStep] = useState<OnboardingStepId | null>(null);

  const {
    progress,
    loading,
    steps,
    currentStep,
    completedSteps,
    shouldShowOnboarding,
    completeStep,
    skipStep,
    dismissOnboarding,
  } = useOnboarding();

  // Se não deve mostrar, não renderiza nada
  if (!shouldShowOnboarding || !progress) {
    return null;
  }

  const completionPercentage = progress.completionPercentage;
  const isFullyCompleted = progress.isCompleted;

  /**
   * Navegar para a página da ação do passo
   * Nota: O passo deve ser marcado como completo pela página de destino
   * ou manualmente pelo usuário após completar a tarefa
   */
  const handleStepAction = (step: OnboardingStep) => {
    try {
      logger.info('🎯 [Onboarding] Navegando para ação do passo', {
        stepId: step.id,
        actionUrl: step.actionUrl,
      });

      // Navegar para URL de ação
      if (step.actionUrl) {
        router.push(step.actionUrl);
      }
    } catch (error) {
      logger.error('❌ [Onboarding] Erro ao navegar', error as Error, {
        stepId: step.id,
      });
    }
  };

  /**
   * Marcar passo como concluído manualmente
   */
  const handleCompleteStep = async (stepId: OnboardingStepId) => {
    try {
      setProcessingStep(stepId);
      logger.info('✅ [Onboarding] Marcando passo como concluído', { stepId });
      await completeStep(stepId);
      // Pequeno delay para feedback visual
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      logger.error('❌ [Onboarding] Erro ao completar passo', error as Error, {
        stepId,
      });
    } finally {
      setProcessingStep(null);
    }
  };

  /**
   * Pular passo
   */
  const handleSkipStep = async (stepId: OnboardingStepId) => {
    try {
      setProcessingStep(stepId);
      await skipStep(stepId);
      await new Promise(resolve => setTimeout(resolve, 300));
    } catch (error) {
      logger.error('❌ [Onboarding] Erro ao pular passo', error as Error, {
        stepId,
      });
    } finally {
      setProcessingStep(null);
    }
  };

  /**
   * Renderizar card compacto
   */
  if (variant === 'compact' && !expanded) {
    return (
      <Fade in={true}>
        <Card
          sx={{
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(99, 102, 241, 0.2)',
            borderRadius: '20px',
            position: 'relative',
            overflow: 'hidden',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '4px',
              background: 'linear-gradient(90deg, #6366f1, #8b5cf6, #d946ef)',
            },
          }}
        >
          <CardContent sx={{ p: { xs: 3, md: 4 } }}>
            <Stack spacing={2}>
              {/* Header */}
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Stack direction="row" alignItems="center" spacing={2}>
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: '12px',
                      background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 8px 20px rgba(99, 102, 241, 0.3)',
                    }}
                  >
                    <PlayArrow sx={{ color: 'white', fontSize: 24 }} />
                  </Box>
                  <Box>
                    <Typography
                      variant="h6"
                      sx={{
                        color: 'white',
                        fontWeight: 700,
                        fontSize: { xs: '1.125rem', md: '1.25rem' },
                      }}
                    >
                      Primeiros Passos
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                      {completedSteps.length} de {steps.length} concluídos
                    </Typography>
                  </Box>
                </Stack>

                <Stack direction="row" spacing={1}>
                  <IconButton
                    size="small"
                    onClick={() => setExpanded(true)}
                    sx={{
                      color: 'rgba(255, 255, 255, 0.8)',
                      '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' },
                    }}
                  >
                    <ExpandMore />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={dismissOnboarding}
                    sx={{
                      color: 'rgba(255, 255, 255, 0.6)',
                      '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' },
                    }}
                  >
                    <Close />
                  </IconButton>
                </Stack>
              </Stack>

              {/* Progress Bar */}
              <Box>
                <LinearProgress
                  variant="determinate"
                  value={completionPercentage}
                  sx={{
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    '& .MuiLinearProgress-bar': {
                      background: 'linear-gradient(90deg, #10b981, #059669)',
                      borderRadius: 4,
                    },
                  }}
                />
                <Typography
                  variant="caption"
                  sx={{ color: 'rgba(255, 255, 255, 0.7)', mt: 0.5, display: 'block' }}
                >
                  {completionPercentage}% concluído
                </Typography>
              </Box>

              {/* Current Step Quick Action */}
              {currentStep && !isFullyCompleted && (
                <Stack spacing={1.5}>
                  <Button
                    fullWidth
                    variant="contained"
                    endIcon={<ArrowForward />}
                    onClick={() => handleStepAction(currentStep)}
                    disabled={processingStep === currentStep.id}
                    sx={{
                      background: 'linear-gradient(135deg, #10b981, #059669)',
                      boxShadow: '0 4px 16px rgba(16, 185, 129, 0.3)',
                      '&:hover': {
                        background: 'linear-gradient(135deg, #059669, #047857)',
                        transform: 'translateY(-2px)',
                        boxShadow: '0 6px 20px rgba(16, 185, 129, 0.4)',
                      },
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {currentStep.actionText}
                  </Button>

                  <Stack direction="row" spacing={1}>
                    <Button
                      fullWidth
                      variant="outlined"
                      size="small"
                      startIcon={processingStep === currentStep.id ? <CircularProgress size={14} /> : <CheckCircleOutline />}
                      onClick={() => handleCompleteStep(currentStep.id)}
                      disabled={processingStep === currentStep.id}
                      sx={{
                        borderColor: 'rgba(16, 185, 129, 0.3)',
                        color: '#6ee7b7',
                        '&:hover': {
                          borderColor: 'rgba(16, 185, 129, 0.5)',
                          backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        },
                      }}
                    >
                      {processingStep === currentStep.id ? 'Salvando...' : 'Concluído'}
                    </Button>

                    {currentStep.isOptional && (
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => handleSkipStep(currentStep.id)}
                        disabled={processingStep === currentStep.id}
                        sx={{
                          borderColor: 'rgba(255, 255, 255, 0.2)',
                          color: 'rgba(255, 255, 255, 0.7)',
                          '&:hover': {
                            borderColor: 'rgba(255, 255, 255, 0.3)',
                            backgroundColor: 'rgba(255, 255, 255, 0.05)',
                          },
                        }}
                      >
                        Pular
                      </Button>
                    )}
                  </Stack>
                </Stack>
              )}

              {/* Completion Message */}
              {isFullyCompleted && (
                <Stack
                  direction="row"
                  alignItems="center"
                  spacing={1}
                  sx={{
                    p: 2,
                    borderRadius: '12px',
                    background: 'rgba(16, 185, 129, 0.15)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                  }}
                >
                  <Celebration sx={{ color: '#10b981' }} />
                  <Typography variant="body2" sx={{ color: '#6ee7b7', fontWeight: 600 }}>
                    Parabéns! Você completou a configuração inicial
                  </Typography>
                </Stack>
              )}
            </Stack>
          </CardContent>
        </Card>
      </Fade>
    );
  }

  /**
   * Renderizar card expandido
   */
  return (
    <Fade in={true}>
      <Card
        sx={{
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(99, 102, 241, 0.2)',
          borderRadius: '20px',
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '4px',
            background: 'linear-gradient(90deg, #6366f1, #8b5cf6, #d946ef)',
          },
        }}
      >
        <CardContent sx={{ p: { xs: 3, md: 4 } }}>
          <Stack spacing={3}>
            {/* Header */}
            <Stack direction="row" alignItems="flex-start" justifyContent="space-between">
              <Stack direction="row" alignItems="center" spacing={2}>
                <Box
                  sx={{
                    width: { xs: 56, md: 64 },
                    height: { xs: 56, md: 64 },
                    borderRadius: '16px',
                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 8px 24px rgba(99, 102, 241, 0.4)',
                  }}
                >
                  <PlayArrow sx={{ color: 'white', fontSize: { xs: 28, md: 32 } }} />
                </Box>
                <Box>
                  <Typography
                    variant="h5"
                    sx={{
                      color: 'white',
                      fontWeight: 700,
                      fontSize: { xs: '1.375rem', md: '1.5rem' },
                      mb: 0.5,
                    }}
                  >
                    Configure sua conta em 4 passos simples
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                    Siga este guia para começar a usar a plataforma
                  </Typography>
                </Box>
              </Stack>

              <Stack direction="row" spacing={1}>
                {variant === 'compact' && (
                  <IconButton
                    size="small"
                    onClick={() => setExpanded(false)}
                    sx={{
                      color: 'rgba(255, 255, 255, 0.8)',
                      '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' },
                    }}
                  >
                    <ExpandLess />
                  </IconButton>
                )}
                <IconButton
                  size="small"
                  onClick={dismissOnboarding}
                  sx={{
                    color: 'rgba(255, 255, 255, 0.6)',
                    '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' },
                  }}
                >
                  <Close />
                </IconButton>
              </Stack>
            </Stack>

            {/* Progress Summary */}
            <Box>
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                sx={{ mb: 1 }}
              >
                <Chip
                  icon={<CheckCircle />}
                  label={`${completedSteps.length} de ${steps.length} etapas concluídas`}
                  size="small"
                  sx={{
                    backgroundColor: 'rgba(16, 185, 129, 0.15)',
                    color: '#6ee7b7',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    fontWeight: 600,
                  }}
                />
                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                  {completionPercentage}% concluído
                </Typography>
              </Stack>
              <LinearProgress
                variant="determinate"
                value={completionPercentage}
                sx={{
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  '& .MuiLinearProgress-bar': {
                    background: 'linear-gradient(90deg, #10b981, #059669)',
                    borderRadius: 4,
                  },
                }}
              />
            </Box>

            {/* Steps List */}
            <Stack spacing={2}>
              {steps.map((step, index) => {
                const Icon = ICON_MAP[step.icon] || Home;
                const isCompleted = step.status === 'completed';
                const isCurrent = currentStep?.id === step.id;
                const isSkipped = step.status === 'skipped';

                return (
                  <Card
                    key={step.id}
                    sx={{
                      background: isCurrent
                        ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(5, 150, 105, 0.1))'
                        : isCompleted
                        ? 'rgba(16, 185, 129, 0.05)'
                        : 'rgba(255, 255, 255, 0.05)',
                      border: isCurrent
                        ? '2px solid rgba(16, 185, 129, 0.4)'
                        : '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '16px',
                      transition: 'all 0.3s ease',
                      opacity: isSkipped ? 0.5 : 1,
                      '&:hover': {
                        transform: isCurrent || isCompleted ? 'translateY(-4px)' : 'none',
                        boxShadow: isCurrent || isCompleted ? '0 12px 40px rgba(0, 0, 0, 0.3)' : 'none',
                      },
                    }}
                  >
                    <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
                      <Stack direction="row" spacing={2.5} alignItems="flex-start">
                        {/* Icon */}
                        <Box
                          sx={{
                            width: { xs: 48, md: 56 },
                            height: { xs: 48, md: 56 },
                            borderRadius: '12px',
                            background: isCompleted
                              ? 'linear-gradient(135deg, #10b981, #059669)'
                              : isCurrent
                              ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                              : 'rgba(255, 255, 255, 0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          {isCompleted ? (
                            <CheckCircle sx={{ color: 'white', fontSize: { xs: 24, md: 28 } }} />
                          ) : (
                            <Icon sx={{ color: 'white', fontSize: { xs: 24, md: 28 } }} />
                          )}
                        </Box>

                        {/* Content */}
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                            <Chip
                              label={`Etapa ${index + 1}`}
                              size="small"
                              sx={{
                                backgroundColor: isCurrent
                                  ? 'rgba(99, 102, 241, 0.2)'
                                  : 'rgba(255, 255, 255, 0.1)',
                                color: isCurrent ? '#a5b4fc' : 'rgba(255, 255, 255, 0.6)',
                                fontWeight: 600,
                                fontSize: '0.75rem',
                              }}
                            />
                            {isCompleted && (
                              <Chip
                                label="Concluída"
                                size="small"
                                sx={{
                                  backgroundColor: 'rgba(16, 185, 129, 0.15)',
                                  color: '#6ee7b7',
                                  border: '1px solid rgba(16, 185, 129, 0.3)',
                                  fontWeight: 600,
                                  fontSize: '0.75rem',
                                }}
                              />
                            )}
                            {step.isOptional && !isCompleted && (
                              <Chip
                                label="Opcional"
                                size="small"
                                sx={{
                                  backgroundColor: 'rgba(245, 158, 11, 0.15)',
                                  color: '#fbbf24',
                                  border: '1px solid rgba(245, 158, 11, 0.3)',
                                  fontWeight: 600,
                                  fontSize: '0.75rem',
                                }}
                              />
                            )}
                          </Stack>

                          <Typography
                            variant="h6"
                            sx={{
                              color: 'white',
                              fontWeight: 600,
                              mb: 0.5,
                              fontSize: { xs: '1rem', md: '1.125rem' },
                            }}
                          >
                            {step.title}
                          </Typography>

                          <Typography
                            variant="body2"
                            sx={{
                              color: 'rgba(255, 255, 255, 0.7)',
                              mb: 1,
                              fontSize: { xs: '0.875rem', md: '0.9375rem' },
                            }}
                          >
                            {step.description}
                          </Typography>

                          {/* Tempo Estimado */}
                          {step.estimatedMinutes && (
                            <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mb: 2 }}>
                              <ScheduleIcon sx={{ fontSize: 16, color: 'rgba(255, 255, 255, 0.5)' }} />
                              <Typography
                                variant="caption"
                                sx={{ color: 'rgba(255, 255, 255, 0.5)' }}
                              >
                                ~{step.estimatedMinutes} min
                              </Typography>
                            </Stack>
                          )}

                          {/* Actions */}
                          {!isCompleted && !isSkipped && (
                            <Stack direction="row" spacing={1.5} flexWrap="wrap" gap={1}>
                              <Tooltip title="Ir para a página da tarefa" arrow>
                                <Button
                                  variant="contained"
                                  size={isMobile ? 'small' : 'medium'}
                                  endIcon={<ArrowForward />}
                                  onClick={() => handleStepAction(step)}
                                  disabled={processingStep === step.id}
                                  sx={{
                                    background: isCurrent
                                      ? 'linear-gradient(135deg, #10b981, #059669)'
                                      : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                    boxShadow: isCurrent
                                      ? '0 4px 16px rgba(16, 185, 129, 0.3)'
                                      : '0 4px 16px rgba(99, 102, 241, 0.3)',
                                    '&:hover': {
                                      transform: 'translateY(-2px)',
                                      boxShadow: isCurrent
                                        ? '0 6px 20px rgba(16, 185, 129, 0.4)'
                                        : '0 6px 20px rgba(99, 102, 241, 0.4)',
                                    },
                                    transition: 'all 0.2s ease',
                                  }}
                                >
                                  {step.actionText}
                                </Button>
                              </Tooltip>

                              <Tooltip title="Marcar como concluído após completar a tarefa" arrow>
                                <Button
                                  variant="outlined"
                                  size={isMobile ? 'small' : 'medium'}
                                  startIcon={processingStep === step.id ? <CircularProgress size={16} /> : <CheckCircleOutline />}
                                  onClick={() => handleCompleteStep(step.id)}
                                  disabled={processingStep === step.id}
                                  sx={{
                                    borderColor: 'rgba(16, 185, 129, 0.3)',
                                    color: '#6ee7b7',
                                    '&:hover': {
                                      borderColor: 'rgba(16, 185, 129, 0.5)',
                                      backgroundColor: 'rgba(16, 185, 129, 0.1)',
                                    },
                                    '&:disabled': {
                                      borderColor: 'rgba(16, 185, 129, 0.2)',
                                      color: 'rgba(110, 231, 183, 0.5)',
                                    },
                                  }}
                                >
                                  {processingStep === step.id ? 'Salvando...' : 'Marcar Concluído'}
                                </Button>
                              </Tooltip>

                              {step.isOptional && (
                                <Tooltip title="Pular esta etapa (opcional)" arrow>
                                  <Button
                                    variant="outlined"
                                    size={isMobile ? 'small' : 'medium'}
                                    onClick={() => handleSkipStep(step.id)}
                                    disabled={processingStep === step.id}
                                    sx={{
                                      borderColor: 'rgba(255, 255, 255, 0.2)',
                                      color: 'rgba(255, 255, 255, 0.7)',
                                      '&:hover': {
                                        borderColor: 'rgba(255, 255, 255, 0.3)',
                                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                      },
                                      '&:disabled': {
                                        borderColor: 'rgba(255, 255, 255, 0.1)',
                                        color: 'rgba(255, 255, 255, 0.4)',
                                      },
                                    }}
                                  >
                                    Pular
                                  </Button>
                                </Tooltip>
                              )}
                            </Stack>
                          )}
                        </Box>
                      </Stack>
                    </CardContent>
                  </Card>
                );
              })}
            </Stack>

            {/* Completion Message */}
            {isFullyCompleted && (
              <Card
                sx={{
                  background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(5, 150, 105, 0.15))',
                  border: '2px solid rgba(16, 185, 129, 0.4)',
                  borderRadius: '16px',
                  textAlign: 'center',
                }}
              >
                <CardContent sx={{ p: { xs: 3, md: 4 } }}>
                  <Celebration
                    sx={{
                      fontSize: 64,
                      color: '#10b981',
                      mb: 2,
                    }}
                  />
                  <Typography
                    variant="h5"
                    sx={{
                      color: 'white',
                      fontWeight: 700,
                      mb: 1,
                      fontSize: { xs: '1.25rem', md: '1.5rem' },
                    }}
                  >
                    🎉 Parabéns! Configuração concluída
                  </Typography>
                  <Typography
                    variant="body1"
                    sx={{ color: 'rgba(255, 255, 255, 0.8)', mb: 3 }}
                  >
                    Sua plataforma Locai está pronta para automatizar seu negócio imobiliário!
                  </Typography>
                  <Button
                    variant="contained"
                    size="large"
                    onClick={dismissOnboarding}
                    sx={{
                      background: 'linear-gradient(135deg, #10b981, #059669)',
                      boxShadow: '0 4px 16px rgba(16, 185, 129, 0.3)',
                      px: 4,
                      '&:hover': {
                        background: 'linear-gradient(135deg, #059669, #047857)',
                        transform: 'translateY(-2px)',
                        boxShadow: '0 6px 20px rgba(16, 185, 129, 0.4)',
                      },
                      transition: 'all 0.2s ease',
                    }}
                  >
                    Começar a Usar
                  </Button>
                </CardContent>
              </Card>
            )}
          </Stack>
        </CardContent>
      </Card>
    </Fade>
  );
}
