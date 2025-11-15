/**
 * Optimized Conversation Types
 * Two-collection architecture for performance and scalability
 */

/**
 * ConversationHeader - Lightweight document for listing
 * Stored in: tenants/{tenantId}/conversations
 */
export interface ConversationHeader {
  id: string;
  tenantId: string;
  clientId?: string; // Optional - pode não ter cliente cadastrado ainda
  clientPhone: string;
  clientName?: string;

  // Timestamps
  startedAt: Date;
  lastMessageAt: Date;

  // Statistics (denormalized for speed)
  messageCount: number;
  unreadCount?: number;  // Mensagens não lidas pelo usuário

  // Status
  status: ConversationStatus;
  isRead?: boolean;  // Se a última mensagem foi lida pelo usuário

  // Outcome tracking
  outcome?: ConversationOutcome;

  // Categorização
  tags: string[]; // ['booking', 'support', 'information', 'property_inquiry']

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  lastReadAt?: Date;  // Última vez que o usuário leu
}

/**
 * Conversation outcome for success tracking
 */
export interface ConversationOutcome {
  type: 'reservation' | 'information' | 'support' | 'no_interest';
  reservationId?: string;
  leadId?: string;
  revenue?: number;
  notes?: string;
}

export type ConversationStatus = 'active' | 'completed' | 'abandoned' | 'success' | 'pending';

/**
 * ConversationMessage - Detailed message with context
 * Stored in: tenants/{tenantId}/messages
 */
export interface ConversationMessage {
  id: string;
  conversationId: string; // FK - INDEXED for queries
  tenantId: string;

  // Mensagem do cliente
  clientMessage: string;
  clientMessageTimestamp: Date; // Horário da mensagem do cliente

  // Mensagem da Sofia (opcional)
  sofiaMessage: string | null;
  sofiaMessageTimestamp: Date | null; // Horário da resposta da Sofia (null se não houver resposta)

  // Metadata
  createdAt: Date;
}

/**
 * Context data for AI fine-tuning and analysis
 */
export interface MessageContext {
  // Intent detection
  intent?: string;

  // Extracted entities
  entities?: Record<string, any>;

  // Functions called during this interaction
  functionsCalled?: string[];

  // AI confidence
  confidence?: number;

  // Additional metadata
  metadata?: Record<string, any>;
}

/**
 * Request/Response types for API
 */
export interface PostConversationRequest {
  // Campos essenciais
  tenantId: string;
  clientPhone: string;

  // Mensagem do cliente
  clientMessage: string;
  clientMessageTimestamp?: string; // ISO timestamp

  // Mensagem da Sofia (opcional)
  sofiaMessage?: string | null;
  sofiaMessageTimestamp?: string | null; // ISO timestamp
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
  status?: ConversationStatus;
  tags?: string[];
  limit?: number;
  startAfter?: string; // Document ID for cursor-based pagination
}

export interface GetMessagesQuery {
  conversationId: string;
  limit?: number;
  startAfter?: string; // Document ID for cursor-based pagination
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
export interface ConversationSummary {
  id: string;
  clientName?: string;
  clientPhone: string;
  lastMessage: string;
  lastMessageAt: Date;
  messageCount: number;
  unreadCount?: number;
  status: ConversationStatus;
  isRead?: boolean;
  tags: string[];
  outcome?: ConversationOutcome;
}
