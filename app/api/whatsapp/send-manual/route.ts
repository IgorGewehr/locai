/**
 * SEND MANUAL MESSAGE - WhatsApp API
 *
 * Permite ao usuário da plataforma enviar mensagens manualmente
 * quando a IA está pausada para uma conversa específica
 *
 * @version 1.0.0
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { validateFirebaseAuth } from '@/lib/middleware/firebase-auth';
import { handleApiError } from '@/lib/utils/api-errors';
import { logger } from '@/lib/utils/logger';
import { TenantServiceFactory } from '@/lib/firebase/firestore-v2';
import { getRedisClient } from '@/lib/redis/client';
import { sanitizeUserInput } from '@/lib/utils/validation';

// Validation Schema
const SendManualMessageSchema = z.object({
  phone: z.string().min(1, 'Phone is required'),
  message: z.string().min(1, 'Message is required').max(4096, 'Message too long'),
  mediaUrl: z.string().url().optional(),
  mediaType: z.enum(['image', 'video', 'document', 'audio']).optional(),
});

/**
 * POST /api/whatsapp/send-manual
 * Send manual message from platform user to client
 */
export async function POST(request: NextRequest) {
  const requestId = `manual_send_${Date.now()}`;

  try {
    // 1. Authenticate
    const authContext = await validateFirebaseAuth(request);
    if (!authContext.authenticated || !authContext.tenantId) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    const tenantId = authContext.tenantId;
    const userId = authContext.userId;
    const body = await request.json();

    // 2. Validate
    const result = SendManualMessageSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid data', code: 'VALIDATION_ERROR', details: result.error.issues },
        { status: 400 }
      );
    }

    const { phone, message: rawMessage, mediaUrl, mediaType } = result.data;

    // 3. Sanitize message content (XSS protection)
    const message = sanitizeUserInput(rawMessage);

    // 4. Get Redis client
    const redis = getRedisClient();

    logger.info('[MANUAL-SEND] Processing manual message', {
      requestId,
      tenantId: tenantId.substring(0, 8) + '***',
      phone: phone.substring(0, 5) + '***',
      messageLength: message.length,
      hasMedia: !!mediaUrl,
      userId
    });

    // 4. Rate limiting - 3 mensagens por 10 segundos por usuário+conversa
    const rateLimitKey = `send_manual:${userId}:${phone}`;
    const attempts = await redis.incr(rateLimitKey);

    if (attempts === 1) {
      await redis.expire(rateLimitKey, 10); // Expira em 10 segundos
    }

    if (attempts > 3) {
      logger.warn('[MANUAL-SEND] Rate limit exceeded', {
        requestId,
        userId,
        phone: phone.substring(0, 5) + '***',
        attempts
      });

      return NextResponse.json(
        {
          success: false,
          error: 'Muitas mensagens enviadas. Aguarde 10 segundos antes de tentar novamente.',
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: await redis.ttl(rateLimitKey)
        },
        { status: 429 }
      );
    }

    // 5. Verify AI is blocked for this conversation - MESMO FORMATO DO N8N

    // Normalizar telefone: remover @c.us se existir (N8N usa sem sufixo)
    const normalizedPhone = phone.replace(/@c\.us$/i, '');

    const blockKey = `ai_blocked:${tenantId}:${normalizedPhone}`;
    const blockData = await redis.get(blockKey);

    if (!blockData) {
      logger.warn('[MANUAL-SEND] AI not blocked for conversation', {
        requestId,
        tenantId: tenantId.substring(0, 8) + '***',
        phone: phone.substring(0, 5) + '***'
      });

      return NextResponse.json(
        {
          success: false,
          error: 'AI is not blocked for this conversation',
          code: 'AI_NOT_BLOCKED',
          hint: 'Use the AI control button to pause the AI before sending manual messages'
        },
        { status: 400 }
      );
    }

    // 4. Send message via WhatsApp microservice
    const whatsappPayload: any = {
      tenantId,
      to: phone,
      message,
      type: mediaUrl ? 'media' : 'text',
      source: 'manual',
      userId
    };

    if (mediaUrl) {
      whatsappPayload.mediaUrl = mediaUrl;
      whatsappPayload.mediaType = mediaType || 'image';
    }

    const whatsappResponse = await fetch(`${process.env.WHATSAPP_MICROSERVICE_URL}/api/v1/messages/${tenantId}/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.WHATSAPP_MICROSERVICE_API_KEY}`
      },
      body: JSON.stringify(whatsappPayload)
    });

    if (!whatsappResponse.ok) {
      const errorData = await whatsappResponse.json().catch(() => ({}));
      throw new Error(`WhatsApp API error: ${errorData.error || whatsappResponse.statusText}`);
    }

    const whatsappResult = await whatsappResponse.json();

    // 5. Save message to Firestore (conversations collection)
    const services = new TenantServiceFactory(tenantId);

    // Find or create conversation
    const existingConversations = await services.conversations.getWhere('clientPhone', '==', phone);
    let conversationId: string;

    if (existingConversations.length > 0) {
      conversationId = existingConversations[0].id!;
    } else {
      // Create new conversation
      conversationId = await services.conversations.create({
        clientPhone: phone,
        clientName: phone, // Will be updated later
        startedAt: new Date(),
        lastMessageAt: new Date(),
        lastMessage: message,
        lastMessageFrom: 'user',
        status: 'active',
        unreadCount: 0,
        source: 'whatsapp',
        tenantId
      } as any);
    }

    // Save message in ConversationMessage format
    // Manual messages go as sofiaMessage (platform responding)
    const now = new Date();
    await services.messages.create({
      conversationId,
      tenantId,
      clientMessage: '', // Empty client message (this is a reply, not a new client message)
      clientMessageTimestamp: now,
      sofiaMessage: message, // Manual message goes here
      sofiaMessageTimestamp: now,
      createdAt: now,
      ...(mediaUrl && {
        mediaUrl,
        mediaType: mediaType || 'image',
        hasMedia: true
      })
    } as any);

    // Update conversation last message
    await services.conversations.update(conversationId, {
      lastMessageAt: new Date(),
      lastMessage: message,
      lastMessageFrom: 'user',
      updatedAt: new Date()
    } as any);

    logger.info('[MANUAL-SEND] Message sent successfully', {
      requestId,
      tenantId: tenantId.substring(0, 8) + '***',
      phone: phone.substring(0, 5) + '***',
      conversationId,
      messageId: whatsappResult.messageId
    });

    return NextResponse.json({
      success: true,
      message: 'Manual message sent successfully',
      data: {
        messageId: whatsappResult.messageId,
        conversationId,
        sentAt: new Date().toISOString(),
        userId
      },
      meta: {
        requestId,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('[MANUAL-SEND] Failed to send manual message', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown'
    });
    return handleApiError(error);
  }
}

/**
 * GET /api/whatsapp/send-manual
 * Health check
 */
export async function GET() {
  return NextResponse.json({
    endpoint: 'send-manual',
    version: '1.0.0',
    description: 'Send manual WhatsApp messages when AI is paused',
    status: 'operational',
    requirements: [
      'AI must be blocked for the conversation',
      'User must be authenticated',
      'Message must not exceed 4096 characters'
    ],
    supportedMediaTypes: ['image', 'video', 'document', 'audio'],
    timestamp: new Date().toISOString()
  });
}
