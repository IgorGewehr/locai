import { z } from 'zod'
import { ReservationStatus, ReservationSource, PaymentMethod } from '@/lib/types/reservation'

// Guest detail schema
const guestDetailSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(100),
  document: z.string().min(1, 'Documento é obrigatório'),
  documentType: z.enum(['cpf', 'rg', 'passport']),
  phone: z.string().optional(),
  email: z.string().email('Email inválido').optional(),
  birthDate: z.string().datetime().optional(),
  isMainGuest: z.boolean()
})

// Extra service schema
const extraServiceSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  description: z.string().optional(),
  price: z.number().min(0),
  quantity: z.number().int().min(1),
  total: z.number().min(0),
  category: z.enum(['cleaning', 'transport', 'food', 'entertainment', 'other'])
})

// Payment installment schema
const paymentInstallmentSchema = z.object({
  number: z.number().int().min(1),
  amount: z.number().min(0),
  dueDate: z.string().datetime(),
  description: z.string(),
  isPaid: z.boolean(),
  paidDate: z.string().datetime().optional()
})

// Payment plan schema
const paymentPlanSchema = z.object({
  totalAmount: z.number().min(0),
  installments: z.array(paymentInstallmentSchema),
  paymentMethod: z.nativeEnum(PaymentMethod),
  feePercentage: z.number().min(0).max(100),
  totalFees: z.number().min(0),
  description: z.string().optional()
})

// Base reservation schema (for creation)
export const createReservationSchema = z.object({
  propertyId: z.string().min(1, 'ID da propriedade é obrigatório'),
  clientId: z.string().min(1, 'ID do cliente é obrigatório'),
  checkIn: z.string().datetime(),
  checkOut: z.string().datetime(),
  guests: z.number().int().min(1, 'Número de hóspedes deve ser pelo menos 1').max(50),
  guestDetails: z.array(guestDetailSchema).optional(),
  totalAmount: z.number().min(0, 'Valor total deve ser positivo'),
  paymentMethod: z.nativeEnum(PaymentMethod),
  paymentPlan: paymentPlanSchema.optional(),
  extraServices: z.array(extraServiceSchema).optional(),
  specialRequests: z.string().max(1000).optional(),
  observations: z.string().max(1000).optional(),
  source: z.nativeEnum(ReservationSource).default(ReservationSource.MANUAL),
  agentId: z.string().optional()
}).refine(
  (data) => {
    const checkIn = new Date(data.checkIn)
    const checkOut = new Date(data.checkOut)
    return checkOut > checkIn
  },
  {
    message: 'Data de check-out deve ser posterior à data de check-in',
    path: ['checkOut']
  }
).refine(
  (data) => {
    const checkIn = new Date(data.checkIn)
    const checkOut = new Date(data.checkOut)
    const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24))
    return nights <= 365 // Max 1 year
  },
  {
    message: 'Período de estadia não pode exceder 365 dias',
    path: ['checkOut']
  }
).refine(
  (data) => {
    const checkIn = new Date(data.checkIn)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return checkIn >= today
  },
  {
    message: 'Data de check-in não pode ser no passado',
    path: ['checkIn']
  }
).refine(
  (data) => {
    // If guest details are provided, must have at least one main guest
    if (data.guestDetails && data.guestDetails.length > 0) {
      return data.guestDetails.some(g => g.isMainGuest)
    }
    return true
  },
  {
    message: 'Deve haver pelo menos um hóspede principal',
    path: ['guestDetails']
  }
).refine(
  (data) => {
    // Number of guest details should not exceed total guests
    if (data.guestDetails) {
      return data.guestDetails.length <= data.guests
    }
    return true
  },
  {
    message: 'Número de detalhes de hóspedes não pode exceder o total de hóspedes',
    path: ['guestDetails']
  }
)

// Update reservation schema
export const updateReservationSchema = z.object({
  status: z.nativeEnum(ReservationStatus).optional(),
  checkIn: z.string().datetime().optional(),
  checkOut: z.string().datetime().optional(),
  guests: z.number().int().min(1).max(50).optional(),
  guestDetails: z.array(guestDetailSchema).optional(),
  totalAmount: z.number().min(0).optional(),
  paidAmount: z.number().min(0).optional(),
  paymentMethod: z.nativeEnum(PaymentMethod).optional(),
  paymentPlan: paymentPlanSchema.optional(),
  extraServices: z.array(extraServiceSchema).optional(),
  specialRequests: z.string().max(1000).optional(),
  observations: z.string().max(1000).optional()
}).refine(
  (data) => {
    if (data.checkIn && data.checkOut) {
      const checkIn = new Date(data.checkIn)
      const checkOut = new Date(data.checkOut)
      return checkOut > checkIn
    }
    return true
  },
  {
    message: 'Data de check-out deve ser posterior à data de check-in',
    path: ['checkOut']
  }
)

// Query parameters schema
export const reservationQuerySchema = z.object({
  status: z.nativeEnum(ReservationStatus).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  propertyId: z.string().optional(),
  clientId: z.string().optional(),
  source: z.nativeEnum(ReservationSource).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['createdAt', 'checkIn', 'checkOut', 'totalAmount']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
})

// Availability check schema
export const checkAvailabilitySchema = z.object({
  propertyId: z.string().min(1, 'ID da propriedade é obrigatório'),
  checkIn: z.string().datetime(),
  checkOut: z.string().datetime(),
  excludeReservationId: z.string().optional() // For updates
}).refine(
  (data) => {
    const checkIn = new Date(data.checkIn)
    const checkOut = new Date(data.checkOut)
    return checkOut > checkIn
  },
  {
    message: 'Data de check-out deve ser posterior à data de check-in',
    path: ['checkOut']
  }
)

// Cancel reservation schema
export const cancelReservationSchema = z.object({
  reason: z.string().min(1, 'Motivo do cancelamento é obrigatório').max(500),
  refundAmount: z.number().min(0).optional(),
  refundMethod: z.nativeEnum(PaymentMethod).optional()
})

// Check-in/out schema
export const checkInOutSchema = z.object({
  action: z.enum(['check_in', 'check_out']),
  notes: z.string().max(500).optional(),
  actualGuests: z.number().int().min(1).optional() // For check-in
})

// Type exports
export type CreateReservationInput = z.infer<typeof createReservationSchema>
export type UpdateReservationInput = z.infer<typeof updateReservationSchema>
export type ReservationQuery = z.infer<typeof reservationQuerySchema>
export type CheckAvailabilityInput = z.infer<typeof checkAvailabilitySchema>
export type CancelReservationInput = z.infer<typeof cancelReservationSchema>
export type CheckInOutInput = z.infer<typeof checkInOutSchema>