import { NextRequest, NextResponse } from 'next/server';
// Using Sofia Agent V4 - Step 2 Complete with High Performance Optimizations
import { 
  clientQueries 
} from '@/lib/firebase/firestore';
import { clientServiceWrapper } from '@/lib/services/client-service';
import { TenantServiceFactory } from '@/lib/firebase/firestore-v2';
import '@/lib/firebase/tenant-queries'; // Extends services with tenant methods
import type { AgentContext, Message, AIResponse } from '@/lib/types';
import { handleApiError } from '@/lib/utils/api-errors';
import { 
  validatePhoneNumber, 
  validateMessageContent,
  sanitizeUserInput,
  validateTenantId
} from '@/lib/utils/validation';
import { getRateLimitService, RATE_LIMITS } from '@/lib/services/rate-limit-service';
import { createRequestLogContext } from '@/lib/services/request-logger';
import { validateAuth, requireTenant } from '@/lib/middleware/auth';
import { 
  sanitizeAIResponse, 
  sanitizeFunctionResults, 
  sanitizeClientData 
} from '@/lib/utils/sanitizer';

export async function POST(request: NextRequest) {
  // Start request logging
  const logContext = createRequestLogContext(Date.now());

  try {
    // Authentication (optional for WhatsApp webhooks)
    const authContext = await validateAuth(request);

    // Parse and validate request body
    let body;
    try {
      body = await request.json();
    } catch (error) {
      await logContext.log({
        endpoint: '/api/agent',
        method: 'POST',
        statusCode: 400,
        error: 'Invalid JSON',
        errorCode: 'INVALID_JSON'
      });
      return handleApiError(new Error('Invalid request body'));
    }

    const { message, clientPhone, phone, whatsappNumber, tenantId: requestTenantId, isTest } = body;

    // Validate required fields
    let validatedPhone, validatedMessage, validatedTenantId;
    try {
      validatedMessage = validateMessageContent(message);
      // Use either clientPhone or phone parameter
      validatedPhone = validatePhoneNumber(clientPhone || phone);

      // Get tenant ID from auth context or request
      const tenantId = authContext.tenantId || requestTenantId || process.env.TENANT_ID || 'default';
      validatedTenantId = validateTenantId(tenantId);
    } catch (error) {
      await logContext.log({
        endpoint: '/api/agent',
        method: 'POST',
        statusCode: 400,
        error: error instanceof Error ? error.message : 'Validation error',
        errorCode: 'VALIDATION_ERROR',
        phoneNumber: clientPhone
      });
      return handleApiError(error);
    }

    // Rate limiting per phone number (skip for test mode)
    if (!isTest) {
      const rateLimitService = getRateLimitService();
      const rateLimitKey = `${validatedTenantId}:${validatedPhone}`;
      const rateLimitResult = await rateLimitService.checkRateLimit(
        rateLimitKey,
        RATE_LIMITS.whatsapp
      );

      if (!rateLimitResult.allowed) {
        await logContext.log({
          endpoint: '/api/agent',
          method: 'POST',
          statusCode: 429,
          error: 'Rate limit exceeded',
          errorCode: 'RATE_LIMIT_EXCEEDED',
          phoneNumber: validatedPhone,
          tenantId: validatedTenantId
        });

        return NextResponse.json(
          { 
            success: false, 
            error: 'Muitas mensagens enviadas. Por favor, aguarde um momento.',
            retryAfter: Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000)
          },
          { 
            status: 429,
            headers: {
              'X-RateLimit-Limit': RATE_LIMITS.whatsapp.maxRequests.toString(),
              'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
              'X-RateLimit-Reset': new Date(rateLimitResult.resetAt).toISOString()
            }
          }
        );
      }
    }

    // Get or create client with tenant isolation - using safe duplicate-check method
    let client = await clientQueries.getClientByPhoneAndTenant(validatedPhone, validatedTenantId);
    if (!client) {
      try {
        client = await clientServiceWrapper.createOrUpdate({
          name: 'Cliente WhatsApp',
          phone: validatedPhone,
          tenantId: validatedTenantId
        });
      } catch (error) {
        // If createOrUpdate fails, try to find the client again (might have been created by another request)
        client = await clientQueries.getClientByPhoneAndTenant(validatedPhone, validatedTenantId);
        if (!client) {
          throw error; // Re-throw if still not found
        }
      }
    }

    if (!client) {
      await logContext.log({
        endpoint: '/api/agent',
        method: 'POST',
        statusCode: 500,
        error: 'Failed to create/find client',
        errorCode: 'CLIENT_ERROR',
        phoneNumber: validatedPhone,
        tenantId: validatedTenantId
      });

      return handleApiError(new Error('Erro ao processar sua mensagem. Por favor, tente novamente.'));
    }

    // Get or create conversation with tenant isolation
    const sanitizedWhatsappNumber = whatsappNumber ? validatePhoneNumber(whatsappNumber) : validatedPhone;
    const services = new TenantServiceFactory(validatedTenantId);
    
    // Try to find existing active conversation first
    let conversation = null;
    const existingConversations = await services.conversations.getWhere('clientId', '==', client.id);
    const activeConversation = existingConversations.find((c: any) => 
      // @ts-ignore - suppress type checking for conversation properties
      c.isActive && 
      // @ts-ignore - suppress type checking for conversation properties
      c.tenantId === validatedTenantId &&
      // @ts-ignore - suppress type checking for conversation properties
      c.whatsappPhone === sanitizedWhatsappNumber
    );
    
    if (activeConversation) {
      conversation = activeConversation;
      // Update last message timestamp
      // @ts-ignore - suppress type checking for conversation id and properties
      await services.conversations.update(conversation.id!, {
        // @ts-ignore - suppress type checking for lastMessageAt property
        lastMessageAt: new Date(),
        updatedAt: new Date()
      });
    } else {
      // Create new conversation if none exists
      const conversationId = await services.conversations.create({
        clientId: client.id,
        whatsappPhone: sanitizedWhatsappNumber,
        whatsappNumber: sanitizedWhatsappNumber,
        tenantId: validatedTenantId,
        messages: [],
        isActive: true,
        lastMessageAt: new Date(),
        source: 'whatsapp',
        context: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      
      conversation = await services.conversations.getById(conversationId);
    }

    if (!conversation) {
      await logContext.log({
        endpoint: '/api/agent',
        method: 'POST',
        statusCode: 500,
        error: 'Failed to create/find conversation',
        errorCode: 'CONVERSATION_ERROR',
        phoneNumber: validatedPhone,
        clientId: client.id,
        tenantId: validatedTenantId
      });

      return handleApiError(new Error('Erro ao processar sua mensagem. Por favor, tente novamente.'));
    }

    // Save incoming message with sanitization
    await services.messages.create({
      conversationId: conversation.id,
      from: 'client',
      content: validatedMessage,
      messageType: 'text',
      timestamp: new Date(),
      isRead: true,
      tenantId: validatedTenantId
    });

    // Get conversation history (simplified for now)
    // @ts-ignore - suppress type checking for conversation messages
    const conversationHistory = conversation.messages || [];
    const recentHistory = conversationHistory
      .slice(-10) // Last 10 messages
      .map((msg: any) => ({
        role: msg.from === 'client' ? 'user' as const : 'assistant' as const,
        content: msg.content,
      }));

    // Build agent context
    const context = {
      clientId: client.id,
      // @ts-ignore - suppress type checking for conversation id
      conversationId: conversation.id!,
      // @ts-ignore - suppress type checking for conversation context
      currentSearchFilters: conversation.context?.currentSearchFilters || {},
      // @ts-ignore - suppress type checking for conversation context
      interestedProperties: conversation.context?.interestedProperties || [],
      // @ts-ignore - suppress type checking for conversation context
      pendingReservation: conversation.context?.pendingReservation || undefined,
      clientPreferences: client.preferences || {},
    };

    // Process message with Sofia Agent MVP (Production Ready)
    const { sofiaAgent } = await import('@/lib/ai-agent/sofia-agent');
    
    try {
      // Use Sofia agent MVP production version
      const result = await sofiaAgent.processMessage({
        message: validatedMessage,
        clientPhone: validatedPhone,
        tenantId: validatedTenantId,
        metadata: {
          source: isTest ? 'web' : 'whatsapp',
          priority: 'normal'
        }
      });
      
      // Send WhatsApp response (integrada no Professional Agent)
      try {
        const { sendWhatsAppMessage } = await import('@/lib/whatsapp/message-sender');
        await sendWhatsAppMessage(validatedPhone, result.reply);
      } catch (error) {
        // Error handled by messaging service
      }
      
      // Log detailed execution info (simplified)
      await logContext.log({
        endpoint: '/api/agent',
        method: 'POST',
        statusCode: 200,
        phoneNumber: validatedPhone,
        clientId: client.id,
        // @ts-ignore - suppress type checking for conversation id
        conversationId: conversation.id!,
        tenantId: validatedTenantId,
        userAgent: request.headers.get('user-agent') || 'unknown',
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
      });

      return NextResponse.json({
        success: true,
        message: result.reply,
        data: {
          response: result.reply,
          // @ts-ignore - suppress type checking for conversation id
          conversationId: conversation.id!,
          clientId: client.id,
          tokensUsed: result.tokensUsed,
          originalTokens: result.originalTokens,
          responseTime: result.responseTime,
          compressionRatio: result.compressionRatio,
          functionsExecuted: result.functionsExecuted,
          actions: result.actions?.length || 0,
          performanceScore: result.performanceScore,
          cacheHitRate: result.cacheHitRate,
          intent: result.metadata.stage,
          confidence: result.metadata.leadScore / 100,
          fromCache: result.cacheHitRate === 100
        }
      });
    } catch (error) {
      await logContext.log({
        endpoint: '/api/agent',
        method: 'POST',
        statusCode: 500,
        error: error instanceof Error ? error.message : 'AI processing error',
        errorCode: 'AI_ERROR',
        phoneNumber: validatedPhone,
        clientId: client.id,
        // @ts-ignore - suppress type checking for conversation id
        conversationId: conversation.id!,
        tenantId: validatedTenantId
      });

      // Send error message via WhatsApp
      try {
        const { sendWhatsAppMessage } = await import('@/lib/whatsapp/message-sender');
        await sendWhatsAppMessage(validatedPhone, 'Desculpe, estou com dificuldades técnicas no momento. Por favor, tente novamente em alguns instantes.');
      } catch (sendError) {
        // Error handled by messaging service
      }

      // Return a friendly error message
      return NextResponse.json({
        success: false,
        message: 'Desculpe, estou com dificuldades técnicas no momento. Por favor, tente novamente em alguns instantes.',
        data: {
          response: 'Desculpe, estou com dificuldades técnicas no momento. Por favor, tente novamente em alguns instantes.',
          // @ts-ignore - suppress type checking for conversation id
          conversationId: conversation.id!,
          clientId: client.id,
        },
      });
    }

  } catch (error) {
    // Log error
    await logContext.log({
      endpoint: '/api/agent',
      method: 'POST',
      statusCode: 500,
      error: error instanceof Error ? error.message : 'Unknown error',
      errorCode: 'INTERNAL_ERROR'
    });

    return handleApiError(error);
  }
}

export async function GET(request: NextRequest) {
  const logContext = createRequestLogContext(Date.now());

  try {
    // Authentication required for GET
    const authContext = await validateAuth(request);
    if (!authContext.authenticated) {
      await logContext.log({
        endpoint: '/api/agent',
        method: 'GET',
        statusCode: 401,
        error: 'Authentication required',
        errorCode: 'UNAUTHORIZED'
      });

      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const tenantId = requireTenant(authContext);

    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversationId');

    if (!conversationId) {
      await logContext.log({
        endpoint: '/api/agent',
        method: 'GET',
        statusCode: 400,
        error: 'Conversation ID required',
        errorCode: 'MISSING_PARAMETER',
        tenantId
      });

      return handleApiError(new Error('ID da conversa é obrigatório'));
    }

    const services = new TenantServiceFactory(tenantId);
    const conversation = await services.conversations.getById(conversationId);

    // @ts-ignore - suppress type checking for conversation tenantId
    if (!conversation || conversation.tenantId !== tenantId) {
      await logContext.log({
        endpoint: '/api/agent',
        method: 'GET',
        statusCode: 404,
        error: 'Conversation not found',
        errorCode: 'NOT_FOUND',
        conversationId,
        tenantId
      });

      return NextResponse.json(
        { success: false, error: 'Conversa não encontrada' },
        { status: 404 }
      );
    }

    // @ts-ignore - suppress type checking for conversation messages
    const messages = conversation.messages || [];

    // Log successful request
    await logContext.log({
      endpoint: '/api/agent',
      method: 'GET',
      statusCode: 200,
      conversationId,
      tenantId,
      userAgent: request.headers.get('user-agent') || 'unknown',
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    });

    return NextResponse.json({
      success: true,
      data: {
        conversation,
        messages,
      },
    });

  } catch (error) {
    await logContext.log({
      endpoint: '/api/agent',
      method: 'GET',
      statusCode: 500,
      error: error instanceof Error ? error.message : 'Unknown error',
      errorCode: 'INTERNAL_ERROR'
    });

    return handleApiError(error);
  }
}