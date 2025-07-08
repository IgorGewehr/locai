// lib/validation/paymentSchema.ts
import * as yup from 'yup'
import { PaymentMethod, PaymentStatus } from '@/lib/types/reservation'
import { CashFlowCategory } from '@/lib/types/financial'

// Schema para pagamento
export const paymentSchema = yup.object({
  reservationId: yup
    .string()
    .required('ID da reserva é obrigatório'),
  
  amount: yup
    .number()
    .required('Valor é obrigatório')
    .min(0.01, 'Valor deve ser maior que zero')
    .max(1000000, 'Valor não pode ser maior que R$ 1.000.000'),
  
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
    .required('Data de vencimento é obrigatória')
    .min(new Date(Date.now() - 24 * 60 * 60 * 1000), 'Data de vencimento não pode ser anterior a ontem'),
  
  paidDate: yup
    .date()
    .when('status', {
      is: (status: PaymentStatus) => [PaymentStatus.PAID, PaymentStatus.PARTIAL].includes(status),
      then: yup.date().required('Data de pagamento é obrigatória quando status é pago'),
    })
    .test('paid-date-validation', 'Data de pagamento deve ser posterior à criação', function(value) {
      if (!value || this.parent.status !== PaymentStatus.PAID) return true
      return value >= new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) // Máximo 1 ano no passado
    }),
  
  installmentNumber: yup
    .number()
    .min(1, 'Número da parcela deve ser pelo menos 1')
    .max(12, 'Número da parcela não pode ser maior que 12')
    .integer('Número da parcela deve ser um inteiro')
    .default(1),
  
  totalInstallments: yup
    .number()
    .min(1, 'Total de parcelas deve ser pelo menos 1')
    .max(12, 'Total de parcelas não pode ser maior que 12')
    .integer('Total de parcelas deve ser um inteiro')
    .default(1)
    .test('installment-consistency', 'Número da parcela não pode ser maior que o total', function(value) {
      return !value || !this.parent.installmentNumber || this.parent.installmentNumber <= value
    }),
  
  description: yup
    .string()
    .max(200, 'Descrição deve ter no máximo 200 caracteres')
    .default(''),
  
  feeAmount: yup
    .number()
    .min(0, 'Valor da taxa não pode ser negativo')
    .max(yup.ref('amount'), 'Taxa não pode ser maior que o valor do pagamento')
    .default(0),
  
  netAmount: yup
    .number()
    .required('Valor líquido é obrigatório')
    .min(0, 'Valor líquido deve ser positivo')
    .test('net-amount-validation', 'Valor líquido deve ser valor total menos taxa', function(value) {
      const { amount, feeAmount } = this.parent
      if (!amount || feeAmount === undefined) return true
      return Math.abs(value - (amount - feeAmount)) < 0.01 // Tolerância para arredondamento
    })
})

// Schema para processamento de pagamento
export const processPaymentSchema = yup.object({
  paymentId: yup
    .string()
    .required('ID do pagamento é obrigatório'),
  
  paidAmount: yup
    .number()
    .required('Valor pago é obrigatório')
    .min(0.01, 'Valor pago deve ser maior que zero'),
  
  paidDate: yup
    .date()
    .required('Data de pagamento é obrigatória')
    .max(new Date(), 'Data de pagamento não pode ser futura'),
  
  paymentMethod: yup
    .string()
    .oneOf(Object.values(PaymentMethod))
    .required('Método de pagamento é obrigatório'),
  
  transactionId: yup
    .string()
    .max(100, 'ID da transação deve ter no máximo 100 caracteres'),
  
  notes: yup
    .string()
    .max(500, 'Observações devem ter no máximo 500 caracteres'),
  
  receipt: yup.object({
    url: yup
      .string()
      .url('URL do comprovante deve ser válida')
      .required('URL do comprovante é obrigatória'),
    
    type: yup
      .string()
      .oneOf(['image', 'pdf'])
      .required('Tipo do comprovante é obrigatório'),
    
    filename: yup
      .string()
      .required('Nome do arquivo é obrigatório')
      .max(255, 'Nome do arquivo deve ter no máximo 255 caracteres')
  })
})

// Schema para entrada de fluxo de caixa
export const cashFlowEntrySchema = yup.object({
  date: yup
    .date()
    .required('Data é obrigatória')
    .max(new Date(), 'Data não pode ser futura'),
  
  type: yup
    .string()
    .oneOf(['income', 'expense'])
    .required('Tipo é obrigatório'),
  
  category: yup
    .string()
    .oneOf(Object.values(CashFlowCategory))
    .required('Categoria é obrigatória'),
  
  amount: yup
    .number()
    .required('Valor é obrigatório')
    .min(0.01, 'Valor deve ser maior que zero')
    .max(1000000, 'Valor não pode ser maior que R$ 1.000.000'),
  
  description: yup
    .string()
    .required('Descrição é obrigatória')
    .min(3, 'Descrição deve ter pelo menos 3 caracteres')
    .max(200, 'Descrição deve ter no máximo 200 caracteres'),
  
  paymentMethod: yup
    .string()
    .oneOf(Object.values(PaymentMethod)),
  
  reservationId: yup
    .string(),
  
  recurring: yup
    .boolean()
    .default(false),
  
  tags: yup
    .array()
    .of(yup.string().max(30, 'Tag deve ter no máximo 30 caracteres'))
    .max(5, 'Máximo de 5 tags')
})

// Schema para reembolso
export const refundSchema = yup.object({
  paymentId: yup
    .string()
    .required('ID do pagamento é obrigatório'),
  
  amount: yup
    .number()
    .required('Valor do reembolso é obrigatório')
    .min(0.01, 'Valor deve ser maior que zero'),
  
  reason: yup
    .string()
    .required('Motivo do reembolso é obrigatório')
    .min(10, 'Motivo deve ter pelo menos 10 caracteres')
    .max(500, 'Motivo deve ter no máximo 500 caracteres'),
  
  refundMethod: yup
    .string()
    .oneOf(['original_method', 'bank_transfer', 'cash', 'credit'])
    .default('original_method'),
  
  processedBy: yup
    .string()
    .required('ID do usuário que processou é obrigatório'),
  
  notes: yup
    .string()
    .max(1000, 'Observações devem ter no máximo 1000 caracteres')
})

// Schema para conciliação bancária
export const bankReconciliationSchema = yup.object({
  bankStatementId: yup
    .string()
    .required('ID do extrato bancário é obrigatório'),
  
  paymentId: yup
    .string()
    .required('ID do pagamento é obrigatório'),
  
  bankAmount: yup
    .number()
    .required('Valor no extrato bancário é obrigatório')
    .min(0.01, 'Valor deve ser maior que zero'),
  
  paymentAmount: yup
    .number()
    .required('Valor do pagamento é obrigatório')
    .min(0.01, 'Valor deve ser maior que zero'),
  
  difference: yup
    .number()
    .test('difference-validation', 'Diferença calculada incorretamente', function(value) {
      const { bankAmount, paymentAmount } = this.parent
      if (!bankAmount || !paymentAmount) return true
      return Math.abs(value - (bankAmount - paymentAmount)) < 0.01
    }),
  
  reconciliationType: yup
    .string()
    .oneOf(['exact_match', 'partial_match', 'manual_match'])
    .required('Tipo de conciliação é obrigatório'),
  
  notes: yup
    .string()
    .max(500, 'Observações devem ter no máximo 500 caracteres')
})

// Schema para filtros de pagamentos
export const paymentFiltersSchema = yup.object({
  status: yup
    .array()
    .of(yup.string().oneOf(Object.values(PaymentStatus))),
  
  method: yup
    .array()
    .of(yup.string().oneOf(Object.values(PaymentMethod))),
  
  reservationId: yup
    .string(),
  
  clientId: yup
    .string(),
  
  propertyId: yup
    .string(),
  
  dueDateRange: yup.object({
    start: yup.date(),
    end: yup.date().min(yup.ref('start'), 'Data final deve ser posterior à inicial'),
  }),
  
  paidDateRange: yup.object({
    start: yup.date(),
    end: yup.date().min(yup.ref('start'), 'Data final deve ser posterior à inicial'),
  }),
  
  amountRange: yup.object({
    min: yup.number().min(0, 'Valor mínimo deve ser positivo'),
    max: yup.number().min(yup.ref('min'), 'Valor máximo deve ser maior que o mínimo'),
  }),
  
  overdue: yup
    .boolean(),
  
  hasReceipt: yup
    .boolean(),
  
  search: yup
    .string()
    .max(100, 'Busca deve ter no máximo 100 caracteres'),
  
  sortBy: yup
    .string()
    .oneOf(['dueDate', 'paidDate', 'amount', 'status', 'method'])
    .default('dueDate'),
  
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

// Schema para relatório financeiro
export const financialReportSchema = yup.object({
  type: yup
    .string()
    .oneOf(['revenue', 'occupancy', 'financial_summary', 'cash_flow', 'tax_report', 'performance'])
    .required('Tipo de relatório é obrigatório'),
  
  period: yup.object({
    start: yup
      .date()
      .required('Data de início é obrigatória'),
    
    end: yup
      .date()
      .required('Data de fim é obrigatória')
      .min(yup.ref('start'), 'Data final deve ser posterior à inicial')
      .max(new Date(), 'Data final não pode ser futura')
  }).required('Período é obrigatório'),
  
  includeProjections: yup
    .boolean()
    .default(false),
  
  includeComparisons: yup
    .boolean()
    .default(true),
  
  groupBy: yup
    .string()
    .oneOf(['day', 'week', 'month', 'quarter'])
    .default('month'),
  
  format: yup
    .string()
    .oneOf(['pdf', 'excel', 'csv'])
    .default('pdf'),
  
  filters: yup.object({
    propertyIds: yup
      .array()
      .of(yup.string()),
    
    clientIds: yup
      .array()
      .of(yup.string()),
    
    paymentMethods: yup
      .array()
      .of(yup.string().oneOf(Object.values(PaymentMethod))),
    
    categories: yup
      .array()
      .of(yup.string().oneOf(Object.values(CashFlowCategory)))
  })
})