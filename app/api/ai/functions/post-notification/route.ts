// app/api/ai/functions/post-notification/route.ts
// AI Function: Sofia Agent notifies admin when client wants human assistance
// SIMPLIFIED: Only tenantId and clientPhone required

import { NextRequest, NextResponse } from 'next/server'
import { NotificationServiceFactory } from '@/lib/services/notification-service'
import { NotificationType, NotificationPriority, NotificationChannel } from '@/lib/types/notification'
import { logger } from '@/lib/utils/logger'
import { z } from 'zod'

// Validation schema - 2 required fields + 1 optional
const PostNotificationSchema = z.object({
  tenantId: z.string().min(1, 'TenantId is required'),
  clientPhone: z.string().min(1, 'Client phone is required'),
  reason: z.string().optional() // Optional: motivo do pedido de atendimento
})

/**
 * POST /api/ai/functions/post-notification
 * Sofia AI Agent notifies admin when client needs human assistance
 *
 * Required fields:
 * - tenantId: Tenant identifier
 * - clientPhone: Client phone number
 *
 * Optional fields:
 * - reason: Motivo do pedido de atendimento humano
 *
 * @example
 * {
 *   "tenantId": "tenant123",
 *   "clientPhone": "+5511999999999",
 *   "reason": "Cliente quer negociar preço especial"
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

    const { tenantId, clientPhone, reason } = validation.data

    logger.info('[POST-NOTIFICATION] Creating notification', {
      requestId,
      tenantId: tenantId.substring(0, 8) + '***',
      clientPhone: clientPhone.substring(0, 8) + '***',
      hasReason: !!reason
    })

    // Get notification service
    logger.debug('[POST-NOTIFICATION] Getting notification service', {
      requestId,
      tenantId: tenantId.substring(0, 8) + '***'
    })

    const notificationService = NotificationServiceFactory.getInstance(tenantId)

    logger.debug('[POST-NOTIFICATION] Notification service obtained', {
      requestId
    })

    // Build message with optional reason
    const title = '🙋 Cliente Solicita Atendimento Humano'
    let message = `Cliente de número ${clientPhone} quer falar com um humano`

    if (reason) {
      message += `\n\n📝 Motivo: ${reason}`
    }

    logger.debug('[POST-NOTIFICATION] Calling createNotification', {
      requestId,
      title,
      message: message.substring(0, 80) + '...',
      hasReason: !!reason
    })

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
        reason: reason || null,
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
        clientPhone,
        reason: reason || null
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
    version: '2.1.0',
    description: 'AI agent notifies admin when client needs human assistance',
    status: 'operational',
    parameters: {
      required: ['tenantId', 'clientPhone'],
      optional: ['reason']
    },
    messageFormat: 'Cliente de número {clientPhone} quer falar com um humano',
    messageFormatWithReason: 'Cliente de número {clientPhone} quer falar com um humano\n\n📝 Motivo: {reason}',
    priority: 'high',
    timestamp: new Date().toISOString()
  })
}
