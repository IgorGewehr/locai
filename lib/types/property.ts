// lib/types/property.ts
export interface Property {
  id?: string
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
  
  // Mídias
  photos: PropertyPhoto[]
  videos: PropertyVideo[]
  
  // Disponibilidade e preços
  unavailableDates: Date[]
  customPricing: Record<string, number> // "YYYY-MM-DD" -> price
  
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

export enum PaymentMethod {
  CREDIT_CARD = 'credit_card',
  PIX = 'pix',
  CASH = 'cash',
  BANK_TRANSFER = 'bank_transfer'
}

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

export const PAYMENT_METHODS_LABELS = {
  [PaymentMethod.CREDIT_CARD]: 'Cartão de Crédito',
  [PaymentMethod.PIX]: 'PIX',
  [PaymentMethod.CASH]: 'Dinheiro',
  [PaymentMethod.BANK_TRANSFER]: 'Transferência Bancária'
}

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