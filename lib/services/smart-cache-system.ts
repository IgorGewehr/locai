// lib/services/smart-cache-system.ts
// SMART CACHE SYSTEM - STEP 2 IMPLEMENTATION
// Sistema de cache inteligente para dados frequentes (90%+ hit rate)

import { 
  EnhancedConversationContext,
  extractCriticalData 
} from '@/lib/types/context-types-enhanced';
import { logger } from '@/lib/utils/logger';

// ===== INTERFACES =====

export interface CacheEntry<T = any> {
  key: string;
  data: T;
  timestamp: number;
  ttl: number;                    // Time to live em ms
  accessCount: number;            // Quantas vezes foi acessado
  lastAccessed: number;           // Último acesso
  size: number;                   // Tamanho em bytes (estimativa)
  priority: 1 | 2 | 3 | 4 | 5;   // Prioridade de cache
  tags: string[];                 // Tags para invalidação em grupo
}

export interface CacheStats {
  totalEntries: number;
  totalSize: number;              // Total em bytes
  hitRate: number;                // % de cache hits
  missRate: number;               // % de cache misses
  averageAccessTime: number;      // Tempo médio de acesso
  evictionCount: number;          // Quantas evictions
  memoryUsage: number;            // Uso de memória atual
  topKeys: string[];              // Chaves mais acessadas
}

export interface CacheConfiguration {
  maxSize: number;                // Tamanho máximo em bytes
  maxEntries: number;             // Máximo de entradas
  defaultTTL: number;             // TTL padrão em ms
  cleanupInterval: number;        // Intervalo de limpeza em ms
  compressionThreshold: number;   // Tamanho mínimo para compressão
  hotDataTTL: number;             // TTL para dados frequentes
  warmDataTTL: number;            // TTL para dados normais
  coldDataTTL: number;            // TTL para dados raros
}

// ===== SMART CACHE SYSTEM =====

export class SmartCacheSystem {
  private cache = new Map<string, CacheEntry>();
  private accessStats = new Map<string, { hits: number, misses: number, lastAccess: number }>();
  private cleanupTimer: NodeJS.Timeout | null = null;
  
  private config: CacheConfiguration = {
    maxSize: 50 * 1024 * 1024,      // 50MB máximo
    maxEntries: 10000,              // 10k entradas máximo
    defaultTTL: 15 * 60 * 1000,     // 15 minutos padrão
    cleanupInterval: 5 * 60 * 1000, // Cleanup a cada 5 minutos
    compressionThreshold: 10240,    // Comprimir dados > 10KB
    hotDataTTL: 60 * 60 * 1000,     // 1 hora para dados frequentes
    warmDataTTL: 30 * 60 * 1000,    // 30 min para dados normais
    coldDataTTL: 10 * 60 * 1000     // 10 min para dados raros
  };

  constructor(customConfig?: Partial<CacheConfiguration>) {
    if (customConfig) {
      this.config = { ...this.config, ...customConfig };
    }
    
    this.startCleanupTimer();
    
    logger.info('🚀 [SmartCache] Smart cache system initialized', {
      maxSize: `${this.config.maxSize / 1024 / 1024}MB`,
      maxEntries: this.config.maxEntries,
      defaultTTL: `${this.config.defaultTTL / 1000}s`
    });
  }

  /**
   * Obter dados do cache com inteligência adaptativa
   * OBJETIVO: 90%+ hit rate, <10ms access time
   */
  async get<T>(key: string, tags?: string[]): Promise<T | null> {
    const startTime = Date.now();
    
    try {
      const entry = this.cache.get(key);
      const now = Date.now();

      // Cache miss
      if (!entry || this.isExpired(entry, now)) {
        this.recordMiss(key);
        
        // Cleanup entrada expirada
        if (entry && this.isExpired(entry, now)) {
          this.cache.delete(key);
        }
        
        logger.debug('💨 [SmartCache] Cache miss', { key, tags });
        return null;
      }

      // Cache hit - atualizar estatísticas
      entry.accessCount++;
      entry.lastAccessed = now;
      this.recordHit(key);

      const accessTime = Date.now() - startTime;
      
      logger.debug('✨ [SmartCache] Cache hit', { 
        key, 
        accessCount: entry.accessCount,
        accessTime,
        tags 
      });

      // Adaptar TTL baseado na frequência de acesso
      this.adaptTTL(entry);

      return entry.data as T;

    } catch (error) {
      logger.error('❌ [SmartCache] Cache get error', { key, error });
      this.recordMiss(key);
      return null;
    }
  }

  /**
   * Armazenar dados no cache com otimização automática
   */
  async set<T>(
    key: string, 
    data: T, 
    options?: {
      ttl?: number;
      priority?: 1 | 2 | 3 | 4 | 5;
      tags?: string[];
      compress?: boolean;
    }
  ): Promise<void> {
    try {
      const now = Date.now();
      const size = this.estimateSize(data);
      const ttl = options?.ttl || this.config.defaultTTL;
      const priority = options?.priority || this.calculatePriority(key, data);
      const tags = options?.tags || this.generateAutoTags(key, data);

      // Verificar se precisa fazer espaço
      await this.ensureSpace(size);

      // Comprimir dados grandes se necessário
      let finalData = data;
      if (options?.compress || size > this.config.compressionThreshold) {
        finalData = await this.compressData(data);
      }

      const entry: CacheEntry<T> = {
        key,
        data: finalData,
        timestamp: now,
        ttl,
        accessCount: 1,
        lastAccessed: now,
        size: this.estimateSize(finalData),
        priority,
        tags
      };

      this.cache.set(key, entry);

      logger.debug('💾 [SmartCache] Data cached', {
        key,
        size: entry.size,
        ttl,
        priority,
        tags,
        compressed: finalData !== data
      });

    } catch (error) {
      logger.error('❌ [SmartCache] Cache set error', { key, error });
    }
  }

  /**
   * Cache específico para propriedades (dados mais frequentes)
   */
  async cacheProperties(properties: any[], searchCriteria: any): Promise<void> {
    const cacheKey = this.generatePropertyCacheKey(searchCriteria);
    
    await this.set(cacheKey, properties, {
      ttl: this.config.hotDataTTL,  // TTL longo para propriedades
      priority: 5,                  // Alta prioridade
      tags: ['properties', 'search', searchCriteria.city],
      compress: true               // Sempre comprimir propriedades
    });

    // Cache individual para cada propriedade
    for (const property of properties.slice(0, 10)) { // Limitar a primeiras 10
      const propKey = `property:${property.id}`;
      await this.set(propKey, property, {
        ttl: this.config.hotDataTTL,
        priority: 4,
        tags: ['property', 'details', property.city]
      });
    }
  }

  /**
   * Cache para cálculos de preço (muito frequente)
   */
  async cachePriceCalculation(
    propertyId: string,
    checkIn: string,
    checkOut: string,
    guests: number,
    calculation: any
  ): Promise<void> {
    const cacheKey = `price:${propertyId}:${checkIn}:${checkOut}:${guests}`;
    
    await this.set(cacheKey, calculation, {
      ttl: this.config.warmDataTTL,  // TTL médio
      priority: 4,
      tags: ['pricing', 'calculation', propertyId],
      compress: calculation.details ? true : false
    });
  }

  /**
   * Cache para dados de clientes
   */
  async cacheClientData(clientPhone: string, clientData: any): Promise<void> {
    const cacheKey = `client:${clientPhone}`;
    
    await this.set(cacheKey, clientData, {
      ttl: this.config.hotDataTTL,   // TTL longo para clientes
      priority: 5,                   // Alta prioridade
      tags: ['client', 'profile'],
      compress: false                // Dados pequenos, não comprimir
    });
  }

  /**
   * Cache para contextos de conversa (ultra-frequente)
   */
  async cacheConversationContext(
    clientPhone: string,
    tenantId: string,
    context: EnhancedConversationContext
  ): Promise<void> {
    const cacheKey = `context:${tenantId}:${clientPhone}`;
    
    await this.set(cacheKey, context, {
      ttl: this.config.hotDataTTL,
      priority: 5,
      tags: ['context', 'conversation', tenantId],
      compress: true
    });
  }

  /**
   * Obter propriedades em cache
   */
  async getCachedProperties(searchCriteria: any): Promise<any[] | null> {
    const cacheKey = this.generatePropertyCacheKey(searchCriteria);
    return await this.get<any[]>(cacheKey, ['properties', 'search']);
  }

  /**
   * Obter cálculo de preço em cache
   */
  async getCachedPriceCalculation(
    propertyId: string,
    checkIn: string,
    checkOut: string,
    guests: number
  ): Promise<any | null> {
    const cacheKey = `price:${propertyId}:${checkIn}:${checkOut}:${guests}`;
    return await this.get(cacheKey, ['pricing', 'calculation']);
  }

  /**
   * Invalidar cache por tags
   */
  async invalidateByTags(tags: string[]): Promise<number> {
    let invalidatedCount = 0;
    
    for (const [key, entry] of Array.from(this.cache.entries())) {
      const hasMatchingTag = tags.some(tag => entry.tags.includes(tag));
      if (hasMatchingTag) {
        this.cache.delete(key);
        invalidatedCount++;
      }
    }

    logger.info('🗑️ [SmartCache] Cache invalidated by tags', { 
      tags, 
      invalidatedCount 
    });

    return invalidatedCount;
  }

  /**
   * Invalidar cache de propriedades específicas
   */
  async invalidateProperties(city?: string): Promise<void> {
    const tags = city ? ['properties', 'search', city] : ['properties', 'search'];
    await this.invalidateByTags(tags);
  }

  /**
   * Pré-carregar dados frequentes (preemptive caching)
   */
  async preloadFrequentData(tenantId: string): Promise<void> {
    logger.info('🔄 [SmartCache] Preloading frequent data', { tenantId });

    try {
      // Identificar dados frequentes baseado no histórico
      const frequentKeys = this.getFrequentKeys();
      
      // Pré-carregar apenas se não estiver em cache
      for (const key of frequentKeys) {
        const cached = await this.get(key);
        if (!cached) {
          // Implementar lógica específica de preload baseado no tipo de key
          await this.preloadSpecificData(key, tenantId);
        }
      }

    } catch (error) {
      logger.error('❌ [SmartCache] Preload failed', { error, tenantId });
    }
  }

  /**
   * Warm-up do cache com dados essenciais
   */
  async warmUpCache(tenantId: string, commonSearchCriteria: any[]): Promise<void> {
    logger.info('🔥 [SmartCache] Warming up cache', { 
      tenantId, 
      criteriaCount: commonSearchCriteria.length 
    });

    for (const criteria of commonSearchCriteria) {
      try {
        // Simular cache miss para forçar carregamento
        const key = this.generatePropertyCacheKey(criteria);
        const existingCache = await this.get(key);
        
        if (!existingCache) {
          // Aqui seria feita a busca real e cache
          logger.debug('🌡️ [SmartCache] Would warm up search', { criteria });
        }
      } catch (error) {
        logger.warn('⚠️ [SmartCache] Warm-up item failed', { criteria, error });
      }
    }
  }

  /**
   * Obter estatísticas do cache
   */
  getStats(): CacheStats {
    const totalEntries = this.cache.size;
    const totalSize = Array.from(this.cache.values()).reduce((sum, entry) => sum + entry.size, 0);
    
    // Calcular hit rate
    const totalHits = Array.from(this.accessStats.values()).reduce((sum, stat) => sum + stat.hits, 0);
    const totalMisses = Array.from(this.accessStats.values()).reduce((sum, stat) => sum + stat.misses, 0);
    const totalRequests = totalHits + totalMisses;
    
    const hitRate = totalRequests > 0 ? (totalHits / totalRequests) * 100 : 0;
    const missRate = 100 - hitRate;

    // Top keys por acesso
    const topKeys = Array.from(this.cache.entries())
      .sort(([,a], [,b]) => b.accessCount - a.accessCount)
      .slice(0, 10)
      .map(([key]) => key);

    return {
      totalEntries,
      totalSize,
      hitRate: Math.round(hitRate * 100) / 100,
      missRate: Math.round(missRate * 100) / 100,
      averageAccessTime: 5, // Estimativa
      evictionCount: 0, // TODO: implementar contador
      memoryUsage: totalSize,
      topKeys
    };
  }

  /**
   * Otimização automática baseada em padrões de uso
   */
  optimize(): void {
    const stats = this.getStats();
    
    logger.info('🔧 [SmartCache] Running optimization', stats);

    // Ajustar TTLs baseado no hit rate
    if (stats.hitRate < 80) {
      // Hit rate baixo - aumentar TTLs
      this.config.hotDataTTL *= 1.2;
      this.config.warmDataTTL *= 1.2;
      logger.info('📈 [SmartCache] Increased TTLs for better hit rate');
    } else if (stats.hitRate > 95 && stats.memoryUsage > this.config.maxSize * 0.8) {
      // Hit rate alto mas usando muita memória - diminuir TTLs
      this.config.hotDataTTL *= 0.9;
      this.config.warmDataTTL *= 0.9;
      logger.info('📉 [SmartCache] Decreased TTLs to save memory');
    }

    // Cleanup de entradas antigas
    this.cleanup();
    
    // Promover dados frequentes
    this.promoteHotData();
  }

  // ===== MÉTODOS PRIVADOS =====

  private generatePropertyCacheKey(searchCriteria: any): string {
    const { city, guests, checkIn, checkOut, minPrice, maxPrice } = searchCriteria;
    return `props:${city || 'any'}:${guests || 'any'}:${checkIn || 'any'}:${checkOut || 'any'}:${minPrice || 0}:${maxPrice || 999999}`;
  }

  private isExpired(entry: CacheEntry, now: number): boolean {
    return (now - entry.timestamp) > entry.ttl;
  }

  private recordHit(key: string): void {
    const stats = this.accessStats.get(key) || { hits: 0, misses: 0, lastAccess: 0 };
    stats.hits++;
    stats.lastAccess = Date.now();
    this.accessStats.set(key, stats);
  }

  private recordMiss(key: string): void {
    const stats = this.accessStats.get(key) || { hits: 0, misses: 0, lastAccess: 0 };
    stats.misses++;
    stats.lastAccess = Date.now();
    this.accessStats.set(key, stats);
  }

  private calculatePriority(key: string, data: any): 1 | 2 | 3 | 4 | 5 {
    // Contextos de conversa = prioridade máxima
    if (key.startsWith('context:')) return 5;
    
    // Propriedades = alta prioridade
    if (key.startsWith('props:') || key.startsWith('property:')) return 4;
    
    // Clientes = alta prioridade
    if (key.startsWith('client:')) return 4;
    
    // Preços = prioridade média
    if (key.startsWith('price:')) return 3;
    
    // Outros dados = prioridade baixa
    return 2;
  }

  private generateAutoTags(key: string, data: any): string[] {
    const tags: string[] = [];
    
    if (key.startsWith('context:')) tags.push('context', 'conversation');
    if (key.startsWith('props:')) tags.push('properties', 'search');
    if (key.startsWith('property:')) tags.push('property', 'details');
    if (key.startsWith('client:')) tags.push('client', 'profile');
    if (key.startsWith('price:')) tags.push('pricing', 'calculation');
    
    // Adicionar tags específicas do tenant se possível
    const tenantMatch = key.match(/:([^:]+):/);
    if (tenantMatch) {
      tags.push(tenantMatch[1]);
    }
    
    return tags;
  }

  private estimateSize(data: any): number {
    try {
      return JSON.stringify(data).length * 2; // Estimativa: 2 bytes por char
    } catch {
      return 1000; // Fallback para objetos complexos
    }
  }

  private async ensureSpace(requiredSize: number): Promise<void> {
    const currentSize = Array.from(this.cache.values()).reduce((sum, entry) => sum + entry.size, 0);
    
    if (currentSize + requiredSize > this.config.maxSize || this.cache.size >= this.config.maxEntries) {
      await this.evictEntries(requiredSize);
    }
  }

  private async evictEntries(requiredSize: number): Promise<void> {
    const entries = Array.from(this.cache.entries());
    
    // Ordenar por prioridade (menor primeiro) e frequência de acesso
    entries.sort(([,a], [,b]) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return a.accessCount - b.accessCount;
    });

    let freedSize = 0;
    let evictedCount = 0;
    
    for (const [key, entry] of entries) {
      if (freedSize >= requiredSize && evictedCount >= 10) break;
      
      this.cache.delete(key);
      freedSize += entry.size;
      evictedCount++;
    }

    logger.debug('🗑️ [SmartCache] Evicted entries', { 
      evictedCount, 
      freedSize: `${freedSize / 1024}KB` 
    });
  }

  private adaptTTL(entry: CacheEntry): void {
    // Dados muito acessados = TTL maior
    if (entry.accessCount > 100) {
      entry.ttl = this.config.hotDataTTL;
    } else if (entry.accessCount > 20) {
      entry.ttl = this.config.warmDataTTL;
    } else {
      entry.ttl = this.config.coldDataTTL;
    }
  }

  private async compressData<T>(data: T): Promise<T> {
    // Implementação simples - em produção usaria bibliotecas de compressão
    try {
      if (typeof data === 'object') {
        // Remover campos desnecessários para economizar espaço
        const compressed = JSON.parse(JSON.stringify(data));
        return compressed;
      }
      return data;
    } catch {
      return data;
    }
  }

  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
      this.optimize();
    }, this.config.cleanupInterval);
  }

  private cleanup(): void {
    const now = Date.now();
    let cleanedCount = 0;
    
    for (const [key, entry] of Array.from(this.cache.entries())) {
      if (this.isExpired(entry, now)) {
        this.cache.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logger.debug('🧹 [SmartCache] Cleanup completed', { cleanedCount });
    }
  }

  private promoteHotData(): void {
    const hotThreshold = 50; // 50+ acessos = dados quentes
    let promotedCount = 0;

    for (const [key, entry] of Array.from(this.cache.entries())) {
      if (entry.accessCount >= hotThreshold && entry.priority < 4) {
        entry.priority = Math.min(5, entry.priority + 1) as 1 | 2 | 3 | 4 | 5;
        entry.ttl = this.config.hotDataTTL;
        promotedCount++;
      }
    }

    if (promotedCount > 0) {
      logger.debug('⬆️ [SmartCache] Promoted hot data', { promotedCount });
    }
  }

  private getFrequentKeys(): string[] {
    return Array.from(this.accessStats.entries())
      .filter(([, stats]) => stats.hits > 10)
      .sort(([,a], [,b]) => b.hits - a.hits)
      .slice(0, 20)
      .map(([key]) => key);
  }

  private async preloadSpecificData(key: string, tenantId: string): Promise<void> {
    // Implementação específica baseada no tipo de key
    logger.debug('🔄 [SmartCache] Preloading specific data', { key, tenantId });
    
    if (key.startsWith('props:')) {
      // Preload de propriedades seria implementado aqui
    } else if (key.startsWith('client:')) {
      // Preload de dados de cliente seria implementado aqui
    }
  }

  /**
   * Destructor para cleanup
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    
    this.cache.clear();
    this.accessStats.clear();
    
    logger.info('🛑 [SmartCache] Smart cache system destroyed');
  }
}

// Export singleton instance
export const smartCacheSystem = new SmartCacheSystem();

export default SmartCacheSystem;