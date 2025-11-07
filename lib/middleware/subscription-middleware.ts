import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/utils/logger';

/**
 * Middleware para verificação de trial/assinatura
 * Este middleware é usado no contexto do Next.js middleware (edge runtime)
 * Para funcionalidades mais complexas, usar no AuthProvider (client-side)
 */

export interface SubscriptionMiddlewareConfig {
  protectedPaths: string[];
  trialRedirectUrl: string;
  subscriptionRedirectUrl: string;
}

export const defaultSubscriptionConfig: SubscriptionMiddlewareConfig = {
  protectedPaths: ['/dashboard'],
  trialRedirectUrl: 'https://moneyin.agency/alugazapplanos/',
  subscriptionRedirectUrl: 'https://moneyin.agency/alugazapplanos/'
};

/**
 * Verifica se o path está protegido por assinatura
 */
export function isProtectedPath(pathname: string, config: SubscriptionMiddlewareConfig): boolean {
  return config.protectedPaths.some(path => pathname.startsWith(path));
}

/**
 * Middleware simples para redirecionamento básico
 * A verificação completa é feita no AuthProvider
 */
export function subscriptionMiddleware(
  request: NextRequest, 
  config: SubscriptionMiddlewareConfig = defaultSubscriptionConfig
): NextResponse | null {
  
  const { pathname } = request.nextUrl;
  
  // Verificar se é rota protegida
  if (!isProtectedPath(pathname, config)) {
    return null; // Não é rota protegida, prosseguir
  }
  
  // Verificar se há parâmetros de query indicando redirecionamento de trial
  const url = request.nextUrl;
  const trialExpired = url.searchParams.get('trial_expired');
  const noSubscription = url.searchParams.get('no_subscription');
  
  if (trialExpired === 'true' || noSubscription === 'true') {
    logger.info('🔄 [Subscription Middleware] Redirecionando para planos', {
      pathname,
      reason: trialExpired ? 'trial_expired' : 'no_subscription'
    });
    
    return NextResponse.redirect(new URL(config.trialRedirectUrl));
  }
  
  // A verificação detalhada é feita no AuthProvider
  return null;
}

/**
 * Adiciona headers relacionados a assinatura
 */
export function addSubscriptionHeaders(response: NextResponse, subscriptionStatus?: string): NextResponse {
  if (subscriptionStatus) {
    response.headers.set('X-Subscription-Status', subscriptionStatus);
  }
  
  response.headers.set('X-Subscription-Check', 'enabled');
  response.headers.set('X-Trial-Redirect-URL', defaultSubscriptionConfig.trialRedirectUrl);
  
  return response;
}

/**
 * Função utilitária para criar URL de redirecionamento com parâmetros
 */
export function createTrialRedirectUrl(reason: 'trial_expired' | 'no_subscription', originalPath?: string): string {
  const url = new URL(defaultSubscriptionConfig.trialRedirectUrl);
  
  url.searchParams.set('reason', reason);
  
  if (originalPath) {
    url.searchParams.set('redirect_path', originalPath);
  }
  
  url.searchParams.set('timestamp', Date.now().toString());
  
  return url.toString();
}