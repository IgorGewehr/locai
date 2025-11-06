// lib/utils/circuit-breaker.ts
// Pattern Circuit Breaker: Evita fazer requests quando serviço está offline

import { logger } from './logger';

enum CircuitState {
  CLOSED = 'CLOSED',       // Tudo OK, deixa passar
  OPEN = 'OPEN',           // Muitos erros, bloqueando
  HALF_OPEN = 'HALF_OPEN'  // Testando se voltou
}

interface CircuitBreakerConfig {
  failureThreshold: number;    // Quantos erros antes de abrir (padrão: 5)
  resetTimeout: number;        // Tempo antes de tentar de novo (ms, padrão: 60000)
  monitoringPeriod: number;    // Período de monitoramento (ms, padrão: 120000)
}

class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount: number = 0;
  private lastFailureTime: number = 0;
  private nextAttemptTime: number = 0;

  constructor(
    private name: string,
    private config: CircuitBreakerConfig = {
      failureThreshold: 5,
      resetTimeout: 60000,      // 1 minuto
      monitoringPeriod: 120000  // 2 minutos
    }
  ) {}

  async execute<T>(
    operation: () => Promise<T>,
    fallback?: () => T
  ): Promise<T> {
    // Verificar estado do circuit
    this.updateState();

    // Se está OPEN (muitos erros), não tenta
    if (this.state === CircuitState.OPEN) {
      logger.warn(`[CircuitBreaker] ${this.name} is OPEN, using fallback`, {
        failureCount: this.failureCount,
        nextAttemptTime: new Date(this.nextAttemptTime).toISOString()
      });

      if (fallback) {
        return fallback();
      }

      throw new Error(`Circuit breaker is OPEN for ${this.name}`);
    }

    try {
      const result = await operation();

      // Sucesso! Reset contador
      this.onSuccess();
      return result;
    } catch (error) {
      // Falhou, registrar
      this.onFailure();

      // Se passou do threshold, abrir circuit
      if (this.failureCount >= this.config.failureThreshold) {
        this.state = CircuitState.OPEN;
        this.nextAttemptTime = Date.now() + this.config.resetTimeout;

        logger.error(`[CircuitBreaker] ${this.name} opened due to failures`, {
          failureCount: this.failureCount,
          threshold: this.config.failureThreshold,
          resetIn: this.config.resetTimeout / 1000 + 's'
        });
      }

      // Se tem fallback, usar
      if (fallback) {
        return fallback();
      }

      throw error;
    }
  }

  private updateState(): void {
    const now = Date.now();

    // Se está OPEN e passou o timeout, tentar de novo
    if (this.state === CircuitState.OPEN && now >= this.nextAttemptTime) {
      logger.info(`[CircuitBreaker] ${this.name} entering HALF_OPEN state`);
      this.state = CircuitState.HALF_OPEN;
      this.failureCount = 0;
    }

    // Reset contador se passou o período de monitoramento
    if (now - this.lastFailureTime > this.config.monitoringPeriod) {
      this.failureCount = 0;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;

    if (this.state === CircuitState.HALF_OPEN) {
      logger.info(`[CircuitBreaker] ${this.name} recovered, closing circuit`);
      this.state = CircuitState.CLOSED;
    }
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    logger.warn(`[CircuitBreaker] ${this.name} failure recorded`, {
      failureCount: this.failureCount,
      threshold: this.config.failureThreshold,
      state: this.state
    });
  }

  getState(): { state: CircuitState; failureCount: number } {
    return {
      state: this.state,
      failureCount: this.failureCount
    };
  }

  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.lastFailureTime = 0;
    this.nextAttemptTime = 0;
  }
}

// Criar circuit breakers para serviços críticos
export const circuitBreakers = {
  firebase: new CircuitBreaker('Firebase', {
    failureThreshold: 5,
    resetTimeout: 30000,      // 30s (Firebase geralmente volta rápido)
    monitoringPeriod: 60000   // 1 minuto
  }),

  whatsapp: new CircuitBreaker('WhatsApp', {
    failureThreshold: 3,
    resetTimeout: 60000,      // 1 minuto
    monitoringPeriod: 120000  // 2 minutos
  }),

  openai: new CircuitBreaker('OpenAI', {
    failureThreshold: 10,     // OpenAI pode ter spikes
    resetTimeout: 120000,     // 2 minutos
    monitoringPeriod: 300000  // 5 minutos
  })
};

export { CircuitBreaker, CircuitState };
