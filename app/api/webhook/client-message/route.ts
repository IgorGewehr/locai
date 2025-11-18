/**
 * CLIENT MESSAGE WEBHOOK
 *
 * Recebe mensagens do cliente em tempo real do WhatsApp microservice
 * Permite ao usuário da plataforma ver mensagens chegando ao vivo
 * quando está em modo de atendimento manual
 *
 * @version 1.0.0
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { logger } from '@/lib/utils/logger';
import { TenantServiceFactory } from '@/lib/firebase/firestore-v2';
import { getRedisClient } from '@/lib/redis/client';

// Validation Schema
const ClientMessageWebhookSchema = z.object({
  tenantId: z.string().min(1),
  event: z.enum(['message', 'message_ack', 'typing', 'presence']),
  data: z.object({
    from: z.string(),
    message: z.string().optional(),
    messageId: z.string(),
    timestamp: z.string(),
    messageReplied: z.string().optional(),
    mediaUrl: z.string().optional(),
    mediaType: z.enum(['image', 'video', 'audio', 'document']).optional()
  })
});

/**
 * POST /api/webhook/client-message
 * Receives incoming messages from WhatsApp microservice
 */
export async function POST(request: NextRequest) {
  const requestId = `client_msg_${Date.now()}`;

  try {
    // Validate API key
    const authHeader = request.headers.get('Authorization');
    const expectedKey = process.env.WHATSAPP_MICROSERVICE_API_KEY;

    if (!authHeader || !authHeader.startsWith('Bearer ') || authHeader.slice(7) !== expectedKey) {
      logger.warn('[CLIENT-MESSAGE] Unauthorized webhook call', {
        requestId,
        hasAuth: !!authHeader
      });

      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 });
    }

    const body = await request.json();

    // Validate payload
    const result = ClientMessageWebhookSchema.safeParse(body);
    if (!result.success) {
      logger.warn('[CLIENT-MESSAGE] Invalid webhook payload', {
        requestId,
        errors: result.error.issues
      });

      return NextResponse.json({
        success: false,
        error: 'Invalid payload',
        details: result.error.issues
      }, { status: 400 });
    }

    const { tenantId, event, data } = result.data;
    const { from: phone, message, messageId, timestamp, messageReplied, mediaUrl, mediaType } = data;

    logger.info('[CLIENT-MESSAGE] Received webhook', {
      requestId,
      tenantId: tenantId.substring(0, 8) + '***',
      phone: phone.substring(0, 5) + '***',
      event,
      hasMessage: !!message,
      hasMedia: !!mediaUrl
    });

    // Ignore group messages
    if (phone.includes('@g.us')) {
      logger.info('[CLIENT-MESSAGE] Ignoring group message', {
        requestId,
        phone: phone.substring(0, 5) + '***'
      });

      return NextResponse.json({
        success: true,
        ignored: true,
        reason: 'Group message'
      });
    }

    // Only process 'message' events
    if (event !== 'message') {
      return NextResponse.json({
        success: true,
        ignored: true,
        reason: `Event type ${event} not processed`
      });
    }

    // Check if AI is blocked for this conversation - MESMO FORMATO DO N8N
    const redis = getRedisClient();

    // Normalizar telefone: remover @c.us se existir (N8N usa sem sufixo)
    const normalizedPhone = phone.replace(/@c\.us$/i, '');

    const blockKey = `ai_blocked:${tenantId}:${normalizedPhone}`;
    const blockData = await redis.get(blockKey);
    const isAIBlocked = !!blockData;

    // Save message to Firestore
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
        lastMessage: message || '[Mídia]',
        lastMessageFrom: 'client',
        status: 'active',
        unreadCount: 0,
        source: 'whatsapp',
        tenantId
      } as any);
    }

    // Save message
    const savedMessageId = await services.messages.create({
      conversationId,
      tenantId,
      clientPhone: phone,
      message: message || '[Mídia]',
      from: 'client',
      timestamp: new Date(timestamp),
      direction: 'inbound',
      status: 'received',
      source: 'whatsapp',
      externalId: messageId,
      ...(messageReplied && { replyTo: messageReplied }),
      ...(mediaUrl && {
        mediaUrl,
        mediaType: mediaType || 'image',
        hasMedia: true
      })
    } as any);

    // Update conversation
    await services.conversations.update(conversationId, {
      lastMessageAt: new Date(),
      lastMessage: message || '[Mídia]',
      lastMessageFrom: 'client',
      unreadCount: isAIBlocked ? 1 : 0, // Only increment if AI is blocked (manual mode)
      updatedAt: new Date()
    } as any);

    // Publish real-time event via Redis (for frontend subscribers)
    if (isAIBlocked) {
      const realtimePayload = {
        event: 'new_message',
        tenantId,
        conversationId,
        messageId: savedMessageId,
        phone,
        message: message || '[Mídia]',
        hasMedia: !!mediaUrl,
        timestamp: new Date().toISOString()
      };

      await redis.publish(`conversation:${tenantId}:${conversationId}`, JSON.stringify(realtimePayload));

      logger.info('[CLIENT-MESSAGE] Real-time event published', {
        requestId,
        conversationId,
        channel: `conversation:${tenantId}:${conversationId}`
      });
    }

    logger.info('[CLIENT-MESSAGE] Message saved successfully', {
      requestId,
      tenantId: tenantId.substring(0, 8) + '***',
      phone: phone.substring(0, 5) + '***',
      conversationId,
      messageId: savedMessageId,
      isAIBlocked
    });

    return NextResponse.json({
      success: true,
      data: {
        conversationId,
        messageId: savedMessageId,
        isAIBlocked,
        savedAt: new Date().toISOString()
      },
      meta: {
        requestId,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('[CLIENT-MESSAGE] Failed to process webhook', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown'
    });

    return NextResponse.json({
      success: false,
      error: 'Failed to process message',
      requestId
    }, { status: 500 });
  }
}

/**
 * GET /api/webhook/client-message
 * Health check
 */
export async function GET() {
  return NextResponse.json({
    endpoint: 'client-message',
    version: '1.0.0',
    description: 'Receives incoming WhatsApp messages in real-time',
    status: 'operational',
    features: [
      'Saves messages to Firestore',
      'Updates conversation metadata',
      'Publishes real-time events via Redis',
      'Increments unread count if AI is blocked'
    ],
    timestamp: new Date().toISOString()
  });
}
