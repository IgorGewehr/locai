export interface Conversation {
  id: string
  clientId: string
  agentId: string
  tenantId: string

  // WhatsApp / Social
  whatsappPhone?: string
  socialId?: string // PSID or IGSID
  channel: 'whatsapp' | 'facebook' | 'instagram'

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

  // WhatsApp / Social
  whatsappMessageId?: string
  socialMessageId?: string
  channel?: 'whatsapp' | 'facebook' | 'instagram'
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

// ============================================
// Optimized Two-Collection Architecture Types
// ============================================

/**
 * ConversationHeader - Lightweight document for listing
 * Stored in: tenants/{tenantId}/conversations
 */
export interface ConversationHeader {
  id: string;
  tenantId: string;
  clientId?: string;
  clientPhone: string;
  clientName?: string;
  channel?: 'whatsapp' | 'facebook' | 'instagram';

  // Timestamps
  startedAt: Date;
  lastMessageAt: Date;

  // Statistics (denormalized for speed)
  messageCount: number;
  unreadCount?: number;
  lastMessage?: string;

  // Status
  status: ConversationHeaderStatus;
  isRead?: boolean;

  // Outcome tracking
  outcome?: ConversationHeaderOutcome;

  // Tags
  tags: string[];

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  lastReadAt?: Date;
}

/**
 * Conversation outcome for success tracking (optimized)
 */
export interface ConversationHeaderOutcome {
  type: 'reservation' | 'information' | 'support' | 'no_interest';
  reservationId?: string;
  leadId?: string;
  revenue?: number;
  notes?: string;
}

export type ConversationHeaderStatus = 'active' | 'completed' | 'abandoned' | 'success' | 'pending';

/**
 * ConversationMessage - Detailed message with context
 * Stored in: tenants/{tenantId}/messages
 */
export interface ConversationMessage {
  id: string;
  conversationId: string;
  tenantId: string;

  // Client message
  clientMessage: string;
  clientMessageTimestamp: Date;

  // Sofia message (optional)
  sofiaMessage: string | null;
  sofiaMessageTimestamp: Date | null;

  // Metadata
  createdAt: Date;
  context?: MessageContext;
}

/**
 * Context data for AI fine-tuning and analysis
 */
export interface MessageContext {
  intent?: string;
  entities?: Record<string, any>;
  functionsCalled?: string[];
  confidence?: number;
  metadata?: Record<string, any>;
}

/**
 * Request/Response types for API
 */
export interface PostConversationRequest {
  tenantId: string;
  clientPhone: string;
  clientMessage: string;
  clientMessageTimestamp?: string;
  sofiaMessage?: string | null;
  sofiaMessageTimestamp?: string | null;
}

export interface PostConversationResponse {
  success: boolean;
  conversationId: string;
  messageId: string;
  isNewConversation: boolean;
  meta?: {
    requestId: string;
    processingTime: number;
    timestamp: string;
  };
}

/**
 * Query types for fetching conversations
 */
export interface GetConversationsQuery {
  clientId?: string;
  clientPhone?: string;
  status?: ConversationHeaderStatus;
  tags?: string[];
  limit?: number;
  startAfter?: string;
}

export interface GetMessagesQuery {
  conversationId: string;
  limit?: number;
  startAfter?: string;
  order?: 'asc' | 'desc';
}

/**
 * Conversation with messages (for display)
 */
export interface ConversationWithMessages extends ConversationHeader {
  messages: ConversationMessage[];
}

/**
 * Conversation summary for lists
 */
export interface ConversationListSummary {
  id: string;
  clientName?: string;
  clientPhone: string;
  channel?: 'whatsapp' | 'facebook' | 'instagram';
  lastMessage: string;
  lastMessageAt: Date;
  messageCount: number;
  unreadCount?: number;
  status: ConversationHeaderStatus;
  isRead?: boolean;
  tags: string[];
  outcome?: ConversationHeaderOutcome;
}

// ============================================
// Type Aliases for Backward Compatibility
// ============================================
// These aliases maintain compatibility with code that imported from conversation-optimized

/** @deprecated Use ConversationHeaderStatus instead */
export type ConversationStatus_Optimized = ConversationHeaderStatus;

/** @deprecated Use ConversationHeaderOutcome instead */
export type ConversationOutcome_Optimized = ConversationHeaderOutcome;

/** @deprecated Use ConversationListSummary instead */
export type ConversationSummary_Optimized = ConversationListSummary;