/**
 * ABACATEPAY RECONCILIATION SERVICE
 *
 * Handles periodic reconciliation between AbacatePay store balance
 * and internal wallet system. Ensures data consistency and
 * identifies discrepancies for manual review.
 *
 * Features:
 * - Store balance verification
 * - Pending payment sync
 * - Discrepancy detection
 * - Idempotent operations
 *
 * @version 1.0.0
 */

import { logger } from '@/lib/utils/logger';
import { getAbacatePayService } from '@/lib/services/abacatepay-service';
import { WalletService } from '@/lib/services/wallet-service';
import { syncAllPendingPayments, checkExpiredPayments } from '@/lib/services/abacatepay-sync-service';
import { isAbacatePaySuccess, toBRL } from '@/lib/types/abacatepay';
import { db } from '@/lib/firebase/config';
import {
  collection,
  doc,
  setDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';

// Collections
const RECONCILIATION_LOGS_COLLECTION = 'reconciliation_logs';
const RECONCILIATION_DISCREPANCIES_COLLECTION = 'reconciliation_discrepancies';

// Threshold for discrepancy alerts (in BRL)
const DISCREPANCY_ALERT_THRESHOLD = 10; // R$ 10.00

export interface ReconciliationResult {
  reconciliationId: string;
  timestamp: Date;

  // AbacatePay Store Balance
  abacatepay: {
    storeId: string;
    storeName: string;
    available: number;
    pending: number;
    blocked: number;
    totalBalance: number;
  };

  // Internal Wallet Summary (all tenants)
  internal: {
    totalBalance: number;
    totalPendingBalance: number;
    totalBlockedBalance: number;
    tenantCount: number;
  };

  // Discrepancy Analysis
  discrepancy: {
    amount: number;
    percentage: number;
    hasSignificantDiscrepancy: boolean;
    details: string;
  };

  // Sync Results
  syncResults: {
    pixChecked: number;
    pixUpdated: number;
    billingChecked: number;
    billingUpdated: number;
    expiredPayments: number;
    errors: number;
  };

  // Status
  status: 'success' | 'partial' | 'failed';
  duration: number;
}

export interface TenantReconciliation {
  tenantId: string;
  internalBalance: number;
  pendingBalance: number;
  syncResult: {
    checked: number;
    updated: number;
    errors: number;
  };
}

/**
 * Run full reconciliation between AbacatePay and internal wallets
 */
export async function runReconciliation(): Promise<ReconciliationResult> {
  const startTime = Date.now();
  const reconciliationId = `recon_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  logger.info('[RECONCILIATION] Starting reconciliation', { reconciliationId });

  try {
    // 1. Get AbacatePay store balance
    const abacatepay = getAbacatePayService();
    const storeResponse = await abacatepay.getStoreBalance();

    if (!isAbacatePaySuccess(storeResponse)) {
      logger.error('[RECONCILIATION] Failed to get AbacatePay store balance', {
        reconciliationId,
        error: storeResponse.error,
      });

      return createFailedResult(reconciliationId, startTime, 'Failed to get AbacatePay store balance');
    }

    const storeData = storeResponse.data;
    const abacatepayBalance = {
      storeId: storeData.id,
      storeName: storeData.name,
      available: toBRL(storeData.balance.available),
      pending: toBRL(storeData.balance.pending),
      blocked: toBRL(storeData.balance.blocked),
      totalBalance: toBRL(
        storeData.balance.available +
        storeData.balance.pending +
        storeData.balance.blocked
      ),
    };

    logger.info('[RECONCILIATION] AbacatePay balance retrieved', {
      reconciliationId,
      available: abacatepayBalance.available,
      pending: abacatepayBalance.pending,
      blocked: abacatepayBalance.blocked,
    });

    // 2. Get all internal wallet balances
    const internalSummary = await getInternalWalletsSummary();

    logger.info('[RECONCILIATION] Internal wallets summary', {
      reconciliationId,
      totalBalance: internalSummary.totalBalance,
      tenantCount: internalSummary.tenantCount,
    });

    // 3. Sync pending payments for all tenants
    const syncResults = await syncAllTenants(internalSummary.tenantIds);

    logger.info('[RECONCILIATION] Sync completed', {
      reconciliationId,
      pixUpdated: syncResults.pixUpdated,
      billingUpdated: syncResults.billingUpdated,
    });

    // 4. Calculate discrepancy
    // Note: AbacatePay available balance should match internal total balance
    // because internal wallet represents what tenants can withdraw
    const discrepancyAmount = abacatepayBalance.available - internalSummary.totalBalance;
    const discrepancyPercentage = internalSummary.totalBalance > 0
      ? (Math.abs(discrepancyAmount) / internalSummary.totalBalance) * 100
      : 0;

    const hasSignificantDiscrepancy = Math.abs(discrepancyAmount) > DISCREPANCY_ALERT_THRESHOLD;

    let discrepancyDetails = '';
    if (discrepancyAmount > 0) {
      discrepancyDetails = `AbacatePay has R$ ${discrepancyAmount.toFixed(2)} more than internal wallets`;
    } else if (discrepancyAmount < 0) {
      discrepancyDetails = `Internal wallets have R$ ${Math.abs(discrepancyAmount).toFixed(2)} more than AbacatePay`;
    } else {
      discrepancyDetails = 'Balances are in sync';
    }

    // 5. Log discrepancy if significant
    if (hasSignificantDiscrepancy) {
      await logDiscrepancy({
        reconciliationId,
        abacatepayAvailable: abacatepayBalance.available,
        internalTotal: internalSummary.totalBalance,
        discrepancyAmount,
        discrepancyPercentage,
        timestamp: new Date(),
      });

      logger.warn('[RECONCILIATION] Significant discrepancy detected', {
        reconciliationId,
        discrepancyAmount,
        discrepancyPercentage: `${discrepancyPercentage.toFixed(2)}%`,
      });
    }

    // 6. Build result
    const duration = Date.now() - startTime;
    const result: ReconciliationResult = {
      reconciliationId,
      timestamp: new Date(),
      abacatepay: abacatepayBalance,
      internal: {
        totalBalance: internalSummary.totalBalance,
        totalPendingBalance: internalSummary.totalPendingBalance,
        totalBlockedBalance: internalSummary.totalBlockedBalance,
        tenantCount: internalSummary.tenantCount,
      },
      discrepancy: {
        amount: discrepancyAmount,
        percentage: discrepancyPercentage,
        hasSignificantDiscrepancy,
        details: discrepancyDetails,
      },
      syncResults,
      status: hasSignificantDiscrepancy ? 'partial' : 'success',
      duration,
    };

    // 7. Save reconciliation log
    await saveReconciliationLog(result);

    logger.info('[RECONCILIATION] Reconciliation completed', {
      reconciliationId,
      status: result.status,
      duration: `${duration}ms`,
      discrepancy: discrepancyAmount,
    });

    return result;

  } catch (error) {
    logger.error('[RECONCILIATION] Reconciliation failed', {
      reconciliationId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return createFailedResult(
      reconciliationId,
      startTime,
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}

/**
 * Get summary of all internal wallets
 */
async function getInternalWalletsSummary(): Promise<{
  totalBalance: number;
  totalPendingBalance: number;
  totalBlockedBalance: number;
  tenantCount: number;
  tenantIds: string[];
}> {
  const walletsRef = collection(db, 'wallets');
  const snapshot = await getDocs(walletsRef);

  let totalBalance = 0;
  let totalPendingBalance = 0;
  let totalBlockedBalance = 0;
  const tenantIds: string[] = [];

  snapshot.forEach((doc) => {
    const data = doc.data();
    totalBalance += data.balance || 0;
    totalPendingBalance += data.pendingBalance || 0;
    totalBlockedBalance += data.blockedBalance || 0;
    tenantIds.push(doc.id);
  });

  return {
    totalBalance,
    totalPendingBalance,
    totalBlockedBalance,
    tenantCount: snapshot.size,
    tenantIds,
  };
}

/**
 * Sync pending payments for all tenants
 */
async function syncAllTenants(tenantIds: string[]): Promise<{
  pixChecked: number;
  pixUpdated: number;
  billingChecked: number;
  billingUpdated: number;
  expiredPayments: number;
  errors: number;
}> {
  let pixChecked = 0;
  let pixUpdated = 0;
  let billingChecked = 0;
  let billingUpdated = 0;
  let expiredPayments = 0;
  let errors = 0;

  // Process tenants in batches to avoid overloading
  const batchSize = 5;
  for (let i = 0; i < tenantIds.length; i += batchSize) {
    const batch = tenantIds.slice(i, i + batchSize);

    await Promise.all(
      batch.map(async (tenantId) => {
        try {
          // Sync pending payments
          const syncResult = await syncAllPendingPayments(tenantId);
          pixChecked += syncResult.pix.checked;
          pixUpdated += syncResult.pix.updated;
          billingChecked += syncResult.billing.checked;
          billingUpdated += syncResult.billing.updated;
          errors += syncResult.total.errors;

          // Check expired payments
          const expiredResult = await checkExpiredPayments(tenantId);
          expiredPayments += expiredResult.expired;

        } catch (error) {
          logger.error('[RECONCILIATION] Error syncing tenant', {
            tenantId: tenantId.substring(0, 8) + '***',
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          errors++;
        }
      })
    );

    // Small delay between batches
    if (i + batchSize < tenantIds.length) {
      await delay(500);
    }
  }

  return {
    pixChecked,
    pixUpdated,
    billingChecked,
    billingUpdated,
    expiredPayments,
    errors,
  };
}

/**
 * Log discrepancy for review
 */
async function logDiscrepancy(data: {
  reconciliationId: string;
  abacatepayAvailable: number;
  internalTotal: number;
  discrepancyAmount: number;
  discrepancyPercentage: number;
  timestamp: Date;
}): Promise<void> {
  const discrepancyRef = doc(
    db,
    RECONCILIATION_DISCREPANCIES_COLLECTION,
    data.reconciliationId
  );

  await setDoc(discrepancyRef, {
    ...data,
    status: 'pending_review',
    createdAt: serverTimestamp(),
  });
}

/**
 * Save reconciliation log
 */
async function saveReconciliationLog(result: ReconciliationResult): Promise<void> {
  const logRef = doc(db, RECONCILIATION_LOGS_COLLECTION, result.reconciliationId);

  await setDoc(logRef, {
    ...result,
    timestamp: serverTimestamp(),
  });
}

/**
 * Create failed result
 */
function createFailedResult(
  reconciliationId: string,
  startTime: number,
  errorMessage: string
): ReconciliationResult {
  return {
    reconciliationId,
    timestamp: new Date(),
    abacatepay: {
      storeId: '',
      storeName: '',
      available: 0,
      pending: 0,
      blocked: 0,
      totalBalance: 0,
    },
    internal: {
      totalBalance: 0,
      totalPendingBalance: 0,
      totalBlockedBalance: 0,
      tenantCount: 0,
    },
    discrepancy: {
      amount: 0,
      percentage: 0,
      hasSignificantDiscrepancy: false,
      details: `Error: ${errorMessage}`,
    },
    syncResults: {
      pixChecked: 0,
      pixUpdated: 0,
      billingChecked: 0,
      billingUpdated: 0,
      expiredPayments: 0,
      errors: 1,
    },
    status: 'failed',
    duration: Date.now() - startTime,
  };
}

/**
 * Get recent reconciliation logs
 */
export async function getRecentReconciliations(
  limitCount = 10
): Promise<ReconciliationResult[]> {
  const logsRef = collection(db, RECONCILIATION_LOGS_COLLECTION);
  const q = query(logsRef, orderBy('timestamp', 'desc'), limit(limitCount));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      ...data,
      timestamp: data.timestamp?.toDate?.() || new Date(),
    } as ReconciliationResult;
  });
}

/**
 * Get pending discrepancies for review
 */
export async function getPendingDiscrepancies(): Promise<any[]> {
  const discrepanciesRef = collection(db, RECONCILIATION_DISCREPANCIES_COLLECTION);
  const q = query(
    discrepanciesRef,
    where('status', '==', 'pending_review'),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
}

/**
 * Run reconciliation for a single tenant
 */
export async function runTenantReconciliation(
  tenantId: string
): Promise<TenantReconciliation> {
  const reconciliationId = `tenant_recon_${Date.now()}`;

  logger.info('[RECONCILIATION] Running tenant reconciliation', {
    reconciliationId,
    tenantId: tenantId.substring(0, 8) + '***',
  });

  try {
    // Get wallet balance
    const wallet = await WalletService.getWallet(tenantId);

    // Sync pending payments
    const syncResult = await syncAllPendingPayments(tenantId);

    // Check expired
    await checkExpiredPayments(tenantId);

    // Get updated wallet
    const updatedWallet = await WalletService.getWallet(tenantId);

    return {
      tenantId,
      internalBalance: updatedWallet.balance,
      pendingBalance: updatedWallet.pendingBalance || 0,
      syncResult: {
        checked: syncResult.total.checked,
        updated: syncResult.total.updated,
        errors: syncResult.total.errors,
      },
    };

  } catch (error) {
    logger.error('[RECONCILIATION] Tenant reconciliation failed', {
      tenantId: tenantId.substring(0, 8) + '***',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    throw error;
  }
}

/**
 * Delay helper
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Schedule reconciliation (for cron jobs)
 */
export async function scheduleReconciliation(): Promise<ReconciliationResult> {
  logger.info('[RECONCILIATION] Scheduled reconciliation starting');
  return runReconciliation();
}
