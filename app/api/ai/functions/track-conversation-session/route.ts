import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/utils/logger';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestId = `track_session_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  try {
    const body = await request.json();
    const {
      tenantId,
      leadId, // Required - can be phone number, client ID, or generated ID
      sessionId, // Optional - will be generated if not provided
      eventData = {} // Generic object or string - accepts any structure
    } = body;

    logger.info('🗨️ [TRACK-CONVERSATION-SESSION] Iniciando tracking', {
      requestId,
      tenantId: tenantId?.substring(0, 8) + '***',
      params: {
        leadId: leadId?.substring(0, 8) + '***' || 'none',
        sessionId: sessionId?.substring(0, 8) + '***' || 'none',
        hasEventData: !!(eventData && Object.keys(eventData).length)
      },
      userAgent: request.headers.get('user-agent'),
      source: request.headers.get('x-source') || 'unknown'
    });

    // Validate only essential fields
    if (!tenantId || !leadId) {
      logger.warn('⚠️ [TRACK-CONVERSATION-SESSION] Campos obrigatórios faltando', {
        requestId,
        missing: {
          tenantId: !tenantId,
          leadId: !leadId
        }
      });
      return NextResponse.json(
        {
          success: false,
          error: 'tenantId and leadId are required',
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
        logger.warn('⚠️ [TRACK-CONVERSATION-SESSION] EventData parsing failed, usando objeto vazio', { requestId });
        parsedEventData = {}; // Default empty if parsing fails
      }
    }

    // Generate sessionId if not provided
    const finalSessionId = sessionId || `session_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    // Enrich eventData with session-specific fields
    const enrichedEventData = {
      ...parsedEventData,
      timestamp: new Date().toISOString(),
      sessionType: parsedEventData.sessionType || 'sofia_assisted',
      duration: parsedEventData.duration || 0,
      messageCount: parsedEventData.messageCount || 0,
      outcome: parsedEventData.outcome || 'completed',
      sofiaTriggered: true,
      automatedTracking: true
    };

    // Prepare metric data
    const metricData = {
      eventType: 'conversation_session',
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

    // Generate contextual response
    let contextualResponse = 'Sessão de conversa finalizada';
    const details: string[] = [];

    if (parsedEventData.duration && !isNaN(parsedEventData.duration)) {
      const minutes = Math.round(parsedEventData.duration / 60);
      details.push(`${minutes}min`);
    }
    if (parsedEventData.messageCount && !isNaN(parsedEventData.messageCount)) {
      details.push(`${parsedEventData.messageCount} msgs`);
    }

    if (details.length > 0) {
      contextualResponse += ` (${details.join(', ')})`;
    }
    contextualResponse += ' - dados salvos para análise';

    logger.info('✅ [TRACK-CONVERSATION-SESSION] Metric tracked', {
      requestId,
      tenantId: tenantId.substring(0, 8) + '***',
      results: {
        metricId: trackingResult.metricId,
        tracked: true
      },
      performance: {
        processingTime: `${processingTime}ms`
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        metricId: trackingResult.metricId,
        eventType: 'conversation_session',
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

    logger.error('❌ [TRACK-CONVERSATION-SESSION] Erro no tracking', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack?.substring(0, 500) : undefined,
      processingTime: `${processingTime}ms`
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to track conversation session',
        requestId,
        details: process.env.NODE_ENV === 'development' ?
          error instanceof Error ? error.message : 'Unknown error' :
          undefined
      },
      { status: 500 }
    );
  }
}

// Usage examples for N8N:
//
// Basic usage:
// {
//   "tenantId": "{{$json.tenantId}}",
//   "leadId": "{{$json.clientPhone}}",
//   "eventData": "{\"duration\": 420, \"messageCount\": 15}"
// }
//
// With specific data:
// {
//   "tenantId": "tenant123",
//   "leadId": "+5511999999999",
//   "eventData": {
//     "duration": 420,
//     "messageCount": 15,
//     "outcome": "appointment_scheduled",
//     "satisfaction": "high"
//   }
// }