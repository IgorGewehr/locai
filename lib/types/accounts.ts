// Types for accounts payable and receivable
import { Transaction } from './index';

export interface Account {
  id: string;
  tenantId: string;
  
  // Basic info
  type: 'payable' | 'receivable';
  category: AccountCategory;
  subcategory?: string;
  description: string;
  
  // Financial data
  originalAmount: number;
  amount: number; // Current amount (may differ due to interest/fees)
  paidAmount: number;
  remainingAmount: number;
  
  // Dates
  issueDate: Date;
  dueDate: Date;
  paymentDate?: Date;
  
  // Status
  status: AccountStatus;
  overdueDays: number;
  
  // Payment info
  paymentMethod?: string;
  bankAccountId?: string;
  
  // Interest and fees
  interestRate?: number; // Monthly percentage
  interestAmount?: number;
  fineRate?: number; // Percentage
  fineAmount?: number;
  discountAmount?: number;
  
  // Installments
  isInstallment: boolean;
  installmentNumber?: number;
  totalInstallments?: number;
  parentAccountId?: string; // For installment children
  
  // Relationships
  supplierId?: string;
  customerId?: string;
  propertyId?: string;
  reservationId?: string;
  contractId?: string;
  
  // Documents
  invoiceNumber?: string;
  invoiceUrl?: string;
  attachments?: Attachment[];
  
  // Accounting
  costCenterId?: string;
  accountingCategoryId?: string;
  
  // Notes and tags
  notes?: string;
  tags?: string[];
  
  // Automation
  autoCharge?: boolean;
  remindersSent?: number;
  lastReminderDate?: Date;
  
  // Audit
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  approvedBy?: string;
  approvedAt?: Date;
  
  // Linked transactions
  transactions?: Transaction[];
}

export enum AccountStatus {
  DRAFT = 'draft',
  PENDING = 'pending',
  PARTIALLY_PAID = 'partially_paid',
  PAID = 'paid',
  OVERDUE = 'overdue',
  CANCELLED = 'cancelled',
  NEGOTIATING = 'negotiating',
  IN_PROTEST = 'in_protest',
  WRITTEN_OFF = 'written_off'
}

export enum AccountCategory {
  // Receivables
  RENT = 'rent',
  BOOKING_FEE = 'booking_fee',
  CLEANING_FEE = 'cleaning_fee',
  SECURITY_DEPOSIT = 'security_deposit',
  LATE_FEE = 'late_fee',
  DAMAGE_CHARGE = 'damage_charge',
  EXTRA_SERVICE = 'extra_service',
  COMMISSION_RECEIVABLE = 'commission_receivable',
  
  // Payables
  PROPERTY_MAINTENANCE = 'property_maintenance',
  CLEANING_SERVICE = 'cleaning_service',
  UTILITIES = 'utilities',
  PROPERTY_TAX = 'property_tax',
  INSURANCE = 'insurance',
  MARKETING = 'marketing',
  COMMISSION_PAYABLE = 'commission_payable',
  PROFESSIONAL_SERVICES = 'professional_services',
  SUPPLIES = 'supplies',
  OTHER = 'other'
}

export interface Attachment {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
  uploadedAt: Date;
  uploadedBy: string;
}

// Bank reconciliation types
export interface BankAccount {
  id: string;
  tenantId: string;
  
  // Basic info
  name: string;
  bankName: string;
  bankCode?: string;
  agency?: string;
  accountNumber: string;
  accountType: 'checking' | 'savings' | 'investment';
  
  // Balances
  currentBalance: number;
  availableBalance: number;
  reconciledBalance: number;
  lastReconciledDate?: Date;
  
  // Status
  status: 'active' | 'inactive';
  isDefault: boolean;
  
  // Integration
  integrationId?: string;
  integrationType?: 'manual' | 'api' | 'ofx';
  lastSyncDate?: Date;
  
  // Metadata
  color?: string;
  icon?: string;
  notes?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

export interface BankTransaction {
  id: string;
  bankAccountId: string;
  
  // Transaction data
  date: Date;
  description: string;
  amount: number;
  type: 'credit' | 'debit';
  balance?: number;
  
  // Reconciliation
  status: 'pending' | 'reconciled' | 'ignored';
  reconciledWithId?: string; // Transaction or Account ID
  reconciledAt?: Date;
  reconciledBy?: string;
  
  // Categorization
  category?: string;
  subcategory?: string;
  propertyId?: string;
  
  // Import info
  importId?: string;
  importedAt?: Date;
  externalId?: string; // Bank's transaction ID
  
  // AI suggestions
  aiSuggestions?: ReconciliationSuggestion[];
  aiConfidence?: number;
  
  notes?: string;
  tags?: string[];
}

export interface ReconciliationSuggestion {
  transactionId?: string;
  accountId?: string;
  confidence: number;
  reason: string;
  suggestedAt: Date;
}

// Cost center types
export interface CostCenter {
  id: string;
  tenantId: string;
  
  // Basic info
  code: string;
  name: string;
  description?: string;
  type: 'property' | 'department' | 'project' | 'general';
  
  // Hierarchy
  parentId?: string;
  level: number;
  path: string; // e.g., "01.02.03"
  
  // Status
  status: 'active' | 'inactive';
  
  // Budget
  monthlyBudget?: number;
  yearlyBudget?: number;
  
  // Allocation rules
  allocationRules?: AllocationRule[];
  
  // Relationships
  propertyIds?: string[];
  managerIds?: string[];
  
  // Metadata
  color?: string;
  icon?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

export interface AllocationRule {
  id: string;
  name: string;
  type: 'percentage' | 'fixed' | 'proportional';
  
  // For percentage/proportional
  propertyAllocations?: {
    propertyId: string;
    percentage: number;
  }[];
  
  // For fixed
  fixedAmounts?: {
    propertyId: string;
    amount: number;
  }[];
  
  // Conditions
  applyToCategories?: string[];
  minimumAmount?: number;
  maximumAmount?: number;
}

// Financial statement types
export interface IncomeStatement {
  id: string;
  tenantId: string;
  
  // Period
  period: {
    start: Date;
    end: Date;
    type: 'monthly' | 'quarterly' | 'yearly';
  };
  
  // Revenue
  revenue: {
    rent: number;
    fees: number;
    extraServices: number;
    other: number;
    total: number;
    items: IncomeStatementItem[];
  };
  
  // Costs
  costs: {
    cleaning: number;
    maintenance: number;
    utilities: number;
    insurance: number;
    propertyTax: number;
    other: number;
    total: number;
    items: IncomeStatementItem[];
  };
  
  // Expenses
  expenses: {
    marketing: number;
    administrative: number;
    commissions: number;
    professional: number;
    other: number;
    total: number;
    items: IncomeStatementItem[];
  };
  
  // Results
  grossProfit: number;
  grossMargin: number; // Percentage
  operatingProfit: number;
  operatingMargin: number; // Percentage
  netProfit: number;
  netMargin: number; // Percentage
  ebitda: number;
  
  // Comparisons
  previousPeriod?: {
    revenue: number;
    costs: number;
    expenses: number;
    netProfit: number;
  };
  
  yearToDate?: {
    revenue: number;
    costs: number;
    expenses: number;
    netProfit: number;
  };
  
  // By property
  byProperty?: {
    propertyId: string;
    propertyName: string;
    revenue: number;
    costs: number;
    expenses: number;
    profit: number;
    margin: number;
  }[];
  
  // Metadata
  generatedAt: Date;
  generatedBy: string;
  notes?: string;
}

export interface IncomeStatementItem {
  category: string;
  subcategory?: string;
  description: string;
  amount: number;
  percentage: number; // Of total
  transactions: number; // Count
  averageTicket: number;
}

// Commission management
export interface Commission {
  id: string;
  tenantId: string;
  
  // Basic info
  type: 'payable' | 'receivable';
  description: string;
  
  // Calculation
  baseAmount: number;
  rate: number; // Percentage
  amount: number;
  
  // Status
  status: 'pending' | 'approved' | 'paid' | 'cancelled';
  
  // Relationships
  agentId: string;
  agentName: string;
  propertyId?: string;
  reservationId?: string;
  contractId?: string;
  
  // Payment
  paymentMethod?: string;
  paymentDate?: Date;
  invoiceNumber?: string;
  
  // Period
  referenceMonth: Date;
  dueDate: Date;
  
  // Rules
  commissionRuleId?: string;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  approvedBy?: string;
  approvedAt?: Date;
  notes?: string;
}

export interface CommissionRule {
  id: string;
  tenantId: string;
  
  name: string;
  type: 'percentage' | 'fixed' | 'tiered';
  
  // For percentage
  rate?: number;
  
  // For fixed
  amount?: number;
  
  // For tiered
  tiers?: {
    from: number;
    to: number;
    rate: number;
  }[];
  
  // Conditions
  applyTo: 'all' | 'specific';
  propertyIds?: string[];
  agentIds?: string[];
  minAmount?: number;
  
  // Status
  status: 'active' | 'inactive';
  validFrom: Date;
  validUntil?: Date;
  
  createdAt: Date;
  updatedAt: Date;
}

// Cash flow projection
export interface CashFlowProjection {
  id: string;
  tenantId: string;
  
  // Period
  startDate: Date;
  endDate: Date;
  granularity: 'daily' | 'weekly' | 'monthly';
  
  // Projections
  projections: ProjectionPeriod[];
  
  // Summary
  summary: {
    totalInflow: number;
    totalOutflow: number;
    netFlow: number;
    lowestBalance: number;
    lowestBalanceDate: Date;
    averageBalance: number;
  };
  
  // Scenarios
  scenarios: {
    optimistic: ProjectionScenario;
    realistic: ProjectionScenario;
    pessimistic: ProjectionScenario;
  };
  
  // Alerts
  alerts: ProjectionAlert[];
  
  // Metadata
  generatedAt: Date;
  confidence: number;
  assumptions: string[];
}

export interface ProjectionPeriod {
  date: Date;
  
  // Expected flows
  expectedInflow: number;
  expectedOutflow: number;
  netFlow: number;
  
  // Details
  inflows: ProjectionItem[];
  outflows: ProjectionItem[];
  
  // Balance
  startingBalance: number;
  endingBalance: number;
  
  // Confidence
  confidence: number;
}

export interface ProjectionItem {
  type: string;
  description: string;
  amount: number;
  probability: number;
  source: 'confirmed' | 'recurring' | 'estimated';
  relatedId?: string;
}

export interface ProjectionScenario {
  name: string;
  probability: number;
  
  summary: {
    totalInflow: number;
    totalOutflow: number;
    netFlow: number;
    lowestBalance: number;
  };
  
  assumptions: string[];
  adjustments: {
    inflow: number; // Percentage adjustment
    outflow: number; // Percentage adjustment
  };
}

export interface ProjectionAlert {
  type: 'low_balance' | 'negative_balance' | 'high_expense' | 'low_revenue';
  severity: 'low' | 'medium' | 'high' | 'critical';
  date: Date;
  message: string;
  suggestion?: string;
  amount?: number;
}

// Financial alerts
export interface FinancialAlert {
  id: string;
  tenantId: string;
  
  // Alert info
  type: AlertType;
  severity: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  message: string;
  
  // Target
  targetType: 'account' | 'transaction' | 'property' | 'general';
  targetId?: string;
  
  // Status
  status: 'active' | 'acknowledged' | 'resolved';
  
  // Actions
  actionRequired: boolean;
  actionUrl?: string;
  suggestions?: string[];
  
  // Metadata
  createdAt: Date;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
  resolvedAt?: Date;
  resolvedBy?: string;
  
  // Recurrence
  isRecurring: boolean;
  lastTriggered?: Date;
  triggerCount: number;
}

export enum AlertType {
  // Accounts
  OVERDUE_PAYMENT = 'overdue_payment',
  UPCOMING_DUE_DATE = 'upcoming_due_date',
  HIGH_VALUE_TRANSACTION = 'high_value_transaction',
  
  // Cash flow
  LOW_BALANCE = 'low_balance',
  NEGATIVE_BALANCE_FORECAST = 'negative_balance_forecast',
  
  // Performance
  REVENUE_BELOW_TARGET = 'revenue_below_target',
  EXPENSE_ABOVE_BUDGET = 'expense_above_budget',
  LOW_OCCUPANCY = 'low_occupancy',
  
  // Reconciliation
  UNRECONCILED_TRANSACTIONS = 'unreconciled_transactions',
  BANK_SYNC_ERROR = 'bank_sync_error',
  
  // General
  MISSING_DOCUMENTS = 'missing_documents',
  APPROVAL_REQUIRED = 'approval_required',
  SYSTEM_ANOMALY = 'system_anomaly'
}

// Labels for UI
export const ACCOUNT_STATUS_LABELS = {
  [AccountStatus.DRAFT]: 'Rascunho',
  [AccountStatus.PENDING]: 'Pendente',
  [AccountStatus.PARTIALLY_PAID]: 'Parcialmente Pago',
  [AccountStatus.PAID]: 'Pago',
  [AccountStatus.OVERDUE]: 'Vencido',
  [AccountStatus.CANCELLED]: 'Cancelado',
  [AccountStatus.NEGOTIATING]: 'Em Negociação',
  [AccountStatus.IN_PROTEST]: 'Em Protesto',
  [AccountStatus.WRITTEN_OFF]: 'Baixado'
};

export const ACCOUNT_CATEGORY_LABELS = {
  // Receivables
  [AccountCategory.RENT]: 'Aluguel',
  [AccountCategory.BOOKING_FEE]: 'Taxa de Reserva',
  [AccountCategory.CLEANING_FEE]: 'Taxa de Limpeza',
  [AccountCategory.SECURITY_DEPOSIT]: 'Caução',
  [AccountCategory.LATE_FEE]: 'Multa por Atraso',
  [AccountCategory.DAMAGE_CHARGE]: 'Cobrança por Danos',
  [AccountCategory.EXTRA_SERVICE]: 'Serviço Extra',
  [AccountCategory.COMMISSION_RECEIVABLE]: 'Comissão a Receber',
  
  // Payables
  [AccountCategory.PROPERTY_MAINTENANCE]: 'Manutenção do Imóvel',
  [AccountCategory.CLEANING_SERVICE]: 'Serviço de Limpeza',
  [AccountCategory.UTILITIES]: 'Utilidades',
  [AccountCategory.PROPERTY_TAX]: 'IPTU',
  [AccountCategory.INSURANCE]: 'Seguro',
  [AccountCategory.MARKETING]: 'Marketing',
  [AccountCategory.COMMISSION_PAYABLE]: 'Comissão a Pagar',
  [AccountCategory.PROFESSIONAL_SERVICES]: 'Serviços Profissionais',
  [AccountCategory.SUPPLIES]: 'Suprimentos',
  [AccountCategory.OTHER]: 'Outros'
};

export const ALERT_TYPE_LABELS = {
  [AlertType.OVERDUE_PAYMENT]: 'Pagamento Vencido',
  [AlertType.UPCOMING_DUE_DATE]: 'Vencimento Próximo',
  [AlertType.HIGH_VALUE_TRANSACTION]: 'Transação de Alto Valor',
  [AlertType.LOW_BALANCE]: 'Saldo Baixo',
  [AlertType.NEGATIVE_BALANCE_FORECAST]: 'Previsão de Saldo Negativo',
  [AlertType.REVENUE_BELOW_TARGET]: 'Receita Abaixo da Meta',
  [AlertType.EXPENSE_ABOVE_BUDGET]: 'Despesa Acima do Orçamento',
  [AlertType.LOW_OCCUPANCY]: 'Baixa Ocupação',
  [AlertType.UNRECONCILED_TRANSACTIONS]: 'Transações Não Conciliadas',
  [AlertType.BANK_SYNC_ERROR]: 'Erro na Sincronização Bancária',
  [AlertType.MISSING_DOCUMENTS]: 'Documentos Faltando',
  [AlertType.APPROVAL_REQUIRED]: 'Aprovação Necessária',
  [AlertType.SYSTEM_ANOMALY]: 'Anomalia no Sistema'
};