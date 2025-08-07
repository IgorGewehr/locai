import { Timestamp } from 'firebase/firestore'

export type MovementType = 'income' | 'expense'
export type MovementStatus = 'pending' | 'paid' | 'overdue' | 'cancelled'
export type MovementCategory = 
  | 'rent'           // Aluguel
  | 'cleaning'       // Limpeza
  | 'maintenance'    // Manutenção
  | 'commission'     // Comissão
  | 'utilities'      // Utilidades (água, luz, etc)
  | 'marketing'      // Marketing
  | 'refund'         // Reembolso
  | 'other'          // Outros

// PaymentMethod importado de common.ts
import { PaymentMethod } from './common'

export interface FinancialMovement {
  // Identificação
  id: string
  tenantId: string
  
  // Dados básicos
  type: MovementType
  category: MovementCategory
  description: string
  amount: number
  
  // Datas
  dueDate: Date | Timestamp
  paymentDate?: Date | Timestamp
  createdAt: Date | Timestamp
  updatedAt: Date | Timestamp
  
  // Status e controle
  status: MovementStatus
  overdueDays?: number
  
  // Relacionamentos
  propertyId?: string
  propertyName?: string
  clientId?: string
  clientName?: string
  reservationId?: string
  
  // Pagamento
  paymentMethod?: PaymentMethod
  paymentProof?: string
  transactionReference?: string
  
  // Recorrência
  isRecurring: boolean
  recurringType?: 'monthly' | 'weekly'
  recurringParentId?: string
  recurringEndDate?: Date | Timestamp
  
  // Cobrança automática
  autoCharge: boolean
  remindersSent: number
  lastReminderDate?: Date | Timestamp
  nextReminderDate?: Date | Timestamp
  
  // Parcelamento
  isInstallment: boolean
  installmentNumber?: number
  totalInstallments?: number
  originalMovementId?: string
  
  // Metadados
  notes?: string
  tags?: string[]
  attachments?: string[]
  
  // Auditoria
  createdBy: string
  createdByAI?: boolean
  lastModifiedBy?: string
}

// Interface simplificada para criação
export interface CreateFinancialMovementInput {
  type: MovementType
  category: MovementCategory
  description: string
  amount: number
  dueDate: Date
  
  // Opcionais
  propertyId?: string
  clientId?: string
  reservationId?: string
  paymentMethod?: PaymentMethod
  autoCharge?: boolean
  isRecurring?: boolean
  recurringType?: 'monthly' | 'weekly'
  notes?: string
}

// Interface para atualização
export interface UpdateFinancialMovementInput {
  description?: string
  amount?: number
  dueDate?: Date
  status?: MovementStatus
  paymentDate?: Date
  paymentMethod?: PaymentMethod
  paymentProof?: string
  notes?: string
}

// Interface para filtros de busca
export interface FinancialMovementFilters {
  type?: MovementType
  category?: MovementCategory
  status?: MovementStatus
  propertyId?: string
  clientId?: string
  startDate?: Date
  endDate?: Date
  minAmount?: number
  maxAmount?: number
  search?: string
}

// Interface para resumo financeiro
export interface FinancialSummary {
  period: {
    start: Date
    end: Date
  }
  
  // Totais
  totalIncome: number
  totalExpenses: number
  balance: number
  
  // Por status
  pending: {
    count: number
    amount: number
  }
  paid: {
    count: number
    amount: number
  }
  overdue: {
    count: number
    amount: number
  }
  
  // Por categoria
  byCategory: {
    category: MovementCategory
    income: number
    expenses: number
    count: number
  }[]
  
  // Por propriedade
  byProperty?: {
    propertyId: string
    propertyName: string
    income: number
    expenses: number
    balance: number
  }[]
}

// Interface para configuração de cobrança
export interface BillingConfiguration {
  enabled: boolean
  
  // Configurações de lembrete
  reminderDaysBefore: number // Dias antes do vencimento
  reminderFrequency: number  // Dias entre lembretes após vencimento
  maxReminders: number       // Máximo de lembretes
  
  // Horários permitidos
  reminderStartHour: number  // Hora de início (8)
  reminderEndHour: number    // Hora de fim (20)
  
  // Templates de mensagem
  messageTemplates: {
    firstReminder: string
    overdueReminder: string
    finalReminder: string
  }
  
  // Tom da mensagem
  messageTone: 'formal' | 'friendly'
}

// Constantes úteis
export const MOVEMENT_CATEGORIES: Record<MovementCategory, string> = {
  rent: 'Aluguel',
  cleaning: 'Limpeza',
  maintenance: 'Manutenção',
  commission: 'Comissão',
  utilities: 'Utilidades',
  marketing: 'Marketing',
  refund: 'Reembolso',
  other: 'Outros'
}

// PAYMENT_METHODS movido para common.ts
export { PAYMENT_METHOD_LABELS as PAYMENT_METHODS } from './common'

export const MOVEMENT_STATUS: Record<MovementStatus, string> = {
  pending: 'Pendente',
  paid: 'Pago',
  overdue: 'Vencido',
  cancelled: 'Cancelado'
}