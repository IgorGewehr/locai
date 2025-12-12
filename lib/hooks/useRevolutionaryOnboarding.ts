/**
 * Revolutionary Onboarding Hook
 * Advanced state management for embedded onboarding experience
 */

'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '@/contexts/AuthProvider';
import { useTenant } from '@/contexts/TenantContext';
import { doc, setDoc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { logger } from '@/lib/utils/logger';
import { useOnboarding } from './useOnboarding';
import {
  RevolutionaryOnboardingState,
  RevolutionaryOnboardingStep,
  OnboardingDialogMode,
  OnboardingViewMode,
  StepAction,
  UseRevolutionaryOnboardingResult,
  REVOLUTIONARY_ONBOARDING_STEPS,
  DEFAULT_REVOLUTIONARY_STATE,
} from '@/lib/types/revolutionary-onboarding';
import { OnboardingStepId } from '@/lib/types/onboarding';

/**
 * Hook revolucionário para gerenciar o onboarding com dialogs integrados
 */
export function useRevolutionaryOnboarding(): UseRevolutionaryOnboardingResult {
  const { user } = useAuth();
  const { tenantId, isReady } = useTenant();

  // Use o hook base para persistência
  const baseOnboarding = useOnboarding();

  // Estado local estendido
  const [state, setState] = useState<RevolutionaryOnboardingState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Refs para tracking de tempo
  const startTimeRef = useRef<number>(Date.now());
  const stepStartTimeRef = useRef<Record<OnboardingStepId, number>>({
    add_property: 0,
    connect_whatsapp: 0,
  });

  /**
   * Carregar estado do Firestore
   */
  const loadState = useCallback(async () => {
    if (!user?.uid || !tenantId || !isReady) return;

    try {
      setLoading(true);
      setError(null);

      const stateRef = doc(db, 'users', user.uid, 'onboarding', tenantId);
      const stateDoc = await getDoc(stateRef);

      if (stateDoc.exists()) {
        const data = stateDoc.data();

        // Merge com DEFAULT para garantir que novos steps existam
        const mergedStepInteractions = {
          ...DEFAULT_REVOLUTIONARY_STATE.stepInteractions,
          ...(data.stepInteractions || {}),
        };

        const loadedState: RevolutionaryOnboardingState = {
          ...DEFAULT_REVOLUTIONARY_STATE,
          ...data,
          stepInteractions: mergedStepInteractions,
          startedAt: data.startedAt?.toDate() || new Date(),
          lastInteractionAt: data.lastInteractionAt?.toDate() || new Date(),
          activeDialog: {
            mode: null,
            isOpen: false,
            data: undefined,
          }, // Always start with closed dialog
        } as RevolutionaryOnboardingState;

        setState(loadedState);

        logger.info('✅ [Revolutionary Onboarding] Estado carregado de /onboarding/', {
          userId: user.uid,
          tenantId,
          viewMode: loadedState.viewMode,
          completedSteps: loadedState.completedSteps.length,
        });
      } else {
        // Criar novo estado
        const newState: RevolutionaryOnboardingState = {
          ...DEFAULT_REVOLUTIONARY_STATE,
          startedAt: new Date(),
          lastInteractionAt: new Date(),
        };

        await setDoc(stateRef, {
          ...newState,
          startedAt: serverTimestamp(),
          lastInteractionAt: serverTimestamp(),
        });

        setState(newState);

        logger.info('🎬 [Revolutionary Onboarding] Novo estado criado em /onboarding/', {
          userId: user.uid,
          tenantId,
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar estado';
      setError(errorMessage);
      logger.error('❌ [Revolutionary Onboarding] Erro ao carregar estado', err as Error, {
        userId: user.uid,
        tenantId,
      });
    } finally {
      setLoading(false);
    }
  }, [user, tenantId, isReady]);

  /**
   * Persistir estado no Firestore
   */
  const persistState = useCallback(
    async (updates: Partial<RevolutionaryOnboardingState>) => {
      if (!user?.uid || !tenantId || !state) return;

      try {
        const stateRef = doc(db, 'users', user.uid, 'onboarding', tenantId);
        await updateDoc(stateRef, {
          ...updates,
          lastInteractionAt: serverTimestamp(),
        });

        setState((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            ...updates,
            lastInteractionAt: new Date(),
          };
        });

        logger.debug('💾 [Revolutionary Onboarding] Estado persistido', {
          userId: user.uid,
          tenantId,
          updates: Object.keys(updates),
        });
      } catch (err) {
        logger.error('❌ [Revolutionary Onboarding] Erro ao persistir estado', err as Error);
      }
    },
    [user, tenantId, state]
  );

  /**
   * Criar passos com status do base onboarding
   */
  const steps: RevolutionaryOnboardingStep[] = useMemo(() => {
    return REVOLUTIONARY_ONBOARDING_STEPS.map((step) => ({
      ...step,
      status: baseOnboarding.progress?.steps[step.id] || 'pending',
    }));
  }, [baseOnboarding.progress]);

  /**
   * Passo atual
   */
  const currentStep = useMemo(() => {
    // If no currentStepId or the current step is already completed/skipped, find next pending
    if (!state?.currentStepId) {
      return steps.find((s) => s.status === 'pending') || null;
    }

    const stepById = steps.find((s) => s.id === state.currentStepId);

    // If the stored currentStepId is already completed/skipped, find next pending
    if (stepById && (stepById.status === 'completed' || stepById.status === 'skipped')) {
      return steps.find((s) => s.status === 'pending') || null;
    }

    return stepById || null;
  }, [steps, state?.currentStepId]);

  /**
   * Próximo passo
   */
  const nextStep = useMemo(() => {
    if (!currentStep) return null;
    const currentIndex = steps.findIndex((s) => s.id === currentStep.id);
    return steps[currentIndex + 1] || null;
  }, [currentStep, steps]);

  /**
   * Passo anterior
   */
  const previousStep = useMemo(() => {
    if (!currentStep) return null;
    const currentIndex = steps.findIndex((s) => s.id === currentStep.id);
    return steps[currentIndex - 1] || null;
  }, [currentStep, steps]);

  /**
   * Porcentagem de conclusão
   */
  const completionPercentage = useMemo(() => {
    return baseOnboarding.progress?.completionPercentage || 0;
  }, [baseOnboarding.progress]);

  /**
   * Totalmente completo
   */
  const isFullyCompleted = useMemo(() => {
    return baseOnboarding.progress?.isCompleted || false;
  }, [baseOnboarding.progress]);

  /**
   * Deve mostrar onboarding
   * ✅ FIX: Auto-hide ao completar 100%
   */
  const shouldShow = useMemo(() => {
    if (!state || state.isDismissed) return false;
    // 🚀 IMPROVEMENT: Auto-hide quando 100% completo
    if (baseOnboarding.progress?.isCompleted) return false;
    return baseOnboarding.shouldShowOnboarding;
  }, [state, baseOnboarding.shouldShowOnboarding, baseOnboarding.progress]);

  /**
   * Pode voltar
   */
  const canGoBack = useMemo(() => {
    return previousStep !== null;
  }, [previousStep]);

  /**
   * Pode avançar
   */
  const canGoForward = useMemo(() => {
    return nextStep !== null;
  }, [nextStep]);

  /**
   * Abrir dialog
   */
  const openDialog = useCallback(
    async (mode: OnboardingDialogMode, data?: any) => {
      if (!state) return;

      const newState = {
        ...state,
        activeDialog: {
          mode,
          isOpen: true,
          data,
        },
      };

      setState(newState);

      logger.info('🎨 [Revolutionary Onboarding] Dialog aberto', {
        mode,
        stepId: state.currentStepId,
      });

      // Track action
      if (state.currentStepId) {
        await trackAction(state.currentStepId, {
          type: 'open',
          timestamp: new Date(),
          metadata: { dialogMode: mode },
        });
      }
    },
    [state]
  );

  /**
   * Fechar dialog
   */
  const closeDialog = useCallback(async () => {
    if (!state) return;

    const dialogMode = state.activeDialog.mode;

    const newState = {
      ...state,
      activeDialog: {
        mode: null,
        isOpen: false,
      },
    };

    setState(newState);

    logger.info('❌ [Revolutionary Onboarding] Dialog fechado', {
      mode: dialogMode,
      stepId: state.currentStepId,
    });

    // Track action
    if (state.currentStepId) {
      await trackAction(state.currentStepId, {
        type: 'close',
        timestamp: new Date(),
        metadata: { dialogMode },
      });
    }
  }, [state]);

  /**
   * Iniciar passo
   */
  const startStep = useCallback(
    async (stepId: OnboardingStepId) => {
      await baseOnboarding.startStep(stepId);
      await persistState({ currentStepId: stepId });

      // Start time tracking for this step
      stepStartTimeRef.current[stepId] = Date.now();

      logger.info('🎬 [Revolutionary Onboarding] Passo iniciado', { stepId });
    },
    [baseOnboarding, persistState]
  );

  /**
   * Completar passo
   */
  const completeStep = useCallback(
    async (stepId: OnboardingStepId, data?: any) => {
      await baseOnboarding.completeStep(stepId);

      // Calculate time spent on this step
      const stepEndTime = Date.now();
      const stepStartTime = stepStartTimeRef.current[stepId] || stepEndTime;
      const timeSpentSeconds = Math.floor((stepEndTime - stepStartTime) / 1000);

      if (state) {
        // Guard: Garantir que stepInteraction existe
        const currentInteraction = state.stepInteractions[stepId] || {
          stepId,
          attempts: 0,
          timeSpentSeconds: 0,
          actions: [],
        };

        const updatedInteractions = {
          ...state.stepInteractions,
          [stepId]: {
            ...currentInteraction,
            completedAt: new Date(),
            timeSpentSeconds,
          },
        };

        const completedSteps = [...state.completedSteps, stepId];

        const updatedAnalytics = {
          ...state.analytics,
          stepsCompleted: completedSteps.length,
          totalTimeSpentSeconds: state.analytics.totalTimeSpentSeconds + timeSpentSeconds,
          completionRate: (completedSteps.length / steps.length) * 100,
        };

        // Find next pending step after completing this one
        const currentStepIndex = steps.findIndex((s) => s.id === stepId);
        const nextPendingStep = steps.slice(currentStepIndex + 1).find((s) => s.status === 'pending');
        const nextStepId = nextPendingStep?.id || null;

        await persistState({
          completedSteps,
          stepInteractions: updatedInteractions,
          analytics: updatedAnalytics,
          currentStepId: nextStepId, // Move to next step automatically
        });
      }

      logger.info('✅ [Revolutionary Onboarding] Passo completado', {
        stepId,
        timeSpentSeconds,
        data,
      });
    },
    [baseOnboarding, state, steps, persistState]
  );

  /**
   * Pular passo
   */
  const skipStep = useCallback(
    async (stepId: OnboardingStepId, reason?: string) => {
      await baseOnboarding.skipStep(stepId);

      if (state) {
        const skippedSteps = [...state.skippedSteps, stepId];
        const updatedAnalytics = {
          ...state.analytics,
          stepsSkipped: skippedSteps.length,
        };

        // Find next pending step after skipping this one
        const currentStepIndex = steps.findIndex((s) => s.id === stepId);
        const nextPendingStep = steps.slice(currentStepIndex + 1).find((s) => s.status === 'pending');
        const nextStepId = nextPendingStep?.id || null;

        await persistState({
          skippedSteps,
          analytics: updatedAnalytics,
          currentStepId: nextStepId, // Move to next step automatically
        });
      }

      logger.info('⏭️ [Revolutionary Onboarding] Passo pulado', {
        stepId,
        reason,
      });
    },
    [baseOnboarding, state, steps, persistState]
  );

  /**
   * Ir para passo específico
   */
  const goToStep = useCallback(
    (stepId: OnboardingStepId) => {
      persistState({ currentStepId: stepId });
      logger.info('🎯 [Revolutionary Onboarding] Navegando para passo', { stepId });
    },
    [persistState]
  );

  /**
   * Ir para próximo passo
   */
  const goToNextStep = useCallback(() => {
    if (nextStep) {
      goToStep(nextStep.id);
    }
  }, [nextStep, goToStep]);

  /**
   * Ir para passo anterior
   */
  const goToPreviousStep = useCallback(() => {
    if (previousStep) {
      goToStep(previousStep.id);
    }
  }, [previousStep, goToStep]);

  /**
   * Definir modo de visualização
   */
  const setViewMode = useCallback(
    (mode: OnboardingViewMode) => {
      persistState({ viewMode: mode });
      logger.info('🎨 [Revolutionary Onboarding] Modo de visualização alterado', { mode });
    },
    [persistState]
  );

  /**
   * Toggle fullscreen
   */
  const toggleFullscreen = useCallback(() => {
    if (state) {
      const newMode: OnboardingViewMode =
        state.viewMode === 'fullscreen' ? 'expanded' : 'fullscreen';
      setViewMode(newMode);
    }
  }, [state, setViewMode]);

  /**
   * Toggle tooltips
   */
  const toggleTooltips = useCallback(() => {
    if (state) {
      persistState({ showTooltips: !state.showTooltips });
    }
  }, [state, persistState]);

  /**
   * Toggle video tutorials
   */
  const toggleVideoTutorials = useCallback(() => {
    if (state) {
      persistState({ showVideoTutorials: !state.showVideoTutorials });
    }
  }, [state, persistState]);

  /**
   * Desbloquear badge
   */
  const unlockBadge = useCallback(
    async (badgeId: string) => {
      if (!state) return;

      if (!state.unlockedBadges.includes(badgeId)) {
        const unlockedBadges = [...state.unlockedBadges, badgeId];
        await persistState({ unlockedBadges });

        logger.info('🏆 [Revolutionary Onboarding] Badge desbloqueado', { badgeId });
      }
    },
    [state, persistState]
  );

  /**
   * Rastrear ação
   */
  const trackAction = useCallback(
    async (stepId: OnboardingStepId, action: StepAction) => {
      if (!state) return;

      const stepInteraction = state.stepInteractions[stepId];

      // Guard: Se stepInteraction não existe, criar um novo
      if (!stepInteraction) {
        logger.warn('[Revolutionary Onboarding] stepInteraction not found, creating default', { stepId });
        state.stepInteractions[stepId] = {
          stepId,
          attempts: 0,
          timeSpentSeconds: 0,
          actions: [],
        };
      }

      const updatedActions = [...(stepInteraction?.actions || []), action];

      const updatedInteractions = {
        ...state.stepInteractions,
        [stepId]: {
          ...stepInteraction,
          actions: updatedActions,
        },
      };

      // Update analytics based on action type
      let analyticsUpdates: Partial<typeof state.analytics> = {};

      switch (action.type) {
        case 'help_viewed':
          analyticsUpdates.helpViewedCount = state.analytics.helpViewedCount + 1;
          break;
        case 'video_watched':
          analyticsUpdates.videoWatchedCount = state.analytics.videoWatchedCount + 1;
          break;
        case 'error':
          analyticsUpdates.errorsEncountered = state.analytics.errorsEncountered + 1;
          break;
      }

      await persistState({
        stepInteractions: updatedInteractions,
        analytics: {
          ...state.analytics,
          ...analyticsUpdates,
        },
      });

      logger.debug('📊 [Revolutionary Onboarding] Ação rastreada', {
        stepId,
        actionType: action.type,
      });
    },
    [state, persistState]
  );

  /**
   * Resetar onboarding
   */
  const resetOnboarding = useCallback(async () => {
    await baseOnboarding.resetOnboarding();

    if (user?.uid && tenantId) {
      const stateRef = doc(db, 'users', user.uid, 'onboarding', tenantId);
      const newState: RevolutionaryOnboardingState = {
        ...DEFAULT_REVOLUTIONARY_STATE,
        startedAt: new Date(),
        lastInteractionAt: new Date(),
      };

      await setDoc(stateRef, {
        ...newState,
        startedAt: serverTimestamp(),
        lastInteractionAt: serverTimestamp(),
      });

      setState(newState);

      logger.info('🔄 [Revolutionary Onboarding] Onboarding resetado');
    }
  }, [baseOnboarding, user, tenantId]);

  /**
   * Dispensar onboarding
   */
  const dismissOnboarding = useCallback(() => {
    if (state) {
      persistState({ isDismissed: true });
      baseOnboarding.dismissOnboarding();
      logger.info('👋 [Revolutionary Onboarding] Onboarding dispensado');
    }
  }, [state, persistState, baseOnboarding]);

  /**
   * Reabrir onboarding
   */
  const reopenOnboarding = useCallback(() => {
    if (state) {
      persistState({ isDismissed: false });
      logger.info('🔓 [Revolutionary Onboarding] Onboarding reaberto');
    }
  }, [state, persistState]);

  // Carregar estado ao montar
  useEffect(() => {
    if (isReady && user && tenantId) {
      loadState();
    }
  }, [isReady, user, tenantId, loadState]);

  // Auto-save time spent
  useEffect(() => {
    if (!state || !shouldShow) return;

    const interval = setInterval(() => {
      const currentTime = Date.now();
      const timeSpentSeconds = Math.floor((currentTime - startTimeRef.current) / 1000);

      persistState({
        timeSpentSeconds,
        analytics: {
          ...state.analytics,
          totalTimeSpentSeconds: timeSpentSeconds,
        },
      });
    }, 30000); // Save every 30 seconds

    return () => clearInterval(interval);
  }, [state, shouldShow, persistState]);

  // 🚀 IMPROVEMENT: Auto-dismiss quando 100% completo
  useEffect(() => {
    if (isFullyCompleted && state && !state.isDismissed) {
      // Aguardar 3 segundos para o usuário ver a mensagem de conclusão
      const timeout = setTimeout(() => {
        persistState({ isDismissed: true });
        logger.info('🎉 [Revolutionary Onboarding] Auto-dismissed após conclusão');
      }, 3000);

      return () => clearTimeout(timeout);
    }
  }, [isFullyCompleted, state, persistState]);

  return {
    state,
    loading: loading || baseOnboarding.loading,
    error: error || baseOnboarding.error,
    steps,
    currentStep,
    nextStep,
    previousStep,
    openDialog,
    closeDialog,
    startStep,
    completeStep,
    skipStep,
    goToStep,
    goToNextStep,
    goToPreviousStep,
    setViewMode,
    toggleFullscreen,
    toggleTooltips,
    toggleVideoTutorials,
    unlockBadge,
    trackAction,
    resetOnboarding,
    dismissOnboarding,
    reopenOnboarding,
    shouldShow,
    completionPercentage,
    isFullyCompleted,
    canGoBack,
    canGoForward,
  };
}
