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
    const conversationsService = services.createService('conversations');
    const messagesService = services.createService('messages');

    // Define time ranges
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - 7);
    weekStart.setHours(0, 0, 0, 0);

    logger.debug('[GET-CONV-METRICS] Time ranges defined', {
      requestId,
      todayStart: todayStart.toISOString(),
      weekStart: weekStart.toISOString(),
    });

    // Fetch today's conversations
    let todayConversations;
    try {
      todayConversations = await conversationsService.getMany([
        { field: 'startedAt', operator: '>=', value: todayStart }
      ]);
    } catch (dbError) {
      logger.error('[GET-CONV-METRICS] Error fetching today conversations', {
        requestId,
        error: dbError instanceof Error ? dbError.message : 'Unknown error',
      });
      throw new Error(`Failed to fetch today conversations: ${dbError instanceof Error ? dbError.message : 'Unknown error'}`);
    }

    logger.debug('[GET-CONV-METRICS] Today conversations fetched', {
      requestId,
      count: todayConversations.length,
    });

    // Calculate today's metrics
    let activeCount = 0;
    let completedCount = 0;

    todayConversations.forEach((conversation: any) => {
      if (conversation.status === 'active') {
        activeCount++;
      } else if (conversation.status === 'completed' || conversation.status === 'success') {
        completedCount++;
      }
    });

    // Fetch today's messages for response time calculation
    let todayMessages;
    try {
      todayMessages = await messagesService.getMany([
        { field: 'createdAt', operator: '>=', value: todayStart }
      ]);
    } catch (dbError) {
      logger.error('[GET-CONV-METRICS] Error fetching today messages', {
        requestId,
        error: dbError instanceof Error ? dbError.message : 'Unknown error',
      });
      throw new Error(`Failed to fetch today messages: ${dbError instanceof Error ? dbError.message : 'Unknown error'}`);
    }

    logger.debug('[GET-CONV-METRICS] Today messages fetched', {
      requestId,
      count: todayMessages.length,
    });

    // Calculate average response time
    let totalResponseTime = 0;
    let responseCount = 0;

    todayMessages.forEach((message: any) => {
      // Only calculate if Sofia responded
      if (message.sofiaMessageTimestamp && message.clientMessageTimestamp) {
        try {
          // Handle Firestore Timestamp objects or Date objects
          const sofiaTime =
            typeof message.sofiaMessageTimestamp.toMillis === 'function'
              ? message.sofiaMessageTimestamp.toMillis()
              : message.sofiaMessageTimestamp instanceof Date
              ? message.sofiaMessageTimestamp.getTime()
              : new Date(message.sofiaMessageTimestamp).getTime();

          const clientTime =
            typeof message.clientMessageTimestamp.toMillis === 'function'
              ? message.clientMessageTimestamp.toMillis()
              : message.clientMessageTimestamp instanceof Date
              ? message.clientMessageTimestamp.getTime()
              : new Date(message.clientMessageTimestamp).getTime();

          const diff = sofiaTime - clientTime;

          // Only count positive, reasonable response times (< 5 minutes)
          if (diff > 0 && diff < 300000) {
            totalResponseTime += diff;
            responseCount++;
          }
        } catch (error) {
          // Skip messages with invalid timestamps
          logger.debug('[GET-CONV-METRICS] Skipped message with invalid timestamp', {
            messageId: message.id,
          });
        }
      }
    });

    const avgResponseTime =
      responseCount > 0 ? Math.round(totalResponseTime / responseCount / 1000) : 0;

    // Fetch week's conversations
    let weekConversations;
    try {
      weekConversations = await conversationsService.getMany([
        { field: 'startedAt', operator: '>=', value: weekStart }
      ]);
    } catch (dbError) {
      logger.error('[GET-CONV-METRICS] Error fetching week conversations', {
        requestId,
        error: dbError instanceof Error ? dbError.message : 'Unknown error',
      });
      throw new Error(`Failed to fetch week conversations: ${dbError instanceof Error ? dbError.message : 'Unknown error'}`);
    }

    logger.debug('[GET-CONV-METRICS] Week conversations fetched', {
      requestId,
      count: weekConversations.length,
    });

    // Calculate conversion rate (conversations that resulted in success)
    let successCount = 0;
    weekConversations.forEach((conversation: any) => {
      if (conversation.status === 'success') {
        successCount++;
      }
    });

    const conversionRate =
      weekConversations.length > 0
        ? Math.round((successCount / weekConversations.length) * 100)
        : 0;

    const metrics: ConversationMetrics = {
      today: {
        total: todayConversations.length,
        active: activeCount,
        completed: completedCount,
        avgResponseTime,
      },
      week: {
        total: weekConversations.length,
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

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;

    // Garantir que requestId existe mesmo se o erro ocorreu antes
    const safeRequestId = `get-conv-metrics_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    logger.error('[GET-CONV-METRICS] Request failed', {
      requestId: safeRequestId,
      error: errorMessage,
      errorType: error?.constructor?.name,
      stack: errorStack?.substring(0, 500),
      processingTime: `${processingTime}ms`,
    });

    // Log completo em desenvolvimento
    if (process.env.NODE_ENV === 'development') {
      console.error('[GET-CONV-METRICS] Full error:', error);
      console.error('[GET-CONV-METRICS] Stack:', errorStack);
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Erro ao buscar métricas de conversas',
        requestId: safeRequestId,
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
      },
      { status: 500 }
    );
  }
}
