// lib/types/property.ts
import { PaymentMethod } from './common'

export interface Property {
  id: string
  title: string
  description: string
  address: string
  category: PropertyCategory
  bedrooms: number
  bathrooms: number
  maxGuests: number
  basePrice: number
  pricePerExtraGuest: number
  minimumNights: number
  cleaningFee: number
  
  // Analytics fields
  status: PropertyStatus
  type: PropertyType
  neighborhood: string
  city: string
  capacity: number
  
  // Comodidades
  amenities: string[]
  
  // Características
  isFeatured: boolean
  allowsPets: boolean
  
  // Acréscimos por forma de pagamento
  paymentMethodSurcharges: Record<PaymentMethod, number>
  
  // Configurações financeiras da reserva
  advancePaymentPercentage: number // Percentual do valor total que deve ser pago antecipadamente (ex: 10 = 10%)
  paymentMethodDiscounts?: Record<PaymentMethod, number> // Descontos por método (ex: PIX = 10% desconto)
  
  // Mídias
  photos: PropertyPhoto[]
  videos: PropertyVideo[]
  
  // Disponibilidade e preços
  unavailableDates: Date[]
  customPricing: Record<string, number> // "YYYY-MM-DD" -> price
  
  // Configurações de acréscimos automáticos
  weekendSurcharge?: number // Percentual de acréscimo para fins de semana
  holidaySurcharge?: number // Percentual de acréscimo para feriados
  decemberSurcharge?: number // Percentual de acréscimo para dezembro
  highSeasonSurcharge?: number // Percentual de acréscimo para alta temporada
  highSeasonMonths?: number[] // Meses considerados alta temporada (1-12)
  
  // Metadados
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  tenantId: string
}

export enum PropertyCategory {
  APARTMENT = 'apartment',
  HOUSE = 'house',
  STUDIO = 'studio',
  VILLA = 'villa',
  CONDO = 'condo'
}

export enum PropertyStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  MAINTENANCE = 'maintenance',
  OCCUPIED = 'occupied'
}

export enum PropertyType {
  RESIDENTIAL = 'residential',
  COMMERCIAL = 'commercial',
  VACATION = 'vacation',
  MIXED = 'mixed'
}

// PaymentMethod movido para um arquivo comum para evitar duplicação
// Veja: lib/types/common.ts

export interface PropertyPhoto {
  id: string
  url: string
  filename: string
  order: number
  isMain: boolean
  caption?: string
}

export interface PropertyVideo {
  id: string
  url: string
  filename: string
  title: string
  duration?: number
  order: number
  thumbnail?: string
}

export interface CalendarDay {
  date: Date
  isAvailable: boolean
  price?: number
  isWeekend: boolean
  isHoliday: boolean
  isToday: boolean
  isSelected: boolean
}

export interface DateRange {
  start: Date
  end: Date
}

export interface PricingRule {
  startDate: Date
  endDate: Date
  price: number
  description?: string
}

export interface UploadedFile {
  name: string
  url: string
  size: number
}

export const PROPERTY_CATEGORIES_LABELS = {
  [PropertyCategory.APARTMENT]: 'Apartamento',
  [PropertyCategory.HOUSE]: 'Casa',
  [PropertyCategory.STUDIO]: 'Estúdio',
  [PropertyCategory.VILLA]: 'Villa',
  [PropertyCategory.CONDO]: 'Condomínio'
}

// PAYMENT_METHODS_LABELS movido para common.ts
export { PAYMENT_METHOD_LABELS as PAYMENT_METHODS_LABELS } from './common'

export const COMMON_AMENITIES = [
  'Wi-Fi',
  'Ar Condicionado',
  'Piscina',
  'Estacionamento',
  'Churrasqueira',
  'Academia',
  'Área Gourmet',
  'Varanda',
  'Jardim',
  'Portaria 24h',
  'Elevador',
  'Banheira',
  'Lareira',
  'Sacada',
  'Área de Serviço',
  'Cozinha Equipada',
  'TV a Cabo',
  'Netflix',
  'Geladeira',
  'Micro-ondas',
  'Fogão',
  'Máquina de Lavar',
  'Secadora',
  'Ferro de Passar',
  'Berço',
  'Cadeira de Bebê',
  'Jogos',
  'Livros',
  'Ventilador',
  'Aquecedor',
  'Cofre',
  'Extintor',
  'Detector de Fumaça',
  'Kit Primeiro Socorros'
]