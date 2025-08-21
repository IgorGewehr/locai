import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/lib/auth/auth-service';
import { logger } from '@/lib/utils/logger';
import { WhatsAppMicroserviceClient } from '@/lib/whatsapp/microservice-client';

/**
 * WhatsApp Session API - APENAS Baileys Microservice
 * 
 * Estratégia:
 * - GET: Retorna status atual da sessão (com cache inteligente)
 * - POST: Inicia nova sessão WhatsApp (com rate limiting)
 * - DELETE: Desconecta sessão ativa
 * 
 * Anti-patterns evitados:
 * - Polling excessivo
 * - Logs desnecessários  
 * - Múltiplas inicializações simultâneas
 * - Chamadas sem autenticação
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

// Configurações otimizadas
const CACHE_TTL = 30000; // 30s cache
const RATE_LIMIT_WINDOW = 5000; // 5s entre chamadas
const MAX_INIT_ATTEMPTS = 3; // Máximo 3 tentativas de inicialização
const INIT_COOLDOWN = 60000; // 1 minuto entre inicializações

/**
 * GET /api/whatsapp/session
 * Retorna status atual da sessão WhatsApp
 */
export async function GET(request: NextRequest) {
  try {
    // 1. AUTENTICAÇÃO obrigatória
    const authResult = await authService.requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { user } = authResult;
    const tenantId = user.tenantId;

    // 2. RATE LIMITING por tenant
    const now = Date.now();
    const rateLimit = rateLimiter.get(tenantId);
    
    if (rateLimit && (now - rateLimit.lastRequest) < RATE_LIMIT_WINDOW) {
      // Retornar cache se disponível durante rate limit
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

    // 3. VERIFICAR CACHE válido
    const cached = sessionCache.get(tenantId);
    if (cached && (now - cached.timestamp) < CACHE_TTL) {
      return NextResponse.json({
        success: true,
        data: cached.data,
        cached: true
      });
    }

    // 4. BUSCAR STATUS no microserviço
    const microserviceClient = new WhatsAppMicroserviceClient();
    const sessionStatus = await microserviceClient.getSessionStatus(tenantId);

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
      logger.info('=Ê Session status retrieved', {
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
    logger.error('L Error getting session status', {
      error: error instanceof Error ? error.message : 'Unknown error'
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
 * Inicia nova sessão WhatsApp
 */
export async function POST(request: NextRequest) {
  try {
    // 1. AUTENTICAÇÃO obrigatória
    const authResult = await authService.requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { user } = authResult;
    const tenantId = user.tenantId;

    // 2. VERIFICAR RATE LIMITING agressivo para inicialização
    const now = Date.now();
    const rateLimit = rateLimiter.get(tenantId);
    
    if (rateLimit) {
      // Verificar tentativas excessivas
      if (rateLimit.attempts >= MAX_INIT_ATTEMPTS) {
        const timeSinceLastAttempt = now - rateLimit.lastRequest;
        if (timeSinceLastAttempt < INIT_COOLDOWN) {
          return NextResponse.json({
            success: false,
            error: 'Too many initialization attempts',
            data: {
              connected: false,
              status: 'rate_limited',
              retryAfter: Math.ceil((INIT_COOLDOWN - timeSinceLastAttempt) / 1000),
              message: 'Please wait before trying again'
            }
          }, { status: 429 });
        } else {
          // Reset contador após cooldown
          rateLimiter.delete(tenantId);
        }
      }
    }

    // 3. VERIFICAR se já há inicialização em progresso
    const cached = sessionCache.get(tenantId);
    if (cached && cached.status === 'initializing') {
      const timeSinceInit = now - cached.timestamp;
      if (timeSinceInit < 30000) { // 30s de proteção
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

    // 5. INICIAR SESSÃO no microserviço
    const microserviceClient = new WhatsAppMicroserviceClient();
    const initResult = await microserviceClient.startSession(tenantId);

    if (!initResult.success) {
      // Remover cache de inicialização em caso de erro
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

    // 6. AGUARDAR e verificar status
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const sessionStatus = await microserviceClient.getSessionStatus(tenantId);

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

    logger.info(' Session initialization completed', {
      tenantId: tenantId.substring(0, 8) + '***',
      status: responseData.status,
      hasQR: !!responseData.qrCode
    });

    return NextResponse.json({
      success: true,
      data: responseData
    });

  } catch (error) {
    logger.error('L Error initializing session', {
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
 * Desconecta sessão WhatsApp ativa
 */
export async function DELETE(request: NextRequest) {
  try {
    // 1. AUTENTICAÇÃO obrigatória
    const authResult = await authService.requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { user } = authResult;
    const tenantId = user.tenantId;

    // 2. DESCONECTAR no microserviço
    const microserviceClient = new WhatsAppMicroserviceClient();
    const success = await microserviceClient.disconnectSession(tenantId);

    // 3. LIMPAR CACHE local
    sessionCache.delete(tenantId);
    rateLimiter.delete(tenantId);

    if (success) {
      logger.info('= Session disconnected successfully', {
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
    logger.error('L Error disconnecting session', {
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