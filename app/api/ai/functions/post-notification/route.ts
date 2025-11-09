// app/api/ai/functions/post-notification/route.ts
// AI Function: Sofia Agent notifies admin when client wants human assistance
// SIMPLIFIED: Only tenantId and clientPhone required

import { NextRequest, NextResponse } from 'next/server'
import { NotificationServiceFactory } from '@/lib/services/notification-service'
import { NotificationType, NotificationPriority, NotificationChannel } from '@/lib/types/notification'
import { logger } from '@/lib/utils/logger'
import { z } from 'zod'

// Simple validation schema - only 2 required fields
const PostNotificationSchema = z.object({
  tenantId: z.string().min(1, 'TenantId is required'),
  clientPhone: z.string().min(1, 'Client phone is required')
})

/**
 * POST /api/ai/functions/post-notification
 * Sofia AI Agent notifies admin when client needs human assistance
 *
 * ULTRA SIMPLIFIED - Only 2 fields needed:
 * - tenantId: Tenant identifier
 * - clientPhone: Client phone number
 *
 * Message is always: "Cliente de número X quer falar com um humano"
 *
 * @example
 * {
 *   "tenantId": "tenant123",
 *   "clientPhone": "+5511999999999"
 * }
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const requestId = `notification_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`

  try {
    logger.info('[POST-NOTIFICATION] Starting execution', {
      requestId,
      function: 'post-notification'
    })

    // Parse and validate
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

    const { tenantId, clientPhone } = validation.data

    logger.info('[POST-NOTIFICATION] Creating notification', {
      requestId,
      tenantId: tenantId.substring(0, 8) + '***',
      clientPhone: clientPhone.substring(0, 8) + '***'
    })

    // Get notification service
    const notificationService = NotificationServiceFactory.getInstance(tenantId)

    // Fixed message format
    const title = '🙋 Cliente Solicita Atendimento Humano'
    const message = `Cliente de número ${clientPhone} quer falar com um humano`

    // Create notification
    const notificationId = await notificationService.createNotification({
      targetUserId: 'admin', // Will be broadcast to all admins
      type: NotificationType.TICKET_ASSIGNED,
      title,
      message,
      entityType: 'ticket',
      entityId: `human_request_${Date.now()}`,
      entityData: {
        clientPhone,
        source: 'sofia_ai_agent',
        requestType: 'human_assistance',
        timestamp: new Date().toISOString()
      },
      priority: NotificationPriority.HIGH,
      channels: [NotificationChannel.DASHBOARD],
      actions: [{
        id: 'view_conversations',
        label: 'Ver Conversas',
        type: 'primary',
        action: 'navigate',
        config: {
          url: '/dashboard/conversas'
        }
      }],
      metadata: {
        source: 'sofia_ai_agent',
        triggerEvent: 'human_assistance_requested',
        clientPhone
      }
    })

    const processingTime = Date.now() - startTime

    logger.info('[POST-NOTIFICATION] Notification created successfully', {
      requestId,
      notificationId,
      processingTime: `${processingTime}ms`
    })

    return NextResponse.json({
      success: true,
      data: {
        notificationId,
        message: 'Notification sent successfully'
      },
      meta: {
        requestId,
        processingTime,
        timestamp: new Date().toISOString()
      }
    })

  } catch (error) {
    const processingTime = Date.now() - startTime

    logger.error('[POST-NOTIFICATION] Execution failed', {
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
    version: '2.0.0',
    description: 'AI agent notifies admin when client needs human assistance (SIMPLIFIED)',
    status: 'operational',
    parameters: {
      required: ['tenantId', 'clientPhone'],
      optional: []
    },
    messageFormat: 'Cliente de número {clientPhone} quer falar com um humano',
    priority: 'high',
    timestamp: new Date().toISOString()
  })
}
