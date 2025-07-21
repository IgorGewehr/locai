export interface AIInput {
  userMessage: string;
  conversationContext: ConversationContext;
  conversationHistory?: ConversationMessage[];
  previousToolResult?: ToolOutput;
  turnNumber?: number;
  clientPhone: string;
  tenantId: string;
  validationFeedback?: string;
  originalIntent?: string; // Rastreia a intenção original do usuário
}

export interface AIResponse {
  thought: string;
  action: {
    type: 'reply' | 'call_tool';
    payload: {
      message?: string;
      toolName?: string;
      parameters?: Record<string, any>;
    };
  };
  confidence: number;
  updatedContext: ConversationContext;
}

export interface ConversationContext {
  searchFilters: Record<string, any>;
  interestedProperties: string[];
  pendingReservation?: PendingReservation;
  clientProfile: ClientProfile;
  currentPropertyId?: string; // ID da propriedade atual em discussão
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date;
}

export interface ToolOutput {
  toolName: string;
  success: boolean;
  data?: any;
  error?: string;
  executionTime?: number;
}

export interface PendingReservation {
  propertyId: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  estimatedPrice?: number;
  clientConfirmed?: boolean;
}

export interface ClientProfile {
  name?: string;
  phone: string;
  email?: string;
  preferences?: Record<string, any>;
  leadScore?: number;
  lastInteraction?: Date;
}

export interface AgentMetrics {
  totalTurns: number;
  successfulCompletions: number;
  toolUsageCount: Record<string, number>;
  averageResponseTime: number;
  conversionRate: number;
}