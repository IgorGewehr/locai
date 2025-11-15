/**
 * ABACATEPAY SYNCHRONIZATION SERVICE
 *
 * Handles periodic status checks and reconciliation for pending payments
 * Ensures transaction statuses are always up-to-date even if webhooks fail
 *
 * @version 1.0.0
 * @see ABACATEPAY_INTEGRATION.md
 */

import { logger } from '@/lib/utils/logger';
import { TenantServiceFactory } from '@/lib/firebase/firestore-v2';
import { getAbacatePayService } from '@/lib/services/abacatepay-service';
import { TransactionStatus } from '@/lib/types/transaction-unified';
import { isAbacatePaySuccess } from '@/lib/types/abacatepay';
import type { Transaction } from '@/lib/types/transaction-unified';

/**
 * Sync pending PIX payments for a tenant
 * Checks all pending transactions with PIX IDs and updates their status
 */
export async function syncPendingPixPayments(tenantId: string): Promise<{
  checked: number;
  updated: number;
  errors: number;
}> {
  const syncId = `sync_pix_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  logger.info('[ABACATEPAY-SYNC] Starting PIX payment sync', {
    syncId,
    tenantId: tenantId.substring(0, 8) + '***',
  });

  try {
    const services = new TenantServiceFactory(tenantId);
    const abacatepay = getAbacatePayService();

    // Get all pending transactions with PIX IDs
    const allTransactions = await services.transactions.getAll();
    const pendingPixTransactions = allTransactions.filter(
      (t: Transaction) =>
        t.status === TransactionStatus.PENDING &&
        t.abacatepayPixId
    );

    logger.info('[ABACATEPAY-SYNC] Found pending PIX transactions', {
      syncId,
      count: pendingPixTransactions.length,
    });

    let checked = 0;
    let updated = 0;
    let errors = 0;

    // Check each transaction
    for (const transaction of pendingPixTransactions) {
      try {
        checked++;

        const pixId = transaction.abacatepayPixId!;
        const response = await abacatepay.checkPixQrCode(pixId);

        if (isAbacatePaySuccess(response)) {
          const { status, expiresAt } = response.data;

          // Update if status changed
          if (status !== transaction.abacatepayStatus) {
            logger.info('[ABACATEPAY-SYNC] Status changed, updating transaction', {
              syncId,
              transactionId: transaction.id,
              oldStatus: transaction.abacatepayStatus,
              newStatus: status,
            });

            const newInternalStatus = mapAbacatePayStatus(status);

            await services.transactions.update(transaction.id, {
              status: newInternalStatus,
              abacatepayStatus: status,
              abacatepayExpiresAt: new Date(expiresAt),
              paymentDate: status === 'PAID' ? new Date() : undefined,
              updatedAt: new Date(),
            });

            updated++;
          }
        } else {
          logger.warn('[ABACATEPAY-SYNC] Failed to check PIX status', {
            syncId,
            transactionId: transaction.id,
            pixId,
            error: response.error,
          });
          errors++;
        }

        // Small delay to avoid rate limiting
        await delay(100);

      } catch (error) {
        logger.error('[ABACATEPAY-SYNC] Error checking transaction', {
          syncId,
          transactionId: transaction.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        errors++;
      }
    }

    logger.info('[ABACATEPAY-SYNC] PIX payment sync completed', {
      syncId,
      checked,
      updated,
      errors,
    });

    return { checked, updated, errors };

  } catch (error) {
    logger.error('[ABACATEPAY-SYNC] PIX payment sync failed', {
      syncId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    throw error;
  }
}

/**
 * Sync pending billing payments for a tenant
 * Checks all pending transactions with billing IDs and updates their status
 */
export async function syncPendingBillings(tenantId: string): Promise<{
  checked: number;
  updated: number;
  errors: number;
}> {
  const syncId = `sync_billing_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  logger.info('[ABACATEPAY-SYNC] Starting billing sync', {
    syncId,
    tenantId: tenantId.substring(0, 8) + '***',
  });

  try {
    const services = new TenantServiceFactory(tenantId);
    const abacatepay = getAbacatePayService();

    // Get all pending transactions with billing IDs
    const allTransactions = await services.transactions.getAll();
    const pendingBillingTransactions = allTransactions.filter(
      (t: Transaction) =>
        t.status === TransactionStatus.PENDING &&
        t.abacatepayBillingId
    );

    logger.info('[ABACATEPAY-SYNC] Found pending billing transactions', {
      syncId,
      count: pendingBillingTransactions.length,
    });

    // Get all billings from AbacatePay
    const billingsResponse = await abacatepay.listBillings();

    if (!isAbacatePaySuccess(billingsResponse)) {
      logger.error('[ABACATEPAY-SYNC] Failed to list billings', {
        syncId,
        error: billingsResponse.error,
      });
      return { checked: 0, updated: 0, errors: 1 };
    }

    const billings = billingsResponse.data;
    let checked = 0;
    let updated = 0;
    let errors = 0;

    // Check each transaction
    for (const transaction of pendingBillingTransactions) {
      try {
        checked++;

        const billingId = transaction.abacatepayBillingId!;
        const billing = billings.find(b => b.id === billingId);

        if (!billing) {
          logger.warn('[ABACATEPAY-SYNC] Billing not found in AbacatePay', {
            syncId,
            transactionId: transaction.id,
            billingId,
          });
          errors++;
          continue;
        }

        // Update if status changed
        if (billing.status !== transaction.abacatepayStatus) {
          logger.info('[ABACATEPAY-SYNC] Status changed, updating transaction', {
            syncId,
            transactionId: transaction.id,
            oldStatus: transaction.abacatepayStatus,
            newStatus: billing.status,
          });

          const newInternalStatus = mapAbacatePayStatus(billing.status);

          await services.transactions.update(transaction.id, {
            status: newInternalStatus,
            abacatepayStatus: billing.status,
            paymentDate: billing.status === 'PAID' ? new Date() : undefined,
            updatedAt: new Date(),
          });

          updated++;
        }

      } catch (error) {
        logger.error('[ABACATEPAY-SYNC] Error checking transaction', {
          syncId,
          transactionId: transaction.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        errors++;
      }
    }

    logger.info('[ABACATEPAY-SYNC] Billing sync completed', {
      syncId,
      checked,
      updated,
      errors,
    });

    return { checked, updated, errors };

  } catch (error) {
    logger.error('[ABACATEPAY-SYNC] Billing sync failed', {
      syncId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    throw error;
  }
}

/**
 * Sync all pending payments for a tenant
 * Combines PIX and billing sync
 */
export async function syncAllPendingPayments(tenantId: string): Promise<{
  pix: { checked: number; updated: number; errors: number };
  billing: { checked: number; updated: number; errors: number };
  total: { checked: number; updated: number; errors: number };
}> {
  logger.info('[ABACATEPAY-SYNC] Starting full payment sync', {
    tenantId: tenantId.substring(0, 8) + '***',
  });

  const [pixResult, billingResult] = await Promise.all([
    syncPendingPixPayments(tenantId).catch(error => {
      logger.error('[ABACATEPAY-SYNC] PIX sync failed', { error });
      return { checked: 0, updated: 0, errors: 1 };
    }),
    syncPendingBillings(tenantId).catch(error => {
      logger.error('[ABACATEPAY-SYNC] Billing sync failed', { error });
      return { checked: 0, updated: 0, errors: 1 };
    }),
  ]);

  const total = {
    checked: pixResult.checked + billingResult.checked,
    updated: pixResult.updated + billingResult.updated,
    errors: pixResult.errors + billingResult.errors,
  };

  logger.info('[ABACATEPAY-SYNC] Full payment sync completed', {
    tenantId: tenantId.substring(0, 8) + '***',
    pix: pixResult,
    billing: billingResult,
    total,
  });

  return {
    pix: pixResult,
    billing: billingResult,
    total,
  };
}

/**
 * Check for expired payments and update status
 * Runs independently of AbacatePay to catch missed expirations
 */
export async function checkExpiredPayments(tenantId: string): Promise<{
  checked: number;
  expired: number;
}> {
  const syncId = `sync_expired_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  logger.info('[ABACATEPAY-SYNC] Checking for expired payments', {
    syncId,
    tenantId: tenantId.substring(0, 8) + '***',
  });

  try {
    const services = new TenantServiceFactory(tenantId);
    const now = new Date();

    // Get all pending transactions with expiration dates
    const allTransactions = await services.transactions.getAll();
    const pendingWithExpiration = allTransactions.filter(
      (t: Transaction) =>
        t.status === TransactionStatus.PENDING &&
        t.abacatepayExpiresAt
    );

    logger.info('[ABACATEPAY-SYNC] Found transactions with expiration', {
      syncId,
      count: pendingWithExpiration.length,
    });

    let checked = 0;
    let expired = 0;

    for (const transaction of pendingWithExpiration) {
      checked++;

      const expiresAt = transaction.abacatepayExpiresAt instanceof Date
        ? transaction.abacatepayExpiresAt
        : new Date(transaction.abacatepayExpiresAt!);

      if (expiresAt < now) {
        logger.info('[ABACATEPAY-SYNC] Payment expired, updating status', {
          syncId,
          transactionId: transaction.id,
          expiresAt: expiresAt.toISOString(),
        });

        await services.transactions.update(transaction.id, {
          status: TransactionStatus.CANCELLED,
          abacatepayStatus: 'EXPIRED',
          updatedAt: new Date(),
        });

        expired++;
      }
    }

    logger.info('[ABACATEPAY-SYNC] Expired payments check completed', {
      syncId,
      checked,
      expired,
    });

    return { checked, expired };

  } catch (error) {
    logger.error('[ABACATEPAY-SYNC] Expired payments check failed', {
      syncId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    throw error;
  }
}

// ===== HELPER FUNCTIONS =====

/**
 * Map AbacatePay status to internal status
 */
function mapAbacatePayStatus(abacatePayStatus: string): TransactionStatus {
  switch (abacatePayStatus) {
    case 'PAID':
      return TransactionStatus.PAID;
    case 'PENDING':
      return TransactionStatus.PENDING;
    case 'EXPIRED':
      return TransactionStatus.CANCELLED;
    case 'CANCELLED':
      return TransactionStatus.CANCELLED;
    case 'REFUNDED':
      return TransactionStatus.REFUNDED;
    default:
      logger.warn('[ABACATEPAY-SYNC] Unknown AbacatePay status', {
        status: abacatePayStatus,
      });
      return TransactionStatus.PENDING;
  }
}

/**
 * Delay helper
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
