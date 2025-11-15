/**
 * CONVERSATIONS METRICS API ROUTE
 *
 * Provides real-time conversation metrics for dashboard
 * Data source: tenants/{tenantId}/conversations and messages
 *
 * @version 1.0.0
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateFirebaseAuth } from '@/lib/middleware/firebase-auth';
import { TenantServiceFactory } from '@/lib/firebase/firestore-v2';
import { logger } from '@/lib/utils/logger';
import { handleApiError } from '@/lib/utils/api-errors';

interface ConversationMetrics {
  today: {
    total: number;
    active: number;
    completed: number;
    avgResponseTime: number; // in seconds
  };
  week: {
    total: number;
    conversionRate?: number;
  };
}

/**
 * GET /api/metrics/conversations
 *
 * Returns conversation metrics for authenticated tenant
 */
export async function GET(request: NextRequest) {
  const requestId = `get-conv-metrics_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const startTime = Date.now();

  try {
    // Authentication
    const authContext = await validateFirebaseAuth(request);
    if (!authContext.authenticated || !authContext.tenantId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
          code: 'AUTH_REQUIRED',
        },
        { status: 401 }
      );
    }

    const tenantId = authContext.tenantId;

    logger.info('[GET-CONV-METRICS] Request received', {
      requestId,
      tenantId: tenantId.substring(0, 8) + '***',
    });

    const services = new TenantServiceFactory(tenantId);

    // Define time ranges
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - 7);
    weekStart.setHours(0, 0, 0, 0);

    // Fetch today's conversations
    const todayConversations = await services.db
      .collection('tenants')
      .doc(tenantId)
      .collection('conversations')
      .where('startedAt', '>=', todayStart)
      .get();

    logger.debug('[GET-CONV-METRICS] Today conversations fetched', {
      requestId,
      count: todayConversations.size,
    });

    // Calculate today's metrics
    let activeCount = 0;
    let completedCount = 0;

    todayConversations.docs.forEach((doc) => {
      const data = doc.data();
      if (data.status === 'active') {
        activeCount++;
      } else if (data.status === 'completed' || data.status === 'success') {
        completedCount++;
      }
    });

    // Fetch today's messages for response time calculation
    const todayMessages = await services.db
      .collection('tenants')
      .doc(tenantId)
      .collection('messages')
      .where('createdAt', '>=', todayStart)
      .get();

    logger.debug('[GET-CONV-METRICS] Today messages fetched', {
      requestId,
      count: todayMessages.size,
    });

    // Calculate average response time
    let totalResponseTime = 0;
    let responseCount = 0;

    todayMessages.docs.forEach((doc) => {
      const data = doc.data();

      // Only calculate if Sofia responded
      if (data.sofiaMessageTimestamp && data.clientMessageTimestamp) {
        try {
          // Handle Firestore Timestamp objects
          const sofiaTime =
            typeof data.sofiaMessageTimestamp.toMillis === 'function'
              ? data.sofiaMessageTimestamp.toMillis()
              : new Date(data.sofiaMessageTimestamp).getTime();

          const clientTime =
            typeof data.clientMessageTimestamp.toMillis === 'function'
              ? data.clientMessageTimestamp.toMillis()
              : new Date(data.clientMessageTimestamp).getTime();

          const diff = sofiaTime - clientTime;

          // Only count positive, reasonable response times (< 5 minutes)
          if (diff > 0 && diff < 300000) {
            totalResponseTime += diff;
            responseCount++;
          }
        } catch (error) {
          // Skip messages with invalid timestamps
          logger.debug('[GET-CONV-METRICS] Skipped message with invalid timestamp', {
            messageId: doc.id,
          });
        }
      }
    });

    const avgResponseTime =
      responseCount > 0 ? Math.round(totalResponseTime / responseCount / 1000) : 0;

    // Fetch week's conversations
    const weekConversations = await services.db
      .collection('tenants')
      .doc(tenantId)
      .collection('conversations')
      .where('startedAt', '>=', weekStart)
      .get();

    logger.debug('[GET-CONV-METRICS] Week conversations fetched', {
      requestId,
      count: weekConversations.size,
    });

    // Calculate conversion rate (conversations that resulted in success)
    let successCount = 0;
    weekConversations.docs.forEach((doc) => {
      if (doc.data().status === 'success') {
        successCount++;
      }
    });

    const conversionRate =
      weekConversations.size > 0
        ? Math.round((successCount / weekConversations.size) * 100)
        : 0;

    const metrics: ConversationMetrics = {
      today: {
        total: todayConversations.size,
        active: activeCount,
        completed: completedCount,
        avgResponseTime,
      },
      week: {
        total: weekConversations.size,
        conversionRate,
      },
    };

    const processingTime = Date.now() - startTime;

    logger.info('[GET-CONV-METRICS] Request completed', {
      requestId,
      processingTime: `${processingTime}ms`,
      todayTotal: metrics.today.total,
      weekTotal: metrics.week.total,
    });

    return NextResponse.json({
      success: true,
      data: metrics,
      meta: {
        requestId,
        processingTime,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;

    logger.error('[GET-CONV-METRICS] Request failed', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      processingTime: `${processingTime}ms`,
    });

    return handleApiError(error);
  }
}
