/**
 * Arquivo de compatibilidade temporário
 * Redireciona para o novo sistema Firebase Auth
 */

import { NextRequest } from 'next/server';
import { validateFirebaseAuth } from '@/lib/middleware/firebase-auth';
import { logger } from '@/lib/utils/logger';

/**
 * Função de compatibilidade para verificar autenticação
 * @deprecated Use validateFirebaseAuth do firebase-auth
 */
export async function verifyAuth(request: NextRequest) {
  logger.debug('⚠️ lib/auth.ts sendo usado - migrar para firebase-auth');
  
  const authContext = await validateFirebaseAuth(request);
  
  if (!authContext.authenticated) {
    return null;
  }
  
  return {
    userId: authContext.userId,
    email: authContext.email,
    tenantId: authContext.tenantId,
    role: authContext.role
  };
}

/**
 * Extrai tenantId do request
 * @deprecated Use getTenantId do firebase-auth
 */
export async function getTenantFromRequest(request: NextRequest): Promise<string | null> {
  const authContext = await validateFirebaseAuth(request);
  return authContext.tenantId || null;
}

// Export default para compatibilidade
export default {
  verifyAuth,
  getTenantFromRequest
};