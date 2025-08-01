// lib/services/conversation-context-service-v2.ts
// CONVERSATION CONTEXT SERVICE V2 - STEP 1 IMPLEMENTATION
// Service refatorado com merge inteligente e sistema de memória avançado

import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  getDocs,
  Timestamp,
  serverTimestamp,
  writeBatch,
  runTransaction
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { 
  EnhancedConversationContext,
  EnhancedMessageHistoryItem,
  ContextUpdate,
  AtomicContextUpdate,
  ContextValidation,
  createEmptyEnhancedContext,
  isEnhancedConversationContext,
  CONTEXT_CONSTANTS
} from '@/lib/types/context-types-enhanced';
import { advancedMemoryEngine } from './advanced-memory-engine';
import { logger } from '@/lib/utils/logger';

// ===== ENHANCED CONVERSATION CONTEXT SERVICE =====

export class ConversationContextServiceV2 {
  private readonly COLLECTION_NAME = 'conversation_contexts_v2';
  private readonly MESSAGES_COLLECTION = 'conversation_messages_v2';
  private readonly CONTEXT_TTL_HOURS = 24; // 24 horas - muito superior ao anterior (1h)
  
  constructor() {
    logger.info('🚀 [ContextServiceV2] Initialized with advanced memory engine');
  }

  // ===== CONTEXT OPERATIONS WITH MEMORY ENGINE =====

  /**
   * Obter ou criar contexto usando o sistema de memória avançado
   * PROBLEMA RESOLVIDO: Zero perda de dados críticos (guests, checkIn, checkOut)
   */
  async getOrCreateContext(
    clientPhone: string, 
    tenantId: string
  ): Promise<EnhancedConversationContext> {
    try {
      logger.debug('📊 [ContextServiceV2] Getting context via memory engine', { 
        clientPhone: this.maskPhone(clientPhone), 
        tenantId 
      });

      // Usar o sistema de memória avançado (L1 → L2 → L3)
      const context = await advancedMemoryEngine.getContextWithCache(clientPhone, tenantId);
      
      // Verificar se o contexto ainda está ativo (TTL)
      const contextAge = Date.now() - context.metadata.lastActivity.getTime();
      const ttlMs = this.CONTEXT_TTL_HOURS * 60 * 60 * 1000;
      
      if (contextAge < ttlMs) {
        logger.info('✅ [ContextServiceV2] Active context retrieved', {
          clientPhone: this.maskPhone(clientPhone),
          age: Math.round(contextAge / (1000 * 60)), // minutes
          stage: context.conversationState.stage,
          leadScore: context.salesContext.leadScore,
          criticalData: {
            guests: context.clientData.guests,
            checkIn: context.clientData.checkIn,
            checkOut: context.clientData.checkOut,
            city: context.clientData.city
          }
        });
        return context;
      } else {
        logger.info('⏰ [ContextServiceV2] Context expired, creating new', {
          clientPhone: this.maskPhone(clientPhone),
          ageHours: Math.round(contextAge / (1000 * 60 * 60))
        });
        return await this.createNewEnhancedContext(clientPhone, tenantId);
      }
      
    } catch (error) {
      logger.error('❌ [ContextServiceV2] Error getting/creating context', { 
        error, 
        clientPhone: this.maskPhone(clientPhone) 
      });
      // Fallback: retornar contexto padrão
      return createEmptyEnhancedContext(clientPhone, tenantId);
    }
  }

  /**
   * Atualizar contexto com merge inteligente atômico
   * PROBLEMA RESOLVIDO: updateDoc não sobrescreve mais - faz merge field-by-field
   */
  async updateContext(
    clientPhone: string,
    tenantId: string,
    updates: Partial<EnhancedConversationContext>
  ): Promise<void> {
    try {
      logger.debug('🔄 [ContextServiceV2] Starting atomic context update', {
        clientPhone: this.maskPhone(clientPhone),
        updateFields: Object.keys(updates)
      });

      // 1. Obter contexto atual via memory engine
      const currentContext = await advancedMemoryEngine.getContextWithCache(clientPhone, tenantId);
      
      // 2. Realizar merge inteligente preservando dados críticos
      const mergedContext = await this.performIntelligentMerge(currentContext, updates);
      
      // 3. Validar contexto merged
      const validation = this.validateContextUpdate(mergedContext);
      if (!validation.isValid) {
        logger.error('❌ [ContextServiceV2] Context validation failed', {
          clientPhone: this.maskPhone(clientPhone),
          errors: validation.errors
        });
        return;
      }
      
      // 4. Salvar usando o memory engine (L1 imediato, L2/L3 async)
      await advancedMemoryEngine.saveContextOptimized(mergedContext);
      
      logger.info('✅ [ContextServiceV2] Context updated successfully', {
        clientPhone: this.maskPhone(clientPhone),
        updatedFields: Object.keys(updates),
        criticalData: {
          guests: mergedContext.clientData.guests,
          checkIn: mergedContext.clientData.checkIn,
          checkOut: mergedContext.clientData.checkOut,
          stage: mergedContext.conversationState.stage
        }
      });
      
    } catch (error) {
      logger.error('❌ [ContextServiceV2] Error updating context', { 
        error, 
        clientPhone: this.maskPhone(clientPhone),
        updates: Object.keys(updates)
      });
      throw error;
    }
  }

  /**
   * Merge inteligente que preserva dados críticos
   * ESTRATÉGIA: Deep merge com proteção de campos críticos
   */
  private async performIntelligentMerge(
    currentContext: EnhancedConversationContext,
    updates: Partial<EnhancedConversationContext>
  ): Promise<EnhancedConversationContext> {
    
    // Criar cópia profunda do contexto atual
    const mergedContext = JSON.parse(JSON.stringify(currentContext));
    
    // Merge clientData com proteção de campos críticos
    if (updates.clientData) {
      mergedContext.clientData = {
        ...mergedContext.clientData,
        ...updates.clientData
      };
      
      // PROTEÇÃO CRÍTICA: Não permitir que campos importantes sejam undefined
      CONTEXT_CONSTANTS.CRITICAL_FIELDS.forEach(field => {
        const fieldPath = field.split('.');
        const currentValue = this.getNestedValue(currentContext, fieldPath);
        const newValue = this.getNestedValue(updates, fieldPath);
        
        // Se o valor atual existe e o novo é undefined, manter o atual
        if (currentValue !== undefined && newValue === undefined) {
          this.setNestedValue(mergedContext, fieldPath, currentValue);
          logger.debug('🛡️ [ContextServiceV2] Protected critical field', {
            field,
            preservedValue: currentValue
          });
        }
      });
    }
    
    // Merge conversationState
    if (updates.conversationState) {
      mergedContext.conversationState = {
        ...mergedContext.conversationState,
        ...updates.conversationState
      };
      
      // Adicionar ao message flow se mudou de stage
      if (updates.conversationState.stage && 
          updates.conversationState.stage !== currentContext.conversationState.stage) {
        mergedContext.conversationState.messageFlow.push({
          step: mergedContext.conversationState.messageFlow.length + 1,
          stage: updates.conversationState.stage,
          userMessage: '',
          assistantAction: updates.conversationState.lastAction || 'stage_change',
          timestamp: new Date(),
          duration: 0,
          success: true
        });
      }
    }
    
    // Merge salesContext
    if (updates.salesContext) {
      mergedContext.salesContext = {
        ...mergedContext.salesContext,
        ...updates.salesContext
      };
      
      // Recalcular lead score se necessário
      if (updates.salesContext.temperature || updates.salesContext.conversionProbability) {
        mergedContext.salesContext.leadScore = this.calculateLeadScore(mergedContext.salesContext);
      }
    }
    
    // Merge pendingReservation
    if (updates.pendingReservation) {
      mergedContext.pendingReservation = {
        ...mergedContext.pendingReservation,
        ...updates.pendingReservation
      };
    }
    
    // Update metadata
    mergedContext.metadata = {
      ...mergedContext.metadata,
      lastActivity: new Date(),
      contextUpdates: mergedContext.metadata.contextUpdates + 1
    };
    
    return mergedContext;
  }
  
  /**
   * Atualização atômica usando transação Firebase
   * Para operações críticas que precisam ser 100% consistentes
   */
  async updateContextAtomic(
    clientPhone: string,
    tenantId: string,
    updates: ContextUpdate[]
  ): Promise<AtomicContextUpdate> {
    const transactionId = this.generateTransactionId();
    
    try {
      logger.debug('⚛️ [ContextServiceV2] Starting atomic transaction', {
        transactionId,
        clientPhone: this.maskPhone(clientPhone),
        updateCount: updates.length
      });

      const conversationId = this.generateConversationId(clientPhone, tenantId);
      const docRef = doc(db, this.COLLECTION_NAME, conversationId);
      
      const result = await runTransaction(db, async (transaction) => {
        // 1. Read current context
        const docSnap = await transaction.get(docRef);
        const currentContext = docSnap.exists() ? 
          docSnap.data() as EnhancedConversationContext :
          createEmptyEnhancedContext(clientPhone, tenantId);
        
        // 2. Apply updates
        const updatedContext = { ...currentContext };
        const rollbackData = {};
        
        for (const update of updates) {
          const fieldPath = update.field.split('.');
          const oldValue = this.getNestedValue(updatedContext, fieldPath);
          
          // Store rollback data
          this.setNestedValue(rollbackData, fieldPath, oldValue);
          
          // Apply update
          this.setNestedValue(updatedContext, fieldPath, update.newValue);
        }
        
        // 3. Validate updated context
        const validation = this.validateContextUpdate(updatedContext);
        if (!validation.isValid) {
          throw new Error(`Validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
        }
        
        // 4. Update metadata
        updatedContext.metadata.lastActivity = new Date();
        updatedContext.metadata.contextUpdates++;
        
        // 5. Write to Firebase
        transaction.set(docRef, updatedContext, { merge: true });
        
        return { updatedContext, rollbackData };
      });
      
      // Update memory engine cache
      await advancedMemoryEngine.saveContextOptimized(result.updatedContext);
      
      const atomicUpdate: AtomicContextUpdate = {
        updates,
        transactionId,
        timestamp: new Date(),
        success: true,
        rollbackData: result.rollbackData
      };
      
      logger.info('✅ [ContextServiceV2] Atomic update completed', {
        transactionId,
        clientPhone: this.maskPhone(clientPhone),
        updateCount: updates.length
      });
      
      return atomicUpdate;
      
    } catch (error) {
      logger.error('❌ [ContextServiceV2] Atomic update failed', {
        error,
        transactionId,
        clientPhone: this.maskPhone(clientPhone)
      });
      
      return {
        updates,
        transactionId,
        timestamp: new Date(),
        success: false,
        validationErrors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  /**
   * Salvar mensagem no histórico com dados enriquecidos
   * MELHORADO: Mais metadados para análise
   */
  async saveMessage(
    clientPhone: string,
    tenantId: string,
    message: {
      role: 'user' | 'assistant';
      content: string;
      intent?: string;
      confidence?: number;
      tokensUsed?: number;
      responseTime?: number;
      functionCalls?: string[];
      dataExtracted?: any;
      engagementLevel?: 'low' | 'medium' | 'high';
      buyingSignals?: string[];
    }
  ): Promise<void> {
    try {
      const conversationId = this.generateConversationId(clientPhone, tenantId);
      
      const enhancedMessage: Omit<EnhancedMessageHistoryItem, 'id'> = {
        conversationId,
        role: message.role,
        content: message.content,
        timestamp: Timestamp.now(),
        
        // Enhanced fields
        intent: message.intent,
        confidence: message.confidence,
        tokensUsed: message.tokensUsed,
        responseTime: message.responseTime,
        functionCalls: message.functionCalls,
        dataExtracted: message.dataExtracted,
        engagementLevel: message.engagementLevel,
        buyingSignals: message.buyingSignals,
        
        // Technical metrics
        processingTime: message.responseTime,
        errorOccurred: false,
        retryCount: 0
      };

      // Salvar mensagem
      await setDoc(
        doc(collection(db, this.MESSAGES_COLLECTION)), 
        enhancedMessage
      );

      // Atualizar contador de mensagens no contexto
      await this.updateMessageCount(clientPhone, tenantId, message.role, message.content);
      
      logger.debug('💬 [ContextServiceV2] Enhanced message saved', {
        role: message.role,
        contentLength: message.content.length,
        tokensUsed: message.tokensUsed,
        hasDataExtracted: !!message.dataExtracted
      });
      
    } catch (error) {
      logger.error('❌ [ContextServiceV2] Error saving message', { error });
      // Não falhar se não conseguir salvar mensagem
    }
  }

  /**
   * Obter histórico de mensagens otimizado
   * MELHORADO: Histórico inteligente com compressão
   */
  async getMessageHistory(
    clientPhone: string,
    tenantId: string,
    limitMessages: number = CONTEXT_CONSTANTS.MAX_MESSAGE_HISTORY
  ): Promise<EnhancedMessageHistoryItem[]> {
    try {
      const conversationId = this.generateConversationId(clientPhone, tenantId);
      
      // Query otimizada
      const q = query(
        collection(db, this.MESSAGES_COLLECTION),
        where('conversationId', '==', conversationId),
        orderBy('timestamp', 'desc'),
        limit(limitMessages)
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
      messages.reverse();
      
      // Aplicar compressão inteligente se necessário
      const compressedMessages = this.compressMessageHistory(messages);
      
      logger.debug('📜 [ContextServiceV2] Message history retrieved', {
        originalCount: messages.length,
        compressedCount: compressedMessages.length,
        compressionRatio: compressedMessages.length / messages.length
      });
      
      return compressedMessages;
      
    } catch (error) {
      logger.error('❌ [ContextServiceV2] Error getting message history', { error });
      // Retornar array vazio em caso de erro para não quebrar fluxo
      return [];
    }
  }

  /**
   * Compressão inteligente do histórico de mensagens
   * Mantém mensagens críticas, comprime mensagens redundantes
   */
  private compressMessageHistory(messages: EnhancedMessageHistoryItem[]): EnhancedMessageHistoryItem[] {
    if (messages.length <= 20) return messages; // Não comprimir se já é pequeno
    
    const criticalKeywords = [
      'guests', 'pessoas', 'hóspedes',
      'check-in', 'checkout', 'data', 'quando',
      'preço', 'valor', 'custa',
      'reservar', 'confirmar', 'fechar',
      'visitar', 'conhecer', 'ver',
      'cpf', 'nome', 'documento'
    ];
    
    const compressed = [];
    
    // Sempre manter últimas 10 mensagens
    const recentMessages = messages.slice(-10);
    const olderMessages = messages.slice(0, -10);
    
    // Filtrar mensagens antigas por relevância
    const relevantOlderMessages = olderMessages.filter(msg => {
      // Manter se tem dados extraídos
      if (msg.dataExtracted && Object.keys(msg.dataExtracted).length > 0) return true;
      
      // Manter se tem keywords críticas
      const hasKeywords = criticalKeywords.some(keyword => 
        msg.content.toLowerCase().includes(keyword)
      );
      if (hasKeywords) return true;
      
      // Manter se tem buying signals
      if (msg.buyingSignals && msg.buyingSignals.length > 0) return true;
      
      // Manter se é um evento de conversão
      if (msg.conversionEvent) return true;
      
      return false;
    });
    
    compressed.push(...relevantOlderMessages, ...recentMessages);
    
    return compressed;
  }

  // ===== HELPER METHODS =====

  private async createNewEnhancedContext(
    clientPhone: string, 
    tenantId: string
  ): Promise<EnhancedConversationContext> {
    const newContext = createEmptyEnhancedContext(clientPhone, tenantId);
    
    // Salvar via memory engine
    await advancedMemoryEngine.saveContextOptimized(newContext);
    
    logger.info('🆕 [ContextServiceV2] New enhanced context created', {
      clientPhone: this.maskPhone(clientPhone),
      contextId: newContext.metadata.conversationId
    });
    
    return newContext;
  }

  private async updateMessageCount(
    clientPhone: string,
    tenantId: string,
    role: 'user' | 'assistant',
    content: string
  ): Promise<void> {
    try {
      const currentContext = await advancedMemoryEngine.getContextWithCache(clientPhone, tenantId);
      
      const updates: Partial<EnhancedConversationContext> = {
        metadata: {
          ...currentContext.metadata,
          messageCount: role === 'user' ? currentContext.metadata.messageCount + 1 : currentContext.metadata.messageCount,
          lastActivity: new Date()
        }
      };
      
      await this.updateContext(clientPhone, tenantId, updates);
      
    } catch (error) {
      logger.error('❌ [ContextServiceV2] Error updating message count', { error });
    }
  }

  private validateContextUpdate(context: EnhancedConversationContext): ContextValidation {
    const errors = [];
    const warnings = [];
    
    // Validações críticas
    if (!context.clientData.phone) {
      errors.push({
        field: 'clientData.phone',
        message: 'Phone is required',
        severity: 'critical' as const,
        suggestion: 'Ensure phone is provided'
      });
    }
    
    if (!context.clientData.tenantId) {
      errors.push({
        field: 'clientData.tenantId',
        message: 'TenantId is required',
        severity: 'critical' as const,
        suggestion: 'Ensure tenantId is provided'
      });
    }
    
    // Validação de datas
    if (context.clientData.checkIn && context.clientData.checkOut) {
      const checkIn = new Date(context.clientData.checkIn);
      const checkOut = new Date(context.clientData.checkOut);
      
      if (checkIn >= checkOut) {
        errors.push({
          field: 'clientData.dates',
          message: 'Check-in must be before check-out',
          severity: 'high' as const,
          suggestion: 'Validate date order'
        });
      }
      
      if (checkIn < new Date()) {
        warnings.push({
          field: 'clientData.checkIn',
          message: 'Check-in date is in the past',
          impact: 'user_experience' as const,
          suggestion: 'Consider updating to future date'
        });
      }
    }
    
    // Validação de guests
    if (context.clientData.guests && context.clientData.guests <= 0) {
      errors.push({
        field: 'clientData.guests',
        message: 'Guest count must be positive',
        severity: 'medium' as const,
        suggestion: 'Ensure valid guest count'
      });
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      completeness: this.calculateCompleteness(context),
      consistency: this.calculateConsistency(context),
      freshness: this.calculateFreshness(context)
    };
  }

  private calculateCompleteness(context: EnhancedConversationContext): number {
    const fields = [
      context.clientData.name,
      context.clientData.guests,
      context.clientData.checkIn,
      context.clientData.checkOut,
      context.clientData.city
    ];
    
    const completedFields = fields.filter(f => f !== undefined).length;
    return completedFields / fields.length;
  }

  private calculateConsistency(context: EnhancedConversationContext): number {
    let score = 1.0;
    
    // Check date consistency
    if (context.clientData.checkIn && context.clientData.checkOut) {
      const checkIn = new Date(context.clientData.checkIn);
      const checkOut = new Date(context.clientData.checkOut);
      if (checkIn >= checkOut) score -= 0.3;
    }
    
    return Math.max(0, score);
  }

  private calculateFreshness(context: EnhancedConversationContext): number {
    const age = Date.now() - context.metadata.lastActivity.getTime();
    const maxAge = this.CONTEXT_TTL_HOURS * 60 * 60 * 1000;
    return Math.max(0, 1 - (age / maxAge));
  }

  private calculateLeadScore(salesContext: any): number {
    let score = 50; // Base score
    
    // Temperature boost
    const temperatureBoost = {
      cold: -10,
      warm: 0,
      hot: +20,
      burning: +30
    };
    score += temperatureBoost[salesContext.temperature] || 0;
    
    // Conversion probability boost
    score += (salesContext.conversionProbability || 0) * 50;
    
    // Buying signals boost
    score += (salesContext.buyingSignals?.length || 0) * 5;
    
    // Objections penalty
    score -= (salesContext.objections?.filter(o => !o.resolved).length || 0) * 10;
    
    return Math.max(0, Math.min(100, score));
  }

  // ===== UTILITY METHODS =====

  private generateConversationId(clientPhone: string, tenantId: string): string {
    return `${tenantId}_${clientPhone}`;
  }

  private generateTransactionId(): string {
    return `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private maskPhone(phone: string): string {
    if (phone.length <= 4) return phone;
    return phone.substring(0, 2) + '***' + phone.substring(phone.length - 2);
  }

  private getNestedValue(obj: any, path: string[]): any {
    return path.reduce((current, key) => current?.[key], obj);
  }

  private setNestedValue(obj: any, path: string[], value: any): void {
    const lastKey = path.pop()!;
    const target = path.reduce((current, key) => {
      if (!current[key]) current[key] = {};
      return current[key];
    }, obj);
    target[lastKey] = value;
  }

  // ===== PUBLIC CONVENIENCE METHODS =====

  /**
   * Marcar conversa como concluída
   */
  async markConversationCompleted(clientPhone: string, tenantId: string): Promise<void> {
    await this.updateContext(clientPhone, tenantId, {
      conversationState: {
        stage: 'closing'
      } as any,
      metadata: {
        lastActivity: new Date()
      } as any
    });
    
    logger.info('✅ [ContextServiceV2] Conversation marked as completed', {
      clientPhone: this.maskPhone(clientPhone)
    });
  }

  /**
   * Incrementar tokens usados
   */
  async incrementTokensUsed(clientPhone: string, tenantId: string, tokens: number): Promise<void> {
    const currentContext = await advancedMemoryEngine.getContextWithCache(clientPhone, tenantId);
    
    await this.updateContext(clientPhone, tenantId, {
      metadata: {
        ...currentContext.metadata,
        tokensUsed: currentContext.metadata.tokensUsed + tokens
      }
    });
  }

  /**
   * Obter métricas do sistema de memória
   */
  getMemoryMetrics() {
    return advancedMemoryEngine.getMetrics();
  }

  /**
   * Limpar cache para testes
   */
  async clearCacheForTesting(): Promise<void> {
    await advancedMemoryEngine.forceCleanup();
  }
}

// Export singleton instance
export const conversationContextServiceV2 = new ConversationContextServiceV2();