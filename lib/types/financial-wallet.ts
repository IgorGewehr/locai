/**
 * FINANCIAL WALLET TYPES
 *
 * Tipos para o sistema de carteira digital integrado com AbacatePay
 *
 * @version 2.0.0
 */

// ===== ENUMS =====

export type TransactionType = 'deposit' | 'withdrawal' | 'fee' | 'adjustment' | 'refund';

export type TransactionStatus = 'pending' | 'completed' | 'failed' | 'cancelled' | 'processing';

export type WithdrawalStatus =
  | 'pending'      // Aguardando processamento
  | 'processing'   // Sendo processado na AbacatePay
  | 'completed'    // Concluído com sucesso
  | 'rejected'     // Rejeitado (dados inválidos, saldo insuficiente, etc)
  | 'failed'       // Falhou (erro técnico)
  | 'cancelled'    // Cancelado pelo usuário
  | 'reversed';    // Estornado

export type PaymentProvider = 'abacatepay' | 'manual' | 'system';

// ===== WALLET =====

export interface Wallet {
  tenantId: string;
  balance: number;           // Saldo disponível em reais
  pendingBalance: number;    // Saldo em processamento (saques pendentes)
  blockedBalance: number;    // Saldo bloqueado (disputas, etc)
  totalDeposits: number;     // Total de depósitos histórico
  totalWithdrawals: number;  // Total de saques histórico
  currency: string;          // Sempre 'BRL'
  lastActivityAt: Date;      // Última movimentação
  createdAt: Date;
  updatedAt: Date;
}

// ===== WALLET TRANSACTION =====

export interface WalletTransaction {
  id: string;
  walletId: string;
  tenantId: string;

  // Tipo e valor
  type: TransactionType;
  amount: number;           // Sempre positivo, tipo determina crédito/débito
  status: TransactionStatus;

  // Descrição
  description: string;

  // Referências externas
  referenceId?: string;           // ID AbacatePay (PIX ou Billing)
  abacatepayId?: string;          // ID específico AbacatePay
  reservationId?: string;         // Reserva relacionada
  propertyId?: string;            // Imóvel relacionado
  clientId?: string;              // Cliente relacionado
  withdrawalRequestId?: string;   // Solicitação de saque relacionada

  // Informações de pagamento
  paymentMethod?: 'pix' | 'card' | 'billing' | 'bank_transfer';
  paymentProvider?: PaymentProvider;

  // Taxas
  fee?: number;                   // Taxa aplicada
  netAmount?: number;             // Valor líquido

  // Metadados
  metadata?: {
    source?: 'n8n_agent' | 'webhook' | 'manual' | 'system';
    customerPhone?: string;
    customerName?: string;
    abacatepayStatus?: string;
    abacatepayVerified?: boolean;
    requestId?: string;
    [key: string]: any;
  };

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

// ===== WITHDRAWAL REQUEST =====

export interface WithdrawalRequest {
  id: string;
  walletId: string;
  tenantId: string;

  // Valor
  amount: number;            // Valor solicitado
  fee: number;               // Taxa cobrada
  netAmount: number;         // Valor líquido a receber

  // Status
  status: WithdrawalStatus;
  statusHistory: WithdrawalStatusChange[];

  // Dados bancários
  bankInfo: {
    pixKey: string;
    pixKeyType?: 'CPF' | 'CNPJ' | 'EMAIL' | 'PHONE' | 'RANDOM';
    bankName?: string;
    accountNumber?: string;
    agency?: string;
    document?: string;       // CPF/CNPJ do titular
    holderName?: string;     // Nome do titular
  };

  // AbacatePay
  abacatepayId?: string;           // ID da transação na AbacatePay
  abacatepayStatus?: string;       // Status na AbacatePay
  abacatepayReceiptUrl?: string;   // URL do comprovante
  abacatepayFee?: number;          // Taxa da AbacatePay

  // Motivo de rejeição/falha
  rejectionReason?: string;
  failureDetails?: string;

  // Referências
  transactionId?: string;          // ID da transação de débito na carteira
  refundTransactionId?: string;    // ID da transação de estorno (se houver)

  // Timestamps
  requestedAt: Date;
  processedAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;

  // Metadados
  metadata?: {
    requestId?: string;
    requestedBy?: string;
    ipAddress?: string;
    userAgent?: string;
    [key: string]: any;
  };
}

export interface WithdrawalStatusChange {
  from: WithdrawalStatus;
  to: WithdrawalStatus;
  reason?: string;
  changedAt: Date;
  changedBy?: string;
}

// ===== API RESPONSES =====

export interface WalletBalanceResponse {
  balance: number;
  balanceFormatted: string;
  pendingBalance: number;
  blockedBalance: number;
  availableForWithdrawal: number;
  currency: string;
  lastActivityAt: Date;
}

export interface WalletTransactionResponse {
  transactions: WalletTransaction[];
  summary: {
    totalDeposits: number;
    totalWithdrawals: number;
    totalFees: number;
    netBalance: number;
    transactionCount: number;
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

export interface WithdrawalResponse {
  withdrawalId: string;
  amount: number;
  fee: number;
  netAmount: number;
  status: WithdrawalStatus;
  estimatedCompletionTime: string;
  abacatepayId?: string;
  receiptUrl?: string;
}

// ===== LIMITS & CONFIG =====

export interface WalletLimits {
  minWithdrawal: number;          // Valor mínimo de saque
  maxWithdrawal: number;          // Valor máximo de saque
  dailyWithdrawalLimit: number;   // Limite diário de saques
  monthlyWithdrawalLimit: number; // Limite mensal de saques
  maxPendingWithdrawals: number;  // Máximo de saques pendentes simultâneos
}

export const DEFAULT_WALLET_LIMITS: WalletLimits = {
  minWithdrawal: 10,              // R$ 10,00
  maxWithdrawal: 50000,           // R$ 50.000,00
  dailyWithdrawalLimit: 100000,   // R$ 100.000,00/dia
  monthlyWithdrawalLimit: 500000, // R$ 500.000,00/mês
  maxPendingWithdrawals: 3,       // 3 saques pendentes
};

// ===== UTILITY FUNCTIONS =====

/**
 * Formata valor em reais
 */
export function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

/**
 * Calcula valor líquido após taxas
 */
export function calculateNetAmount(amount: number, feePercent: number, fixedFee: number = 0): number {
  const percentFee = amount * (feePercent / 100);
  return amount - percentFee - fixedFee;
}

/**
 * Verifica se valor está dentro dos limites
 */
export function isWithinLimits(amount: number, limits: WalletLimits = DEFAULT_WALLET_LIMITS): {
  valid: boolean;
  error?: string;
} {
  if (amount < limits.minWithdrawal) {
    return {
      valid: false,
      error: `Valor mínimo para saque é ${formatBRL(limits.minWithdrawal)}`,
    };
  }

  if (amount > limits.maxWithdrawal) {
    return {
      valid: false,
      error: `Valor máximo para saque é ${formatBRL(limits.maxWithdrawal)}`,
    };
  }

  return { valid: true };
}

/**
 * Mapeia status AbacatePay para status interno
 */
export function mapAbacatepayWithdrawStatus(abacatepayStatus: string): WithdrawalStatus {
  switch (abacatepayStatus) {
    case 'PENDING':
      return 'processing';
    case 'COMPLETE':
    case 'COMPLETED':
      return 'completed';
    case 'CANCELLED':
      return 'cancelled';
    case 'REFUNDED':
      return 'reversed';
    default:
      return 'pending';
  }
}

// ===== TYPE EXPORTS =====
export type {
  Wallet,
  WalletTransaction,
  WithdrawalRequest,
  WithdrawalStatusChange,
  WalletBalanceResponse,
  WalletTransactionResponse,
  WithdrawalResponse,
  WalletLimits,
};
