// lib/services/optimized-history-manager.ts
// OPTIMIZED HISTORY MANAGER - STEP 1 IMPLEMENTATION  
// Sistema inteligente de gerenciamento de histórico com compressão e relevância

import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs,
  Timestamp 
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { 
  EnhancedMessageHistoryItem,
  MessageHistoryCompression,
  CONTEXT_CONSTANTS
} from '@/lib/types/context-types-enhanced';
import { logger } from '@/lib/utils/logger';

// ===== INTERFACES ESPECÍFICAS DO HISTORY MANAGER =====

interface MessageRelevanceScore {
  messageId: string;
  relevanceScore: number;  // 0-100
  criticalDataExtracted: boolean;
  buyingSignalStrength: 'none' | 'weak' | 'medium' | 'strong';
  keywords: string[];
  recency: number;        // 0-1 (1 = muito recente)
  userEngagement: number; // 0-1
}

interface HistoryCompressionConfig {
  maxMessages: number;
  criticalMessageThreshold: number;     // Score mínimo para manter
  recencyWindow: number;                // Janela de recência em horas
  keywordBoostFactor: number;           // Multiplicador para keywords críticas
  compressionRatio: number;             // Razão de compressão desejada
}

interface HistoryAnalytics {
  totalMessages: number;
  compressedMessages: number;
  compressionRatio: number;
  criticalDataPreserved: number;        // Percentual de dados críticos preservados
  averageRelevanceScore: number;
  processingTime: number;
  memoryUsage: number;
}

// ===== OPTIMIZED HISTORY MANAGER =====

export class OptimizedHistoryManager {
  private readonly MESSAGES_COLLECTION = 'conversation_messages_v2';
  
  // Cache de histórico para otimizar buscas frequentes
  private historyCache = new Map<string, {
    messages: EnhancedMessageHistoryItem[];
    timestamp: Date;
    ttl: number;
  }>();
  
  // Configuração de compressão otimizada
  private readonly compressionConfig: HistoryCompressionConfig = {
    maxMessages: CONTEXT_CONSTANTS.MAX_MESSAGE_HISTORY,
    criticalMessageThreshold: 70,        // Score >= 70 é mantido
    recencyWindow: 2,                     // Últimas 2 horas sempre mantidas
    keywordBoostFactor: 1.5,             // Boost de 50% para keywords
    compressionRatio: 0.6                // Manter 60% das mensagens
  };
  
  // Keywords críticas para detecção de relevância
  private readonly CRITICAL_KEYWORDS = {
    // Dados do cliente
    CLIENT_DATA: ['nome', 'cpf', 'documento', 'email', 'telefone'],
    
    // Necessidades principais  
    REQUIREMENTS: ['guests', 'pessoas', 'hóspedes', 'quantos', 'quantidade'],
    
    // Datas críticas
    DATES: ['check-in', 'checkout', 'chegar', 'sair', 'data', 'quando', 'dia'],
    
    // Localização
    LOCATION: ['onde', 'local', 'cidade', 'região', 'bairro', 'endereço'],
    
    // Preços e orçamento
    PRICING: ['preço', 'valor', 'custa', 'quanto', 'orçamento', 'dinheiro', 'real'],
    
    // Interesse e conversão
    INTEREST: ['gostei', 'interessante', 'quero', 'vou', 'aceito', 'confirmo'],
    
    // Objeções
    OBJECTIONS: ['caro', 'longe', 'pequeno', 'não gostei', 'problema', 'mas'],
    
    // Conversão
    CONVERSION: ['reservar', 'confirmar', 'fechar', 'visitar', 'conhecer', 'agendar']
  };
  
  constructor() {
    this.startHistoryCleanup();
    logger.info('📚 [HistoryManager] Optimized history manager initialized');
  }

  // ===== CORE HISTORY OPERATIONS =====

  /**
   * Obter histórico relevante com compressão inteligente
   * FOCO: Manter dados críticos, comprime redundâncias
   */
  async getRelevantHistory(
    clientPhone: string, 
    tenantId: string,
    maxMessages?: number
  ): Promise<EnhancedMessageHistoryItem[]> {
    const startTime = Date.now();
    const cacheKey = `${tenantId}_${clientPhone}`;
    
    try {
      // Verificar cache primeiro
      const cached = this.historyCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp.getTime() < cached.ttl) {
        logger.debug('🚄 [HistoryManager] Cache hit for history', { cacheKey });
        return cached.messages;
      }
      
      // Buscar mensagens do Firebase
      const rawMessages = await this.fetchRawMessages(clientPhone, tenantId, maxMessages);
      
      if (rawMessages.length === 0) {
        return [];
      }
      
      // Analisar relevância de cada mensagem
      const relevanceScores = await this.analyzeMessageRelevance(rawMessages);
      
      // Aplicar compressão inteligente
      const compressedMessages = this.applyIntelligentCompression(
        rawMessages, 
        relevanceScores,
        maxMessages || this.compressionConfig.maxMessages
      );
      
      // Armazenar no cache
      this.historyCache.set(cacheKey, {
        messages: compressedMessages,
        timestamp: new Date(),
        ttl: 5 * 60 * 1000 // 5 minutos
      });
      
      const processingTime = Date.now() - startTime;
      
      logger.info('📚 [HistoryManager] History retrieved and compressed', {
        clientPhone: this.maskPhone(clientPhone),
        originalCount: rawMessages.length,
        compressedCount: compressedMessages.length,
        compressionRatio: compressedMessages.length / rawMessages.length,
        processingTime,
        avgRelevanceScore: relevanceScores.reduce((sum, score) => sum + score.relevanceScore, 0) / relevanceScores.length
      });
      
      return compressedMessages;
      
    } catch (error) {
      logger.error('❌ [HistoryManager] Error getting relevant history', { 
        error, 
        clientPhone: this.maskPhone(clientPhone) 
      });
      return [];
    }
  }

  /**
   * Buscar mensagens brutas do Firebase
   */
  private async fetchRawMessages(
    clientPhone: string, 
    tenantId: string,
    maxMessages?: number
  ): Promise<EnhancedMessageHistoryItem[]> {
    const conversationId = `${tenantId}_${clientPhone}`;
    
    const q = query(
      collection(db, this.MESSAGES_COLLECTION),
      where('conversationId', '==', conversationId),
      orderBy('timestamp', 'desc'),
      limit(maxMessages || (this.compressionConfig.maxMessages * 2)) // Buscar mais para comprimir
    );

    const querySnapshot = await getDocs(q);
    const messages: EnhancedMessageHistoryItem[] = [];
    
    querySnapshot.forEach((doc) => {
      messages.push({
        id: doc.id,
        ...doc.data()
      } as EnhancedMessageHistoryItem);
    });

    // Reverter para ordem cronológica
    return messages.reverse();
  }

  /**
   * Analisar relevância de cada mensagem
   * ALGORITMO: Combina keywords, dados extraídos, sinais de compra, recência
   */
  private async analyzeMessageRelevance(
    messages: EnhancedMessageHistoryItem[]
  ): Promise<MessageRelevanceScore[]> {
    const now = Date.now();
    
    return messages.map(message => {
      let relevanceScore = 0;
      const keywords: string[] = [];
      
      // 1. BOOST POR DADOS EXTRAÍDOS (peso alto)
      const criticalDataExtracted = this.hasCriticalDataExtracted(message);
      if (criticalDataExtracted) {
        relevanceScore += 40;
      }
      
      // 2. BOOST POR KEYWORDS CRÍTICAS
      const keywordBoosts = this.analyzeKeywords(message.content);
      relevanceScore += keywordBoosts.totalScore;
      keywords.push(...keywordBoosts.foundKeywords);
      
      // 3. BOOST POR BUYING SIGNALS
      const buyingSignalStrength = this.analyzeBuyingSignals(message);
      const signalBoost = {
        'none': 0,
        'weak': 10,
        'medium': 20,
        'strong': 30
      };
      relevanceScore += signalBoost[buyingSignalStrength];
      
      // 4. BOOST POR RECÊNCIA (últimas 2 horas = boost completo)
      const messageAge = now - message.timestamp.toMillis();
      const recencyHours = messageAge / (1000 * 60 * 60);
      const recency = Math.max(0, 1 - (recencyHours / this.compressionConfig.recencyWindow));
      relevanceScore += recency * 20;
      
      // 5. BOOST POR ENGAGEMENT DO USUÁRIO
      const userEngagement = this.calculateUserEngagement(message);
      relevanceScore += userEngagement * 15;
      
      // 6. BOOST POR FUNÇÃO CALLS (indica ação importante)
      if (message.functionCalls && message.functionCalls.length > 0) {
        relevanceScore += 25;
      }
      
      // 7. BOOST POR EVENTOS DE CONVERSÃO
      if (message.conversionEvent) {
        relevanceScore += 35;
      }
      
      // 8. PENALIDADE POR MENSAGENS MUITO CURTAS (provavelmente não importantes)
      if (message.content.length < 10) {
        relevanceScore -= 10;
      }
      
      return {
        messageId: message.id,
        relevanceScore: Math.min(100, Math.max(0, relevanceScore)),
        criticalDataExtracted,
        buyingSignalStrength,
        keywords,
        recency,
        userEngagement
      };
    });
  }

  /**
   * Verificar se mensagem tem dados críticos extraídos
   */
  private hasCriticalDataExtracted(message: EnhancedMessageHistoryItem): boolean {
    if (!message.dataExtracted) return false;
    
    const criticalFields = ['guests', 'dates', 'location', 'budget', 'propertyIds'];
    return criticalFields.some(field => 
      message.dataExtracted[field] !== undefined && 
      message.dataExtracted[field] !== null
    );
  }

  /**
   * Analisar keywords no conteúdo da mensagem
   */
  private analyzeKeywords(content: string): { totalScore: number; foundKeywords: string[] } {
    const lowerContent = content.toLowerCase();
    let totalScore = 0;
    const foundKeywords: string[] = [];
    
    // Analisar cada categoria de keywords
    Object.entries(this.CRITICAL_KEYWORDS).forEach(([category, keywords]) => {
      const categoryWeight = {
        CLIENT_DATA: 15,
        REQUIREMENTS: 20,
        DATES: 20,
        LOCATION: 10,
        PRICING: 15,
        INTEREST: 25,
        OBJECTIONS: 10,
        CONVERSION: 30
      };
      
      keywords.forEach(keyword => {
        if (lowerContent.includes(keyword)) {
          totalScore += categoryWeight[category] || 10;
          foundKeywords.push(keyword);
        }
      });
    });
    
    return { totalScore: Math.min(50, totalScore), foundKeywords };
  }

  /**
   * Analisar sinais de compra na mensagem
   */
  private analyzeBuyingSignals(message: EnhancedMessageHistoryItem): 'none' | 'weak' | 'medium' | 'strong' {
    // Se já tem buying signals analisados
    if (message.buyingSignals && message.buyingSignals.length > 0) {
      return message.buyingSignals.length >= 3 ? 'strong' : 
             message.buyingSignals.length >= 2 ? 'medium' : 'weak';
    }
    
    const content = message.content.toLowerCase();
    
    // Sinais fortes
    const strongSignals = [
      'quero reservar', 'vou fechar', 'aceito', 'confirmo', 'pode agendar',
      'vou pegar', 'fechado', 'combinado'
    ];
    
    // Sinais médios
    const mediumSignals = [
      'interessante', 'gostei', 'me interessa', 'vou pensar',
      'quero ver', 'pode mostrar', 'quando posso'
    ];
    
    // Sinais fracos
    const weakSignals = [
      'talvez', 'possível', 'vou avaliar', 'depois vejo'
    ];
    
    if (strongSignals.some(signal => content.includes(signal))) return 'strong';
    if (mediumSignals.some(signal => content.includes(signal))) return 'medium';
    if (weakSignals.some(signal => content.includes(signal))) return 'weak';
    
    return 'none';
  }

  /**
   * Calcular engagement do usuário baseado na mensagem
   */
  private calculateUserEngagement(message: EnhancedMessageHistoryItem): number {
    let engagement = 0;
    
    // Mensagem longa = maior engagement
    if (message.content.length > 50) engagement += 0.3;
    if (message.content.length > 100) engagement += 0.2;
    
    // Perguntas = maior engagement
    if (message.content.includes('?')) engagement += 0.2;
    
    // Múltiplas sentenças = maior engagement
    const sentences = message.content.split(/[.!?]/).filter(s => s.trim().length > 0);
    if (sentences.length > 1) engagement += 0.3;
    
    // Engagement level pré-analisado
    if (message.engagementLevel) {
      const levelBoost = {
        'low': 0,
        'medium': 0.5,
        'high': 1.0
      };
      engagement += levelBoost[message.engagementLevel];
    }
    
    return Math.min(1, engagement);
  }

  /**
   * Aplicar compressão inteligente baseada nos scores de relevância
   */
  private applyIntelligentCompression(
    messages: EnhancedMessageHistoryItem[],
    relevanceScores: MessageRelevanceScore[],
    maxMessages: number
  ): EnhancedMessageHistoryItem[] {
    if (messages.length <= maxMessages) {
      return messages; // Não precisa comprimir
    }
    
    // Combinar mensagens com seus scores
    const messagesWithScores = messages.map((message, index) => ({
      message,
      score: relevanceScores[index]
    }));
    
    // ESTRATÉGIA DE COMPRESSÃO:
    
    // 1. SEMPRE manter últimas N mensagens (janela de recência)
    const recentCount = Math.min(10, Math.floor(maxMessages * 0.4));
    const recentMessages = messagesWithScores.slice(-recentCount);
    
    // 2. Selecionar mensagens críticas do histórico mais antigo
    const olderMessages = messagesWithScores.slice(0, -recentCount);
    const criticalOlderMessages = olderMessages
      .filter(item => item.score.relevanceScore >= this.compressionConfig.criticalMessageThreshold)
      .sort((a, b) => b.score.relevanceScore - a.score.relevanceScore) // Ordenar por relevância
      .slice(0, maxMessages - recentCount); // Pegar só o que cabe
    
    // 3. Combinar mensagens selecionadas
    const selectedMessages = [...criticalOlderMessages, ...recentMessages];
    
    // 4. Ordenar cronologicamente
    selectedMessages.sort((a, b) => 
      a.message.timestamp.toMillis() - b.message.timestamp.toMillis()
    );
    
    logger.debug('🗜️ [HistoryManager] Compression applied', {
      original: messages.length,
      compressed: selectedMessages.length,
      recent: recentCount,
      critical: criticalOlderMessages.length,
      avgScoreKept: selectedMessages.reduce((sum, item) => sum + item.score.relevanceScore, 0) / selectedMessages.length
    });
    
    return selectedMessages.map(item => item.message);
  }

  // ===== HISTORY ANALYTICS =====

  /**
   * Gerar analytics do histórico de mensagens
   */
  async generateHistoryAnalytics(
    clientPhone: string,
    tenantId: string
  ): Promise<HistoryAnalytics> {
    const startTime = Date.now();
    
    try {
      const rawMessages = await this.fetchRawMessages(clientPhone, tenantId);
      const relevanceScores = await this.analyzeMessageRelevance(rawMessages);
      const compressedMessages = this.applyIntelligentCompression(
        rawMessages, 
        relevanceScores,
        this.compressionConfig.maxMessages
      );
      
      const criticalDataPreserved = compressedMessages.filter(msg => 
        this.hasCriticalDataExtracted(msg)
      ).length / Math.max(1, rawMessages.filter(msg => 
        this.hasCriticalDataExtracted(msg)
      ).length);
      
      const analytics: HistoryAnalytics = {
        totalMessages: rawMessages.length,
        compressedMessages: compressedMessages.length,
        compressionRatio: compressedMessages.length / Math.max(1, rawMessages.length),
        criticalDataPreserved: criticalDataPreserved * 100,
        averageRelevanceScore: relevanceScores.reduce((sum, score) => sum + score.relevanceScore, 0) / Math.max(1, relevanceScores.length),
        processingTime: Date.now() - startTime,
        memoryUsage: this.calculateMemoryUsage(compressedMessages)
      };
      
      logger.info('📊 [HistoryManager] Analytics generated', {
        clientPhone: this.maskPhone(clientPhone),
        analytics
      });
      
      return analytics;
      
    } catch (error) {
      logger.error('❌ [HistoryManager] Error generating analytics', { error });
      return {
        totalMessages: 0,
        compressedMessages: 0,
        compressionRatio: 0,
        criticalDataPreserved: 0,
        averageRelevanceScore: 0,
        processingTime: Date.now() - startTime,
        memoryUsage: 0
      };
    }
  }

  /**
   * Calcular uso de memória do histórico comprimido
   */
  private calculateMemoryUsage(messages: EnhancedMessageHistoryItem[]): number {
    const totalSize = messages.reduce((size, message) => {
      return size + JSON.stringify(message).length;
    }, 0);
    
    return totalSize / 1024; // KB
  }

  // ===== CACHE MANAGEMENT =====

  /**
   * Invalidar cache de histórico
   */
  invalidateHistoryCache(clientPhone: string, tenantId: string): void {
    const cacheKey = `${tenantId}_${clientPhone}`;
    this.historyCache.delete(cacheKey);
    
    logger.debug('🗑️ [HistoryManager] History cache invalidated', { cacheKey });
  }

  /**
   * Cleanup automático do cache
   */
  private startHistoryCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      let cleanedCount = 0;
      
      for (const [key, cached] of this.historyCache) {
        if (now - cached.timestamp.getTime() > cached.ttl) {
          this.historyCache.delete(key);
          cleanedCount++;
        }
      }
      
      if (cleanedCount > 0) {
        logger.debug('🧹 [HistoryManager] Cache cleanup completed', {
          cleanedEntries: cleanedCount,
          remainingEntries: this.historyCache.size
        });
      }
    }, 5 * 60 * 1000); // A cada 5 minutos
  }

  // ===== UTILITY METHODS =====

  /**
   * Obter estatísticas do cache
   */
  getCacheStats() {
    const cacheEntries = Array.from(this.historyCache.values());
    const totalMemory = cacheEntries.reduce((sum, entry) => {
      return sum + JSON.stringify(entry.messages).length;
    }, 0);
    
    return {
      entries: this.historyCache.size,
      memoryUsage: totalMemory / 1024, // KB
      avgMessagesPerEntry: cacheEntries.length > 0 ? 
        cacheEntries.reduce((sum, entry) => sum + entry.messages.length, 0) / cacheEntries.length : 0
    };
  }

  /**
   * Forçar limpeza completa do cache
   */
  clearCache(): void {
    this.historyCache.clear();
    logger.info('🧹 [HistoryManager] Cache cleared completely');
  }

  /**
   * Mascarar telefone para logs
   */
  private maskPhone(phone: string): string {
    if (phone.length <= 4) return phone;
    return phone.substring(0, 2) + '***' + phone.substring(phone.length - 2);
  }

  // ===== PUBLIC CONVENIENCE METHODS =====

  /**
   * Verificar se histórico tem dados críticos
   */
  async hasCriticalDataInHistory(clientPhone: string, tenantId: string): Promise<boolean> {
    const messages = await this.getRelevantHistory(clientPhone, tenantId, 20);
    return messages.some(message => this.hasCriticalDataExtracted(message));
  }

  /**
   * Obter última mensagem com dados críticos
   */
  async getLastMessageWithData(clientPhone: string, tenantId: string): Promise<EnhancedMessageHistoryItem | null> {
    const messages = await this.getRelevantHistory(clientPhone, tenantId, 50);
    
    // Buscar a última mensagem com dados extraídos
    for (let i = messages.length - 1; i >= 0; i--) {
      if (this.hasCriticalDataExtracted(messages[i])) {
        return messages[i];
      }
    }
    
    return null;
  }

  /**
   * Obter resumo do histórico de conversas
   */
  async getConversationSummary(clientPhone: string, tenantId: string): Promise<{
    totalMessages: number;
    criticalDataPoints: number;
    buyingSignalsCount: number;
    lastActivity: Date;
    conversationStage: string;
  }> {
    const messages = await this.getRelevantHistory(clientPhone, tenantId);
    const relevanceScores = await this.analyzeMessageRelevance(messages);
    
    const criticalDataPoints = messages.filter(msg => this.hasCriticalDataExtracted(msg)).length;
    const buyingSignalsCount = relevanceScores.filter(score => score.buyingSignalStrength !== 'none').length;
    
    return {
      totalMessages: messages.length,
      criticalDataPoints,
      buyingSignalsCount,
      lastActivity: messages.length > 0 ? messages[messages.length - 1].timestamp.toDate() : new Date(),
      conversationStage: messages.length > 0 ? 'active' : 'inactive'
    };
  }
}

// Export singleton instance
export const optimizedHistoryManager = new OptimizedHistoryManager();