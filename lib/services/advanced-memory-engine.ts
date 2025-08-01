// lib/services/advanced-memory-engine.ts
// ADVANCED MEMORY ENGINE - STEP 1 IMPLEMENTATION
// Sistema multicamada de memória (L1, L2, L3) com performance otimizada

import { 
  EnhancedConversationContext, 
  ContextCacheEntry, 
  MemoryMetrics,
  MemoryLayer,
  ContextValidation,
  ContextPerformanceMetrics,
  createEmptyEnhancedContext,
  isEnhancedConversationContext,
  CONTEXT_CONSTANTS
} from '@/lib/types/context-types-enhanced';
import { logger } from '@/lib/utils/logger';

// ===== CORE MEMORY ENGINE =====

export class AdvancedMemoryEngine {
  // L1 Cache - Memory Ultrarrápida (5 min TTL)
  private l1Cache = new Map<string, ContextCacheEntry>();
  private readonly L1_MAX_SIZE = 1000;
  private readonly L1_TTL = CONTEXT_CONSTANTS.L1_CACHE_TTL;
  
  // L2 Cache - Memory Rápida (1 hora TTL) 
  private l2Cache = new Map<string, ContextCacheEntry>();
  private readonly L2_MAX_SIZE = 5000;
  private readonly L2_TTL = CONTEXT_CONSTANTS.L2_CACHE_TTL;
  
  // Métricas de Performance
  private metrics: MemoryMetrics = {
    l1CacheSize: 0,
    l1HitRate: 0,
    l2CacheSize: 0,
    l2HitRate: 0,
    l3StorageWrites: 0,
    l3StorageReads: 0,
    memoryUsage: 0,
    performanceScore: 100
  };
  
  private hitCounters = {
    l1Hits: 0,
    l1Misses: 0,
    l2Hits: 0,
    l2Misses: 0,
    l3Hits: 0,
    l3Misses: 0
  };
  
  constructor() {
    this.startMemoryManagement();
    this.startMetricsCollection();
    
    logger.info('🧠 [AdvancedMemory] Memory engine initialized', {
      l1MaxSize: this.L1_MAX_SIZE,
      l2MaxSize: this.L2_MAX_SIZE,
      l1TTL: this.L1_TTL,
      l2TTL: this.L2_TTL
    });
  }
  
  // ===== PRIMARY CONTEXT OPERATIONS =====
  
  /**
   * Obter contexto com cache multicamada otimizado
   * PRIORIDADE: L1 → L2 → L3(Firebase)
   */
  async getContextWithCache(clientPhone: string, tenantId: string): Promise<EnhancedConversationContext> {
    const cacheKey = this.getCacheKey(clientPhone, tenantId);
    const startTime = Date.now();
    
    try {
      // LAYER 1: Ultra-fast memory cache
      const l1Result = this.getFromL1Cache(cacheKey);
      if (l1Result) {
        this.hitCounters.l1Hits++;
        logger.debug('🚄 [AdvancedMemory] L1 Cache HIT', { 
          cacheKey, 
          responseTime: Date.now() - startTime 
        });
        return l1Result;
      }
      this.hitCounters.l1Misses++;
      
      // LAYER 2: Fast memory cache
      const l2Result = this.getFromL2Cache(cacheKey);
      if (l2Result) {
        this.hitCounters.l2Hits++;
        // Promote to L1
        this.storeInL1Cache(cacheKey, l2Result);
        logger.debug('🏃 [AdvancedMemory] L2 Cache HIT + L1 Promotion', { 
          cacheKey, 
          responseTime: Date.now() - startTime 
        });
        return l2Result;
      }
      this.hitCounters.l2Misses++;
      
      // LAYER 3: Firebase storage (fallback)
      const l3Result = await this.getFromL3Storage(clientPhone, tenantId);
      this.hitCounters.l3Hits++;
      this.metrics.l3StorageReads++;
      
      // Store in all cache layers
      this.storeInL2Cache(cacheKey, l3Result);
      this.storeInL1Cache(cacheKey, l3Result);
      
      logger.debug('💾 [AdvancedMemory] L3 Storage HIT + Cache Population', { 
        cacheKey, 
        responseTime: Date.now() - startTime 
      });
      
      return l3Result;
      
    } catch (error) {
      this.hitCounters.l3Misses++;
      logger.error('❌ [AdvancedMemory] Error retrieving context', { 
        error, 
        cacheKey,
        clientPhone 
      });
      
      // Return default context
      const defaultContext = createEmptyEnhancedContext(clientPhone, tenantId);
      this.storeInL1Cache(cacheKey, defaultContext);
      return defaultContext;
    }
  }
  
  /**
   * Salvar contexto com persistence otimizada
   * ESTRATÉGIA: Salvar imediatamente em L1, async para L2 e L3
   */
  async saveContextOptimized(context: EnhancedConversationContext): Promise<void> {
    const cacheKey = this.getCacheKey(context.clientData.phone, context.clientData.tenantId);
    const startTime = Date.now();
    
    try {
      // Validar contexto antes de salvar
      const validation = this.validateContext(context);
      if (!validation.isValid && validation.errors.some(e => e.severity === 'critical')) {
        logger.error('❌ [AdvancedMemory] Critical validation errors, context not saved', {
          errors: validation.errors,
          cacheKey
        });
        return;
      }
      
      // Update metadata
      context.metadata.lastActivity = new Date();
      context.metadata.contextUpdates++;
      
      // L1 Cache - Immediate update (não bloqueia)
      this.storeInL1Cache(cacheKey, context);
      
      // L2 Cache - Immediate update (não bloqueia)  
      this.storeInL2Cache(cacheKey, context);
      
      // L3 Storage - Async persistence (não bloqueia resposta)
      this.saveToL3StorageAsync(context).catch(error => {
        logger.error('❌ [AdvancedMemory] L3 async save failed', { 
          error, 
          cacheKey 
        });
      });
      
      logger.debug('✅ [AdvancedMemory] Context saved successfully', {
        cacheKey,
        validationScore: validation.completeness,
        responseTime: Date.now() - startTime
      });
      
    } catch (error) {
      logger.error('❌ [AdvancedMemory] Error saving context', { 
        error, 
        cacheKey 
      });
      throw error;
    }
  }
  
  /**
   * Invalidar contexto em todas as camadas
   */
  async invalidateContext(clientPhone: string, tenantId: string): Promise<void> {
    const cacheKey = this.getCacheKey(clientPhone, tenantId);
    
    // Remove from all cache layers
    this.l1Cache.delete(cacheKey);
    this.l2Cache.delete(cacheKey);
    
    logger.info('🗑️ [AdvancedMemory] Context invalidated', { cacheKey });
  }
  
  // ===== L1 CACHE OPERATIONS (Ultra-Fast Memory) =====
  
  private getFromL1Cache(cacheKey: string): EnhancedConversationContext | null {
    const entry = this.l1Cache.get(cacheKey);
    
    if (!entry) return null;
    
    // Check TTL
    if (Date.now() - entry.timestamp.getTime() > this.L1_TTL) {
      this.l1Cache.delete(cacheKey);
      return null;
    }
    
    // Update access metrics
    entry.hits++;
    entry.lastAccess = new Date();
    
    return entry.context;
  }
  
  private storeInL1Cache(cacheKey: string, context: EnhancedConversationContext): void {
    // Check cache size limit
    if (this.l1Cache.size >= this.L1_MAX_SIZE) {
      this.evictFromL1Cache();
    }
    
    const entry: ContextCacheEntry = {
      context: { ...context }, // Deep copy to prevent mutations
      timestamp: new Date(),
      hits: 1,
      lastAccess: new Date(),
      size: this.estimateContextSize(context)
    };
    
    this.l1Cache.set(cacheKey, entry);
    this.updateCacheMetrics();
  }
  
  private evictFromL1Cache(): void {
    // LRU eviction - remove least recently used
    let oldestKey = '';
    let oldestTime = Date.now();
    
    for (const [key, entry] of this.l1Cache) {
      if (entry.lastAccess.getTime() < oldestTime) {
        oldestTime = entry.lastAccess.getTime();
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.l1Cache.delete(oldestKey);
      logger.debug('🧹 [AdvancedMemory] L1 Cache eviction', { evictedKey: oldestKey });
    }
  }
  
  // ===== L2 CACHE OPERATIONS (Fast Memory) =====
  
  private getFromL2Cache(cacheKey: string): EnhancedConversationContext | null {
    const entry = this.l2Cache.get(cacheKey);
    
    if (!entry) return null;
    
    // Check TTL
    if (Date.now() - entry.timestamp.getTime() > this.L2_TTL) {
      this.l2Cache.delete(cacheKey);
      return null;
    }
    
    // Update access metrics
    entry.hits++;
    entry.lastAccess = new Date();
    
    return entry.context;
  }
  
  private storeInL2Cache(cacheKey: string, context: EnhancedConversationContext): void {
    // Check cache size limit
    if (this.l2Cache.size >= this.L2_MAX_SIZE) {
      this.evictFromL2Cache();
    }
    
    const entry: ContextCacheEntry = {
      context: { ...context },
      timestamp: new Date(),
      hits: 1,
      lastAccess: new Date(),
      size: this.estimateContextSize(context)
    };
    
    this.l2Cache.set(cacheKey, entry);
    this.updateCacheMetrics();
  }
  
  private evictFromL2Cache(): void {
    // LRU eviction with intelligence - prefer keeping high-hit entries
    let worstKey = '';
    let worstScore = Infinity;
    
    for (const [key, entry] of this.l2Cache) {
      const age = Date.now() - entry.lastAccess.getTime();
      const score = age / (entry.hits + 1); // Lower score = better to keep
      
      if (score < worstScore) {
        worstScore = score;
        worstKey = key;
      }
    }
    
    if (worstKey) {
      this.l2Cache.delete(worstKey);
      logger.debug('🧹 [AdvancedMemory] L2 Cache eviction', { evictedKey: worstKey });
    }
  }
  
  // ===== L3 STORAGE OPERATIONS (Firebase) =====
  
  private async getFromL3Storage(clientPhone: string, tenantId: string): Promise<EnhancedConversationContext> {
    // Import Firebase modules dinamicamente para otimizar bundle
    const { doc, getDoc } = await import('firebase/firestore');
    const { db } = await import('@/lib/firebase/config');
    
    const conversationId = this.getConversationId(clientPhone, tenantId);
    const docRef = doc(db, 'conversation_contexts', conversationId);
    
    try {
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        
        // Validate data structure
        if (isEnhancedConversationContext(data)) {
          logger.debug('📖 [AdvancedMemory] Context loaded from Firebase', {
            contextId: conversationId,
            age: Date.now() - data.metadata.lastActivity.getTime()
          });
          return data;
        } else {
          logger.warn('⚠️ [AdvancedMemory] Invalid context structure in Firebase', {
            contextId: conversationId
          });
        }
      }
    } catch (error) {
      logger.error('❌ [AdvancedMemory] Firebase read error', { error, conversationId });
    }
    
    // Return default context if not found or invalid
    return createEmptyEnhancedContext(clientPhone, tenantId);
  }
  
  private async saveToL3StorageAsync(context: EnhancedConversationContext): Promise<void> {
    const { doc, setDoc, serverTimestamp } = await import('firebase/firestore');
    const { db } = await import('@/lib/firebase/config');
    
    const conversationId = this.getConversationId(context.clientData.phone, context.clientData.tenantId);
    const docRef = doc(db, 'conversation_contexts', conversationId);
    
    try {
      // Add server timestamp for consistency
      const contextWithTimestamp = {
        ...context,
        metadata: {
          ...context.metadata,
          lastActivity: serverTimestamp(),
          updatedAt: serverTimestamp()
        }
      };
      
      await setDoc(docRef, contextWithTimestamp, { merge: true });
      this.metrics.l3StorageWrites++;
      
      logger.debug('💾 [AdvancedMemory] Context saved to Firebase', {
        contextId: conversationId,
        size: this.estimateContextSize(context)
      });
      
    } catch (error) {
      logger.error('❌ [AdvancedMemory] Firebase write error', { error, conversationId });
      throw error;
    }
  }
  
  // ===== CONTEXT VALIDATION =====
  
  private validateContext(context: EnhancedConversationContext): ContextValidation {
    const errors = [];
    const warnings = [];
    
    // Critical validations
    if (!context.clientData.phone) {
      errors.push({
        field: 'clientData.phone',
        message: 'Phone number is required',
        severity: 'critical' as const,
        suggestion: 'Ensure phone number is provided'
      });
    }
    
    if (!context.clientData.tenantId) {
      errors.push({
        field: 'clientData.tenantId',
        message: 'Tenant ID is required',
        severity: 'critical' as const,
        suggestion: 'Ensure tenant ID is provided'
      });
    }
    
    // Data consistency validations
    if (context.clientData.checkIn && context.clientData.checkOut) {
      const checkIn = new Date(context.clientData.checkIn);
      const checkOut = new Date(context.clientData.checkOut);
      
      if (checkIn >= checkOut) {
        errors.push({
          field: 'clientData.dates',
          message: 'Check-in date must be before check-out date',
          severity: 'high' as const,
          suggestion: 'Validate date logic'
        });
      }
    }
    
    if (context.clientData.guests && context.clientData.guests <= 0) {
      errors.push({
        field: 'clientData.guests',
        message: 'Guest count must be positive',
        severity: 'medium' as const,
        suggestion: 'Ensure guest count is valid'
      });
    }
    
    // Performance warnings
    const contextSize = this.estimateContextSize(context);
    if (contextSize > CONTEXT_CONSTANTS.MAX_CONTEXT_SIZE) {
      warnings.push({
        field: 'context.size',
        message: 'Context size is very large',
        impact: 'performance' as const,
        suggestion: 'Consider context compression'
      });
    }
    
    if (context.conversationState.messageFlow.length > 100) {
      warnings.push({
        field: 'conversationState.messageFlow',
        message: 'Message flow is getting very long',
        impact: 'performance' as const,
        suggestion: 'Consider flow compression'
      });
    }
    
    // Calculate scores
    const completeness = this.calculateCompleteness(context);
    const consistency = this.calculateConsistency(context);
    const freshness = this.calculateFreshness(context);
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      completeness,
      consistency,
      freshness
    };
  }
  
  private calculateCompleteness(context: EnhancedConversationContext): number {
    const criticalFields = [
      context.clientData.phone,
      context.clientData.tenantId,
      context.conversationState.stage,
      context.salesContext.leadScore
    ];
    
    const optionalFields = [
      context.clientData.name,
      context.clientData.guests,
      context.clientData.checkIn,
      context.clientData.checkOut,
      context.clientData.city
    ];
    
    const criticalScore = criticalFields.filter(f => f !== undefined).length / criticalFields.length;
    const optionalScore = optionalFields.filter(f => f !== undefined).length / optionalFields.length;
    
    return (criticalScore * 0.7) + (optionalScore * 0.3);
  }
  
  private calculateConsistency(context: EnhancedConversationContext): number {
    let consistencyScore = 1.0;
    
    // Check date consistency
    if (context.clientData.checkIn && context.clientData.checkOut) {
      const checkIn = new Date(context.clientData.checkIn);
      const checkOut = new Date(context.clientData.checkOut);
      if (checkIn >= checkOut) consistencyScore -= 0.3;
    }
    
    // Check guest count consistency
    if (context.clientData.guests && context.clientData.guests <= 0) {
      consistencyScore -= 0.2;
    }
    
    // Check stage consistency
    if (context.conversationState.stage === 'closing' && context.salesContext.leadScore < 70) {
      consistencyScore -= 0.2;
    }
    
    return Math.max(0, consistencyScore);
  }
  
  private calculateFreshness(context: EnhancedConversationContext): number {
    const age = Date.now() - context.metadata.lastActivity.getTime();
    const maxAge = CONTEXT_CONSTANTS.DEFAULT_TTL;
    
    return Math.max(0, 1 - (age / maxAge));
  }
  
  // ===== MEMORY MANAGEMENT =====
  
  private startMemoryManagement(): void {
    // Cleanup expired entries every 5 minutes
    setInterval(() => {
      this.cleanupExpiredEntries();
    }, 5 * 60 * 1000);
    
    // Deep cleanup every 30 minutes
    setInterval(() => {
      this.performDeepCleanup();
    }, 30 * 60 * 1000);
  }
  
  private cleanupExpiredEntries(): void {
    const now = Date.now();
    let l1Cleaned = 0;
    let l2Cleaned = 0;
    
    // Cleanup L1 Cache
    for (const [key, entry] of this.l1Cache) {
      if (now - entry.timestamp.getTime() > this.L1_TTL) {
        this.l1Cache.delete(key);
        l1Cleaned++;
      }
    }
    
    // Cleanup L2 Cache
    for (const [key, entry] of this.l2Cache) {
      if (now - entry.timestamp.getTime() > this.L2_TTL) {
        this.l2Cache.delete(key);
        l2Cleaned++;
      }
    }
    
    if (l1Cleaned > 0 || l2Cleaned > 0) {
      logger.debug('🧹 [AdvancedMemory] Cleanup completed', {
        l1Cleaned,
        l2Cleaned,
        l1Size: this.l1Cache.size,
        l2Size: this.l2Cache.size
      });
    }
    
    this.updateCacheMetrics();
  }
  
  private performDeepCleanup(): void {
    // Advanced cleanup with intelligent retention
    this.compactCaches();
    this.optimizeMemoryUsage();
    this.updatePerformanceScore();
    
    logger.info('🔧 [AdvancedMemory] Deep cleanup completed', {
      metrics: this.metrics,
      hitRates: this.calculateHitRates()
    });
  }
  
  private compactCaches(): void {
    // Remove low-value entries to make room for high-value ones
    const l1Entries = Array.from(this.l1Cache.entries());
    const l2Entries = Array.from(this.l2Cache.entries());
    
    // Sort by value score (hits per age)
    l1Entries.sort(([, a], [, b]) => this.calculateEntryValue(b) - this.calculateEntryValue(a));
    l2Entries.sort(([, a], [, b]) => this.calculateEntryValue(b) - this.calculateEntryValue(a));
    
    // Keep only top entries
    const l1KeepSize = Math.floor(this.L1_MAX_SIZE * 0.8);
    const l2KeepSize = Math.floor(this.L2_MAX_SIZE * 0.8);
    
    this.l1Cache.clear();
    this.l2Cache.clear();
    
    l1Entries.slice(0, l1KeepSize).forEach(([key, entry]) => {
      this.l1Cache.set(key, entry);
    });
    
    l2Entries.slice(0, l2KeepSize).forEach(([key, entry]) => {
      this.l2Cache.set(key, entry);
    });
  }
  
  private calculateEntryValue(entry: ContextCacheEntry): number {
    const age = Date.now() - entry.lastAccess.getTime();
    const ageInHours = age / (1000 * 60 * 60);
    return entry.hits / (ageInHours + 1);
  }
  
  private optimizeMemoryUsage(): void {
    // Calculate total memory usage
    let totalMemory = 0;
    
    for (const entry of this.l1Cache.values()) {
      totalMemory += entry.size;
    }
    
    for (const entry of this.l2Cache.values()) {
      totalMemory += entry.size;
    }
    
    this.metrics.memoryUsage = totalMemory / (1024 * 1024); // Convert to MB
  }
  
  // ===== METRICS & MONITORING =====
  
  private startMetricsCollection(): void {
    setInterval(() => {
      this.updateCacheMetrics();
      this.updatePerformanceScore();
    }, 30000); // Every 30 seconds
  }
  
  private updateCacheMetrics(): void {
    this.metrics.l1CacheSize = this.l1Cache.size;
    this.metrics.l2CacheSize = this.l2Cache.size;
    
    const hitRates = this.calculateHitRates();
    this.metrics.l1HitRate = hitRates.l1HitRate;
    this.metrics.l2HitRate = hitRates.l2HitRate;
  }
  
  private calculateHitRates(): { l1HitRate: number; l2HitRate: number } {
    const l1Total = this.hitCounters.l1Hits + this.hitCounters.l1Misses;
    const l2Total = this.hitCounters.l2Hits + this.hitCounters.l2Misses;
    
    return {
      l1HitRate: l1Total > 0 ? this.hitCounters.l1Hits / l1Total : 0,
      l2HitRate: l2Total > 0 ? this.hitCounters.l2Hits / l2Total : 0
    };
  }
  
  private updatePerformanceScore(): void {
    const hitRates = this.calculateHitRates();
    const memoryEfficiency = Math.max(0, 1 - (this.metrics.memoryUsage / 100)); // Penalize if >100MB
    
    this.metrics.performanceScore = Math.round(
      (hitRates.l1HitRate * 40) +
      (hitRates.l2HitRate * 30) +
      (memoryEfficiency * 30)
    ) * 100;
  }
  
  // ===== UTILITY METHODS =====
  
  private getCacheKey(clientPhone: string, tenantId: string): string {
    return `${tenantId}_${clientPhone}`;
  }
  
  private getConversationId(clientPhone: string, tenantId: string): string {
    return `${tenantId}_${clientPhone}`;
  }
  
  private estimateContextSize(context: EnhancedConversationContext): number {
    return JSON.stringify(context).length;
  }
  
  // ===== PUBLIC API =====
  
  /**
   * Get current memory metrics
   */
  getMetrics(): MemoryMetrics {
    return { ...this.metrics };
  }
  
  /**
   * Get detailed hit counters
   */
  getHitCounters() {
    return { ...this.hitCounters };
  }
  
  /**
   * Force cleanup of all caches
   */
  async forceCleanup(): Promise<void> {
    this.l1Cache.clear();
    this.l2Cache.clear();
    this.updateCacheMetrics();
    
    logger.info('🧹 [AdvancedMemory] Force cleanup completed');
  }
  
  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      l1: {
        size: this.l1Cache.size,
        maxSize: this.L1_MAX_SIZE,
        utilization: this.l1Cache.size / this.L1_MAX_SIZE,
        hitRate: this.metrics.l1HitRate
      },
      l2: {
        size: this.l2Cache.size,
        maxSize: this.L2_MAX_SIZE,
        utilization: this.l2Cache.size / this.L2_MAX_SIZE,
        hitRate: this.metrics.l2HitRate
      },
      performance: {
        score: this.metrics.performanceScore,
        memoryUsage: this.metrics.memoryUsage,
        totalHits: this.hitCounters.l1Hits + this.hitCounters.l2Hits + this.hitCounters.l3Hits,
        totalMisses: this.hitCounters.l1Misses + this.hitCounters.l2Misses + this.hitCounters.l3Misses
      }
    };
  }
}

// Export singleton instance
export const advancedMemoryEngine = new AdvancedMemoryEngine();