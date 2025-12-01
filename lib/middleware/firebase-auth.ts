// Middleware simplificado usando apenas Firebase Auth
import { NextRequest } from 'next/server'
import { auth as adminAuth } from '@/lib/firebase/admin'
import { logger } from '@/lib/utils/logger'

export interface FirebaseAuthContext {
  authenticated: boolean
  userId?: string
  email?: string
  tenantId?: string
  role?: string
  token?: string
  error?: string
}

/**
 * Valida o token Firebase da requisição
 * O token pode vir de:
 * 1. Header Authorization: Bearer <token>
 * 2. Header X-Firebase-Token: <token>
 */
export async function validateFirebaseAuth(req: NextRequest): Promise<FirebaseAuthContext> {
  let token: string | null = null

  try {
    // Extrair token do header
    const authHeader = req.headers.get('authorization')
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7)
    } else {
      token = req.headers.get('x-firebase-token')
    }

    if (!token) {
      logger.debug('🔒 [FirebaseAuth] Nenhum token encontrado')
      return { authenticated: false }
    }

    // Verificar token com Firebase Admin SDK (lazy initialization)
    const decodedToken = await adminAuth.verifyIdToken(token)

    // O tenantId é o próprio UID do usuário (conforme CLAUDE.md)
    const tenantId = decodedToken.uid

    logger.debug('✅ [FirebaseAuth] Token válido', {
      userId: decodedToken.uid,
      email: decodedToken.email,
      tenantId
    })

    return {
      authenticated: true,
      userId: decodedToken.uid,
      email: decodedToken.email,
      tenantId,
      role: decodedToken.role || 'user',
      token
    }
  } catch (error) {
    logger.warn('⚠️ [FirebaseAuth] Token inválido', {
      error: error instanceof Error ? error.message : 'Unknown error',
      errorCode: error instanceof Error && 'code' in error ? (error as any).code : 'unknown',
      hasToken: !!token,
      tokenStart: token?.substring(0, 20)
    })

    return { authenticated: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Middleware helper para APIs que requerem autenticação
 */
export async function requireAuth(req: NextRequest): Promise<FirebaseAuthContext> {
  // 🚧 BYPASS TEMPORÁRIO para testes N8N
  if (process.env.NODE_ENV === 'development') {
    // Verificar se é uma chamada de teste
    const userAgent = req.headers.get('user-agent');
    if (userAgent?.includes('curl') || userAgent?.includes('PostmanRuntime')) {
      logger.info('🚧 [FirebaseAuth] Bypass temporário para teste', {
        userAgent: userAgent?.substring(0, 20),
        url: req.url.substring(0, 50)
      });

      return {
        authenticated: true,
        userId: 'test-user',
        email: 'test@example.com',
        tenantId: 'test-tenant',
        role: 'user',
        token: 'test-token'
      };
    }
  }

  const authContext = await validateFirebaseAuth(req)

  if (!authContext.authenticated) {
    throw new Error('Authentication required')
  }

  return authContext
}

/**
 * Extrai o tenantId da requisição autenticada
 */
export async function getTenantId(req: NextRequest): Promise<string> {
  const authContext = await requireAuth(req)

  if (!authContext.tenantId) {
    throw new Error('Tenant ID not found')
  }

  return authContext.tenantId
}
