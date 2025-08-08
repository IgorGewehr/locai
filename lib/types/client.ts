// lib/types/client.ts
import { PaymentMethod } from './common'

export interface Client {
  id: string
  name: string
  email?: string
  phone: string
  document: string
  documentType: 'cpf' | 'cnpj'
  
  // Endereço
  address?: Address
  
  // Preferências
  preferences: ClientPreferences
  
  // Histórico
  totalReservations: number
  totalSpent: number
  averageRating: number
  lastReservation?: Date
  lifetimeValue: number
  
  // WhatsApp IA
  whatsappConversations: WhatsAppConversation[]
  whatsappNumber?: string
  
  // Segmentação
  customerSegment: CustomerSegment
  acquisitionSource: AcquisitionSource
  
  // Metadados
  createdAt: Date
  updatedAt: Date
  tenantId: string
  isActive: boolean
  isVip: boolean
  tags: string[]
  notes: string
  
  // Avaliações
  reviews: ClientReview[]
}

export interface Address {
  street: string
  number: string
  complement?: string
  neighborhood: string
  city: string
  state: string
  zipCode: string
  country: string
}

export interface ClientPreferences {
  preferredPaymentMethod: PaymentMethod
  preferredCheckInTime?: string
  preferredCheckOutTime?: string
  petOwner: boolean
  smoker: boolean
  preferredRoomType?: string
  emergencyContact?: EmergencyContact
  dietaryRestrictions?: string
  accessibilityNeeds?: string
  communicationPreference: 'whatsapp' | 'email' | 'phone' | 'sms'
  marketingOptIn: boolean
}

export interface EmergencyContact {
  name: string
  phone: string
  relationship: string
  email?: string
}

export interface WhatsAppConversation {
  id: string
  messages: WhatsAppMessage[]
  startedAt: Date
  lastMessageAt: Date
  isActive: boolean
  context?: ConversationContext
}

export interface WhatsAppMessage {
  id: string
  content: string
  type: 'text' | 'image' | 'video' | 'audio' | 'document'
  direction: 'inbound' | 'outbound'
  timestamp: Date
  isFromAI: boolean
  metadata?: MessageMetadata
}

export interface ConversationContext {
  searchFilters?: any
  interestedProperties?: string[]
  pendingReservation?: any
  lastAction?: string
}

export interface MessageMetadata {
  mediaUrl?: string
  caption?: string
  fileName?: string
  fileSize?: number
}

export interface ClientReview {
  id: string
  reservationId: string
  rating: number // 1-5
  comment?: string
  aspects: ReviewAspects
  createdAt: Date
  isPublic: boolean
}

export interface ReviewAspects {
  cleanliness: number
  communication: number
  checkIn: number
  accuracy: number
  location: number
  value: number
}

export enum CustomerSegment {
  NEW = 'new',                    // Cliente novo
  OCCASIONAL = 'occasional',      // Cliente ocasional
  REGULAR = 'regular',           // Cliente regular
  VIP = 'vip',                   // Cliente VIP
  CHURNED = 'churned'            // Cliente perdido
}

export enum AcquisitionSource {
  WHATSAPP = 'whatsapp',
  WEBSITE = 'website',
  REFERRAL = 'referral',
  SOCIAL_MEDIA = 'social_media',
  GOOGLE_ADS = 'google_ads',
  ORGANIC_SEARCH = 'organic_search',
  DIRECT = 'direct',
  OTHER = 'other'
}

// Analytics do cliente
export interface ClientAnalytics {
  clientId: string
  
  // Comportamento de reserva
  averageBookingWindow: number // dias de antecedência
  averageStayDuration: number
  preferredSeasons: string[]
  preferredDaysOfWeek: number[]
  
  // Padrões financeiros
  averageSpendPerNight: number
  paymentPatterns: PaymentPattern[]
  pricesensitivity: number // 1-5, onde 5 é mais sensível
  
  // Engagement
  responseTime: number // minutos médios para responder
  communicationFrequency: number
  satisfactionScore: number
  
  // Predições
  churnProbability: number // 0-1
  nextBookingProbability: number // 0-1
  lifetimeValuePrediction: number
  
  lastUpdated: Date
}

export interface PaymentPattern {
  method: PaymentMethod
  frequency: number // percentual de uso
  averageAmount: number
}

// Labels para exibição
export const CUSTOMER_SEGMENT_LABELS = {
  [CustomerSegment.NEW]: 'Novo Cliente',
  [CustomerSegment.OCCASIONAL]: 'Cliente Ocasional',
  [CustomerSegment.REGULAR]: 'Cliente Regular',
  [CustomerSegment.VIP]: 'Cliente VIP',
  [CustomerSegment.CHURNED]: 'Cliente Perdido'
}

export const ACQUISITION_SOURCE_LABELS = {
  [AcquisitionSource.WHATSAPP]: 'WhatsApp',
  [AcquisitionSource.WEBSITE]: 'Site',
  [AcquisitionSource.REFERRAL]: 'Indicação',
  [AcquisitionSource.SOCIAL_MEDIA]: 'Redes Sociais',
  [AcquisitionSource.GOOGLE_ADS]: 'Google Ads',
  [AcquisitionSource.ORGANIC_SEARCH]: 'Busca Orgânica',
  [AcquisitionSource.DIRECT]: 'Direto',
  [AcquisitionSource.OTHER]: 'Outro'
}

// Cores para segmentos
export const CUSTOMER_SEGMENT_COLORS = {
  [CustomerSegment.NEW]: '#2196F3',
  [CustomerSegment.OCCASIONAL]: '#FF9800',
  [CustomerSegment.REGULAR]: '#4CAF50',
  [CustomerSegment.VIP]: '#9C27B0',
  [CustomerSegment.CHURNED]: '#757575'
}