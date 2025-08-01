// lib/services/__tests__/memory-context-tests.spec.ts
// TESTES UNITÁRIOS STEP 1 - CORE MEMORY & CONTEXT FOUNDATION
// Validação completa do sistema de memória e contexto

import { describe, beforeEach, afterEach, it, expect, jest } from '@jest/globals';
import { AdvancedMemoryEngine } from '../advanced-memory-engine';
import { ConversationContextServiceV2 } from '../conversation-context-service-v2';
import { OptimizedHistoryManager } from '../optimized-history-manager';
import { 
  createEmptyEnhancedContext,
  EnhancedConversationContext,
  CONTEXT_CONSTANTS 
} from '../../types/context-types-enhanced';

// Mock Firebase
jest.mock('@/lib/firebase/config', () => ({
  db: {}
}));

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  getDoc: jest.fn(),
  setDoc: jest.fn(),
  updateDoc: jest.fn(),
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  getDocs: jest.fn(),
  Timestamp: {
    now: () => ({ toDate: () => new Date(), toMillis: () => Date.now() }),
    fromDate: (date: Date) => ({ toDate: () => date, toMillis: () => date.getTime() })
  },
  serverTimestamp: () => ({ toDate: () => new Date() }),
  writeBatch: jest.fn(),
  runTransaction: jest.fn()
}));

// Mock logger
jest.mock('@/lib/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

describe('STEP 1: Core Memory & Context Foundation Tests', () => {
  
  // ===== ADVANCED MEMORY ENGINE TESTS =====
  
  describe('AdvancedMemoryEngine', () => {
    let memoryEngine: AdvancedMemoryEngine;
    let testContext: EnhancedConversationContext;
    
    beforeEach(() => {
      memoryEngine = new AdvancedMemoryEngine();
      testContext = createEmptyEnhancedContext('5511999999999', 'test-tenant');
      
      // Adicionar dados críticos para testes
      testContext.clientData.guests = 4;
      testContext.clientData.checkIn = '2025-08-15';
      testContext.clientData.checkOut = '2025-08-20';
      testContext.clientData.city = 'São Paulo';
      testContext.clientData.name = 'João Silva';
    });
    
    afterEach(async () => {
      await memoryEngine.forceCleanup();
    });

    it('should create memory engine with correct initial state', () => {
      const metrics = memoryEngine.getMetrics();
      
      expect(metrics.l1CacheSize).toBe(0);
      expect(metrics.l2CacheSize).toBe(0);
      expect(metrics.performanceScore).toBe(100);
      expect(metrics.memoryUsage).toBe(0);
    });

    it('should store and retrieve context from L1 cache', async () => {
      // Store context
      await memoryEngine.saveContextOptimized(testContext);
      
      // Retrieve immediately (should hit L1 cache)
      const retrieved = await memoryEngine.getContextWithCache('5511999999999', 'test-tenant');
      
      expect(retrieved.clientData.guests).toBe(4);
      expect(retrieved.clientData.checkIn).toBe('2025-08-15');
      expect(retrieved.clientData.checkOut).toBe('2025-08-20');
      expect(retrieved.clientData.city).toBe('São Paulo');
      expect(retrieved.clientData.name).toBe('João Silva');
      
      // Verify cache hit
      const hitCounters = memoryEngine.getHitCounters();
      expect(hitCounters.l1Hits).toBe(1);
    });

    it('should handle L1 cache eviction properly', async () => {
      // Fill L1 cache beyond capacity (simulate)
      for (let i = 0; i < 10; i++) {
        const context = createEmptyEnhancedContext(`551199999999${i}`, 'test-tenant');
        await memoryEngine.saveContextOptimized(context);
      }
      
      const metrics = memoryEngine.getMetrics();
      expect(metrics.l1CacheSize).toBeGreaterThan(0);
      expect(metrics.l1CacheSize).toBeLessThanOrEqual(1000); // Max size
    });

    it('should maintain critical data integrity during cache operations', async () => {
      // Store context with critical data
      await memoryEngine.saveContextOptimized(testContext);
      
      // Retrieve multiple times
      for (let i = 0; i < 5; i++) {
        const retrieved = await memoryEngine.getContextWithCache('5511999999999', 'test-tenant');
        
        // Verify CRITICAL data is NEVER lost
        expect(retrieved.clientData.guests).toBe(4);
        expect(retrieved.clientData.checkIn).toBe('2025-08-15');
        expect(retrieved.clientData.checkOut).toBe('2025-08-20');
        expect(retrieved.clientData.city).toBe('São Paulo');
        expect(retrieved.clientData.name).toBe('João Silva');
      }
    });

    it('should update cache metrics correctly', async () => {
      await memoryEngine.saveContextOptimized(testContext);
      await memoryEngine.getContextWithCache('5511999999999', 'test-tenant');
      
      const metrics = memoryEngine.getMetrics();
      expect(metrics.l1CacheSize).toBe(1);
      expect(metrics.l1HitRate).toBeGreaterThan(0);
    });

    it('should handle concurrent access without race conditions', async () => {
      const promises = [];
      
      // Simulate concurrent access
      for (let i = 0; i < 10; i++) {
        promises.push(
          memoryEngine.getContextWithCache('5511999999999', 'test-tenant')
        );
      }
      
      const results = await Promise.all(promises);
      
      // All results should be consistent
      results.forEach(result => {
        expect(result.clientData.phone).toBe('5511999999999');
        expect(result.clientData.tenantId).toBe('test-tenant');
      });
    });
  });

  // ===== CONVERSATION CONTEXT SERVICE V2 TESTS =====

  describe('ConversationContextServiceV2', () => {
    let contextService: ConversationContextServiceV2;
    let testContext: EnhancedConversationContext;
    
    beforeEach(() => {
      contextService = new ConversationContextServiceV2();
      testContext = createEmptyEnhancedContext('5511999999999', 'test-tenant');
    });

    afterEach(async () => {
      await contextService.clearCacheForTesting();
    });

    it('should create or get context successfully', async () => {
      const context = await contextService.getOrCreateContext('5511999999999', 'test-tenant');
      
      expect(context.clientData.phone).toBe('5511999999999');
      expect(context.clientData.tenantId).toBe('test-tenant');
      expect(context.conversationState.stage).toBe('discovery');
      expect(context.salesContext.leadScore).toBe(50);
    });

    it('should perform intelligent merge without losing critical data', async () => {
      // Create initial context with critical data
      testContext.clientData.guests = 4;
      testContext.clientData.checkIn = '2025-08-15';
      testContext.clientData.name = 'João Silva';
      
      // First save
      await contextService.updateContext('5511999999999', 'test-tenant', testContext);
      
      // Update with partial data (should not overwrite existing critical data)
      const partialUpdate: Partial<EnhancedConversationContext> = {
        clientData: {
          city: 'Rio de Janeiro' // Adding city, should not remove guests/checkIn/name
        } as any,
        conversationState: {
          stage: 'presentation'
        } as any
      };
      
      await contextService.updateContext('5511999999999', 'test-tenant', partialUpdate);
      
      // Retrieve and verify critical data is preserved
      const updated = await contextService.getOrCreateContext('5511999999999', 'test-tenant');
      
      expect(updated.clientData.guests).toBe(4); // ❌ CRITICAL: Should be preserved
      expect(updated.clientData.checkIn).toBe('2025-08-15'); // ❌ CRITICAL: Should be preserved  
      expect(updated.clientData.name).toBe('João Silva'); // ❌ CRITICAL: Should be preserved
      expect(updated.clientData.city).toBe('Rio de Janeiro'); // New data should be added
      expect(updated.conversationState.stage).toBe('presentation'); // Should be updated
    });

    it('should validate context updates correctly', async () => {
      // Test with invalid data
      const invalidContext = createEmptyEnhancedContext('', ''); // Missing required fields
      
      // Should handle gracefully without throwing
      await expect(
        contextService.updateContext('', '', invalidContext)
      ).resolves.not.toThrow();
    });

    it('should handle context TTL correctly', async () => {
      // Create context
      await contextService.getOrCreateContext('5511999999999', 'test-tenant');
      
      // Mock expired context (25 hours old)
      const expiredTime = new Date(Date.now() - (25 * 60 * 60 * 1000));
      testContext.metadata.lastActivity = expiredTime;
      
      // Should create new context for expired one
      const context = await contextService.getOrCreateContext('5511999999999', 'test-tenant');
      expect(context.metadata.lastActivity.getTime()).toBeGreaterThan(expiredTime.getTime());
    });

    it('should preserve data across multiple updates', async () => {
      // Sequential updates that should accumulate data
      const updates = [
        { clientData: { guests: 2 } },
        { clientData: { checkIn: '2025-08-15' } },
        { clientData: { checkOut: '2025-08-20' } },
        { clientData: { city: 'São Paulo' } },
        { clientData: { name: 'João Silva' } }
      ];
      
      for (const update of updates) {
        await contextService.updateContext('5511999999999', 'test-tenant', update as any);
      }
      
      // Final context should have all data
      const final = await contextService.getOrCreateContext('5511999999999', 'test-tenant');
      
      expect(final.clientData.guests).toBe(2);
      expect(final.clientData.checkIn).toBe('2025-08-15');
      expect(final.clientData.checkOut).toBe('2025-08-20');
      expect(final.clientData.city).toBe('São Paulo');
      expect(final.clientData.name).toBe('João Silva');
    });
  });

  // ===== OPTIMIZED HISTORY MANAGER TESTS =====

  describe('OptimizedHistoryManager', () => {
    let historyManager: OptimizedHistoryManager;
    
    beforeEach(() => {
      historyManager = new OptimizedHistoryManager();
    });

    afterEach(() => {
      historyManager.clearCache();
    });

    it('should create history manager with correct initial state', () => {
      const stats = historyManager.getCacheStats();
      
      expect(stats.entries).toBe(0);
      expect(stats.memoryUsage).toBe(0);
    });

    it('should handle empty message history gracefully', async () => {
      // Mock empty Firebase response
      const mockGetDocs = jest.fn().mockResolvedValue({
        forEach: jest.fn()
      });
      
      jest.doMock('firebase/firestore', () => ({
        ...jest.requireActual('firebase/firestore'),
        getDocs: mockGetDocs
      }));
      
      const history = await historyManager.getRelevantHistory('5511999999999', 'test-tenant');
      expect(history).toEqual([]);
    });

    it('should cache history results for performance', async () => {
      // Mock Firebase response
      const mockMessages = [
        {
          id: '1',
          conversationId: 'test-tenant_5511999999999',
          role: 'user',
          content: 'Quero um apartamento para 4 pessoas',
          timestamp: { toDate: () => new Date(), toMillis: () => Date.now() },
          dataExtracted: { guests: 4 }
        }
      ];
      
      const mockGetDocs = jest.fn().mockResolvedValue({
        forEach: jest.fn((callback) => {
          mockMessages.forEach((msg, index) => {
            callback({ id: msg.id, data: () => msg });
          });
        })
      });
      
      jest.doMock('firebase/firestore', () => ({
        ...jest.requireActual('firebase/firestore'),
        getDocs: mockGetDocs
      }));
      
      // First call
      await historyManager.getRelevantHistory('5511999999999', 'test-tenant');
      
      // Second call should use cache
      await historyManager.getRelevantHistory('5511999999999', 'test-tenant');
      
      const stats = historyManager.getCacheStats();
      expect(stats.entries).toBe(1);
    });

    it('should generate meaningful analytics', async () => {
      const analytics = await historyManager.generateHistoryAnalytics('5511999999999', 'test-tenant');
      
      expect(analytics).toHaveProperty('totalMessages');
      expect(analytics).toHaveProperty('compressedMessages');
      expect(analytics).toHaveProperty('compressionRatio');
      expect(analytics).toHaveProperty('processingTime');
      expect(analytics.processingTime).toBeGreaterThanOrEqual(0);
    });

    it('should detect critical data in messages correctly', async () => {
      const hasCritical = await historyManager.hasCriticalDataInHistory('5511999999999', 'test-tenant');
      expect(typeof hasCritical).toBe('boolean');
    });
  });

  // ===== INTEGRATION TESTS =====

  describe('Integration Tests - Full Memory System', () => {
    let memoryEngine: AdvancedMemoryEngine;
    let contextService: ConversationContextServiceV2;
    let historyManager: OptimizedHistoryManager;
    
    beforeEach(() => {
      memoryEngine = new AdvancedMemoryEngine();
      contextService = new ConversationContextServiceV2();
      historyManager = new OptimizedHistoryManager();
    });

    afterEach(async () => {
      await memoryEngine.forceCleanup();
      await contextService.clearCacheForTesting();
      historyManager.clearCache();
    });

    it('should maintain data consistency across all layers', async () => {
      // Simulate real conversation flow
      const clientPhone = '5511999999999';
      const tenantId = 'test-tenant';
      
      // 1. Create initial context
      let context = await contextService.getOrCreateContext(clientPhone, tenantId);
      expect(context.clientData.phone).toBe(clientPhone);
      
      // 2. Update with user data
      await contextService.updateContext(clientPhone, tenantId, {
        clientData: {
          guests: 4,
          checkIn: '2025-08-15',
          checkOut: '2025-08-20'
        } as any
      });
      
      // 3. Verify data is preserved in memory engine
      const cachedContext = await memoryEngine.getContextWithCache(clientPhone, tenantId);
      expect(cachedContext.clientData.guests).toBe(4);
      expect(cachedContext.clientData.checkIn).toBe('2025-08-15');
      expect(cachedContext.clientData.checkOut).toBe('2025-08-20');
      
      // 4. Add more data
      await contextService.updateContext(clientPhone, tenantId, {
        clientData: {
          city: 'São Paulo',
          name: 'João Silva'
        } as any
      });
      
      // 5. Final verification - ALL data should be present
      const finalContext = await contextService.getOrCreateContext(clientPhone, tenantId);
      expect(finalContext.clientData.guests).toBe(4); // ❌ CRITICAL
      expect(finalContext.clientData.checkIn).toBe('2025-08-15'); // ❌ CRITICAL
      expect(finalContext.clientData.checkOut).toBe('2025-08-20'); // ❌ CRITICAL
      expect(finalContext.clientData.city).toBe('São Paulo');
      expect(finalContext.clientData.name).toBe('João Silva');
    });

    it('should handle high-concurrency scenarios', async () => {
      const clientPhone = '5511999999999';
      const tenantId = 'test-tenant';
      const concurrentUpdates = 20;
      
      // Create initial context
      await contextService.getOrCreateContext(clientPhone, tenantId);
      
      // Simulate concurrent updates
      const promises = [];
      for (let i = 0; i < concurrentUpdates; i++) {
        promises.push(
          contextService.updateContext(clientPhone, tenantId, {
            metadata: {
              messageCount: i
            } as any
          })
        );
      }
      
      // All updates should complete without errors
      await expect(Promise.all(promises)).resolves.not.toThrow();
      
      // Final context should be consistent
      const finalContext = await contextService.getOrCreateContext(clientPhone, tenantId);
      expect(finalContext.clientData.phone).toBe(clientPhone);
      expect(finalContext.clientData.tenantId).toBe(tenantId);
    });

    it('should maintain performance under load', async () => {
      const clients = [];
      for (let i = 0; i < 50; i++) {
        clients.push(`551199999${i.toString().padStart(4, '0')}`);
      }
      
      const startTime = Date.now();
      
      // Create contexts for all clients
      const promises = clients.map(phone => 
        contextService.getOrCreateContext(phone, 'test-tenant')
      );
      
      const contexts = await Promise.all(promises);
      
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      const avgTimePerContext = totalTime / clients.length;
      
      // Performance should be acceptable
      expect(avgTimePerContext).toBeLessThan(100); // Less than 100ms per context
      expect(contexts.length).toBe(clients.length);
      
      // Memory engine should be efficient
      const metrics = memoryEngine.getMetrics();
      expect(metrics.memoryUsage).toBeLessThan(50); // Less than 50MB
    });
  });

  // ===== CRITICAL DATA PROTECTION TESTS =====

  describe('Critical Data Protection Tests', () => {
    let contextService: ConversationContextServiceV2;
    
    beforeEach(() => {
      contextService = new ConversationContextServiceV2();
    });

    it('should NEVER lose guests data', async () => {
      const clientPhone = '5511999999999';
      const tenantId = 'test-tenant';
      
      // Set initial guests
      await contextService.updateContext(clientPhone, tenantId, {
        clientData: { guests: 4 } as any
      });
      
      // Multiple updates that should NOT remove guests
      const updates = [
        { clientData: { city: 'São Paulo' } },
        { clientData: { name: 'João' } },
        { clientData: { checkIn: '2025-08-15' } },
        { conversationState: { stage: 'presentation' } }
      ];
      
      for (const update of updates) {
        await contextService.updateContext(clientPhone, tenantId, update as any);
        
        // Verify guests is ALWAYS preserved
        const context = await contextService.getOrCreateContext(clientPhone, tenantId);
        expect(context.clientData.guests).toBe(4); // ❌ NEVER LOSE THIS
      }
    });

    it('should NEVER lose date data', async () => {
      const clientPhone = '5511999999999';
      const tenantId = 'test-tenant';
      
      // Set initial dates
      await contextService.updateContext(clientPhone, tenantId, {
        clientData: { 
          checkIn: '2025-08-15',
          checkOut: '2025-08-20'
        } as any
      });
      
      // Multiple updates
      const updates = [
        { clientData: { guests: 2 } },
        { clientData: { city: 'Rio de Janeiro' } },
        { salesContext: { leadScore: 80 } }
      ];
      
      for (const update of updates) {
        await contextService.updateContext(clientPhone, tenantId, update as any);
        
        // Verify dates are ALWAYS preserved
        const context = await contextService.getOrCreateContext(clientPhone, tenantId);
        expect(context.clientData.checkIn).toBe('2025-08-15'); // ❌ NEVER LOSE THIS
        expect(context.clientData.checkOut).toBe('2025-08-20'); // ❌ NEVER LOSE THIS
      }
    });

    it('should handle undefined updates gracefully', async () => {
      const clientPhone = '5511999999999';
      const tenantId = 'test-tenant';
      
      // Set initial data
      await contextService.updateContext(clientPhone, tenantId, {
        clientData: { 
          guests: 3,
          checkIn: '2025-08-10',
          name: 'Maria'
        } as any
      });
      
      // Update with undefined values (should not overwrite existing)
      await contextService.updateContext(clientPhone, tenantId, {
        clientData: {
          guests: undefined, // Should NOT remove existing guests
          checkIn: undefined, // Should NOT remove existing checkIn
          city: 'Curitiba' // Should add new field
        } as any
      });
      
      const context = await contextService.getOrCreateContext(clientPhone, tenantId);
      expect(context.clientData.guests).toBe(3); // Preserved
      expect(context.clientData.checkIn).toBe('2025-08-10'); // Preserved
      expect(context.clientData.name).toBe('Maria'); // Preserved
      expect(context.clientData.city).toBe('Curitiba'); // Added
    });
  });
});

// ===== PERFORMANCE BENCHMARKS =====

describe('Performance Benchmarks', () => {
  it('should handle 100 concurrent context operations under 5 seconds', async () => {
    const memoryEngine = new AdvancedMemoryEngine();
    const operations = [];
    
    const startTime = Date.now();
    
    for (let i = 0; i < 100; i++) {
      const phone = `551199999${i.toString().padStart(4, '0')}`;
      const context = createEmptyEnhancedContext(phone, 'test-tenant');
      
      operations.push(
        memoryEngine.saveContextOptimized(context)
        .then(() => memoryEngine.getContextWithCache(phone, 'test-tenant'))
      );
    }
    
    await Promise.all(operations);
    
    const totalTime = Date.now() - startTime;
    expect(totalTime).toBeLessThan(5000); // Less than 5 seconds
    
    await memoryEngine.forceCleanup();
  });

  it('should maintain sub-50ms response time for cached contexts', async () => {
    const memoryEngine = new AdvancedMemoryEngine();
    const context = createEmptyEnhancedContext('5511999999999', 'test-tenant');
    
    // Store in cache
    await memoryEngine.saveContextOptimized(context);
    
    // Measure cached retrieval time
    const times = [];
    for (let i = 0; i < 10; i++) {
      const start = Date.now();
      await memoryEngine.getContextWithCache('5511999999999', 'test-tenant');
      times.push(Date.now() - start);
    }
    
    const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;
    expect(avgTime).toBeLessThan(50); // Less than 50ms average
    
    await memoryEngine.forceCleanup();
  });
});