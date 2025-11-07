'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthProvider';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { logger } from '@/lib/utils/logger';

interface UseFirstAccessResult {
  isFirstAccess: boolean;
  loading: boolean;
  error: string | null;
  markAsViewed: () => Promise<void>;
  shouldShowDialog: boolean;
}

/**
 * Hook para gerenciar primeiro acesso do usuário
 */
export function useFirstAccess(): UseFirstAccessResult {
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialogShown, setDialogShown] = useState(false);

  // Determinar se deve mostrar o dialog
  const isFirstAccess = user?.firstAccess === true;
  const shouldShowDialog = isFirstAccess && !authLoading && !!user && !dialogShown;

  /**
   * Marca o tutorial como visualizado
   */
  const markAsViewed = useCallback(async () => {
    if (!user?.uid) {
      logger.warn('⚠️ [FirstAccess] Tentativa de marcar como visto sem usuário');
      return;
    }

    // Marcar imediatamente como mostrado para evitar múltiplas chamadas
    setDialogShown(true);

    try {
      setLoading(true);
      setError(null);

      logger.info('✅ [FirstAccess] Marcando tutorial como visualizado', {
        userId: user.uid
      });

      // Atualizar no Firestore
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        firstAccess: false,
        firstAccessCompletedAt: new Date()
      });

      // Forçar reload do usuário no AuthProvider
      if (user && typeof (user as any).reloadUser === 'function') {
        await (user as any).reloadUser(true);
      }

      logger.info('✅ [FirstAccess] Tutorial marcado como visualizado com sucesso', {
        userId: user.uid
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      
      logger.error('❌ [FirstAccess] Erro ao marcar tutorial como visualizado', err as Error, {
        userId: user.uid
      });
      
      // Reverter em caso de erro
      setDialogShown(false);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Log quando detectar primeiro acesso
  useEffect(() => {
    if (shouldShowDialog) {
      logger.info('🎬 [FirstAccess] Primeiro acesso detectado - preparando tutorial', {
        userId: user.uid,
        userEmail: user.email
      });
    }
  }, [shouldShowDialog, user]);

  return {
    isFirstAccess,
    loading,
    error,
    markAsViewed,
    shouldShowDialog
  };
}

/**
 * Hook simplificado apenas para verificar se é primeiro acesso
 */
export function useIsFirstAccess(): boolean {
  const { user, loading } = useAuth();
  
  if (loading || !user) return false;
  
  return user.firstAccess === true;
}

/**
 * Hook para estatísticas de primeiro acesso (para admins)
 * TODO: Implementar quando necessário - por enquanto não utilizado
 */
export function useFirstAccessStats() {
  const [stats] = useState<{
    totalNewUsers: number;
    usersWhoViewedTutorial: number;
    completionRate: number;
    loading: boolean;
  }>({
    totalNewUsers: 0,
    usersWhoViewedTutorial: 0,
    completionRate: 0,
    loading: false
  });

  // Este hook será implementado quando necessário para analytics
  // Não está sendo usado atualmente, então não há mock ativo

  return stats;
}