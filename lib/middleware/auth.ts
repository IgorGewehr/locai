// lib/middleware/auth.ts
import { NextRequest } from 'next/server'
import { authService } from '@/lib/auth/auth-service'
import { resolveTenantId } from '@/lib/utils/tenant-extractor'
import { logger } from '@/lib/utils/logger'

export interface AuthContext {
  authenticated: boolean
  userId?: string
  tenantId?: string
  role?: string
  isWhatsApp?: boolean
}

export interface AuthUser {
  id: string
  email: string
  name: string
  role: string
  tenantId: string
}

export async function validateAuth(req: NextRequest): Promise<AuthContext> {
  try {
    logger.info('🔐 [AuthMiddleware] Validando autenticação', {
      url: req.url,
      method: req.method
    });

    // Check if it's a WhatsApp webhook request
    const isWhatsApp = req.headers.get('x-whatsapp-signature') !== null ||
                       req.url.includes('/api/webhook/whatsapp')

    if (isWhatsApp) {
      logger.info('📱 [AuthMiddleware] Requisição WhatsApp detectada');
      return {
        authenticated: true,
        isWhatsApp: true
      }
    }

    // Usar o sistema de extração dinâmica de tenantId
    const authContext = await resolveTenantId(req);
    
    // Se conseguiu extrair tenantId, significa que há autenticação válida
    if (authContext) {
      logger.info('✅ [AuthMiddleware] Autenticação via cookie/token válida', {
        tenantId: authContext
      });
      
      // Tentar obter mais detalhes do token se disponível
      const authToken = req.cookies.get('auth-token')?.value || 
                       req.headers.get('authorization')?.substring(7);
      
      if (authToken) {
        try {
          const payload = await authService.verifyToken(authToken);
          if (payload) {
            return {
              authenticated: true,
              userId: payload.sub,
              tenantId: payload.tenantId,
              role: payload.role
            };
          }
        } catch (error) {
          // Token pode ser base64 legacy, mas ainda válido
        }
      }
      
      // Mesmo sem detalhes completos, se temos tenantId, está autenticado
      return {
        authenticated: true,
        tenantId: authContext,
        userId: authContext, // Usar tenantId como userId se não tiver
        role: 'user'
      };
    }
    
    // Check for Bearer token explicitly
    const authHeader = req.headers.get('authorization')
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      
      try {
        const payload = await authService.verifyToken(token);
        if (payload) {
          logger.info('✅ [AuthMiddleware] Token Bearer JWT válido', {
            userId: payload.sub,
            tenantId: payload.tenantId,
            role: payload.role
          });

          return {
            authenticated: true,
            userId: payload.sub,
            tenantId: payload.tenantId,
            role: payload.role
          }
        }
      } catch (error) {
        logger.warn('⚠️ [AuthMiddleware] Token Bearer JWT inválido', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Não usar fallback - forçar autenticação apropriada
    logger.warn('❌ [AuthMiddleware] Autenticação falhou - nenhum token válido encontrado');
    return {
      authenticated: false
    }
  } catch (error) {
    logger.error('❌ [AuthMiddleware] Erro na validação', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    return {
      authenticated: false
    }
  }
}

export function requireAuth(authContext: AuthContext): void {
  if (!authContext.authenticated) {
    throw new Error('Authentication required')
  }
}

export function requireTenant(authContext: AuthContext): string {
  if (!authContext.tenantId) {
    throw new Error('Tenant ID required')
  }
  return authContext.tenantId
}

export function requireRole(authContext: AuthContext, allowedRoles: string[]): void {
  requireAuth(authContext)
  
  if (!authContext.role || !allowedRoles.includes(authContext.role)) {
    throw new Error('Insufficient permissions')
  }
}

// Auth middleware function
export async function authMiddleware(req: NextRequest): Promise<AuthContext> {
  return validateAuth(req)
}

// Generate JWT token utility (using authService)
export async function generateJWT(user: AuthUser): Promise<string> {
  return await authService.generateToken(user);
}

// Higher-order function for protecting API routes
export function withAuth<T extends any[], R>(
  handler: (req: NextRequest, authContext: AuthContext, ...args: T) => Promise<R>
) {
  return async (req: NextRequest, ...args: T): Promise<R> => {
    const authContext = await validateAuth(req)
    requireAuth(authContext)
    return handler(req, authContext, ...args)
  }
}