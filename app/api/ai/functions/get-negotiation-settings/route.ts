// app/api/ai/functions/get-negotiation-settings/route.ts
// AI Function: Get tenant negotiation settings (only tenantId required)

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase/config'
import { logger } from '@/lib/utils/logger'
import { z } from 'zod'
import { NegotiationSettings, DEFAULT_NEGOTIATION_SETTINGS } from '@/lib/types/tenant-settings'

// Validation schema
const GetNegotiationSettingsSchema = z.object({
  tenantId: z.string().min(1, 'TenantId is required')
})

/**
 * POST /api/ai/functions/get-negotiation-settings
 * Sofia AI Agent retrieves negotiation settings for calculations
 *
 * @example
 * {
 *   "tenantId": "tenant123"
 * }
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const requestId = `get_negotiation_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`

  try {
    logger.info('[GET-NEGOTIATION-SETTINGS] Starting execution', {
      requestId,
      function: 'get-negotiation-settings'
    })

    // Parse and validate
    const body = await request.json()
    const validation = GetNegotiationSettingsSchema.safeParse(body)

    if (!validation.success) {
      logger.warn('[GET-NEGOTIATION-SETTINGS] Validation failed', {
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

    const { tenantId } = validation.data

    logger.info('[GET-NEGOTIATION-SETTINGS] Fetching settings', {
      requestId,
      tenantId: tenantId.substring(0, 8) + '***'
    })

    // Fetch from Firestore
    const settingsRef = db
      .collection('tenants')
      .doc(tenantId)
      .collection('settings')
      .doc('negotiation')

    const settingsDoc = await settingsRef.get()

    let settings: NegotiationSettings
    let isDefault = false

    if (!settingsDoc.exists) {
      logger.info('[GET-NEGOTIATION-SETTINGS] Using default settings', {
        requestId,
        tenantId: tenantId.substring(0, 8) + '***'
      })

      settings = DEFAULT_NEGOTIATION_SETTINGS
      isDefault = true
    } else {
      settings = settingsDoc.data() as NegotiationSettings
    }

    const processingTime = Date.now() - startTime

    logger.info('[GET-NEGOTIATION-SETTINGS] Settings retrieved successfully', {
      requestId,
      tenantId: tenantId.substring(0, 8) + '***',
      isDefault,
      allowNegotiation: settings.allowAINegotiation,
      maxDiscount: settings.maxDiscountPercentage,
      processingTime: `${processingTime}ms`
    })

    return NextResponse.json({
      success: true,
      data: {
        settings,
        isDefault
      },
      meta: {
        requestId,
        processingTime,
        timestamp: new Date().toISOString()
      }
    })

  } catch (error) {
    const processingTime = Date.now() - startTime

    logger.error('[GET-NEGOTIATION-SETTINGS] Execution failed', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      processingTime: `${processingTime}ms`
    })

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get negotiation settings',
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
 * GET /api/ai/functions/get-negotiation-settings
 * Health check and function info
 */
export async function GET() {
  return NextResponse.json({
    function: 'get-negotiation-settings',
    version: '1.0.0',
    description: 'AI agent retrieves tenant negotiation settings for price calculations',
    status: 'operational',
    parameters: {
      required: ['tenantId'],
      optional: []
    },
    returns: {
      settings: 'NegotiationSettings object',
      isDefault: 'boolean indicating if using default settings'
    },
    timestamp: new Date().toISOString()
  })
}
