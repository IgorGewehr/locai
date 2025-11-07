// lib/utils/logger.ts
// Professional Logging System for Production

import { 
  LOGGING_CONFIG, 
  shouldLogComponent, 
  shouldIgnoreMessage, 
  isRateLimited 
} from '@/lib/config/logging-config';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  CRITICAL = 4
}

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  context?: Record<string, any>;
  userId?: string;
  tenantId?: string;
  requestId?: string;
  component?: string;
  operation?: string;
  duration?: number;
  error?: Error;
}

interface LoggerConfig {
  minLevel: LogLevel;
  enableConsole: boolean;
  enableFile: boolean;
  enableFirestore: boolean;
  enableSentry: boolean;
  maxLogSize: number;
}

class Logger {
  private config: LoggerConfig;
  private requestContext: Map<string, any> = new Map();

  constructor(config?: Partial<LoggerConfig>) {
    this.config = {
      minLevel: process.env.NODE_ENV === 'production' ? LogLevel.WARN : LogLevel.DEBUG,
      enableConsole: process.env.NODE_ENV !== 'production',
      enableFile: false, // Set to true if you want file logging
      enableFirestore: process.env.NODE_ENV === 'production' && process.env.ENABLE_FIREBASE_LOGS === 'true',
      enableSentry: process.env.NODE_ENV === 'production',
      maxLogSize: 1000,
      ...config
    };
  }

  setRequestContext(requestId: string, context: Record<string, any>) {
    this.requestContext.set(requestId, context);
  }

  clearRequestContext(requestId: string) {
    this.requestContext.delete(requestId);
  }

  private createLogEntry(
    level: LogLevel,
    message: string,
    context?: Record<string, any>,
    error?: Error
  ): LogEntry {
    const requestId = context?.requestId;
    const requestContext = requestId ? this.requestContext.get(requestId) : {};

    return {
      level,
      message,
      timestamp: new Date(),
      context: { ...requestContext, ...context },
      error,
      ...requestContext
    };
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.config.minLevel;
  }

  private async writeLog(entry: LogEntry) {
    if (!this.shouldLog(entry.level)) return;
    
    // OTIMIZAÇÃO: Verificar se mensagem deve ser ignorada
    if (shouldIgnoreMessage(entry.message)) {
      return;
    }
    
    // OTIMIZAÇÃO: Verificar rate limiting
    const tenantId = entry.tenantId || entry.context?.tenantId || 'system';
    if (isRateLimited(tenantId)) {
      return;
    }
    
    // OTIMIZAÇÃO: Verificar componente (só em produção)
    if (process.env.NODE_ENV === 'production' && entry.component) {
      if (!shouldLogComponent(entry.component) && entry.level < LogLevel.ERROR) {
        return;
      }
    }

    // Console output for development
    if (this.config.enableConsole) {
      const coloredMessage = this.formatConsoleMessage(entry);
      console.log(coloredMessage);
    }

    // Production logging - com verificações adicionais
    if (this.config.enableFirestore && process.env.NODE_ENV === 'production') {
      // Só gravar logs importantes no Firestore
      if (entry.level >= LogLevel.WARN || shouldLogComponent(entry.component)) {
        await this.writeToFirestore(entry);
      }
    }

    // Error tracking for critical issues
    if (this.config.enableSentry && entry.level >= LogLevel.ERROR) {
      await this.sendToSentry(entry);
    }
  }

  private formatConsoleMessage(entry: LogEntry): string {
    const levelColors = {
      [LogLevel.DEBUG]: '\x1b[36m', // Cyan
      [LogLevel.INFO]: '\x1b[32m',  // Green
      [LogLevel.WARN]: '\x1b[33m',  // Yellow
      [LogLevel.ERROR]: '\x1b[31m', // Red
      [LogLevel.CRITICAL]: '\x1b[35m' // Magenta
    };

    const levelNames = {
      [LogLevel.DEBUG]: 'DEBUG',
      [LogLevel.INFO]: 'INFO',
      [LogLevel.WARN]: 'WARN',
      [LogLevel.ERROR]: 'ERROR',
      [LogLevel.CRITICAL]: 'CRITICAL'
    };

    const color = levelColors[entry.level];
    const reset = '\x1b[0m';
    const timestamp = entry.timestamp.toISOString();
    const level = levelNames[entry.level];
    const component = entry.component ? `[${entry.component}]` : '';

    let message = `${color}${timestamp} ${level}${reset} ${component} ${entry.message}`;

    if (entry.context && Object.keys(entry.context).length > 0) {
      message += `\n  Context: ${JSON.stringify(entry.context, null, 2)}`;
    }

    if (entry.error) {
      message += `\n  Error: ${entry.error.message}`;
      if (entry.error.stack) {
        message += `\n  Stack: ${entry.error.stack}`;
      }
    }

    return message;
  }

  private async writeToFirestore(entry: LogEntry) {
    try {
      // OTIMIZAÇÃO: Só registrar logs CRÍTICOS em produção
      // INFO e DEBUG são ignorados para economizar espaço
      if (entry.level < LogLevel.WARN) return;

      // Filtrar logs repetitivos comuns
      const skipPatterns = [
        'Analytics tracking',
        'Contexto carregado',
        'Summary atualizado',
        'Processamento completo',
        'Mensagem processada',
        'API Request:',
        'WhatsApp incoming message',
        'WhatsApp outgoing message',
        'Property search completed',
        'AI interaction completed'
      ];
      
      // Pular logs que são muito frequentes e não críticos
      if (skipPatterns.some(pattern => entry.message.includes(pattern))) {
        return;
      }

      // Use existing Firebase config instead of re-initializing
      const { db } = await import('@/lib/firebase/config');
      const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');

      // Clean data to prevent undefined field errors
      const cleanContext = this.cleanFirestoreData(entry.context || {});
      
      // Determine collection path - use tenant-scoped if available
      const tenantId = entry.tenantId || entry.context?.tenantId || 'system';
      const collectionPath = tenantId === 'system' 
        ? 'system_logs' 
        : `tenants/${tenantId}/system_logs`;
      
      // OTIMIZAÇÃO: Reduzir tamanho do contexto armazenado
      const minimalContext = {
        ...cleanContext,
        // Remover campos grandes e desnecessários
        messageHistory: undefined,
        fullContext: undefined,
        largeData: undefined
      };
      
      // Remove undefined fields to prevent Firestore errors
      const logData: any = {
        level: LogLevel[entry.level],
        message: entry.message.substring(0, 500), // Limitar tamanho da mensagem
        timestamp: serverTimestamp(),
        context: Object.keys(minimalContext).length > 0 ? minimalContext : undefined,
        tenantId: tenantId
      };

      // Only add critical fields
      if (entry.userId) logData.userId = entry.userId;
      if (entry.component) logData.component = entry.component;
      if (entry.error) {
        logData.error = {
          message: entry.error.message?.substring(0, 200) || 'Unknown error',
          name: entry.error.name || 'Error'
          // Remover stack trace em produção para economizar espaço
        };
      }

      // Use addDoc which generates unique IDs automatically
      await addDoc(collection(db, collectionPath), logData);
    } catch (error) {
      // Fallback to console if Firestore fails - but don't log recursively
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to write to Firestore:', error);
      }
    }
  }

  // Helper method to clean data for Firestore (remove undefined values)
  private cleanFirestoreData(obj: any): any {
    if (obj === null || obj === undefined) return {};
    if (typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(item => this.cleanFirestoreData(item));
    
    const cleaned: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined && value !== null) {
        cleaned[key] = this.cleanFirestoreData(value);
      }
    }
    return cleaned;
  }

  private async sendToSentry(entry: LogEntry) {
    try {
      // Placeholder for Sentry integration
      // You would implement Sentry.captureException here
      console.error('SENTRY LOG:', entry);
    } catch (error) {
      console.error('Failed to send to Sentry:', error);
    }
  }

  // Public logging methods
  debug(message: string, context?: Record<string, any>) {
    const entry = this.createLogEntry(LogLevel.DEBUG, message, context);
    this.writeLog(entry);
  }

  info(message: string, context?: Record<string, any>) {
    const entry = this.createLogEntry(LogLevel.INFO, message, context);
    this.writeLog(entry);
  }

  warn(message: string, context?: Record<string, any>) {
    const entry = this.createLogEntry(LogLevel.WARN, message, context);
    this.writeLog(entry);
  }

  error(message: string, error?: Error, context?: Record<string, any>) {
    const entry = this.createLogEntry(LogLevel.ERROR, message, context, error);
    this.writeLog(entry);
  }

  critical(message: string, error?: Error, context?: Record<string, any>) {
    const entry = this.createLogEntry(LogLevel.CRITICAL, message, context, error);
    this.writeLog(entry);
  }

  // Tenant-aware logging methods
  tenantInfo(message: string, tenantId: string, context?: Record<string, any>) {
    this.info(message, { ...context, tenantId });
  }

  tenantError(message: string, error: Error, tenantId: string, context?: Record<string, any>) {
    this.error(message, error, { ...context, tenantId });
  }

  tenantWarn(message: string, tenantId: string, context?: Record<string, any>) {
    this.warn(message, { ...context, tenantId });
  }

  // Performance monitoring
  startTimer(operation: string, context?: Record<string, any>) {
    const startTime = Date.now();
    const requestId = context?.requestId || `timer_${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      end: () => {
        const duration = Date.now() - startTime;
        this.info(`Operation completed: ${operation}`, {
          ...context,
          operation,
          duration,
          requestId
        });
        return duration;
      }
    };
  }

  // Structured logging for specific events
  logAPIRequest(method: string, endpoint: string, statusCode: number, duration: number, context?: Record<string, any>) {
    this.info(`API Request: ${method} ${endpoint}`, {
      ...context,
      method,
      endpoint,
      statusCode,
      duration,
      component: 'API'
    });
  }

  logWhatsAppMessage(direction: 'incoming' | 'outgoing', phone: string, messageType: string, context?: Record<string, any>) {
    this.info(`WhatsApp ${direction} message`, {
      ...context,
      direction,
      phone: phone.slice(-4), // Only log last 4 digits for privacy
      messageType,
      component: 'WhatsApp'
    });
  }

  logAIInteraction(model: string, tokensUsed: number, duration: number, context?: Record<string, any>) {
    this.info(`AI interaction completed`, {
      ...context,
      model,
      tokensUsed,
      duration,
      component: 'AI'
    });
  }

  logPropertySearch(filters: any, resultCount: number, context?: Record<string, any>) {
    this.info(`Property search completed`, {
      ...context,
      filters,
      resultCount,
      component: 'PropertySearch'
    });
  }
}

// Global logger instance
export const logger = new Logger();

// Helper functions for common logging patterns
export const createRequestLogger = (requestId: string, initialContext?: Record<string, any>) => {
  logger.setRequestContext(requestId, { requestId, ...initialContext });
  
  return {
    debug: (message: string, context?: Record<string, any>) => 
      logger.debug(message, { ...context, requestId }),
    info: (message: string, context?: Record<string, any>) => 
      logger.info(message, { ...context, requestId }),
    warn: (message: string, context?: Record<string, any>) => 
      logger.warn(message, { ...context, requestId }),
    error: (message: string, error?: Error, context?: Record<string, any>) => 
      logger.error(message, error, { ...context, requestId }),
    cleanup: () => logger.clearRequestContext(requestId)
  };
};

export default logger;