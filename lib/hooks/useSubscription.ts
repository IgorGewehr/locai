'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthProvider';
import { auth } from '@/lib/firebase/config';
import { SubscriptionValidation, UserSubscription } from '@/lib/types/subscription';
import { logger } from '@/lib/utils/logger';

interface UseSubscriptionResult {
  validation: SubscriptionValidation | null;
  subscription: UserSubscription | null;
  loading: boolean;
  error: string | null;
  hasAccess: boolean;
  isTrialActive: boolean;
  isSubscriptionActive: boolean;
  trialDaysRemaining: number;
  refresh: () => Promise<void>;
}

/**
 * Hook para gerenciar estado de assinatura/trial do usuário
 */
export function useSubscription(): UseSubscriptionResult {
  const { user, loading: authLoading } = useAuth();
  const [validation, setValidation] = useState<SubscriptionValidation | null>(null);
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSubscriptionData = useCallback(async () => {
    if (!user?.uid) return;

    try {
      setLoading(true);
      setError(null);

      logger.info('🔍 [useSubscription] Buscando dados de assinatura', {
        userId: user.uid
      });

      // Fazer request para API de validação
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('Usuário não autenticado');
      }
      
      const token = await currentUser.getIdToken();
      
      const response = await fetch('/api/subscription/validate', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        cache: 'no-store' // Sempre buscar dados atuais
      });

      if (!response.ok) {
        throw new Error(`Erro na API: ${response.status}`);
      }

      const data = await response.json();
      
      setValidation(data);
      setSubscription(data.subscription || null);

      logger.info('✅ [useSubscription] Dados carregados', {
        userId: user.uid,
        hasAccess: data.hasAccess,
        reason: data.reason
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      
      logger.error('❌ [useSubscription] Erro ao carregar dados', err as Error, {
        userId: user.uid
      });
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Refresh function para recarregar dados
  const refresh = useCallback(async () => {
    await fetchSubscriptionData();
  }, [fetchSubscriptionData]);

  // Effect para carregar dados iniciais
  useEffect(() => {
    // Só carregar se o usuário estiver autenticado
    if (user?.uid) {
      fetchSubscriptionData();
    } else {
      // Reset states quando não há usuário
      setValidation(null);
      setSubscription(null);
      setError(null);
      setLoading(false);
    }
  }, [fetchSubscriptionData]);

  // Computed values
  const hasAccess = validation?.hasAccess ?? false;
  const isTrialActive = validation?.reason === 'trial_active';
  const isSubscriptionActive = validation?.reason === 'active_subscription';
  const trialDaysRemaining = validation?.trialStatus?.daysRemaining ?? 0;

  return {
    validation,
    subscription,
    loading,
    error,
    hasAccess,
    isTrialActive,
    isSubscriptionActive,
    trialDaysRemaining,
    refresh
  };
}

/**
 * Hook simplificado para verificar apenas se usuário tem acesso
 */
export function useHasAccess(): { hasAccess: boolean; loading: boolean } {
  const { validation, loading } = useSubscription();
  
  return {
    hasAccess: validation?.hasAccess ?? false,
    loading
  };
}

/**
 * Hook para dados de trial
 */
export function useTrialInfo() {
  const { validation, loading } = useSubscription();
  
  return {
    isTrialActive: validation?.reason === 'trial_active',
    trialDaysRemaining: validation?.trialStatus?.daysRemaining ?? 0,
    trialEndDate: validation?.trialStatus?.trialEndDate ?? null,
    hasTrialExpired: validation?.trialStatus?.hasTrialExpired ?? false,
    loading
  };
}

/**
 * Hook para dados de assinatura
 */
export function useSubscriptionInfo() {
  const { subscription, validation, loading } = useSubscription();
  
  return {
    subscription,
    isActive: subscription?.subscriptionActive ?? false,
    plan: subscription?.subscriptionPlan,
    status: subscription?.subscriptionStatus,
    nextChargeDate: subscription?.subscriptionNextChargeDate,
    lastPaymentDate: subscription?.lastPaymentDate,
    lastPaymentAmount: subscription?.lastPaymentAmount,
    totalPayments: subscription?.totalPayments ?? 0,
    hasActiveSubscription: validation?.reason === 'active_subscription',
    loading
  };
}