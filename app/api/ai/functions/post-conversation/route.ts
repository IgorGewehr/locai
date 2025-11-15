import { NextRequest, NextResponse } from 'next/server';
import { PostConversationSchema } from '@/lib/validation/conversation-schemas';
import { TenantServiceFactory } from '@/lib/firebase/firestore-v2';
import { sanitizeUserInput } from '@/lib/utils/validation';
import { logger } from '@/lib/utils/logger';
import type {
  ConversationHeader,
  ConversationMessage,
  PostConversationResponse,
  ConversationStatus
} from '@/lib/types/conversation-optimized';

/**
 * POST /api/ai/functions/post-conversation
 *
 * Salva uma interação de conversa entre cliente e Sofia
 *
 * @param request - Body: { tenantId, clientMessage, sofiaMessage, clientPhone?, context? }
 * @returns { success, conversationId, messageId, isNewConversation }
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestId = `post_conv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  try {
    let body = await request.json();

    // N8N envia array com 1 elemento, extrair objeto
    if (Array.isArray(body) && body.length > 0) {
      logger.info('📦 [POST-CONVERSATION] Array detectado, extraindo primeiro elemento', {
        requestId,
        arrayLength: body.length
      });
      body = body[0];
    }

    logger.info('💬 [POST-CONVERSATION] Nova mensagem recebida', {
      requestId,
      tenantId: body.tenantId?.substring(0, 8) + '***',
      hasClientPhone: !!body.clientPhone,
      hasContext: !!body.context,
      hasSofiaMessage: !!body.sofiaMessage,
      messageLength: {
        client: body.clientMessage?.length || 0,
        sofia: body.sofiaMessage?.length || 0,
      }
    });

    // Validação com Zod
    const validationResult = PostConversationSchema.safeParse(body);
    if (!validationResult.success) {
      logger.warn('⚠️ [POST-CONVERSATION] Validação falhou', {
        requestId,
        errors: validationResult.error.flatten()
      });

      return NextResponse.json(
        {
          success: false,
          error: 'Dados inválidos',
          code: 'VALIDATION_ERROR',
          details: validationResult.error.flatten(),
          requestId
        },
        { status: 400 }
      );
    }

    const {
      tenantId,
      clientMessage,
      sofiaMessage,
      clientPhone,
      clientName,
      context,
      conversationId: providedConversationId
    } = validationResult.data;

    // Sanitizar mensagens
    const sanitizedClientMessage = sanitizeUserInput(clientMessage);
    // sofiaMessage pode ser null quando apenas salvando mensagem do cliente (sem resposta ainda)
    const sanitizedSofiaMessage = sofiaMessage ? sanitizeUserInput(sofiaMessage) : null;
    const sanitizedClientName = clientName ? sanitizeUserInput(clientName) : undefined;

    if (!sanitizedSofiaMessage) {
      logger.info('ℹ️ [POST-CONVERSATION] Salvando apenas mensagem do cliente (sofiaMessage=null)', {
        requestId
      });
    }

    // Inicializar serviços
    logger.info('🔧 [POST-CONVERSATION] Inicializando serviços', { requestId, tenantId: tenantId.substring(0, 8) + '***' });
    const services = new TenantServiceFactory(tenantId);
    const conversationsService = services.createService<ConversationHeader>('conversations');
    const messagesService = services.createService<ConversationMessage>('messages');
    logger.info('✅ [POST-CONVERSATION] Serviços inicializados', { requestId });

    // 1. Identificar ou criar Conversation
    let conversationId = providedConversationId;
    let isNewConversation = false;
    let conversation: ConversationHeader | null = null;

    if (conversationId) {
      // Conversation já existe, buscar
      conversation = await conversationsService.get(conversationId);

      if (!conversation) {
        logger.warn('⚠️ [POST-CONVERSATION] ConversationId fornecido não encontrado', {
          requestId,
          conversationId
        });
        // Criar nova ao invés de falhar
        conversationId = undefined;
      }
    }

    if (!conversationId) {
      // Tentar encontrar conversa ativa por telefone
      if (clientPhone) {
        logger.info('🔍 [POST-CONVERSATION] Buscando conversa ativa', {
          requestId,
          clientPhone: clientPhone.substring(0, 8) + '***'
        });

        const activeConversations = await conversationsService.getMany([
          { field: 'clientPhone', operator: '==', value: clientPhone },
          { field: 'status', operator: '==', value: 'active' as ConversationStatus }
        ], { orderBy: [{ field: 'lastMessageAt', direction: 'desc' }], limit: 1 });

        if (activeConversations.length > 0) {
          conversation = activeConversations[0];
          conversationId = conversation.id!;

          logger.info('✅ [POST-CONVERSATION] Conversa ativa encontrada', {
            requestId,
            conversationId,
            clientPhone: clientPhone?.substring(0, 8) + '***'
          });
        }
      }

      // Se ainda não encontrou, criar nova
      if (!conversationId) {
        isNewConversation = true;

        const newConversation: Omit<ConversationHeader, 'id'> = {
          tenantId,
          clientPhone: clientPhone || 'unknown',
          clientName: sanitizedClientName,
          startedAt: new Date(),
          lastMessageAt: new Date(),
          messageCount: 0,
          status: 'active' as ConversationStatus,
          tags: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        conversationId = await conversationsService.create(newConversation);

        logger.info('🆕 [POST-CONVERSATION] Nova conversa criada', {
          requestId,
          conversationId,
          clientPhone: clientPhone?.substring(0, 8) + '***'
        });
      }
    }

    // 2. Salvar mensagem
    const newMessage: Omit<ConversationMessage, 'id'> = {
      conversationId: conversationId!,
      tenantId,
      clientMessage: sanitizedClientMessage,
      sofiaMessage: sanitizedSofiaMessage,
      timestamp: new Date(),
      context,
      createdAt: new Date(),
    };

    const messageId = await messagesService.create(newMessage);

    logger.info('💾 [POST-CONVERSATION] Mensagem salva', {
      requestId,
      conversationId,
      messageId
    });

    // 3. Atualizar conversation header
    const updateData: Partial<ConversationHeader> = {
      lastMessageAt: new Date(),
      messageCount: (conversation?.messageCount || 0) + 1,
      updatedAt: new Date(),
    };

    // Atualizar nome se fornecido e ainda não existir
    if (sanitizedClientName && !conversation?.clientName) {
      updateData.clientName = sanitizedClientName;
    }

    await conversationsService.update(conversationId!, updateData);

    const processingTime = Date.now() - startTime;

    logger.info('✅ [POST-CONVERSATION] Processamento concluído', {
      requestId,
      conversationId,
      messageId,
      isNewConversation,
      processingTime: `${processingTime}ms`
    });

    const response: PostConversationResponse = {
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

    return NextResponse.json(response);

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
