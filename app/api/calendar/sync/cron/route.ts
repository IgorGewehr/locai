/**
 * Calendar Sync Cron Job API
 *
 * POST /api/calendar/sync/cron
 * Automatically synchronizes all active calendar configurations
 *
 * Should be called by a cron scheduler:
 * - Vercel Cron (vercel.json)
 * - External cron (curl)
 * - AWS CloudWatch Events
 * - Google Cloud Scheduler
 *
 * Requires CRON_SECRET for authentication
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/utils/logger';
import { calendarSyncService } from '@/lib/services/calendar-sync-service';
import { TenantServiceFactory } from '@/lib/services/tenant-service-factory';
import admin from 'firebase-admin';

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
    });
  } catch (error) {
    logger.error('Firebase Admin initialization failed', { error });
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      logger.warn('Unauthorized cron job attempt', {
        authHeader: authHeader ? 'present' : 'missing',
      });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    logger.info('Calendar sync cron job started');

    // Get all tenants
    const db = admin.firestore();
    const tenantsSnapshot = await db.collection('tenants').get();

    let totalProcessed = 0;
    let totalSuccess = 0;
    let totalFailed = 0;
    const results: any[] = [];

    // Process each tenant
    for (const tenantDoc of tenantsSnapshot.docs) {
      const tenantId = tenantDoc.id;

      try {
        // Get active sync configurations for this tenant
        const configs = await calendarSyncService.getActiveSyncConfigurations(
          tenantId
        );

        logger.info('Processing tenant', {
          tenantId,
          configurationsCount: configs.length,
        });

        // Sync each property
        for (const config of configs) {
          // Skip if sync frequency is manual
          if (config.syncFrequency === 'manual') {
            continue;
          }

          // Check if it's time to sync based on frequency
          const now = new Date();
          if (config.lastSyncAt) {
            const hoursSinceLastSync =
              (now.getTime() - config.lastSyncAt.getTime()) / (1000 * 60 * 60);

            if (config.syncFrequency === 'hourly' && hoursSinceLastSync < 1) {
              continue; // Skip if synced less than 1 hour ago
            }

            if (config.syncFrequency === 'daily' && hoursSinceLastSync < 24) {
              continue; // Skip if synced less than 24 hours ago
            }
          }

          totalProcessed++;

          try {
            const result = await calendarSyncService.syncProperty(
              config.propertyId,
              tenantId
            );

            if (result.success) {
              totalSuccess++;
            } else {
              totalFailed++;
            }

            results.push({
              tenantId,
              propertyId: config.propertyId,
              success: result.success,
              eventsImported: result.eventsImported,
              periodsCreated: result.periodsCreated,
              errors: result.errors,
            });

            logger.info('Property sync completed', {
              tenantId,
              propertyId: config.propertyId,
              success: result.success,
            });
          } catch (syncError) {
            totalFailed++;
            logger.error('Property sync failed', {
              tenantId,
              propertyId: config.propertyId,
              error:
                syncError instanceof Error
                  ? syncError.message
                  : 'Unknown error',
            });

            results.push({
              tenantId,
              propertyId: config.propertyId,
              success: false,
              error:
                syncError instanceof Error
                  ? syncError.message
                  : 'Unknown error',
            });
          }

          // Add small delay to avoid rate limiting
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      } catch (tenantError) {
        logger.error('Error processing tenant', {
          tenantId,
          error:
            tenantError instanceof Error
              ? tenantError.message
              : 'Unknown error',
        });
      }
    }

    const duration = Date.now() - startTime;

    logger.info('Calendar sync cron job completed', {
      totalProcessed,
      totalSuccess,
      totalFailed,
      duration,
    });

    return NextResponse.json({
      success: true,
      summary: {
        totalProcessed,
        totalSuccess,
        totalFailed,
        duration,
      },
      results: results.slice(0, 50), // Limit response size
      message: `Sincronização concluída: ${totalSuccess} sucesso, ${totalFailed} falhas`,
    });
  } catch (error) {
    const duration = Date.now() - startTime;

    logger.error('Calendar sync cron job failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      duration,
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Cron job failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        duration,
      },
      { status: 500 }
    );
  }
}

// Also support GET for manual testing
export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'Calendar sync cron endpoint',
    method: 'POST',
    auth: 'Bearer token required (CRON_SECRET)',
    usage: 'Called by cron scheduler to sync all active calendars',
  });
}
