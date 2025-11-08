// app/api/ai/functions/post-notification/route.ts
// AI Function: Sofia Agent can send notifications to admin when client wants human assistance

import { NextRequest, NextResponse } from 'next/server'
import { NotificationServiceFactory } from '@/lib/services/notification-service'
import { NotificationType, NotificationPriority, NotificationChannel } from '@/lib/types/notification'
import { logger } from '@/lib/utils/logger'
import { sanitizeUserInput } from '@/lib/utils/validation'
import { z } from 'zod'

// Validation schema
const PostNotificationSchema = z.object({
  tenantId: z.string().min(1, 'TenantId is required'),
  targetUserId: z.string().min(1, 'TargetUserId is required'),
  clientPhone: z.string().min(1, 'Client phone is required'),
  clientName: z.string().optional(),
  message: z.string().min(1, 'Message is required').max(500),
  conversationId: z.string().optional(),
  urgency: z.enum(['low', 'medium', 'high', 'critical']).default('high'),
  metadata: z.record(z.any()).optional()
})

/**
 * POST /api/ai/functions/post-notification
 * Sofia AI Agent posts notification to admin when client needs human assistance
 *
 * @example
 * {
 *   "tenantId": "tenant123",
 *   "targetUserId": "admin123",
 *   "clientPhone": "+5511999999999",
 *   "clientName": "João Silva",
 *   "message": "Cliente solicita falar com atendente humano",
 *   "urgency": "high",
 *   "conversationId": "conv123"
 * }
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const requestId = `post_notification_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`

  try {
    logger.info('[POST-NOTIFICATION] Starting AI function execution', {
      requestId,
      function: 'post-notification',
      source: 'sofia-agent'
    })

    // Parse and validate body
    const body = await request.json()
    const validation = PostNotificationSchema.safeParse(body)

    if (!validation.success) {
      logger.warn('[POST-NOTIFICATION] Validation failed', {
        requestId,
        errors: validation.error.errors
      })

      return NextResponse.json(
        {
          success: false,
          error: 'Validation error',
          details: validation.error.errors,
          requestId
        },
        { status: 400 }
      )
    }

    const {
      tenantId,
      targetUserId,
      clientPhone,
      clientName,
      message,
      conversationId,
      urgency,
      metadata
    } = validation.data

    logger.info('[POST-NOTIFICATION] Creating notification for human assistance', {
      requestId,
      tenantId: tenantId.substring(0, 8) + '***',
      targetUserId: targetUserId.substring(0, 8) + '***',
      clientPhone: clientPhone.substring(0, 8) + '***',
      urgency
    })

    // Sanitize user inputs
    const sanitizedMessage = sanitizeUserInput(message)
    const sanitizedClientName = clientName ? sanitizeUserInput(clientName) : undefined

    // Get notification service
    const notificationService = NotificationServiceFactory.getInstance(tenantId)

    // Map urgency to priority
    const priorityMap = {
      low: NotificationPriority.LOW,
      medium: NotificationPriority.MEDIUM,
      high: NotificationPriority.HIGH,
      critical: NotificationPriority.CRITICAL
    }

    // Create notification title based on client info
    const title = sanitizedClientName
      ? `🙋 ${sanitizedClientName} solicita atendimento humano`
      : `🙋 Cliente solicita atendimento humano`

    // Enhanced message with context
    const enhancedMessage = `📞 Telefone: ${clientPhone}\n\n${sanitizedMessage}`

    // Determine notification type - use ticket for human assistance requests
    const notificationType = NotificationType.TICKET_ASSIGNED

    // Create notification with all details
    const notificationId = await notificationService.createNotification({
      targetUserId,
      targetUserName: undefined, // Will be fetched from user profile
      type: notificationType,
      title,
      message: enhancedMessage,
      entityType: 'ticket',
      entityId: conversationId || `human_request_${Date.now()}`,
      entityData: {
        clientPhone,
        clientName: sanitizedClientName,
        conversationId,
        source: 'sofia_ai_agent',
        requestType: 'human_assistance',
        timestamp: new Date().toISOString(),
        ...metadata
      },
      priority: priorityMap[urgency],
      channels: [NotificationChannel.DASHBOARD], // Dashboard only by default
      actions: conversationId ? [{
        id: 'view_conversation',
        label: 'Ver Conversa',
        type: 'primary',
        action: 'navigate',
        config: {
          url: `/dashboard/conversas?id=${conversationId}`
        }
      }] : undefined,
      metadata: {
        source: 'sofia_ai_agent',
        triggerEvent: 'human_assistance_requested',
        clientPhone,
        urgency,
        conversationId,
        ...metadata
      }
    })

    const processingTime = Date.now() - startTime

    logger.info('[POST-NOTIFICATION] Notification created successfully', {
      requestId,
      notificationId,
      processingTime: `${processingTime}ms`,
      tenantId: tenantId.substring(0, 8) + '***',
      urgency
    })

    return NextResponse.json({
      success: true,
      data: {
        notificationId,
        message: 'Notification sent to admin successfully'
      },
      meta: {
        requestId,
        processingTime,
        timestamp: new Date().toISOString()
      }
    })

  } catch (error) {
    const processingTime = Date.now() - startTime

    logger.error('[POST-NOTIFICATION] Function execution failed', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      processingTime: `${processingTime}ms`
    })

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to post notification',
        requestId,
        details: process.env.NODE_ENV === 'development'
          ? error instanceof Error ? error.message : 'Unknown error'
          : undefined
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/ai/functions/post-notification
 * Health check and function info
 */
export async function GET() {
  return NextResponse.json({
    function: 'post-notification',
    version: '1.0.0',
    description: 'AI agent posts notification to admin when client needs human assistance',
    status: 'operational',
    parameters: {
      required: ['tenantId', 'targetUserId', 'clientPhone', 'message'],
      optional: ['clientName', 'conversationId', 'urgency', 'metadata']
    },
    urgencyLevels: ['low', 'medium', 'high', 'critical'],
    defaultUrgency: 'high',
    timestamp: new Date().toISOString()
  })
}
