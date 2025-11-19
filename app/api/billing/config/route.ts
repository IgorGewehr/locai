/**
 * API Route: Billing Auto-Charge Configuration
 * Manages auto-billing settings for reminders
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { validateFirebaseAuth } from '@/lib/middleware/firebase-auth';
import { handleApiError } from '@/lib/utils/api-errors';
import { logger } from '@/lib/utils/logger';
import { sanitizeUserInput } from '@/lib/utils/validation';
import { TenantServiceFactory } from '@/lib/firebase/firestore-v2';

// Validation Schema
const AutoBillingConfigSchema = z.object({
  enabled: z.boolean(),
  daysBeforeDue: z.number().int().min(1).max(30),
  message: z.string().max(1000),
  sendTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format (HH:MM)'),
});

export type AutoBillingConfig = z.infer<typeof AutoBillingConfigSchema>;

/**
 * GET - Retrieve auto-billing configuration
 */
export async function GET(request: NextRequest) {
  const requestId = `billing-config-get_${Date.now()}`;

  try {
    // Authenticate
    const authContext = await validateFirebaseAuth(request);
    if (!authContext.authenticated || !authContext.tenantId) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    const tenantId = authContext.tenantId;

    logger.info('[BILLING-CONFIG] Fetching configuration', {
      requestId,
      tenantId: tenantId.substring(0, 8) + '***',
    });

    // Get configuration from Firestore
    const services = new TenantServiceFactory(tenantId);

    // Usando coleção específica para config de billing
    const configDoc = await services.getFirestore()
      .collection(`tenants/${tenantId}/billing_config`)
      .doc('auto_charge')
      .get();

    if (!configDoc.exists) {
      // Return default configuration
      const defaultConfig: AutoBillingConfig = {
        enabled: false,
        daysBeforeDue: 3,
        message: '',
        sendTime: '09:00',
      };

      logger.info('[BILLING-CONFIG] No configuration found, returning defaults', {
        requestId,
        tenantId: tenantId.substring(0, 8) + '***',
      });

      return NextResponse.json({
        success: true,
        data: defaultConfig,
        meta: {
          requestId,
          timestamp: new Date().toISOString(),
          isDefault: true,
        },
      });
    }

    const config = configDoc.data() as AutoBillingConfig;

    logger.info('[BILLING-CONFIG] Configuration retrieved', {
      requestId,
      tenantId: tenantId.substring(0, 8) + '***',
      enabled: config.enabled,
    });

    return NextResponse.json({
      success: true,
      data: config,
      meta: {
        requestId,
        timestamp: new Date().toISOString(),
        isDefault: false,
      },
    });

  } catch (error) {
    logger.error('[BILLING-CONFIG] GET failed', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return handleApiError(error);
  }
}

/**
 * PUT - Update auto-billing configuration
 */
export async function PUT(request: NextRequest) {
  const requestId = `billing-config-put_${Date.now()}`;

  try {
    // Authenticate
    const authContext = await validateFirebaseAuth(request);
    if (!authContext.authenticated || !authContext.tenantId) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    const tenantId = authContext.tenantId;
    const userId = authContext.userId;

    // Parse and validate body
    const body = await request.json();
    const result = AutoBillingConfigSchema.safeParse(body);

    if (!result.success) {
      logger.warn('[BILLING-CONFIG] Validation failed', {
        requestId,
        tenantId: tenantId.substring(0, 8) + '***',
        errors: result.error.issues,
      });

      return NextResponse.json(
        {
          error: 'Invalid configuration',
          code: 'VALIDATION_ERROR',
          details: result.error.issues,
        },
        { status: 400 }
      );
    }

    const config = result.data;

    // Sanitize message
    const sanitizedConfig: AutoBillingConfig = {
      ...config,
      message: sanitizeUserInput(config.message),
    };

    // Additional validation: if enabled, message is required
    if (sanitizedConfig.enabled && !sanitizedConfig.message.trim()) {
      return NextResponse.json(
        {
          error: 'Message is required when auto-billing is enabled',
          code: 'VALIDATION_ERROR',
        },
        { status: 400 }
      );
    }

    logger.info('[BILLING-CONFIG] Updating configuration', {
      requestId,
      tenantId: tenantId.substring(0, 8) + '***',
      enabled: sanitizedConfig.enabled,
      daysBeforeDue: sanitizedConfig.daysBeforeDue,
      sendTime: sanitizedConfig.sendTime,
      messageLength: sanitizedConfig.message.length,
    });

    // Save to Firestore
    const services = new TenantServiceFactory(tenantId);
    const configRef = services.getFirestore()
      .collection(`tenants/${tenantId}/billing_config`)
      .doc('auto_charge');

    await configRef.set({
      ...sanitizedConfig,
      updatedAt: new Date(),
      updatedBy: userId,
    }, { merge: true });

    logger.info('[BILLING-CONFIG] Configuration updated successfully', {
      requestId,
      tenantId: tenantId.substring(0, 8) + '***',
    });

    return NextResponse.json({
      success: true,
      message: 'Configuration updated successfully',
      data: sanitizedConfig,
      meta: {
        requestId,
        timestamp: new Date().toISOString(),
      },
    });

  } catch (error) {
    logger.error('[BILLING-CONFIG] PUT failed', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return handleApiError(error);
  }
}
