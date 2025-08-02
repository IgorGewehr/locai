// lib/validation/reservationSchema.ts
import * as yup from 'yup'
import { 
  ReservationStatus, 
  ReservationSource, 
  PaymentMethod, 
  PaymentStatus 
} from '@/lib/types/reservation'

// Schema principal da reserva
export const reservationSchema = yup.object({
  propertyId: yup
    .string()
    .required('Propriedade é obrigatória'),
  
  clientId: yup
    .string()
    .required('Cliente é obrigatório'),
  
  status: yup
    .string()
    .oneOf(Object.values(ReservationStatus))
    .default(ReservationStatus.PENDING),
  
  checkIn: yup
    .date()
    .required('Data de check-in é obrigatória')
    .min(new Date(), 'Data de check-in deve ser futura'),
  
  checkOut: yup
    .date()
    .required('Data de check-out é obrigatória')
    .min(yup.ref('checkIn'), 'Data de check-out deve ser posterior ao check-in'),
  
  guests: yup
    .number()
    .required('Número de hóspedes é obrigatório')
    .min(1, 'Deve ter pelo menos 1 hóspede')
    .max(20, 'Máximo de 20 hóspedes')
    .integer('Deve ser um número inteiro'),
  
  guestDetails: yup
    .array()
    .of(yup.object({
      name: yup
        .string()
        .required('Nome é obrigatório')
        .min(2, 'Nome deve ter pelo menos 2 caracteres'),
      
      document: yup
        .string()
        .required('Documento é obrigatório'),
      
      documentType: yup
        .string()
        .oneOf(['cpf', 'rg', 'passport'])
        .required('Tipo de documento é obrigatório'),
      
      phone: yup
        .string()
        .matches(/^\+?[\d\s\-\(\)]+$/, 'Telefone deve ter formato válido'),
      
      email: yup
        .string()
        .email('Email deve ter formato válido'),
      
      birthDate: yup
        .date()
        .max(new Date(), 'Data de nascimento deve ser no passado'),
      
      isMainGuest: yup
        .boolean()
        .default(false)
    }))
    .min(1, 'Deve ter pelo menos um hóspede principal'),
  
  totalAmount: yup
    .number()
    .required('Valor total é obrigatório')
    .min(0, 'Valor total deve ser positivo'),
  
  paidAmount: yup
    .number()
    .min(0, 'Valor pago não pode ser negativo')
    .max(yup.ref('totalAmount'), 'Valor pago não pode ser maior que o total')
    .default(0),
  
  paymentMethod: yup
    .string()
    .oneOf(Object.values(PaymentMethod))
    .required('Método de pagamento é obrigatório'),
  
  specialRequests: yup
    .string()
    .max(1000, 'Solicitações especiais devem ter no máximo 1000 caracteres'),
  
  observations: yup
    .string()
    .max(2000, 'Observações devem ter no máximo 2000 caracteres'),
  
  source: yup
    .string()
    .oneOf(Object.values(ReservationSource))
    .default(ReservationSource.MANUAL),
  
  extraServices: yup
    .array()
    .of(yup.object({
      name: yup
        .string()
        .required('Nome do serviço é obrigatório'),
      
      price: yup
        .number()
        .required('Preço é obrigatório')
        .min(0, 'Preço deve ser positivo'),
      
      quantity: yup
        .number()
        .required('Quantidade é obrigatória')
        .min(1, 'Quantidade deve ser pelo menos 1')
        .integer('Quantidade deve ser um número inteiro'),
      
      total: yup
        .number()
        .required('Total é obrigatório')
        .min(0, 'Total deve ser positivo')
    }))
    .default([])
})

// Schema para hóspede individual
export const guestDetailSchema = yup.object({
  name: yup
    .string()
    .required('Nome é obrigatório')
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres'),
  
  document: yup
    .string()
    .required('Documento é obrigatório')
    .when('documentType', ([documentType], schema) => {
      if (documentType === 'cpf') {
        return schema.matches(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/, 'CPF deve ter formato válido');
      }
      return schema;
    })
    .when('documentType', ([documentType], schema) => {
      if (documentType === 'rg') {
        return schema.min(7, 'RG deve ter pelo menos 7 caracteres');
      }
      return schema;
    })
    .when('documentType', ([documentType], schema) => {
      if (documentType === 'passport') {
        return schema.min(6, 'Passaporte deve ter pelo menos 6 caracteres');
      }
      return schema;
    }),
  
  documentType: yup
    .string()
    .oneOf(['cpf', 'rg', 'passport'])
    .required('Tipo de documento é obrigatório'),
  
  phone: yup
    .string()
    .matches(/^\+?[\d\s\-\(\)]+$/, 'Telefone deve ter formato válido'),
  
  email: yup
    .string()
    .email('Email deve ter formato válido'),
  
  birthDate: yup
    .date()
    .max(new Date(), 'Data de nascimento deve ser no passado')
    .test('age', 'Hóspede deve ter pelo menos 18 anos para ser principal', function(value) {
      if (!value || !this.parent.isMainGuest) return true
      const today = new Date()
      const age = today.getFullYear() - value.getFullYear()
      return age >= 18
    }),
  
  isMainGuest: yup
    .boolean()
    .default(false)
})

// Schema para pagamento
export const paymentSchema = yup.object({
  reservationId: yup
    .string()
    .required('ID da reserva é obrigatório'),
  
  amount: yup
    .number()
    .required('Valor é obrigatório')
    .min(0.01, 'Valor deve ser maior que zero'),
  
  method: yup
    .string()
    .oneOf(Object.values(PaymentMethod))
    .required('Método de pagamento é obrigatório'),
  
  status: yup
    .string()
    .oneOf(Object.values(PaymentStatus))
    .default(PaymentStatus.PENDING),
  
  dueDate: yup
    .date()
    .required('Data de vencimento é obrigatória'),
  
  paidDate: yup
    .date()
    .when('status', ([status], schema) => {
      if (status === PaymentStatus.PAID) {
        return schema.required('Data de pagamento é obrigatória quando status é pago');
      }
      return schema;
    }),
  
  installmentNumber: yup
    .number()
    .min(1, 'Número da parcela deve ser pelo menos 1')
    .integer('Número da parcela deve ser um inteiro')
    .default(1),
  
  totalInstallments: yup
    .number()
    .min(1, 'Total de parcelas deve ser pelo menos 1')
    .integer('Total de parcelas deve ser um inteiro')
    .default(1),
  
  description: yup
    .string()
    .max(200, 'Descrição deve ter no máximo 200 caracteres'),
  
  feeAmount: yup
    .number()
    .min(0, 'Valor da taxa não pode ser negativo')
    .default(0),
  
  netAmount: yup
    .number()
    .required('Valor líquido é obrigatório')
    .min(0, 'Valor líquido deve ser positivo')
})

// Schema para plano de pagamento
export const paymentPlanSchema = yup.object({
  totalAmount: yup
    .number()
    .required('Valor total é obrigatório')
    .min(0.01, 'Valor total deve ser maior que zero'),
  
  paymentMethod: yup
    .string()
    .oneOf(Object.values(PaymentMethod))
    .required('Método de pagamento é obrigatório'),
  
  feePercentage: yup
    .number()
    .min(0, 'Percentual de taxa não pode ser negativo')
    .max(50, 'Percentual de taxa não pode ser maior que 50%')
    .default(0),
  
  installments: yup
    .array()
    .of(yup.object({
      number: yup
        .number()
        .required('Número da parcela é obrigatório')
        .min(1, 'Número da parcela deve ser pelo menos 1')
        .integer('Número da parcela deve ser um inteiro'),
      
      amount: yup
        .number()
        .required('Valor da parcela é obrigatório')
        .min(0.01, 'Valor da parcela deve ser maior que zero'),
      
      dueDate: yup
        .date()
        .required('Data de vencimento é obrigatória'),
      
      description: yup
        .string()
        .max(200, 'Descrição deve ter no máximo 200 caracteres'),
      
      isPaid: yup
        .boolean()
        .default(false)
    }))
    .min(1, 'Deve ter pelo menos uma parcela')
    .max(12, 'Máximo de 12 parcelas')
})

// Schema para serviço extra
export const extraServiceSchema = yup.object({
  name: yup
    .string()
    .required('Nome do serviço é obrigatório')
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres'),
  
  description: yup
    .string()
    .max(500, 'Descrição deve ter no máximo 500 caracteres'),
  
  price: yup
    .number()
    .required('Preço é obrigatório')
    .min(0, 'Preço deve ser positivo'),
  
  quantity: yup
    .number()
    .required('Quantidade é obrigatória')
    .min(1, 'Quantidade deve ser pelo menos 1')
    .integer('Quantidade deve ser um número inteiro'),
  
  category: yup
    .string()
    .oneOf(['cleaning', 'transport', 'food', 'entertainment', 'other'])
    .default('other')
})

// Schemas para validação por etapas
export const reservationStepSchemas = {
  basicInfo: yup.object({
    propertyId: reservationSchema.fields.propertyId,
    checkIn: reservationSchema.fields.checkIn,
    checkOut: reservationSchema.fields.checkOut,
    guests: reservationSchema.fields.guests,
  }),
  
  clientInfo: yup.object({
    clientId: reservationSchema.fields.clientId,
    guestDetails: reservationSchema.fields.guestDetails,
    specialRequests: reservationSchema.fields.specialRequests,
  }),
  
  payment: yup.object({
    totalAmount: reservationSchema.fields.totalAmount,
    paymentMethod: reservationSchema.fields.paymentMethod,
    extraServices: reservationSchema.fields.extraServices,
  }),
  
  review: yup.object({
    observations: reservationSchema.fields.observations,
  })
}

// Schema para busca/filtros de reservas
export const reservationFiltersSchema = yup.object({
  status: yup
    .array()
    .of(yup.string().oneOf(Object.values(ReservationStatus))),
  
  propertyId: yup
    .string(),
  
  clientId: yup
    .string(),
  
  dateRange: yup.object({
    start: yup.date(),
    end: yup.date().min(yup.ref('start'), 'Data final deve ser posterior à inicial'),
  }),
  
  amountRange: yup.object({
    min: yup.number().min(0, 'Valor mínimo deve ser positivo'),
    max: yup.number().min(yup.ref('min'), 'Valor máximo deve ser maior que o mínimo'),
  }),
  
  source: yup
    .array()
    .of(yup.string().oneOf(Object.values(ReservationSource))),
  
  paymentMethod: yup
    .array()
    .of(yup.string().oneOf(Object.values(PaymentMethod))),
  
  sortBy: yup
    .string()
    .oneOf(['checkIn', 'checkOut', 'createdAt', 'totalAmount', 'status'])
    .default('checkIn'),
  
  sortOrder: yup
    .string()
    .oneOf(['asc', 'desc'])
    .default('asc'),
  
  limit: yup
    .number()
    .min(1, 'Limite deve ser pelo menos 1')
    .max(100, 'Limite não pode ser maior que 100')
    .default(20),
  
  offset: yup
    .number()
    .min(0, 'Offset não pode ser negativo')
    .default(0)
})