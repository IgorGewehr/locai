/**
 * Performance Optimizations for LocAI System
 * Implements caching, batch operations, and query optimizations
 */

import { TenantServiceFactory } from '@/lib/firebase/firestore-v2';
import { Property } from '@/lib/types/property';
import { Client } from '@/lib/types/client';
import { logger } from '@/lib/utils/logger';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  tenantId: string;
}

class PerformanceOptimizer {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Generic cache implementation with tenant isolation
   */
  private getCacheKey(tenantId: string, operation: string, params?: any): string {
    const paramString = params ? JSON.stringify(params) : '';
    return `${tenantId}:${operation}:${paramString}`;
  }

  private isValidCache<T>(entry: CacheEntry<T>): boolean {
    return Date.now() - entry.timestamp < this.CACHE_TTL;
  }

  private setCache<T>(key: string, data: T, tenantId: string): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      tenantId
    });
  }

  private getCache<T>(key: string, tenantId: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T>;
    if (!entry || entry.tenantId !== tenantId || !this.isValidCache(entry)) {
      this.cache.delete(key);
      return null;
    }
    return entry.data;
  }

  /**
   * Optimized property search with caching and selective filtering
   */
  async getOptimizedProperties(tenantId: string, filters: {
    location?: string;
    maxPrice?: number;
    propertyType?: string;
    isActive?: boolean;
  } = {}): Promise<Property[]> {
    const cacheKey = this.getCacheKey(tenantId, 'properties', filters);
    const cached = this.getCache<Property[]>(cacheKey, tenantId);
    
    if (cached) {
      logger.info('Properties served from cache', { tenantId, filterCount: Object.keys(filters).length });
      return cached;
    }

    const services = new TenantServiceFactory(tenantId);
    let queryFilters: any[] = [];

    // Build optimized Firestore queries instead of filtering in memory
    if (filters.isActive !== undefined) {
      queryFilters.push({ field: 'isActive', operator: '==', value: filters.isActive });
    }

    if (filters.propertyType) {
      queryFilters.push({ field: 'type', operator: '==', value: filters.propertyType });
    }

    if (filters.maxPrice) {
      queryFilters.push({ field: 'basePrice', operator: '<=', value: filters.maxPrice });
    }

    const properties = await services.properties.getMany(queryFilters) as Property[];

    // Only apply complex filters that can't be done in Firestore
    let filteredProperties = properties;
    if (filters.location) {
      const locationLower = filters.location.toLowerCase();
      filteredProperties = properties.filter(p => 
        p.city?.toLowerCase().includes(locationLower) ||
        p.neighborhood?.toLowerCase().includes(locationLower) ||
        p.address?.toLowerCase().includes(locationLower)
      );
    }

    this.setCache(cacheKey, filteredProperties, tenantId);
    logger.info('Properties cached for future requests', { 
      tenantId, 
      count: filteredProperties.length,
      cacheKey: cacheKey.substring(0, 50) + '...'
    });

    return filteredProperties;
  }

  /**
   * Batch client operations for better performance
   */
  async batchCreateClients(tenantId: string, clients: Omit<Client, 'id'>[]): Promise<string[]> {
    if (clients.length === 0) return [];

    const services = new TenantServiceFactory(tenantId);
    const batch = services.getBatch();
    const clientIds: string[] = [];

    logger.info('Starting batch client creation', { tenantId, count: clients.length });

    for (const clientData of clients) {
      const clientRef = services.clients.getNewDocRef();
      batch.set(clientRef, {
        ...clientData,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      clientIds.push(clientRef.id);
    }

    await batch.commit();
    
    // Invalidate related caches
    this.invalidateTenantCache(tenantId, 'clients');
    
    logger.info('Batch client creation completed', { tenantId, created: clientIds.length });
    return clientIds;
  }

  /**
   * Optimized client search with indexed queries
   */
  async searchClientsOptimized(tenantId: string, searchTerm: string, limit: number = 50): Promise<Client[]> {
    const cacheKey = this.getCacheKey(tenantId, 'client-search', { searchTerm, limit });
    const cached = this.getCache<Client[]>(cacheKey, tenantId);
    
    if (cached) {
      return cached;
    }

    const services = new TenantServiceFactory(tenantId);
    
    // Use multiple indexed queries in parallel for better performance
    const queries = await Promise.allSettled([
      // Search by email
      services.clients.getMany([
        { field: 'email', operator: '>=', value: searchTerm },
        { field: 'email', operator: '<', value: searchTerm + '\uf8ff' }
      ]),
      // Search by phone (if it's a number)
      ...(searchTerm.match(/^\d+/) ? [
        services.clients.getMany([
          { field: 'phone', operator: '>=', value: searchTerm },
          { field: 'phone', operator: '<', value: searchTerm + '\uf8ff' }
        ])
      ] : []),
      // Search by name prefix
      services.clients.getMany([
        { field: 'name', operator: '>=', value: searchTerm },
        { field: 'name', operator: '<', value: searchTerm + '\uf8ff' }
      ])
    ]);

    // Combine and deduplicate results
    const allResults: Client[] = [];
    const seenIds = new Set<string>();

    queries.forEach(result => {
      if (result.status === 'fulfilled') {
        (result.value as Client[]).forEach(client => {
          if (client.id && !seenIds.has(client.id)) {
            seenIds.add(client.id);
            allResults.push(client);
          }
        });
      }
    });

    // Sort by relevance and limit results
    const sortedResults = allResults
      .sort((a, b) => {
        const aScore = this.calculateRelevanceScore(a, searchTerm);
        const bScore = this.calculateRelevanceScore(b, searchTerm);
        return bScore - aScore;
      })
      .slice(0, limit);

    this.setCache(cacheKey, sortedResults, tenantId);
    return sortedResults;
  }

  private calculateRelevanceScore(client: Client, searchTerm: string): number {
    const term = searchTerm.toLowerCase();
    let score = 0;

    // Exact matches get highest score
    if (client.email?.toLowerCase() === term) score += 100;
    if (client.phone?.includes(term)) score += 90;
    if (client.name?.toLowerCase() === term) score += 80;

    // Partial matches get lower scores
    if (client.name?.toLowerCase().includes(term)) score += 50;
    if (client.email?.toLowerCase().includes(term)) score += 40;

    return score;
  }

  /**
   * Invalidate cache for specific tenant and operation
   */
  invalidateTenantCache(tenantId: string, operation?: string): void {
    const keysToDelete: string[] = [];
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.tenantId === tenantId) {
        if (!operation || key.includes(`:${operation}:`)) {
          keysToDelete.push(key);
        }
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));
    logger.info('Cache invalidated', { tenantId, operation, keysDeleted: keysToDelete.length });
  }

  /**
   * Clear expired cache entries
   */
  cleanupExpiredCache(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.CACHE_TTL) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));
    logger.info('Expired cache entries cleaned', { removed: keysToDelete.length });
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    totalEntries: number;
    tenantDistribution: Record<string, number>;
    oldestEntry: number;
    newestEntry: number;
  } {
    const stats = {
      totalEntries: this.cache.size,
      tenantDistribution: {} as Record<string, number>,
      oldestEntry: Date.now(),
      newestEntry: 0
    };

    for (const [, entry] of this.cache.entries()) {
      // Track tenant distribution
      stats.tenantDistribution[entry.tenantId] = 
        (stats.tenantDistribution[entry.tenantId] || 0) + 1;

      // Track timestamp ranges
      if (entry.timestamp < stats.oldestEntry) {
        stats.oldestEntry = entry.timestamp;
      }
      if (entry.timestamp > stats.newestEntry) {
        stats.newestEntry = entry.timestamp;
      }
    }

    return stats;
  }
}

// Export singleton instance
export const performanceOptimizer = new PerformanceOptimizer();

// Auto-cleanup expired cache entries every 10 minutes
setInterval(() => {
  performanceOptimizer.cleanupExpiredCache();
}, 10 * 60 * 1000);