// lib/types/common.ts
// Enums e tipos comuns para evitar duplicação

export enum PaymentMethod {
  PIX = 'pix',
  CREDIT_CARD = 'credit_card',
  DEBIT_CARD = 'debit_card',
  CASH = 'cash',
  BANK_TRANSFER = 'bank_transfer',
  BANK_SLIP = 'bank_slip',
  STRIPE = 'stripe'
}

export const PAYMENT_METHOD_LABELS = {
  [PaymentMethod.PIX]: 'PIX',
  [PaymentMethod.CREDIT_CARD]: 'Cartão de Crédito',
  [PaymentMethod.DEBIT_CARD]: 'Cartão de Débito',
  [PaymentMethod.CASH]: 'Dinheiro',
  [PaymentMethod.BANK_TRANSFER]: 'Transferência Bancária',
  [PaymentMethod.BANK_SLIP]: 'Boleto',
  [PaymentMethod.STRIPE]: 'Stripe'
}

// Status comuns
export enum Status {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  PENDING = 'pending',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

// Direções de comunicação
export enum CommunicationDirection {
  INBOUND = 'inbound',
  OUTBOUND = 'outbound'
}

// Prioridades
export enum Priority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}