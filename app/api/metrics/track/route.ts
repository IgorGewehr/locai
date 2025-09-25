import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { db } from '@/lib/firebase/config';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { getTenantId } from '@/lib/middleware/firebase-auth';
import { logger } from '@/lib/utils/logger';

// Types for metrics tracking
interface MetricEvent {
  eventType: 'conversion_step' | 'qualification_milestone' | 'message_engagement' | 'conversation_session';
  leadId?: string;
  sessionId?: string;
  messageId?: string;
  eventData: {
    from?: string;
    to?: string;
    milestone?: string;
    duration?: number;
    messageCount?: number;
    responseTime?: number;
    outcome?: string;
    clientPhone?: string;
    sofiaAction?: string;
  };
  source: 'sofia_agent' | 'whatsapp_webhook' | 'manual';
  userId?: string;
}

export async function POST(request: NextRequest) {
  try {
    // Get tenant ID from auth or header
    let tenantId: string;

    try {
      // Try to get from Firebase auth first
      tenantId = await getTenantId(request);
    } catch (authError) {
      // Fallback to x-tenant-id header for internal calls
      const headerTenantId = request.headers.get('x-tenant-id');
      if (!headerTenantId) {
        logger.warn('⚠️ No tenant ID found in auth or headers');
        return NextResponse.json(
          { success: false, error: 'Tenant ID required' },
          { status: 401 }
        );
      }
      tenantId = headerTenantId;
    }

    const body: MetricEvent = await request.json();

    // Validate required fields
    if (!body.eventType || !body.source) {
      return NextResponse.json(
        { success: false, error: 'eventType and source are required' },
        { status: 400 }
      );
    }

    // Create enriched metric document
    const timestamp = new Date();
    const enrichedMetric = {
      ...body,
      id: `metric_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      tenantId,
      timestamp: serverTimestamp(),
      hour: timestamp.getHours(),
      dayOfWeek: timestamp.getDay(),
      dayOfMonth: timestamp.getDate(),
      month: timestamp.getMonth(),
      year: timestamp.getFullYear(),
      createdAt: serverTimestamp(),

      // Mask sensitive data for logging
      maskedEventData: {
        ...body.eventData,
        ...(body.eventData.clientPhone && {
          clientPhone: body.eventData.clientPhone.replace(/(\d{2})(\d{5})(\d{4})/, '$1*****$3')
        })
      }
    };

    // Save to Firestore
    const metricsRef = collection(db, `tenants/${tenantId}/metrics`);
    const docRef = await addDoc(metricsRef, enrichedMetric);

    // Log the metric (with masked sensitive data)
    logger.info('📊 Metric tracked', {
      tenantId,
      eventType: body.eventType,
      source: body.source,
      leadId: body.leadId,
      sessionId: body.sessionId,
      docId: docRef.id,
      timestamp: timestamp.toISOString()
    });

    // Optional: Trigger real-time dashboard update
    // await triggerDashboardUpdate(tenantId, body.eventType);

    return NextResponse.json({
      success: true,
      metricId: docRef.id,
      timestamp: timestamp.toISOString()
    });

  } catch (error) {
    logger.error('❌ Failed to track metric', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });

    return NextResponse.json(
      { success: false, error: 'Failed to track metric' },
      { status: 500 }
    );
  }
}

// GET endpoint for health check
export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    endpoint: 'metrics/track',
    timestamp: new Date().toISOString()
  });
}