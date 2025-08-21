import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/lib/auth/auth-service';
import { apiResponse } from '@/lib/utils/api-response';
import { logger } from '@/lib/utils/logger';

export async function POST(request: NextRequest) {
  try {
    logger.info('🚪 [LogoutAPI] Processando logout');

    // Clear the auth cookie
    const response = apiResponse.success({
      message: 'Logout realizado com sucesso',
    });

    // Clear auth-token cookie (main auth cookie)
    response.cookies.set('auth-token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0, // Expire immediately
      path: '/',
    });

    // Clear any other potential auth cookies
    response.cookies.set('session', '', {
      maxAge: 0,
      path: '/',
    });

    response.cookies.set('refresh-token', '', {
      maxAge: 0,
      path: '/',
    });

    response.cookies.set('firebase-auth', '', {
      maxAge: 0,
      path: '/',
    });

    // Clear any Next.js auth cookies
    response.cookies.set('next-auth.session-token', '', {
      maxAge: 0,
      path: '/',
    });

    response.cookies.set('__session', '', {
      maxAge: 0,
      path: '/',
    });

    logger.info('✅ [LogoutAPI] Cookies de autenticação removidos');

    return response;

  } catch (error) {
    logger.error('❌ [LogoutAPI] Erro no logout', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    // Mesmo com erro, retornar sucesso e limpar cookies
    const response = apiResponse.success({
      message: 'Logout processado',
    });

    response.cookies.set('auth-token', '', {
      maxAge: 0,
      path: '/',
    });

    return response;
  }
}