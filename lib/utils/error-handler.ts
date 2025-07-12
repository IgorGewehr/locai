import { NextResponse } from 'next/server';
import { ApiResponseHandler, CommonErrors, ApiError, ErrorType } from './api-response';

export class ErrorHandler {
  private static logError(error: any, context: string, additionalInfo?: any): void {
    const errorInfo = {
      timestamp: new Date().toISOString(),
      context,
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name,
      },
      additionalInfo,
    };

    console.error('Error logged:', errorInfo);

    // In production, you would send this to a logging service
    // Example: await sendToLoggingService(errorInfo);
  }

  static handleApiError(error: any, context: string = 'API'): NextResponse {
    this.logError(error, context);

    // Handle known error types
    if (error.name === 'ValidationError' || error.name === 'ApiValidationError') {
      return ApiResponseHandler.error(CommonErrors.validation(error.message, error.details));
    }

    if (error.name === 'NotFoundError' || error.name === 'ApiNotFoundError') {
      return ApiResponseHandler.error(CommonErrors.notFound(error.message));
    }

    if (error.name === 'ConflictError' || error.name === 'ApiConflictError') {
      return ApiResponseHandler.error(CommonErrors.conflict(error.message));
    }

    if (error.name === 'UnauthorizedError') {
      return ApiResponseHandler.error(CommonErrors.unauthorized());
    }

    if (error.name === 'ForbiddenError') {
      return ApiResponseHandler.error(CommonErrors.forbidden());
    }

    if (error.name === 'RateLimitError') {
      return ApiResponseHandler.error(CommonErrors.rateLimit());
    }

    if (error.name === 'TimeoutError') {
      return ApiResponseHandler.error(CommonErrors.timeout());
    }

    // Handle external service errors
    if (error.name === 'ExternalServiceError' || error.name === 'ApiExternalServiceError') {
      return ApiResponseHandler.error(CommonErrors.external(error.service || 'External', error.message));
    }

    // Handle Firebase errors
    if (error.code?.startsWith('auth/')) {
      return ApiResponseHandler.error(CommonErrors.external('Firebase Auth', this.getFirebaseErrorMessage(error.code)));
    }

    if (error.code?.startsWith('firestore/')) {
      return ApiResponseHandler.error(CommonErrors.external('Firestore', this.getFirebaseErrorMessage(error.code)));
    }

    // Handle OpenAI errors
    if (error.type === 'invalid_request_error' || error.type === 'rate_limit_error') {
      return ApiResponseHandler.error(CommonErrors.external('OpenAI', error.message));
    }

    // Handle network errors
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
      return ApiResponseHandler.error(CommonErrors.external('Network', 'Erro de conectividade'));
    }

    // Default to internal server error
    return ApiResponseHandler.error(CommonErrors.internal('Erro interno do servidor'));
  }

  static handleAsyncOperation<T>(
    operation: () => Promise<T>,
    context: string = 'Operation',
    customErrorHandler?: (error: any) => NextResponse
  ): Promise<T | NextResponse> {
    return operation().catch((error) => {
      if (customErrorHandler) {
        return customErrorHandler(error);
      }
      return this.handleApiError(error, context);
    });
  }

  static withErrorBoundary<T extends any[], R>(
    fn: (...args: T) => Promise<R>,
    context: string = 'Function'
  ): (...args: T) => Promise<R | NextResponse> {
    return async (...args: T): Promise<R | NextResponse> => {
      try {
        return await fn(...args);
      } catch (error) {
        return this.handleApiError(error, context);
      }
    };
  }

  static async withTimeout<T>(
    operation: () => Promise<T>,
    timeoutMs: number = 30000,
    context: string = 'Operation'
  ): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`${context} timeout after ${timeoutMs}ms`));
      }, timeoutMs);
    });

    return Promise.race([operation(), timeoutPromise]);
  }

  static async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delayMs: number = 1000,
    context: string = 'Operation'
  ): Promise<T> {
    let lastError: any;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;

        this.logError(error, `${context} - Attempt ${attempt}/${maxRetries}`);

        if (attempt === maxRetries) {
          throw error;
        }

        // Don't retry on certain error types
        if (error.name === 'ValidationError' || error.name === 'UnauthorizedError' || error.name === 'ForbiddenError') {
          throw error;
        }

        // Exponential backoff
        const delay = delayMs * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }

  static createCircuitBreaker<T extends any[], R>(
    fn: (...args: T) => Promise<R>,
    options: {
      failureThreshold: number;
      recoveryTimeout: number;
      context: string;
    } = {
      failureThreshold: 5,
      recoveryTimeout: 60000,
      context: 'Circuit Breaker',
    }
  ): (...args: T) => Promise<R> {
    let failureCount = 0;
    let lastFailureTime = 0;
    let state: 'closed' | 'open' | 'half-open' = 'closed';

    return async (...args: T): Promise<R> => {
      const now = Date.now();

      // Check if circuit should transition from open to half-open
      if (state === 'open' && now - lastFailureTime > options.recoveryTimeout) {
        state = 'half-open';
        failureCount = 0;
      }

      // If circuit is open, reject immediately
      if (state === 'open') {
        throw new Error(`Circuit breaker is OPEN for ${options.context}`);
      }

      try {
        const result = await fn(...args);

        // Success - reset failure count and close circuit
        if (state === 'half-open') {
          state = 'closed';
        }
        failureCount = 0;

        return result;
      } catch (error) {
        failureCount++;
        lastFailureTime = now;

        // Open circuit if failure threshold reached
        if (failureCount >= options.failureThreshold) {
          state = 'open';
          this.logError(error, `Circuit breaker OPENED for ${options.context}`);
        }

        throw error;
      }
    };
  }

  private static getFirebaseErrorMessage(code: string): string {
    const messages: Record<string, string> = {
      'auth/user-not-found': 'Usuário não encontrado',
      'auth/wrong-password': 'Senha incorreta',
      'auth/email-already-in-use': 'Email já está em uso',
      'auth/weak-password': 'Senha muito fraca',
      'auth/invalid-email': 'Email inválido',
      'auth/too-many-requests': 'Muitas tentativas. Tente novamente mais tarde.',
      'firestore/permission-denied': 'Permissão negada',
      'firestore/not-found': 'Documento não encontrado',
      'firestore/already-exists': 'Documento já existe',
      'firestore/resource-exhausted': 'Limite de recursos excedido',
      'firestore/deadline-exceeded': 'Operação expirou',
      'firestore/unavailable': 'Serviço temporariamente indisponível',
    };

    return messages[code] || code;
  }

  // Helper method to create safe async handler for API routes
  static createSafeHandler<T extends any[], R>(
    handler: (...args: T) => Promise<R>,
    context: string = 'API Handler'
  ): (...args: T) => Promise<R | NextResponse> {
    return this.withErrorBoundary(
      this.withRetry(
        async (...args: T) => {
          return await this.withTimeout(
            () => handler(...args),
            30000,
            context
          );
        },
        3,
        1000,
        context
      ),
      context
    );
  }
}

// Custom error classes with better error information
export class SafeOperationError extends Error {
  constructor(
    message: string,
    public readonly context: string,
    public readonly originalError?: any
  ) {
    super(message);
    this.name = 'SafeOperationError';
  }
}

export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly field?: string,
    public readonly details?: any
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends Error {
  constructor(
    message: string = 'Recurso não encontrado',
    public readonly resourceType?: string,
    public readonly resourceId?: string
  ) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends Error {
  constructor(
    message: string,
    public readonly conflictType?: string
  ) {
    super(message);
    this.name = 'ConflictError';
  }
}

export class UnauthorizedError extends Error {
  constructor(message: string = 'Não autorizado') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends Error {
  constructor(message: string = 'Acesso negado') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export class RateLimitError extends Error {
  constructor(message: string = 'Limite de taxa excedido') {
    super(message);
    this.name = 'RateLimitError';
  }
}

export class TimeoutError extends Error {
  constructor(message: string = 'Operação expirou') {
    super(message);
    this.name = 'TimeoutError';
  }
}

export class ExternalServiceError extends Error {
  constructor(
    message: string,
    public readonly service: string,
    public readonly originalError?: any
  ) {
    super(message);
    this.name = 'ExternalServiceError';
  }
}

// Export a configured error handler instance
export const errorHandler = new ErrorHandler();