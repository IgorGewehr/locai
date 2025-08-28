import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/lib/auth/auth-service';
import { logger } from '@/lib/utils/logger';
import { WhatsAppMicroserviceClient } from '@/lib/whatsapp/microservice-client';

/**
 * WhatsApp Session API - APENAS Baileys Microservice
 * 
 * Estrategia:
 * - GET: Retorna status atual da sessao (com cache inteligente)
 * - POST: Inicia nova sessao WhatsApp (com rate limiting)
 * - DELETE: Desconecta sessao ativa
 * 
 * Anti-patterns evitados:
 * - Polling excessivo
 * - Logs desnecessarios  
 * - Multiplas inicializacoes simultaneas
 * - Chamadas sem autenticacao
 */

// Cache inteligente por tenant
const sessionCache = new Map<string, {
  data: any;
  timestamp: number;
  status: string;
}>();

// Rate limiting por tenant
const rateLimiter = new Map<string, {
  lastRequest: number;
  attempts: number;
}>();

// Configuracoes otimizadas
const CACHE_TTL = 30000; // 30s cache
const RATE_LIMIT_WINDOW = 5000; // 5s entre chamadas
const MAX_INIT_ATTEMPTS = 10; // Maximo 10 tentativas de inicializacao
const INIT_COOLDOWN = 10000; // 10 segundos entre inicializacoes

/**
 * GET /api/whatsapp/session
 * Retorna status atual da sessao WhatsApp
 */
export async function GET(request: NextRequest) {
  try {
    // 1. AUTENTICACAO obrigatoria
    const authResult = await authService.requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    // authResult é diretamente o FirebaseAuthContext
    const tenantId = authResult.tenantId;

    // 2. RATE LIMITING por tenant
    const now = Date.now();
    const rateLimit = rateLimiter.get(tenantId);
    
    if (rateLimit && (now - rateLimit.lastRequest) < RATE_LIMIT_WINDOW) {
      // Retornar cache se disponivel durante rate limit
      const cached = sessionCache.get(tenantId);
      if (cached) {
        return NextResponse.json({
          success: true,
          data: cached.data,
          cached: true,
          rateLimited: true
        });
      }
    }

    // Atualizar rate limiter
    rateLimiter.set(tenantId, {
      lastRequest: now,
      attempts: (rateLimit?.attempts || 0) + 1
    });

    // 3. VERIFICAR CACHE valido
    const cached = sessionCache.get(tenantId);
    if (cached && (now - cached.timestamp) < CACHE_TTL) {
      return NextResponse.json({
        success: true,
        data: cached.data,
        cached: true
      });
    }

    // 4. BUSCAR STATUS no microservico
    const microserviceClient = new WhatsAppMicroserviceClient();
    const sessionStatus = await microserviceClient.getSessionStatus(tenantId);

    if (!sessionStatus) {
      logger.error('❌ [WhatsApp Session API] Status retornado é null/undefined', {
        tenantId: tenantId.substring(0, 8) + '***'
      });
      
      return NextResponse.json({
        success: false,
        error: 'Failed to get session status - null response',
        data: {
          connected: false,
          status: 'error',
          phoneNumber: null,
          businessName: null,
          qrCode: null,
          lastUpdated: new Date().toISOString(),
          message: 'Microservice returned null/undefined status'
        }
      }, { status: 200 });
    }

    // 5. FORMATAR RESPOSTA padronizada
    const responseData = {
      connected: sessionStatus.connected,
      status: sessionStatus.status,
      phoneNumber: sessionStatus.phone || null,
      businessName: sessionStatus.businessName || null,
      qrCode: sessionStatus.qrCode || null,
      lastUpdated: new Date().toISOString(),
      source: 'microservice'
    };

    // 6. ATUALIZAR CACHE
    sessionCache.set(tenantId, {
      data: responseData,
      timestamp: now,
      status: sessionStatus.status
    });

    // 7. LOG apenas em debug
    if (process.env.NEXT_PUBLIC_DEBUG_API === 'true') {
      logger.info('✅ Session status retrieved', {
        tenantId: tenantId.substring(0, 8) + '***',
        status: sessionStatus.status,
        connected: sessionStatus.connected
      });
    }

    return NextResponse.json({
      success: true,
      data: responseData
    });

  } catch (error) {
    logger.error('❌ Error getting session status', {
      error: error instanceof Error ? error.message : 'Unknown error',
      errorStack: error instanceof Error ? error.stack : undefined,
      errorType: typeof error,
      errorDetails: error
    });

    // Resposta de erro graceful
    return NextResponse.json({
      success: false,
      error: 'Failed to get session status',
      data: {
        connected: false,
        status: 'error',
        phoneNumber: null,
        businessName: null,
        qrCode: null,
        lastUpdated: new Date().toISOString(),
        message: 'Service temporarily unavailable'
      }
    }, { status: 200 }); // 200 para graceful degradation
  }
}

/**
 * POST /api/whatsapp/session
 * Inicia nova sessao WhatsApp
 */
export async function POST(request: NextRequest) {
  logger.info('🚀 [Session API] POST request received');
  
  try {
    // 1. AUTENTICACAO obrigatoria
    logger.info('🔐 [Session API] Starting auth');
    
    const authResult = await authService.requireAuth(request);
    logger.info('✅ [Session API] Auth successful', {
      authenticated: authResult?.authenticated,
      hasTenantId: !!authResult?.tenantId
    });
    
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    // authResult é diretamente o FirebaseAuthContext
    const tenantId = authResult.tenantId;
    
    logger.info('🎯 [Session API] Processing for tenant', {
      tenantId: tenantId?.substring(0, 8) + '***'
    });

    // 2. VERIFICAR RATE LIMITING para inicializacao
    const now = Date.now();
    const rateLimit = rateLimiter.get(tenantId);
    
    if (rateLimit) {
      // Verificar se passou tempo suficiente desde ultima tentativa
      const timeSinceLastAttempt = now - rateLimit.lastRequest;
      
      // Reset contador se passou tempo suficiente
      if (timeSinceLastAttempt > INIT_COOLDOWN) {
        rateLimiter.delete(tenantId);
      } else if (rateLimit.attempts >= MAX_INIT_ATTEMPTS) {
        // Apenas bloquear se ainda dentro do cooldown E excedeu tentativas
        logger.warn('⚠️ [Session] Rate limit atingido', {
          tenantId: tenantId.substring(0, 8) + '***',
          attempts: rateLimit.attempts,
          timeSinceLastAttempt: Math.ceil(timeSinceLastAttempt / 1000) + 's',
          retryAfter: Math.ceil((INIT_COOLDOWN - timeSinceLastAttempt) / 1000) + 's'
        });

        return NextResponse.json({
          success: false,
          error: 'Too many initialization attempts',
          data: {
            connected: false,
            status: 'rate_limited',
            retryAfter: Math.ceil((INIT_COOLDOWN - timeSinceLastAttempt) / 1000),
            attempts: rateLimit.attempts,
            maxAttempts: MAX_INIT_ATTEMPTS,
            message: `Aguarde ${Math.ceil((INIT_COOLDOWN - timeSinceLastAttempt) / 1000)} segundos antes de tentar novamente`,
            resetUrl: '/api/whatsapp/session/reset'
          }
        }, { status: 429 });
      }
    }

    // 3. VERIFICAR se ja ha inicializacao em progresso
    const cached = sessionCache.get(tenantId);
    if (cached && cached.status === 'initializing') {
      const timeSinceInit = now - cached.timestamp;
      if (timeSinceInit < 30000) { // 30s de protecao
        return NextResponse.json({
          success: false,
          error: 'Initialization already in progress',
          data: {
            connected: false,
            status: 'initializing',
            message: 'Please wait for current initialization to complete'
          }
        });
      }
    }

    // 4. MARCAR como inicializando
    sessionCache.set(tenantId, {
      data: { status: 'initializing', connected: false },
      timestamp: now,
      status: 'initializing'
    });

    // 5. INICIAR SESSAO no microservico
    logger.info('🎯 [Session API] Criando microservice client', {
      tenantId: tenantId.substring(0, 8) + '***'
    });

    const microserviceClient = new WhatsAppMicroserviceClient();
    
    logger.info('🚀 [Session API] Chamando startSession', {
      tenantId: tenantId.substring(0, 8) + '***'
    });

    const initResult = await microserviceClient.startSession(tenantId);

    if (!initResult.success) {
      // Remover cache de inicializacao em caso de erro
      sessionCache.delete(tenantId);
      
      return NextResponse.json({
        success: false,
        error: 'Failed to start session',
        data: {
          connected: false,
          status: 'error',
          message: 'Could not initialize WhatsApp session'
        }
      }, { status: 500 });
    }

    // 6. AGUARDAR e verificar status com retry para QR code
    let sessionStatus;
    let attempts = 0;
    const maxAttempts = 15; // 15 tentativas = ~30 segundos máximo
    
    do {
      await new Promise(resolve => setTimeout(resolve, 2000));
      sessionStatus = await microserviceClient.getSessionStatus(tenantId);
      attempts++;
      
      logger.info('🔍 [Session] Checking for QR code', {
        attempt: attempts,
        hasQR: !!sessionStatus.qrCode,
        status: sessionStatus.status,
        connected: sessionStatus.connected
      });
      
      // Se já conectado ou tem QR code, sair do loop
      if (sessionStatus.connected || sessionStatus.qrCode) {
        break;
      }
      
    } while (attempts < maxAttempts && !sessionStatus.connected && !sessionStatus.qrCode);

    // 7. FORMATAR RESPOSTA final
    const responseData = {
      connected: sessionStatus.connected,
      status: sessionStatus.connected ? 'connected' : (sessionStatus.qrCode ? 'qr_ready' : 'initializing'),
      phoneNumber: sessionStatus.phone || null,
      businessName: sessionStatus.businessName || null,
      qrCode: sessionStatus.qrCode || null,
      lastUpdated: new Date().toISOString(),
      message: sessionStatus.connected 
        ? 'WhatsApp connected successfully' 
        : sessionStatus.qrCode 
          ? 'Scan QR code to connect'
          : 'Initializing connection...'
    };

    // 8. ATUALIZAR CACHE com resultado final
    sessionCache.set(tenantId, {
      data: responseData,
      timestamp: now,
      status: responseData.status
    });

    // 9. ATUALIZAR RATE LIMITER
    rateLimiter.set(tenantId, {
      lastRequest: now,
      attempts: (rateLimit?.attempts || 0) + 1
    });

    logger.info('✅ Session initialization completed', {
      tenantId: tenantId.substring(0, 8) + '***',
      status: responseData.status,
      hasQR: !!responseData.qrCode,
      attempts,
      totalTime: attempts * 2 + 's'
    });

    return NextResponse.json({
      success: true,
      data: responseData
    });

  } catch (error) {
    logger.error('❌ Error initializing session', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    // Limpar cache em caso de erro
    const tenantId = request.url.includes('tenantId=') 
      ? new URL(request.url).searchParams.get('tenantId') 
      : 'unknown';
    
    if (tenantId !== 'unknown') {
      sessionCache.delete(tenantId);
    }

    return NextResponse.json({
      success: false,
      error: 'Session initialization failed',
      data: {
        connected: false,
        status: 'error',
        phoneNumber: null,
        businessName: null,
        qrCode: null,
        lastUpdated: new Date().toISOString(),
        message: 'Failed to initialize WhatsApp session'
      }
    }, { status: 500 });
  }
}

/**
 * DELETE /api/whatsapp/session  
 * Desconecta sessao WhatsApp ativa
 */
export async function DELETE(request: NextRequest) {
  try {
    // 1. AUTENTICACAO obrigatoria
    const authResult = await authService.requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    // authResult é diretamente o FirebaseAuthContext
    const tenantId = authResult.tenantId;

    // 2. DESCONECTAR no microservico
    const microserviceClient = new WhatsAppMicroserviceClient();
    const success = await microserviceClient.disconnectSession(tenantId);

    // 3. LIMPAR CACHE local
    sessionCache.delete(tenantId);
    rateLimiter.delete(tenantId);

    if (success) {
      logger.info('✅ Session disconnected successfully', {
        tenantId: tenantId.substring(0, 8) + '***'
      });

      return NextResponse.json({
        success: true,
        message: 'Session disconnected successfully',
        data: {
          connected: false,
          status: 'disconnected',
          lastUpdated: new Date().toISOString()
        }
      });
    } else {
      return NextResponse.json({
        success: false,
        error: 'Failed to disconnect session',
        message: 'Could not disconnect WhatsApp session'
      }, { status: 500 });
    }

  } catch (error) {
    logger.error('❌ Error disconnecting session', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    // Graceful degradation - sempre retornar sucesso
    return NextResponse.json({
      success: true,
      message: 'Session disconnect attempted',
      data: {
        connected: false,
        status: 'disconnected',
        lastUpdated: new Date().toISOString()
      }
    });
  }
}

/**
 * Cleanup: Remover cache antigo periodicamente
 */
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    const CLEANUP_THRESHOLD = 300000; // 5 minutos
    
    for (const [key, value] of sessionCache.entries()) {
      if (now - value.timestamp > CLEANUP_THRESHOLD) {
        sessionCache.delete(key);
      }
    }
    
    for (const [key, value] of rateLimiter.entries()) {
      if (now - value.lastRequest > CLEANUP_THRESHOLD) {
        rateLimiter.delete(key);
      }
    }
  }, 300000); // Cleanup a cada 5 minutos
}