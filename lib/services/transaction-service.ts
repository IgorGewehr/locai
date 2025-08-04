import { TenantServiceFactory } from '@/lib/firebase/firestore-v2';
import { Transaction } from '@/lib/types';
import { 
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { startOfMonth, endOfMonth, addMonths, addWeeks, addYears, isBefore } from 'date-fns';

interface TransactionFilters {
  type?: 'income' | 'expense';
  status?: 'pending' | 'completed' | 'cancelled';
  category?: string;
  propertyId?: string;
  clientId?: string;
  reservationId?: string;
  startDate?: Date;
  endDate?: Date;
  isRecurring?: boolean;
  minAmount?: number;
  maxAmount?: number;
  paymentMethod?: string;
  tags?: string[];
}

interface RecurringTransactionInput {
  baseTransaction: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt' | 'isRecurring' | 'parentTransactionId'>;
  recurringType: 'monthly' | 'weekly' | 'yearly';
  recurringEndDate: Date;
  createFirstNow?: boolean;
}

interface TransactionStats {
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  pendingIncome: number;
  pendingExpenses: number;
  transactionCount: {
    income: number;
    expense: number;
    pending: number;
    completed: number;
  };
  byCategory: Record<string, number>;
  byPaymentMethod: Record<string, number>;
  byProperty: Record<string, { income: number; expense: number; balance: number }>;
}

class TransactionService extends FirestoreService<Transaction> {
  constructor() {
    super('transactions');
  }

  async getFiltered(filters: TransactionFilters, pageSize = 50, lastDoc?: DocumentSnapshot): Promise<{
    transactions: Transaction[];
    lastDocument?: DocumentSnapshot;
    hasMore: boolean;
  }> {
    const constraints: QueryConstraint[] = [];

    // Filtros básicos
    if (filters.type) {
      constraints.push(where('type', '==', filters.type));
    }
    if (filters.status) {
      constraints.push(where('status', '==', filters.status));
    }
    if (filters.category) {
      constraints.push(where('category', '==', filters.category));
    }
    if (filters.propertyId) {
      constraints.push(where('propertyId', '==', filters.propertyId));
    }
    if (filters.clientId) {
      constraints.push(where('clientId', '==', filters.clientId));
    }
    if (filters.reservationId) {
      constraints.push(where('reservationId', '==', filters.reservationId));
    }
    if (filters.isRecurring !== undefined) {
      constraints.push(where('isRecurring', '==', filters.isRecurring));
    }
    if (filters.paymentMethod) {
      constraints.push(where('paymentMethod', '==', filters.paymentMethod));
    }

    // Filtros de valor
    if (filters.minAmount !== undefined) {
      constraints.push(where('amount', '>=', filters.minAmount));
    }
    if (filters.maxAmount !== undefined) {
      constraints.push(where('amount', '<=', filters.maxAmount));
    }

    // Filtros de data
    if (filters.startDate) {
      constraints.push(where('date', '>=', Timestamp.fromDate(filters.startDate)));
    }
    if (filters.endDate) {
      constraints.push(where('date', '<=', Timestamp.fromDate(filters.endDate)));
    }

    // Ordenação e paginação
    constraints.push(orderBy('date', 'desc'));
    constraints.push(limit(pageSize + 1));

    if (lastDoc) {
      constraints.push(startAfter(lastDoc));
    }

    const q = query(collection(db, this.collectionName), ...constraints);
    const snapshot = await getDocs(q);
    
    const transactions = snapshot.docs.slice(0, pageSize).map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Transaction));

    return {
      transactions,
      lastDocument: snapshot.docs[pageSize - 1],
      hasMore: snapshot.docs.length > pageSize
    };
  }

  async getByDateRange(startDate: Date, endDate: Date): Promise<Transaction[]> {
    const q = query(
      collection(db, this.collectionName),
      where('date', '>=', Timestamp.fromDate(startDate)),
      where('date', '<=', Timestamp.fromDate(endDate)),
      orderBy('date', 'desc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Transaction));
  }

  async getRecurring(): Promise<Transaction[]> {
    const q = query(
      collection(db, this.collectionName),
      where('isRecurring', '==', true),
      where('parentTransactionId', '==', null),
      orderBy('date', 'desc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Transaction));
  }

  async createRecurringTransaction(input: RecurringTransactionInput): Promise<string> {
    const { baseTransaction, recurringType, recurringEndDate, createFirstNow = true } = input;
    
    // Criar a transação pai (template)
    const parentTransaction: Omit<Transaction, 'id'> = {
      ...baseTransaction,
      isRecurring: true,
      recurringType,
      recurringEndDate,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdByAI: false
    };

    const parentRef = await addDoc(collection(db, this.collectionName), {
      ...parentTransaction,
      date: serverTimestamp(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    // Criar a primeira ocorrência se solicitado
    if (createFirstNow) {
      await this.createRecurringInstance(tenantId, parentRef.id, baseTransaction.date);
    }

    return parentRef.id;
  }

  async createRecurringInstance(parentTransactionId: string, date: Date): Promise<string> {
    const parentDoc = await this.getById(parentTransactionId);
    if (!parentDoc) {
      throw new Error('Transação recorrente pai não encontrada');
    }

    const instance: Omit<Transaction, 'id'> = {
      ...parentDoc,
      parentTransactionId,
      date,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    delete (instance as any).recurringType;
    delete (instance as any).recurringEndDate;

    const ref = await addDoc(collection(db, this.collectionName), {
      ...instance,
      date: Timestamp.fromDate(date),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    return ref.id;
  }

  async processRecurringTransactions(): Promise<void> {
    const recurringTransactions = await this.getRecurring();
    const batch = writeBatch(db);
    const today = new Date();

    for (const transaction of recurringTransactions) {
      if (transaction.recurringEndDate && isBefore(transaction.recurringEndDate, today)) {
        continue;
      }

      // Verificar última instância criada
      const lastInstanceQuery = query(
        collection(db, this.collectionName),
        where('parentTransactionId', '==', transaction.id),
        orderBy('date', 'desc'),
        limit(1)
      );
      
      const lastInstanceSnapshot = await getDocs(lastInstanceQuery);
      let nextDate: Date;

      if (lastInstanceSnapshot.empty) {
        nextDate = transaction.date;
      } else {
        const lastInstance = lastInstanceSnapshot.docs[0].data();
        const lastDate = lastInstance.date.toDate();

        switch (transaction.recurringType) {
          case 'weekly':
            nextDate = addWeeks(lastDate, 1);
            break;
          case 'monthly':
            nextDate = addMonths(lastDate, 1);
            break;
          case 'yearly':
            nextDate = addYears(lastDate, 1);
            break;
          default:
            continue;
        }
      }

      // Criar instâncias até a data atual
      while (isBefore(nextDate, today)) {
        if (transaction.recurringEndDate && isBefore(transaction.recurringEndDate, nextDate)) {
          break;
        }

        const newInstance = {
          ...transaction,
          parentTransactionId: transaction.id,
          date: Timestamp.fromDate(nextDate),
          status: 'pending' as const,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };

        delete (newInstance as any).id;
        delete (newInstance as any).recurringType;
        delete (newInstance as any).recurringEndDate;

        batch.set(doc(collection(db, this.collectionName)), newInstance);

        // Próxima data
        switch (transaction.recurringType) {
          case 'weekly':
            nextDate = addWeeks(nextDate, 1);
            break;
          case 'monthly':
            nextDate = addMonths(nextDate, 1);
            break;
          case 'yearly':
            nextDate = addYears(nextDate, 1);
            break;
        }
      }
    }

    await batch.commit();
  }

  async confirmTransaction(transactionId: string, confirmedBy: string): Promise<void> {
    await updateDoc(doc(db, this.collectionName, transactionId), {
      status: 'completed',
      confirmedBy,
      confirmedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  }

  async cancelTransaction(transactionId: string, reason?: string): Promise<void> {
    const updates: any = {
      status: 'cancelled',
      updatedAt: serverTimestamp()
    };

    if (reason) {
      updates.notes = reason;
    }

    await updateDoc(doc(db, this.collectionName, transactionId), updates);
  }

  async getStats(filters?: TransactionFilters): Promise<TransactionStats> {
    const transactions = filters 
      ? (await this.getFiltered(filters)).transactions
      : await this.getAll();

    const stats: TransactionStats = {
      totalIncome: 0,
      totalExpenses: 0,
      balance: 0,
      pendingIncome: 0,
      pendingExpenses: 0,
      transactionCount: {
        income: 0,
        expense: 0,
        pending: 0,
        completed: 0
      },
      byCategory: {},
      byPaymentMethod: {},
      byProperty: {}
    };

    transactions.forEach(transaction => {
      // Contadores
      stats.transactionCount[transaction.type]++;
      stats.transactionCount[transaction.status]++;

      // Totais por tipo e status
      if (transaction.type === 'income') {
        if (transaction.status === 'completed') {
          stats.totalIncome += transaction.amount;
        } else if (transaction.status === 'pending') {
          stats.pendingIncome += transaction.amount;
        }
      } else {
        if (transaction.status === 'completed') {
          stats.totalExpenses += transaction.amount;
        } else if (transaction.status === 'pending') {
          stats.pendingExpenses += transaction.amount;
        }
      }

      // Por categoria
      if (!stats.byCategory[transaction.category]) {
        stats.byCategory[transaction.category] = 0;
      }
      if (transaction.status === 'completed') {
        stats.byCategory[transaction.category] += 
          transaction.type === 'income' ? transaction.amount : -transaction.amount;
      }

      // Por método de pagamento
      if (!stats.byPaymentMethod[transaction.paymentMethod]) {
        stats.byPaymentMethod[transaction.paymentMethod] = 0;
      }
      if (transaction.status === 'completed') {
        stats.byPaymentMethod[transaction.paymentMethod] += transaction.amount;
      }

      // Por propriedade
      if (transaction.propertyId) {
        if (!stats.byProperty[transaction.propertyId]) {
          stats.byProperty[transaction.propertyId] = {
            income: 0,
            expense: 0,
            balance: 0
          };
        }
        
        if (transaction.status === 'completed') {
          if (transaction.type === 'income') {
            stats.byProperty[transaction.propertyId].income += transaction.amount;
          } else {
            stats.byProperty[transaction.propertyId].expense += transaction.amount;
          }
          stats.byProperty[transaction.propertyId].balance = 
            stats.byProperty[transaction.propertyId].income - 
            stats.byProperty[transaction.propertyId].expense;
        }
      }
    });

    stats.balance = stats.totalIncome - stats.totalExpenses;

    return stats;
  }

  async getMonthlyStats(year: number, month: number): Promise<TransactionStats> {
    const startDate = startOfMonth(new Date(year, month - 1));
    const endDate = endOfMonth(new Date(year, month - 1));

    return this.getStats({
      startDate,
      endDate
    });
  }

  async bulkUpdateStatus(transactionIds: string[], status: 'completed' | 'cancelled', confirmedBy?: string): Promise<void> {
    const batch = writeBatch(db);

    transactionIds.forEach(id => {
      const updates: any = {
        status,
        updatedAt: serverTimestamp()
      };

      if (status === 'completed' && confirmedBy) {
        updates.confirmedBy = confirmedBy;
        updates.confirmedAt = serverTimestamp();
      }

      batch.update(doc(db, this.collectionName, id), updates);
    });

    await batch.commit();
  }
}

export const transactionService = new TransactionService();