// lib/types/context-types-enhanced.ts
// ENHANCED CONTEXT TYPES - STEP 1 IMPLEMENTATION
// Tipos otimizados para alta performance e memória perfeita

import { Timestamp } from 'firebase/firestore';

// ===== CORE CONTEXT INTERFACES =====

export interface EnhancedConversationContext {
  // DADOS BÁSICOS DO CLIENTE (persistentes - NUNCA PERDER)
  clientData: {
    name?: string;
    phone: string;
    tenantId: string;
    city?: string;
    guests?: number;           // ❌ CRÍTICO: NUNCA MAIS PERDER
    checkIn?: string;         // ❌ CRÍTICO: NUNCA MAIS PERDER (YYYY-MM-DD)
    checkOut?: string;        // ❌ CRÍTICO: NUNCA MAIS PERDER (YYYY-MM-DD)
    budget?: number;
    email?: string;
    document?: string;        // CPF
    preferences?: string[];
    source: 'whatsapp' | 'web' | 'phone' | 'email';
  };
  
  // ESTADO DA CONVERSA (fluido mas persistente)
  conversationState: {
    stage: 'discovery' | 'presentation' | 'engagement' | 'conversion' | 'closing';
    intent: string;
    lastAction: string;
    propertiesShown: string[];        // IDs das propriedades já mostradas
    currentPropertyId?: string;       // Propriedade em foco atual
    sentiment: 'positive' | 'neutral' | 'negative';
    urgencyLevel: 1 | 2 | 3 | 4 | 5; // 5 = máxima urgência
    messageFlow: ConversationFlow[];  // Fluxo da conversa
  };
  
  // DADOS DE VENDAS (críticos para conversão)
  salesContext: {
    leadScore: number;                // 0-100
    temperature: 'cold' | 'warm' | 'hot' | 'burning';
    objections: ObjectionRecord[];
    interests: InterestRecord[];
    priceReactions: PriceReaction[];
    conversionProbability: number;    // 0-1
    qualificationLevel: QualificationLevel;
    buyingSignals: BuyingSignal[];
    lastEngagementLevel: 'low' | 'medium' | 'high';
  };
  
  // RESERVA PENDENTE (se houver)
  pendingReservation?: {
    propertyId?: string;
    checkIn?: string;
    checkOut?: string;
    guests?: number;
    totalPrice?: number;
    clientId?: string;
    calculationDetails?: any;
    stage: 'initial' | 'calculated' | 'client_registered' | 'ready_to_book';
  };
  
  // CACHE DE PERFORMANCE (temporário mas útil)
  cache: {
    lastPropertySearch?: {
      query: any;
      results: any[];
      timestamp: Date;
      ttl: number;
    };
    lastPriceCalculation?: {
      propertyId: string;
      params: any;
      result: any;
      timestamp: Date;
      ttl: number;
    };
    frequentlyAskedData?: {
      [key: string]: {
        data: any;
        frequency: number;
        lastUsed: Date;
      };
    };
  };
  
  // METADATA DE SISTEMA (monitoramento)
  metadata: {
    conversationId: string;
    sessionStart: Date;
    lastActivity: Date;
    messageCount: number;
    tokensUsed: number;
    responseTimes: number[];          // Últimos 10 tempos de resposta
    errorCount: number;
    functionCallsCount: number;
    cacheHitRate: number;
    contextUpdates: number;           // Quantas vezes foi atualizado
    version: string;                  // Para versionamento de schema
  };
}

// ===== SUPPORTING INTERFACES =====

export interface ConversationFlow {
  step: number;
  stage: string;
  userMessage: string;
  assistantAction: string;
  timestamp: Date;
  duration: number;
  success: boolean;
  dataExtracted?: {
    guests?: number;
    dates?: { checkIn: string; checkOut: string };
    location?: string;
    budget?: number;
    preferences?: string[];
  };
}

export interface ObjectionRecord {
  objection: string;
  type: 'price' | 'location' | 'timing' | 'features' | 'other';
  timestamp: Date;
  resolved: boolean;
  resolutionStrategy?: string;
  customerResponse?: 'positive' | 'neutral' | 'negative';
}

export interface InterestRecord {
  propertyId: string;
  propertyName: string;
  interestLevel: 'low' | 'medium' | 'high';
  timestamp: Date;
  actions: string[];                 // ['viewed_photos', 'asked_price', 'requested_visit']
  engagementScore: number;           // 0-100
}

export interface PriceReaction {
  price: number;
  propertyId: string;
  reaction: 'positive' | 'neutral' | 'negative' | 'shocked' | 'interested';
  timestamp: Date;
  userMessage: string;               // Mensagem original do usuário
  context: string;                   // Em que contexto foi mostrado o preço
}

export interface BuyingSignal {
  signal: string;
  strength: 'weak' | 'medium' | 'strong';
  timestamp: Date;
  context: string;
  associatedProperty?: string;
}

export interface QualificationLevel {
  budget: {
    qualified: boolean;
    range?: { min: number; max: number };
    confidence: number;
    inferredFrom: string[];
  };
  authority: {
    level: 'low' | 'medium' | 'high';
    indicators: string[];
    confidence: number;
  };
  need: {
    level: 'low' | 'medium' | 'high';
    urgency: 'low' | 'medium' | 'high';
    indicators: string[];
  };
  timeline: {
    urgency: 'flexible' | 'moderate' | 'urgent';
    preferredDates?: { checkIn: string; checkOut: string };
    flexibility: number; // 0-1
  };
}

// ===== MEMORY MANAGEMENT INTERFACES =====

export interface MemoryLayer {
  name: 'L1_MEMORY' | 'L2_CACHE' | 'L3_STORAGE';
  ttl: number;                       // Time to live in milliseconds
  maxSize: number;                   // Maximum entries
  hitRate: number;                   // Cache hit rate
  lastCleanup: Date;
}

export interface ContextCacheEntry {
  context: EnhancedConversationContext;
  timestamp: Date;
  hits: number;
  lastAccess: Date;
  size: number;                      // Estimated size in bytes
}

export interface MemoryMetrics {
  l1CacheSize: number;
  l1HitRate: number;
  l2CacheSize: number;
  l2HitRate: number;
  l3StorageWrites: number;
  l3StorageReads: number;
  memoryUsage: number;               // Total memory usage in MB
  performanceScore: number;          // Overall performance score 0-100
}

// ===== MESSAGE HISTORY INTERFACES =====

export interface EnhancedMessageHistoryItem {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Timestamp;
  
  // ENHANCED FIELDS
  intent?: string;
  confidence?: number;
  tokensUsed?: number;
  responseTime?: number;
  functionCalls?: string[];
  dataExtracted?: {
    guests?: number;
    dates?: { checkIn: string; checkOut: string };
    location?: string;
    budget?: number;
    propertyIds?: string[];
  };
  
  // ENGAGEMENT METRICS
  engagementLevel?: 'low' | 'medium' | 'high';
  sentimentScore?: number;           // -1 to 1
  buyingSignals?: string[];
  
  // TECHNICAL METRICS
  fromCache?: boolean;
  processingTime?: number;
  errorOccurred?: boolean;
  retryCount?: number;
  
  // BUSINESS CONTEXT
  salesStage?: string;
  conversionEvent?: boolean;
  revenueImpact?: number;
}

export interface MessageHistoryCompression {
  originalCount: number;
  compressedCount: number;
  compressionRatio: number;
  retainedCriticalInfo: string[];
  compressionStrategy: 'time_based' | 'relevance_based' | 'keyword_based';
  lastCompression: Date;
}

// ===== CONTEXT UPDATE INTERFACES =====

export interface ContextUpdate {
  field: string;
  oldValue: any;
  newValue: any;
  timestamp: Date;
  source: 'user_message' | 'function_call' | 'inference' | 'system';
  confidence: number;                // 0-1
  critical: boolean;                 // Is this a critical update?
}

export interface AtomicContextUpdate {
  updates: ContextUpdate[];
  transactionId: string;
  timestamp: Date;
  success: boolean;
  rollbackData?: any;
  validationErrors?: string[];
}

// ===== VALIDATION INTERFACES =====

export interface ContextValidation {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  completeness: number;              // 0-1
  consistency: number;               // 0-1
  freshness: number;                 // 0-1 (how recent is the data)
}

export interface ValidationError {
  field: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  suggestion?: string;
}

export interface ValidationWarning {
  field: string;
  message: string;
  impact: 'performance' | 'accuracy' | 'user_experience';
  suggestion?: string;
}

// ===== PERFORMANCE INTERFACES =====

export interface ContextPerformanceMetrics {
  retrievalTime: number;             // Time to retrieve context (ms)
  updateTime: number;                // Time to update context (ms)
  memoryUsage: number;               // Memory usage (bytes)
  cacheEfficiency: number;           // 0-1
  dataFreshness: number;             // 0-1
  consistencyScore: number;          // 0-1
  lastMeasurement: Date;
}

// ===== TYPE GUARDS =====

export function isEnhancedConversationContext(obj: any): obj is EnhancedConversationContext {
  return obj &&
    typeof obj === 'object' &&
    obj.clientData &&
    typeof obj.clientData.phone === 'string' &&
    obj.conversationState &&
    obj.salesContext &&
    obj.metadata;
}

export function isValidClientData(clientData: any): boolean {
  return clientData &&
    typeof clientData.phone === 'string' &&
    clientData.phone.length >= 10 &&
    (clientData.guests === undefined || (typeof clientData.guests === 'number' && clientData.guests > 0));
}

export function hasValidDates(clientData: any): boolean {
  if (!clientData.checkIn || !clientData.checkOut) return false;
  
  const checkIn = new Date(clientData.checkIn);
  const checkOut = new Date(clientData.checkOut);
  
  return checkIn < checkOut && checkIn >= new Date();
}

// ===== FACTORY FUNCTIONS =====

export function createEmptyEnhancedContext(clientPhone: string, tenantId: string): EnhancedConversationContext {
  const now = new Date();
  const conversationId = `${tenantId}_${clientPhone}_${now.getTime()}`;
  
  return {
    clientData: {
      phone: clientPhone,
      tenantId,
      source: 'whatsapp'
    },
    conversationState: {
      stage: 'discovery',
      intent: 'greeting',
      lastAction: 'initial_contact',
      propertiesShown: [],
      sentiment: 'neutral',
      urgencyLevel: 1,
      messageFlow: []
    },
    salesContext: {
      leadScore: 50,
      temperature: 'warm',
      objections: [],
      interests: [],
      priceReactions: [],
      conversionProbability: 0.3,
      qualificationLevel: {
        budget: { qualified: false, confidence: 0 },
        authority: { level: 'medium', indicators: [], confidence: 0.5 },
        need: { level: 'medium', urgency: 'moderate', indicators: [] },
        timeline: { urgency: 'moderate', flexibility: 0.5 }
      },
      buyingSignals: [],
      lastEngagementLevel: 'medium'
    },
    cache: {},
    metadata: {
      conversationId,
      sessionStart: now,
      lastActivity: now,
      messageCount: 0,
      tokensUsed: 0,
      responseTimes: [],
      errorCount: 0,
      functionCallsCount: 0,
      cacheHitRate: 0,
      contextUpdates: 0,
      version: '2.0.0'
    }
  };
}

// ===== UTILITY FUNCTIONS =====

export function calculateContextSize(context: EnhancedConversationContext): number {
  return JSON.stringify(context).length;
}

export function getContextAge(context: EnhancedConversationContext): number {
  return Date.now() - context.metadata.lastActivity.getTime();
}

export function isContextExpired(context: EnhancedConversationContext, ttlMs: number): boolean {
  return getContextAge(context) > ttlMs;
}

export function extractCriticalData(context: EnhancedConversationContext): any {
  return {
    guests: context.clientData.guests,
    checkIn: context.clientData.checkIn,
    checkOut: context.clientData.checkOut,
    city: context.clientData.city,
    name: context.clientData.name,
    budget: context.clientData.budget,
    stage: context.conversationState.stage,
    leadScore: context.salesContext.leadScore,
    temperature: context.salesContext.temperature
  };
}

// ===== CONSTANTS =====

export const CONTEXT_CONSTANTS = {
  DEFAULT_TTL: 24 * 60 * 60 * 1000,     // 24 hours
  L1_CACHE_TTL: 5 * 60 * 1000,          // 5 minutes
  L2_CACHE_TTL: 60 * 60 * 1000,         // 1 hour
  MAX_MESSAGE_HISTORY: 50,
  MAX_CONTEXT_SIZE: 100000,              // 100KB
  CRITICAL_FIELDS: [
    'clientData.guests',
    'clientData.checkIn', 
    'clientData.checkOut',
    'clientData.city',
    'clientData.name'
  ]
} as const;

export default EnhancedConversationContext;