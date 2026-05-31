// lib/types/property.ts
import { PaymentMethod } from './common'

export interface Property {
  id: string
  title: string
  description: string
  address: string
  location?: string  // Campo concatenado para busca (address + neighborhood + city)
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

  // Configurações financeiras da reserva
  advancePaymentPercentage: number // Percentual do valor total que deve ser pago antecipadamente (ex: 10 = 10%)
  
  // Mídias - Nova estrutura simplificada (compatível com Dart)
  photos: string[] // URLs simples como no projeto Dart
  videos: string[] // URLs simples como no projeto Dart
  
  // DEPRECATED: Compatibilidade com estrutura antiga (será removido)
  photos_legacy?: PropertyPhoto[]
  videos_legacy?: PropertyVideo[]
  
  // Disponibilidade e preços
  unavailableDates: Date[]
  customPricing: Record<string, number> // "YYYY-MM-DD" -> price
  
  // Configurações de acréscimos automáticos
  weekendSurcharge?: number // Percentual de acréscimo para fins de semana
  holidaySurcharge?: number // Percentual de acréscimo para feriados
  decemberSurcharge?: number // Percentual de acréscimo para dezembro
  highSeasonSurcharge?: number // Percentual de acréscimo para alta temporada
  highSeasonMonths?: number[] // Meses considerados alta temporada (1-12)

  // Integração com Airbnb — o sistema NÃO gerencia mais disponibilidade
  // internamente. Mantemos apenas:
  //   - airbnbUrl: link público da listagem, usado pelo agent (share_airbnb_link)
  //     para fechar negociações; o cliente reserva no próprio Airbnb.
  //   - airbnbPropertyId: id extraído da URL (preservado para eventual uso).
  //   - iCalImportUrl: URL do feed iCal do Airbnb consultado SOB DEMANDA pelo
  //     agent (ical_check_availability) para responder "está livre?". Nada é
  //     persistido — é leitura ao vivo.
  //
  // REMOVIDOS na migração para o modelo "concorrente do Airbnb → vitrine
  // que despacha pro Airbnb": iCalExportToken, iCalExportTokenGeneratedAt,
  // iCalImportSource, iCalLastSync, iCalSyncEnabled, externalCalendarUrls.
  airbnbPropertyId?: string
  airbnbUrl?: string
  iCalImportUrl?: string

  // Configurações de desconto (nível da propriedade)
  discountSettings?: PropertyDiscountSettings

  // Metadados
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  tenantId: string

  // Flags de importação
  needsPriceConfiguration?: boolean // True se propriedade foi importada sem preço definido
  externalId?: string // ID externo (Airbnb, Booking, etc)
  externalSource?: 'airbnb' | 'booking' | 'vrbo' | 'manual_import' | 'other' // Fonte da importação
}

/**
 * Configurações de desconto por propriedade
 * Permite ao proprietário definir regras específicas de desconto para esta propriedade
 */
export interface PropertyDiscountSettings {
  // Descontos por método de pagamento
  pixDiscountPercentage: number // 0-100 (0 = desabilitado)
  cashDiscountPercentage: number // 0-100 (0 = desabilitado)
  cardDiscountPercentage: number // 0-100 (0 = desabilitado)

  // Desconto por estadia prolongada (7+ dias)
  weeklyStayDiscountPercentage: number // 0-100 (0 = desabilitado)

  // Desconto para negociação (margem que a IA pode usar)
  negotiationDiscountPercentage: number // 0-100 (0 = desabilitado)

  // Desconto para datas de última hora (check-in próximo)
  lastMinuteDiscountPercentage: number // 0-100 (0 = desabilitado)
  lastMinuteDaysThreshold: number // Quantos dias antes do check-in (ex: 3 = desconto para check-ins em até 3 dias)
}

/**
 * Valores padrão para configurações de desconto de propriedade
 */
export const DEFAULT_DISCOUNT_SETTINGS: PropertyDiscountSettings = {
  pixDiscountPercentage: 0,
  cashDiscountPercentage: 0,
  cardDiscountPercentage: 0,
  weeklyStayDiscountPercentage: 0,
  negotiationDiscountPercentage: 0,
  lastMinuteDiscountPercentage: 0,
  lastMinuteDaysThreshold: 3
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

// ============================================================================
// UTILITÁRIOS DE MIGRAÇÃO - Compatibilidade entre estruturas antiga e nova
// ============================================================================

/**
 * Extrai URLs de PropertyPhoto[] para string[] (migração para estrutura simples)
 */
export function extractPhotoUrls(photos: PropertyPhoto[] | string[] | undefined): string[] {
  if (!photos || photos.length === 0) return [];
  if (typeof photos[0] === 'string') return photos as string[];
  return (photos as PropertyPhoto[])
    .filter(photo => photo && photo.url && photo.url.startsWith('http'))
    .map(photo => photo.url);
}

/**
 * Extrai URLs de PropertyVideo[] para string[] (migração para estrutura simples)
 */
export function extractVideoUrls(videos: PropertyVideo[] | string[] | undefined): string[] {
  if (!videos || videos.length === 0) return [];
  if (typeof videos[0] === 'string') return videos as string[];
  return (videos as PropertyVideo[])
    .filter(video => video && video.url && video.url.startsWith('http'))
    .map(video => video.url);
}

/**
 * Converte URLs simples para PropertyPhoto[] (compatibilidade reversa)
 */
export function urlsToPropertyPhotos(urls: string[]): PropertyPhoto[] {
  return urls.map((url, index) => ({
    id: `migrated-${Date.now()}-${index}`,
    url,
    filename: url.split('/').pop() || `photo-${index + 1}`,
    order: index,
    isMain: index === 0,
    caption: ''
  }));
}

/**
 * Converte URLs simples para PropertyVideo[] (compatibilidade reversa)
 */
export function urlsToPropertyVideos(urls: string[]): PropertyVideo[] {
  return urls.map((url, index) => ({
    id: `migrated-${Date.now()}-${index}`,
    url,
    filename: url.split('/').pop() || `video-${index + 1}`,
    title: `Video ${index + 1}`,
    order: index,
    duration: 0,
    thumbnail: ''
  }));
}

/**
 * Normaliza propriedade para usar nova estrutura, mantendo compatibilidade
 */
export function normalizePropertyMedia(property: any): Property {
  return {
    ...property,
    photos: extractPhotoUrls(property.photos || property.photos_legacy || property.images),
    videos: extractVideoUrls(property.videos || property.videos_legacy),
    // Manter dados legacy para compatibilidade
    photos_legacy: property.photos_legacy,
    videos_legacy: property.videos_legacy
  };
}