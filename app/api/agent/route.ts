import { NextRequest, NextResponse } from 'next/server';
import { AIService } from '@/lib/services/ai-service';
import * as agentFunctions from '@/lib/ai/agent-functions-exports';
import { 
  conversationService, 
  messageService, 
  clientService,
  clientQueries 
} from '@/lib/firebase/firestore';
import type { AgentContext, Message, AIResponse } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const { message, clientPhone, whatsappNumber } = await request.json();

    if (!message || !clientPhone) {
      return NextResponse.json(
        { success: false, error: 'Mensagem e telefone são obrigatórios' },
        { status: 400 }
      );
    }

    // Get or create client
    let client = await clientQueries.getClientByPhone(clientPhone);
    if (!client) {
      const clientId = await clientService.create({
        name: 'Cliente WhatsApp',
        phone: clientPhone,
        whatsappNumber: whatsappNumber || clientPhone,
        preferences: {},
        reservations: [],
        totalSpent: 0,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      client = await clientService.getById(clientId);
    }

    if (!client) {
      return NextResponse.json(
        { success: false, error: 'Erro ao criar/encontrar cliente' },
        { status: 500 }
      );
    }

    // Get or create conversation
    let conversation = await conversationService.getConversationByWhatsApp(whatsappNumber || clientPhone);
    if (!conversation) {
      const conversationId = await conversationService.create({
        clientId: client.id,
        whatsappNumber: whatsappNumber || clientPhone,
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
      return NextResponse.json(
        { success: false, error: 'Erro ao criar/encontrar conversa' },
        { status: 500 }
      );
    }

    // Save incoming message
    await messageService.create({
      conversationId: conversation.id,
      from: 'client',
      content: message,
      messageType: 'text',
      timestamp: new Date(),
      isRead: true,
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

    // Process message with OpenAI
    const aiService = new AIService();
    const agentResponse: AIResponse = await aiService.processMessage(
      message,
      context,
      recentHistory
    );

    // Execute function calls if any
    let functionResults = [];
    if (agentResponse.functionCalls?.length) {
      for (const functionCall of agentResponse.functionCalls) {
        let result;
        
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
        
        functionResults.push({ function: functionCall.name, result });
      }
    }

    // Generate final response message
    let finalMessage = agentResponse.message;
    
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

    // Save agent response
    await messageService.create({
      conversationId: conversation.id,
      from: 'agent',
      content: finalMessage,
      messageType: 'text',
      timestamp: new Date(),
      isRead: false,
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
      });
    }

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
    console.error('Agent API error:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const conversationId = searchParams.get('conversationId');

  if (!conversationId) {
    return NextResponse.json(
      { success: false, error: 'ID da conversa é obrigatório' },
      { status: 400 }
    );
  }

  try {
    const conversation = await conversationService.getById(conversationId);
    
    if (!conversation) {
      return NextResponse.json(
        { success: false, error: 'Conversa não encontrada' },
        { status: 404 }
      );
    }

    const messages = await conversationService.getMessagesByConversation(conversationId);

    return NextResponse.json({
      success: true,
      data: {
        conversation,
        messages,
      },
    });

  } catch (error) {
    console.error('Get conversation error:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}