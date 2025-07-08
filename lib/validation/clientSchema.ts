// lib/validation/clientSchema.ts
import * as yup from 'yup'
import { 
  CustomerSegment, 
  AcquisitionSource 
} from '@/lib/types/client'
import { PaymentMethod } from '@/lib/types/reservation'

// Schema principal do cliente
export const clientSchema = yup.object({
  name: yup
    .string()
    .required('Nome é obrigatório')
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres')
    .matches(/^[a-zA-ZÀ-ÿ\s]+$/, 'Nome deve conter apenas letras e espaços'),
  
  email: yup
    .string()
    .email('Email deve ter formato válido')
    .max(100, 'Email deve ter no máximo 100 caracteres'),
  
  phone: yup
    .string()
    .required('Telefone é obrigatório')
    .matches(/^\+?[\d\s\-\(\)]+$/, 'Telefone deve ter formato válido')
    .min(10, 'Telefone deve ter pelo menos 10 dígitos'),
  
  document: yup
    .string()
    .required('Documento é obrigatório')
    .when('documentType', {
      is: 'cpf',
      then: yup.string()
        .matches(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/, 'CPF deve ter formato válido (000.000.000-00)')
        .test('cpf', 'CPF inválido', validateCPF),
    })
    .when('documentType', {
      is: 'cnpj',
      then: yup.string()
        .matches(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/, 'CNPJ deve ter formato válido (00.000.000/0000-00)')
        .test('cnpj', 'CNPJ inválido', validateCNPJ),
    }),
  
  documentType: yup
    .string()
    .oneOf(['cpf', 'cnpj'])
    .required('Tipo de documento é obrigatório'),
  
  address: yup.object({
    street: yup
      .string()
      .required('Rua é obrigatória')
      .max(200, 'Rua deve ter no máximo 200 caracteres'),
    
    number: yup
      .string()
      .required('Número é obrigatório')
      .max(20, 'Número deve ter no máximo 20 caracteres'),
    
    complement: yup
      .string()
      .max(100, 'Complemento deve ter no máximo 100 caracteres'),
    
    neighborhood: yup
      .string()
      .required('Bairro é obrigatório')
      .max(100, 'Bairro deve ter no máximo 100 caracteres'),
    
    city: yup
      .string()
      .required('Cidade é obrigatória')
      .max(100, 'Cidade deve ter no máximo 100 caracteres'),
    
    state: yup
      .string()
      .required('Estado é obrigatório')
      .length(2, 'Estado deve ter 2 caracteres (UF)'),
    
    zipCode: yup
      .string()
      .required('CEP é obrigatório')
      .matches(/^\d{5}-?\d{3}$/, 'CEP deve ter formato válido (00000-000)'),
    
    country: yup
      .string()
      .default('Brasil')
  }),
  
  preferences: yup.object({
    preferredPaymentMethod: yup
      .string()
      .oneOf(Object.values(PaymentMethod))
      .default(PaymentMethod.PIX),
    
    preferredCheckInTime: yup
      .string()
      .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Horário deve ter formato HH:MM'),
    
    preferredCheckOutTime: yup
      .string()
      .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Horário deve ter formato HH:MM'),
    
    petOwner: yup
      .boolean()
      .default(false),
    
    smoker: yup
      .boolean()
      .default(false),
    
    preferredRoomType: yup
      .string()
      .max(50, 'Tipo de quarto preferido deve ter no máximo 50 caracteres'),
    
    emergencyContact: yup.object({
      name: yup
        .string()
        .required('Nome do contato de emergência é obrigatório')
        .max(100, 'Nome deve ter no máximo 100 caracteres'),
      
      phone: yup
        .string()
        .required('Telefone do contato de emergência é obrigatório')
        .matches(/^\+?[\d\s\-\(\)]+$/, 'Telefone deve ter formato válido'),
      
      relationship: yup
        .string()
        .required('Relacionamento é obrigatório')
        .max(50, 'Relacionamento deve ter no máximo 50 caracteres'),
      
      email: yup
        .string()
        .email('Email deve ter formato válido')
    }),
    
    dietaryRestrictions: yup
      .string()
      .max(500, 'Restrições alimentares devem ter no máximo 500 caracteres'),
    
    accessibilityNeeds: yup
      .string()
      .max(500, 'Necessidades de acessibilidade devem ter no máximo 500 caracteres'),
    
    communicationPreference: yup
      .string()
      .oneOf(['whatsapp', 'email', 'phone', 'sms'])
      .default('whatsapp'),
    
    marketingOptIn: yup
      .boolean()
      .default(false)
  }),
  
  customerSegment: yup
    .string()
    .oneOf(Object.values(CustomerSegment))
    .default(CustomerSegment.NEW),
  
  acquisitionSource: yup
    .string()
    .oneOf(Object.values(AcquisitionSource))
    .default(AcquisitionSource.DIRECT),
  
  isActive: yup
    .boolean()
    .default(true),
  
  isVip: yup
    .boolean()
    .default(false),
  
  tags: yup
    .array()
    .of(yup.string().max(30, 'Tag deve ter no máximo 30 caracteres'))
    .max(10, 'Máximo de 10 tags'),
  
  notes: yup
    .string()
    .max(2000, 'Observações devem ter no máximo 2000 caracteres'),
  
  whatsappNumber: yup
    .string()
    .matches(/^\+?[\d\s\-\(\)]+$/, 'Número do WhatsApp deve ter formato válido')
})

// Schema para atualização de cliente (campos opcionais)
export const clientUpdateSchema = clientSchema.partial()

// Schema para busca/filtros de clientes
export const clientFiltersSchema = yup.object({
  search: yup
    .string()
    .max(100, 'Busca deve ter no máximo 100 caracteres'),
  
  segment: yup
    .array()
    .of(yup.string().oneOf(Object.values(CustomerSegment))),
  
  acquisitionSource: yup
    .array()
    .of(yup.string().oneOf(Object.values(AcquisitionSource))),
  
  isActive: yup
    .boolean(),
  
  isVip: yup
    .boolean(),
  
  city: yup
    .string()
    .max(100, 'Cidade deve ter no máximo 100 caracteres'),
  
  state: yup
    .string()
    .length(2, 'Estado deve ter 2 caracteres (UF)'),
  
  tags: yup
    .array()
    .of(yup.string().max(30, 'Tag deve ter no máximo 30 caracteres')),
  
  totalSpentRange: yup.object({
    min: yup.number().min(0, 'Valor mínimo deve ser positivo'),
    max: yup.number().min(yup.ref('min'), 'Valor máximo deve ser maior que o mínimo'),
  }),
  
  totalReservationsRange: yup.object({
    min: yup.number().min(0, 'Quantidade mínima deve ser positiva').integer(),
    max: yup.number().min(yup.ref('min'), 'Quantidade máxima deve ser maior que a mínima').integer(),
  }),
  
  lastReservationRange: yup.object({
    start: yup.date(),
    end: yup.date().min(yup.ref('start'), 'Data final deve ser posterior à inicial'),
  }),
  
  sortBy: yup
    .string()
    .oneOf(['name', 'createdAt', 'lastReservation', 'totalSpent', 'totalReservations'])
    .default('name'),
  
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

// Schema para avaliação de cliente
export const clientReviewSchema = yup.object({
  reservationId: yup
    .string()
    .required('ID da reserva é obrigatório'),
  
  rating: yup
    .number()
    .required('Avaliação é obrigatória')
    .min(1, 'Avaliação deve ser entre 1 e 5')
    .max(5, 'Avaliação deve ser entre 1 e 5')
    .integer('Avaliação deve ser um número inteiro'),
  
  comment: yup
    .string()
    .max(1000, 'Comentário deve ter no máximo 1000 caracteres'),
  
  aspects: yup.object({
    cleanliness: yup
      .number()
      .required('Avaliação de limpeza é obrigatória')
      .min(1, 'Avaliação deve ser entre 1 e 5')
      .max(5, 'Avaliação deve ser entre 1 e 5')
      .integer(),
    
    communication: yup
      .number()
      .required('Avaliação de comunicação é obrigatória')
      .min(1, 'Avaliação deve ser entre 1 e 5')
      .max(5, 'Avaliação deve ser entre 1 e 5')
      .integer(),
    
    checkIn: yup
      .number()
      .required('Avaliação de check-in é obrigatória')
      .min(1, 'Avaliação deve ser entre 1 e 5')
      .max(5, 'Avaliação deve ser entre 1 e 5')
      .integer(),
    
    accuracy: yup
      .number()
      .required('Avaliação de precisão é obrigatória')
      .min(1, 'Avaliação deve ser entre 1 e 5')
      .max(5, 'Avaliação deve ser entre 1 e 5')
      .integer(),
    
    location: yup
      .number()
      .required('Avaliação de localização é obrigatória')
      .min(1, 'Avaliação deve ser entre 1 e 5')
      .max(5, 'Avaliação deve ser entre 1 e 5')
      .integer(),
    
    value: yup
      .number()
      .required('Avaliação de custo-benefício é obrigatória')
      .min(1, 'Avaliação deve ser entre 1 e 5')
      .max(5, 'Avaliação deve ser entre 1 e 5')
      .integer()
  }),
  
  isPublic: yup
    .boolean()
    .default(true)
})

// Funções de validação de documentos brasileiros
function validateCPF(cpf: string | undefined): boolean {
  if (!cpf) return false
  
  // Remove pontos e hífens
  const cleanCpf = cpf.replace(/[^\d]/g, '')
  
  // Verifica se tem 11 dígitos
  if (cleanCpf.length !== 11) return false
  
  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1{10}$/.test(cleanCpf)) return false
  
  // Validação do primeiro dígito verificador
  let sum = 0
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleanCpf.charAt(i)) * (10 - i)
  }
  let remainder = (sum * 10) % 11
  if (remainder === 10 || remainder === 11) remainder = 0
  if (remainder !== parseInt(cleanCpf.charAt(9))) return false
  
  // Validação do segundo dígito verificador
  sum = 0
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleanCpf.charAt(i)) * (11 - i)
  }
  remainder = (sum * 10) % 11
  if (remainder === 10 || remainder === 11) remainder = 0
  if (remainder !== parseInt(cleanCpf.charAt(10))) return false
  
  return true
}

function validateCNPJ(cnpj: string | undefined): boolean {
  if (!cnpj) return false
  
  // Remove pontos, barras e hífens
  const cleanCnpj = cnpj.replace(/[^\d]/g, '')
  
  // Verifica se tem 14 dígitos
  if (cleanCnpj.length !== 14) return false
  
  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1{13}$/.test(cleanCnpj)) return false
  
  // Validação do primeiro dígito verificador
  let sum = 0
  let weight = 2
  for (let i = 11; i >= 0; i--) {
    sum += parseInt(cleanCnpj.charAt(i)) * weight
    weight = weight === 9 ? 2 : weight + 1
  }
  let remainder = sum % 11
  const firstDigit = remainder < 2 ? 0 : 11 - remainder
  if (firstDigit !== parseInt(cleanCnpj.charAt(12))) return false
  
  // Validação do segundo dígito verificador
  sum = 0
  weight = 2
  for (let i = 12; i >= 0; i--) {
    sum += parseInt(cleanCnpj.charAt(i)) * weight
    weight = weight === 9 ? 2 : weight + 1
  }
  remainder = sum % 11
  const secondDigit = remainder < 2 ? 0 : 11 - remainder
  if (secondDigit !== parseInt(cleanCnpj.charAt(13))) return false
  
  return true
}