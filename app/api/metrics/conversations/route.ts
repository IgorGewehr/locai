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

    // Fetch all conversations to ensure we don't miss any
    let allConversations;
    let todayConversations;
    try {
      // Get all conversations (we'll filter in memory)
      allConversations = await conversationsService.getAll();

      // Filter conversations that started today or have activity today
      todayConversations = allConversations.filter((conv: any) => {
        // Check if conversation started today
        const startedAt = conv.startedAt?.toDate ? conv.startedAt.toDate() : new Date(conv.startedAt || 0);
        const isStartedToday = startedAt >= todayStart;

        // Check if last message was today
        const lastMessageAt = conv.lastMessageAt?.toDate ? conv.lastMessageAt.toDate() : new Date(conv.lastMessageAt || 0);
        const hasActivityToday = lastMessageAt >= todayStart;

        // Check if createdAt is today (fallback)
        const createdAt = conv.createdAt?.toDate ? conv.createdAt.toDate() : new Date(conv.createdAt || 0);
        const isCreatedToday = createdAt >= todayStart;

        return isStartedToday || hasActivityToday || isCreatedToday;
      });

    } catch (dbError) {
      logger.error('[GET-CONV-METRICS] Error fetching conversations', {
        requestId,
        error: dbError instanceof Error ? dbError.message : 'Unknown error',
      });
      throw new Error(`Failed to fetch conversations: ${dbError instanceof Error ? dbError.message : 'Unknown error'}`);
    }

    logger.debug('[GET-CONV-METRICS] Today conversations fetched', {
      requestId,
      totalConversations: allConversations.length,
      todayCount: todayConversations.length,
    });

    // Calculate today's metrics
    let activeCount = 0;
    let completedCount = 0;

    todayConversations.forEach((conversation: any) => {
      // Count as active if status is 'active', 'ACTIVE', 'waiting_client', 'waiting_approval', or 'escalated'
      // Also check isActive flag for backward compatibility
      const status = conversation.status?.toLowerCase() || '';
      const isActive = conversation.isActive === true;

      if (
        status === 'active' ||
        status === 'waiting_client' ||
        status === 'waiting_approval' ||
        status === 'escalated' ||
        isActive
      ) {
        activeCount++;
      } else if (
        status === 'completed' ||
        status === 'success' ||
        conversation.status === 'COMPLETED'
      ) {
        completedCount++;
      }

      // Debug log for first few conversations
      if (activeCount + completedCount < 3) {
        logger.debug('[GET-CONV-METRICS] Conversation status check', {
          requestId,
          conversationId: conversation.id?.substring(0, 8) + '***',
          status: conversation.status,
          isActive: conversation.isActive,
          counted: status === 'active' || isActive ? 'active' : status === 'completed' ? 'completed' : 'none'
        });
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
      logger.error('[GET-CONV-METRICS] Full error', { error: error instanceof Error ? error.message : String(error) });
      logger.error('[GET-CONV-METRICS] Stack', { error: errorStack || 'No stack trace available' });
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
