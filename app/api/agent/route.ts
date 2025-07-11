import { NextRequest, NextResponse } from 'next/server';
import { AIService } from '@/lib/services/ai-service';
import * as agentFunctions from '@/lib/ai/agent-functions-exports';
import { 
  conversationService, 
  messageService, 
  clientService,
  clientQueries 
} from '@/lib/firebase/firestore';
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

    const { message, clientPhone, whatsappNumber, tenantId: requestTenantId } = body;

    // Validate required fields
    let validatedPhone, validatedMessage, validatedTenantId;
    try {
      validatedMessage = validateMessageContent(message);
      validatedPhone = validatePhoneNumber(clientPhone);
      
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

    // Rate limiting per phone number
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

    // Get or create client with tenant isolation
    let client = await clientQueries.getClientByPhoneAndTenant(validatedPhone, validatedTenantId);
    if (!client) {
      const sanitizedWhatsappNumber = whatsappNumber ? validatePhoneNumber(whatsappNumber) : validatedPhone;
      
      const clientData = sanitizeClientData({
        name: 'Cliente WhatsApp',
        phone: validatedPhone,
        whatsappNumber: sanitizedWhatsappNumber,
        tenantId: validatedTenantId,
        preferences: {},
        reservations: [],
        totalSpent: 0,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      
      const clientId = await clientService.create(clientData);
      client = await clientService.getById(clientId);
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
    let conversation = await conversationService.getConversationByWhatsAppAndTenant(
      sanitizedWhatsappNumber,
      validatedTenantId
    );
    
    if (!conversation) {
      const conversationId = await conversationService.create({
        clientId: client.id,
        whatsappNumber: sanitizedWhatsappNumber,
        tenantId: validatedTenantId,
        messages: [],
        isActive: true,
        lastMessageAt: new Date(),
        context: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      conversation = await conversationService.getById(conversationId);
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
    await messageService.create({
      conversationId: conversation.id,
      from: 'client',
      content: validatedMessage,
      messageType: 'text',
      timestamp: new Date(),
      isRead: true,
      tenantId: validatedTenantId
    });

    // Get conversation history
    const conversationHistory = await conversationService.getMessagesByConversation(conversation.id);
    const recentHistory = conversationHistory
      .slice(-10) // Last 10 messages
      .map(msg => ({
        role: msg.from === 'client' ? 'user' as const : 'assistant' as const,
        content: msg.content,
      }));

    // Build agent context
    const context: AgentContext = {
      clientId: client.id,
      conversationId: conversation.id,
      currentSearchFilters: conversation.context.currentSearchFilters,
      interestedProperties: conversation.context.interestedProperties,
      pendingReservation: conversation.context.pendingReservation,
      clientPreferences: client.preferences,
    };

    // Process message with OpenAI (with timeout and error handling)
    const aiService = new AIService();
    let agentResponse: AIResponse;
    
    try {
      // Set a timeout for AI processing
      const aiPromise = aiService.processMessage(
        validatedMessage,
        context,
        recentHistory
      );
      
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('AI processing timeout')), 30000); // 30 second timeout
      });
      
      agentResponse = await Promise.race([aiPromise, timeoutPromise]);
    } catch (error) {
      await logContext.log({
        endpoint: '/api/agent',
        method: 'POST',
        statusCode: 500,
        error: error instanceof Error ? error.message : 'AI processing error',
        errorCode: 'AI_ERROR',
        phoneNumber: validatedPhone,
        clientId: client.id,
        conversationId: conversation.id,
        tenantId: validatedTenantId
      });
      
      // Return a friendly error message
      return NextResponse.json({
        success: true,
        data: {
          response: 'Desculpe, estou com dificuldades técnicas no momento. Por favor, tente novamente em alguns instantes.',
          conversationId: conversation.id,
          clientId: client.id,
        },
      });
    }

    // Execute function calls if any (with error handling)
    let functionResults = [];
    const executedFunctions: string[] = [];
    
    if (agentResponse.functionCalls?.length) {
      for (const functionCall of agentResponse.functionCalls) {
        let result;
        executedFunctions.push(functionCall.name);
        
        try {
          switch (functionCall.name) {
          case 'searchProperties':
            result = await agentFunctions.searchProperties(functionCall.arguments);
            break;
          case 'getPropertyDetails':
            result = await agentFunctions.getPropertyDetails(functionCall.arguments.propertyId);
            break;
          case 'calculatePrice':
            result = await agentFunctions.calculatePrice(
              functionCall.arguments.propertyId,
              functionCall.arguments.checkIn,
              functionCall.arguments.checkOut,
              functionCall.arguments.guests
            );
            break;
          case 'sendPropertyMedia':
            result = await agentFunctions.sendPropertyMedia(
              functionCall.arguments.propertyId,
              whatsappNumber || clientPhone,
              functionCall.arguments.mediaType
            );
            break;
          case 'createReservation':
            result = await agentFunctions.createReservation(
              client.id,
              functionCall.arguments.propertyId,
              functionCall.arguments.checkIn,
              functionCall.arguments.checkOut,
              functionCall.arguments.guests,
              functionCall.arguments.notes
            );
            break;
          case 'updateClientPreferences':
            result = await agentFunctions.updateClientPreferences(
              client.id,
              functionCall.arguments
            );
            break;
          default:
            result = { success: false, error: 'Função não encontrada' };
          }
        } catch (error) {
          console.error(`Function ${functionCall.name} error:`, error);
          result = { 
            success: false, 
            error: 'Erro ao executar função. Por favor, tente novamente.'
          };
        }
        
        functionResults.push({ function: functionCall.name, result });
      }
    }

    // Sanitize function results
    functionResults = sanitizeFunctionResults(functionResults);
    
    // Generate and sanitize final response message
    let finalMessage = sanitizeAIResponse(agentResponse.message);
    
    // Append function results to message if applicable
    for (const { function: functionName, result } of functionResults) {
      if (result.success && result.message) {
        finalMessage += '\n\n' + result.message;
      }
      
      // Format property results
      if (functionName === 'searchProperties' && result.success && result.data) {
        const properties = result.data.slice(0, 3); // Show top 3
        for (const property of properties) {
          finalMessage += '\n\n' + agentFunctions.formatPropertySummary(property);
        }
      }
      
      // Format price calculation
      if (functionName === 'calculatePrice' && result.success && result.data) {
        finalMessage += '\n\n' + agentFunctions.formatPriceBreakdown(result.data);
      }
    }

    // Save agent response with sanitization
    await messageService.create({
      conversationId: conversation.id,
      from: 'agent',
      content: finalMessage,
      messageType: 'text',
      timestamp: new Date(),
      isRead: false,
      tenantId: validatedTenantId,
      metadata: {
        functionCalls: executedFunctions,
        processingTime: Date.now() - logContext.startTime
      }
    });

    // Update conversation context if needed
    const updatedContext = { ...conversation.context };
    let contextChanged = false;

    // Update search filters from function calls
    const searchCall = functionResults.find(r => r.function === 'searchProperties');
    if (searchCall?.result.success) {
      updatedContext.currentSearchFilters = searchCall.result.data;
      contextChanged = true;
    }

    // Update interested properties
    const propertyDetailsCalls = functionResults.filter(r => r.function === 'getPropertyDetails');
    if (propertyDetailsCalls.length > 0) {
      updatedContext.interestedProperties = [
        ...(updatedContext.interestedProperties || []),
        ...propertyDetailsCalls.map(call => call.result.data?.id).filter(Boolean)
      ];
      contextChanged = true;
    }

    if (contextChanged) {
      await conversationService.update(conversation.id, {
        context: updatedContext,
        lastMessageAt: new Date(),
        tenantId: validatedTenantId
      });
    }

    // Log successful request
    await logContext.log({
      endpoint: '/api/agent',
      method: 'POST',
      statusCode: 200,
      phoneNumber: validatedPhone,
      clientId: client.id,
      conversationId: conversation.id,
      functionCalls: executedFunctions,
      tenantId: validatedTenantId,
      userAgent: request.headers.get('user-agent') || 'unknown',
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    });

    return NextResponse.json({
      success: true,
      data: {
        response: finalMessage,
        functionResults,
        conversationId: conversation.id,
        clientId: client.id,
      },
    });

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

    const conversation = await conversationService.getById(conversationId);
    
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

    const messages = await conversationService.getMessagesByConversation(conversationId);

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