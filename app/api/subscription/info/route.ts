import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware/firebase-auth';
import { SubscriptionService } from '@/lib/services/subscription-service';
import { logger } from '@/lib/utils/logger';

// Force Node.js runtime
export const runtime = 'nodejs';

/**
 * API para obter informações detalhadas da assinatura
 * GET /api/subscription/info
 */
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação
    const authContext = await requireAuth(request);
    
    if (!authContext.authenticated || !authContext.userId) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      );
    }
    
    // Buscar assinatura e validar acesso
    const [subscription, validation] = await Promise.all([
      SubscriptionService.getUserSubscription(authContext.userId),
      SubscriptionService.validateUserAccess(authContext.userId)
    ]);
    
    logger.info('📊 [Subscription Info] Dados solicitados', {
      userId: authContext.userId,
      hasSubscription: !!subscription,
      hasAccess: validation.hasAccess
    });
    
    // Calcular informações adicionais
    const response = {
      user: {
        id: authContext.userId,
        email: authContext.email
      },
      subscription: subscription || null,
      validation,
      
      // Informações resumidas
      summary: {
        hasAccess: validation.hasAccess,
        accessType: validation.reason,
        isTrialActive: validation.reason === 'trial_active',
        isSubscriptionActive: validation.reason === 'active_subscription',
        trialDaysRemaining: validation.trialStatus?.daysRemaining || 0,
        subscriptionPlan: subscription?.subscriptionPlan || null,
        subscriptionStatus: subscription?.subscriptionStatus || null,
        nextChargeDate: subscription?.subscriptionNextChargeDate || null,
        totalPayments: subscription?.totalPayments || 0
      },
      
      // Metadados
      metadata: {
        retrievedAt: new Date().toISOString(),
        source: 'subscription-info-api'
      }
    };
    
    return NextResponse.json(response);
    
  } catch (error) {
    logger.error('❌ [Subscription Info] Erro ao buscar informações', error as Error);
    
    return NextResponse.json(
      { error: 'Erro interno ao buscar informações da assinatura' },
      { status: 500 }
    );
  }
}