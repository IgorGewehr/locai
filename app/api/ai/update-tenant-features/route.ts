/**
 * UPDATE TENANT FEATURES API ROUTE
 *
 * Updates tenant AI feature flags and agent behavior
 * Invalidates cache to force reload on next N8N request
 *
 * @version 1.0.0
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { TenantServiceFactory } from '@/lib/firebase/firestore-v2';
import { tenantConfigCache } from '@/lib/services/tenant-config-cache';
import { validateFirebaseAuth } from '@/lib/middleware/firebase-auth';
import { logger } from '@/lib/utils/logger';
import { handleApiError } from '@/lib/utils/api-errors';
import type { TenantConfig, UpdateFeaturesResponse } from '@/lib/types/tenant-config';

// Validation schema
const UpdateFeaturesSchema = z.object({
  features: z.object({
    payments: z.boolean().optional(),
    contracts: z.boolean().optional(),
    analytics: z.boolean().optional(),
    customReports: z.boolean().optional(),
    autoFollowUp: z.boolean().optional(),
  }).optional(),

  paymentSettings: z.object({
    provider: z.enum(['abacatepay', 'stripe', 'mercadopago']).optional(),
    enableAutoReminders: z.boolean().optional(),
    defaultExpiration: z.number().min(1).max(168).optional(), // 1h to 7 days
    enablePixQrCode: z.boolean().optional(),
    enablePaymentLinks: z.boolean().optional(),
  }).optional(),

  agentBehavior: z.object({
    router: z.object({
      paymentsSpecialist: z.boolean().optional(),
      contractsSpecialist: z.boolean().optional(),
    }).optional(),
    sales: z.object({
      allowNegotiation: z.boolean().optional(),
      maxDiscount: z.number().min(0).max(100).optional(),
      enableDynamicDiscounts: z.boolean().optional(),
      autoApplyPixDiscount: z.boolean().optional(),
    }).optional(),
    search: z.object({
      maxPropertiesPerSearch: z.number().min(1).max(10).optional(),
      autoSendPhotos: z.boolean().optional(),
      autoSendMap: z.boolean().optional(),
    }).optional(),
    booking: z.object({
      requireEmail: z.boolean().optional(),
      requireDocument: z.boolean().optional(),
      autoScheduleKeyPickup: z.boolean().optional(),
    }).optional(),
    support: z.object({
      allowCancellations: z.boolean().optional(),
      allowModifications: z.boolean().optional(),
      autoTransferThreshold: z.number().min(1).max(50).optional(),
    }).optional(),
  }).optional(),
});

/**
 * POST /api/ai/update-tenant-features
 *
 * Body:
 * {
 *   "features": {
 *     "payments": true,
 *     "contracts": false
 *   },
 *   "agentBehavior": {
 *     "router": {
 *       "paymentsSpecialist": true
 *     }
 *   }
 * }
 */
export async function POST(request: NextRequest) {
  const requestId = `update-features_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
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

    logger.info('[UPDATE-TENANT-FEATURES] Request received', {
      requestId,
      tenantId: tenantId.substring(0, 8) + '***',
      userId: authContext.uid,
    });

    // Parse and validate body
    const body = await request.json();
    const validation = UpdateFeaturesSchema.safeParse(body);

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

    const updates = validation.data;

    // Load current config
    const services = new TenantServiceFactory(tenantId);
    const configRef = services.db
      .collection('tenants')
      .doc(tenantId)
      .collection('config')
      .doc('ai-config');

    const configDoc = await configRef.get();
    let currentConfig: TenantConfig;

    if (configDoc.exists) {
      currentConfig = configDoc.data() as TenantConfig;
    } else {
      // Create default config if doesn't exist
      const { DEFAULT_AI_FEATURES, DEFAULT_AGENT_BEHAVIOR } = await import('@/lib/types/tenant-config');

      currentConfig = {
        tenantId,
        features: DEFAULT_AI_FEATURES,
        agentBehavior: DEFAULT_AGENT_BEHAVIOR,
        createdAt: new Date(),
        updatedAt: new Date(),
        updatedBy: authContext.uid || 'system',
        version: 1,
      };
    }

    // Merge updates
    const updatedConfig: TenantConfig = {
      ...currentConfig,
      ...(updates.features && {
        features: {
          ...currentConfig.features,
          ...updates.features,
        },
      }),
      ...(updates.paymentSettings && {
        paymentSettings: {
          ...currentConfig.paymentSettings,
          ...updates.paymentSettings,
        },
      }),
      ...(updates.agentBehavior && {
        agentBehavior: {
          router: {
            ...currentConfig.agentBehavior.router,
            ...updates.agentBehavior.router,
          },
          sales: {
            ...currentConfig.agentBehavior.sales,
            ...updates.agentBehavior.sales,
          },
          search: {
            ...currentConfig.agentBehavior.search,
            ...updates.agentBehavior.search,
          },
          booking: {
            ...currentConfig.agentBehavior.booking,
            ...updates.agentBehavior.booking,
          },
          support: {
            ...currentConfig.agentBehavior.support,
            ...updates.agentBehavior.support,
          },
        },
      }),
      updatedAt: new Date(),
      updatedBy: authContext.uid || 'system',
      version: currentConfig.version + 1,
    };

    // Auto-enable specialist routing when feature is enabled
    if (updates.features?.payments && updatedConfig.agentBehavior.router) {
      updatedConfig.agentBehavior.router.paymentsSpecialist = true;
    }
    if (updates.features?.contracts && updatedConfig.agentBehavior.router) {
      updatedConfig.agentBehavior.router.contractsSpecialist = true;
    }

    // Save to Firestore
    await configRef.set(updatedConfig);

    logger.info('[UPDATE-TENANT-FEATURES] Config updated', {
      requestId,
      tenantId: tenantId.substring(0, 8) + '***',
      version: updatedConfig.version,
      featuresChanged: updates.features ? Object.keys(updates.features) : [],
      behaviorChanged: updates.agentBehavior ? Object.keys(updates.agentBehavior) : [],
    });

    // Invalidate cache
    tenantConfigCache.invalidate(tenantId);

    logger.info('[UPDATE-TENANT-FEATURES] Cache invalidated', {
      requestId,
      tenantId: tenantId.substring(0, 8) + '***',
    });

    const processingTime = Date.now() - startTime;

    const response: UpdateFeaturesResponse = {
      success: true,
      message: 'Tenant features updated successfully',
      data: updatedConfig,
    };

    logger.info('[UPDATE-TENANT-FEATURES] Request completed', {
      requestId,
      processingTime: `${processingTime}ms`,
    });

    return NextResponse.json(response);

  } catch (error) {
    const processingTime = Date.now() - startTime;

    logger.error('[UPDATE-TENANT-FEATURES] Request failed', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      processingTime: `${processingTime}ms`,
    });

    return handleApiError(error);
  }
}

/**
 * GET /api/ai/update-tenant-features (for documentation)
 */
export async function GET() {
  return NextResponse.json({
    endpoint: 'POST /api/ai/update-tenant-features',
    description: 'Update tenant AI feature flags and agent behavior',
    authentication: 'Required (Firebase Auth)',
    body: {
      features: {
        type: 'object',
        optional: true,
        properties: {
          payments: 'boolean - Enable payments specialist',
          contracts: 'boolean - Enable contracts specialist',
          analytics: 'boolean - Enable analytics',
          customReports: 'boolean - Enable custom reports',
          autoFollowUp: 'boolean - Enable auto follow-ups',
        },
      },
      paymentSettings: {
        type: 'object',
        optional: true,
        properties: {
          provider: 'enum - abacatepay|stripe|mercadopago',
          enableAutoReminders: 'boolean - Auto send payment reminders',
          defaultExpiration: 'number - Payment link expiration (hours)',
          enablePixQrCode: 'boolean - Enable PIX QR Code',
          enablePaymentLinks: 'boolean - Enable payment links',
        },
      },
      agentBehavior: {
        type: 'object',
        optional: true,
        description: 'See full schema in /lib/types/tenant-config.ts',
      },
    },
    example: {
      features: {
        payments: true,
        contracts: false,
      },
      agentBehavior: {
        router: {
          paymentsSpecialist: true,
        },
        sales: {
          maxDiscount: 20,
        },
      },
    },
  });
}
