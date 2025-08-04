// Endpoint usando Sofia V3 CORRIGIDA - sem componentes problemáticos
import { NextRequest, NextResponse } from 'next/server';
import { SofiaAgentFixed } from '@/lib/ai-agent/sofia-agent-fixed';
import { logger } from '@/lib/utils/logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, clientPhone, tenantId = 'default-tenant' } = body;

    if (!message || !clientPhone) {
      return NextResponse.json(
        { success: false, error: 'message and clientPhone are required' },
        { status: 400 }
      );
    }

    logger.info('📥 [Agent Fixed] Nova mensagem recebida', {
      clientPhone: clientPhone.substring(0, 4) + '***',
      messagePreview: message.substring(0, 50),
      tenantId
    });

    // Usar Sofia V3 corrigida
    const sofia = SofiaAgentFixed.getInstance();
    
    const response = await sofia.processMessage({
      message,
      clientPhone,
      tenantId,
      metadata: {
        source: 'api'
      }
    });

    logger.info('📤 [Agent Fixed] Resposta gerada', {
      success: true,
      tokensUsed: response.tokensUsed,
      responseTime: response.responseTime,
      functionsExecuted: response.functionsExecuted.length
    });

    return NextResponse.json({
      success: true,
      message: response.reply,
      data: {
        response: response.reply,
        tokensUsed: response.tokensUsed,
        responseTime: response.responseTime,
        functionsExecuted: response.functionsExecuted,
        actions: response.actions?.length || 0,
        conversationStage: response.metadata.stage,
        confidence: response.metadata.confidence,
        clientInfo: {
          hasName: false,
          hasDocument: false,
          hasEmail: false,
          guestsIdentified: response.functionsExecuted.includes('search_properties')
        },
        searchProgress: {
          propertiesViewed: response.functionsExecuted.includes('search_properties') ? 1 : 0,
          validProperties: response.functionsExecuted.includes('search_properties') ? 1 : 0,
          hasInterestedProperty: false,
          priceCalculated: response.functionsExecuted.includes('calculate_price'),
          photosViewed: response.functionsExecuted.includes('send_property_media')
        },
        context: {
          nextRecommendedAction: 'continuar conversa',
          actionReason: 'manter engajamento',
          urgencyLevel: 'normal',
          buyingSignals: response.functionsExecuted.length,
          objections: 0
        },
        performance: {
          totalProcessingTime: `${response.responseTime}ms`,
          sofiaProcessingTime: `${response.responseTime}ms`,
          reasoningUsed: response.metadata.reasoningUsed,
          smartSummaryEnabled: false,
          validationsPassed: true,
          rateLimitOk: true,
          cacheUsed: false
        },
        request: {
          id: `req_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
          timestamp: new Date().toISOString(),
          source: 'api',
          tenantId
        }
      }
    });

  } catch (error: any) {
    logger.error('❌ [Agent Fixed] Erro no endpoint', {
      error: error.message,
      stack: error.stack
    });

    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack?.split('\n').slice(0, 3).join('\n')
    }, { status: 500 });
  }
}