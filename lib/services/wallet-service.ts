/**
 * WALLET SERVICE
 *
 * Serviço para gerenciamento de carteira digital
 * Integrado com AbacatePay para saques
 *
 * @version 2.0.0
 */

import { db } from '@/lib/firebase/config';
import {
  doc,
  getDoc,
  setDoc,
  collection,
  addDoc,
  runTransaction,
  serverTimestamp,
  query,
  where,
  orderBy,
  getDocs,
  Timestamp,
  updateDoc,
  limit as firestoreLimit,
} from 'firebase/firestore';
import {
  Wallet,
  WalletTransaction,
  WithdrawalRequest,
  WithdrawalStatus,
  TransactionType,
  TransactionStatus,
  DEFAULT_WALLET_LIMITS,
  formatBRL,
} from '@/lib/types/financial-wallet';
import { logger } from '@/lib/utils/logger';

export class WalletService {
  private static COLLECTION_WALLETS = 'wallets';
  private static COLLECTION_TRANSACTIONS = 'wallet_transactions';
  private static COLLECTION_WITHDRAWALS = 'withdrawal_requests';

  // ===== WALLET OPERATIONS =====

  /**
   * Obtém a carteira de um tenant. Cria se não existir.
   */
  static async getWallet(tenantId: string): Promise<Wallet> {
    const walletRef = doc(db, this.COLLECTION_WALLETS, tenantId);
    const walletSnap = await getDoc(walletRef);

    if (walletSnap.exists()) {
      const data = walletSnap.data();
      return {
        tenantId,
        balance: data.balance || 0,
        pendingBalance: data.pendingBalance || 0,
        blockedBalance: data.blockedBalance || 0,
        totalDeposits: data.totalDeposits || 0,
        totalWithdrawals: data.totalWithdrawals || 0,
        currency: data.currency || 'BRL',
        lastActivityAt: data.lastActivityAt?.toDate?.() || new Date(),
        updatedAt: data.updatedAt?.toDate?.() || new Date(),
        createdAt: data.createdAt?.toDate?.() || new Date(),
      } as Wallet;
    }

    // Criar carteira se não existir
    const newWallet: Wallet = {
      tenantId,
      balance: 0,
      pendingBalance: 0,
      blockedBalance: 0,
      totalDeposits: 0,
      totalWithdrawals: 0,
      currency: 'BRL',
      lastActivityAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await setDoc(walletRef, {
      ...newWallet,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastActivityAt: serverTimestamp(),
    });

    logger.info('[WALLET] New wallet created', {
      tenantId: tenantId.substring(0, 8) + '***',
    });

    return newWallet;
  }

  /**
   * Atualiza saldo da carteira atomicamente
   */
  static async updateBalance(
    tenantId: string,
    amount: number,
    operation: 'add' | 'subtract'
  ): Promise<Wallet> {
    const walletRef = doc(db, this.COLLECTION_WALLETS, tenantId);

    return await runTransaction(db, async (transaction) => {
      const walletSnap = await transaction.get(walletRef);

      if (!walletSnap.exists()) {
        throw new Error(`Wallet not found for tenant: ${tenantId}`);
      }

      const currentBalance = walletSnap.data().balance || 0;
      const newBalance = operation === 'add'
        ? currentBalance + amount
        : currentBalance - amount;

      if (newBalance < 0) {
        throw new Error('Insufficient funds');
      }

      transaction.update(walletRef, {
        balance: newBalance,
        lastActivityAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      return {
        ...walletSnap.data(),
        balance: newBalance,
        tenantId,
      } as Wallet;
    });
  }

  // ===== TRANSACTION OPERATIONS =====

  /**
   * Adiciona uma transação e atualiza o saldo atomicamente.
   */
  static async addTransaction(
    tenantId: string,
    data: Omit<WalletTransaction, 'id' | 'walletId' | 'tenantId' | 'createdAt' | 'updatedAt'>
  ): Promise<WalletTransaction> {
    return await runTransaction(db, async (transaction) => {
      const walletRef = doc(db, this.COLLECTION_WALLETS, tenantId);
      const walletSnap = await transaction.get(walletRef);

      if (!walletSnap.exists()) {
        throw new Error(`Wallet not found for tenant: ${tenantId}`);
      }

      const walletData = walletSnap.data();
      const currentBalance = walletData.balance || 0;
      const totalDeposits = walletData.totalDeposits || 0;
      const totalWithdrawals = walletData.totalWithdrawals || 0;

      let newBalance = currentBalance;
      let newTotalDeposits = totalDeposits;
      let newTotalWithdrawals = totalWithdrawals;

      // Calcular novo saldo baseado no tipo
      switch (data.type) {
        case 'deposit':
        case 'refund':
          newBalance += data.amount;
          newTotalDeposits += data.amount;
          break;
        case 'withdrawal':
        case 'fee':
          newBalance -= data.amount;
          newTotalWithdrawals += data.amount;
          break;
        case 'adjustment':
          // Adjustment pode ser positivo ou negativo
          // Se status é 'completed' e não é reversão, assume positivo
          newBalance += data.amount;
          break;
      }

      // Validar saldo negativo para saques
      if (newBalance < 0 && (data.type === 'withdrawal' || data.type === 'fee')) {
        throw new Error('Insufficient funds');
      }

      // Criar referência para nova transação
      const transactionRef = doc(collection(db, this.COLLECTION_TRANSACTIONS));

      const newTransaction: WalletTransaction = {
        id: transactionRef.id,
        walletId: tenantId,
        tenantId,
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Atualizar carteira
      transaction.update(walletRef, {
        balance: newBalance,
        totalDeposits: newTotalDeposits,
        totalWithdrawals: newTotalWithdrawals,
        lastActivityAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Salvar transação da carteira
      transaction.set(transactionRef, {
        ...newTransaction,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      logger.info('[WALLET] Transaction added', {
        tenantId: tenantId.substring(0, 8) + '***',
        transactionId: transactionRef.id,
        type: data.type,
        amount: data.amount,
        newBalance,
      });

      return newTransaction;
    });
  }

  // ===== WITHDRAWAL OPERATIONS =====

  /**
   * Solicita um saque (débito imediato na carteira)
   */
  static async requestWithdrawal(
    tenantId: string,
    amount: number,
    bankInfo: WithdrawalRequest['bankInfo']
  ): Promise<WithdrawalRequest> {
    // Validar limites
    if (amount < DEFAULT_WALLET_LIMITS.minWithdrawal) {
      throw new Error(`Valor mínimo para saque é ${formatBRL(DEFAULT_WALLET_LIMITS.minWithdrawal)}`);
    }

    if (amount > DEFAULT_WALLET_LIMITS.maxWithdrawal) {
      throw new Error(`Valor máximo para saque é ${formatBRL(DEFAULT_WALLET_LIMITS.maxWithdrawal)}`);
    }

    return await runTransaction(db, async (transaction) => {
      const walletRef = doc(db, this.COLLECTION_WALLETS, tenantId);
      const walletSnap = await transaction.get(walletRef);

      if (!walletSnap.exists()) {
        throw new Error('Wallet not found');
      }

      const walletData = walletSnap.data();
      const currentBalance = walletData.balance || 0;

      if (currentBalance < amount) {
        throw new Error(`Saldo insuficiente. Disponível: ${formatBRL(currentBalance)}`);
      }

      // Criar referências
      const transactionRef = doc(collection(db, this.COLLECTION_TRANSACTIONS));
      const withdrawalRef = doc(collection(db, this.COLLECTION_WITHDRAWALS));

      // Transação de débito na carteira
      const debitTransaction: WalletTransaction = {
        id: transactionRef.id,
        walletId: tenantId,
        tenantId,
        type: 'withdrawal',
        amount: amount,
        status: 'completed', // Débito é imediato
        description: `Solicitação de saque #${withdrawalRef.id.substring(0, 8)}`,
        referenceId: withdrawalRef.id,
        withdrawalRequestId: withdrawalRef.id,
        paymentMethod: 'bank_transfer',
        paymentProvider: 'abacatepay',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Solicitação de saque
      const withdrawalRequest: WithdrawalRequest = {
        id: withdrawalRef.id,
        walletId: tenantId,
        tenantId,
        amount,
        fee: 0, // Taxa será definida pela AbacatePay
        netAmount: amount,
        status: 'pending',
        statusHistory: [{
          from: 'pending' as WithdrawalStatus,
          to: 'pending' as WithdrawalStatus,
          reason: 'Solicitação criada',
          changedAt: new Date(),
        }],
        bankInfo,
        requestedAt: new Date(),
        transactionId: transactionRef.id,
      };

      // Atualizar saldo
      transaction.update(walletRef, {
        balance: currentBalance - amount,
        pendingBalance: (walletData.pendingBalance || 0) + amount,
        lastActivityAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Salvar transação
      transaction.set(transactionRef, {
        ...debitTransaction,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Salvar solicitação de saque
      transaction.set(withdrawalRef, {
        ...withdrawalRequest,
        requestedAt: serverTimestamp(),
        statusHistory: withdrawalRequest.statusHistory.map(h => ({
          ...h,
          changedAt: serverTimestamp(),
        })),
      });

      logger.info('[WALLET] Withdrawal requested', {
        tenantId: tenantId.substring(0, 8) + '***',
        withdrawalId: withdrawalRef.id,
        transactionId: transactionRef.id,
        amount,
        newBalance: currentBalance - amount,
      });

      return withdrawalRequest;
    });
  }

  /**
   * Atualiza status do saque
   */
  static async updateWithdrawalStatus(
    withdrawalId: string,
    newStatus: WithdrawalStatus,
    details?: {
      abacatepayId?: string;
      abacatepayStatus?: string;
      abacatepayFee?: number;
      abacatepayReceiptUrl?: string;
      rejectionReason?: string;
      failureDetails?: string;
    }
  ): Promise<void> {
    const withdrawalRef = doc(db, this.COLLECTION_WITHDRAWALS, withdrawalId);
    const withdrawalSnap = await getDoc(withdrawalRef);

    if (!withdrawalSnap.exists()) {
      throw new Error(`Withdrawal not found: ${withdrawalId}`);
    }

    const data = withdrawalSnap.data();
    const currentStatus = data.status as WithdrawalStatus;

    const updateData: Record<string, any> = {
      status: newStatus,
      updatedAt: serverTimestamp(),
    };

    // Adicionar campos opcionais
    if (details?.abacatepayId) updateData.abacatepayId = details.abacatepayId;
    if (details?.abacatepayStatus) updateData.abacatepayStatus = details.abacatepayStatus;
    if (details?.abacatepayFee !== undefined) {
      updateData.abacatepayFee = details.abacatepayFee;
      updateData.fee = details.abacatepayFee / 100; // Converter de centavos
      updateData.netAmount = data.amount - (details.abacatepayFee / 100);
    }
    if (details?.abacatepayReceiptUrl) updateData.abacatepayReceiptUrl = details.abacatepayReceiptUrl;
    if (details?.rejectionReason) updateData.rejectionReason = details.rejectionReason;
    if (details?.failureDetails) updateData.failureDetails = details.failureDetails;

    // Timestamps específicos
    if (newStatus === 'completed') {
      updateData.completedAt = serverTimestamp();
      updateData.processedAt = serverTimestamp();
    } else if (newStatus === 'processing') {
      updateData.processedAt = serverTimestamp();
    } else if (newStatus === 'cancelled') {
      updateData.cancelledAt = serverTimestamp();
    }

    await updateDoc(withdrawalRef, updateData);

    logger.info('[WALLET] Withdrawal status updated', {
      withdrawalId,
      from: currentStatus,
      to: newStatus,
      abacatepayId: details?.abacatepayId,
    });

    // Se completou ou falhou, atualizar pendingBalance
    if (newStatus === 'completed' || newStatus === 'failed' || newStatus === 'reversed') {
      const walletRef = doc(db, this.COLLECTION_WALLETS, data.tenantId);
      const walletSnap = await getDoc(walletRef);

      if (walletSnap.exists()) {
        const walletData = walletSnap.data();
        const pendingBalance = walletData.pendingBalance || 0;

        await updateDoc(walletRef, {
          pendingBalance: Math.max(0, pendingBalance - data.amount),
          updatedAt: serverTimestamp(),
        });
      }
    }
  }

  /**
   * Estorna um saque (em caso de falha)
   */
  static async reverseWithdrawal(
    withdrawalId: string,
    reason: string
  ): Promise<WalletTransaction> {
    const withdrawalRef = doc(db, this.COLLECTION_WITHDRAWALS, withdrawalId);
    const withdrawalSnap = await getDoc(withdrawalRef);

    if (!withdrawalSnap.exists()) {
      throw new Error(`Withdrawal not found: ${withdrawalId}`);
    }

    const withdrawalData = withdrawalSnap.data();

    // Adicionar crédito de volta
    const refundTransaction = await this.addTransaction(withdrawalData.tenantId, {
      type: 'refund',
      amount: withdrawalData.amount,
      status: 'completed',
      description: `Estorno de saque #${withdrawalId.substring(0, 8)} - ${reason}`,
      referenceId: withdrawalId,
      withdrawalRequestId: withdrawalId,
      metadata: {
        source: 'system',
        reason,
        originalWithdrawalId: withdrawalId,
      },
    });

    // Atualizar status do saque
    await this.updateWithdrawalStatus(withdrawalId, 'reversed', {
      failureDetails: reason,
    });

    // Atualizar com referência do estorno
    await updateDoc(withdrawalRef, {
      refundTransactionId: refundTransaction.id,
    });

    logger.info('[WALLET] Withdrawal reversed', {
      withdrawalId,
      refundTransactionId: refundTransaction.id,
      amount: withdrawalData.amount,
      reason,
    });

    return refundTransaction;
  }

  // ===== QUERY OPERATIONS =====

  /**
   * Lista transações da carteira
   */
  static async getTransactions(
    tenantId: string,
    limit = 20,
    type?: TransactionType
  ): Promise<WalletTransaction[]> {
    let q = query(
      collection(db, this.COLLECTION_TRANSACTIONS),
      where('tenantId', '==', tenantId),
      orderBy('createdAt', 'desc'),
      firestoreLimit(limit)
    );

    if (type) {
      q = query(
        collection(db, this.COLLECTION_TRANSACTIONS),
        where('tenantId', '==', tenantId),
        where('type', '==', type),
        orderBy('createdAt', 'desc'),
        firestoreLimit(limit)
      );
    }

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        createdAt: data.createdAt?.toDate?.() || new Date(),
        updatedAt: data.updatedAt?.toDate?.() || new Date(),
        completedAt: data.completedAt?.toDate?.(),
      } as WalletTransaction;
    });
  }

  /**
   * Lista solicitações de saque
   */
  static async getWithdrawals(
    tenantId: string,
    status?: WithdrawalStatus
  ): Promise<WithdrawalRequest[]> {
    let q = query(
      collection(db, this.COLLECTION_WITHDRAWALS),
      where('tenantId', '==', tenantId),
      orderBy('requestedAt', 'desc')
    );

    if (status) {
      q = query(
        collection(db, this.COLLECTION_WITHDRAWALS),
        where('tenantId', '==', tenantId),
        where('status', '==', status),
        orderBy('requestedAt', 'desc')
      );
    }

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        requestedAt: data.requestedAt?.toDate?.() || new Date(),
        processedAt: data.processedAt?.toDate?.(),
        completedAt: data.completedAt?.toDate?.(),
        cancelledAt: data.cancelledAt?.toDate?.(),
        statusHistory: (data.statusHistory || []).map((h: any) => ({
          ...h,
          changedAt: h.changedAt?.toDate?.() || new Date(),
        })),
      } as WithdrawalRequest;
    });
  }

  /**
   * Obtém saque por ID
   */
  static async getWithdrawal(withdrawalId: string): Promise<WithdrawalRequest | null> {
    const withdrawalRef = doc(db, this.COLLECTION_WITHDRAWALS, withdrawalId);
    const withdrawalSnap = await getDoc(withdrawalRef);

    if (!withdrawalSnap.exists()) {
      return null;
    }

    const data = withdrawalSnap.data();
    return {
      ...data,
      id: withdrawalSnap.id,
      requestedAt: data.requestedAt?.toDate?.() || new Date(),
      processedAt: data.processedAt?.toDate?.(),
      completedAt: data.completedAt?.toDate?.(),
      cancelledAt: data.cancelledAt?.toDate?.(),
      statusHistory: (data.statusHistory || []).map((h: any) => ({
        ...h,
        changedAt: h.changedAt?.toDate?.() || new Date(),
      })),
    } as WithdrawalRequest;
  }

  /**
   * Obtém resumo financeiro
   */
  static async getSummary(tenantId: string): Promise<{
    balance: number;
    pendingBalance: number;
    blockedBalance: number;
    totalDeposits: number;
    totalWithdrawals: number;
    pendingWithdrawalsCount: number;
    pendingWithdrawalsAmount: number;
  }> {
    const wallet = await this.getWallet(tenantId);
    const pendingWithdrawals = await this.getWithdrawals(tenantId, 'pending');
    const processingWithdrawals = await this.getWithdrawals(tenantId, 'processing');

    const allPending = [...pendingWithdrawals, ...processingWithdrawals];

    return {
      balance: wallet.balance,
      pendingBalance: wallet.pendingBalance || 0,
      blockedBalance: wallet.blockedBalance || 0,
      totalDeposits: wallet.totalDeposits || 0,
      totalWithdrawals: wallet.totalWithdrawals || 0,
      pendingWithdrawalsCount: allPending.length,
      pendingWithdrawalsAmount: allPending.reduce((sum, w) => sum + w.amount, 0),
    };
  }
}
