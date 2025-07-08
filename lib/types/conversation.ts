export interface Conversation {
  id: string
  clientId: string
  agentId: string
  tenantId: string
  
  // WhatsApp
  whatsappPhone: string
  
  // Estado
  status: ConversationStatus
  stage: ConversationStage
  intent: ConversationIntent
  priority: ConversationPriority
  
  // Conteúdo
  messages: Message[]
  summary: ConversationSummary
  context: ConversationContext
  
  // AI Analytics
  sentiment: SentimentAnalysis
  confidence: number
  extractedInfo: ExtractedClientInfo
  
  // Metadados
  startedAt: Date
  lastMessageAt: Date
  endedAt?: Date
  duration?: number
  
  // Resultados
  outcome: ConversationOutcome
  generatedRevenue?: number
  followUpScheduled?: Date
}

export enum ConversationStatus {
  ACTIVE = 'active',
  WAITING_CLIENT = 'waiting_client',
  WAITING_APPROVAL = 'waiting_approval',
  ESCALATED = 'escalated',
  COMPLETED = 'completed',
  ABANDONED = 'abandoned'
}

export enum ConversationStage {
  GREETING = 'greeting',
  DISCOVERY = 'discovery',
  PROPERTY_SHOWING = 'property_showing',
  NEGOTIATION = 'negotiation',
  BOOKING = 'booking',
  CONFIRMATION = 'confirmation',
  FOLLOW_UP = 'follow_up'
}

export enum ConversationIntent {
  INFORMATION = 'information',
  BOOKING = 'booking',
  COMPLAINT = 'complaint',
  MODIFICATION = 'modification',
  CANCELLATION = 'cancellation',
  SUPPORT = 'support'
}

export enum ConversationPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}

export interface Message {
  id: string
  conversationId: string
  
  // Conteúdo
  content: string
  type: MessageType
  direction: 'inbound' | 'outbound'
  
  // Origem
  isFromAI: boolean
  functionCall?: FunctionCall
  
  // WhatsApp
  whatsappMessageId?: string
  mediaUrl?: string
  
  // AI Processing
  aiContext?: AIMessageContext
  confidence?: number
  sentiment?: MessageSentiment
  
  // Metadados
  timestamp: Date
  deliveredAt?: Date
  readAt?: Date
  
  // Status
  status: MessageStatus
  errorMessage?: string
}

export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
  DOCUMENT = 'document',
  LOCATION = 'location',
  CONTACT = 'contact'
}

export enum MessageStatus {
  PENDING = 'pending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
  FAILED = 'failed',
  RECEIVED = 'received'
}

export interface ConversationSummary {
  clientName?: string
  mainTopic: string
  keyPoints: string[]
  sentimentOverall: SentimentAnalysis
  stage: ConversationStage
  outcome?: string
  nextSteps: string[]
}

export interface ConversationContext {
  // Cliente
  clientPreferences: ClientPreferences
  previousConversations: ConversationReference[]
  clientScore: number
  
  // Propriedades
  viewedProperties: string[]
  favoriteProperties: string[]
  searchCriteria: PropertySearchCriteria
  
  // Negociação
  budgetRange?: { min: number; max: number }
  flexibleDates: boolean
  specialRequests: string[]
  
  // Estado da conversa
  lastOfferMade?: PropertyOffer
  pendingQuestions: string[]
  nextAction: string
}

export interface ClientPreferences {
  preferredLocation?: string
  priceRange?: { min: number; max: number }
  amenities: string[]
  propertyType?: string
  maxGuests?: number
  communicationStyle: 'formal' | 'casual'
}

export interface ConversationReference {
  id: string
  date: Date
  outcome: string
  revenue?: number
}

export interface PropertySearchCriteria {
  location?: string
  checkIn?: Date
  checkOut?: Date
  guests?: number
  budget?: number
  amenities?: string[]
  propertyType?: string
}

export interface PropertyOffer {
  propertyId: string
  originalPrice: number
  offeredPrice: number
  discountPercentage: number
  validUntil: Date
  accepted?: boolean
}

export interface ExtractedClientInfo {
  name?: string
  budget?: number
  dates?: { checkIn: Date; checkOut: Date }
  guests?: number
  location?: string
  preferences?: string[]
  phoneNumber?: string
  email?: string
}

export interface ConversationOutcome {
  type: 'reservation' | 'lead' | 'information' | 'no_action'
  reservationId?: string
  leadScore: number
  followUpRequired: boolean
  notes: string
}

export interface SentimentAnalysis {
  score: number
  label: 'positive' | 'negative' | 'neutral'
  confidence: number
}

export interface AIMessageContext {
  extractedIntent: string
  confidence: number
  entities: Record<string, any>
  followUpRequired: boolean
}

export interface MessageSentiment {
  score: number
  label: 'positive' | 'negative' | 'neutral'
  confidence: number
}

export interface FunctionCall {
  name: string
  arguments: Record<string, any>
  result?: any
  timestamp: Date
  success: boolean
  error?: string
}