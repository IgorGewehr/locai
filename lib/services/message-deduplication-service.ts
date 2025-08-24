// lib/services/message-deduplication-service.ts
// Serviço para evitar loops e agrupar mensagens sequenciais

import { logger } from '@/lib/utils/logger';

interface PendingMessage {
  tenantId: string;
  clientPhone: string;
  messages: string[];
  messageIds: string[];
  firstMessageTime: number;
  lastMessageTime: number;
  timeoutId?: NodeJS.Timeout;
}

interface ProcessedMessage {
  messageId: string;
  clientPhone: string;
  processedAt: number;
}

export class MessageDeduplicationService {
  private static instance: MessageDeduplicationService;
  private pendingMessages = new Map<string, PendingMessage>();
  private processedMessages = new Map<string, ProcessedMessage>();
  private readonly DEBOUNCE_DELAY = 3000; // 3 segundos
  private readonly CACHE_TTL = 300000; // 5 minutos
  private readonly MAX_MESSAGES_GROUP = 5; // Máximo de mensagens para agrupar

  private constructor() {
    // Limpar cache periodicamente
    setInterval(() => {
      this.cleanupCache();
    }, 60000); // A cada minuto
  }

  static getInstance(): MessageDeduplicationService {
    if (!MessageDeduplicationService.instance) {
      MessageDeduplicationService.instance = new MessageDeduplicationService();
    }
    return MessageDeduplicationService.instance;
  }

  /**
   * Verifica se a mensagem já foi processada
   */
  isMessageProcessed(messageId: string, clientPhone: string): boolean {
    const key = `${messageId}_${clientPhone}`;
    const processed = this.processedMessages.get(key);
    
    if (processed && (Date.now() - processed.processedAt) < this.CACHE_TTL) {
      logger.info('🔄 Message already processed, skipping', {
        messageId: messageId?.substring(0, 8) + '***',
        clientPhone: clientPhone?.substring(0, 6) + '***',
        processedAgo: `${Math.round((Date.now() - processed.processedAt) / 1000)}s`
      });
      return true;
    }

    return false;
  }

  /**
   * Marca mensagem como processada
   */
  markMessageAsProcessed(messageId: string, clientPhone: string): void {
    const key = `${messageId}_${clientPhone}`;
    this.processedMessages.set(key, {
      messageId,
      clientPhone,
      processedAt: Date.now()
    });
  }

  /**
   * Adiciona mensagem ao sistema de debounce
   * Retorna true se deve processar imediatamente, false se deve aguardar
   */
  async addMessage(
    tenantId: string,
    clientPhone: string,
    message: string,
    messageId: string,
    onProcess: (groupedMessages: string[], messageIds: string[]) => Promise<void>
  ): Promise<boolean> {
    const key = `${tenantId}_${clientPhone}`;
    const now = Date.now();

    // Verificar se mensagem já foi processada
    if (this.isMessageProcessed(messageId, clientPhone)) {
      return false;
    }

    let pending = this.pendingMessages.get(key);

    if (!pending) {
      // Primeira mensagem do grupo
      pending = {
        tenantId,
        clientPhone,
        messages: [message],
        messageIds: [messageId],
        firstMessageTime: now,
        lastMessageTime: now
      };
      
      this.pendingMessages.set(key, pending);
      
      logger.info('📥 Starting message group', {
        tenantId: tenantId?.substring(0, 8) + '***',
        clientPhone: clientPhone?.substring(0, 6) + '***',
        messageId: messageId?.substring(0, 8) + '***'
      });
    } else {
      // Adicionar à mensagem existente
      pending.messages.push(message);
      pending.messageIds.push(messageId);
      pending.lastMessageTime = now;
      
      // Limpar timeout anterior
      if (pending.timeoutId) {
        clearTimeout(pending.timeoutId);
      }
      
      logger.info('📥 Adding to message group', {
        tenantId: tenantId?.substring(0, 8) + '***',
        clientPhone: clientPhone?.substring(0, 6) + '***',
        messageId: messageId?.substring(0, 8) + '***',
        groupSize: pending.messages.length
      });
    }

    // Se atingiu o máximo de mensagens, processar imediatamente
    if (pending.messages.length >= this.MAX_MESSAGES_GROUP) {
      logger.info('📦 Processing message group (max size reached)', {
        tenantId: tenantId?.substring(0, 8) + '***',
        clientPhone: clientPhone?.substring(0, 6) + '***',
        groupSize: pending.messages.length
      });
      
      await this.processMessageGroup(key, onProcess);
      return true;
    }

    // Configurar timeout para processar o grupo
    pending.timeoutId = setTimeout(async () => {
      logger.info('📦 Processing message group (timeout)', {
        tenantId: tenantId?.substring(0, 8) + '***',
        clientPhone: clientPhone?.substring(0, 6) + '***',
        groupSize: pending!.messages.length,
        timeSpan: `${Math.round((now - pending!.firstMessageTime) / 1000)}s`
      });
      
      await this.processMessageGroup(key, onProcess);
    }, this.DEBOUNCE_DELAY);

    return false; // Não processar ainda
  }

  /**
   * Processa um grupo de mensagens
   */
  private async processMessageGroup(
    key: string,
    onProcess: (groupedMessages: string[], messageIds: string[]) => Promise<void>
  ): Promise<void> {
    const pending = this.pendingMessages.get(key);
    if (!pending) return;

    try {
      // Marcar todas as mensagens como processadas
      for (const messageId of pending.messageIds) {
        this.markMessageAsProcessed(messageId, pending.clientPhone);
      }

      // Processar grupo de mensagens
      await onProcess(pending.messages, pending.messageIds);
      
      logger.info('✅ Message group processed successfully', {
        tenantId: pending.tenantId?.substring(0, 8) + '***',
        clientPhone: pending.clientPhone?.substring(0, 6) + '***',
        groupSize: pending.messages.length,
        messageIds: pending.messageIds.map(id => id?.substring(0, 8) + '***')
      });
      
    } catch (error) {
      logger.error('❌ Error processing message group', {
        tenantId: pending.tenantId?.substring(0, 8) + '***',
        clientPhone: pending.clientPhone?.substring(0, 6) + '***',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      // Limpar timeout se existir
      if (pending.timeoutId) {
        clearTimeout(pending.timeoutId);
      }
      
      // Remover do cache
      this.pendingMessages.delete(key);
    }
  }

  /**
   * Limpa cache de mensagens antigas
   */
  private cleanupCache(): void {
    const now = Date.now();
    let cleanedProcessed = 0;
    let cleanedPending = 0;

    // Limpar mensagens processadas antigas
    for (const [key, processed] of this.processedMessages.entries()) {
      if (now - processed.processedAt > this.CACHE_TTL) {
        this.processedMessages.delete(key);
        cleanedProcessed++;
      }
    }

    // Limpar mensagens pendentes órfãs (sem timeout)
    for (const [key, pending] of this.pendingMessages.entries()) {
      if (now - pending.lastMessageTime > this.DEBOUNCE_DELAY * 2) {
        if (pending.timeoutId) {
          clearTimeout(pending.timeoutId);
        }
        this.pendingMessages.delete(key);
        cleanedPending++;
      }
    }

    if (cleanedProcessed > 0 || cleanedPending > 0) {
      logger.info('🧹 Cache cleanup completed', {
        cleanedProcessed,
        cleanedPending,
        remainingProcessed: this.processedMessages.size,
        remainingPending: this.pendingMessages.size
      });
    }
  }

  /**
   * Força o processamento de mensagens pendentes para um cliente
   */
  async flushPendingMessages(tenantId: string, clientPhone: string): Promise<void> {
    const key = `${tenantId}_${clientPhone}`;
    const pending = this.pendingMessages.get(key);
    
    if (pending && pending.timeoutId) {
      clearTimeout(pending.timeoutId);
      // O processamento será feito pelo callback original
    }
  }

  /**
   * Obtém estatísticas do serviço
   */
  getStats() {
    return {
      processedMessages: this.processedMessages.size,
      pendingGroups: this.pendingMessages.size,
      cacheSize: this.processedMessages.size + this.pendingMessages.size
    };
  }
}