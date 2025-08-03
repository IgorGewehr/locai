// lib/ai-agent/loop-prevention.ts
// Sistema de prevenção de loops e execuções duplicadas

import { logger } from '@/lib/utils/logger';
import { SOFIA_CONFIG } from '@/lib/config/sofia-config';

interface ExecutionRecord {
  functionName: string;
  args: any;
  timestamp: number;
  executionId: string;
}

interface LoopDetectionResult {
  isLoop: boolean;
  reason?: string;
  lastExecution?: ExecutionRecord;
  cooldownRemaining?: number;
}

class LoopPreventionSystem {
  private executionHistory: Map<string, ExecutionRecord[]> = new Map();
  private functionCooldowns: Map<string, number> = new Map();
  private executionCounts: Map<string, number> = new Map();

  /**
   * Verificar se uma execução causaria um loop
   */
  checkForLoop(
    clientPhone: string,
    functionName: string,
    args: any
  ): LoopDetectionResult {
    const key = this.getKey(clientPhone, functionName);
    const now = Date.now();

    // Verificar cooldown
    const cooldownEnd = this.functionCooldowns.get(key);
    if (cooldownEnd && cooldownEnd > now) {
      const remaining = cooldownEnd - now;
      logger.warn('⏱️ [LoopPrevention] Função em cooldown', {
        functionName,
        cooldownRemaining: remaining,
        clientPhone: clientPhone.substring(0, 6) + '***'
      });

      return {
        isLoop: true,
        reason: 'Função em período de cooldown',
        cooldownRemaining: remaining
      };
    }

    // Verificar execuções recentes
    const history = this.executionHistory.get(key) || [];
    const recentExecutions = history.filter(
      exec => (now - exec.timestamp) < SOFIA_CONFIG.loopPrevention.DUPLICATE_DETECTION_WINDOW_MS
    );

    // Detectar execução duplicada
    const duplicateExecution = recentExecutions.find(exec => 
      this.argsAreEqual(exec.args, args)
    );

    if (duplicateExecution) {
      logger.warn('🔄 [LoopPrevention] Execução duplicada detectada', {
        functionName,
        timeSinceLastExecution: now - duplicateExecution.timestamp,
        clientPhone: clientPhone.substring(0, 6) + '***'
      });

      return {
        isLoop: true,
        reason: 'Tentativa de executar função idêntica muito rapidamente',
        lastExecution: duplicateExecution
      };
    }

    // Verificar número de execuções
    const executionCount = this.executionCounts.get(key) || 0;
    if (executionCount >= SOFIA_CONFIG.loopPrevention.MAX_RETRIES_PER_FUNCTION) {
      logger.warn('🚫 [LoopPrevention] Limite de execuções atingido', {
        functionName,
        executionCount,
        maxRetries: SOFIA_CONFIG.loopPrevention.MAX_RETRIES_PER_FUNCTION,
        clientPhone: clientPhone.substring(0, 6) + '***'
      });

      return {
        isLoop: true,
        reason: `Função executada ${executionCount} vezes (máximo: ${SOFIA_CONFIG.loopPrevention.MAX_RETRIES_PER_FUNCTION})`
      };
    }

    // Não é loop
    return { isLoop: false };
  }

  /**
   * Registrar execução de função
   */
  recordExecution(
    clientPhone: string,
    functionName: string,
    args: any,
    executionId: string
  ): void {
    const key = this.getKey(clientPhone, functionName);
    const now = Date.now();

    // Adicionar ao histórico
    const history = this.executionHistory.get(key) || [];
    const record: ExecutionRecord = {
      functionName,
      args,
      timestamp: now,
      executionId
    };

    history.push(record);

    // Limitar tamanho do histórico
    if (history.length > 10) {
      history.shift(); // Remove mais antiga
    }

    this.executionHistory.set(key, history);

    // Atualizar contador
    const count = this.executionCounts.get(key) || 0;
    this.executionCounts.set(key, count + 1);

    // Definir cooldown
    this.functionCooldowns.set(
      key,
      now + SOFIA_CONFIG.loopPrevention.FUNCTION_EXECUTION_COOLDOWN_MS
    );

    logger.info('✅ [LoopPrevention] Execução registrada', {
      functionName,
      executionId,
      executionCount: count + 1,
      clientPhone: clientPhone.substring(0, 6) + '***'
    });
  }

  /**
   * Limpar histórico de um cliente
   */
  clearClientHistory(clientPhone: string): void {
    const keysToDelete: string[] = [];

    // Encontrar todas as chaves do cliente
    for (const key of this.executionHistory.keys()) {
      if (key.startsWith(clientPhone)) {
        keysToDelete.push(key);
      }
    }

    // Limpar dados
    keysToDelete.forEach(key => {
      this.executionHistory.delete(key);
      this.functionCooldowns.delete(key);
      this.executionCounts.delete(key);
    });

    logger.info('🧹 [LoopPrevention] Histórico limpo', {
      clientPhone: clientPhone.substring(0, 6) + '***',
      keysCleared: keysToDelete.length
    });
  }

  /**
   * Resetar contador de execuções (para nova conversa)
   */
  resetExecutionCount(clientPhone: string, functionName?: string): void {
    if (functionName) {
      const key = this.getKey(clientPhone, functionName);
      this.executionCounts.delete(key);
    } else {
      // Resetar todos os contadores do cliente
      for (const key of this.executionCounts.keys()) {
        if (key.startsWith(clientPhone)) {
          this.executionCounts.delete(key);
        }
      }
    }

    logger.info('🔄 [LoopPrevention] Contadores resetados', {
      clientPhone: clientPhone.substring(0, 6) + '***',
      functionName: functionName || 'all'
    });
  }

  /**
   * Limpar dados antigos (para manutenção)
   */
  cleanup(): void {
    const now = Date.now();
    const maxAge = 60 * 60 * 1000; // 1 hora
    let cleanedCount = 0;

    // Limpar histórico antigo
    for (const [key, history] of this.executionHistory.entries()) {
      const filtered = history.filter(
        exec => (now - exec.timestamp) < maxAge
      );

      if (filtered.length === 0) {
        this.executionHistory.delete(key);
        cleanedCount++;
      } else if (filtered.length < history.length) {
        this.executionHistory.set(key, filtered);
      }
    }

    // Limpar cooldowns expirados
    for (const [key, cooldownEnd] of this.functionCooldowns.entries()) {
      if (cooldownEnd < now) {
        this.functionCooldowns.delete(key);
      }
    }

    logger.info('🧹 [LoopPrevention] Limpeza periódica concluída', {
      entriesCleared: cleanedCount,
      remainingHistories: this.executionHistory.size,
      activeCooldowns: this.functionCooldowns.size
    });
  }

  /**
   * Verificar se argumentos são iguais
   */
  private argsAreEqual(args1: any, args2: any): boolean {
    // Ignorar campos que mudam naturalmente (timestamps, etc)
    const normalize = (obj: any) => {
      const { timestamp, updatedAt, createdAt, ...rest } = obj || {};
      return rest;
    };

    const normalized1 = normalize(args1);
    const normalized2 = normalize(args2);

    return JSON.stringify(normalized1) === JSON.stringify(normalized2);
  }

  /**
   * Gerar chave única para o mapa
   */
  private getKey(clientPhone: string, functionName: string): string {
    return `${clientPhone}:${functionName}`;
  }

  /**
   * Obter estatísticas do sistema
   */
  getStats(): {
    totalHistories: number;
    activeCooldowns: number;
    totalExecutions: number;
  } {
    let totalExecutions = 0;
    for (const count of this.executionCounts.values()) {
      totalExecutions += count;
    }

    return {
      totalHistories: this.executionHistory.size,
      activeCooldowns: this.functionCooldowns.size,
      totalExecutions
    };
  }
}

// Singleton instance
export const loopPrevention = new LoopPreventionSystem();

// Iniciar limpeza periódica
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    loopPrevention.cleanup();
  }, SOFIA_CONFIG.context.CLEANUP_INTERVAL_MS);
}