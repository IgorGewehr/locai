// lib/middleware/admin-auth.ts
// Middleware de segurança para rotas administrativas

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { headers } from 'next/headers';
import { logger } from '@/lib/utils/logger';
import crypto from 'crypto';

// Interface para admin user
export interface AdminUser {
  uid: string;
  email: string;
  idog: boolean;
  name?: string;
  lastAccess?: Date;
  ipAddress?: string;
}

// Função para verificar se usuário é admin
export async function verifyAdminAccess(request: NextRequest): Promise<{ isAdmin: boolean; user?: AdminUser; error?: string }> {
  try {
    // 1. Extrair token do header (seguindo o padrão do sistema)
    let token: string | null = null;
    
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else {
      token = request.headers.get('x-firebase-token');
    }
    
    // Fallback: tentar cookie se não tiver header
    if (!token) {
      const authCookie = request.cookies.get('auth-token') || request.cookies.get('firebase-token');
      token = authCookie?.value || null;
    }
    
    console.log('🎫 [Admin Auth] Token encontrado:', token ? 'SIM' : 'NÃO');
    
    if (!token) {
      logger.warn('🔒 [Admin Auth] Tentativa de acesso sem autenticação', {
        component: 'Security',
        ip: request.ip || 'unknown'
      });
      return { isAdmin: false, error: 'Não autenticado' };
    }

    // 2. Decodificar e validar o token
    const { getAuth } = await import('firebase-admin/auth');
    const { getApps } = await import('firebase-admin/app');
    
    // Get admin auth
    const apps = getApps();
    if (apps.length === 0) {
      logger.error('❌ [Admin Auth] Firebase Admin não inicializado', {
        component: 'Security'
      });
      return { isAdmin: false, error: 'Erro interno' };
    }
    
    const adminAuth = getAuth(apps[0]);
    console.log('🔐 [Admin Auth] Verificando token com Firebase Admin...');
    const decodedToken = await adminAuth.verifyIdToken(token);
    console.log('✅ [Admin Auth] Token válido para UID:', decodedToken.uid);
    
    if (!decodedToken || !decodedToken.uid) {
      logger.warn('🔒 [Admin Auth] Token inválido', {
        component: 'Security',
        ip: request.ip || 'unknown'
      });
      return { isAdmin: false, error: 'Token inválido' };
    }

    // 3. Buscar dados do usuário no Firestore
    const { db } = await import('@/lib/firebase/config');
    const { doc, getDoc } = await import('firebase/firestore');
    
    console.log('👤 [Admin Auth] Buscando usuário no Firestore...');
    const userDoc = await getDoc(doc(db, 'users', decodedToken.uid));
    
    if (!userDoc.exists()) {
      console.log('❌ [Admin Auth] Usuário não encontrado no Firestore');
      logger.warn('🔒 [Admin Auth] Usuário não encontrado', {
        component: 'Security',
        uid: decodedToken.uid
      });
      return { isAdmin: false, error: 'Usuário não encontrado' };
    }

    const userData = userDoc.data();
    console.log('📊 [Admin Auth] Dados do usuário:', {
      uid: decodedToken.uid,
      email: userData.email,
      idog: userData.idog,
      hasIdog: !!userData.idog
    });
    
    // 4. VERIFICAÇÃO CRÍTICA: Verificar flag idog
    if (!userData.idog || userData.idog !== true) {
      console.log('🚫 [Admin Auth] Campo idog inválido:', userData.idog);
      logger.warn('🚫 [Admin Auth] Acesso negado - usuário sem privilégios admin', {
        component: 'Security',
        uid: decodedToken.uid,
        email: userData.email,
        ip: request.ip || 'unknown',
        attemptedPath: request.nextUrl.pathname,
        idogValue: userData.idog
      });
      return { isAdmin: false, error: 'Acesso negado' };
    }

    // 5. Verificações adicionais de segurança
    
    // Verificar rate limiting para admin
    const rateLimitKey = `admin_access_${decodedToken.uid}`;
    const { getRateLimiter } = await import('@/lib/utils/rate-limiter');
    const limiter = getRateLimiter('admin');
    const rateLimitResult = limiter.isAllowed(rateLimitKey, {
      windowMs: 60000,
      maxRequests: 30
    }); // 30 acessos por minuto
    
    const rateLimitOk = rateLimitResult.allowed;
    
    if (!rateLimitOk) {
      logger.error('🚨 [Admin Auth] Rate limit excedido para admin', {
        component: 'Security',
        uid: decodedToken.uid,
        email: userData.email
      });
      return { isAdmin: false, error: 'Muitas tentativas. Aguarde um momento.' };
    }

    // 6. Verificar IP suspeito (opcional - implementar lista de IPs permitidos)
    const clientIP = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
    
    // 7. Log de acesso bem-sucedido
    logger.info('✅ [Admin Auth] Acesso admin autorizado', {
      component: 'Security',
      uid: decodedToken.uid,
      email: userData.email,
      ip: clientIP,
      path: request.nextUrl.pathname
    });

    // 8. Atualizar último acesso
    const { updateDoc, serverTimestamp } = await import('firebase/firestore');
    await updateDoc(doc(db, 'users', decodedToken.uid), {
      lastAdminAccess: serverTimestamp(),
      lastAdminIP: clientIP
    }).catch(err => {
      logger.error('Erro ao atualizar último acesso admin', err);
    });

    return {
      isAdmin: true,
      user: {
        uid: decodedToken.uid,
        email: userData.email,
        idog: true,
        name: userData.name,
        ipAddress: clientIP
      }
    };

  } catch (error) {
    logger.error('❌ [Admin Auth] Erro na verificação de admin', error as Error, {
      component: 'Security',
      path: request.nextUrl.pathname
    });
    return { isAdmin: false, error: 'Erro na verificação' };
  }
}

// Middleware para proteger rotas admin
export async function adminAuthMiddleware(request: NextRequest) {
  const { isAdmin, error } = await verifyAdminAccess(request);
  
  if (!isAdmin) {
    // Redirecionar para dashboard com mensagem codificada
    const redirectUrl = new URL('/dashboard', request.url);
    
    // Log detalhado de tentativa de acesso não autorizado
    logger.warn('🚫 [Admin Middleware] Redirecionando usuário não autorizado', {
      component: 'Security',
      attemptedPath: request.nextUrl.pathname,
      error,
      timestamp: new Date().toISOString()
    });
    
    return NextResponse.redirect(redirectUrl);
  }
  
  // Adicionar headers de segurança
  const response = NextResponse.next();
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  return response;
}

// Função para criar hash seguro de senhas admin
export function hashAdminPassword(password: string): string {
  return crypto
    .createHash('sha256')
    .update(password + process.env.ADMIN_SALT || 'default-salt-change-this')
    .digest('hex');
}

// Verificar se um usuário específico é admin (para uso em API routes)
export async function isUserAdmin(uid: string): Promise<boolean> {
  try {
    const { db } = await import('@/lib/firebase/config');
    const { doc, getDoc } = await import('firebase/firestore');
    
    const userDoc = await getDoc(doc(db, 'users', uid));
    
    if (!userDoc.exists()) return false;
    
    const userData = userDoc.data();
    return userData.idog === true;
    
  } catch (error) {
    logger.error('Erro ao verificar status admin', error as Error);
    return false;
  }
}