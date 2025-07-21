// lib/monitoring/agent-monitor.ts

export class AgentMonitor {
  private static metrics = {
    totalRequests: 0,
    cacheHits: 0,
    totalTokens: 0,
    totalCost: 0,
    errorsCount: 0,
    averageResponseTime: 0
  };

  static recordRequest(tokensUsed: number, fromCache: boolean, responseTime: number) {
    this.metrics.totalRequests++;
    this.metrics.totalTokens += tokensUsed;
    
    if (fromCache) {
      this.metrics.cacheHits++;
    }
    
    // Calcular custo (GPT-3.5-turbo: $0.001/1K tokens input + $0.002/1K tokens output)
    const estimatedCost = (tokensUsed / 1000) * 0.0015; // Média entre input/output
    this.metrics.totalCost += estimatedCost;
    
    // Média móvel do tempo de resposta
    this.metrics.averageResponseTime = 
      (this.metrics.averageResponseTime * (this.metrics.totalRequests - 1) + responseTime) / 
      this.metrics.totalRequests;
  }

  static recordError() {
    this.metrics.errorsCount++;
  }

  static getMetrics() {
    return {
      ...this.metrics,
      cacheHitRate: this.metrics.cacheHits / this.metrics.totalRequests,
      averageCostPerRequest: this.metrics.totalCost / this.metrics.totalRequests,
      errorRate: this.metrics.errorsCount / this.metrics.totalRequests
    };
  }

  static resetDaily() {
    // Chamar via cron job diário
    this.metrics = {
      totalRequests: 0,
      cacheHits: 0,
      totalTokens: 0,
      totalCost: 0,
      errorsCount: 0,
      averageResponseTime: 0
    };
  }
}