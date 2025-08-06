import { MultiTenantFirestoreService } from '@/lib/firebase/firestore-v2';
import { Account, AccountStatus, BankAccount, BankTransaction, CostCenter, Commission, FinancialAlert, AlertType } from '@/lib/types/accounts';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  Timestamp,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
  writeBatch,
  QueryConstraint,
  onSnapshot,
  Unsubscribe
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { startOfMonth, endOfMonth, addDays, differenceInDays, isAfter, isBefore, format } from 'date-fns';

// Accounts Payable/Receivable Service
export class AccountsService extends MultiTenantFirestoreService<Account> {
  constructor(tenantId: string) {
    super(tenantId, 'accounts');
  }

  async getOverdue(): Promise<Account[]> {
    const today = new Date();
    const q = query(
      this.getCollectionRef(),
      where('status', 'in', [AccountStatus.PENDING, AccountStatus.PARTIALLY_PAID]),
      where('dueDate', '<', Timestamp.fromDate(today)),
      orderBy('dueDate', 'asc')
    );
    
    const snapshot = await getDocs(q);
    const accounts = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Account));

    // Calculate overdue days
    return accounts.map(account => ({
      ...account,
      overdueDays: differenceInDays(today, account.dueDate)
    }));
  }

  async getUpcoming(days: number = 7): Promise<Account[]> {
    const today = new Date();
    const futureDate = addDays(today, days);
    
    const q = query(
      this.getCollectionRef(),
      where('status', 'in', [AccountStatus.PENDING, AccountStatus.PARTIALLY_PAID]),
      where('dueDate', '>=', Timestamp.fromDate(today)),
      where('dueDate', '<=', Timestamp.fromDate(futureDate)),
      orderBy('dueDate', 'asc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Account));
  }

  async createFromReservation(reservationData: any): Promise<string> {
    const account: Omit<Account, 'id'> = {
      tenantId: reservationData.tenantId,
      type: 'receivable',
      category: 'rent' as any,
      description: `Reserva #${reservationData.id.slice(-6)} - ${reservationData.propertyName}`,
      originalAmount: reservationData.totalAmount,
      amount: reservationData.totalAmount,
      paidAmount: 0,
      remainingAmount: reservationData.totalAmount,
      issueDate: new Date(),
      dueDate: reservationData.checkIn,
      status: AccountStatus.PENDING,
      overdueDays: 0,
      isInstallment: false,
      propertyId: reservationData.propertyId,
      customerId: reservationData.clientId,
      reservationId: reservationData.id,
      autoCharge: true,
      remindersSent: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'system'
    };

    return this.create(account);
  }

  async processPayment(accountId: string, amount: number, paymentMethod: string): Promise<void> {
    const account = await this.getById(accountId);
    if (!account) throw new Error('Conta não encontrada');

    const paidAmount = account.paidAmount + amount;
    const remainingAmount = account.amount - paidAmount;
    
    const updates: Partial<Account> = {
      paidAmount,
      remainingAmount,
      updatedAt: new Date()
    };

    if (remainingAmount <= 0) {
      updates.status = AccountStatus.PAID;
      updates.paymentDate = new Date();
    } else {
      updates.status = AccountStatus.PARTIALLY_PAID;
    }

    await this.update(accountId, updates);

    // Create transaction record
    await addDoc(collection(db, 'transactions'), {
      type: account.type === 'receivable' ? 'income' : 'expense',
      category: account.category,
      description: `Pagamento - ${account.description}`,
      amount,
      date: serverTimestamp(),
      status: 'completed',
      propertyId: account.propertyId,
      clientId: account.customerId,
      reservationId: account.reservationId,
      paymentMethod,
      accountId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      tenantId: account.tenantId
    });
  }

  async calculateInterestAndFees(accountId: string): Promise<{ interest: number; fine: number }> {
    const account = await this.getById(accountId);
    if (!account || account.status === AccountStatus.PAID) {
      return { interest: 0, fine: 0 };
    }

    const today = new Date();
    const overdueDays = differenceInDays(today, account.dueDate);
    
    if (overdueDays <= 0) {
      return { interest: 0, fine: 0 };
    }

    let interest = 0;
    let fine = 0;

    // Calculate interest (monthly rate converted to daily)
    if (account.interestRate) {
      const dailyRate = account.interestRate / 30;
      interest = (account.remainingAmount * dailyRate * overdueDays) / 100;
    }

    // Calculate fine (one-time)
    if (account.fineRate && !account.fineAmount) {
      fine = (account.remainingAmount * account.fineRate) / 100;
    }

    return { interest, fine };
  }

  async createInstallments(baseAccount: Omit<Account, 'id'>, installments: number): Promise<string[]> {
    const installmentAmount = baseAccount.amount / installments;
    const batch = writeBatch(db);
    const ids: string[] = [];

    // Create parent account
    const parentRef = doc(collection(db, this.collectionName));
    batch.set(parentRef, {
      ...baseAccount,
      isInstallment: true,
      totalInstallments: installments,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    ids.push(parentRef.id);

    // Create installment accounts
    for (let i = 0; i < installments; i++) {
      const installmentRef = doc(collection(db, this.collectionName));
      const dueDate = addDays(baseAccount.dueDate, 30 * i);
      
      batch.set(installmentRef, {
        ...baseAccount,
        description: `${baseAccount.description} - Parcela ${i + 1}/${installments}`,
        originalAmount: installmentAmount,
        amount: installmentAmount,
        remainingAmount: installmentAmount,
        dueDate: Timestamp.fromDate(dueDate),
        isInstallment: true,
        installmentNumber: i + 1,
        totalInstallments: installments,
        parentAccountId: parentRef.id,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      ids.push(installmentRef.id);
    }

    await batch.commit();
    return ids;
  }

  subscribeToAlerts(callback: (alerts: FinancialAlert[]) => void): Unsubscribe {
    const q = query(
      collection(db, 'financial_alerts'),
      where('status', '==', 'active'),
      orderBy('severity', 'desc'),
      orderBy('createdAt', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
      const alerts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as FinancialAlert));
      callback(alerts);
    });
  }
}

// Bank Reconciliation Service
export class BankService extends MultiTenantFirestoreService<BankAccount> {
  constructor(tenantId: string) {
    super(tenantId, 'bank_accounts');
  }

  async importTransactions(bankAccountId: string, transactions: Partial<BankTransaction>[]): Promise<void> {
    const batch = writeBatch(db);
    
    for (const transaction of transactions) {
      const ref = doc(collection(db, 'bank_transactions'));
      batch.set(ref, {
        ...transaction,
        bankAccountId,
        status: 'pending',
        importedAt: serverTimestamp(),
        createdAt: serverTimestamp()
      });
    }

    await batch.commit();

    // Update bank account sync date
    await updateDoc(doc(db, this.collectionName, bankAccountId), {
      lastSyncDate: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  }

  async reconcileTransaction(
    bankTransactionId: string, 
    targetId: string, 
    targetType: 'transaction' | 'account',
    userId: string
  ): Promise<void> {
    await updateDoc(doc(db, 'bank_transactions', bankTransactionId), {
      status: 'reconciled',
      reconciledWithId: targetId,
      reconciledAt: serverTimestamp(),
      reconciledBy: userId,
      updatedAt: serverTimestamp()
    });

    // Update bank account reconciled balance
    const bankTransaction = await getDocs(
      query(collection(db, 'bank_transactions'), where('id', '==', bankTransactionId))
    );
    
    if (bankTransaction.docs.length > 0) {
      const txData = bankTransaction.docs[0].data() as BankTransaction;
      const bankAccount = await this.getById(txData.bankAccountId);
      
      if (bankAccount) {
        const reconciledTransactions = await getDocs(
          query(
            collection(db, 'bank_transactions'),
            where('bankAccountId', '==', txData.bankAccountId),
            where('status', '==', 'reconciled')
          )
        );

        const reconciledBalance = reconciledTransactions.docs.reduce((sum, doc) => {
          const tx = doc.data() as BankTransaction;
          return sum + (tx.type === 'credit' ? tx.amount : -tx.amount);
        }, 0);

        await this.update(txData.bankAccountId, {
          reconciledBalance,
          lastReconciledDate: new Date()
        });
      }
    }
  }

  async getUnreconciledTransactions(bankAccountId: string): Promise<BankTransaction[]> {
    const q = query(
      collection(db, 'bank_transactions'),
      where('bankAccountId', '==', bankAccountId),
      where('status', '==', 'pending'),
      orderBy('date', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as BankTransaction));
  }

  async suggestReconciliations(bankTransactionId: string): Promise<any[]> {
    const bankTx = await getDocs(
      query(collection(db, 'bank_transactions'), where('id', '==', bankTransactionId))
    );
    
    if (bankTx.docs.length === 0) return [];
    
    const txData = bankTx.docs[0].data() as BankTransaction;
    const suggestions = [];

    // Search for matching transactions
    const dateRange = 3; // days
    const startDate = addDays(txData.date, -dateRange);
    const endDate = addDays(txData.date, dateRange);

    const transactionQuery = query(
      collection(db, 'transactions'),
      where('amount', '==', txData.amount),
      where('date', '>=', Timestamp.fromDate(startDate)),
      where('date', '<=', Timestamp.fromDate(endDate))
    );

    const transactions = await getDocs(transactionQuery);
    
    transactions.docs.forEach(doc => {
      const tx = doc.data();
      const confidence = this.calculateMatchConfidence(txData, tx);
      
      if (confidence > 0.5) {
        suggestions.push({
          transactionId: doc.id,
          confidence,
          reason: this.getMatchReason(txData, tx),
          suggestedAt: new Date()
        });
      }
    });

    // Search for matching accounts
    const accountQuery = query(
      collection(db, 'accounts'),
      where('amount', '==', txData.amount),
      where('status', 'in', [AccountStatus.PENDING, AccountStatus.PARTIALLY_PAID])
    );

    const accounts = await getDocs(accountQuery);
    
    accounts.docs.forEach(doc => {
      const account = doc.data();
      const confidence = this.calculateAccountMatchConfidence(txData, account);
      
      if (confidence > 0.5) {
        suggestions.push({
          accountId: doc.id,
          confidence,
          reason: this.getAccountMatchReason(txData, account),
          suggestedAt: new Date()
        });
      }
    });

    return suggestions.sort((a, b) => b.confidence - a.confidence).slice(0, 5);
  }

  private calculateMatchConfidence(bankTx: BankTransaction, tx: any): number {
    let confidence = 0;
    
    // Exact amount match
    if (bankTx.amount === tx.amount) confidence += 0.4;
    
    // Date proximity (within 3 days)
    const daysDiff = Math.abs(differenceInDays(bankTx.date, tx.date));
    if (daysDiff === 0) confidence += 0.3;
    else if (daysDiff <= 1) confidence += 0.2;
    else if (daysDiff <= 3) confidence += 0.1;
    
    // Description similarity
    const desc1 = bankTx.description.toLowerCase();
    const desc2 = tx.description?.toLowerCase() || '';
    
    if (desc1.includes(desc2) || desc2.includes(desc1)) confidence += 0.2;
    
    // Type match
    if ((bankTx.type === 'credit' && tx.type === 'income') ||
        (bankTx.type === 'debit' && tx.type === 'expense')) {
      confidence += 0.1;
    }
    
    return Math.min(confidence, 1);
  }

  private calculateAccountMatchConfidence(bankTx: BankTransaction, account: any): number {
    let confidence = 0;
    
    // Amount match or partial payment
    if (bankTx.amount === account.remainingAmount) confidence += 0.5;
    else if (bankTx.amount === account.amount) confidence += 0.3;
    else if (bankTx.amount < account.remainingAmount) confidence += 0.2;
    
    // Due date proximity
    const daysDiff = Math.abs(differenceInDays(bankTx.date, account.dueDate));
    if (daysDiff <= 3) confidence += 0.2;
    else if (daysDiff <= 7) confidence += 0.1;
    
    // Type match
    if ((bankTx.type === 'credit' && account.type === 'receivable') ||
        (bankTx.type === 'debit' && account.type === 'payable')) {
      confidence += 0.2;
    }
    
    // Description keywords
    const desc = bankTx.description.toLowerCase();
    const keywords = ['aluguel', 'reserva', 'taxa', 'pagamento'];
    
    if (keywords.some(keyword => desc.includes(keyword))) confidence += 0.1;
    
    return Math.min(confidence, 1);
  }

  private getMatchReason(bankTx: BankTransaction, tx: any): string {
    const reasons = [];
    
    if (bankTx.amount === tx.amount) {
      reasons.push('Valor exato');
    }
    
    const daysDiff = Math.abs(differenceInDays(bankTx.date, tx.date));
    if (daysDiff === 0) {
      reasons.push('Mesma data');
    } else if (daysDiff <= 3) {
      reasons.push(`Data próxima (${daysDiff} dias)`);
    }
    
    return reasons.join(', ');
  }

  private getAccountMatchReason(bankTx: BankTransaction, account: any): string {
    const reasons = [];
    
    if (bankTx.amount === account.remainingAmount) {
      reasons.push('Valor pendente exato');
    } else if (bankTx.amount === account.amount) {
      reasons.push('Valor total da conta');
    }
    
    const daysDiff = Math.abs(differenceInDays(bankTx.date, account.dueDate));
    if (daysDiff <= 7) {
      reasons.push(`Próximo ao vencimento (${daysDiff} dias)`);
    }
    
    return reasons.join(', ');
  }
}

// Cost Center Service
export class CostCenterService extends MultiTenantFirestoreService<CostCenter> {
  constructor(tenantId: string) {
    super(tenantId, 'cost_centers');
  }

  async getHierarchy(): Promise<CostCenter[]> {
    const centers = await this.getAll();
    return this.buildHierarchy(centers);
  }

  private buildHierarchy(centers: CostCenter[], parentId: string | null = null): CostCenter[] {
    return centers
      .filter(c => c.parentId === parentId)
      .map(center => ({
        ...center,
        children: this.buildHierarchy(centers, center.id)
      } as any))
      .sort((a, b) => a.code.localeCompare(b.code));
  }

  async allocateExpense(amount: number, costCenterId: string, propertyIds?: string[]): Promise<Map<string, number>> {
    const costCenter = await this.getById(costCenterId);
    if (!costCenter) throw new Error('Centro de custo não encontrado');

    const allocations = new Map<string, number>();

    if (!costCenter.allocationRules || costCenter.allocationRules.length === 0) {
      // No rules, allocate equally
      const properties = propertyIds || costCenter.propertyIds || [];
      const perProperty = amount / properties.length;
      
      properties.forEach(propId => {
        allocations.set(propId, perProperty);
      });
    } else {
      // Apply allocation rules
      for (const rule of costCenter.allocationRules) {
        if (rule.type === 'percentage' && rule.propertyAllocations) {
          rule.propertyAllocations.forEach(({ propertyId, percentage }) => {
            allocations.set(propertyId, (amount * percentage) / 100);
          });
        } else if (rule.type === 'fixed' && rule.fixedAmounts) {
          const total = rule.fixedAmounts.reduce((sum, fa) => sum + fa.amount, 0);
          rule.fixedAmounts.forEach(({ propertyId, amount: fixedAmount }) => {
            allocations.set(propertyId, (amount * fixedAmount) / total);
          });
        }
      }
    }

    return allocations;
  }
}

// Commission Service
export class CommissionService extends MultiTenantFirestoreService<Commission> {
  constructor(tenantId: string) {
    super(tenantId, 'commissions');
  }

  async calculateCommissions(month: Date): Promise<Commission[]> {
    const startDate = startOfMonth(month);
    const endDate = endOfMonth(month);
    
    // Get all reservations for the month
    const reservationsQuery = query(
      collection(db, 'reservations'),
      where('checkIn', '>=', Timestamp.fromDate(startDate)),
      where('checkIn', '<=', Timestamp.fromDate(endDate)),
      where('status', '==', 'confirmed')
    );
    
    const reservations = await getDocs(reservationsQuery);
    const commissions: Commission[] = [];
    
    // Get commission rules
    const rulesQuery = query(
      collection(db, 'commission_rules'),
      where('status', '==', 'active')
    );
    
    const rules = await getDocs(rulesQuery);
    const rulesMap = new Map(rules.docs.map(doc => [doc.id, doc.data()]));
    
    // Calculate commissions for each reservation
    for (const reservationDoc of reservations.docs) {
      const reservation = reservationDoc.data();
      const applicableRules = this.findApplicableRules(reservation, rulesMap);
      
      for (const [ruleId, rule] of applicableRules) {
        const amount = this.calculateCommissionAmount(reservation.totalAmount, rule);
        
        if (amount > 0) {
          const commission: Omit<Commission, 'id'> = {
            tenantId: reservation.tenantId,
            type: 'payable',
            description: `Comissão - Reserva #${reservationDoc.id.slice(-6)}`,
            baseAmount: reservation.totalAmount,
            rate: rule.rate || 0,
            amount,
            status: 'pending',
            agentId: reservation.agentId || rule.agentIds?.[0] || '',
            agentName: reservation.agentName || '',
            propertyId: reservation.propertyId,
            reservationId: reservationDoc.id,
            referenceMonth: month,
            dueDate: addDays(endDate, 10), // 10 days after month end
            commissionRuleId: ruleId,
            createdAt: new Date(),
            updatedAt: new Date()
          };
          
          commissions.push(commission as Commission);
        }
      }
    }
    
    return commissions;
  }

  private findApplicableRules(reservation: any, rules: Map<string, any>): Map<string, any> {
    const applicable = new Map();
    
    for (const [id, rule] of rules) {
      if (rule.applyTo === 'all') {
        applicable.set(id, rule);
      } else if (rule.applyTo === 'specific') {
        if (rule.propertyIds?.includes(reservation.propertyId) ||
            rule.agentIds?.includes(reservation.agentId)) {
          applicable.set(id, rule);
        }
      }
      
      // Check date validity
      if (rule.validFrom && isAfter(reservation.checkIn, rule.validFrom)) {
        if (!rule.validUntil || isBefore(reservation.checkIn, rule.validUntil)) {
          applicable.set(id, rule);
        }
      }
    }
    
    return applicable;
  }

  private calculateCommissionAmount(baseAmount: number, rule: any): number {
    if (rule.type === 'percentage') {
      return (baseAmount * rule.rate) / 100;
    } else if (rule.type === 'fixed') {
      return rule.amount;
    } else if (rule.type === 'tiered' && rule.tiers) {
      for (const tier of rule.tiers) {
        if (baseAmount >= tier.from && baseAmount <= tier.to) {
          return (baseAmount * tier.rate) / 100;
        }
      }
    }
    
    return 0;
  }

  async approveCommission(commissionId: string, userId: string): Promise<void> {
    await this.update(commissionId, {
      status: 'approved',
      approvedBy: userId,
      approvedAt: new Date(),
      updatedAt: new Date()
    });
  }

  async payCommission(commissionId: string, paymentMethod: string, invoiceNumber?: string): Promise<void> {
    const commission = await this.getById(commissionId);
    if (!commission) throw new Error('Comissão não encontrada');
    
    await this.update(commissionId, {
      status: 'paid',
      paymentMethod,
      paymentDate: new Date(),
      invoiceNumber,
      updatedAt: new Date()
    });
    
    // Create expense transaction
    await addDoc(collection(db, 'transactions'), {
      type: 'expense',
      category: 'commission',
      description: commission.description,
      amount: commission.amount,
      date: serverTimestamp(),
      status: 'completed',
      propertyId: commission.propertyId,
      reservationId: commission.reservationId,
      paymentMethod,
      commissionId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      tenantId: commission.tenantId
    });
  }
}

// Financial Alerts Service
export class AlertsService extends MultiTenantFirestoreService<FinancialAlert> {
  constructor(tenantId: string) {
    super(tenantId, 'financial_alerts');
  }

  async checkAndCreateAlerts(): Promise<void> {
    const batch = writeBatch(db);
    const alerts: Partial<FinancialAlert>[] = [];
    
    // Check for overdue payments
    const accountsService = new AccountsService();
    const overdueAccounts = await accountsService.getOverdue();
    
    for (const account of overdueAccounts) {
      if (account.overdueDays > 0) {
        alerts.push({
          type: AlertType.OVERDUE_PAYMENT,
          severity: account.overdueDays > 30 ? 'critical' : account.overdueDays > 7 ? 'error' : 'warning',
          title: 'Pagamento Vencido',
          message: `${account.description} está vencido há ${account.overdueDays} dias`,
          targetType: 'account',
          targetId: account.id,
          status: 'active',
          actionRequired: true,
          actionUrl: `/dashboard/financeiro/contas/${account.id}`,
          suggestions: [
            'Enviar lembrete ao cliente',
            'Negociar novo prazo de pagamento',
            'Aplicar juros e multas'
          ],
          createdAt: new Date(),
          isRecurring: false,
          triggerCount: 1,
          tenantId: account.tenantId
        });
      }
    }
    
    // Check for upcoming due dates
    const upcomingAccounts = await accountsService.getUpcoming(3);
    
    for (const account of upcomingAccounts) {
      alerts.push({
        type: AlertType.UPCOMING_DUE_DATE,
        severity: 'info',
        title: 'Vencimento Próximo',
        message: `${account.description} vence em ${differenceInDays(account.dueDate, new Date())} dias`,
        targetType: 'account',
        targetId: account.id,
        status: 'active',
        actionRequired: false,
        actionUrl: `/dashboard/financeiro/contas/${account.id}`,
        suggestions: ['Enviar lembrete preventivo ao cliente'],
        createdAt: new Date(),
        isRecurring: false,
        triggerCount: 1,
        tenantId: account.tenantId
      });
    }
    
    // Check bank reconciliation
    const bankService = new BankService();
    const bankAccounts = await bankService.getAll();
    
    for (const bankAccount of bankAccounts) {
      const unreconciledTx = await bankService.getUnreconciledTransactions(bankAccount.id);
      
      if (unreconciledTx.length > 10) {
        alerts.push({
          type: AlertType.UNRECONCILED_TRANSACTIONS,
          severity: 'warning',
          title: 'Transações Não Conciliadas',
          message: `${unreconciledTx.length} transações aguardando conciliação em ${bankAccount.name}`,
          targetType: 'general',
          targetId: bankAccount.id,
          status: 'active',
          actionRequired: true,
          actionUrl: `/dashboard/financeiro/conciliacao/${bankAccount.id}`,
          suggestions: ['Revisar e conciliar transações pendentes'],
          createdAt: new Date(),
          isRecurring: false,
          triggerCount: 1,
          tenantId: bankAccount.tenantId
        });
      }
    }
    
    // Save all alerts
    for (const alert of alerts) {
      const ref = doc(collection(db, this.collectionName));
      batch.set(ref, {
        ...alert,
        createdAt: serverTimestamp()
      });
    }
    
    await batch.commit();
  }

  async acknowledgeAlert(alertId: string, userId: string): Promise<void> {
    await this.update(alertId, {
      status: 'acknowledged',
      acknowledgedAt: new Date(),
      acknowledgedBy: userId
    });
  }

  async resolveAlert(alertId: string, userId: string): Promise<void> {
    await this.update(alertId, {
      status: 'resolved',
      resolvedAt: new Date(),
      resolvedBy: userId
    });
  }
}

// Export service instances
// Factory functions for creating tenant-scoped services
export const createAccountsService = (tenantId: string) => new AccountsService(tenantId);

// Backward compatibility - use with default tenant
export const accountsService = new AccountsService(process.env.DEFAULT_TENANT_ID || 'default');
export const createBankService = (tenantId: string) => new BankService(tenantId);
export const createCostCenterService = (tenantId: string) => new CostCenterService(tenantId);
export const createCommissionService = (tenantId: string) => new CommissionService(tenantId);
export const createAlertsService = (tenantId: string) => new AlertsService(tenantId);