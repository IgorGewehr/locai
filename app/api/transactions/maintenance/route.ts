import { NextRequest, NextResponse } from 'next/server';
import { validateFirebaseAuth } from '@/lib/middleware/firebase-auth';
import { runMaintenanceForTenant } from '@/lib/cron/transaction-maintenance';
import { logger } from '@/lib/utils/logger';

/**
 * POST /api/transactions/maintenance
 *
 * Manually trigger transaction maintenance for the authenticated tenant:
 * - Detect and update overdue transactions
 * - Process recurring transactions
 * - Get transactions needing reminders
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Check authentication
    const authContext = await validateFirebaseAuth(request);
    if (!authContext.authenticated || !authContext.tenantId) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    logger.info('[TransactionMaintenance API] Starting manual maintenance', {
      tenantId: authContext.tenantId.substring(0, 8) + '***',
      triggeredBy: authContext.userId
    });

    // Run maintenance for this tenant
    const results = await runMaintenanceForTenant(authContext.tenantId);

    const duration = Date.now() - startTime;

    if (results.success) {
      logger.info('[TransactionMaintenance API] Maintenance completed successfully', {
        tenantId: authContext.tenantId.substring(0, 8) + '***',
        ...results,
        duration: `${duration}ms`
      });

      return NextResponse.json({
        success: true,
        data: {
          overdueUpdated: results.overdueUpdated,
          recurringCreated: results.recurringCreated,
          remindersNeeded: results.remindersNeeded,
        },
        meta: {
          processingTime: duration,
          timestamp: new Date().toISOString()
        },
        message: `Manutenção concluída: ${results.overdueUpdated} vencidas atualizadas, ${results.recurringCreated} recorrentes criadas, ${results.remindersNeeded} lembretes necessários`
      });
    } else {
      logger.error('[TransactionMaintenance API] Maintenance failed', {
        tenantId: authContext.tenantId.substring(0, 8) + '***',
        error: results.error,
        duration: `${duration}ms`
      });

      return NextResponse.json(
        {
          success: false,
          error: results.error || 'Falha na manutenção',
          code: 'MAINTENANCE_ERROR'
        },
        { status: 500 }
      );
    }
  } catch (error) {
    const duration = Date.now() - startTime;

    logger.error('[TransactionMaintenance API] Unexpected error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: `${duration}ms`
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Erro inesperado na manutenção',
        code: 'INTERNAL_ERROR',
        details: process.env.NODE_ENV === 'development'
          ? error instanceof Error ? error.message : 'Unknown error'
          : undefined
      },
      { status: 500 }
    );
  }
}
