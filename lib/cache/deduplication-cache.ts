// Cache global de deduplicação para evitar processamento duplicado de mensagens
import { logger } from '@/lib/utils/logger';

class DeduplicationCache {
  private static instance: DeduplicationCache;
  private cache: Map<string, number>;
  private readonly TTL = 60000; // 1 minuto
  private readonly CLEANUP_INTERVAL = 300000; // 5 minutos
  private cleanupTimer: NodeJS.Timeout | null = null;

  private constructor() {
    this.cache = new Map();
    this.startCleanupTimer();
  }

  static getInstance(): DeduplicationCache {
    if (!this.instance) {
      this.instance = new DeduplicationCache();
    }
    return this.instance;
  }

  // Verificar se mensagem já foi processada
  isDuplicate(tenantId: string, messageId: string): boolean {
    const key = `msg_${tenantId}_${messageId}`;
    const processedAt = this.cache.get(key);
    
    if (!processedAt) {
      return false;
    }
    
    const timeSinceProcessed = Date.now() - processedAt;
    
    // Se passou do TTL, não é mais duplicada
    if (timeSinceProcessed > this.TTL) {
      this.cache.delete(key);
      return false;
    }
    
    logger.info('🔁 [Deduplication] Mensagem duplicada detectada', {
      messageId: messageId?.substring(0, 8) + '***',
      timeSinceProcessed: `${timeSinceProcessed}ms`
    });
    
    return true;
  }

  // Marcar mensagem como processada
  markAsProcessed(tenantId: string, messageId: string): void {
    const key = `msg_${tenantId}_${messageId}`;
    this.cache.set(key, Date.now());
    
    logger.debug('✅ [Deduplication] Mensagem marcada como processada', {
      messageId: messageId?.substring(0, 8) + '***',
      cacheSize: this.cache.size
    });
  }

  // Limpar cache antigo
  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, timestamp] of this.cache.entries()) {
      if (now - timestamp > this.TTL * 5) { // 5x TTL para limpeza
        this.cache.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      logger.info('🧹 [Deduplication] Cache limpo', {
        entriesRemoved: cleaned,
        remainingEntries: this.cache.size
      });
    }
  }

  // Iniciar timer de limpeza
  private startCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.CLEANUP_INTERVAL);
  }

  // Estatísticas do cache
  getStats(): { size: number; oldestEntry: number | null } {
    let oldest: number | null = null;
    
    for (const timestamp of this.cache.values()) {
      if (!oldest || timestamp < oldest) {
        oldest = timestamp;
      }
    }
    
    return {
      size: this.cache.size,
      oldestEntry: oldest ? Date.now() - oldest : null
    };
  }
}

export const deduplicationCache = DeduplicationCache.getInstance();