/**
 * ABACATEPAY SYNC CRON JOB
 *
 * Periodic synchronization of pending payments with AbacatePay
 * Runs every 30 minutes to ensure payment statuses are up-to-date
 *
 * This handles cases where:
 * - Webhooks failed or were missed
 * - Payments expired
 * - Status updates weren't received
 *
 * @version 1.0.0
 * @see ABACATEPAY_INTEGRATION.md
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/utils/logger';
import {
  syncAllPendingPayments,
  checkExpiredPayments,
} from '@/lib/services/abacatepay-sync-service';

/**
 * POST /api/cron/sync-abacatepay
 *
 * Synchronizes pending payments with AbacatePay
 *
 * Headers:
 * - Authorization: Bearer <CRON_SECRET>
 *
 * Body (optional):
 * - tenantId: Sync specific tenant only
 * - tenantIds: Array of tenant IDs to sync
 *
 * If no tenantId provided, syncs all active tenants
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const cronId = `cron_sync_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  try {
    logger.info('[CRON-SYNC] Starting AbacatePay sync', {
      cronId,
      timestamp: new Date().toISOString(),
    });

    // Validate authorization
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      logger.error('[CRON-SYNC] CRON_SECRET not configured', {
        cronId,
      });

      return NextResponse.json(
        {
          success: false,
          error: 'Server configuration error',
          cronId,
        },
        { status: 500 }
      );
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      logger.warn('[CRON-SYNC] Unauthorized cron request', {
        cronId,
        hasAuthHeader: !!authHeader,
      });

      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
          cronId,
        },
        { status: 401 }
      );
    }

    // Parse request body
    let body: { tenantId?: string; tenantIds?: string[] } = {};

    try {
      const contentType = request.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        body = await request.json();
      }
    } catch (error) {
      // Ignore parse errors - body is optional
    }

    // Get tenant IDs to sync
    const tenantIds = getTenantIdsToSync(body);

    if (tenantIds.length === 0) {
      logger.warn('[CRON-SYNC] No tenants to sync', {
        cronId,
        bodyProvided: Object.keys(body).length > 0,
      });

      return NextResponse.json({
        success: true,
        message: 'No tenants to sync',
        cronId,
        processingTime: Date.now() - startTime,
      });
    }

    logger.info('[CRON-SYNC] Syncing tenants', {
      cronId,
      tenantCount: tenantIds.length,
      tenantIds: tenantIds.map(id => id.substring(0, 8) + '***'),
    });

    // Sync each tenant
    const results = await Promise.allSettled(
      tenantIds.map(async (tenantId) => {
        try {
          logger.info('[CRON-SYNC] Syncing tenant', {
            cronId,
            tenantId: tenantId.substring(0, 8) + '***',
          });

          // Sync pending payments
          const syncResult = await syncAllPendingPayments(tenantId);

          // Check for expired payments
          const expiredResult = await checkExpiredPayments(tenantId);

          logger.info('[CRON-SYNC] Tenant sync completed', {
            cronId,
            tenantId: tenantId.substring(0, 8) + '***',
            sync: syncResult.total,
            expired: expiredResult,
          });

          return {
            tenantId,
            success: true,
            sync: syncResult,
            expired: expiredResult,
          };

        } catch (error) {
          logger.error('[CRON-SYNC] Tenant sync failed', {
            cronId,
            tenantId: tenantId.substring(0, 8) + '***',
            error: error instanceof Error ? error.message : 'Unknown error',
          });

          return {
            tenantId,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }
      })
    );

    // Process results
    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success);
    const failed = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success));

    // Calculate totals
    const totals = {
      pixChecked: 0,
      pixUpdated: 0,
      billingChecked: 0,
      billingUpdated: 0,
      expired: 0,
      errors: 0,
    };

    successful.forEach(result => {
      if (result.status === 'fulfilled') {
        const data = result.value;
        if (data.sync) {
          totals.pixChecked += data.sync.pix.checked;
          totals.pixUpdated += data.sync.pix.updated;
          totals.billingChecked += data.sync.billing.checked;
          totals.billingUpdated += data.sync.billing.updated;
          totals.errors += data.sync.total.errors;
        }
        if (data.expired) {
          totals.expired += data.expired.expired;
        }
      }
    });

    const processingTime = Date.now() - startTime;

    logger.info('[CRON-SYNC] Sync completed', {
      cronId,
      tenantsProcessed: tenantIds.length,
      successful: successful.length,
      failed: failed.length,
      totals,
      processingTime: `${processingTime}ms`,
    });

    return NextResponse.json({
      success: true,
      cronId,
      processingTime,
      timestamp: new Date().toISOString(),
      tenants: {
        total: tenantIds.length,
        successful: successful.length,
        failed: failed.length,
      },
      totals,
      results: results.map(result => {
        if (result.status === 'fulfilled') {
          return {
            tenantId: result.value.tenantId.substring(0, 8) + '***',
            success: result.value.success,
            sync: result.value.sync,
            expired: result.value.expired,
          };
        } else {
          return {
            success: false,
            error: result.reason?.message || 'Unknown error',
          };
        }
      }),
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;

    logger.error('[CRON-SYNC] Cron job failed', {
      cronId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack?.substring(0, 500) : undefined,
      processingTime: `${processingTime}ms`,
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Cron job failed',
        cronId,
        details: process.env.NODE_ENV === 'development'
          ? error instanceof Error ? error.message : 'Unknown error'
          : undefined,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/cron/sync-abacatepay
 *
 * Health check and last run info
 */
export async function GET() {
  return NextResponse.json({
    service: 'AbacatePay Sync Cron',
    status: 'active',
    timestamp: new Date().toISOString(),
    configured: !!process.env.CRON_SECRET,
    interval: '30 minutes',
    description: 'Synchronizes pending payments with AbacatePay',
  });
}

// ===== HELPER FUNCTIONS =====

/**
 * Get tenant IDs to sync from request body
 *
 * Priority:
 * 1. tenantIds array (if provided)
 * 2. Single tenantId (if provided)
 * 3. All active tenants (from environment or database)
 */
function getTenantIdsToSync(body: { tenantId?: string; tenantIds?: string[] }): string[] {
  // If specific tenants provided, use them
  if (body.tenantIds && Array.isArray(body.tenantIds) && body.tenantIds.length > 0) {
    return body.tenantIds;
  }

  if (body.tenantId && typeof body.tenantId === 'string') {
    return [body.tenantId];
  }

  // Otherwise, get from environment variable
  // Format: TENANT_IDS="tenant1,tenant2,tenant3"
  const envTenantIds = process.env.TENANT_IDS;

  if (envTenantIds) {
    return envTenantIds.split(',').map(id => id.trim()).filter(id => id.length > 0);
  }

  // TODO: In production, query database for all active tenants
  // For now, return empty array (no automatic sync without configuration)
  logger.warn('[CRON-SYNC] No tenant IDs configured', {
    message: 'Set TENANT_IDS environment variable or provide tenantId in request body',
  });

  return [];
}
