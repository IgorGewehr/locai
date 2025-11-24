'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthProvider';
import { useTenant } from '@/contexts/TenantContext';
import { doc, setDoc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { logger } from '@/lib/utils/logger';
import {
  OnboardingProgress,
  OnboardingStep,
  OnboardingStepId,
  OnboardingStepStatus,
  UseOnboardingResult,
  DEFAULT_ONBOARDING_STEPS,
} from '@/lib/types/onboarding';

/**
 * Hook para gerenciar o onboarding do usuário
 * Persiste o progresso no Firestore e fornece métodos para atualizar
 */
export function useOnboarding(): UseOnboardingResult {
  const { user, loading: authLoading } = useAuth();
  const { tenantId, isReady } = useTenant();
  const [progress, setProgress] = useState<OnboardingProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  // Criar passos com status do progresso
  const steps: OnboardingStep[] = useMemo(() => {
    return DEFAULT_ONBOARDING_STEPS.map((step) => ({
      ...step,
      status: (progress?.steps[step.id] || 'pending') as OnboardingStepStatus,
    }));
  }, [progress]);

  // Passo atual (primeiro não completado)
  const currentStep = useMemo(() => {
    return steps.find(
      (step) => step.status === 'pending' || step.status === 'in_progress'
    ) || null;
  }, [steps]);

  // Próximo passo após o atual
  const nextStep = useMemo(() => {
    if (!currentStep) return null;
    const currentIndex = steps.findIndex((s) => s.id === currentStep.id);
    return steps[currentIndex + 1] || null;
  }, [currentStep, steps]);

  // Passos completados
  const completedSteps = useMemo(() => {
    return steps.filter((step) => step.status === 'completed');
  }, [steps]);

  // Deve mostrar onboarding
  const shouldShowOnboarding = useMemo(() => {
    if (!user || !tenantId || !isReady || authLoading || dismissed) return false;
    if (!progress) return false;
    return !progress.isCompleted && currentStep !== null;
  }, [user, tenantId, isReady, authLoading, dismissed, progress, currentStep]);

  /**
   * Carregar progresso do Firestore
   */
  const loadProgress = useCallback(async () => {
    if (!user?.uid || !tenantId || !isReady) return;

    try {
      setLoading(true);
      setError(null);

      const progressRef = doc(db, 'users', user.uid, 'onboarding', tenantId);
      const progressDoc = await getDoc(progressRef);

      if (progressDoc.exists()) {
        const data = progressDoc.data();
        const loadedProgress: OnboardingProgress = {
          userId: data.userId,
          tenantId: data.tenantId,
          steps: data.steps,
          currentStepId: data.currentStepId,
          startedAt: data.startedAt?.toDate() || new Date(),
          completedAt: data.completedAt?.toDate(),
          lastUpdatedAt: data.lastUpdatedAt?.toDate() || new Date(),
          isCompleted: data.isCompleted || false,
          completionPercentage: data.completionPercentage || 0,
          metadata: data.metadata,
          // Revolutionary Onboarding fields (optional)
          viewMode: data.viewMode || 'compact',
          activeDialog: data.activeDialog || { mode: null, isOpen: false },
          lastInteractionAt: data.lastInteractionAt?.toDate() || new Date(),
          timeSpentSeconds: data.timeSpentSeconds || 0,
          stepInteractions: data.stepInteractions,
          showTooltips: data.showTooltips !== undefined ? data.showTooltips : true,
          showVideoTutorials: data.showVideoTutorials !== undefined ? data.showVideoTutorials : true,
          isDismissed: data.isDismissed || false,
          completedSteps: data.completedSteps || [],
          skippedSteps: data.skippedSteps || [],
          unlockedBadges: data.unlockedBadges || [],
          analytics: data.analytics,
        };
        setProgress(loadedProgress);

        logger.info('✅ [Onboarding] Progresso carregado', {
          userId: user.uid,
          tenantId,
          completionPercentage: loadedProgress.completionPercentage,
        });
      } else {
        // Criar novo progresso - apenas com steps ativos
        const initialSteps: Record<OnboardingStepId, OnboardingStepStatus> = {
          add_property: 'pending',
          connect_whatsapp: 'pending',
        };

        const newProgress: OnboardingProgress = {
          userId: user.uid,
          tenantId,
          steps: initialSteps,
          currentStepId: 'add_property',
          startedAt: new Date(),
          lastUpdatedAt: new Date(),
          isCompleted: false,
          completionPercentage: 0,
          // Revolutionary Onboarding fields
          viewMode: 'compact',
          activeDialog: { mode: null, isOpen: false },
          lastInteractionAt: new Date(),
          timeSpentSeconds: 0,
          stepInteractions: {
            add_property: { stepId: 'add_property', attempts: 0, timeSpentSeconds: 0, actions: [] },
            connect_whatsapp: { stepId: 'connect_whatsapp', attempts: 0, timeSpentSeconds: 0, actions: [] },
          },
          showTooltips: true,
          showVideoTutorials: true,
          isDismissed: false,
          completedSteps: [],
          skippedSteps: [],
          unlockedBadges: [],
          analytics: {
            totalTimeSpentSeconds: 0,
            stepsCompleted: 0,
            stepsSkipped: 0,
            averageTimePerStep: 0,
            completionRate: 0,
            helpViewedCount: 0,
            videoWatchedCount: 0,
            errorsEncountered: 0,
          },
        };

        await setDoc(progressRef, {
          ...newProgress,
          startedAt: serverTimestamp(),
          lastUpdatedAt: serverTimestamp(),
          lastInteractionAt: serverTimestamp(),
        });

        setProgress(newProgress);

        logger.info('🎬 [Onboarding] Novo progresso criado', {
          userId: user.uid,
          tenantId,
          steps: Object.keys(initialSteps),
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar progresso';
      setError(errorMessage);
      logger.error('❌ [Onboarding] Erro ao carregar progresso', err as Error, {
        userId: user.uid,
        tenantId,
      });
    } finally {
      setLoading(false);
    }
  }, [user, tenantId, isReady]);

  /**
   * Calcular porcentagem de conclusão
   */
  const calculateCompletionPercentage = useCallback((steps: Record<OnboardingStepId, OnboardingStepStatus>) => {
    const totalSteps = Object.keys(steps).length;
    const completedCount = Object.values(steps).filter(
      (status) => status === 'completed'
    ).length;
    return Math.round((completedCount / totalSteps) * 100);
  }, []);

  /**
   * Atualizar progresso no Firestore
   */
  const updateProgress = useCallback(
    async (
      stepId: OnboardingStepId,
      status: OnboardingStepStatus
    ): Promise<void> => {
      if (!user?.uid || !tenantId || !progress) return;

      try {
        const updatedSteps = { ...progress.steps, [stepId]: status };
        const completionPercentage = calculateCompletionPercentage(updatedSteps);
        const isCompleted = completionPercentage === 100;

        // Determinar próximo passo
        let nextStepId: OnboardingStepId | null = null;
        if (!isCompleted && status === 'completed') {
          const allSteps = DEFAULT_ONBOARDING_STEPS;
          const currentIndex = allSteps.findIndex((s) => s.id === stepId);
          const nextStepData = allSteps[currentIndex + 1];
          nextStepId = nextStepData ? nextStepData.id : null;
        }

        const progressRef = doc(db, 'users', user.uid, 'onboarding', tenantId);
        const updateData: any = {
          [`steps.${stepId}`]: status,
          currentStepId: nextStepId || progress.currentStepId,
          lastUpdatedAt: serverTimestamp(),
          completionPercentage,
          isCompleted,
        };

        if (isCompleted) {
          updateData.completedAt = serverTimestamp();
        }

        await updateDoc(progressRef, updateData);

        setProgress((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            steps: updatedSteps,
            currentStepId: nextStepId || prev.currentStepId,
            lastUpdatedAt: new Date(),
            completionPercentage,
            isCompleted,
            completedAt: isCompleted ? new Date() : prev.completedAt,
          };
        });

        logger.info('✅ [Onboarding] Progresso atualizado', {
          userId: user.uid,
          tenantId,
          stepId,
          status,
          completionPercentage,
          isCompleted,
        });
      } catch (err) {
        logger.error('❌ [Onboarding] Erro ao atualizar progresso', err as Error, {
          userId: user.uid,
          tenantId,
          stepId,
          status,
        });
        throw err;
      }
    },
    [user, tenantId, progress, calculateCompletionPercentage]
  );

  /**
   * Iniciar um passo
   */
  const startStep = useCallback(
    async (stepId: OnboardingStepId) => {
      logger.info('🎬 [Onboarding] Iniciando passo', {
        userId: user?.uid,
        tenantId,
        stepId,
      });
      await updateProgress(stepId, 'in_progress');
    },
    [updateProgress, user, tenantId]
  );

  /**
   * Completar um passo
   */
  const completeStep = useCallback(
    async (stepId: OnboardingStepId) => {
      logger.info('✅ [Onboarding] Completando passo', {
        userId: user?.uid,
        tenantId,
        stepId,
      });
      await updateProgress(stepId, 'completed');
    },
    [updateProgress, user, tenantId]
  );

  /**
   * Pular um passo
   */
  const skipStep = useCallback(
    async (stepId: OnboardingStepId) => {
      logger.info('⏭️ [Onboarding] Pulando passo', {
        userId: user?.uid,
        tenantId,
        stepId,
      });
      await updateProgress(stepId, 'skipped');
    },
    [updateProgress, user, tenantId]
  );

  /**
   * Resetar onboarding (para testes/admin)
   */
  const resetOnboarding = useCallback(async () => {
    if (!user?.uid || !tenantId) return;

    try {
      const progressRef = doc(db, 'users', user.uid, 'onboarding', tenantId);

      // Criar steps - apenas com steps ativos
      const initialSteps: Record<OnboardingStepId, OnboardingStepStatus> = {
        add_property: 'pending',
        connect_whatsapp: 'pending',
      };

      const resetProgress: OnboardingProgress = {
        userId: user.uid,
        tenantId,
        steps: initialSteps,
        currentStepId: 'add_property',
        startedAt: new Date(),
        lastUpdatedAt: new Date(),
        isCompleted: false,
        completionPercentage: 0,
        // Revolutionary Onboarding fields
        viewMode: 'compact',
        activeDialog: { mode: null, isOpen: false },
        lastInteractionAt: new Date(),
        timeSpentSeconds: 0,
        stepInteractions: {
          add_property: { stepId: 'add_property', attempts: 0, timeSpentSeconds: 0, actions: [] },
          connect_whatsapp: { stepId: 'connect_whatsapp', attempts: 0, timeSpentSeconds: 0, actions: [] },
        },
        showTooltips: true,
        showVideoTutorials: true,
        isDismissed: false,
        completedSteps: [],
        skippedSteps: [],
        unlockedBadges: [],
        analytics: {
          totalTimeSpentSeconds: 0,
          stepsCompleted: 0,
          stepsSkipped: 0,
          averageTimePerStep: 0,
          completionRate: 0,
          helpViewedCount: 0,
          videoWatchedCount: 0,
          errorsEncountered: 0,
        },
      };

      await setDoc(progressRef, {
        ...resetProgress,
        startedAt: serverTimestamp(),
        lastUpdatedAt: serverTimestamp(),
        lastInteractionAt: serverTimestamp(),
      });

      setProgress(resetProgress);

      logger.info('🔄 [Onboarding] Onboarding resetado', {
        userId: user.uid,
        tenantId,
        steps: Object.keys(initialSteps),
      });
    } catch (err) {
      logger.error('❌ [Onboarding] Erro ao resetar onboarding', err as Error);
      throw err;
    }
  }, [user, tenantId]);

  /**
   * Dispensar onboarding (apenas para sessão atual)
   */
  const dismissOnboarding = useCallback(() => {
    setDismissed(true);
    logger.info('👋 [Onboarding] Onboarding dispensado', {
      userId: user?.uid,
      tenantId,
    });
  }, [user, tenantId]);

  // Carregar progresso ao montar
  useEffect(() => {
    if (isReady && user && tenantId && !authLoading) {
      loadProgress();
    }
  }, [isReady, user, tenantId, authLoading, loadProgress]);

  return {
    progress,
    loading,
    error,
    steps,
    currentStep,
    nextStep,
    completedSteps,
    startStep,
    completeStep,
    skipStep,
    resetOnboarding,
    dismissOnboarding,
    shouldShowOnboarding,
  };
}
