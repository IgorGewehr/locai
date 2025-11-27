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
  Step2ConfigureSystem,
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
          borderRadius: { xs: '16px', md: '20px' },
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: { xs: '3px', md: '4px' },
            background: 'linear-gradient(90deg, #6366f1, #8b5cf6, #d946ef)',
          },
        }}
      >
        <CardContent sx={{ p: { xs: 2, sm: 2.5, md: 4 } }}>
          <Stack spacing={{ xs: 1.5, md: 2 }}>
            {/* Header */}
            <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
              <Stack direction="row" alignItems="center" spacing={{ xs: 1.5, md: 2 }} flex={1} minWidth={0}>
                <Box
                  sx={{
                    width: { xs: 40, md: 48 },
                    height: { xs: 40, md: 48 },
                    borderRadius: { xs: '10px', md: '12px' },
                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 8px 20px rgba(99, 102, 241, 0.3)',
                    flexShrink: 0,
                  }}
                >
                  <Rocket sx={{ color: 'white', fontSize: { xs: 20, md: 24 } }} />
                </Box>
                <Box flex={1} minWidth={0}>
                  <Typography
                    variant="h6"
                    sx={{
                      color: 'white',
                      fontWeight: 700,
                      fontSize: { xs: '0.9375rem', sm: '1rem', md: '1.25rem' },
                      lineHeight: 1.2,
                    }}
                  >
                    {isMobile ? 'Início Rápido' : 'Primeiros Passos'}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      color: 'rgba(255, 255, 255, 0.7)',
                      fontSize: { xs: '0.75rem', md: '0.875rem' },
                    }}
                  >
                    {state.completedSteps.length}/{steps.length} {isMobile ? '' : 'concluídos'}
                  </Typography>
                </Box>
              </Stack>

              <Stack direction="row" spacing={{ xs: 0.5, md: 1 }} flexShrink={0}>
                <IconButton
                  size="small"
                  onClick={handleToggleExpand}
                  sx={{
                    color: 'rgba(255, 255, 255, 0.8)',
                    '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' },
                    p: { xs: 0.5, md: 1 },
                  }}
                >
                  <ExpandMore sx={{ fontSize: { xs: 20, md: 24 } }} />
                </IconButton>
                <IconButton
                  size="small"
                  onClick={dismissOnboarding}
                  sx={{
                    color: 'rgba(255, 255, 255, 0.6)',
                    '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' },
                    p: { xs: 0.5, md: 1 },
                  }}
                >
                  <Close sx={{ fontSize: { xs: 20, md: 24 } }} />
                </IconButton>
              </Stack>
            </Stack>

            {/* Progress Bar */}
            <Box>
              <LinearProgress
                variant="determinate"
                value={completionPercentage}
                sx={{
                  height: { xs: 6, md: 8 },
                  borderRadius: { xs: 3, md: 4 },
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  '& .MuiLinearProgress-bar': {
                    background: 'linear-gradient(90deg, #10b981, #059669)',
                    borderRadius: { xs: 3, md: 4 },
                  },
                }}
              />
              <Typography
                variant="caption"
                sx={{
                  color: 'rgba(255, 255, 255, 0.7)',
                  mt: 0.5,
                  display: 'block',
                  fontSize: { xs: '0.7rem', md: '0.75rem' },
                }}
              >
                {completionPercentage}% concluído
              </Typography>
            </Box>

            {/* Current Step Preview */}
            {currentStep && !isFullyCompleted && (
              <Stack spacing={{ xs: 0.75, md: 1 }}>
                <Typography
                  variant="body2"
                  sx={{
                    color: 'rgba(255, 255, 255, 0.8)',
                    fontWeight: 600,
                    fontSize: { xs: '0.8125rem', md: '0.875rem' },
                    lineHeight: 1.3,
                  }}
                >
                  {isMobile ? currentStep.title : `Próximo passo: ${currentStep.title}`}
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
                    py: { xs: 1, md: 1.25 },
                    fontSize: { xs: '0.875rem', md: '1rem' },
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
                spacing={{ xs: 1, md: 1.5 }}
                sx={{
                  p: { xs: 1.5, md: 2 },
                  borderRadius: { xs: '10px', md: '12px' },
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                }}
              >
                <Celebration sx={{ color: '#10b981', fontSize: { xs: 20, md: 24 }, flexShrink: 0 }} />
                <Typography
                  variant="body2"
                  sx={{
                    color: '#6ee7b7',
                    fontWeight: 600,
                    fontSize: { xs: '0.8125rem', md: '0.875rem' },
                    lineHeight: 1.3,
                  }}
                >
                  {isMobile ? 'Configuração completa!' : 'Parabéns! Você completou a configuração inicial'}
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
          borderRadius: { xs: '16px', md: '20px' },
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: { xs: '3px', md: '4px' },
            background: 'linear-gradient(90deg, #6366f1, #8b5cf6, #d946ef)',
          },
        }}
      >
        <CardContent sx={{ p: { xs: 2, sm: 2.5, md: 4 } }}>
          <Stack spacing={{ xs: 2, md: 3 }}>
            {/* Header */}
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              alignItems={{ xs: 'flex-start', sm: 'flex-start' }}
              justifyContent="space-between"
              spacing={{ xs: 1.5, sm: 2 }}
            >
              <Stack direction="row" alignItems="center" spacing={{ xs: 1.5, md: 2 }} flex={1}>
                <Box
                  sx={{
                    width: { xs: 48, sm: 56, md: 64 },
                    height: { xs: 48, sm: 56, md: 64 },
                    borderRadius: { xs: '12px', md: '16px' },
                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 8px 24px rgba(99, 102, 241, 0.4)',
                    flexShrink: 0,
                  }}
                >
                  <Rocket sx={{ color: 'white', fontSize: { xs: 24, sm: 28, md: 32 } }} />
                </Box>
                <Box flex={1} minWidth={0}>
                  <Typography
                    variant="h5"
                    sx={{
                      color: 'white',
                      fontWeight: 700,
                      fontSize: { xs: '1.125rem', sm: '1.25rem', md: '1.5rem' },
                      mb: 0.5,
                      lineHeight: 1.2,
                    }}
                  >
                    {isMobile ? 'Configure Rápido' : 'Configure em 2 Passos Simples'}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      color: 'rgba(255, 255, 255, 0.7)',
                      fontSize: { xs: '0.75rem', md: '0.875rem' },
                    }}
                  >
                    {isMobile ? 'Propriedade + WhatsApp' : 'Propriedade → Conectar WhatsApp'}
                  </Typography>
                </Box>
              </Stack>

              <Stack direction="row" spacing={{ xs: 0.5, md: 1 }} flexShrink={0} alignSelf={{ xs: 'flex-end', sm: 'flex-start' }}>
                {!isMobile && (
                  <IconButton
                    size="small"
                    onClick={toggleFullscreen}
                    sx={{
                      color: 'rgba(255, 255, 255, 0.8)',
                      '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' },
                      p: { xs: 0.5, md: 1 },
                    }}
                  >
                    {isFullscreen ? <FullscreenExit /> : <Fullscreen />}
                  </IconButton>
                )}
                <IconButton
                  size="small"
                  onClick={handleToggleExpand}
                  sx={{
                    color: 'rgba(255, 255, 255, 0.8)',
                    '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' },
                    p: { xs: 0.5, md: 1 },
                  }}
                >
                  <ExpandLess sx={{ fontSize: { xs: 20, md: 24 } }} />
                </IconButton>
                <IconButton
                  size="small"
                  onClick={dismissOnboarding}
                  sx={{
                    color: 'rgba(255, 255, 255, 0.6)',
                    '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' },
                    p: { xs: 0.5, md: 1 },
                  }}
                >
                  <Close sx={{ fontSize: { xs: 20, md: 24 } }} />
                </IconButton>
              </Stack>
            </Stack>

            {/* Progress Summary */}
            <Box>
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                sx={{ mb: { xs: 0.75, md: 1 } }}
                spacing={1}
              >
                <Chip
                  label={`${state.completedSteps.length}/${steps.length}${isMobile ? '' : ' etapas concluídas'}`}
                  size="small"
                  sx={{
                    backgroundColor: 'rgba(16, 185, 129, 0.15)',
                    color: '#6ee7b7',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    fontWeight: 600,
                    fontSize: { xs: '0.7rem', md: '0.75rem' },
                    height: { xs: 22, md: 24 },
                  }}
                />
                <Typography
                  variant="body2"
                  sx={{
                    color: 'rgba(255, 255, 255, 0.7)',
                    fontSize: { xs: '0.75rem', md: '0.875rem' },
                    whiteSpace: 'nowrap',
                  }}
                >
                  {completionPercentage}%
                </Typography>
              </Stack>
              <LinearProgress
                variant="determinate"
                value={completionPercentage}
                sx={{
                  height: { xs: 6, md: 8 },
                  borderRadius: { xs: 3, md: 4 },
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  '& .MuiLinearProgress-bar': {
                    background: 'linear-gradient(90deg, #10b981, #059669)',
                    borderRadius: { xs: 3, md: 4 },
                  },
                }}
              />
            </Box>

            {/* Steps List */}
            <Stack spacing={{ xs: 1.5, md: 2 }}>
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
                    borderRadius: { xs: '12px', md: '16px' },
                    textAlign: 'center',
                  }}
                >
                  <CardContent sx={{ p: { xs: 2.5, md: 4 } }}>
                    <Celebration
                      sx={{
                        fontSize: { xs: 48, md: 64 },
                        color: '#10b981',
                        mb: { xs: 1.5, md: 2 },
                      }}
                    />
                    <Typography
                      variant="h5"
                      sx={{
                        color: 'white',
                        fontWeight: 700,
                        mb: { xs: 0.75, md: 1 },
                        fontSize: { xs: '1.125rem', sm: '1.25rem', md: '1.5rem' },
                        lineHeight: 1.2,
                      }}
                    >
                      {isMobile ? '🎉 Pronto!' : '🎉 Parabéns! Configuração Concluída'}
                    </Typography>
                    <Typography
                      variant="body1"
                      sx={{
                        color: 'rgba(255, 255, 255, 0.8)',
                        mb: { xs: 2, md: 3 },
                        fontSize: { xs: '0.875rem', md: '1rem' },
                        lineHeight: 1.4,
                      }}
                    >
                      {isMobile
                        ? 'Tudo pronto para automatizar seu negócio!'
                        : 'Sua plataforma Locai está pronta para automatizar seu negócio imobiliário!'}
                    </Typography>
                    <Button
                      variant="contained"
                      size={isMobile ? 'medium' : 'large'}
                      onClick={dismissOnboarding}
                      fullWidth={isMobile}
                      sx={{
                        background: 'linear-gradient(135deg, #10b981, #059669)',
                        boxShadow: '0 4px 16px rgba(16, 185, 129, 0.3)',
                        px: { xs: 3, md: 4 },
                        py: { xs: 1.25, md: 1.5 },
                        fontWeight: 600,
                        fontSize: { xs: '0.875rem', md: '1rem' },
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
        <DialogContent sx={{ p: { xs: 1.5, sm: 2, md: 4 }, overflowY: 'auto' }}>
          <Box sx={{ maxWidth: '1200px', mx: 'auto', width: '100%' }}>{renderExpandedView()}</Box>
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

          {state.activeDialog.mode === 'system_configure' && (
            <Step2ConfigureSystem
              open={true}
              onClose={closeDialog}
              onComplete={async (data) => {
                await completeStep('configure_system', data);
                closeDialog();
              }}
              onSkip={async () => {
                await skipStep('configure_system');
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
