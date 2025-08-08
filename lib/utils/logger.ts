// lib/utils/logger.ts
// Professional Logging System for Production

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
      minLevel: process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG,
      enableConsole: process.env.NODE_ENV !== 'production',
      enableFile: false, // Set to true if you want file logging
      enableFirestore: false, // Temporarily disabled to avoid permissions issues
      enableSentry: false, // Temporarily disabled until properly configured
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

    // Console output for development
    if (this.config.enableConsole) {
      const coloredMessage = this.formatConsoleMessage(entry);
      console.log(coloredMessage);
    }

    // Production logging
    if (this.config.enableFirestore && process.env.NODE_ENV === 'production') {
      await this.writeToFirestore(entry);
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
      // Only log important events to Firestore to avoid costs
      if (entry.level < LogLevel.INFO) return;

      // Skip Firestore logging if we're already in a browser environment without proper config
      if (typeof window !== 'undefined' && !process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
        return;
      }

      const { db } = await import('@/lib/firebase/config');
      const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');

      // Sanitize data to ensure no undefined values
      const sanitizeValue = (value: any): any => {
        if (value === undefined || value === null) return null;
        if (value instanceof Error) {
          return {
            message: value.message || 'Unknown error',
            stack: value.stack || '',
            name: value.name || 'Error'
          };
        }
        if (typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
          const sanitized: any = {};
          for (const key in value) {
            if (value.hasOwnProperty(key)) {
              const sanitizedValue = sanitizeValue(value[key]);
              if (sanitizedValue !== undefined) {
                sanitized[key] = sanitizedValue;
              }
            }
          }
          return Object.keys(sanitized).length > 0 ? sanitized : null;
        }
        return value;
      };

      const logData = {
        level: LogLevel[entry.level] || 'UNKNOWN',
        message: entry.message || 'No message',
        timestamp: serverTimestamp(),
        context: sanitizeValue(entry.context) || {},
        tenantId: entry.tenantId || 'default',
        userId: entry.userId || null,
        requestId: entry.requestId || null,
        component: entry.component || null,
        operation: entry.operation || null,
        duration: entry.duration || null,
        error: entry.error ? sanitizeValue(entry.error) : null,
        environment: process.env.NODE_ENV || 'unknown'
      };

      // Use tenant-scoped collection if tenantId is available
      const collectionPath = entry.tenantId && entry.tenantId !== 'default' 
        ? `tenants/${entry.tenantId}/system_logs`
        : 'system_logs';

      await addDoc(collection(db, collectionPath), logData);
    } catch (error) {
      // Silently fail in production to avoid console spam
      if (process.env.NODE_ENV !== 'production') {
        console.error('Failed to write to Firestore:', error);
      }
    }
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