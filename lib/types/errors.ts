/**
 * Custom Error Classes for Type-Safe Error Handling
 *
 * These classes extend the standard Error class to include additional
 * context information while maintaining TypeScript type safety.
 */

/**
 * Base class for application errors with additional context
 */
export class AppError extends Error {
  constructor(
    message: string,
    public readonly error?: string,
    public readonly tenantId?: string,
    public readonly requestId?: string,
    public readonly component?: string,
    public readonly propertyId?: string,
    public readonly url?: string,
    public readonly errorMessage?: string,
    public readonly status?: number,
    public readonly parseError?: string,
    public readonly responseText?: string,
    public readonly responseType?: string
  ) {
    super(message);
    this.name = 'AppError';
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

/**
 * API-related errors
 */
export class ApiError extends AppError {
  constructor(
    message: string,
    public readonly status: number,
    context?: {
      error?: string;
      tenantId?: string;
      requestId?: string;
      url?: string;
    }
  ) {
    super(message, context?.error, context?.tenantId, context?.requestId, undefined, undefined, context?.url);
    this.name = 'ApiError';
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

/**
 * Firebase/Firestore errors
 */
export class FirestoreError extends AppError {
  constructor(
    message: string,
    context?: {
      error?: string;
      tenantId?: string;
      requestId?: string;
      component?: string;
    }
  ) {
    super(message, context?.error, context?.tenantId, context?.requestId, context?.component);
    this.name = 'FirestoreError';
    Object.setPrototypeOf(this, FirestoreError.prototype);
  }
}

/**
 * Validation errors
 */
export class ValidationError extends AppError {
  constructor(
    message: string,
    public readonly validationErrors?: Record<string, string[]>,
    context?: {
      tenantId?: string;
      requestId?: string;
    }
  ) {
    super(message, undefined, context?.tenantId, context?.requestId);
    this.name = 'ValidationError';
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * Authentication/Authorization errors
 */
export class AuthError extends AppError {
  constructor(
    message: string,
    context?: {
      error?: string;
      tenantId?: string;
      requestId?: string;
    }
  ) {
    super(message, context?.error, context?.tenantId, context?.requestId);
    this.name = 'AuthError';
    Object.setPrototypeOf(this, AuthError.prototype);
  }
}

/**
 * Property-related errors
 */
export class PropertyError extends AppError {
  constructor(
    message: string,
    public readonly propertyId: string,
    context?: {
      error?: string;
      tenantId?: string;
      requestId?: string;
    }
  ) {
    super(message, context?.error, context?.tenantId, context?.requestId, undefined, propertyId);
    this.name = 'PropertyError';
    Object.setPrototypeOf(this, PropertyError.prototype);
  }
}

/**
 * WhatsApp/Microservice errors
 */
export class WhatsAppError extends AppError {
  constructor(
    message: string,
    context?: {
      error?: string;
      errorMessage?: string;
      tenantId?: string;
      requestId?: string;
      status?: number;
      url?: string;
      responseText?: string;
      responseType?: string;
      parseError?: string;
    }
  ) {
    super(
      message,
      context?.error,
      context?.tenantId,
      context?.requestId,
      undefined,
      undefined,
      context?.url,
      context?.errorMessage,
      context?.status,
      context?.parseError,
      context?.responseText,
      context?.responseType
    );
    this.name = 'WhatsAppError';
    Object.setPrototypeOf(this, WhatsAppError.prototype);
  }
}

/**
 * Type guard to check if error is an AppError
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/**
 * Helper to extract error message safely
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unknown error occurred';
}

/**
 * Helper to create error response object
 */
export function createErrorResponse(
  error: unknown,
  defaultMessage: string = 'An error occurred'
): {
  error: string;
  message: string;
  tenantId?: string;
  requestId?: string;
  component?: string;
} {
  if (isAppError(error)) {
    return {
      error: error.error || defaultMessage,
      message: error.message,
      tenantId: error.tenantId,
      requestId: error.requestId,
      component: error.component,
    };
  }

  return {
    error: defaultMessage,
    message: getErrorMessage(error),
  };
}
