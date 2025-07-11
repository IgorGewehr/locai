// lib/types/reservation.ts
import { Property } from './property'

export interface Reservation {
  id: string
  propertyId: string
  clientId: string
  status: ReservationStatus
  
  // Datas
  checkIn: Date
  checkOut: Date
  createdAt: Date
  updatedAt: Date
  
  // Hóspedes
  guests: number
  guestDetails: GuestDetail[]
  
  // Financeiro
  totalAmount: number
  paidAmount: number
  pendingAmount: number
  paymentMethod: PaymentMethod
  paymentPlan: PaymentPlan
  payments: Payment[]
  
  // Analytics fields
  nights: number
  paymentStatus: PaymentStatus
  
  // Extras
  extraServices: ExtraService[]
  specialRequests: string
  observations: string
  
  // Origem
  source: ReservationSource
  agentId?: string // Se foi criado por IA
  
  // Metadados
  tenantId: string
  
  // Relacionamentos (populados quando necessário)
  property?: Property
  client?: Client
}

export enum ReservationStatus {
  PENDING = 'pending',           // Aguardando confirmação
  CONFIRMED = 'confirmed',       // Confirmada
  CHECKED_IN = 'checked_in',     // Hóspede fez check-in
  CHECKED_OUT = 'checked_out',   // Hóspede fez check-out
  CANCELLED = 'cancelled',       // Cancelada
  NO_SHOW = 'no_show'           // Não compareceu
}

export enum ReservationSource {
  WHATSAPP_AI = 'whatsapp_ai',
  MANUAL = 'manual',
  WEBSITE = 'website',
  PHONE = 'phone',
  EMAIL = 'email'
}

export enum PaymentMethod {
  PIX = 'pix',
  CREDIT_CARD = 'credit_card',
  DEBIT_CARD = 'debit_card',
  CASH = 'cash',
  BANK_TRANSFER = 'bank_transfer',
  BANK_SLIP = 'bank_slip'
}

export interface GuestDetail {
  id: string
  name: string
  document: string
  documentType: 'cpf' | 'rg' | 'passport'
  phone?: string
  email?: string
  birthDate?: Date
  isMainGuest: boolean
}

export interface ExtraService {
  id: string
  name: string
  description?: string
  price: number
  quantity: number
  total: number
  category: 'cleaning' | 'transport' | 'food' | 'entertainment' | 'other'
}

export interface PaymentPlan {
  totalAmount: number
  installments: PaymentInstallment[]
  paymentMethod: PaymentMethod
  feePercentage: number
  totalFees: number
  description?: string
}

export interface PaymentInstallment {
  number: number
  amount: number
  dueDate: Date
  description: string
  isPaid: boolean
  paidDate?: Date
}

export interface Payment {
  id: string
  reservationId: string
  amount: number
  method: PaymentMethod
  status: PaymentStatus
  dueDate: Date
  paidDate?: Date
  installmentNumber: number
  totalInstallments: number
  description: string
  feeAmount?: number
  netAmount: number
  
  // Comprovantes
  receipt?: PaymentReceipt
  
  // Metadados
  createdAt: Date
  processedAt?: Date
  tenantId: string
  
  // Relacionamentos
  reservation?: Reservation
}

export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  OVERDUE = 'overdue',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
  PARTIAL = 'partial'
}

export interface PaymentReceipt {
  id: string
  url: string
  uploadedAt: Date
  type: 'image' | 'pdf'
  filename: string
}

// Labels para exibição
export const RESERVATION_STATUS_LABELS = {
  [ReservationStatus.PENDING]: 'Pendente',
  [ReservationStatus.CONFIRMED]: 'Confirmada',
  [ReservationStatus.CHECKED_IN]: 'Check-in',
  [ReservationStatus.CHECKED_OUT]: 'Check-out',
  [ReservationStatus.CANCELLED]: 'Cancelada',
  [ReservationStatus.NO_SHOW]: 'Não Compareceu'
}

export const PAYMENT_STATUS_LABELS = {
  [PaymentStatus.PENDING]: 'Pendente',
  [PaymentStatus.PAID]: 'Pago',
  [PaymentStatus.OVERDUE]: 'Vencido',
  [PaymentStatus.CANCELLED]: 'Cancelado',
  [PaymentStatus.REFUNDED]: 'Reembolsado',
  [PaymentStatus.PARTIAL]: 'Parcial'
}

export const PAYMENT_METHOD_LABELS = {
  [PaymentMethod.PIX]: 'PIX',
  [PaymentMethod.CREDIT_CARD]: 'Cartão de Crédito',
  [PaymentMethod.DEBIT_CARD]: 'Cartão de Débito',
  [PaymentMethod.CASH]: 'Dinheiro',
  [PaymentMethod.BANK_TRANSFER]: 'Transferência',
  [PaymentMethod.BANK_SLIP]: 'Boleto'
}

export const RESERVATION_SOURCE_LABELS = {
  [ReservationSource.WHATSAPP_AI]: 'WhatsApp IA',
  [ReservationSource.MANUAL]: 'Manual',
  [ReservationSource.WEBSITE]: 'Site',
  [ReservationSource.PHONE]: 'Telefone',
  [ReservationSource.EMAIL]: 'Email'
}

// Import necessário para evitar circular dependency
interface Client {
  id: string
  name: string
  email?: string
  phone: string
}