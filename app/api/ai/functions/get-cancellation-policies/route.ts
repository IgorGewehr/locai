// app/api/ai/functions/get-cancellation-policies/route.ts
// AI Function: Get tenant cancellation policies (only tenantId required)

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase/config'
import { logger } from '@/lib/utils/logger'
import { z } from 'zod'

// Validation schema
const GetCancellationPoliciesSchema = z.object({
  tenantId: z.string().min(1, 'TenantId is required')
})

interface CancellationPolicy {
  id: string
  name: string
  description: string
  rules: Array<{
    daysBeforeCheckIn: number
    refundPercentage: number
    description: string
  }>
  isDefault?: boolean
  createdAt?: Date
  updatedAt?: Date
}

/**
 * POST /api/ai/functions/get-cancellation-policies
 * Sofia AI Agent retrieves cancellation policies to inform customers
 *
 * @example
 * {
 *   "tenantId": "tenant123"
 * }
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const requestId = `get_policies_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`

  try {
    logger.info('[GET-CANCELLATION-POLICIES] Starting execution', {
      requestId,
      function: 'get-cancellation-policies'
    })

    // Parse and validate
    const body = await request.json()
    const validation = GetCancellationPoliciesSchema.safeParse(body)

    if (!validation.success) {
      logger.warn('[GET-CANCELLATION-POLICIES] Validation failed', {
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

    logger.info('[GET-CANCELLATION-POLICIES] Fetching policies', {
      requestId,
      tenantId: tenantId.substring(0, 8) + '***'
    })

    // Fetch from Firestore - CORRECTED PATH
    // Try new path first (config/policies), fallback to settings-service structure
    const policiesRef = db
      .collection('tenants')
      .doc(tenantId)
      .collection('config')
      .doc('policies')

    const policiesDoc = await policiesRef.get()

    let policies: CancellationPolicy[] = []
    let hasCustomPolicies = false

    if (policiesDoc.exists) {
      const data = policiesDoc.data()

      // Convert new structure to expected array format
      if (data?.cancellationPolicy) {
        const policy = data.cancellationPolicy
        policies = [{
          id: 'tenant-policy',
          name: 'Política de Cancelamento',
          description: policy.customMessage || 'Política de cancelamento configurada',
          rules: policy.rules.map((rule: any) => ({
            daysBeforeCheckIn: rule.daysBeforeCheckIn,
            refundPercentage: rule.refundPercentage,
            description: rule.description || `${rule.refundPercentage}% de reembolso`
          })),
          isDefault: false
        }]
        hasCustomPolicies = true

        logger.info('[GET-CANCELLATION-POLICIES] Found policy in config/policies', {
          requestId,
          rulesCount: policy.rules.length
        })
      }
    }

    // Fallback to default if no custom policy found
    if (policies.length === 0) {
      logger.info('[GET-CANCELLATION-POLICIES] No custom policy found, using default', {
        requestId
      })

      policies = [{
        id: 'default-flexible',
        name: 'Política Flexível',
        description: 'Cancelamento gratuito até 7 dias antes do check-in',
        rules: [
          {
            daysBeforeCheckIn: 7,
            refundPercentage: 100,
            description: 'Reembolso total para cancelamentos com 7+ dias de antecedência'
          },
          {
            daysBeforeCheckIn: 3,
            refundPercentage: 50,
            description: 'Reembolso de 50% para cancelamentos entre 3-7 dias'
          },
          {
            daysBeforeCheckIn: 0,
            refundPercentage: 0,
            description: 'Sem reembolso para cancelamentos com menos de 3 dias'
          }
        ],
        isDefault: true
      }]
    }

    const processingTime = Date.now() - startTime

    logger.info('[GET-CANCELLATION-POLICIES] Policies retrieved successfully', {
      requestId,
      tenantId: tenantId.substring(0, 8) + '***',
      policiesCount: policies.length,
      hasCustomPolicies,
      processingTime: `${processingTime}ms`
    })

    return NextResponse.json({
      success: true,
      data: {
        policies,
        hasCustomPolicies,
        defaultPolicy: policies.find(p => p.isDefault) || policies[0]
      },
      meta: {
        requestId,
        processingTime,
        timestamp: new Date().toISOString()
      }
    })

  } catch (error) {
    const processingTime = Date.now() - startTime

    logger.error('[GET-CANCELLATION-POLICIES] Execution failed', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      processingTime: `${processingTime}ms`
    })

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get cancellation policies',
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
 * GET /api/ai/functions/get-cancellation-policies
 * Health check and function info
 */
export async function GET() {
  return NextResponse.json({
    function: 'get-cancellation-policies',
    version: '1.0.0',
    description: 'AI agent retrieves tenant cancellation policies to inform customers',
    status: 'operational',
    parameters: {
      required: ['tenantId'],
      optional: []
    },
    returns: {
      policies: 'Array of CancellationPolicy objects',
      hasCustomPolicies: 'boolean',
      defaultPolicy: 'Default policy object'
    },
    timestamp: new Date().toISOString()
  })
}
