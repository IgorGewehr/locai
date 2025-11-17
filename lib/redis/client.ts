/**
 * Redis Singleton Client
 * Prevents connection pool exhaustion by reusing the same connection
 */

import Redis from 'ioredis';
import { logger } from '@/lib/utils/logger';

let redisClient: Redis | null = null;

export function getRedisClient(): Redis {
  if (!redisClient) {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        if (times > 3) {
          logger.error('[Redis] Max retries reached, giving up');
          return null;
        }
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      reconnectOnError: (err) => {
        const targetError = 'READONLY';
        if (err.message.includes(targetError)) {
          // Only reconnect when the error contains "READONLY"
          return true;
        }
        return false;
      },
    });

    redisClient.on('connect', () => {
      logger.info('[Redis] Connected successfully');
    });

    redisClient.on('error', (error) => {
      logger.error('[Redis] Connection error', {
        error: error.message,
        code: error.name,
      });
    });

    redisClient.on('close', () => {
      logger.warn('[Redis] Connection closed');
    });

    logger.info('[Redis] Client initialized', {
      host: redisUrl.split('@')[1]?.split(':')[0] || 'unknown',
    });
  }

  return redisClient;
}

export function closeRedisClient() {
  if (redisClient) {
    redisClient.disconnect();
    redisClient = null;
    logger.info('[Redis] Client disconnected');
  }
}
