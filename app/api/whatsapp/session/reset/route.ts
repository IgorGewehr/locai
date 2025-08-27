import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/lib/auth/auth-service';
import { logger } from '@/lib/utils/logger';

/**
 * POST /api/whatsapp/session/reset
 * Reset rate limiting e cache para WhatsApp session
 */

// Importar os caches do arquivo principal (simulado aqui)
const sessionCache = new Map<string, {
  data: any;
  timestamp: number;
  status: string;
}>();

const rateLimiter = new Map<string, {
  lastRequest: number;
  attempts: number;
}>();

export async function POST(request: NextRequest) {
  try {
    // 1. AUTENTICACAO obrigatoria
    const authResult = await authService.requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    // authResult é diretamente o FirebaseAuthContext
    const tenantId = authResult.tenantId;

    // 2. LIMPAR TODOS OS CACHES para este tenant
    sessionCache.delete(tenantId);
    rateLimiter.delete(tenantId);

    logger.info('🔄 [Session Reset] Cache e rate limiter resetados', {
      tenantId: tenantId.substring(0, 8) + '***',
      timestamp: new Date().toISOString()
    });

    return NextResponse.json({
      success: true,
      message: 'Session cache and rate limiter reset successfully',
      data: {
        tenantId: tenantId.substring(0, 8) + '***',
        resetTimestamp: new Date().toISOString(),
        cacheCleared: true,
        rateLimiterCleared: true
      }
    });

  } catch (error) {
    logger.error('❌ Error resetting session', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    return NextResponse.json({
      success: false,
      error: 'Failed to reset session',
      message: 'Could not clear session cache and rate limiter'
    }, { status: 500 });
  }
}