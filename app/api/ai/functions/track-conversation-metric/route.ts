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
      leadId, // Required - can be phone number, client ID, or generated ID
      sessionId, // Optional - will be generated if not provided
      eventData = {} // Generic object or string - accepts any structure
    } = body;

    logger.info('📊 [TRACK-CONVERSATION-METRIC] Iniciando tracking', {
      requestId,
      tenantId: tenantId?.substring(0, 8) + '***',
      params: {
        eventType,
        leadId: leadId?.substring(0, 8) + '***' || 'none',
        sessionId: sessionId?.substring(0, 8) + '***' || 'none',
        hasEventData: !!(eventData && Object.keys(eventData).length)
      },
      userAgent: request.headers.get('user-agent'),
      source: request.headers.get('x-source') || 'unknown'
    });

    // Validate only essential fields
    if (!tenantId || !eventType || !leadId) {
      logger.warn('⚠️ [TRACK-CONVERSATION-METRIC] Campos obrigatórios faltando', {
        requestId,
        missing: {
          tenantId: !tenantId,
          eventType: !eventType,
          leadId: !leadId
        }
      });
      return NextResponse.json(
        {
          success: false,
          error: 'tenantId, eventType and leadId are required',
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

    // Parse eventData if it comes as string (N8N compatibility)
    let parsedEventData = eventData;
    if (typeof eventData === 'string') {
      try {
        parsedEventData = JSON.parse(eventData);
      } catch (e) {
        logger.warn('⚠️ [TRACK-CONVERSATION-METRIC] EventData parsing failed, usando objeto vazio', { requestId });
        parsedEventData = {}; // Default empty if parsing fails
      }
    }

    // Generate sessionId if not provided
    const finalSessionId = sessionId || `session_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    // Enrich eventData with default fields based on type
    const enrichedEventData = {
      ...parsedEventData,
      timestamp: new Date().toISOString(),
      sessionType: parsedEventData.sessionType || 'sofia_assisted',
      qualificationMethod: parsedEventData.qualificationMethod || 'sofia_conversation',
      sofiaTriggered: true,
      automatedTracking: true
    };

    // Prepare metric data
    const metricData = {
      eventType,
      leadId,
      sessionId: finalSessionId,
      eventData: enrichedEventData,
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

    // Generate simple contextual response
    const contextualResponse = generateSimpleResponse(eventType, enrichedEventData);

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

// Simple helper function to generate contextual responses for Sofia
function generateSimpleResponse(eventType: string, eventData: any): string {
  const eventTypeMessages = {
    'conversion_step': 'Progressão de interesse registrada',
    'qualification_milestone': 'Marco de qualificação registrado',
    'message_engagement': 'Engajamento registrado',
    'conversation_session': 'Sessão de conversa finalizada'
  };

  const baseMessage = eventTypeMessages[eventType as keyof typeof eventTypeMessages] || 'Evento registrado';

  // Add simple contextual information if available
  const details: string[] = [];
  if (eventData.duration && !isNaN(eventData.duration)) {
    const minutes = Math.round(eventData.duration / 60);
    details.push(`${minutes}min`);
  }
  if (eventData.responseTime && !isNaN(eventData.responseTime)) {
    details.push(`${eventData.responseTime}s`);
  }
  if (eventData.messageCount && !isNaN(eventData.messageCount)) {
    details.push(`${eventData.messageCount} msgs`);
  }

  const detailsText = details.length > 0 ? ` (${details.join(', ')})` : '';
  return `${baseMessage}${detailsText} - dados salvos para análise`;
}

// Simplified usage examples for N8N/Sofia integration:
//
// Basic usage:
// {
//   "tenantId": "{{$json.tenantId}}",
//   "eventType": "message_engagement",
//   "leadId": "{{$json.clientPhone}}",
//   "eventData": "{{$fromAI('eventData', 'JSON com dados do evento', 'string', '{}')}}"
// }
//
// With specific data:
// {
//   "tenantId": "tenant123",
//   "eventType": "qualification_milestone",
//   "leadId": "+5511999999999",
//   "eventData": {
//     "milestone": "qualified",
//     "duration": 180,
//     "messageCount": 5
//   }
// }