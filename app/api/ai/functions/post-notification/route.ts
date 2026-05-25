// app/api/ai/functions/post-notification/route.ts
// AI Function: Sofia Agent notifies admin when client wants human assistance
// FIXED: Now properly notifies all admins using their real UIDs

import { NextRequest, NextResponse } from 'next/server'
import { notifyAdminsHumanAssistanceRequest } from '@/lib/utils/admin-notifications'
import { setLeadEscalation } from '@/lib/services/lead-lookup'
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
 * FIXED: Now uses notifyAdminsHumanAssistanceRequest() to properly broadcast
 * to all admins (users with idog: true) using their real UIDs instead of
 * a generic 'admin' string that would never be found.
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

    logger.info('[POST-NOTIFICATION] Creating notifications for all admins', {
      requestId,
      tenantId: tenantId.substring(0, 8) + '***',
      clientPhone: clientPhone.substring(0, 8) + '***',
      hasReason: !!reason
    })

    // FIXED: Use notifyAdminsHumanAssistanceRequest which properly
    // notifies all admins with their real UIDs
    await notifyAdminsHumanAssistanceRequest({
      phone: clientPhone,
      tenantId,
      reason: reason || undefined
    })

    // Persiste a escalação no lead para que apareça na Triagem Inteligente
    // (o broadcast acima é transitório; isto torna o sinal consultável).
    try {
      await setLeadEscalation(tenantId, clientPhone, reason)
    } catch (escalationError) {
      logger.warn('[POST-NOTIFICATION] Failed to persist escalation on lead', {
        requestId,
        error: escalationError instanceof Error ? escalationError.message : 'Unknown',
      })
    }

    const processingTime = Date.now() - startTime

    logger.info('[POST-NOTIFICATION] Notifications sent to all admins successfully', {
      requestId,
      processingTime: `${processingTime}ms`
    })

    return NextResponse.json({
      success: true,
      data: {
        message: 'Notifications sent to all admins successfully'
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
    version: '2.2.0', // Bumped version for fix
    description: 'AI agent notifies all admins when client needs human assistance',
    status: 'operational',
    parameters: {
      required: ['tenantId', 'clientPhone'],
      optional: ['reason']
    },
    messageFormat: 'Cliente {clientPhone} solicitou atendimento humano',
    messageFormatWithReason: 'Cliente {clientPhone} solicitou atendimento humano: {reason}',
    priority: 'high',
    fixedInVersion: '2.2.0 - Now properly broadcasts to all admins with real UIDs',
    timestamp: new Date().toISOString()
  })
}
