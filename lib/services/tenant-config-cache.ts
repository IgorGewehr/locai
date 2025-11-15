/**
 * TENANT CONFIG CACHE SERVICE
 *
 * In-memory cache for tenant configurations with automatic TTL
 * Reduces Firestore reads and improves N8N workflow performance
 *
 * @version 1.0.0
 */

import { logger } from '@/lib/utils/logger';
import type { TenantConfig } from '@/lib/types/tenant-config';

interface CacheEntry<T> {
  data: T;
  cachedAt: number;
  ttl: number;
}

/**
 * Simple in-memory cache with TTL support
 * Thread-safe for Next.js API routes
 */
class TenantConfigCache {
  private cache: Map<string, CacheEntry<TenantConfig>>;
  private defaultTTL: number;
  private cleanupInterval: NodeJS.Timeout | null;

  constructor(defaultTTL = 30 * 60 * 1000) { // 30 minutes default
    this.cache = new Map();
    this.defaultTTL = defaultTTL;
    this.cleanupInterval = null;

    // Start automatic cleanup
    this.startCleanup();

    logger.info('[TENANT-CONFIG-CACHE] Cache initialized', {
      defaultTTL: `${defaultTTL / 60000}min`,
    });
  }

  /**
   * Get config from cache
   */
  get(tenantId: string): TenantConfig | null {
    const entry = this.cache.get(tenantId);

    if (!entry) {
      logger.debug('[TENANT-CONFIG-CACHE] Cache miss', { tenantId });
      return null;
    }

    // Check if expired
    const now = Date.now();
    if (now - entry.cachedAt > entry.ttl) {
      logger.debug('[TENANT-CONFIG-CACHE] Cache expired', {
        tenantId,
        age: `${(now - entry.cachedAt) / 60000}min`,
      });
      this.cache.delete(tenantId);
      return null;
    }

    logger.debug('[TENANT-CONFIG-CACHE] Cache hit', {
      tenantId,
      age: `${(now - entry.cachedAt) / 1000}s`,
    });

    return entry.data;
  }

  /**
   * Set config in cache
   */
  set(tenantId: string, config: TenantConfig, ttl?: number): void {
    const entry: CacheEntry<TenantConfig> = {
      data: config,
      cachedAt: Date.now(),
      ttl: ttl || this.defaultTTL,
    };

    this.cache.set(tenantId, entry);

    logger.debug('[TENANT-CONFIG-CACHE] Config cached', {
      tenantId,
      ttl: `${entry.ttl / 60000}min`,
      cacheSize: this.cache.size,
    });
  }

  /**
   * Invalidate cache for specific tenant
   */
  invalidate(tenantId: string): void {
    const existed = this.cache.delete(tenantId);

    if (existed) {
      logger.info('[TENANT-CONFIG-CACHE] Cache invalidated', { tenantId });
    }
  }

  /**
   * Invalidate all cache entries
   */
  invalidateAll(): void {
    const size = this.cache.size;
    this.cache.clear();

    logger.info('[TENANT-CONFIG-CACHE] All cache invalidated', {
      entriesCleared: size,
    });
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const now = Date.now();
    const entries = Array.from(this.cache.entries());

    return {
      totalEntries: entries.length,
      validEntries: entries.filter(([_, entry]) =>
        now - entry.cachedAt <= entry.ttl
      ).length,
      expiredEntries: entries.filter(([_, entry]) =>
        now - entry.cachedAt > entry.ttl
      ).length,
      oldestEntry: entries.length > 0
        ? Math.max(...entries.map(([_, entry]) => now - entry.cachedAt)) / 1000
        : 0,
      memorySize: this.estimateMemorySize(),
    };
  }

  /**
   * Estimate cache memory usage (rough calculation)
   */
  private estimateMemorySize(): string {
    const jsonSize = JSON.stringify(Array.from(this.cache.entries())).length;
    const kb = jsonSize / 1024;

    if (kb < 1) return `${jsonSize} bytes`;
    if (kb < 1024) return `${kb.toFixed(2)} KB`;
    return `${(kb / 1024).toFixed(2)} MB`;
  }

  /**
   * Cleanup expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    let removed = 0;

    for (const [tenantId, entry] of this.cache.entries()) {
      if (now - entry.cachedAt > entry.ttl) {
        this.cache.delete(tenantId);
        removed++;
      }
    }

    if (removed > 0) {
      logger.debug('[TENANT-CONFIG-CACHE] Cleanup completed', {
        entriesRemoved: removed,
        remainingEntries: this.cache.size,
      });
    }
  }

  /**
   * Start automatic cleanup interval
   */
  private startCleanup(): void {
    // Run cleanup every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);

    logger.debug('[TENANT-CONFIG-CACHE] Cleanup interval started');
  }

  /**
   * Stop cleanup interval (for graceful shutdown)
   */
  stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      logger.debug('[TENANT-CONFIG-CACHE] Cleanup interval stopped');
    }
  }
}

// Singleton instance
let cacheInstance: TenantConfigCache | null = null;

/**
 * Get or create cache instance
 */
export function getTenantConfigCache(): TenantConfigCache {
  if (!cacheInstance) {
    cacheInstance = new TenantConfigCache();
  }
  return cacheInstance;
}

/**
 * Create new cache instance with custom TTL
 */
export function createTenantConfigCache(ttl?: number): TenantConfigCache {
  return new TenantConfigCache(ttl);
}

// Export singleton for direct use
export const tenantConfigCache = getTenantConfigCache();
