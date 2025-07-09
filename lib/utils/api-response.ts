import { NextResponse } from 'next/server';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    type: ErrorType;
    timestamp: string;
    requestId?: string;
    details?: any;
  };
  meta?: {
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
    version?: string;
    timestamp?: string;
  };
}

export enum ErrorType {
  VALIDATION = 'VALIDATION',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  RATE_LIMIT = 'RATE_LIMIT',
  EXTERNAL_SERVICE = 'EXTERNAL_SERVICE',
  DATABASE = 'DATABASE',
  INTERNAL = 'INTERNAL',
  BAD_REQUEST = 'BAD_REQUEST',
}

export interface ApiError {
  code: string;
  message: string;
  type: ErrorType;
  statusCode: number;
  details?: any;
}

// Common error codes
export const ErrorCodes = {
  // Authentication & Authorization
  UNAUTHORIZED: 'UNAUTHORIZED',
  INVALID_TOKEN: 'INVALID_TOKEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  
  // Validation
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  INVALID_FORMAT: 'INVALID_FORMAT',
  
  // Resources
  NOT_FOUND: 'NOT_FOUND',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  
  // Rate Limiting
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  TOO_MANY_REQUESTS: 'TOO_MANY_REQUESTS',
  
  // External Services
  OPENAI_ERROR: 'OPENAI_ERROR',
  WHATSAPP_ERROR: 'WHATSAPP_ERROR',
  FIREBASE_ERROR: 'FIREBASE_ERROR',
  
  // Internal
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  TIMEOUT: 'TIMEOUT',
} as const;

// Pre-defined error responses
export const CommonErrors = {
  unauthorized: (): ApiError => ({
    code: ErrorCodes.UNAUTHORIZED,
    message: 'Token de autenticação necessário',
    type: ErrorType.AUTHENTICATION,
    statusCode: 401,
  }),
  
  invalidToken: (): ApiError => ({
    code: ErrorCodes.INVALID_TOKEN,
    message: 'Token inválido ou expirado',
    type: ErrorType.AUTHENTICATION,
    statusCode: 401,
  }),
  
  forbidden: (): ApiError => ({
    code: ErrorCodes.INSUFFICIENT_PERMISSIONS,
    message: 'Acesso negado',
    type: ErrorType.AUTHORIZATION,
    statusCode: 403,
  }),
  
  notFound: (resource: string = 'Recurso'): ApiError => ({
    code: ErrorCodes.NOT_FOUND,
    message: `${resource} não encontrado`,
    type: ErrorType.NOT_FOUND,
    statusCode: 404,
  }),
  
  validation: (message: string, details?: any): ApiError => ({
    code: ErrorCodes.VALIDATION_ERROR,
    message,
    type: ErrorType.VALIDATION,
    statusCode: 400,
    details,
  }),
  
  conflict: (message: string): ApiError => ({
    code: ErrorCodes.ALREADY_EXISTS,
    message,
    type: ErrorType.CONFLICT,
    statusCode: 409,
  }),
  
  rateLimit: (): ApiError => ({
    code: ErrorCodes.RATE_LIMIT_EXCEEDED,
    message: 'Muitas solicitações. Tente novamente mais tarde.',
    type: ErrorType.RATE_LIMIT,
    statusCode: 429,
  }),
  
  internal: (message: string = 'Erro interno do servidor'): ApiError => ({
    code: ErrorCodes.INTERNAL_SERVER_ERROR,
    message,
    type: ErrorType.INTERNAL,
    statusCode: 500,
  }),
  
  external: (service: string, message?: string): ApiError => ({
    code: `${service.toUpperCase()}_ERROR`,
    message: message || `Erro no serviço ${service}`,
    type: ErrorType.EXTERNAL_SERVICE,
    statusCode: 502,
  }),
  
  timeout: (): ApiError => ({
    code: ErrorCodes.TIMEOUT,
    message: 'Operação expirou. Tente novamente.',
    type: ErrorType.INTERNAL,
    statusCode: 408,
  }),
};

// Utility class for handling API responses
export class ApiResponseHandler {
  private static generateRequestId(): string {
    return crypto.randomUUID();
  }

  static success<T>(data: T, meta?: ApiResponse<T>['meta']): NextResponse<ApiResponse<T>> {
    const response: ApiResponse<T> = {
      success: true,
      data,
      meta: {
        ...meta,
        timestamp: new Date().toISOString(),
        version: '1.0',
      },
    };
    
    return NextResponse.json(response);
  }

  static error(error: ApiError, requestId?: string): NextResponse<ApiResponse> {
    const response: ApiResponse = {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        type: error.type,
        timestamp: new Date().toISOString(),
        requestId: requestId || this.generateRequestId(),
        details: error.details,
      },
    };
    
    return NextResponse.json(response, { status: error.statusCode });
  }

  static created<T>(data: T, location?: string): NextResponse<ApiResponse<T>> {
    const response = this.success(data);
    
    if (location) {
      response.headers.set('Location', location);
    }
    
    // Set status to 201 Created
    Object.defineProperty(response, 'status', {
      value: 201,
      writable: false,
    });
    
    return response;
  }

  static noContent(): NextResponse {
    return new NextResponse(null, { status: 204 });
  }

  static paginated<T>(
    data: T[],
    page: number,
    limit: number,
    total: number
  ): NextResponse<ApiResponse<T[]>> {
    const totalPages = Math.ceil(total / limit);
    
    return this.success(data, {
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  }

  // Helper method to handle async operations with standard error handling
  static async handleAsync<T>(
    operation: () => Promise<T>,
    errorMessage: string = 'Operação falhou'
  ): Promise<T | NextResponse<ApiResponse>> {
    try {
      return await operation();
    } catch (error) {
      console.error('API operation failed:', error);
      
      // Handle specific error types
      if (error instanceof Error) {
        if (error.name === 'ValidationError') {
          return this.error(CommonErrors.validation(error.message));
        }
        if (error.name === 'NotFoundError') {
          return this.error(CommonErrors.notFound());
        }
        if (error.name === 'ConflictError') {
          return this.error(CommonErrors.conflict(error.message));
        }
      }
      
      // Generic internal server error
      return this.error(CommonErrors.internal(errorMessage));
    }
  }
}

// Custom error classes for better error handling
export class ApiValidationError extends Error {
  name = 'ValidationError';
  details?: any;
  
  constructor(message: string, details?: any) {
    super(message);
    this.details = details;
  }
}

export class ApiNotFoundError extends Error {
  name = 'NotFoundError';
  
  constructor(message: string = 'Recurso não encontrado') {
    super(message);
  }
}

export class ApiConflictError extends Error {
  name = 'ConflictError';
  
  constructor(message: string) {
    super(message);
  }
}

export class ApiExternalServiceError extends Error {
  name = 'ExternalServiceError';
  service: string;
  
  constructor(service: string, message: string) {
    super(message);
    this.service = service;
  }
}

// Helper for input validation
export function validateRequired(data: any, fields: string[]): void {
  const missing = fields.filter(field => !data[field]);
  
  if (missing.length > 0) {
    throw new ApiValidationError(
      `Campos obrigatórios ausentes: ${missing.join(', ')}`,
      { missingFields: missing }
    );
  }
}

// Helper for email validation
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Helper for phone validation (Brazilian format)
export function validatePhone(phone: string): boolean {
  const phoneRegex = /^(\+55|55)?[\s-]?(\(?\d{2}\)?[\s-]?)?[\s-]?(\d{4,5}[\s-]?\d{4})$/;
  return phoneRegex.test(phone);
}