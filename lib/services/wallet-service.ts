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
  Timestamp
} from 'firebase/firestore';
import { Wallet, WalletTransaction, WithdrawalRequest } from '@/lib/types/financial-wallet';
import { logger } from '@/lib/utils/logger';

export class WalletService {
  private static COLLECTION_WALLETS = 'wallets';
  private static COLLECTION_TRANSACTIONS = 'wallet_transactions';
  private static COLLECTION_WITHDRAWALS = 'withdrawal_requests';

  /**
   * Obtém a carteira de um tenant. Cria se não existir.
   */
  static async getWallet(tenantId: string): Promise<Wallet> {
    const walletRef = doc(db, this.COLLECTION_WALLETS, tenantId);
    const walletSnap = await getDoc(walletRef);

    if (walletSnap.exists()) {
      const data = walletSnap.data();
      return {
        ...data,
        updatedAt: (data.updatedAt as Timestamp).toDate(),
        createdAt: (data.createdAt as Timestamp).toDate(),
      } as Wallet;
    }

    // Criar carteira se não existir
    const newWallet: Wallet = {
      tenantId,
      balance: 0,
      currency: 'BRL',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await setDoc(walletRef, {
      ...newWallet,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    return newWallet;
  }

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

      const currentBalance = walletSnap.data().balance || 0;
      let newBalance = currentBalance;

      // Calcular novo saldo
      if (data.type === 'deposit') {
        newBalance += data.amount;
      } else if (data.type === 'withdrawal' || data.type === 'fee') {
        newBalance -= data.amount;
      } else if (data.type === 'adjustment') {
        // Ajuste pode ser positivo ou negativo, assumindo que amount já vem com sinal correto ou lógica específica
        // Para simplificar, vamos assumir que adjustment soma (se for negativo, subtrai)
        newBalance += data.amount;
      }

      // Validar saldo negativo para saques
      if (newBalance < 0 && (data.type === 'withdrawal')) {
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
        updatedAt: new Date()
      };

      // Atualizar carteira
      transaction.update(walletRef, {
        balance: newBalance,
        updatedAt: serverTimestamp()
      });

      // Salvar transação da carteira
      transaction.set(transactionRef, {
        ...newTransaction,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // SYNC: Criar transação no fluxo financeiro principal
      // Determinar categoria baseada no metadata ou descrição
      let category = 'other';
      if (data.metadata?.paymentMethod === 'PIX') category = 'other'; // Poderia ser mais específico

      const mainTransactionRef = doc(collection(db, 'transactions'));
      const mainTransaction = {
        tenantId,
        amount: data.amount,
        type: data.type === 'deposit' ? 'income' : 'expense',
        status: data.status === 'completed' ? 'paid' : 'pending',
        description: data.description,
        category: 'other', // Default category
        paymentMethod: data.metadata?.paymentMethod || 'pix',
        date: new Date(),
        dueDate: new Date(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        walletTransactionId: transactionRef.id, // Link para rastreabilidade
        metadata: data.metadata
      };

      transaction.set(mainTransactionRef, mainTransaction);

      return newTransaction;
    });
  }

  /**
   * Solicita um saque.
   */
  static async requestWithdrawal(
    tenantId: string,
    amount: number,
    bankInfo: WithdrawalRequest['bankInfo']
  ): Promise<WithdrawalRequest> {
    return await runTransaction(db, async (transaction) => {
      const walletRef = doc(db, this.COLLECTION_WALLETS, tenantId);
      const walletSnap = await transaction.get(walletRef);

      if (!walletSnap.exists()) {
        throw new Error('Wallet not found');
      }

      const currentBalance = walletSnap.data().balance || 0;

      if (currentBalance < amount) {
        throw new Error('Saldo insuficiente para saque');
      }

      // 1. Criar transação de débito (pendente ou bloqueada?)
      // Na verdade, é melhor debitar imediatamente para evitar double spending
      // Se o saque for rejeitado, fazemos um estorno (deposit)

      const transactionRef = doc(collection(db, this.COLLECTION_TRANSACTIONS));
      const withdrawalRef = doc(collection(db, this.COLLECTION_WITHDRAWALS));

      const debitTransaction: WalletTransaction = {
        id: transactionRef.id,
        walletId: tenantId,
        tenantId,
        type: 'withdrawal',
        amount: amount,
        status: 'completed', // O débito na carteira é imediato
        description: `Solicitação de saque #${withdrawalRef.id.substring(0, 8)}`,
        referenceId: withdrawalRef.id,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const withdrawalRequest: WithdrawalRequest = {
        id: withdrawalRef.id,
        walletId: tenantId,
        tenantId,
        amount,
        status: 'pending',
        bankInfo,
        requestedAt: new Date(),
        transactionId: transactionRef.id
      };

      // Atualizar saldo
      transaction.update(walletRef, {
        balance: currentBalance - amount,
        updatedAt: serverTimestamp()
      });

      // Salvar transação
      transaction.set(transactionRef, {
        ...debitTransaction,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Salvar solicitação
      transaction.set(withdrawalRef, {
        ...withdrawalRequest,
        requestedAt: serverTimestamp()
      });

      // SYNC: Criar transação de despesa no fluxo financeiro principal
      const mainTransactionRef = doc(collection(db, 'transactions'));
      const mainTransaction = {
        tenantId,
        amount: amount,
        type: 'expense',
        status: 'pending', // Saque é pendente até ser processado
        description: `Saque solicitado #${withdrawalRef.id.substring(0, 8)}`,
        category: 'other', // Poderia ser 'transfer' ou 'withdrawal' se existisse
        paymentMethod: 'bank_transfer',
        date: new Date(),
        dueDate: new Date(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        walletTransactionId: transactionRef.id,
        withdrawalRequestId: withdrawalRef.id
      };

      transaction.set(mainTransactionRef, mainTransaction);

      return withdrawalRequest;
    });
  }

  /**
   * Lista transações da carteira.
   */
  static async getTransactions(tenantId: string, limit = 20): Promise<WalletTransaction[]> {
    const q = query(
      collection(db, this.COLLECTION_TRANSACTIONS),
      where('tenantId', '==', tenantId),
      orderBy('createdAt', 'desc')
      // limit seria aplicado aqui, mas o firebase precisa de index composto para where+orderBy
      // Vamos deixar sem limit por enquanto ou assumir que o index existe/será criado
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        createdAt: (data.createdAt as Timestamp).toDate(),
        updatedAt: (data.updatedAt as Timestamp).toDate(),
      } as WalletTransaction;
    });
  }

  /**
   * Lista solicitações de saque.
   */
  static async getWithdrawals(tenantId: string): Promise<WithdrawalRequest[]> {
    const q = query(
      collection(db, this.COLLECTION_WITHDRAWALS),
      where('tenantId', '==', tenantId),
      orderBy('requestedAt', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        requestedAt: (data.requestedAt as Timestamp).toDate(),
        processedAt: data.processedAt ? (data.processedAt as Timestamp).toDate() : undefined,
      } as WithdrawalRequest;
    });
  }
}
