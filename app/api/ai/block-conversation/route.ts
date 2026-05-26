/**
 * Block/Unblock AI for specific conversations
 * Permite pausar o agente de IA para intervenção humana
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { validateFirebaseAuth } from '@/lib/middleware/firebase-auth';
import { handleApiError } from '@/lib/utils/api-errors';
import { logger } from '@/lib/utils/logger';
import { getRedisClient } from '@/lib/redis/client';

// Usar o MESMO formato de chave que o N8N usa para bloqueios
// Exemplo: ai_block_{tenantId}_{phone}

// Validation Schema
const BlockConversationSchema = z.object({
  phone: z.string().min(1),
  blocked: z.boolean(),
  reason: z.string().max(200).optional(),
  duration: z.number().min(1).max(24).optional(), // Duration in hours (1-24h)
});

/**
 * POST - Bloqueia/Desbloqueia IA para uma conversa específica
 */
export async function POST(request: NextRequest) {
  const requestId = `ai-block_${Date.now()}`;

  try {
    const authContext = await validateFirebaseAuth(request);
    if (!authContext.authenticated || !authContext.tenantId) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    const tenantId = authContext.tenantId;
    const body = await request.json();

    // Validação
    const result = BlockConversationSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid data', code: 'VALIDATION_ERROR', details: result.error.issues },
        { status: 400 }
      );
    }

    const { phone, blocked, duration } = result.data;

    // Get Redis singleton client
    const redis = getRedisClient();

    // Normalizar telefone: remover sufixos WhatsApp
    const normalizedPhone = phone.replace(/@(c\.us|lid|g\.us|s\.whatsapp\.net)$/i, '');

    // Chave Redis: ai_blocked:{tenantId}:{phone}
    const redisKey = `ai_blocked:${tenantId}:${normalizedPhone}`;

    logger.info('[AI-BLOCK] Redis key generated', {
      requestId,
      redisKey,
      tenantId: tenantId.substring(0, 8) + '***',
      phoneOriginal: phone,
      phoneNormalized: normalizedPhone,
      phoneLength: normalizedPhone.length,
    });

    if (blocked) {
      // Calcular TTL baseado na duração (padrão: 1 hora)
      const durationHours = duration || 1;
      const ttlSeconds = durationHours * 60 * 60;

      // Bloquear IA - salva apenas "true" no Redis
      await redis.set(redisKey, 'true', 'EX', ttlSeconds);

      logger.info('[AI-BLOCK] Conversation blocked', {
        requestId,
        tenantId: tenantId.substring(0, 8) + '***',
        phoneNormalized: normalizedPhone,
        redisKey,
        ttlSeconds,
      });

      return NextResponse.json({
        success: true,
        message: 'Agente de IA bloqueado para esta conversa',
        data: {
          tenantId,
          phone: normalizedPhone,
          blocked: true,
        },
        meta: {
          requestId,
          timestamp: new Date().toISOString(),
        },
      });
    } else {
      // Desbloquear IA
      await redis.del(redisKey);

      logger.info('[AI-BLOCK] Conversation unblocked', {
        requestId,
        tenantId: tenantId.substring(0, 8) + '***',
        phoneNormalized: normalizedPhone,
      });

      return NextResponse.json({
        success: true,
        message: 'Agente de IA desbloqueado para esta conversa',
        data: {
          tenantId,
          phone: normalizedPhone,
          blocked: false,
        },
        meta: { requestId, timestamp: new Date().toISOString() },
      });
    }

  } catch (error) {
    logger.error('[AI-BLOCK] Operation failed', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown',
    });
    return handleApiError(error);
  }
}

/**
 * GET - Verifica status de bloqueio de uma conversa
 */
export async function GET(request: NextRequest) {
  const requestId = `ai-block-check_${Date.now()}`;

  try {
    // Permitir acesso via query params (para N8N e frontend)
    const { searchParams } = new URL(request.url);
    const queryTenantId = searchParams.get('tenantId');
    const phone = searchParams.get('phone');

    if (!phone) {
      return NextResponse.json(
        { error: 'Phone parameter is required', code: 'MISSING_PARAMETER' },
        { status: 400 }
      );
    }

    let tenantId: string;

    if (queryTenantId) {
      // Acesso via query param (N8N)
      tenantId = queryTenantId;
    } else {
      // Acesso autenticado (Frontend)
      const authContext = await validateFirebaseAuth(request);
      if (!authContext.authenticated || !authContext.tenantId) {
        return NextResponse.json(
          { error: 'Unauthorized', code: 'AUTH_REQUIRED' },
          { status: 401 }
        );
      }
      tenantId = authContext.tenantId;
    }

    // Get Redis singleton client
    const redis = getRedisClient();

    // Normalizar telefone: remover sufixos WhatsApp
    const normalizedPhone = phone.replace(/@(c\.us|lid|g\.us|s\.whatsapp\.net)$/i, '');

    // Buscar status no Redis
    const redisKey = `ai_blocked:${tenantId}:${normalizedPhone}`;
    const blockData = await redis.get(redisKey);

    logger.info('[AI-BLOCK] GET request', {
      requestId,
      redisKey,
      tenantId: tenantId.substring(0, 8) + '***',
      phoneNormalized: normalizedPhone,
      hasBlockData: !!blockData,
    });

    return NextResponse.json({
      success: true,
      data: {
        tenantId,
        phone: normalizedPhone,
        blocked: blockData === 'true',
      },
      meta: { requestId, timestamp: new Date().toISOString() },
    });

  } catch (error) {
    logger.error('[AI-BLOCK] Check failed', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown',
    });
    return handleApiError(error);
  }
}
