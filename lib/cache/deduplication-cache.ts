import { getRedisClient } from '@/lib/redis/client';
import { logger } from '@/lib/utils/logger';

const TTL_SECONDS = 60;

class DeduplicationCache {
  private static instance: DeduplicationCache;
  private inMemory = new Map<string, number>();
  private readonly TTL_MS = TTL_SECONDS * 1000;

  static getInstance(): DeduplicationCache {
    if (!this.instance) {
      this.instance = new DeduplicationCache();
    }
    return this.instance;
  }

  // Atomic check-and-mark. Returns true if message was already processed (duplicate).
  async checkAndMark(tenantId: string, messageId: string): Promise<boolean> {
    const key = `dedup:${tenantId}:${messageId}`;

    try {
      const redis = getRedisClient();
      // SET key 1 EX 60 NX — returns 'OK' if inserted (new), null if key existed (duplicate)
      const result = await redis.set(key, '1', 'EX', TTL_SECONDS, 'NX');
      const isDuplicate = result === null;
      if (isDuplicate) {
        logger.info('[Deduplication] Duplicate detected', {
          messageId: messageId?.substring(0, 8) + '***',
          backend: 'redis',
        });
      }
      return isDuplicate;
    } catch (e) {
      logger.warn('[Deduplication] Redis unavailable, falling back to in-memory', {
        error: (e as Error).message,
      });
    }

    // In-memory fallback for when Redis is down
    const now = Date.now();
    const processedAt = this.inMemory.get(key);
    if (processedAt && now - processedAt < this.TTL_MS) {
      logger.info('[Deduplication] Duplicate detected', {
        messageId: messageId?.substring(0, 8) + '***',
        backend: 'memory',
      });
      return true;
    }
    this.inMemory.set(key, now);
    return false;
  }
}

export const deduplicationCache = DeduplicationCache.getInstance();
