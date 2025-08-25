/**
 * Arquivo de compatibilidade para migração
 * Redireciona todas as chamadas para o novo sistema Firebase Auth
 */

import { NextRequest } from 'next/server';
import { 
  validateFirebaseAuth as validateAuth,
  requireAuth as requireFirebaseAuth,
  getTenantId as getFirebaseTenantId,
  FirebaseAuthContext
} from '@/lib/middleware/firebase-auth';
import { logger } from '@/lib/utils/logger';

// Re-export tipos com nomes compatíveis
export interface AuthContext extends FirebaseAuthContext {}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  tenantId: string;
}

/**
 * Valida autenticação - compatibilidade com código antigo
 * @deprecated Use validateFirebaseAuth
 */
export async function validateAuth(req: NextRequest): Promise<AuthContext> {
  logger.debug('⚠️ lib/middleware/auth sendo usado - migrar para firebase-auth');
  return await validateAuth(req);
}

/**
 * Middleware de autenticação
 * @deprecated Use validateFirebaseAuth
 */
export async function authMiddleware(req: NextRequest): Promise<AuthContext> {
  return await validateAuth(req);
}

/**
 * Requer autenticação
 * @deprecated Use requireAuth do firebase-auth
 */
export function requireAuth(authContext: AuthContext): void {
  if (!authContext.authenticated) {
    throw new Error('Authentication required');
  }
}

/**
 * Requer tenant
 * @deprecated Use getTenantId do firebase-auth
 */
export function requireTenant(authContext: AuthContext): string {
  if (!authContext.tenantId) {
    throw new Error('Tenant ID required');
  }
  return authContext.tenantId;
}

/**
 * Requer role específica
 */
export function requireRole(authContext: AuthContext, allowedRoles: string[]): void {
  requireAuth(authContext);
  
  if (!authContext.role || !allowedRoles.includes(authContext.role)) {
    throw new Error('Insufficient permissions');
  }
}

/**
 * Gera JWT - não mais necessário com Firebase
 * @deprecated Firebase Auth gerencia tokens automaticamente
 */
export async function generateJWT(user: AuthUser): Promise<string> {
  logger.warn('⚠️ generateJWT chamado - não necessário com Firebase Auth');
  return 'firebase-token-placeholder';
}

/**
 * HOC para proteger rotas
 */
export function withAuth<T extends any[], R>(
  handler: (req: NextRequest, authContext: AuthContext, ...args: T) => Promise<R>
) {
  return async (req: NextRequest, ...args: T): Promise<R> => {
    const authContext = await validateAuth(req);
    requireAuth(authContext);
    return handler(req, authContext, ...args);
  };
}