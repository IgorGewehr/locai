import { FirestoreService } from './firestore';
import { Transaction } from '@/lib/types';
import { Timestamp, query, where, orderBy, limit, Query, DocumentData, startAfter, endBefore } from 'firebase/firestore';

export class TransactionService extends FirestoreService<Transaction> {
  constructor() {
    super('transactions');
  }

  /**
   * Create a new transaction
   */
  async createTransaction(data: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>): Promise<Transaction> {
    const now = new Date();
    const transaction: Omit<Transaction, 'id'> = {
      ...data,
      createdAt: now,
      updatedAt: now,
      confirmedAt: data.status === 'completed' ? now : undefined,
    };

    return this.create(transaction);
  }

  /**
   * Update transaction status
   */
  async updateStatus(
    id: string, 
    status: Transaction['status'], 
    confirmedBy?: string
  ): Promise<Transaction> {
    const updates: Partial<Transaction> = {
      status,
      updatedAt: new Date(),
    };

    if (status === 'completed' && confirmedBy) {
      updates.confirmedBy = confirmedBy;
      updates.confirmedAt = new Date();
    }

    return this.update(id, updates);
  }

  /**
   * Get transactions by reservation
   */
  async getByReservation(reservationId: string): Promise<Transaction[]> {
    const q = query(
      this.collection,
      where('reservationId', '==', reservationId),
      orderBy('createdAt', 'desc')
    );
    return this.queryDocuments(q);
  }

  /**
   * Get transactions by client
   */
  async getByClient(clientId: string): Promise<Transaction[]> {
    const q = query(
      this.collection,
      where('clientId', '==', clientId),
      orderBy('createdAt', 'desc')
    );
    return this.queryDocuments(q);
  }

  /**
   * Get transactions by property
   */
  async getByProperty(propertyId: string): Promise<Transaction[]> {
    const q = query(
      this.collection,
      where('propertyId', '==', propertyId),
      orderBy('createdAt', 'desc')
    );
    return this.queryDocuments(q);
  }

  /**
   * Get transactions by date range
   */
  async getByDateRange(startDate: Date, endDate: Date, tenantId?: string): Promise<Transaction[]> {
    let q: Query<DocumentData> = query(
      this.collection,
      where('date', '>=', Timestamp.fromDate(startDate)),
      where('date', '<=', Timestamp.fromDate(endDate))
    );

    if (tenantId) {
      q = query(q, where('tenantId', '==', tenantId));
    }

    q = query(q, orderBy('date', 'desc'));
    return this.queryDocuments(q);
  }

  /**
   * Get transactions by category
   */
  async getByCategory(
    category: Transaction['category'],
    subcategory?: string,
    tenantId?: string
  ): Promise<Transaction[]> {
    let q: Query<DocumentData> = query(
      this.collection,
      where('category', '==', category)
    );

    if (subcategory) {
      q = query(q, where('subcategory', '==', subcategory));
    }

    if (tenantId) {
      q = query(q, where('tenantId', '==', tenantId));
    }

    q = query(q, orderBy('createdAt', 'desc'));
    return this.queryDocuments(q);
  }

  /**
   * Get recurring transactions
   */
  async getRecurringTransactions(tenantId?: string): Promise<Transaction[]> {
    let q: Query<DocumentData> = query(
      this.collection,
      where('isRecurring', '==', true)
    );

    if (tenantId) {
      q = query(q, where('tenantId', '==', tenantId));
    }

    q = query(q, orderBy('createdAt', 'desc'));
    return this.queryDocuments(q);
  }

  /**
   * Get child transactions of a recurring parent
   */
  async getChildTransactions(parentTransactionId: string): Promise<Transaction[]> {
    const q = query(
      this.collection,
      where('parentTransactionId', '==', parentTransactionId),
      orderBy('date', 'desc')
    );
    return this.queryDocuments(q);
  }

  /**
   * Get transactions created by AI
   */
  async getAICreatedTransactions(conversationId?: string): Promise<Transaction[]> {
    let q: Query<DocumentData> = query(
      this.collection,
      where('createdByAI', '==', true)
    );

    if (conversationId) {
      q = query(q, where('aiConversationId', '==', conversationId));
    }

    q = query(q, orderBy('createdAt', 'desc'));
    return this.queryDocuments(q);
  }

  /**
   * Calculate totals for a period
   */
  async calculateTotals(
    startDate: Date,
    endDate: Date,
    tenantId?: string
  ): Promise<{
    income: number;
    expense: number;
    balance: number;
    byCategory: Record<string, { income: number; expense: number }>;
  }> {
    const transactions = await this.getByDateRange(startDate, endDate, tenantId);
    
    const totals = {
      income: 0,
      expense: 0,
      balance: 0,
      byCategory: {} as Record<string, { income: number; expense: number }>,
    };

    transactions.forEach(transaction => {
      if (transaction.status === 'completed') {
        if (transaction.type === 'income') {
          totals.income += transaction.amount;
        } else {
          totals.expense += transaction.amount;
        }

        // Calculate by category
        if (!totals.byCategory[transaction.category]) {
          totals.byCategory[transaction.category] = { income: 0, expense: 0 };
        }

        if (transaction.type === 'income') {
          totals.byCategory[transaction.category].income += transaction.amount;
        } else {
          totals.byCategory[transaction.category].expense += transaction.amount;
        }
      }
    });

    totals.balance = totals.income - totals.expense;
    return totals;
  }

  /**
   * Get pending transactions
   */
  async getPendingTransactions(tenantId?: string): Promise<Transaction[]> {
    let q: Query<DocumentData> = query(
      this.collection,
      where('status', '==', 'pending')
    );

    if (tenantId) {
      q = query(q, where('tenantId', '==', tenantId));
    }

    q = query(q, orderBy('date', 'asc'));
    return this.queryDocuments(q);
  }

  /**
   * Search transactions by description or notes
   */
  async searchTransactions(searchTerm: string, tenantId?: string): Promise<Transaction[]> {
    // Note: Firestore doesn't support full-text search natively
    // This is a simple implementation that fetches all and filters
    // For production, consider using Algolia or ElasticSearch
    
    let allTransactions: Transaction[];
    
    if (tenantId) {
      const q = query(
        this.collection,
        where('tenantId', '==', tenantId),
        orderBy('createdAt', 'desc')
      );
      allTransactions = await this.queryDocuments(q);
    } else {
      allTransactions = await this.getAll();
    }

    const searchLower = searchTerm.toLowerCase();
    return allTransactions.filter(transaction => 
      transaction.description.toLowerCase().includes(searchLower) ||
      (transaction.notes && transaction.notes.toLowerCase().includes(searchLower)) ||
      (transaction.tags && transaction.tags.some(tag => tag.toLowerCase().includes(searchLower)))
    );
  }

  /**
   * Get transactions with pagination
   */
  async getTransactionsPaginated(
    pageSize: number,
    startAfterDoc?: any,
    filters?: {
      type?: 'income' | 'expense';
      status?: Transaction['status'];
      category?: Transaction['category'];
      tenantId?: string;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<{ transactions: Transaction[]; lastDoc: any }> {
    let q: Query<DocumentData> = this.collection;

    // Apply filters
    if (filters?.type) {
      q = query(q, where('type', '==', filters.type));
    }
    if (filters?.status) {
      q = query(q, where('status', '==', filters.status));
    }
    if (filters?.category) {
      q = query(q, where('category', '==', filters.category));
    }
    if (filters?.tenantId) {
      q = query(q, where('tenantId', '==', filters.tenantId));
    }
    if (filters?.startDate) {
      q = query(q, where('date', '>=', Timestamp.fromDate(filters.startDate)));
    }
    if (filters?.endDate) {
      q = query(q, where('date', '<=', Timestamp.fromDate(filters.endDate)));
    }

    // Add ordering and pagination
    q = query(q, orderBy('date', 'desc'), limit(pageSize));
    
    if (startAfterDoc) {
      q = query(q, startAfter(startAfterDoc));
    }

    const snapshot = await this.db.getDocs(q);
    const transactions = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Transaction));

    const lastDoc = snapshot.docs[snapshot.docs.length - 1];

    return { transactions, lastDoc };
  }

  /**
   * Create recurring transactions for a period
   */
  async generateRecurringTransactions(
    parentTransaction: Transaction,
    until: Date
  ): Promise<Transaction[]> {
    if (!parentTransaction.isRecurring || !parentTransaction.recurringType) {
      throw new Error('Transaction is not recurring');
    }

    const generatedTransactions: Transaction[] = [];
    let currentDate = new Date(parentTransaction.date);
    
    while (currentDate <= until && (!parentTransaction.recurringEndDate || currentDate <= parentTransaction.recurringEndDate)) {
      // Calculate next date based on recurring type
      switch (parentTransaction.recurringType) {
        case 'weekly':
          currentDate.setDate(currentDate.getDate() + 7);
          break;
        case 'monthly':
          currentDate.setMonth(currentDate.getMonth() + 1);
          break;
        case 'yearly':
          currentDate.setFullYear(currentDate.getFullYear() + 1);
          break;
      }

      if (currentDate <= until && (!parentTransaction.recurringEndDate || currentDate <= parentTransaction.recurringEndDate)) {
        // Create child transaction
        const childTransaction = await this.createTransaction({
          ...parentTransaction,
          id: undefined as any, // Will be generated
          date: new Date(currentDate),
          parentTransactionId: parentTransaction.id,
          isRecurring: false, // Child transactions are not recurring
          recurringType: undefined,
          recurringEndDate: undefined,
          status: 'pending', // New recurring transactions start as pending
          confirmedBy: undefined,
          confirmedAt: undefined,
        });

        generatedTransactions.push(childTransaction);
      }
    }

    return generatedTransactions;
  }
}

// Export singleton instance
export const transactionService = new TransactionService();