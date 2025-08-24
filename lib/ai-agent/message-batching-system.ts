// lib/ai-agent/message-batching-system.ts
// Sistema para agrupar mensagens consecutivas do cliente e responder apenas uma vez

import { logger } from '@/lib/utils/logger';

export interface BatchedMessage {
  message: string;
  timestamp: number;
  clientPhone: string;
  tenantId: string;
}

export interface BatchResult {
  shouldProcess: boolean;
  combinedMessage: string;
  messagesInBatch: number;
  waitTime?: number;
}

export class MessageBatchingSystem {
  private pendingMessages = new Map<string, BatchedMessage[]>();
  private batchTimers = new Map<string, NodeJS.Timeout>();
  
  // Configurações do batching
  private readonly BATCH_WINDOW_MS = 3000; // 3 segundos para agrupar mensagens
  private readonly MIN_RESPONSE_DELAY = 1500; // 1.5s delay mínimo para parecer natural
  private readonly MAX_MESSAGES_IN_BATCH = 5; // Máximo 5 mensagens por batch
  
  /**
   * Adiciona uma mensagem ao batch e determina se deve processar agora
   */
  addMessage(
    clientPhone: string,
    tenantId: string,
    message: string
  ): Promise<BatchResult> {
    return new Promise((resolve) => {
      const key = `${tenantId}:${clientPhone}`;
      const now = Date.now();
      
      // Obter batch atual ou criar novo
      let currentBatch = this.pendingMessages.get(key) || [];
      
      // Adicionar nova mensagem
      const newMessage: BatchedMessage = {
        message: message.trim(),
        timestamp: now,
        clientPhone,
        tenantId
      };
      
      currentBatch.push(newMessage);
      this.pendingMessages.set(key, currentBatch);
      
      // Limpar timer existente se houver
      const existingTimer = this.batchTimers.get(key);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }
      
      logger.info('📦 [MessageBatch] Mensagem adicionada ao batch', {
        clientPhone: clientPhone.substring(0, 6) + '***',
        batchSize: currentBatch.length,
        message: message.substring(0, 30) + '...'
      });
      
      // Se atingiu o máximo, processar imediatamente
      if (currentBatch.length >= this.MAX_MESSAGES_IN_BATCH) {
        logger.info('📦 [MessageBatch] Batch cheio, processando imediatamente');
        
        const result = this.processBatch(key, currentBatch);
        this.clearBatch(key);
        resolve(result);
        return;
      }
      
      // Configurar timer para processar o batch
      const timer = setTimeout(() => {
        logger.info('📦 [MessageBatch] Tempo limite atingido, processando batch');
        
        const finalBatch = this.pendingMessages.get(key) || [];
        if (finalBatch.length > 0) {
          const result = this.processBatch(key, finalBatch);
          this.clearBatch(key);
          resolve(result);
        }
      }, this.BATCH_WINDOW_MS);
      
      this.batchTimers.set(key, timer);
    });
  }
  
  /**
   * Processa um batch de mensagens e combina em uma única mensagem
   */
  private processBatch(key: string, messages: BatchedMessage[]): BatchResult {
    if (messages.length === 0) {
      return { shouldProcess: false, combinedMessage: '', messagesInBatch: 0 };
    }
    
    if (messages.length === 1) {
      // Mensagem única, adicionar delay natural
      return {
        shouldProcess: true,
        combinedMessage: messages[0].message,
        messagesInBatch: 1,
        waitTime: this.MIN_RESPONSE_DELAY
      };
    }
    
    // Múltiplas mensagens - combinar de forma inteligente
    const combinedMessage = this.combineMessages(messages);
    const timeSpan = messages[messages.length - 1].timestamp - messages[0].timestamp;
    
    // Delay proporcional ao tempo que o cliente levou para enviar as mensagens
    const waitTime = Math.max(this.MIN_RESPONSE_DELAY, Math.min(timeSpan + 1000, 5000));
    
    logger.info('📦 [MessageBatch] Batch processado', {
      messagesCount: messages.length,
      timeSpan: `${timeSpan}ms`,
      waitTime: `${waitTime}ms`,
      combinedLength: combinedMessage.length
    });
    
    return {
      shouldProcess: true,
      combinedMessage,
      messagesInBatch: messages.length,
      waitTime
    };
  }
  
  /**
   * Combina múltiplas mensagens de forma inteligente
   */
  private combineMessages(messages: BatchedMessage[]): string {
    // Filtrar mensagens vazias ou apenas com saudações repetidas
    const meaningfulMessages = messages.filter((msg, index) => {
      const text = msg.message.toLowerCase().trim();
      
      // Primeira mensagem sempre é incluída
      if (index === 0) return true;
      
      // Pular mensagens muito curtas e repetitivas
      if (text.length < 3) return false;
      
      // Pular saudações duplicadas
      const greetings = ['olá', 'oi', 'bom dia', 'boa tarde', 'boa noite', 'hello', 'hi'];
      if (greetings.some(greeting => text === greeting && index > 0)) {
        // Verificar se já temos uma saudação
        const hasGreetingAlready = messages.slice(0, index).some(prevMsg => 
          greetings.some(g => prevMsg.message.toLowerCase().includes(g))
        );
        if (hasGreetingAlready) return false;
      }
      
      return true;
    });
    
    // Se só restou uma mensagem significativa, usar ela
    if (meaningfulMessages.length === 1) {
      return meaningfulMessages[0].message;
    }
    
    // Combinar mensagens de forma natural
    const parts = meaningfulMessages.map(msg => msg.message.trim());
    
    // Detectar se é saudação + pedido
    const firstIsGreeting = this.isGreeting(parts[0]);
    if (firstIsGreeting && parts.length > 1) {
      // Combinar saudação com o resto
      return `${parts[0]}, ${parts.slice(1).join(' ').toLowerCase()}`;
    }
    
    // Combinar todas as partes
    return parts.join(' ');
  }
  
  /**
   * Verifica se uma mensagem é uma saudação
   */
  private isGreeting(message: string): boolean {
    const text = message.toLowerCase().trim();
    const greetings = ['olá', 'oi', 'bom dia', 'boa tarde', 'boa noite', 'hello', 'hi'];
    return greetings.some(greeting => text.includes(greeting));
  }
  
  /**
   * Limpa o batch e timer para um cliente
   */
  private clearBatch(key: string): void {
    this.pendingMessages.delete(key);
    
    const timer = this.batchTimers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.batchTimers.delete(key);
    }
  }
  
  /**
   * Limpa batches antigos (limpeza de memória)
   */
  cleanupOldBatches(): void {
    const now = Date.now();
    const maxAge = 30000; // 30 segundos
    
    for (const [key, messages] of this.pendingMessages.entries()) {
      const oldestMessage = messages[0]?.timestamp || now;
      if (now - oldestMessage > maxAge) {
        logger.info('🧹 [MessageBatch] Limpando batch antigo', { key });
        this.clearBatch(key);
      }
    }
  }
  
  /**
   * Obtém estatísticas do sistema de batching
   */
  getStats() {
    return {
      pendingBatches: this.pendingMessages.size,
      activeTimers: this.batchTimers.size,
      totalMessagesWaiting: Array.from(this.pendingMessages.values())
        .reduce((sum, batch) => sum + batch.length, 0)
    };
  }
}

// Singleton instance
export const messageBatchingSystem = new MessageBatchingSystem();

// Limpeza automática a cada 30 segundos
setInterval(() => {
  messageBatchingSystem.cleanupOldBatches();
}, 30000);