import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware/firebase-auth';
import { SubscriptionService } from '@/lib/services/subscription-service';
import { logger } from '@/lib/utils/logger';

// Force Node.js runtime
export const runtime = 'nodejs';

/**
 * API para validar acesso/assinatura do usuário autenticado
 * GET /api/subscription/validate
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
    
    // Validar acesso do usuário
    const validation = await SubscriptionService.validateUserAccess(authContext.userId);
    
    logger.info('🔍 [Subscription API] Validação de acesso', {
      userId: authContext.userId,
      hasAccess: validation.hasAccess,
      reason: validation.reason
    });
    
    return NextResponse.json({
      ...validation,
      userId: authContext.userId,
      validatedAt: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('❌ [Subscription API] Erro na validação', error as Error);
    
    return NextResponse.json(
      { error: 'Erro interno na validação' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/subscription/validate - Forçar revalidação
 */
export async function POST(request: NextRequest) {
  try {
    const authContext = await requireAuth(request);
    
    if (!authContext.authenticated || !authContext.userId) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      );
    }
    
    // Buscar dados atualizados da assinatura
    const subscription = await SubscriptionService.getUserSubscription(authContext.userId);
    const validation = await SubscriptionService.validateUserAccess(authContext.userId);
    
    logger.info('🔄 [Subscription API] Revalidação forçada', {
      userId: authContext.userId,
      hasAccess: validation.hasAccess,
      hasSubscription: !!subscription
    });
    
    return NextResponse.json({
      ...validation,
      subscription,
      userId: authContext.userId,
      revalidatedAt: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('❌ [Subscription API] Erro na revalidação', error as Error);
    
    return NextResponse.json(
      { error: 'Erro interno na revalidação' },
      { status: 500 }
    );
  }
}