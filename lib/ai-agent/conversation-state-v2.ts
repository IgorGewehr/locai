// lib/ai-agent/conversation-state-v2.ts
// Sistema de Estado com LRU Cache - Previne memory leaks

import { logger } from '@/lib/utils/logger';
import { SOFIA_CONFIG } from '@/lib/config/sofia-config';

export interface ConversationState {
  clientPhone: string;
  tenantId: string;
  lastPropertyIds: string[];
  currentPropertyId?: string;
  interestedPropertyId?: string;
  lastPriceCalculation?: {
    propertyId: string;
    checkIn: string;
    checkOut: string;
    totalPrice: number;
    details: any;
  };
  clientInfo?: {
    name?: string;
    email?: string;
    document?: string;
    id?: string;
  };
  conversationPhase: 'searching' | 'viewing_details' | 'calculating_price' | 'booking' | 'visiting';
  lastFunction: string;
  createdAt: Date;
  updatedAt: Date;
  lastAccessed: Date;
}

// Implementação simples de LRU Cache
class LRUCache<K, V> {
  private cache: Map<K, V>;
  private readonly maxSize: number;

  constructor(maxSize: number) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  get(key: K): V | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      // Move para o final (mais recente)
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }

  set(key: K, value: V): void {
    // Remove se já existe para reordenar
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // Remove o mais antigo (primeiro item)
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
      logger.info('🗑️ [LRUCache] Removendo conversa antiga', {
        removedKey: String(firstKey).substring(0, 20) + '...'
      });
    }
    
    this.cache.set(key, value);
  }

  has(key: K): boolean {
    return this.cache.has(key);
  }

  delete(key: K): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }

  // Limpar estados antigos baseado em TTL
  cleanup(ttlMs: number): number {
    const now = Date.now();
    let removed = 0;

    for (const [key, value] of this.cache.entries()) {
      const state = value as any as ConversationState;
      if (state.lastAccessed && (now - state.lastAccessed.getTime()) > ttlMs) {
        this.cache.delete(key);
        removed++;
        logger.info('⏰ [LRUCache] Estado expirado removido', {
          key: String(key).substring(0, 20) + '...',
          ageHours: Math.floor((now - state.lastAccessed.getTime()) / (1000 * 60 * 60))
        });
      }
    }

    return removed;
  }

  getStats(): { size: number; maxSize: number; usage: number } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      usage: (this.cache.size / this.maxSize) * 100
    };
  }
}

class ConversationStateManagerV2 {
  private static cache = new LRUCache<string, ConversationState>(
    SOFIA_CONFIG.context.MAX_CACHED_CONVERSATIONS
  );

  private static getKey(clientPhone: string, tenantId: string): string {
    return `${tenantId}:${clientPhone}`;
  }

  /**
   * Obter ou criar estado da conversa
   */
  static getState(clientPhone: string, tenantId: string): ConversationState {
    const key = this.getKey(clientPhone, tenantId);
    
    let state = this.cache.get(key);
    
    if (!state) {
      state = {
        clientPhone,
        tenantId,
        lastPropertyIds: [],
        conversationPhase: 'searching',
        lastFunction: '',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastAccessed: new Date()
      };
      
      this.cache.set(key, state);
      
      logger.info('🆕 [ConversationStateV2] Novo estado criado', {
        clientPhone: clientPhone.substring(0, 6) + '***',
        tenantId,
        phase: state.conversationPhase,
        cacheStats: this.cache.getStats()
      });
    } else {
      // Atualizar último acesso
      state.lastAccessed = new Date();
    }
    
    return state;
  }

  /**
   * Atualizar estado após busca de propriedades
   */
  static updateAfterSearch(
    clientPhone: string, 
    tenantId: string, 
    propertyIds: string[]
  ): void {
    const state = this.getState(clientPhone, tenantId);
    
    state.lastPropertyIds = propertyIds;
    state.currentPropertyId = propertyIds[0];
    state.conversationPhase = propertyIds.length > 0 ? 'viewing_details' : 'searching';
    state.lastFunction = 'search_properties';
    state.updatedAt = new Date();
    state.lastAccessed = new Date();
    
    logger.info('🔄 [ConversationStateV2] Estado atualizado após busca', {
      clientPhone: clientPhone.substring(0, 6) + '***',
      propertiesFound: propertyIds.length,
      currentPropertyId: state.currentPropertyId?.substring(0, 10) + '...' || 'nenhuma',
      newPhase: state.conversationPhase,
      cacheUsage: `${this.cache.getStats().usage.toFixed(1)}%`
    });
  }

  /**
   * Atualizar propriedade em foco
   */
  static setCurrentProperty(
    clientPhone: string, 
    tenantId: string, 
    propertyId: string,
    isInterested: boolean = false
  ): void {
    const state = this.getState(clientPhone, tenantId);
    
    state.currentPropertyId = propertyId;
    if (isInterested) {
      state.interestedPropertyId = propertyId;
    }
    state.updatedAt = new Date();
    state.lastAccessed = new Date();
    
    logger.info('🎯 [ConversationStateV2] Propriedade em foco atualizada', {
      clientPhone: clientPhone.substring(0, 6) + '***',
      propertyId: propertyId.substring(0, 10) + '...',
      isInterested
    });
  }

  /**
   * Atualizar após cálculo de preço
   */
  static updateAfterPriceCalculation(
    clientPhone: string,
    tenantId: string,
    calculation: {
      propertyId: string;
      checkIn: string;
      checkOut: string;
      totalPrice: number;
      details: any;
    }
  ): void {
    const state = this.getState(clientPhone, tenantId);
    
    state.lastPriceCalculation = calculation;
    state.conversationPhase = 'booking';
    state.lastFunction = 'calculate_price';
    state.updatedAt = new Date();
    state.lastAccessed = new Date();
    
    logger.info('💰 [ConversationStateV2] Preço calculado', {
      clientPhone: clientPhone.substring(0, 6) + '***',
      propertyId: calculation.propertyId.substring(0, 10) + '...',
      totalPrice: calculation.totalPrice
    });
  }

  /**
   * Atualizar informações do cliente
   */
  static updateClientInfo(
    clientPhone: string,
    tenantId: string,
    clientInfo: { name?: string; email?: string; document?: string; id?: string }
  ): void {
    const state = this.getState(clientPhone, tenantId);
    
    state.clientInfo = { ...state.clientInfo, ...clientInfo };
    state.lastFunction = 'register_client';
    state.updatedAt = new Date();
    state.lastAccessed = new Date();
    
    logger.info('👤 [ConversationStateV2] Cliente atualizado', {
      clientPhone: clientPhone.substring(0, 6) + '***',
      hasName: !!state.clientInfo.name,
      hasDocument: !!state.clientInfo.document,
      hasId: !!state.clientInfo.id
    });
  }

  /**
   * Resolver ID da propriedade baseado no contexto
   */
  static resolvePropertyId(
    clientPhone: string,
    tenantId: string,
    hint?: string | number
  ): string | null {
    const state = this.getState(clientPhone, tenantId);
    
    // Se tem hint numérico
    if (typeof hint === 'number' && hint >= 0 && hint < state.lastPropertyIds.length) {
      const resolvedId = state.lastPropertyIds[hint];
      this.setCurrentProperty(clientPhone, tenantId, resolvedId);
      return resolvedId;
    }
    
    // Se tem hint textual
    if (typeof hint === 'string') {
      const lowerHint = hint.toLowerCase();
      if (lowerHint.includes('primeira') || lowerHint.includes('primeiro')) {
        return state.lastPropertyIds[0] || null;
      }
      if (lowerHint.includes('segunda') || lowerHint.includes('segundo')) {
        return state.lastPropertyIds[1] || null;
      }
      if (lowerHint.includes('terceira') || lowerHint.includes('terceiro')) {
        return state.lastPropertyIds[2] || null;
      }
    }
    
    // Fallback: propriedade em foco atual
    if (state.currentPropertyId) {
      return state.currentPropertyId;
    }
    
    // Fallback: primeira propriedade
    if (state.lastPropertyIds.length > 0) {
      return state.lastPropertyIds[0];
    }
    
    return null;
  }

  /**
   * Limpar estado específico
   */
  static clearState(clientPhone: string, tenantId: string): void {
    const key = this.getKey(clientPhone, tenantId);
    this.cache.delete(key);
    
    logger.info('🗑️ [ConversationStateV2] Estado limpo', {
      clientPhone: clientPhone.substring(0, 6) + '***',
      tenantId,
      remainingStates: this.cache.size()
    });
  }

  /**
   * Limpar estados expirados
   */
  static cleanup(): number {
    const ttlMs = SOFIA_CONFIG.context.TTL_HOURS * 60 * 60 * 1000;
    const removed = this.cache.cleanup(ttlMs);
    
    if (removed > 0) {
      logger.info('🧹 [ConversationStateV2] Limpeza periódica', {
        statesRemoved: removed,
        remainingStates: this.cache.size(),
        cacheUsage: `${this.cache.getStats().usage.toFixed(1)}%`
      });
    }
    
    return removed;
  }

  /**
   * Obter estatísticas do cache
   */
  static getCacheStats(): {
    size: number;
    maxSize: number;
    usage: number;
    usagePercent: string;
  } {
    const stats = this.cache.getStats();
    return {
      ...stats,
      usagePercent: `${stats.usage.toFixed(1)}%`
    };
  }

  /**
   * Obter resumo do estado
   */
  static getStateSummary(clientPhone: string, tenantId: string): any {
    const state = this.getState(clientPhone, tenantId);
    
    return {
      phase: state.conversationPhase,
      hasProperties: state.lastPropertyIds.length > 0,
      currentProperty: state.currentPropertyId?.substring(0, 10) + '...' || null,
      interestedProperty: state.interestedPropertyId?.substring(0, 10) + '...' || null,
      hasClient: !!state.clientInfo?.name,
      hasPriceCalculation: !!state.lastPriceCalculation,
      lastFunction: state.lastFunction,
      propertiesCount: state.lastPropertyIds.length,
      cacheStats: this.getCacheStats()
    };
  }
}

// Configurar limpeza periódica
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    ConversationStateManagerV2.cleanup();
  }, SOFIA_CONFIG.context.CLEANUP_INTERVAL_MS);
}

export default ConversationStateManagerV2;