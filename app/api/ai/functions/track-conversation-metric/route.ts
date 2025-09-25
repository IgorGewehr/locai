import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/utils/logger';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestId = `track_metric_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  try {
    const body = await request.json();
    const {
      tenantId,
      eventType,
      leadId, // Optional - can be phone number, client ID, or generated ID
      sessionId, // Optional - will be generated if not provided
      messageId,
      eventData = {},
      autoTrack = true
    } = body;

    logger.info('📊 [TRACK-CONVERSATION-METRIC] Iniciando tracking', {
      requestId,
      tenantId: tenantId?.substring(0, 8) + '***',
      params: {
        eventType,
        leadId: leadId?.substring(0, 8) + '***' || 'none',
        sessionId: sessionId?.substring(0, 8) + '***' || 'none',
        hasEventData: !!Object.keys(eventData).length,
        autoTrack
      },
      userAgent: request.headers.get('user-agent'),
      source: request.headers.get('x-source') || 'unknown'
    });

    if (!tenantId || !eventType) {
      logger.warn('⚠️ [TRACK-CONVERSATION-METRIC] Dados obrigatórios não fornecidos', {
        requestId,
        missing: {
          tenantId: !tenantId,
          eventType: !eventType
        }
      });
      return NextResponse.json(
        {
          success: false,
          error: 'tenantId and eventType are required',
          requestId
        },
        { status: 400 }
      );
    }

    // Validate eventType
    const validEventTypes = ['conversion_step', 'qualification_milestone', 'message_engagement', 'conversation_session'];
    if (!validEventTypes.includes(eventType)) {
      logger.warn('⚠️ [TRACK-CONVERSATION-METRIC] Tipo de evento inválido', { requestId, eventType });
      return NextResponse.json(
        {
          success: false,
          error: `Invalid eventType. Must be one of: ${validEventTypes.join(', ')}`,
          requestId
        },
        { status: 400 }
      );
    }

    // Generate sessionId if not provided
    const finalSessionId = sessionId || `session_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    // Prepare metric data
    const metricData = {
      eventType,
      leadId,
      sessionId: finalSessionId,
      messageId,
      eventData: {
        ...eventData,
        // Add Sofia context
        sofiaTriggered: true,
        automatedTracking: autoTrack
      },
      source: 'sofia_agent'
    };

    // Call internal metrics tracking API
    const trackingResponse = await fetch(`${request.nextUrl.origin}/api/metrics/track`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-tenant-id': tenantId,
      },
      body: JSON.stringify(metricData)
    });

    if (!trackingResponse.ok) {
      throw new Error(`Metrics tracking API returned ${trackingResponse.status}`);
    }

    const trackingResult = await trackingResponse.json();
    const processingTime = Date.now() - startTime;

    if (!trackingResult.success) {
      throw new Error(trackingResult.error || 'Metrics tracking failed');
    }

    // Generate contextual response for Sofia
    const contextualResponse = generateContextualResponse(eventType, eventData);

    logger.info('✅ [TRACK-CONVERSATION-METRIC] Metric tracked', {
      requestId,
      tenantId: tenantId.substring(0, 8) + '***',
      results: {
        metricId: trackingResult.metricId,
        eventType,
        tracked: true,
        hasContext: !!contextualResponse
      },
      performance: {
        processingTime: `${processingTime}ms`
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        metricId: trackingResult.metricId,
        eventType,
        tracked: true,
        timestamp: trackingResult.timestamp,
        context: contextualResponse
      },
      meta: {
        requestId,
        processingTime,
        timestamp: new Date().toISOString(),
        source: 'sofia_agent'
      }
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;

    logger.error('❌ [TRACK-CONVERSATION-METRIC] Erro no tracking', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack?.substring(0, 500) : undefined,
      processingTime: `${processingTime}ms`,
      errorType: error instanceof Error ? error.constructor.name : typeof error
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to track conversation metric',
        requestId,
        details: process.env.NODE_ENV === 'development' ?
          error instanceof Error ? error.message : 'Unknown error' :
          undefined
      },
      { status: 500 }
    );
  }
}

// Helper function to generate contextual responses for Sofia (metrics-focused)
function generateContextualResponse(eventType: string, eventData: any): string | null {
  switch (eventType) {
    case 'conversion_step':
      if (eventData.from && eventData.to) {
        return `Cliente progrediu de "${eventData.from}" para "${eventData.to}" - métricas atualizadas`;
      }
      return 'Progressão de interesse registrada para métricas';

    case 'qualification_milestone':
      if (eventData.milestone === 'qualified') {
        const timeText = eventData.timeToMilestone ?
          ` em ${Math.round(eventData.timeToMilestone / 60)} minutos` : '';
        return `Cliente qualificado com sucesso${timeText} - tempo registrado para métricas`;
      }
      return `Marco "${eventData.milestone}" registrado para análise de performance`;

    case 'message_engagement':
      if (eventData.outcome === 'responded') {
        const responseTime = eventData.responseTime ?
          ` em ${eventData.responseTime}s` : '';
        return `Engajamento positivo registrado${responseTime} - taxa de resposta atualizada`;
      } else if (eventData.outcome === 'no_response') {
        return 'Falta de resposta registrada - impacta métricas de engajamento';
      }
      return 'Interação registrada para análise de engajamento';

    case 'conversation_session':
      const durationMin = Math.round(eventData.duration / 60);
      const messageCount = eventData.messageCount || 0;
      return `Sessão concluída: ${durationMin}min, ${messageCount} mensagens - dados salvos para análise de performance`;

    default:
      return null;
  }
}

// Quick tracking functions for common Sofia scenarios (CRM-free)
export const SofiaMetrics = {
  // When Sofia qualifies a client (using phone number as ID)
  trackQualification: (tenantId: string, clientId: string, timeMinutes: number, messageCount: number) => ({
    tenantId,
    eventType: 'qualification_milestone',
    leadId: clientId, // Can be phone number or any client identifier
    eventData: {
      milestone: 'qualified',
      timeToMilestone: timeMinutes * 60,
      messageCount,
      qualificationMethod: 'sofia_conversation'
    }
  }),

  // When client shows interest progression (metrics-focused, not CRM pipeline)
  trackInterestProgression: (tenantId: string, clientId: string, fromLevel: string, toLevel: string, additionalData?: any) => ({
    tenantId,
    eventType: 'conversion_step',
    leadId: clientId,
    eventData: {
      from: fromLevel, // e.g., 'initial_contact', 'interested', 'serious_buyer'
      to: toLevel,
      interestLevel: toLevel,
      ...additionalData
    }
  }),

  // When client engages with Sofia
  trackEngagement: (tenantId: string, clientId: string, responded: boolean, responseTime?: number, sessionId?: string) => ({
    tenantId,
    eventType: 'message_engagement',
    sessionId, // Optional - will be auto-generated if not provided
    leadId: clientId,
    eventData: {
      outcome: responded ? 'responded' : 'no_response',
      responseTime,
      engagementLevel: responded ? 'active' : 'passive'
    }
  }),

  // When conversation session ends
  trackSession: (tenantId: string, clientId: string, durationMinutes: number, messageCount: number, outcome: string, sessionId?: string) => ({
    tenantId,
    eventType: 'conversation_session',
    sessionId, // Optional - will be auto-generated if not provided
    leadId: clientId,
    eventData: {
      duration: durationMinutes * 60,
      messageCount,
      outcome,
      sessionType: 'sofia_assisted'
    }
  })
};