/**
 * WALLET SERVICE
 *
 * Serviço completo de gerenciamento de carteira digital
 * Integrado com sistema de transações
 */

import { TenantServiceFactory } from '@/lib/firebase/firestore-v2';
import {
  Wallet,
  WalletTransaction,
  Withdrawal,
  WalletTransactionType,
  WalletTransactionStatus,
  WithdrawalStatus,
  WithdrawalMethod,
  CreateWithdrawalInput,
  WALLET_CONSTANTS,
} from '@/lib/types/wallet';
import { Transaction, TransactionType, TransactionStatus, PaymentMethod } from '@/lib/types/transaction-unified';
import { logger } from '@/lib/utils/logger';

export class WalletService {
  private tenantId: string;
  private services: TenantServiceFactory;

  constructor(tenantId: string) {
    this.tenantId = tenantId;
    this.services = new TenantServiceFactory(tenantId);
  }

  // ===== WALLET OPERATIONS =====

  /**
   * Get or create wallet for client
   */
  async getOrCreateWallet(clientId: string, clientName: string, clientPhone: string): Promise<Wallet> {
    try {
      const walletService = this.services.createService<Wallet>('wallets');

      const existing = await walletService.getMany([
        { field: 'clientId', operator: '==', value: clientId }
      ], { limit: 1 });

      if (existing.length > 0) {
        return existing[0];
      }

      // Create new wallet
      const walletId = await walletService.create({
        tenantId: this.tenantId,
        clientId,
        clientName,
        clientPhone,
        balance: 0,
        pendingBalance: 0,
        totalEarned: 0,
        totalSpent: 0,
        totalWithdrawn: 0,
        autoWithdrawalEnabled: false,
        dailyWithdrawalLimit: WALLET_CONSTANTS.DEFAULT_DAILY_WITHDRAWAL_LIMIT,
        monthlyWithdrawalLimit: WALLET_CONSTANTS.DEFAULT_MONTHLY_WITHDRAWAL_LIMIT,
        minWithdrawalAmount: WALLET_CONSTANTS.DEFAULT_MIN_WITHDRAWAL_AMOUNT,
        transactionCount: 0,
        withdrawalCount: 0,
        isActive: true,
        isFrozen: false,
      });

      const wallet = await walletService.get(walletId);
      logger.info('Wallet created', { tenantId: this.tenantId, clientId, walletId });
      return wallet!;
    } catch (error) {
      logger.error('Error getting or creating wallet', { error, clientId });
      throw error;
    }
  }

  /**
   * Add credit to wallet
   */
  async addCredit(
    clientId: string,
    amount: number,
    description: string,
    metadata?: { reference?: string; transactionId?: string; reservationId?: string }
  ): Promise<WalletTransaction> {
    const wallet = await this.getOrCreateWallet(clientId, '', '');
    const balanceBefore = wallet.balance;
    const balanceAfter = balanceBefore + amount;

    // Create transaction
    const transactionService = this.services.createService<WalletTransaction>('wallet_transactions');
    const transactionId = await transactionService.create({
      tenantId: this.tenantId,
      walletId: wallet.id!,
      clientId,
      type: WalletTransactionType.CREDIT,
      status: WalletTransactionStatus.COMPLETED,
      amount,
      balanceBefore,
      balanceAfter,
      description,
      reference: metadata?.reference,
      transactionId: metadata?.transactionId,
      reservationId: metadata?.reservationId,
      processedAt: new Date(),
    });

    // Update wallet
    const walletService = this.services.createService<Wallet>('wallets');
    await walletService.update(wallet.id!, {
      balance: balanceAfter,
      totalEarned: wallet.totalEarned + amount,
      transactionCount: wallet.transactionCount + 1,
      lastTransactionAt: new Date(),
      updatedAt: new Date(),
    });

    logger.info('Credit added to wallet', { clientId, amount, balanceAfter });
    return (await transactionService.get(transactionId))!;
  }

  /**
   * Debit from wallet
   */
  async debit(
    clientId: string,
    amount: number,
    description: string,
    metadata?: { reference?: string; transactionId?: string }
  ): Promise<WalletTransaction> {
    const wallet = await this.getOrCreateWallet(clientId, '', '');

    if (wallet.balance < amount) {
      throw new Error('Insufficient balance');
    }

    const balanceBefore = wallet.balance;
    const balanceAfter = balanceBefore - amount;

    const transactionService = this.services.createService<WalletTransaction>('wallet_transactions');
    const transactionId = await transactionService.create({
      tenantId: this.tenantId,
      walletId: wallet.id!,
      clientId,
      type: WalletTransactionType.DEBIT,
      status: WalletTransactionStatus.COMPLETED,
      amount,
      balanceBefore,
      balanceAfter,
      description,
      reference: metadata?.reference,
      transactionId: metadata?.transactionId,
      processedAt: new Date(),
    });

    const walletService = this.services.createService<Wallet>('wallets');
    await walletService.update(wallet.id!, {
      balance: balanceAfter,
      totalSpent: wallet.totalSpent + amount,
      transactionCount: wallet.transactionCount + 1,
      lastTransactionAt: new Date(),
      updatedAt: new Date(),
    });

    logger.info('Debit from wallet', { clientId, amount, balanceAfter });
    return (await transactionService.get(transactionId))!;
  }

  /**
   * Request withdrawal
   */
  async requestWithdrawal(input: CreateWithdrawalInput): Promise<Withdrawal> {
    const wallet = await this.getOrCreateWallet(input.clientId, input.clientName, input.clientPhone);

    // Validations
    if (wallet.isFrozen) {
      throw new Error('Wallet is frozen');
    }

    if (input.amount < wallet.minWithdrawalAmount) {
      throw new Error(`Minimum withdrawal amount is ${wallet.minWithdrawalAmount}`);
    }

    if (wallet.balance < input.amount) {
      throw new Error('Insufficient balance');
    }

    // Calculate fee
    const fee = 0; // No fee by default
    const netAmount = input.amount - fee;

    // Create withdrawal
    const withdrawalService = this.services.createService<Withdrawal>('withdrawals');
    const withdrawalId = await withdrawalService.create({
      ...input,
      tenantId: this.tenantId,
      walletId: wallet.id!,
      fee,
      netAmount,
      status: WithdrawalStatus.REQUESTED,
      statusHistory: [{
        status: WithdrawalStatus.REQUESTED,
        changedAt: new Date(),
        changedBy: input.clientId,
        reason: 'Withdrawal requested by client',
      }],
      requestedAt: new Date(),
    });

    // Update wallet pending balance
    const walletService = this.services.createService<Wallet>('wallets');
    await walletService.update(wallet.id!, {
      pendingBalance: wallet.pendingBalance + input.amount,
      withdrawalCount: wallet.withdrawalCount + 1,
      lastWithdrawalAt: new Date(),
      updatedAt: new Date(),
    });

    logger.info('Withdrawal requested', { clientId: input.clientId, amount: input.amount, withdrawalId });
    return (await withdrawalService.get(withdrawalId))!;
  }

  /**
   * Approve withdrawal
   */
  async approveWithdrawal(withdrawalId: string, approvedBy: string): Promise<Withdrawal> {
    const withdrawalService = this.services.createService<Withdrawal>('withdrawals');
    const withdrawal = await withdrawalService.get(withdrawalId);

    if (!withdrawal) throw new Error('Withdrawal not found');
    if (withdrawal.status !== WithdrawalStatus.REQUESTED) {
      throw new Error('Withdrawal cannot be approved in current status');
    }

    await withdrawalService.update(withdrawalId, {
      status: WithdrawalStatus.APPROVED,
      approvedAt: new Date(),
      approvedBy,
      statusHistory: [
        ...withdrawal.statusHistory,
        {
          status: WithdrawalStatus.APPROVED,
          changedAt: new Date(),
          changedBy: approvedBy,
          reason: 'Approved by admin',
        },
      ],
      updatedAt: new Date(),
    });

    logger.info('Withdrawal approved', { withdrawalId, approvedBy });
    return (await withdrawalService.get(withdrawalId))!;
  }

  /**
   * Complete withdrawal (mark as paid)
   */
  async completeWithdrawal(
    withdrawalId: string,
    completedBy: string,
    transactionReference?: string
  ): Promise<Withdrawal> {
    const withdrawalService = this.services.createService<Withdrawal>('withdrawals');
    const withdrawal = await withdrawalService.get(withdrawalId);

    if (!withdrawal) throw new Error('Withdrawal not found');

    // Deduct from wallet balance
    const walletService = this.services.createService<Wallet>('wallets');
    const wallet = await walletService.get(withdrawal.walletId);
    if (!wallet) throw new Error('Wallet not found');

    // Create wallet transaction
    const transactionService = this.services.createService<WalletTransaction>('wallet_transactions');
    const walletTxId = await transactionService.create({
      tenantId: this.tenantId,
      walletId: wallet.id!,
      clientId: withdrawal.clientId,
      type: WalletTransactionType.WITHDRAWAL,
      status: WalletTransactionStatus.COMPLETED,
      amount: withdrawal.amount,
      balanceBefore: wallet.balance,
      balanceAfter: wallet.balance - withdrawal.amount,
      description: `Saque via ${withdrawal.method}`,
      reference: withdrawalId,
      withdrawalId,
      processedAt: new Date(),
    });

    // Create financial transaction
    const financialService = this.services.createService<Transaction>('transactions');
    const financialTxId = await financialService.create({
      tenantId: this.tenantId,
      type: TransactionType.EXPENSE,
      status: TransactionStatus.PAID,
      amount: withdrawal.amount,
      description: `Saque - ${withdrawal.clientName}`,
      category: 'withdrawal' as any,
      paymentMethod: withdrawal.method as any,
      transactionReference,
      clientId: withdrawal.clientId,
      clientName: withdrawal.clientName,
      paymentDate: new Date(),
      metadata: { withdrawalId, walletTransactionId: walletTxId },
    } as any);

    // Update wallet
    await walletService.update(wallet.id!, {
      balance: wallet.balance - withdrawal.amount,
      pendingBalance: wallet.pendingBalance - withdrawal.amount,
      totalWithdrawn: wallet.totalWithdrawn + withdrawal.amount,
      updatedAt: new Date(),
    });

    // Update withdrawal
    await withdrawalService.update(withdrawalId, {
      status: WithdrawalStatus.COMPLETED,
      completedAt: new Date(),
      processedBy: completedBy,
      transactionReference,
      walletTransactionId: walletTxId,
      financialTransactionId: financialTxId,
      statusHistory: [
        ...withdrawal.statusHistory,
        {
          status: WithdrawalStatus.COMPLETED,
          changedAt: new Date(),
          changedBy: completedBy,
          reason: 'Payment processed',
        },
      ],
      updatedAt: new Date(),
    });

    logger.info('Withdrawal completed', { withdrawalId, amount: withdrawal.amount });
    return (await withdrawalService.get(withdrawalId))!;
  }
}

/**
 * Factory
 */
export class WalletServiceFactory {
  private static instances: Map<string, WalletService> = new Map();

  static getInstance(tenantId: string): WalletService {
    if (!this.instances.has(tenantId)) {
      this.instances.set(tenantId, new WalletService(tenantId));
    }
    return this.instances.get(tenantId)!;
  }

  static clearInstance(tenantId: string): void {
    this.instances.delete(tenantId);
  }
}
