// lib/monitoring/agent-monitor.ts

import { logger } from '@/lib/utils/logger';

interface AgentMetrics {
  // Métricas básicas do agente
  totalRequests: number;
  cacheHits: number;
  totalTokens: number;
  totalCost: number;
  errorsCount: 0;
  averageResponseTime: number;
  
  // Métricas CRM integradas
  leadsCreated: number;
  leadsUpdated: number;
  conversionsToReservation: number;
  conversionsToPayment: number;
  
  // Métricas de funções
  functionsExecuted: Record<string, number>;
  functionSuccessRate: Record<string, { success: number; total: number }>;
  
  // Métricas por tenant
  tenantActivity: Record<string, {
    requests: number;
    leads: number;
    reservations: number;
    revenue: number;
  }>;
}

export class AgentMonitor {
  private static metrics: AgentMetrics = {
    totalRequests: 0,
    cacheHits: 0,
    totalTokens: 0,
    totalCost: 0,
    errorsCount: 0,
    averageResponseTime: 0,
    leadsCreated: 0,
    leadsUpdated: 0,
    conversionsToReservation: 0,
    conversionsToPayment: 0,
    functionsExecuted: {},
    functionSuccessRate: {},
    tenantActivity: {}
  };

  static recordRequest(
    tokensUsed: number, 
    fromCache: boolean, 
    responseTime: number,
    tenantId?: string,
    functionsExecuted?: string[]
  ) {
    this.metrics.totalRequests++;
    this.metrics.totalTokens += tokensUsed;
    
    if (fromCache) {
      this.metrics.cacheHits++;
    }
    
    // Calcular custo (GPT-4o Mini: mais barato que GPT-3.5)
    const estimatedCost = (tokensUsed / 1000) * 0.00015; // GPT-4o Mini pricing
    this.metrics.totalCost += estimatedCost;
    
    // Média móvel do tempo de resposta
    this.metrics.averageResponseTime = 
      (this.metrics.averageResponseTime * (this.metrics.totalRequests - 1) + responseTime) / 
      this.metrics.totalRequests;

    // Rastrear atividade por tenant
    if (tenantId) {
      if (!this.metrics.tenantActivity[tenantId]) {
        this.metrics.tenantActivity[tenantId] = {
          requests: 0,
          leads: 0,
          reservations: 0,
          revenue: 0
        };
      }
      this.metrics.tenantActivity[tenantId].requests++;
    }

    // Rastrear funções executadas
    if (functionsExecuted) {
      functionsExecuted.forEach(func => {
        this.metrics.functionsExecuted[func] = (this.metrics.functionsExecuted[func] || 0) + 1;
      });
    }
  }

  static recordError(functionName?: string) {
    this.metrics.errorsCount++;
    
    // Rastrear taxa de sucesso da função
    if (functionName) {
      if (!this.metrics.functionSuccessRate[functionName]) {
        this.metrics.functionSuccessRate[functionName] = { success: 0, total: 0 };
      }
      this.metrics.functionSuccessRate[functionName].total++;
    }
  }

  static recordFunctionSuccess(functionName: string) {
    if (!this.metrics.functionSuccessRate[functionName]) {
      this.metrics.functionSuccessRate[functionName] = { success: 0, total: 0 };
    }
    this.metrics.functionSuccessRate[functionName].success++;
    this.metrics.functionSuccessRate[functionName].total++;
  }

  // Métricas específicas do CRM
  static recordLeadCreated(tenantId: string) {
    this.metrics.leadsCreated++;
    if (this.metrics.tenantActivity[tenantId]) {
      this.metrics.tenantActivity[tenantId].leads++;
    }
    logger.info('📈 [Metrics] Lead criado', { tenantId, totalLeads: this.metrics.leadsCreated });
  }

  static recordLeadUpdated(tenantId: string) {
    this.metrics.leadsUpdated++;
    logger.info('📊 [Metrics] Lead atualizado', { tenantId, totalUpdates: this.metrics.leadsUpdated });
  }

  static recordReservationConversion(tenantId: string, revenue?: number) {
    this.metrics.conversionsToReservation++;
    if (this.metrics.tenantActivity[tenantId]) {
      this.metrics.tenantActivity[tenantId].reservations++;
      if (revenue) {
        this.metrics.tenantActivity[tenantId].revenue += revenue;
      }
    }
    logger.info('💰 [Metrics] Conversão para reserva', { 
      tenantId, 
      totalConversions: this.metrics.conversionsToReservation,
      revenue
    });
  }

  static recordPaymentConversion(tenantId: string) {
    this.metrics.conversionsToPayment++;
    logger.info('💳 [Metrics] Conversão para pagamento', { 
      tenantId, 
      totalPaymentConversions: this.metrics.conversionsToPayment 
    });
  }

  static getMetrics() {
    const totalRequests = this.metrics.totalRequests || 1; // Evitar divisão por zero
    
    return {
      ...this.metrics,
      // Métricas calculadas
      cacheHitRate: (this.metrics.cacheHits / totalRequests) * 100,
      averageCostPerRequest: this.metrics.totalCost / totalRequests,
      errorRate: (this.metrics.errorsCount / totalRequests) * 100,
      
      // Taxa de conversão CRM
      leadToReservationRate: this.metrics.leadsCreated > 0 
        ? (this.metrics.conversionsToReservation / this.metrics.leadsCreated) * 100 
        : 0,
      reservationToPaymentRate: this.metrics.conversionsToReservation > 0
        ? (this.metrics.conversionsToPayment / this.metrics.conversionsToReservation) * 100
        : 0,
      
      // Taxa de sucesso das funções
      functionSuccessRates: Object.entries(this.metrics.functionSuccessRate).reduce((acc, [func, data]) => {
        acc[func] = data.total > 0 ? (data.success / data.total) * 100 : 0;
        return acc;
      }, {} as Record<string, number>),
      
      // Top funções mais usadas
      topFunctions: Object.entries(this.metrics.functionsExecuted)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .reduce((acc, [func, count]) => {
          acc[func] = count;
          return acc;
        }, {} as Record<string, number>)
    };
  }

  static resetDaily() {
    // Backup métricas antes de resetar (para analytics históricos)
    const dailySnapshot = { ...this.metrics, timestamp: new Date() };
    logger.info('📊 [Metrics] Snapshot diário', dailySnapshot);
    
    // Reset completo
    this.metrics = {
      totalRequests: 0,
      cacheHits: 0,
      totalTokens: 0,
      totalCost: 0,
      errorsCount: 0,
      averageResponseTime: 0,
      leadsCreated: 0,
      leadsUpdated: 0,
      conversionsToReservation: 0,
      conversionsToPayment: 0,
      functionsExecuted: {},
      functionSuccessRate: {},
      tenantActivity: {}
    };
    
    logger.info('🔄 [Metrics] Reset diário executado');
  }

  // Método para endpoint de métricas no dashboard
  static getMetricsForDashboard() {
    const metrics = this.getMetrics();
    return {
      summary: {
        totalRequests: metrics.totalRequests,
        totalCost: Number(metrics.totalCost.toFixed(4)),
        averageResponseTime: Math.round(metrics.averageResponseTime),
        errorRate: Number(metrics.errorRate.toFixed(2))
      },
      crm: {
        leadsCreated: metrics.leadsCreated,
        conversionsToReservation: metrics.conversionsToReservation,
        conversionsToPayment: metrics.conversionsToPayment,
        leadToReservationRate: Number(metrics.leadToReservationRate.toFixed(2)),
        reservationToPaymentRate: Number(metrics.reservationToPaymentRate.toFixed(2))
      },
      performance: {
        cacheHitRate: Number(metrics.cacheHitRate.toFixed(2)),
        topFunctions: metrics.topFunctions,
        functionSuccessRates: Object.entries(metrics.functionSuccessRates).reduce((acc, [func, rate]) => {
          acc[func] = Number(rate.toFixed(2));
          return acc;
        }, {} as Record<string, number>)
      },
      tenants: metrics.tenantActivity
    };
  }
}