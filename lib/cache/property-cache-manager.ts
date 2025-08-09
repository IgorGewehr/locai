// lib/cache/property-cache-manager.ts
import { Property } from '@/lib/types/property';
import { logger } from '@/lib/utils/logger';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  hits: number;
  tenantId: string;
  key: string;
}

interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  size: number;
  hitRate: number;
}

/**
 * Sistema de cache otimizado para propriedades com TTL configurável
 * Implementa LRU (Least Recently Used) com statistics tracking
 */
export class PropertyCacheManager {
  private static instance: PropertyCacheManager;
  private cache: Map<string, CacheEntry<any>> = new Map();
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    size: 0,
    hitRate: 0
  };
  
  // Configurações padrão
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutos
  private readonly MAX_CACHE_SIZE = 1000; // Máximo de entradas
  private readonly CLEANUP_INTERVAL = 60 * 1000; // Limpar a cada 1 minuto
  private cleanupTimer?: NodeJS.Timeout;

  private constructor() {
    this.startCleanupTimer();
    logger.info('🎯 [PropertyCache] Cache manager initialized', {
      defaultTTL: `${this.DEFAULT_TTL / 1000}s`,
      maxSize: this.MAX_CACHE_SIZE
    });
  }

  static getInstance(): PropertyCacheManager {
    if (!PropertyCacheManager.instance) {
      PropertyCacheManager.instance = new PropertyCacheManager();
    }
    return PropertyCacheManager.instance;
  }

  /**
   * Gera chave única para cache baseada em tenant e filtros
   */
  private generateKey(tenantId: string, filters: any): string {
    const sortedFilters = Object.keys(filters)
      .sort()
      .reduce((acc, key) => {
        if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
          acc[key] = filters[key];
        }
        return acc;
      }, {} as any);
    
    return `${tenantId}:properties:${JSON.stringify(sortedFilters)}`;
  }

  /**
   * Busca propriedades no cache
   */
  get(tenantId: string, filters: any): Property[] | null {
    const key = this.generateKey(tenantId, filters);
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      this.updateHitRate();
      logger.debug('🔍 [PropertyCache] Cache miss', { 
        tenantId, 
        key: key.substring(0, 50) + '...',
        hitRate: `${this.stats.hitRate.toFixed(1)}%`
      });
      return null;
    }

    // Verificar se expirou
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.stats.misses++;
      this.stats.evictions++;
      this.updateHitRate();
      logger.debug('⏰ [PropertyCache] Cache expired', { 
        tenantId, 
        age: `${((Date.now() - entry.timestamp) / 1000).toFixed(1)}s`
      });
      return null;
    }

    // Atualizar estatísticas
    entry.hits++;
    this.stats.hits++;
    this.updateHitRate();

    logger.debug('✅ [PropertyCache] Cache hit', { 
      tenantId,
      hits: entry.hits,
      age: `${((Date.now() - entry.timestamp) / 1000).toFixed(1)}s`,
      hitRate: `${this.stats.hitRate.toFixed(1)}%`
    });

    return entry.data;
  }

  /**
   * Armazena propriedades no cache
   */
  set(tenantId: string, filters: any, properties: Property[], ttl?: number): void {
    const key = this.generateKey(tenantId, filters);
    
    // Verificar limite de tamanho do cache
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      this.evictLRU();
    }

    const entry: CacheEntry<Property[]> = {
      data: properties,
      timestamp: Date.now(),
      ttl: ttl || this.DEFAULT_TTL,
      hits: 0,
      tenantId,
      key
    };

    this.cache.set(key, entry);
    this.stats.size = this.cache.size;

    logger.debug('💾 [PropertyCache] Data cached', {
      tenantId,
      propertiesCount: properties.length,
      ttl: `${(entry.ttl / 1000).toFixed(0)}s`,
      cacheSize: this.cache.size
    });
  }

  /**
   * Invalida cache para um tenant específico
   */
  invalidateTenant(tenantId: string): number {
    let removed = 0;
    for (const [key, entry] of this.cache.entries()) {
      if (entry.tenantId === tenantId) {
        this.cache.delete(key);
        removed++;
      }
    }
    
    this.stats.size = this.cache.size;
    
    if (removed > 0) {
      logger.info('🗑️ [PropertyCache] Tenant cache invalidated', {
        tenantId,
        entriesRemoved: removed
      });
    }
    
    return removed;
  }

  /**
   * Invalida cache baseado em property ID
   */
  invalidateProperty(tenantId: string, propertyId: string): void {
    let removed = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.tenantId === tenantId && entry.data) {
        const hasProperty = entry.data.some((p: Property) => p.id === propertyId);
        if (hasProperty) {
          this.cache.delete(key);
          removed++;
        }
      }
    }
    
    if (removed > 0) {
      logger.info('🗑️ [PropertyCache] Property-related cache invalidated', {
        tenantId,
        propertyId,
        entriesRemoved: removed
      });
    }
  }

  /**
   * Limpa todo o cache
   */
  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    this.stats.size = 0;
    this.stats.evictions += size;
    
    logger.info('🧹 [PropertyCache] Cache cleared', {
      entriesRemoved: size
    });
  }

  /**
   * Remove entrada menos usada recentemente (LRU)
   */
  private evictLRU(): void {
    let lruKey: string | null = null;
    let minHits = Infinity;
    let oldestTime = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      // Combina hits e idade para determinar LRU
      const score = entry.hits * 1000 + (Date.now() - entry.timestamp);
      if (score < minHits) {
        minHits = score;
        lruKey = key;
        oldestTime = entry.timestamp;
      }
    }

    if (lruKey) {
      this.cache.delete(lruKey);
      this.stats.evictions++;
      
      logger.debug('♻️ [PropertyCache] LRU eviction', {
        age: `${((Date.now() - oldestTime) / 1000).toFixed(1)}s`,
        cacheSize: this.cache.size
      });
    }
  }

  /**
   * Limpa entradas expiradas
   */
  private cleanup(): void {
    const now = Date.now();
    let removed = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        removed++;
      }
    }

    if (removed > 0) {
      this.stats.evictions += removed;
      this.stats.size = this.cache.size;
      
      logger.debug('🧹 [PropertyCache] Cleanup completed', {
        entriesRemoved: removed,
        remainingEntries: this.cache.size
      });
    }
  }

  /**
   * Inicia timer de limpeza automática
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.CLEANUP_INTERVAL);
  }

  /**
   * Para timer de limpeza
   */
  stopCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
  }

  /**
   * Atualiza taxa de hit do cache
   */
  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;
  }

  /**
   * Retorna estatísticas do cache
   */
  getStats(): CacheStats {
    return {
      ...this.stats,
      size: this.cache.size
    };
  }

  /**
   * Warmup do cache - pré-carrega dados comuns
   */
  async warmup(tenantId: string, commonFilters: any[]): Promise<void> {
    logger.info('🔥 [PropertyCache] Starting cache warmup', {
      tenantId,
      filtersCount: commonFilters.length
    });

    // Este método seria chamado com filtros comuns para pré-popular o cache
    // Implementação específica dependeria da lógica de negócio
  }
}

// Exportar instância singleton
export const propertyCache = PropertyCacheManager.getInstance();