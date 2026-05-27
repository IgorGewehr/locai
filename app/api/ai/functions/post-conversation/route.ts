import { NextRequest, NextResponse } from 'next/server';
import { PostConversationSchema, PostConversationBatchSchema } from '@/lib/validation/conversation-schemas';
import { TenantServiceFactory } from '@/lib/firebase/firestore-v2';
import { sanitizeUserInput } from '@/lib/utils/validation';
import { logger } from '@/lib/utils/logger';
import type {
  ConversationHeader,
  ConversationMessage,
  PostConversationResponse,
  ConversationHeaderStatus
} from '@/lib/types/conversation';

/**
 * Regex patterns for URL and image detection
 */
const URL_REGEX = /(https?:\/\/[^\s<>"{}|\\^`[\]]+)/gi;
const IMAGE_EXTENSIONS = /\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?.*)?$/i;

/**
 * Extract image URLs from text content
 */
function extractImageUrls(text: string | null | undefined): string[] {
  if (!text) return [];
  const matches = text.match(URL_REGEX);
  if (!matches) return [];
  return matches.filter(url => IMAGE_EXTENSIONS.test(url));
}

/**
 * Processa uma única mensagem de conversa
 */
async function processSingleMessage(
  body: unknown,
  requestId: string
): Promise<PostConversationResponse & { success: boolean; error?: string }> {
  const startTime = Date.now();

  // Validação com Zod
  const validationResult = PostConversationSchema.safeParse(body);
  if (!validationResult.success) {
    logger.warn('⚠️ [POST-CONVERSATION] Validação falhou', {
      requestId,
      errors: validationResult.error.flatten()
    });

    return {
      success: false,
      error: 'Dados inválidos',
      conversationId: '',
      messageId: '',
      isNewConversation: false,
      meta: {
        requestId,
        processingTime: Date.now() - startTime,
        timestamp: new Date().toISOString()
      }
    };
  }

  const {
    tenantId,
    clientPhone,
    clientMessage,
    clientMessageTimestamp,
    sofiaMessage,
    sofiaMessageTimestamp,
    clientMediaUrls: explicitClientMediaUrls,
    sofiaMediaUrls: explicitSofiaMediaUrls
  } = validationResult.data;

  // Sanitizar mensagens (ambas podem ser nulas)
  const sanitizedClientMessage = clientMessage ? sanitizeUserInput(clientMessage) : null;
  const sanitizedSofiaMessage = sofiaMessage ? sanitizeUserInput(sofiaMessage) : null;

  // Parse timestamps com validação
  let clientMsgTime: Date | null = null;
  let sofiaMsgTime: Date | null = null;

  try {
    // Client message timestamp (só se houver mensagem do cliente)
    if (sanitizedClientMessage) {
      clientMsgTime = clientMessageTimestamp ? new Date(clientMessageTimestamp) : new Date();
      if (isNaN(clientMsgTime.getTime())) {
        clientMsgTime = new Date();
      }
    }

    // Sofia message timestamp
    if (sofiaMessageTimestamp) {
      sofiaMsgTime = new Date(sofiaMessageTimestamp);
      if (isNaN(sofiaMsgTime.getTime())) {
        sofiaMsgTime = sanitizedSofiaMessage ? new Date() : null;
      }
    } else if (sanitizedSofiaMessage) {
      sofiaMsgTime = new Date();
    }
  } catch {
    clientMsgTime = sanitizedClientMessage ? new Date() : null;
    sofiaMsgTime = sanitizedSofiaMessage ? new Date() : null;
  }

  // Determinar o timestamp principal da mensagem (para ordenação)
  const primaryTimestamp = clientMsgTime || sofiaMsgTime || new Date();

  // Inicializar serviços
  const services = new TenantServiceFactory(tenantId);
  const conversationsService = services.createService<ConversationHeader>('conversations');
  const messagesService = services.createService<ConversationMessage>('messages');

  // Buscar cliente por telefone
  let clientName: string | undefined = undefined;
  let clientId: string | undefined = undefined;

  if (clientPhone) {
    try {
      const clientsService = services.createService<{ id?: string; name?: string; phone?: string }>('clients');
      const clients = await clientsService.getMany([
        { field: 'phone', operator: '==', value: clientPhone }
      ], { limit: 1 });

      if (clients.length > 0) {
        const client = clients[0];
        clientName = client.name;
        clientId = client.id;
      }
    } catch {
      // Continua sem nome do cliente
    }
  }

  // Identificar ou criar Conversation
  let conversationId: string | undefined = undefined;
  let isNewConversation = false;
  let conversation: ConversationHeader | null = null;

  if (clientPhone) {
    const existingConversations = await conversationsService.getMany([
      { field: 'clientPhone', operator: '==', value: clientPhone }
    ], { orderBy: 'lastMessageAt', orderDirection: 'desc', limit: 1 });

    if (existingConversations.length > 0) {
      conversation = existingConversations[0];
      conversationId = conversation.id!;

      if (conversation.status !== 'active') {
        await conversationsService.update(conversationId, {
          status: 'active' as ConversationHeaderStatus,
          updatedAt: new Date()
        });
      }
    }
  }

  if (!conversationId) {
    isNewConversation = true;

    // Determinar a última mensagem para exibição
    const lastMessageContent = sanitizedSofiaMessage || sanitizedClientMessage || '';

    const newConversation: Omit<ConversationHeader, 'id'> = {
      tenantId,
      clientPhone,
      clientName,
      clientId,
      startedAt: primaryTimestamp,
      lastMessageAt: primaryTimestamp,
      lastMessage: lastMessageContent.substring(0, 200),
      messageCount: 0,
      unreadCount: 1,
      isRead: false,
      status: 'active' as ConversationHeaderStatus,
      tags: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    conversationId = await conversationsService.create(newConversation);
  } else if (clientName && conversation?.clientName !== clientName) {
    await conversationsService.update(conversationId, {
      clientName,
      clientId,
      updatedAt: new Date()
    });
  }

  // Extract image URLs from message content
  const extractedClientImages = extractImageUrls(sanitizedClientMessage);
  const extractedSofiaImages = extractImageUrls(sanitizedSofiaMessage);

  // Combine explicit mediaUrls with extracted URLs (deduplicated)
  const clientMediaUrls = [...new Set([
    ...(explicitClientMediaUrls || []),
    ...extractedClientImages
  ])];
  const sofiaMediaUrls = [...new Set([
    ...(explicitSofiaMediaUrls || []),
    ...extractedSofiaImages
  ])];

  // Salvar mensagem
  const newMessage: Omit<ConversationMessage, 'id'> = {
    conversationId: conversationId!,
    tenantId,
    clientMessage: sanitizedClientMessage,
    clientMessageTimestamp: clientMsgTime,
    sofiaMessage: sanitizedSofiaMessage,
    sofiaMessageTimestamp: sofiaMsgTime,
    ...(clientMediaUrls.length > 0 && { clientMediaUrls }),
    ...(sofiaMediaUrls.length > 0 && { sofiaMediaUrls }),
    createdAt: new Date(),
  };

  const messageId = await messagesService.create(newMessage);

  // Atualizar conversation header
  const lastMessageForHeader = sanitizedSofiaMessage || sanitizedClientMessage || '';
  const updateData: Partial<ConversationHeader> = {
    lastMessageAt: sofiaMsgTime || clientMsgTime || new Date(),
    lastMessage: lastMessageForHeader.substring(0, 200), // Truncate for display
    messageCount: (conversation?.messageCount || 0) + 1,
    updatedAt: new Date(),
    isRead: false, // Mark as unread when new message arrives
    unreadCount: (conversation?.unreadCount || 0) + 1,
  };

  await conversationsService.update(conversationId!, updateData);

  const processingTime = Date.now() - startTime;

  logger.info('✅ [POST-CONVERSATION] Mensagem processada', {
    requestId,
    conversationId,
    messageId,
    isNewConversation,
    processingTime: `${processingTime}ms`
  });

  return {
    success: true,
    conversationId: conversationId!,
    messageId,
    isNewConversation,
    meta: {
      requestId,
      processingTime,
      timestamp: new Date().toISOString()
    }
  };
}

/**
 * POST /api/ai/functions/post-conversation
 *
 * Salva interações de conversa entre cliente e Sofia
 * Suporta objeto único ou array de mensagens (batch)
 *
 * @param request - Body: objeto ou array de { tenantId, clientMessage, sofiaMessage, clientPhone?, ... }
 * @returns { success, conversationId, messageId, isNewConversation } ou { success, results: [...] } para batch
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestId = `post_conv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  try {
    const body = await request.json();

    // Suporte a batch: array com múltiplos elementos
    if (Array.isArray(body)) {
      logger.info('📦 [POST-CONVERSATION] Batch detectado', {
        requestId,
        arrayLength: body.length
      });

      // Processar cada mensagem
      const results = [];
      for (let i = 0; i < body.length; i++) {
        const itemRequestId = `${requestId}_item${i}`;
        try {
          const result = await processSingleMessage(body[i], itemRequestId);
          results.push(result);
        } catch (error) {
          results.push({
            success: false,
            error: error instanceof Error ? error.message : 'Erro ao processar mensagem',
            index: i
          });
        }
      }

      const processingTime = Date.now() - startTime;
      const successCount = results.filter(r => r.success).length;
      const failCount = results.length - successCount;

      logger.info('✅ [POST-CONVERSATION] Batch concluído', {
        requestId,
        total: body.length,
        successCount,
        failCount,
        processingTime: `${processingTime}ms`
      });

      return NextResponse.json({
        success: failCount === 0,
        batch: true,
        total: body.length,
        successCount,
        failCount,
        results,
        meta: {
          requestId,
          processingTime,
          timestamp: new Date().toISOString()
        }
      });
    }

    // Objeto único - processar diretamente
    logger.info('💬 [POST-CONVERSATION] Objeto único recebido', {
      requestId,
      tenantId: body.tenantId?.substring(0, 8) + '***',
      hasClientPhone: !!body.clientPhone
    });

    const result = await processSingleMessage(body, requestId);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Dados inválidos',
          code: 'VALIDATION_ERROR',
          requestId
        },
        { status: 400 }
      );
    }

    return NextResponse.json(result);

  } catch (error) {
    const processingTime = Date.now() - startTime;

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;

    logger.error('❌ [POST-CONVERSATION] Erro ao processar conversa', {
      requestId,
      error: errorMessage,
      errorType: error?.constructor?.name,
      stack: errorStack?.substring(0, 500),
      processingTime: `${processingTime}ms`
    });

    // Log completo do stack em desenvolvimento
    if (process.env.NODE_ENV === 'development' && errorStack) {
      logger.error('Full error stack', { error: errorStack || 'No stack trace available' });
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Erro ao salvar conversa',
        requestId,
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
        errorType: process.env.NODE_ENV === 'development' ? error?.constructor?.name : undefined
      },
      { status: 500 }
    );
  }
}
