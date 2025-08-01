// lib/services/performance-monitor.ts
// PERFORMANCE MONITOR - STEP 2 IMPLEMENTATION
// Monitor de performance em tempo real para otimização contínua

import { 
  EnhancedConversationContext,
  extractCriticalData 
} from '@/lib/types/context-types-enhanced';
import { logger } from '@/lib/utils/logger';

// ===== INTERFACES =====

export interface PerformanceMetrics {
  responseTime: number;              // Tempo de resposta em ms
  tokensUsed: number;                // Tokens consumidos
  functionsExecuted: number;         // Funções AI executadas
  cacheHitRate: number;              // Taxa de acerto do cache
  memoryUsage: number;               // Uso de memória em MB
  concurrentConnections: number;     // Conexões simultâneas
  errorRate: number;                 // Taxa de erro (%)
  throughput: number;                // Requisições por minuto
  cpuUsage: number;                  // Uso de CPU (%)
  timestamp: Date;
}

export interface PerformanceAlert {
  id: string;
  type: 'warning' | 'critical' | 'info';
  metric: string;
  currentValue: number;
  threshold: number;
  message: string;
  timestamp: Date;
  resolved: boolean;
}

export interface PerformanceThresholds {
  responseTimeWarning: number;       // ms
  responseTimeCritical: number;      // ms
  tokenUsageWarning: number;         // tokens per request
  tokenUsageCritical: number;        // tokens per request
  errorRateWarning: number;          // %
  errorRateCritical: number;         // %
  memoryUsageWarning: number;        // MB
  memoryUsageCritical: number;       // MB
  cacheHitRateWarning: number;       // %
}

export interface OptimizationSuggestion {
  type: 'cache' | 'prompts' | 'functions' | 'memory' | 'architecture';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  estimatedImpact: string;
  implementation: string[];
  timeToImplement: string;
}

// ===== PERFORMANCE MONITOR =====

export class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private alerts: PerformanceAlert[] = [];
  private activeConnections = 0;
  private requestCount = 0;
  private errorCount = 0;
  private totalResponseTime = 0;
  private totalTokensUsed = 0;
  private totalFunctionsExecuted = 0;
  
  private readonly MAX_METRICS_HISTORY = 1000;
  private readonly METRICS_WINDOW = 60000; // 1 minuto em ms
  
  private thresholds: PerformanceThresholds = {
    responseTimeWarning: 1500,         // 1.5s
    responseTimeCritical: 3000,        // 3s
    tokenUsageWarning: 600,            // 600 tokens por request
    tokenUsageCritical: 1000,          // 1000 tokens por request
    errorRateWarning: 5,               // 5%
    errorRateCritical: 10,             // 10%
    memoryUsageWarning: 100,           // 100MB
    memoryUsageCritical: 200,          // 200MB
    cacheHitRateWarning: 70            // 70%
  };

  constructor() {
    this.startMetricsCollection();
    this.startOptimizationEngine();
    
    logger.info('📊 [PerformanceMonitor] Performance monitor initialized', {
      thresholds: this.thresholds,
      metricsWindow: this.METRICS_WINDOW
    });
  }

  /**
   * Registrar início de uma requisição
   */
  startRequest(): string {
    this.activeConnections++;
    this.requestCount++;
    
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    logger.debug('🚀 [PerformanceMonitor] Request started', {
      requestId,
      activeConnections: this.activeConnections
    });
    
    return requestId;
  }

  /**
   * Registrar fim de uma requisição com métricas
   */
  endRequest(
    requestId: string,
    startTime: number,
    tokensUsed: number,
    functionsExecuted: number,
    success: boolean,
    cacheStats?: { hits: number; misses: number }
  ): void {
    this.activeConnections = Math.max(0, this.activeConnections - 1);
    
    const responseTime = Date.now() - startTime;
    this.totalResponseTime += responseTime;
    this.totalTokensUsed += tokensUsed;
    this.totalFunctionsExecuted += functionsExecuted;
    
    if (!success) {
      this.errorCount++;
    }

    // Calcular cache hit rate
    let cacheHitRate = 0;
    if (cacheStats && (cacheStats.hits + cacheStats.misses) > 0) {
      cacheHitRate = (cacheStats.hits / (cacheStats.hits + cacheStats.misses)) * 100;
    }

    // Criar métrica atual
    const currentMetric: PerformanceMetrics = {
      responseTime,
      tokensUsed,
      functionsExecuted,
      cacheHitRate,
      memoryUsage: this.estimateMemoryUsage(),
      concurrentConnections: this.activeConnections,
      errorRate: this.calculateErrorRate(),
      throughput: this.calculateThroughput(),
      cpuUsage: this.estimateCpuUsage(),
      timestamp: new Date()
    };

    // Adicionar às métricas
    this.metrics.push(currentMetric);
    this.cleanupOldMetrics();

    // Verificar alertas
    this.checkAlerts(currentMetric);

    logger.debug('✅ [PerformanceMonitor] Request completed', {
      requestId,
      responseTime,
      tokensUsed,
      functionsExecuted,
      success,
      cacheHitRate
    });

    // Log de performance crítica
    if (responseTime > this.thresholds.responseTimeCritical) {
      logger.warn('🐌 [PerformanceMonitor] Critical response time detected', {
        requestId,
        responseTime,
        threshold: this.thresholds.responseTimeCritical
      });
    }
  }

  /**
   * Obter métricas atuais
   */
  getCurrentMetrics(): PerformanceMetrics | null {
    return this.metrics.length > 0 ? this.metrics[this.metrics.length - 1] : null;
  }

  /**
   * Obter estatísticas agregadas do período
   */
  getAggregatedStats(windowMs: number = this.METRICS_WINDOW): {
    averageResponseTime: number;
    averageTokensUsed: number;
    averageFunctionsExecuted: number;
    averageCacheHitRate: number;
    averageMemoryUsage: number;
    peakConcurrentConnections: number;
    currentErrorRate: number;
    currentThroughput: number;
    totalRequests: number;
    performanceScore: number;
  } {
    const cutoffTime = Date.now() - windowMs;
    const recentMetrics = this.metrics.filter(m => m.timestamp.getTime() > cutoffTime);

    if (recentMetrics.length === 0) {
      return {
        averageResponseTime: 0,
        averageTokensUsed: 0,
        averageFunctionsExecuted: 0,
        averageCacheHitRate: 0,
        averageMemoryUsage: 0,
        peakConcurrentConnections: 0,
        currentErrorRate: 0,
        currentThroughput: 0,
        totalRequests: 0,
        performanceScore: 100
      };
    }

    const avg = (arr: number[]) => arr.reduce((sum, val) => sum + val, 0) / arr.length;
    
    const stats = {
      averageResponseTime: avg(recentMetrics.map(m => m.responseTime)),
      averageTokensUsed: avg(recentMetrics.map(m => m.tokensUsed)),
      averageFunctionsExecuted: avg(recentMetrics.map(m => m.functionsExecuted)),
      averageCacheHitRate: avg(recentMetrics.map(m => m.cacheHitRate)),
      averageMemoryUsage: avg(recentMetrics.map(m => m.memoryUsage)),
      peakConcurrentConnections: Math.max(...recentMetrics.map(m => m.concurrentConnections)),
      currentErrorRate: this.calculateErrorRate(),
      currentThroughput: this.calculateThroughput(),
      totalRequests: recentMetrics.length,
      performanceScore: this.calculatePerformanceScore(recentMetrics)
    };

    return stats;
  }

  /**
   * Obter alertas ativos
   */
  getActiveAlerts(): PerformanceAlert[] {
    return this.alerts.filter(alert => !alert.resolved);
  }

  /**
   * Obter sugestões de otimização
   */
  getOptimizationSuggestions(): OptimizationSuggestion[] {
    const stats = this.getAggregatedStats();
    const suggestions: OptimizationSuggestion[] = [];

    // Sugestão de otimização de resposta
    if (stats.averageResponseTime > this.thresholds.responseTimeWarning) {
      suggestions.push({
        type: 'architecture',
        priority: stats.averageResponseTime > this.thresholds.responseTimeCritical ? 'critical' : 'high',
        title: 'Otimizar Tempo de Resposta',
        description: `Tempo médio de resposta está em ${Math.round(stats.averageResponseTime)}ms, acima do ideal (${this.thresholds.responseTimeWarning}ms).`,
        estimatedImpact: 'Redução de 40-60% no tempo de resposta',
        implementation: [
          'Implementar execução paralela de funções',
          'Otimizar cache de propriedades',
          'Usar prompts mais concisos',
          'Implementar timeout otimizado'
        ],
        timeToImplement: '2-3 dias'
      });
    }

    // Sugestão de otimização de tokens
    if (stats.averageTokensUsed > this.thresholds.tokenUsageWarning) {
      suggestions.push({
        type: 'prompts',
        priority: stats.averageTokensUsed > this.thresholds.tokenUsageCritical ? 'critical' : 'high',
        title: 'Reduzir Consumo de Tokens',
        description: `Consumo médio de ${Math.round(stats.averageTokensUsed)} tokens por request, acima do ideal (${this.thresholds.tokenUsageWarning}).`,
        estimatedImpact: 'Redução de 60-75% no consumo de tokens',
        implementation: [
          'Implementar sistema de prompts ultra-otimizados',
          'Usar compressão contextual',
          'Otimizar histórico de mensagens',
          'Remover redundâncias nos prompts'
        ],
        timeToImplement: '1-2 dias'
      });
    }

    // Sugestão de otimização de cache
    if (stats.averageCacheHitRate < this.thresholds.cacheHitRateWarning) {
      suggestions.push({
        type: 'cache',
        priority: 'medium',
        title: 'Melhorar Eficiência do Cache',
        description: `Taxa de acerto do cache está em ${Math.round(stats.averageCacheHitRate)}%, abaixo do ideal (${this.thresholds.cacheHitRateWarning}%).`,
        estimatedImpact: 'Melhoria de 20-30% na performance geral',
        implementation: [
          'Implementar pre-loading de dados frequentes',
          'Otimizar TTL de cache por tipo de dado',
          'Adicionar cache de segundo nível',
          'Implementar cache predictivo'
        ],
        timeToImplement: '1-2 dias'
      });
    }

    // Sugestão de otimização de memória
    if (stats.averageMemoryUsage > this.thresholds.memoryUsageWarning) {
      suggestions.push({
        type: 'memory',
        priority: stats.averageMemoryUsage > this.thresholds.memoryUsageCritical ? 'critical' : 'medium',
        title: 'Otimizar Uso de Memória',
        description: `Uso médio de memória está em ${Math.round(stats.averageMemoryUsage)}MB, acima do ideal (${this.thresholds.memoryUsageWarning}MB).`,
        estimatedImpact: 'Redução de 30-50% no uso de memória',
        implementation: [
          'Implementar garbage collection otimizado',
          'Comprimir dados em cache',
          'Otimizar estruturas de dados',
          'Implementar cleanup automático'
        ],
        timeToImplement: '2-3 dias'
      });
    }

    // Sugestão de otimização de funções
    if (stats.averageFunctionsExecuted > 5) {
      suggestions.push({
        type: 'functions',
        priority: 'medium',
        title: 'Otimizar Execução de Funções',
        description: `Média de ${Math.round(stats.averageFunctionsExecuted)} funções por request. Potencial para execução paralela.`,
        estimatedImpact: 'Redução de 50-80% no tempo de execução',
        implementation: [
          'Implementar execução paralela inteligente',
          'Otimizar dependências entre funções',
          'Usar cache de resultados de funções',
          'Implementar batching de funções similares'
        ],
        timeToImplement: '3-4 dias'
      });
    }

    return suggestions.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * Resolver alerta
   */
  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      logger.info('✅ [PerformanceMonitor] Alert resolved', { alertId, alert: alert.message });
      return true;
    }
    return false;
  }

  /**
   * Configurar novos thresholds
   */
  updateThresholds(newThresholds: Partial<PerformanceThresholds>): void {
    this.thresholds = { ...this.thresholds, ...newThresholds };
    logger.info('⚙️ [PerformanceMonitor] Thresholds updated', { thresholds: this.thresholds });
  }

  // ===== MÉTODOS PRIVADOS =====

  private startMetricsCollection(): void {
    // Coletar métricas de sistema a cada 30 segundos
    setInterval(() => {
      this.collectSystemMetrics();
    }, 30000);
  }

  private startOptimizationEngine(): void {
    // Executar análise de otimização a cada 5 minutos
    setInterval(() => {
      this.runOptimizationAnalysis();
    }, 5 * 60 * 1000);
  }

  private collectSystemMetrics(): void {
    const stats = this.getAggregatedStats();
    
    // Log métricas importantes
    if (stats.totalRequests > 0) {
      logger.info('📊 [PerformanceMonitor] System metrics', {
        averageResponseTime: Math.round(stats.averageResponseTime),
        averageTokensUsed: Math.round(stats.averageTokensUsed),
        cacheHitRate: Math.round(stats.averageCacheHitRate),
        throughput: Math.round(stats.currentThroughput),
        performanceScore: Math.round(stats.performanceScore),
        activeAlerts: this.getActiveAlerts().length
      });
    }
  }

  private runOptimizationAnalysis(): void {
    const suggestions = this.getOptimizationSuggestions();
    
    if (suggestions.length > 0) {
      logger.info('💡 [PerformanceMonitor] Optimization analysis', {
        totalSuggestions: suggestions.length,
        criticalSuggestions: suggestions.filter(s => s.priority === 'critical').length,
        highPrioritySuggestions: suggestions.filter(s => s.priority === 'high').length
      });

      // Log sugestões críticas
      const criticalSuggestions = suggestions.filter(s => s.priority === 'critical');
      criticalSuggestions.forEach(suggestion => {
        logger.warn('🚨 [PerformanceMonitor] Critical optimization needed', {
          title: suggestion.title,
          description: suggestion.description,
          estimatedImpact: suggestion.estimatedImpact
        });
      });
    }
  }

  private checkAlerts(metric: PerformanceMetrics): void {
    const now = new Date();

    // Alert de tempo de resposta
    if (metric.responseTime > this.thresholds.responseTimeCritical) {
      this.createAlert('critical', 'responseTime', metric.responseTime, this.thresholds.responseTimeCritical, 
        `Tempo de resposta crítico: ${metric.responseTime}ms`, now);
    } else if (metric.responseTime > this.thresholds.responseTimeWarning) {
      this.createAlert('warning', 'responseTime', metric.responseTime, this.thresholds.responseTimeWarning,
        `Tempo de resposta alto: ${metric.responseTime}ms`, now);
    }

    // Alert de tokens
    if (metric.tokensUsed > this.thresholds.tokenUsageCritical) {
      this.createAlert('critical', 'tokensUsed', metric.tokensUsed, this.thresholds.tokenUsageCritical,
        `Consumo crítico de tokens: ${metric.tokensUsed}`, now);
    } else if (metric.tokensUsed > this.thresholds.tokenUsageWarning) {
      this.createAlert('warning', 'tokensUsed', metric.tokensUsed, this.thresholds.tokenUsageWarning,
        `Consumo alto de tokens: ${metric.tokensUsed}`, now);
    }

    // Alert de taxa de erro
    if (metric.errorRate > this.thresholds.errorRateCritical) {
      this.createAlert('critical', 'errorRate', metric.errorRate, this.thresholds.errorRateCritical,
        `Taxa de erro crítica: ${metric.errorRate.toFixed(1)}%`, now);
    } else if (metric.errorRate > this.thresholds.errorRateWarning) {
      this.createAlert('warning', 'errorRate', metric.errorRate, this.thresholds.errorRateWarning,
        `Taxa de erro alta: ${metric.errorRate.toFixed(1)}%`, now);
    }

    // Alert de cache hit rate
    if (metric.cacheHitRate < this.thresholds.cacheHitRateWarning && metric.cacheHitRate > 0) {
      this.createAlert('warning', 'cacheHitRate', metric.cacheHitRate, this.thresholds.cacheHitRateWarning,
        `Taxa de cache baixa: ${metric.cacheHitRate.toFixed(1)}%`, now);
    }
  }

  private createAlert(
    type: 'warning' | 'critical' | 'info',
    metric: string,
    currentValue: number,
    threshold: number,
    message: string,
    timestamp: Date
  ): void {
    const alertId = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    
    const alert: PerformanceAlert = {
      id: alertId,
      type,
      metric,
      currentValue,
      threshold,
      message,
      timestamp,
      resolved: false
    };

    this.alerts.push(alert);
    
    // Limitar histórico de alertas
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100);
    }

    logger.warn(`🚨 [PerformanceMonitor] ${type.toUpperCase()} Alert`, {
      alertId,
      metric,
      currentValue,
      threshold,
      message
    });
  }

  private calculateErrorRate(): number {
    if (this.requestCount === 0) return 0;
    return (this.errorCount / this.requestCount) * 100;
  }

  private calculateThroughput(): number {
    // Requests por minuto baseado no último minuto
    const oneMinuteAgo = Date.now() - 60000;
    const recentMetrics = this.metrics.filter(m => m.timestamp.getTime() > oneMinuteAgo);
    return recentMetrics.length;
  }

  private calculatePerformanceScore(metrics: PerformanceMetrics[]): number {
    if (metrics.length === 0) return 100;

    const avg = (arr: number[]) => arr.reduce((sum, val) => sum + val, 0) / arr.length;
    
    let score = 100;
    
    // Penalizar tempo de resposta alto
    const avgResponseTime = avg(metrics.map(m => m.responseTime));
    if (avgResponseTime > this.thresholds.responseTimeWarning) {
      score -= Math.min(30, (avgResponseTime - this.thresholds.responseTimeWarning) / 100);
    }
    
    // Penalizar consumo de tokens alto
    const avgTokens = avg(metrics.map(m => m.tokensUsed));
    if (avgTokens > this.thresholds.tokenUsageWarning) {
      score -= Math.min(20, (avgTokens - this.thresholds.tokenUsageWarning) / 50);
    }
    
    // Penalizar cache hit rate baixo
    const avgCacheHitRate = avg(metrics.map(m => m.cacheHitRate));
    if (avgCacheHitRate < this.thresholds.cacheHitRateWarning && avgCacheHitRate > 0) {
      score -= Math.min(15, (this.thresholds.cacheHitRateWarning - avgCacheHitRate) / 2);
    }
    
    // Penalizar taxa de erro
    const errorRate = this.calculateErrorRate();
    if (errorRate > this.thresholds.errorRateWarning) {
      score -= Math.min(25, errorRate * 2);
    }
    
    return Math.max(0, Math.round(score));
  }

  private estimateMemoryUsage(): number {
    // Estimativa simples baseada no número de métricas em memória
    const baseMemory = 10; // 10MB base
    const metricsMemory = this.metrics.length * 0.001; // ~1KB por métrica
    const alertsMemory = this.alerts.length * 0.0005; // ~0.5KB por alert
    
    return baseMemory + metricsMemory + alertsMemory;
  }

  private estimateCpuUsage(): number {
    // Estimativa simples baseada na atividade
    const baseCpu = 5; // 5% base
    const connectionsCpu = this.activeConnections * 2; // 2% por conexão ativa
    const requestsCpu = Math.min(20, this.calculateThroughput() * 0.5); // 0.5% por request/min
    
    return Math.min(100, baseCpu + connectionsCpu + requestsCpu);
  }

  private cleanupOldMetrics(): void {
    if (this.metrics.length > this.MAX_METRICS_HISTORY) {
      this.metrics = this.metrics.slice(-this.MAX_METRICS_HISTORY);
    }

    // Remover métricas muito antigas (mais de 1 hora)
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    this.metrics = this.metrics.filter(m => m.timestamp.getTime() > oneHourAgo);
  }

  /**
   * Obter relatório completo de performance
   */
  getPerformanceReport(): {
    summary: any;
    recentMetrics: PerformanceMetrics[];
    activeAlerts: PerformanceAlert[];
    optimizationSuggestions: OptimizationSuggestion[];
    thresholds: PerformanceThresholds;
  } {
    return {
      summary: this.getAggregatedStats(),
      recentMetrics: this.metrics.slice(-20), // Últimas 20 métricas
      activeAlerts: this.getActiveAlerts(),
      optimizationSuggestions: this.getOptimizationSuggestions(),
      thresholds: this.thresholds
    };
  }

  /**
   * Resetar contadores para testes
   */
  resetCounters(): void {
    this.requestCount = 0;
    this.errorCount = 0;
    this.totalResponseTime = 0;
    this.totalTokensUsed = 0;
    this.totalFunctionsExecuted = 0;
    this.metrics = [];
    this.alerts = [];
    
    logger.info('🔄 [PerformanceMonitor] Counters reset');
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor();

export default PerformanceMonitor;