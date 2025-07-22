export interface AIAgent {
  id: string
  name: string
  personality: AIPersonality
  configuration: AIConfiguration
  performance: AIPerformance
  tenantId: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface AIPersonality {
  name: string
  tone: 'professional' | 'friendly' | 'casual' | 'formal'
  style: 'consultative' | 'direct' | 'persuasive' | 'educational'
  responseLength: 'concise' | 'detailed' | 'adaptive'
  
  // Customizações
  greetingMessage: string
  closingStyle: string
  specialityFocus: string[]
  
  // Comportamentos
  proactiveFollowUp: boolean
  urgencyDetection: boolean
  priceNegotiation: boolean
  crossSelling: boolean
}

export interface AIConfiguration {
  // OpenAI
  model: 'gpt-4o-mini'
  temperature: number
  maxTokens: number
  
  // Funcionalidades
  enabledFunctions: AIFunction[]
  autoApproval: AutoApprovalSettings
  businessRules: BusinessRule[]
  
  // Limites
  maxConversationsPerHour: number
  responseTimeLimit: number
  escalationTriggers: EscalationTrigger[]
}

export interface AIFunction {
  name: string
  description: string
  parameters: any
  autoExecute: boolean
  requiresApproval: boolean
  priority: number
}

export interface AutoApprovalSettings {
  maxReservationValue: number
  maxDiscountPercentage: number
  trustedClientReservations: boolean
  recurringClientDiscount: number
}

export interface BusinessRule {
  id: string
  name: string
  condition: string
  action: string
  priority: number
  isActive: boolean
}

export interface EscalationTrigger {
  type: 'price_request' | 'complaint' | 'complex_request' | 'high_value'
  threshold: number
  action: 'notify_human' | 'transfer_to_human' | 'pause_ai'
}

export interface AIPerformance {
  totalConversations: number
  conversionsToReservation: number
  conversionRate: number
  averageResponseTime: number
  customerSatisfaction: number
  revenueGenerated: number
  
  // Métricas por período
  dailyStats: DailyStats[]
  weeklyTrends: WeeklyTrend[]
}

export interface DailyStats {
  date: Date
  conversations: number
  conversions: number
  revenue: number
  averageResponseTime: number
}

export interface WeeklyTrend {
  week: string
  conversions: number
  revenue: number
  averageResponseTime: number
}

export interface AIResponse {
  message: string
  content: string
  functionCall?: {
    name: string
    arguments: any
    result: any
  }
  confidence: number
  sentiment: SentimentAnalysis
  suggestedActions: string[]
}

export interface SentimentAnalysis {
  score: number // -1 to 1
  label: 'positive' | 'negative' | 'neutral'
  confidence: number
}

export interface BusinessContext {
  companyName: string
  location: string
  specialty: string
  totalProperties: number
  maxDiscountPercentage: number
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