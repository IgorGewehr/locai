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

      // Validar se é uma data válida
      if (isNaN(clientMsgTime.getTime())) {
        logger.warn('⚠️ [POST-CONVERSATION] clientMessageTimestamp inválido, usando data atual', {
          requestId,
          timestamp: clientMessageTimestamp
        });
        clientMsgTime = new Date();
      }

      if (sofiaMessageTimestamp) {
        sofiaMsgTime = new Date(sofiaMessageTimestamp);
        if (isNaN(sofiaMsgTime.getTime())) {
          logger.warn('⚠️ [POST-CONVERSATION] sofiaMessageTimestamp inválido, usando data atual', {
            requestId,
            timestamp: sofiaMessageTimestamp
          });
          sofiaMsgTime = sanitizedSofiaMessage ? new Date() : null;
        }
      } else if (sanitizedSofiaMessage) {
        sofiaMsgTime = new Date();
      }
    } catch (error) {
      logger.error('❌ [POST-CONVERSATION] Erro ao processar timestamps', {
        requestId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      clientMsgTime = new Date();
      sofiaMsgTime = sanitizedSofiaMessage ? new Date() : null;
    }

    if (!sanitizedSofiaMessage) {
      logger.info('ℹ️ [POST-CONVERSATION] Salvando apenas mensagem do cliente (sofiaMessage=null)', {
        requestId
      });
    }

    // Inicializar serviços
    logger.info('🔧 [POST-CONVERSATION] Inicializando serviços', {
      requestId,
      tenantId: tenantId.substring(0, 8) + '***',
      clientPhone: clientPhone.substring(0, 8) + '***',
      hasClientMessage: !!sanitizedClientMessage,
      hasSofiaMessage: !!sanitizedSofiaMessage,
      clientMsgTime: clientMsgTime.toISOString(),
      sofiaMsgTime: sofiaMsgTime?.toISOString() || 'null'
    });

    const services = new TenantServiceFactory(tenantId);
    const conversationsService = services.createService<ConversationHeader>('conversations');
    const messagesService = services.createService<ConversationMessage>('messages');
    logger.info('✅ [POST-CONVERSATION] Serviços inicializados', { requestId });

    // 1. Buscar cliente por telefone para obter o nome
    let clientName: string | undefined = undefined;
    let clientId: string | undefined = undefined;

    if (clientPhone) {
      try {
        logger.info('👤 [POST-CONVERSATION] Buscando cliente por telefone', {
          requestId,
          clientPhone: clientPhone.substring(0, 8) + '***'
        });

        const clientsService = services.createService('clients');
        const clients = await clientsService.getMany([
          { field: 'phone', operator: '==', value: clientPhone }
        ], { limit: 1 });

        if (clients.length > 0) {
          const client = clients[0];
          clientName = client.name;
          clientId = client.id;

          logger.info('✅ [POST-CONVERSATION] Cliente encontrado', {
            requestId,
            clientId,
            clientName: clientName?.substring(0, 20) + '***'
          });
        } else {
          logger.info('ℹ️ [POST-CONVERSATION] Cliente não encontrado, usando apenas telefone', {
            requestId
          });
        }
      } catch (error) {
        logger.warn('⚠️ [POST-CONVERSATION] Erro ao buscar cliente, continuando sem nome', {
          requestId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // 2. Identificar ou criar Conversation
    let conversationId: string | undefined = undefined;
    let isNewConversation = false;
    let conversation: ConversationHeader | null = null;

    // Tentar encontrar QUALQUER conversa por telefone (não só active)
    // IMPORTANTE: Todas as conversas do mesmo número devem ser agrupadas
    if (clientPhone) {
      logger.info('🔍 [POST-CONVERSATION] Buscando conversa existente', {
        requestId,
        clientPhone: clientPhone.substring(0, 8) + '***'
      });

      const existingConversations = await conversationsService.getMany([
        { field: 'clientPhone', operator: '==', value: clientPhone }
      ], { orderBy: 'lastMessageAt', orderDirection: 'desc', limit: 1 });

      if (existingConversations.length > 0) {
        conversation = existingConversations[0];
        conversationId = conversation.id!;

        logger.info('✅ [POST-CONVERSATION] Conversa existente encontrada', {
          requestId,
          conversationId,
          conversationStatus: conversation.status,
          lastMessageAt: conversation.lastMessageAt,
          clientPhone: clientPhone?.substring(0, 8) + '***'
        });

        // Se a conversa estava completed/abandoned, reativar
        if (conversation.status !== 'active') {
          logger.info('🔄 [POST-CONVERSATION] Reativando conversa', {
            requestId,
            conversationId,
            oldStatus: conversation.status,
            newStatus: 'active'
          });
          await conversationsService.update(conversationId, {
            status: 'active' as ConversationStatus,
            updatedAt: new Date()
          });
        }
      }
    }

    // Se ainda não encontrou, criar nova
    if (!conversationId) {
      isNewConversation = true;

      const newConversation: Omit<ConversationHeader, 'id'> = {
        tenantId,
        clientPhone,
        clientName, // Nome do cliente (se encontrado)
        clientId,   // ID do cliente (se encontrado)
        startedAt: clientMsgTime,
        lastMessageAt: clientMsgTime,
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
        clientPhone: clientPhone?.substring(0, 8) + '***',
        clientName: clientName?.substring(0, 20) + '***' || 'N/A',
        hasClientId: !!clientId
      });
    } else if (clientName && conversation?.clientName !== clientName) {
      // Se encontrou conversa existente mas o nome do cliente mudou, atualizar
      logger.info('🔄 [POST-CONVERSATION] Atualizando nome do cliente na conversa', {
        requestId,
        conversationId,
        oldName: conversation?.clientName?.substring(0, 20) + '***' || 'N/A',
        newName: clientName?.substring(0, 20) + '***'
      });

      await conversationsService.update(conversationId, {
        clientName,
        clientId,
        updatedAt: new Date()
      });
    }

    // 2. Salvar mensagem
    logger.info('💬 [POST-CONVERSATION] Criando mensagem', {
      requestId,
      conversationId,
      messageData: {
        clientMessageLength: sanitizedClientMessage.length,
        sofiaMessageLength: sanitizedSofiaMessage?.length || 0,
        clientMsgTime: clientMsgTime.toISOString(),
        sofiaMsgTime: sofiaMsgTime?.toISOString() || 'null'
      }
    });

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

    logger.info('💾 [POST-CONVERSATION] Mensagem salva com sucesso', {
      requestId,
      conversationId,
      messageId,
      messageSaved: {
        conversationId: newMessage.conversationId,
        hasClientMessage: !!newMessage.clientMessage,
        hasSofiaMessage: !!newMessage.sofiaMessage,
        clientMessageLength: newMessage.clientMessage?.length || 0,
        sofiaMessageLength: newMessage.sofiaMessage?.length || 0,
        clientMessagePreview: newMessage.clientMessage?.substring(0, 50),
        sofiaMessagePreview: newMessage.sofiaMessage?.substring(0, 50)
      }
    });

    // VERIFICAÇÃO: Tentar buscar a mensagem recém-criada
    const verifyMessage = await messagesService.get(messageId);
    logger.info('🔍 [POST-CONVERSATION] Verificação da mensagem salva', {
      requestId,
      messageId,
      messageExists: !!verifyMessage,
      hasClientMessage: !!verifyMessage?.clientMessage,
      hasSofiaMessage: !!verifyMessage?.sofiaMessage,
      clientMessagePreview: verifyMessage?.clientMessage?.substring(0, 50),
      sofiaMessagePreview: verifyMessage?.sofiaMessage?.substring(0, 50)
    });

    // 3. Atualizar conversation header
    const updateData: Partial<ConversationHeader> = {
      lastMessageAt: sofiaMsgTime || clientMsgTime, // Usa timestamp da última mensagem
      messageCount: (conversation?.messageCount || 0) + 1,
      updatedAt: new Date(),
    };

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
