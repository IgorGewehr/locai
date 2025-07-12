export enum ErrorType {
  VALIDATION = 'validation',
  NETWORK = 'network',
  API_LIMIT = 'api_limit',
  AUTHENTICATION = 'authentication',
  INTERNAL = 'internal',
  TIMEOUT = 'timeout',
  RATE_LIMIT = 'rate_limit'
}

export class AIError extends Error {
  constructor(
    public type: ErrorType,
    message: string,
    public code?: string,
    public context?: Record<string, any>
  ) {
    super(message)
    this.name = 'AIError'
  }
}

export class ValidationError extends AIError {
  constructor(message: string, field?: string) {
    super(ErrorType.VALIDATION, message, 'VALIDATION_ERROR', { field })
  }
}

export class NetworkError extends AIError {
  constructor(message: string, statusCode?: number) {
    super(ErrorType.NETWORK, message, 'NETWORK_ERROR', { statusCode })
  }
}

export class RateLimitError extends AIError {
  constructor(message: string, retryAfter?: number) {
    super(ErrorType.RATE_LIMIT, message, 'RATE_LIMIT_ERROR', { retryAfter })
  }
}

export class TimeoutError extends AIError {
  constructor(operation: string, timeoutMs: number) {
    super(ErrorType.TIMEOUT, `${operation} timed out after ${timeoutMs}ms`, 'TIMEOUT_ERROR', { operation, timeoutMs })
  }
}

// Additional error classes needed by middleware
export class AppError extends Error {
  constructor(
    message: string,
    public code: string = 'APP_ERROR',
    public details?: any
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication failed') {
    super(message, 'AUTHENTICATION_ERROR')
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Authorization failed') {
    super(message, 'AUTHORIZATION_ERROR')
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 'NOT_FOUND')
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Conflict occurred') {
    super(message, 'CONFLICT')
  }
}

export class ExternalServiceError extends AppError {
  constructor(
    message: string,
    public service: string = 'External Service'
  ) {
    super(message, 'EXTERNAL_SERVICE_ERROR', { service })
  }
}

// Firestore error handler utility
export function handleFirestoreError(error: any): never {
  if (error.code?.startsWith('permission-denied')) {
    throw new AuthorizationError('Access denied to this resource')
  }
  
  if (error.code?.startsWith('not-found')) {
    throw new NotFoundError('Document not found')
  }
  
  if (error.code?.startsWith('already-exists')) {
    throw new ConflictError('Document already exists')
  }
  
  if (error.code?.startsWith('resource-exhausted')) {
    throw new ExternalServiceError('Database quota exceeded', 'Firestore')
  }
  
  if (error.code?.startsWith('deadline-exceeded')) {
    throw new TimeoutError('Database operation', 30000)
  }
  
  if (error.code?.startsWith('unavailable')) {
    throw new ExternalServiceError('Database temporarily unavailable', 'Firestore')
  }
  
  // Generic Firestore error
  throw new ExternalServiceError(error.message || 'Database error', 'Firestore')
}

export function classifyError(error: any): ErrorType {
  if (error instanceof AIError) return error.type
  
  if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
    return ErrorType.NETWORK
  }
  
  if (error.status === 429 || error.message?.includes('rate limit')) {
    return ErrorType.API_LIMIT
  }
  
  if (error.status === 401 || error.status === 403) {
    return ErrorType.AUTHENTICATION
  }
  
  if (error.name === 'TimeoutError') {
    return ErrorType.TIMEOUT
  }
  
  return ErrorType.INTERNAL
}

export function getErrorResponse(type: ErrorType, originalError: any) {
  const baseResponse = {
    confidence: 0.1,
    sentiment: { score: 0, label: 'neutral' as const, confidence: 0.5 },
    suggestedActions: [] as string[]
  }

  switch (type) {
    case ErrorType.API_LIMIT:
      return {
        ...baseResponse,
        content: 'Estou com muitas conversas simultâneas. Tente novamente em alguns segundos.',
        suggestedActions: ['retry_after_delay', 'escalate_to_human']
      }
    
    case ErrorType.NETWORK:
      return {
        ...baseResponse,
        content: 'Estou com problemas de conexão. Nossa equipe técnica foi notificada.',
        suggestedActions: ['retry', 'escalate_to_human']
      }
    
    case ErrorType.AUTHENTICATION:
      return {
        ...baseResponse,
        content: 'Problemas de autenticação detectados. Nossa equipe foi notificada.',
        suggestedActions: ['escalate_to_human']
      }
    
    case ErrorType.TIMEOUT:
      return {
        ...baseResponse,
        content: 'Sua solicitação está demorando mais que o esperado. Vou processar e responder em breve.',
        suggestedActions: ['retry', 'simplify_request']
      }
    
    case ErrorType.VALIDATION:
      return {
        ...baseResponse,
        content: 'Não consegui entender completamente sua mensagem. Pode reformular de forma mais simples?',
        suggestedActions: ['clarify_request']
      }
    
    default:
      return {
        ...baseResponse,
        content: 'Tive um problema técnico temporário. Nossa equipe foi notificada e em breve retornaremos o contato.',
        suggestedActions: ['retry', 'escalate_to_human']
      }
  }
}