import { NextRequest, NextResponse } from 'next/server';
import { PostConversationSchema } from '@/lib/validation/conversation-schemas';
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
    sofiaMessageTimestamp
  } = validationResult.data;

  // Sanitizar mensagens
  const sanitizedClientMessage = sanitizeUserInput(clientMessage);
  const sanitizedSofiaMessage = sofiaMessage ? sanitizeUserInput(sofiaMessage) : null;

  // Parse timestamps com validação
  let clientMsgTime: Date;
  let sofiaMsgTime: Date | null = null;

  try {
    clientMsgTime = clientMessageTimestamp ? new Date(clientMessageTimestamp) : new Date();

    if (isNaN(clientMsgTime.getTime())) {
      clientMsgTime = new Date();
    }

    if (sofiaMessageTimestamp) {
      sofiaMsgTime = new Date(sofiaMessageTimestamp);
      if (isNaN(sofiaMsgTime.getTime())) {
        sofiaMsgTime = sanitizedSofiaMessage ? new Date() : null;
      }
    } else if (sanitizedSofiaMessage) {
      sofiaMsgTime = new Date();
    }
  } catch {
    clientMsgTime = new Date();
    sofiaMsgTime = sanitizedSofiaMessage ? new Date() : null;
  }

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

    const newConversation: Omit<ConversationHeader, 'id'> = {
      tenantId,
      clientPhone,
      clientName,
      clientId,
      startedAt: clientMsgTime,
      lastMessageAt: clientMsgTime,
      lastMessage: sanitizedClientMessage.substring(0, 200),
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

  // Salvar mensagem
  const newMessage: Omit<ConversationMessage, 'id'> = {
    conversationId: conversationId!,
    tenantId,
    clientMessage: sanitizedClientMessage,
    clientMessageTimestamp: clientMsgTime,
    sofiaMessage: sanitizedSofiaMessage,
    sofiaMessageTimestamp: sofiaMsgTime,
    createdAt: new Date(),
  };

  const messageId = await messagesService.create(newMessage);

  // Atualizar conversation header
  const lastMessageContent = sanitizedSofiaMessage || sanitizedClientMessage;
  const updateData: Partial<ConversationHeader> = {
    lastMessageAt: sofiaMsgTime || clientMsgTime,
    lastMessage: lastMessageContent.substring(0, 200), // Truncate for display
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
      console.error('Full error stack:', errorStack);
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
