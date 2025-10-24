/**
 * Revolutionary Onboarding Component
 * Advanced onboarding experience with embedded dialogs and interactive guidance
 */

'use client';

import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Stack,
  IconButton,
  LinearProgress,
  Chip,
  Fade,
  useTheme,
  useMediaQuery,
  alpha,
  Dialog,
  DialogContent,
  Drawer,
} from '@mui/material';
import {
  Close,
  ExpandMore,
  ExpandLess,
  Celebration,
  Fullscreen,
  FullscreenExit,
  Rocket,
} from '@mui/icons-material';
import { useRevolutionaryOnboarding } from '@/lib/hooks/useRevolutionaryOnboarding';
import OnboardingStepCard from './OnboardingStepCard';
import {
  Step1PropertySetup,
  Step2ReservationSetup,
  Step3WhatsAppSetup,
} from './steps';
import { logger } from '@/lib/utils/logger';
import { motion, AnimatePresence } from 'framer-motion';

const MotionBox = motion(Box);
const MotionCard = motion(Card);

interface RevolutionaryOnboardingProps {
  variant?: 'compact' | 'expanded' | 'fullscreen';
}

export default function RevolutionaryOnboarding({
  variant: initialVariant = 'compact',
}: RevolutionaryOnboardingProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const {
    state,
    loading,
    steps,
    currentStep,
    completionPercentage,
    isFullyCompleted,
    shouldShow,
    openDialog,
    closeDialog,
    startStep,
    completeStep,
    skipStep,
    setViewMode,
    toggleFullscreen,
    dismissOnboarding,
    trackAction,
  } = useRevolutionaryOnboarding();

  const [localExpanded, setLocalExpanded] = useState(initialVariant !== 'compact');
  const [processingStep, setProcessingStep] = useState<string | null>(null);

  // Não mostrar se não deve aparecer ou está loading
  if (!shouldShow || loading || !state) {
    return null;
  }

  const viewMode = state.viewMode;
  const isCompact = viewMode === 'compact' && !localExpanded;
  const isFullscreen = viewMode === 'fullscreen';

  /**
   * Manipular ação do passo
   */
  const handleStepAction = async (step: typeof steps[0]) => {
    try {
      setProcessingStep(step.id);

      logger.info('🎯 [Revolutionary Onboarding] Ação do passo iniciada', {
        stepId: step.id,
        hasEmbeddedDialog: step.hasEmbeddedDialog,
      });

      // Track action
      await trackAction(step.id, {
        type: 'open',
        timestamp: new Date(),
        metadata: { hasEmbeddedDialog: step.hasEmbeddedDialog },
      });

      // Se tem dialog embarcado, abrir
      if (step.hasEmbeddedDialog && step.dialogMode) {
        await startStep(step.id);
        openDialog(step.dialogMode);
      } else {
        // Senão, marca como iniciado (comportamento do onboarding antigo)
        await startStep(step.id);
      }
    } catch (error) {
      logger.error('❌ [Revolutionary Onboarding] Erro ao executar ação', error as Error, {
        stepId: step.id,
      });

      // Track error
      await trackAction(step.id, {
        type: 'error',
        timestamp: new Date(),
        metadata: { error: (error as Error).message },
      });
    } finally {
      setProcessingStep(null);
    }
  };

  /**
   * Completar passo
   */
  const handleCompleteStep = async (stepId: string) => {
    try {
      setProcessingStep(stepId);
      logger.info('✅ [Revolutionary Onboarding] Completando passo', { stepId });

      await completeStep(stepId as any);

      // Track completion
      await trackAction(stepId as any, {
        type: 'complete',
        timestamp: new Date(),
      });

      // Small delay for visual feedback
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (error) {
      logger.error('❌ [Revolutionary Onboarding] Erro ao completar passo', error as Error, {
        stepId,
      });
    } finally {
      setProcessingStep(null);
    }
  };

  /**
   * Pular passo
   */
  const handleSkipStep = async (stepId: string) => {
    try {
      setProcessingStep(stepId);
      logger.info('⏭️ [Revolutionary Onboarding] Pulando passo', { stepId });

      await skipStep(stepId as any, 'Usuario pulou manualmente');

      // Track skip
      await trackAction(stepId as any, {
        type: 'skip',
        timestamp: new Date(),
      });

      await new Promise((resolve) => setTimeout(resolve, 300));
    } catch (error) {
      logger.error('❌ [Revolutionary Onboarding] Erro ao pular passo', error as Error, {
        stepId,
      });
    } finally {
      setProcessingStep(null);
    }
  };

  /**
   * Toggle expand/collapse
   */
  const handleToggleExpand = () => {
    const newExpanded = !localExpanded;
    setLocalExpanded(newExpanded);
    setViewMode(newExpanded ? 'expanded' : 'compact');
  };

  /**
   * Renderizar vista compacta
   */
  const renderCompactView = () => (
    <Fade in={true}>
      <MotionCard
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.4 }}
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
                  <Rocket sx={{ color: 'white', fontSize: 24 }} />
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
                    {state.completedSteps.length} de {steps.length} concluídos
                  </Typography>
                </Box>
              </Stack>

              <Stack direction="row" spacing={1}>
                <IconButton
                  size="small"
                  onClick={handleToggleExpand}
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

            {/* Current Step Preview */}
            {currentStep && !isFullyCompleted && (
              <Stack spacing={1}>
                <Typography
                  variant="body2"
                  sx={{ color: 'rgba(255, 255, 255, 0.8)', fontWeight: 600 }}
                >
                  Próximo passo: {currentStep.title}
                </Typography>
                <Button
                  fullWidth
                  variant="contained"
                  onClick={() => handleStepAction(currentStep)}
                  disabled={processingStep === currentStep.id}
                  sx={{
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    boxShadow: '0 4px 16px rgba(16, 185, 129, 0.3)',
                    fontWeight: 600,
                    '&:hover': {
                      background: 'linear-gradient(135deg, #059669, #047857)',
                      transform: 'translateY(-2px)',
                      boxShadow: '0 6px 20px rgba(16, 185, 129, 0.4)',
                    },
                    transition: 'all 0.2s ease',
                  }}
                >
                  {processingStep === currentStep.id ? 'Carregando...' : 'Continuar'}
                </Button>
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
      </MotionCard>
    </Fade>
  );

  /**
   * Renderizar vista expandida
   */
  const renderExpandedView = () => (
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
                  <Rocket sx={{ color: 'white', fontSize: { xs: 28, md: 32 } }} />
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
                    Configure em 3 Passos Simples
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                    Siga este guia interativo para começar a usar o Locai
                  </Typography>
                </Box>
              </Stack>

              <Stack direction="row" spacing={1}>
                <IconButton
                  size="small"
                  onClick={toggleFullscreen}
                  sx={{
                    color: 'rgba(255, 255, 255, 0.8)',
                    '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' },
                  }}
                >
                  {isFullscreen ? <FullscreenExit /> : <Fullscreen />}
                </IconButton>
                <IconButton
                  size="small"
                  onClick={handleToggleExpand}
                  sx={{
                    color: 'rgba(255, 255, 255, 0.8)',
                    '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' },
                  }}
                >
                  <ExpandLess />
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

            {/* Progress Summary */}
            <Box>
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                sx={{ mb: 1 }}
              >
                <Chip
                  label={`${state.completedSteps.length} de ${steps.length} etapas concluídas`}
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
              <AnimatePresence mode="popLayout">
                {steps.map((step) => (
                  <OnboardingStepCard
                    key={step.id}
                    step={step}
                    isActive={currentStep?.id === step.id}
                    isCompleted={step.status === 'completed'}
                    isSkipped={step.status === 'skipped'}
                    onAction={() => handleStepAction(step)}
                    onComplete={() => handleCompleteStep(step.id)}
                    onSkip={step.isOptional ? () => handleSkipStep(step.id) : undefined}
                    loading={processingStep === step.id}
                  />
                ))}
              </AnimatePresence>
            </Stack>

            {/* Completion Celebration */}
            {isFullyCompleted && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 20 }}
              >
                <Card
                  sx={{
                    background:
                      'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(5, 150, 105, 0.15))',
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
                      🎉 Parabéns! Configuração Concluída
                    </Typography>
                    <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.8)', mb: 3 }}>
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
                        fontWeight: 600,
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
              </motion.div>
            )}
          </Stack>
        </CardContent>
      </Card>
    </Fade>
  );

  /**
   * Renderizar baseado no modo de visualização
   */
  const renderContent = () => {
    if (isCompact) return renderCompactView();
    return renderExpandedView();
  };

  // Renderizar em fullscreen como dialog
  if (isFullscreen) {
    return (
      <Dialog
        open={true}
        fullScreen
        onClose={() => setViewMode('expanded')}
        sx={{
          '& .MuiDialog-paper': {
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f172a 100%)',
          },
        }}
      >
        <DialogContent sx={{ p: { xs: 2, md: 4 } }}>
          <Box sx={{ maxWidth: '1200px', mx: 'auto' }}>{renderExpandedView()}</Box>
        </DialogContent>
      </Dialog>
    );
  }

  // Renderizar normal
  return (
    <>
      <Box>{renderContent()}</Box>

      {/* Step Dialogs */}
      {state?.activeDialog.isOpen && (
        <>
          {state.activeDialog.mode === 'property_import' && (
            <Step1PropertySetup
              open={true}
              onClose={closeDialog}
              onComplete={async (data) => {
                await completeStep('add_property', data);
                closeDialog();
              }}
              onSkip={async () => {
                await skipStep('add_property');
                closeDialog();
              }}
            />
          )}

          {state.activeDialog.mode === 'reservation_create' && (
            <Step2ReservationSetup
              open={true}
              onClose={closeDialog}
              onComplete={async (data) => {
                await completeStep('test_demo', data);
                closeDialog();
              }}
              onSkip={async () => {
                await skipStep('test_demo');
                closeDialog();
              }}
            />
          )}

          {state.activeDialog.mode === 'whatsapp_connect' && (
            <Step3WhatsAppSetup
              open={true}
              onClose={closeDialog}
              onComplete={async (data) => {
                await completeStep('connect_whatsapp', data);
                closeDialog();
              }}
              onSkip={async () => {
                await skipStep('connect_whatsapp');
                closeDialog();
              }}
            />
          )}
        </>
      )}
    </>
  );
}
