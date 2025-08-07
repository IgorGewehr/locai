// unified-context-manager.ts
// Sistema unificado de gerenciamento de contexto - combina memória + Firebase

import { logger } from '@/lib/utils/logger';
import { conversationContextService } from '@/lib/services/conversation-context-service';
import ConversationStateManager, { ConversationState } from './conversation-state';

export interface UnifiedContext {
  // Estado básico
  tenantId: string;
  clientPhone: string;
  
  // Estado em memória (volátil mas rápido)
  memoryState: ConversationState;
  
  // Histórico persistente (Firebase)
  messageHistory: any[];
  
  // Metadata combinada
  lastUpdated: Date;
  isReady: boolean;
}

export class UnifiedContextManager {
  private static instances = new Map<string, UnifiedContext>();
  
  /**
   * Obtém contexto unificado combinando memória + Firebase
   */
  public static async getContext(
    clientPhone: string, 
    tenantId: string
  ): Promise<UnifiedContext> {
    const key = `${tenantId}:${clientPhone}`;
    
    try {
      // 1. Obter estado em memória (rápido)
      const memoryState = ConversationStateManager.getState(clientPhone, tenantId);
      
      // 2. Obter histórico do Firebase (persistente)
      const messageHistory = await conversationContextService.getMessageHistory(
        clientPhone, 
        tenantId
      );
      
      // 3. Combinar informações
      const unifiedContext: UnifiedContext = {
        tenantId,
        clientPhone,
        memoryState,
        messageHistory: messageHistory || [],
        lastUpdated: new Date(),
        isReady: true
      };
      
      // 4. Cache local para performance
      this.instances.set(key, unifiedContext);
      
      logger.info('✅ [UnifiedContext] Contexto unificado obtido', {
        tenantId,
        clientPhone: clientPhone.substring(0, 6) + '***',
        memoryItems: Object.keys(memoryState).length,
        historyMessages: messageHistory?.length || 0
      });
      
      return unifiedContext;
      
    } catch (error) {
      logger.error('❌ [UnifiedContext] Erro ao obter contexto', {
        tenantId,
        clientPhone: clientPhone.substring(0, 6) + '***',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      // Fallback: retornar contexto mínimo
      return {
        tenantId,
        clientPhone,
        memoryState: ConversationStateManager.getState(clientPhone, tenantId),
        messageHistory: [],
        lastUpdated: new Date(),
        isReady: false
      };
    }
  }
  
  /**
   * Atualiza contexto em ambos os sistemas
   */
  public static async updateContext(
    clientPhone: string,
    tenantId: string,
    updates: {
      memoryUpdates?: Partial<ConversationState>;
      newMessage?: any;
      functionResult?: any;
    }
  ): Promise<void> {
    const key = `${tenantId}:${clientPhone}`;
    
    try {
      // 1. Atualizar estado em memória
      if (updates.memoryUpdates) {
        ConversationStateManager.updateState(clientPhone, tenantId, updates.memoryUpdates);
      }
      
      // 2. Salvar nova mensagem no Firebase (se houver)
      if (updates.newMessage) {
        await conversationContextService.saveMessage(clientPhone, tenantId, updates.newMessage);
      }
      
      // 3. Salvar resultado de função no Firebase (se houver)
      if (updates.functionResult) {
        await conversationContextService.saveFunctionResult(
          clientPhone, 
          tenantId, 
          updates.functionResult
        );
      }
      
      // 4. Limpar cache para forçar reload na próxima consulta
      this.instances.delete(key);
      
      logger.info('✅ [UnifiedContext] Contexto atualizado', {
        tenantId,
        clientPhone: clientPhone.substring(0, 6) + '***',
        hasMemoryUpdates: !!updates.memoryUpdates,
        hasNewMessage: !!updates.newMessage,
        hasFunctionResult: !!updates.functionResult
      });
      
    } catch (error) {
      logger.error('❌ [UnifiedContext] Erro ao atualizar contexto', {
        tenantId,
        clientPhone: clientPhone.substring(0, 6) + '***',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      throw error; // Re-throw para que o caller possa tratar
    }
  }
  
  /**
   * Limpa contexto específico do cache
   */
  public static clearContext(clientPhone: string, tenantId: string): void {
    const key = `${tenantId}:${clientPhone}`;
    this.instances.delete(key);
    
    // Também limpa o estado em memória
    ConversationStateManager.clearState(clientPhone, tenantId);
    
    logger.info('🗑️ [UnifiedContext] Contexto limpo', {
      tenantId,
      clientPhone: clientPhone.substring(0, 6) + '***'
    });
  }
  
  /**
   * Obtém estatísticas do contexto para debugging
   */
  public static getContextStats(clientPhone: string, tenantId: string): any {
    const key = `${tenantId}:${clientPhone}`;
    const cachedContext = this.instances.get(key);
    const memoryState = ConversationStateManager.getState(clientPhone, tenantId);
    
    return {
      isCached: !!cachedContext,
      memoryStateSize: Object.keys(memoryState).length,
      memoryPhase: memoryState.conversationPhase,
      lastPropertiesCount: memoryState.lastPropertyIds?.length || 0,
      hasClientInfo: !!memoryState.clientInfo,
      cachedMessageCount: cachedContext?.messageHistory?.length || 0,
      lastUpdated: cachedContext?.lastUpdated || null
    };
  }
  
  /**
   * Limpeza periódica do cache
   */
  public static cleanupCache(): void {
    const now = new Date();
    const maxAge = 30 * 60 * 1000; // 30 minutos
    
    let cleanedCount = 0;
    
    for (const [key, context] of this.instances.entries()) {
      const age = now.getTime() - context.lastUpdated.getTime();
      
      if (age > maxAge) {
        this.instances.delete(key);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      logger.info('🧹 [UnifiedContext] Cache limpo', {
        removedEntries: cleanedCount,
        remainingEntries: this.instances.size
      });
    }
  }
}

// Auto-limpeza do cache a cada 15 minutos
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    UnifiedContextManager.cleanupCache();
  }, 15 * 60 * 1000);
}