/**
 * WALLET SYSTEM - TYPE DEFINITIONS
 *
 * Sistema de carteira digital para gerenciamento de saldo de clientes
 * Integrado com sistema de transações para pagamentos e saques
 *
 * @version 1.0.0
 */

import { Timestamp } from 'firebase/firestore';

// ===== ENUMS =====

export enum WalletTransactionType {
  CREDIT = 'credit',           // Entrada de dinheiro
  DEBIT = 'debit',             // Saída de dinheiro
  WITHDRAWAL = 'withdrawal',    // Saque solicitado
  REFUND = 'refund',           // Estorno/reembolso
  PAYMENT = 'payment',         // Pagamento realizado
  BONUS = 'bonus',             // Bônus/crédito promocional
  ADJUSTMENT = 'adjustment'     // Ajuste manual
}

export enum WalletTransactionStatus {
  PENDING = 'pending',         // Aguardando processamento
  PROCESSING = 'processing',   // Em processamento
  COMPLETED = 'completed',     // Concluído
  FAILED = 'failed',           // Falhou
  CANCELLED = 'cancelled',     // Cancelado
  REVERSED = 'reversed'        // Revertido
}

export enum WithdrawalMethod {
  PIX = 'pix',
  BANK_TRANSFER = 'bank_transfer',
  STRIPE = 'stripe'
}

export enum WithdrawalStatus {
  REQUESTED = 'requested',
  APPROVED = 'approved',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled'
}

// ===== MAIN INTERFACES =====

/**
 * Wallet - Carteira digital do cliente
 */
export interface Wallet {
  id: string;
  tenantId: string;
  clientId: string;
  clientName: string;
  clientPhone: string;

  // Saldos
  balance: number;              // Saldo disponível
  pendingBalance: number;       // Saldo pendente (transações em processamento)
  totalEarned: number;          // Total ganho (histórico)
  totalSpent: number;           // Total gasto (histórico)
  totalWithdrawn: number;       // Total sacado (histórico)

  // Configurações
  autoWithdrawalEnabled: boolean;
  autoWithdrawalThreshold?: number; // Saque automático quando atingir este valor
  withdrawalMethod?: WithdrawalMethod;

  // Dados bancários para saque
  bankDetails?: BankDetails;
  pixKey?: string;
  pixKeyType?: 'cpf' | 'cnpj' | 'email' | 'phone' | 'random';

  // Limites
  dailyWithdrawalLimit: number;
  monthlyWithdrawalLimit: number;
  minWithdrawalAmount: number;

  // Estatísticas
  lastTransactionAt?: Date | Timestamp;
  lastWithdrawalAt?: Date | Timestamp;
  transactionCount: number;
  withdrawalCount: number;

  // Controle
  isActive: boolean;
  isFrozen: boolean;            // Carteira congelada (sem movimentações)
  frozenReason?: string;
  frozenAt?: Date | Timestamp;
  frozenBy?: string;

  // Auditoria
  createdAt: Date | Timestamp;
  updatedAt: Date | Timestamp;
  createdBy?: string;
  lastModifiedBy?: string;

  // Metadados
  metadata?: Record<string, any>;
}

/**
 * WalletTransaction - Transação da carteira
 */
export interface WalletTransaction {
  id: string;
  tenantId: string;
  walletId: string;
  clientId: string;

  // Core
  type: WalletTransactionType;
  status: WalletTransactionStatus;
  amount: number;               // Sempre positivo
  balanceBefore: number;        // Saldo antes da transação
  balanceAfter: number;         // Saldo após a transação

  // Detalhes
  description: string;
  reference?: string;           // Referência externa (ID de transação, pedido, etc.)
  category?: string;

  // Relacionamentos
  transactionId?: string;       // Link para Transaction no sistema financeiro
  reservationId?: string;
  withdrawalId?: string;

  // Processamento
  processedAt?: Date | Timestamp;
  processedBy?: string;
  failureReason?: string;

  // Auditoria
  createdAt: Date | Timestamp;
  createdBy?: string;

  // Metadados
  metadata?: Record<string, any>;
}

/**
 * Withdrawal - Solicitação de saque
 */
export interface Withdrawal {
  id: string;
  tenantId: string;
  walletId: string;
  clientId: string;
  clientName: string;
  clientPhone: string;

  // Valor
  amount: number;
  fee: number;                  // Taxa de saque
  netAmount: number;            // Valor líquido (amount - fee)

  // Método e destino
  method: WithdrawalMethod;
  bankDetails?: BankDetails;
  pixKey?: string;
  pixKeyType?: 'cpf' | 'cnpj' | 'email' | 'phone' | 'random';

  // Status
  status: WithdrawalStatus;
  statusHistory: WithdrawalStatusChange[];

  // Processamento
  requestedAt: Date | Timestamp;
  approvedAt?: Date | Timestamp;
  approvedBy?: string;
  processedAt?: Date | Timestamp;
  processedBy?: string;
  completedAt?: Date | Timestamp;
  rejectedAt?: Date | Timestamp;
  rejectedBy?: string;
  rejectionReason?: string;

  // Comprovante
  receiptUrl?: string;
  transactionReference?: string; // ID da transferência bancária/PIX

  // Relacionamentos
  walletTransactionId?: string; // Link para WalletTransaction
  financialTransactionId?: string; // Link para Transaction

  // Auditoria
  createdAt: Date | Timestamp;
  updatedAt: Date | Timestamp;

  // Metadados
  notes?: string;
  metadata?: Record<string, any>;
}

/**
 * BankDetails - Dados bancários
 */
export interface BankDetails {
  bankCode: string;             // Código do banco (ex: 001, 237, 341)
  bankName: string;
  accountType: 'checking' | 'savings';
  accountNumber: string;
  accountDigit: string;
  agency: string;
  agencyDigit?: string;

  // Titular
  holderName: string;
  holderDocument: string;       // CPF ou CNPJ
  holderDocumentType: 'cpf' | 'cnpj';
}

/**
 * WithdrawalStatusChange - Histórico de mudanças de status
 */
export interface WithdrawalStatusChange {
  status: WithdrawalStatus;
  changedAt: Date | Timestamp;
  changedBy: string;
  reason?: string;
  notes?: string;
}

/**
 * WalletStats - Estatísticas da carteira
 */
export interface WalletStats {
  // Período
  startDate: Date;
  endDate: Date;

  // Movimentações
  totalCredits: number;
  totalDebits: number;
  totalWithdrawals: number;
  netBalance: number;

  // Contadores
  creditCount: number;
  debitCount: number;
  withdrawalCount: number;

  // Média
  averageTransaction: number;
  averageWithdrawal: number;

  // Maior/Menor
  largestCredit: number;
  largestDebit: number;
  largestWithdrawal: number;
}

/**
 * WalletDashboard - Dashboard data
 */
export interface WalletDashboard {
  wallet: Wallet;
  stats: WalletStats;
  recentTransactions: WalletTransaction[];
  pendingWithdrawals: Withdrawal[];
}

// ===== UTILITY TYPES =====

export type CreateWalletInput = Omit<Wallet,
  | 'id'
  | 'balance'
  | 'pendingBalance'
  | 'totalEarned'
  | 'totalSpent'
  | 'totalWithdrawn'
  | 'transactionCount'
  | 'withdrawalCount'
  | 'createdAt'
  | 'updatedAt'
>;

export type CreateWalletTransactionInput = Omit<WalletTransaction,
  | 'id'
  | 'status'
  | 'balanceBefore'
  | 'balanceAfter'
  | 'processedAt'
  | 'createdAt'
>;

export type CreateWithdrawalInput = Omit<Withdrawal,
  | 'id'
  | 'status'
  | 'statusHistory'
  | 'fee'
  | 'netAmount'
  | 'requestedAt'
  | 'createdAt'
  | 'updatedAt'
>;

// ===== CONSTANTS =====

export const WALLET_CONSTANTS = {
  DEFAULT_DAILY_WITHDRAWAL_LIMIT: 10000,      // R$ 10.000
  DEFAULT_MONTHLY_WITHDRAWAL_LIMIT: 50000,    // R$ 50.000
  DEFAULT_MIN_WITHDRAWAL_AMOUNT: 10,          // R$ 10
  DEFAULT_WITHDRAWAL_FEE_PERCENT: 0,          // 0% (sem taxa por padrão)
  DEFAULT_WITHDRAWAL_FEE_FIXED: 0,            // R$ 0 (sem taxa fixa)
  MAX_WITHDRAWAL_FEE_PERCENT: 5,              // Máximo 5%
  MAX_WITHDRAWAL_FEE_FIXED: 50,               // Máximo R$ 50
} as const;

// ===== LABELS =====

export const WALLET_TRANSACTION_TYPE_LABELS: Record<WalletTransactionType, string> = {
  [WalletTransactionType.CREDIT]: 'Crédito',
  [WalletTransactionType.DEBIT]: 'Débito',
  [WalletTransactionType.WITHDRAWAL]: 'Saque',
  [WalletTransactionType.REFUND]: 'Estorno',
  [WalletTransactionType.PAYMENT]: 'Pagamento',
  [WalletTransactionType.BONUS]: 'Bônus',
  [WalletTransactionType.ADJUSTMENT]: 'Ajuste',
};

export const WALLET_TRANSACTION_STATUS_LABELS: Record<WalletTransactionStatus, string> = {
  [WalletTransactionStatus.PENDING]: 'Pendente',
  [WalletTransactionStatus.PROCESSING]: 'Processando',
  [WalletTransactionStatus.COMPLETED]: 'Concluído',
  [WalletTransactionStatus.FAILED]: 'Falhou',
  [WalletTransactionStatus.CANCELLED]: 'Cancelado',
  [WalletTransactionStatus.REVERSED]: 'Revertido',
};

export const WITHDRAWAL_METHOD_LABELS: Record<WithdrawalMethod, string> = {
  [WithdrawalMethod.PIX]: 'PIX',
  [WithdrawalMethod.BANK_TRANSFER]: 'Transferência Bancária',
  [WithdrawalMethod.STRIPE]: 'Stripe',
};

export const WITHDRAWAL_STATUS_LABELS: Record<WithdrawalStatus, string> = {
  [WithdrawalStatus.REQUESTED]: 'Solicitado',
  [WithdrawalStatus.APPROVED]: 'Aprovado',
  [WithdrawalStatus.PROCESSING]: 'Processando',
  [WithdrawalStatus.COMPLETED]: 'Concluído',
  [WithdrawalStatus.REJECTED]: 'Rejeitado',
  [WithdrawalStatus.CANCELLED]: 'Cancelado',
};

// ===== STATUS COLORS =====

export const WALLET_TRANSACTION_STATUS_COLORS: Record<WalletTransactionStatus, string> = {
  [WalletTransactionStatus.PENDING]: '#FFA726',
  [WalletTransactionStatus.PROCESSING]: '#42A5F5',
  [WalletTransactionStatus.COMPLETED]: '#66BB6A',
  [WalletTransactionStatus.FAILED]: '#EF5350',
  [WalletTransactionStatus.CANCELLED]: '#78909C',
  [WalletTransactionStatus.REVERSED]: '#AB47BC',
};

export const WITHDRAWAL_STATUS_COLORS: Record<WithdrawalStatus, string> = {
  [WithdrawalStatus.REQUESTED]: '#FFA726',
  [WithdrawalStatus.APPROVED]: '#66BB6A',
  [WithdrawalStatus.PROCESSING]: '#42A5F5',
  [WithdrawalStatus.COMPLETED]: '#4CAF50',
  [WithdrawalStatus.REJECTED]: '#EF5350',
  [WithdrawalStatus.CANCELLED]: '#78909C',
};
