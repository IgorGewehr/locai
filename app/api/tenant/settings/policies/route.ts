/**
 * POLICIES SETTINGS API ROUTE
 *
 * Manages cancellation policies and terms for tenant
 * Path: tenants/{tenantId}/config/policies
 *
 * @version 1.0.0
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { TenantServiceFactory } from '@/lib/firebase/firestore-v2';
import { validateFirebaseAuth } from '@/lib/middleware/firebase-auth';
import { logger } from '@/lib/utils/logger';
import { handleApiError } from '@/lib/utils/api-errors';
import { sanitizeUserInput } from '@/lib/utils/validation';

// Validation schemas
const CancellationRuleSchema = z.object({
  daysBeforeCheckIn: z.number().min(0),
  refundPercentage: z.number().min(0).max(100),
  description: z.string().optional(),
});

const CancellationPolicySchema = z.object({
  enabled: z.boolean(),
  rules: z.array(CancellationRuleSchema).min(1),
  defaultRefundPercentage: z.number().min(0).max(100),
  forceMajeure: z.boolean(),
  customMessage: z.string().optional(),
});

const PoliciesSchema = z.object({
  cancellationPolicy: CancellationPolicySchema,
  termsAndConditions: z.string().optional(),
  privacyPolicy: z.string().optional(),
});

type CancellationRule = z.infer<typeof CancellationRuleSchema>;
type CancellationPolicy = z.infer<typeof CancellationPolicySchema>;
type Policies = z.infer<typeof PoliciesSchema>;

// Default policies
const DEFAULT_CANCELLATION_POLICY: CancellationPolicy = {
  enabled: true,
  rules: [
    { daysBeforeCheckIn: 7, refundPercentage: 100, description: 'Reembolso total' },
    { daysBeforeCheckIn: 3, refundPercentage: 50, description: 'Reembolso parcial' },
    { daysBeforeCheckIn: 0, refundPercentage: 0, description: 'Sem reembolso' },
  ],
  defaultRefundPercentage: 0,
  forceMajeure: true,
};

const DEFAULT_POLICIES: Policies = {
  cancellationPolicy: DEFAULT_CANCELLATION_POLICY,
  termsAndConditions: '',
  privacyPolicy: '',
};

/**
 * GET /api/tenant/settings/policies
 *
 * Returns current policies for authenticated tenant
 */
export async function GET(request: NextRequest) {
  const requestId = `get-policies_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
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

    logger.info('[GET-POLICIES] Request received', {
      requestId,
      tenantId: tenantId.substring(0, 8) + '***',
      userId: authContext.uid,
    });

    // Load policies from Firestore
    const services = new TenantServiceFactory(tenantId);
    const policiesDoc = await services.db
      .collection('tenants')
      .doc(tenantId)
      .collection('config')
      .doc('policies')
      .get();

    let policies: Policies;

    if (policiesDoc.exists) {
      policies = policiesDoc.data() as Policies;
      logger.info('[GET-POLICIES] Policies loaded from Firestore', {
        requestId,
      });
    } else {
      // Return default policies if don't exist
      policies = DEFAULT_POLICIES;

      logger.info('[GET-POLICIES] No policies found - returning defaults', {
        requestId,
      });
    }

    const processingTime = Date.now() - startTime;

    logger.info('[GET-POLICIES] Request completed', {
      requestId,
      processingTime: `${processingTime}ms`,
    });

    return NextResponse.json({
      success: true,
      data: policies,
      meta: {
        requestId,
        processingTime,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;

    logger.error('[GET-POLICIES] Request failed', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      processingTime: `${processingTime}ms`,
    });

    return handleApiError(error);
  }
}

/**
 * PUT /api/tenant/settings/policies
 *
 * Updates policies for authenticated tenant
 */
export async function PUT(request: NextRequest) {
  const requestId = `update-policies_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
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

    logger.info('[UPDATE-POLICIES] Request received', {
      requestId,
      tenantId: tenantId.substring(0, 8) + '***',
      userId: authContext.uid,
    });

    // Parse and validate body
    const body = await request.json();
    const validation = PoliciesSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request data',
          code: 'VALIDATION_ERROR',
          details: validation.error.errors,
        },
        { status: 400 }
      );
    }

    const policies = validation.data;

    // Validate rules are sorted correctly
    const sortedRules = [...policies.cancellationPolicy.rules].sort(
      (a, b) => b.daysBeforeCheckIn - a.daysBeforeCheckIn
    );

    // Sanitize text inputs
    const sanitizedPolicies: Policies = {
      cancellationPolicy: {
        ...policies.cancellationPolicy,
        rules: sortedRules.map((rule) => ({
          ...rule,
          description: rule.description ? sanitizeUserInput(rule.description) : undefined,
        })),
        customMessage: policies.cancellationPolicy.customMessage
          ? sanitizeUserInput(policies.cancellationPolicy.customMessage)
          : undefined,
      },
      termsAndConditions: policies.termsAndConditions
        ? sanitizeUserInput(policies.termsAndConditions)
        : undefined,
      privacyPolicy: policies.privacyPolicy
        ? sanitizeUserInput(policies.privacyPolicy)
        : undefined,
    };

    // Save to Firestore
    const services = new TenantServiceFactory(tenantId);
    await services.db
      .collection('tenants')
      .doc(tenantId)
      .collection('config')
      .doc('policies')
      .set({
        ...sanitizedPolicies,
        updatedAt: new Date(),
        updatedBy: authContext.uid || 'system',
      });

    logger.info('[UPDATE-POLICIES] Policies updated', {
      requestId,
      enabled: sanitizedPolicies.cancellationPolicy.enabled,
      rulesCount: sanitizedPolicies.cancellationPolicy.rules.length,
    });

    const processingTime = Date.now() - startTime;

    logger.info('[UPDATE-POLICIES] Request completed', {
      requestId,
      processingTime: `${processingTime}ms`,
    });

    return NextResponse.json({
      success: true,
      message: 'Policies updated successfully',
      data: sanitizedPolicies,
      meta: {
        requestId,
        processingTime,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;

    logger.error('[UPDATE-POLICIES] Request failed', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      processingTime: `${processingTime}ms`,
    });

    return handleApiError(error);
  }
}
