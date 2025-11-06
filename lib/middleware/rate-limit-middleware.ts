// lib/middleware/rate-limit-middleware.ts
// Middleware para aplicar rate limiting nas AI functions

import { NextRequest, NextResponse } from 'next/server';
import { getRateLimiter, getClientIdentifier } from '@/lib/utils/rate-limiter';
import { logger } from '@/lib/utils/logger';

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (req: NextRequest, body: any) => string;
  onLimitExceeded?: (req: NextRequest, remaining: { retryAfter?: number }) => NextResponse;
}

/**
 * ✅ MIDDLEWARE DE RATE LIMITING
 * Aplica rate limits baseado em múltiplos critérios
 */
export async function applyRateLimit(
  request: NextRequest,
  config: RateLimitConfig
): Promise<NextResponse | null> {
  try {
    // Parse body para extrair tenantId
    const body = await request.json();

    // Gerar chave de rate limit (padrão: por tenant + IP)
    const key = config.keyGenerator ?
      config.keyGenerator(request, body) :
      `${body.tenantId || 'unknown'}_${getClientIdentifier(request)}`;

    const limiter = getRateLimiter('ai-functions');
    const result = limiter.isAllowed(key, {
      windowMs: config.windowMs,
      maxRequests: config.maxRequests
    });

    // Se ultrapassou limite
    if (!result.allowed) {
      logger.warn('[RateLimit] Request blocked', {
        key: key.substring(0, 20) + '***',
        retryAfter: result.retryAfter,
        endpoint: request.url
      });

      // Usar handler customizado ou padrão
      if (config.onLimitExceeded) {
        return config.onLimitExceeded(request, result);
      }

      return NextResponse.json(
        {
          success: false,
          error: 'Rate limit exceeded',
          message: 'Você está fazendo muitas requisições. Por favor, aguarde um momento.',
          retryAfter: result.retryAfter,
          resetTime: new Date(Date.now() + config.windowMs).toISOString()
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': String(config.maxRequests),
            'X-RateLimit-Remaining': String(result.remaining),
            'Retry-After': String(result.retryAfter || 60)
          }
        }
      );
    }

    // Adicionar headers de rate limit na resposta (será usado depois)
    logger.debug('[RateLimit] Request allowed', {
      key: key.substring(0, 20) + '***',
      remaining: result.remaining,
      endpoint: request.url
    });

    // Request permitido - retornar null para continuar
    return null;

  } catch (error) {
    logger.error('[RateLimit] Error checking rate limit', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    // Em caso de erro no rate limiting, permitir request (fail open)
    return null;
  }
}

// ============================================
// CONFIGURAÇÕES PRÉ-DEFINIDAS
// ============================================

/**
 * Rate limit para funções de BUSCA (leves)
 */
export const searchRateLimitConfig: RateLimitConfig = {
  windowMs: 60000,       // 1 minuto
  maxRequests: 15,       // 15 buscas/min por tenant
  keyGenerator: (req, body) => `search:${body.tenantId || 'unknown'}`
};

/**
 * Rate limit para funções de CRIAÇÃO (pesadas)
 */
export const createRateLimitConfig: RateLimitConfig = {
  windowMs: 60000,       // 1 minuto
  maxRequests: 5,        // 5 criações/min por tenant
  keyGenerator: (req, body) => `create:${body.tenantId || 'unknown'}`
};

/**
 * Rate limit para funções de MÍDIA (bandwidth)
 */
export const mediaRateLimitConfig: RateLimitConfig = {
  windowMs: 60000,       // 1 minuto
  maxRequests: 10,       // 10 envios/min por tenant
  keyGenerator: (req, body) => `media:${body.tenantId || 'unknown'}`
};

/**
 * Rate limit para funções de LLM (custo)
 */
export const llmRateLimitConfig: RateLimitConfig = {
  windowMs: 60000,       // 1 minuto
  maxRequests: 20,       // 20 LLM calls/min por tenant
  keyGenerator: (req, body) => `llm:${body.tenantId || 'unknown'}`,
  onLimitExceeded: (req, result) => {
    return NextResponse.json(
      {
        success: false,
        error: 'LLM_RATE_LIMIT_EXCEEDED',
        message: 'Você está usando o sistema com muita frequência. Para manter a qualidade do serviço, por favor aguarde alguns segundos.',
        retryAfter: result.retryAfter,
        suggestion: 'Se precisar de um atendimento mais rápido, posso te conectar com um atendente humano!'
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(result.retryAfter || 60)
        }
      }
    );
  }
};

/**
 * Rate limit por CLIENTE (WhatsApp phone)
 */
export const clientRateLimitConfig: RateLimitConfig = {
  windowMs: 60000,       // 1 minuto
  maxRequests: 10,       // 10 mensagens/min por cliente
  keyGenerator: (req, body) => `client:${body.clientPhone || body.phone || 'unknown'}`
};

/**
 * Rate limit GLOBAL por tenant (proteção geral)
 */
export const globalTenantRateLimitConfig: RateLimitConfig = {
  windowMs: 60000,       // 1 minuto
  maxRequests: 50,       // 50 requests/min TOTAL por tenant
  keyGenerator: (req, body) => `global:${body.tenantId || 'unknown'}`
};
