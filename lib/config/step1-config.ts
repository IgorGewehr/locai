// lib/config/step1-config.ts
// STEP 1 CONFIGURATION - Configuração centralizada para o sistema de memória
// Permite fácil ajuste de parâmetros sem modificar código

export const STEP1_CONFIG = {
  // ===== MEMORY ENGINE CONFIGURATION =====
  memoryEngine: {
    // L1 Cache (Ultra-fast memory)
    l1Cache: {
      maxSize: 1000,                    // Máximo 1000 contextos
      ttlMs: 5 * 60 * 1000,            // 5 minutos TTL
      cleanupIntervalMs: 60 * 1000,    // Cleanup a cada 1 minuto
      evictionStrategy: 'LRU'          // Least Recently Used
    },
    
    // L2 Cache (Fast memory) 
    l2Cache: {
      maxSize: 5000,                   // Máximo 5000 contextos
      ttlMs: 60 * 60 * 1000,          // 1 hora TTL
      cleanupIntervalMs: 5 * 60 * 1000, // Cleanup a cada 5 minutos
      evictionStrategy: 'INTELLIGENT'   // Baseado em hits e idade
    },
    
    // Performance thresholds
    performance: {
      maxResponseTimeMs: 50,           // L1 cache deve responder em <50ms
      maxMemoryUsageMB: 100,           // Máximo 100MB total
      minHitRate: 0.8,                 // Mínimo 80% hit rate
      alertThresholds: {
        responseTime: 100,             // Alertar se >100ms
        memoryUsage: 150,              // Alertar se >150MB
        hitRate: 0.6                   // Alertar se <60%
      }
    }
  },
  
  // ===== CONTEXT SERVICE CONFIGURATION =====
  contextService: {
    // TTL and persistence
    ttlHours: 24,                      // 24 horas TTL
    maxContextSizeBytes: 100000,       // 100KB max por contexto
    batchUpdateSize: 10,               // Máximo 10 updates por batch
    
    // Critical fields protection
    criticalFields: [
      'clientData.guests',
      'clientData.checkIn',
      'clientData.checkOut',
      'clientData.city',
      'clientData.name',
      'clientData.phone',
      'clientData.tenantId'
    ],
    
    // Validation settings
    validation: {
      strictMode: true,                // Validação rigorosa
      allowPartialUpdates: true,       // Permitir updates parciais
      requireCriticalFields: ['clientData.phone', 'clientData.tenantId'],
      dateValidation: true,            // Validar datas
      guestCountValidation: true       // Validar número de hóspedes
    },
    
    // Retry and recovery
    retry: {
      maxAttempts: 3,
      backoffMs: 1000,                 // 1 segundo
      exponentialBackoff: true
    }
  },
  
  // ===== HISTORY MANAGER CONFIGURATION =====
  historyManager: {
    // Message limits
    maxMessages: 50,                   // Máximo 50 mensagens
    maxCompressedMessages: 30,         // Máximo 30 após compressão
    recentMessageWindow: 10,           // Sempre manter últimas 10
    
    // Compression settings
    compression: {
      enabled: true,
      criticalThreshold: 70,           // Score >= 70 é mantido
      recencyWindowHours: 2,           // Últimas 2 horas sempre mantidas
      keywordBoostFactor: 1.5,         // 50% boost para keywords críticas
      compressionRatio: 0.6            // Manter 60% das mensagens
    },
    
    // Keywords for relevance analysis
    criticalKeywords: {
      clientData: {
        weight: 15,
        keywords: ['nome', 'cpf', 'documento', 'email', 'telefone']
      },
      requirements: {
        weight: 20,
        keywords: ['guests', 'pessoas', 'hóspedes', 'quantos', 'quantidade']
      },
      dates: {
        weight: 20,
        keywords: ['check-in', 'checkout', 'chegar', 'sair', 'data', 'quando', 'dia']
      },
      location: {
        weight: 10,
        keywords: ['onde', 'local', 'cidade', 'região', 'bairro', 'endereço']
      },
      pricing: {
        weight: 15,
        keywords: ['preço', 'valor', 'custa', 'quanto', 'orçamento', 'dinheiro', 'real']
      },
      interest: {
        weight: 25,
        keywords: ['gostei', 'interessante', 'quero', 'vou', 'aceito', 'confirmo']
      },
      objections: {
        weight: 10,
        keywords: ['caro', 'longe', 'pequeno', 'não gostei', 'problema', 'mas']
      },
      conversion: {
        weight: 30,
        keywords: ['reservar', 'confirmar', 'fechar', 'visitar', 'conhecer', 'agendar']
      }
    },
    
    // Cache settings
    cache: {
      enabled: true,
      ttlMs: 5 * 60 * 1000,           // 5 minutos TTL
      maxEntries: 1000                 // Máximo 1000 históricos em cache
    }
  },
  
  // ===== INTEGRATION SETTINGS =====
  integration: {
    // Health check intervals
    healthCheckIntervalMs: 30 * 1000,   // A cada 30 segundos
    performanceMonitoringMs: 60 * 1000, // A cada 1 minuto
    
    // Validation criteria (Step 1 requirements)
    validationCriteria: {
      zeroDataLoss: true,                // Obrigatório
      contextRetrievalMaxMs: 50,         // <50ms para cache
      contextPersistenceMaxMs: 200,      // <200ms para persistence
      maxMemoryUsageMB: 10,              // <10MB para 100 conversas
      historyRetentionHours: 24          // 24h retention
    },
    
    // Monitoring and alerts
    monitoring: {
      enabled: true,
      logLevel: 'INFO',
      metricsCollectionMs: 30 * 1000,   // A cada 30 segundos
      alertOnFailure: true,
      alertThresholds: {
        errorRate: 0.05,                 // >5% error rate
        responseTime: 1000,              // >1s response time
        memoryUsage: 200                 // >200MB memory usage
      }
    }
  },
  
  // ===== PRODUCTION OPTIMIZATION =====
  production: {
    // Aggressive optimization for production
    aggressiveCleanup: true,
    backgroundProcessing: true,
    batchOperations: true,
    connectionPooling: true,
    
    // Resource limits
    maxConcurrentOperations: 100,
    maxBatchSize: 50,
    maxRetryAttempts: 5,
    circuitBreakerThreshold: 10,
    
    // Performance targets
    targetResponseTimeMs: 500,          // <500ms response time
    targetMemoryUsageMB: 50,            // <50MB memory usage
    targetCacheHitRate: 0.9,            // >90% cache hit rate
    targetThroughput: 1000              // 1000 operations/second
  },
  
  // ===== DEVELOPMENT SETTINGS =====
  development: {
    // More relaxed settings for development
    verbose: true,
    debugMode: true,
    extendedLogging: true,
    skipValidation: false,
    
    // Smaller limits for development
    l1CacheSize: 100,
    l2CacheSize: 500,
    maxMessages: 20,
    
    // Faster cleanup for testing
    cleanupIntervalMs: 10 * 1000       // 10 segundos
  },
  
  // ===== TESTING CONFIGURATION =====
  testing: {
    // Test-specific settings
    mockFirebase: true,
    fastCleanup: true,
    skipAsyncOperations: false,
    deterministicTiming: true,
    
    // Test data
    testPhone: '5511999999999',
    testTenant: 'test-tenant',
    testContextData: {
      guests: 4,
      checkIn: '2025-08-15',
      checkOut: '2025-08-20',
      city: 'São Paulo',
      name: 'João Silva'
    }
  }
} as const;

// ===== ENVIRONMENT-SPECIFIC CONFIGURATION =====

export function getStep1Config() {
  const env = process.env.NODE_ENV || 'development';
  
  switch (env) {
    case 'production':
      return {
        ...STEP1_CONFIG,
        memoryEngine: {
          ...STEP1_CONFIG.memoryEngine,
          l1Cache: {
            ...STEP1_CONFIG.memoryEngine.l1Cache,
            maxSize: STEP1_CONFIG.production.maxConcurrentOperations * 2
          }
        },
        contextService: {
          ...STEP1_CONFIG.contextService,
          validation: {
            ...STEP1_CONFIG.contextService.validation,
            strictMode: true
          }
        }
      };
      
    case 'test':
      return {
        ...STEP1_CONFIG,
        memoryEngine: {
          ...STEP1_CONFIG.memoryEngine,
          l1Cache: {
            ...STEP1_CONFIG.memoryEngine.l1Cache,
            maxSize: STEP1_CONFIG.testing.testContextData ? 10 : 100,
            ttlMs: 1000 // 1 segundo para testes rápidos
          }
        },
        contextService: {
          ...STEP1_CONFIG.contextService,
          ttlHours: 1 // 1 hora para testes
        }
      };
      
    case 'development':
    default:
      return {
        ...STEP1_CONFIG,
        memoryEngine: {
          ...STEP1_CONFIG.memoryEngine,
          l1Cache: {
            ...STEP1_CONFIG.memoryEngine.l1Cache,
            maxSize: STEP1_CONFIG.development.l1CacheSize
          },
          l2Cache: {
            ...STEP1_CONFIG.memoryEngine.l2Cache,
            maxSize: STEP1_CONFIG.development.l2CacheSize
          }
        },
        historyManager: {
          ...STEP1_CONFIG.historyManager,
          maxMessages: STEP1_CONFIG.development.maxMessages
        }
      };
  }
}

// ===== CONFIGURATION VALIDATION =====

export function validateStep1Config(config = STEP1_CONFIG) {
  const errors = [];
  
  // Validate memory engine settings
  if (config.memoryEngine.l1Cache.maxSize <= 0) {
    errors.push('L1 cache max size must be positive');
  }
  
  if (config.memoryEngine.l1Cache.ttlMs <= 0) {
    errors.push('L1 cache TTL must be positive');
  }
  
  if (config.memoryEngine.l2Cache.maxSize <= config.memoryEngine.l1Cache.maxSize) {
    errors.push('L2 cache must be larger than L1 cache');
  }
  
  // Validate context service settings
  if (config.contextService.ttlHours <= 0) {
    errors.push('Context TTL must be positive');
  }
  
  if (config.contextService.criticalFields.length === 0) {
    errors.push('Must have at least one critical field defined');
  }
  
  // Validate history manager settings
  if (config.historyManager.maxMessages <= 0) {
    errors.push('Max messages must be positive');
  }
  
  if (config.historyManager.compression.compressionRatio <= 0 || 
      config.historyManager.compression.compressionRatio > 1) {
    errors.push('Compression ratio must be between 0 and 1');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

export default STEP1_CONFIG;