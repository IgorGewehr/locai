import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/utils/logger';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestId = `track_conversion_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  try {
    const body = await request.json();
    const {
      tenantId,
      leadId, // Required - can be phone number, client ID, or generated ID
      sessionId, // Optional - will be generated if not provided
      eventData = {} // Generic object or string - accepts any structure
    } = body;

    logger.info('🎯 [TRACK-CONVERSION-STEP] Iniciando tracking', {
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
      logger.warn('⚠️ [TRACK-CONVERSION-STEP] Campos obrigatórios faltando', {
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
        logger.warn('⚠️ [TRACK-CONVERSION-STEP] EventData parsing failed, usando objeto vazio', { requestId });
        parsedEventData = {}; // Default empty if parsing fails
      }
    }

    // Generate sessionId if not provided
    const finalSessionId = sessionId || `session_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    // Enrich eventData with conversion-specific fields
    const enrichedEventData = {
      ...parsedEventData,
      timestamp: new Date().toISOString(),
      sessionType: parsedEventData.sessionType || 'sofia_assisted',
      from: parsedEventData.from || 'initial_contact',
      to: parsedEventData.to || 'interested',
      interestLevel: parsedEventData.interestLevel || parsedEventData.to,
      sofiaTriggered: true,
      automatedTracking: true
    };

    // Prepare metric data
    const metricData = {
      eventType: 'conversion_step',
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
    let contextualResponse = 'Progressão de interesse registrada';
    if (parsedEventData.from && parsedEventData.to) {
      contextualResponse = `Progressão: ${parsedEventData.from} → ${parsedEventData.to}`;
    }
    contextualResponse += ' - dados salvos para análise';

    logger.info('✅ [TRACK-CONVERSION-STEP] Metric tracked', {
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
        eventType: 'conversion_step',
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

    logger.error('❌ [TRACK-CONVERSION-STEP] Erro no tracking', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack?.substring(0, 500) : undefined,
      processingTime: `${processingTime}ms`
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to track conversion step',
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
//   "eventData": "{\"from\": \"initial_contact\", \"to\": \"interested\"}"
// }
//
// With specific data:
// {
//   "tenantId": "tenant123",
//   "leadId": "+5511999999999",
//   "eventData": {
//     "from": "interested",
//     "to": "qualified",
//     "interestLevel": "high",
//     "conversionTrigger": "property_match"
//   }
// }