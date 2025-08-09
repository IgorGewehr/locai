/**
 * Cache Manager for Mini-Site
 * In-memory cache with TTL support for production performance
 */

import { logger } from '@/lib/utils/logger';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class CacheManager {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Run cleanup every 5 minutes
    this.startCleanup();
  }

  /**
   * Get cached data
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      // Cache expired
      this.cache.delete(key);
      logger.debug('🔄 [Cache] Entry expired', { key });
      return null;
    }

    logger.debug('✅ [Cache] Hit', { key });
    return entry.data as T;
  }

  /**
   * Set cache data with TTL (in milliseconds)
   */
  set<T>(key: string, data: T, ttl: number = 300000): void { // Default 5 minutes
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
    
    logger.debug('💾 [Cache] Set', { 
      key, 
      ttl: `${ttl / 1000}s`,
      size: this.cache.size 
    });
  }

  /**
   * Clear specific cache or all cache
   */
  clear(pattern?: string): void {
    if (pattern) {
      // Clear keys matching pattern
      const keysToDelete: string[] = [];
      for (const key of this.cache.keys()) {
        if (key.includes(pattern)) {
          keysToDelete.push(key);
        }
      }
      
      keysToDelete.forEach(key => this.cache.delete(key));
      logger.info('🧹 [Cache] Cleared pattern', { 
        pattern, 
        cleared: keysToDelete.length 
      });
    } else {
      // Clear all
      const size = this.cache.size;
      this.cache.clear();
      logger.info('🧹 [Cache] Cleared all', { cleared: size });
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }

  /**
   * Start automatic cleanup of expired entries
   */
  private startCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      const keysToDelete: string[] = [];

      for (const [key, entry] of this.cache.entries()) {
        if (now - entry.timestamp > entry.ttl) {
          keysToDelete.push(key);
        }
      }

      if (keysToDelete.length > 0) {
        keysToDelete.forEach(key => this.cache.delete(key));
        logger.debug('🧹 [Cache] Cleanup', { 
          expired: keysToDelete.length,
          remaining: this.cache.size 
        });
      }
    }, 300000); // Every 5 minutes
  }

  /**
   * Stop cleanup interval (for cleanup)
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.cache.clear();
  }
}

// Singleton instance
let cacheManager: CacheManager | null = null;

/**
 * Get or create cache manager instance
 */
export function getCacheManager(): CacheManager {
  if (!cacheManager) {
    cacheManager = new CacheManager();
  }
  return cacheManager;
}

// Cache key generators for consistency
export const cacheKeys = {
  miniSiteConfig: (tenantId: string) => `mini-site:config:${tenantId}`,
  miniSiteProperties: (tenantId: string) => `mini-site:properties:${tenantId}`,
  miniSiteProperty: (tenantId: string, propertyId: string) => `mini-site:property:${tenantId}:${propertyId}`,
  miniSiteAnalytics: (tenantId: string) => `mini-site:analytics:${tenantId}`,
};

// Cache TTL configurations (in milliseconds)
export const cacheTTL = {
  config: 600000,      // 10 minutes
  properties: 300000,  // 5 minutes
  property: 300000,    // 5 minutes
  analytics: 60000,    // 1 minute
};