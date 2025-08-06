/**
 * Custom Error classes for enhanced error handling
 */

export class APIError extends Error {
  public requestId?: string;
  public error?: string;
  public statusCode?: number;
  public uid?: string;
  public phone?: string;
  public data?: any;

  constructor(message: string, options?: {
    requestId?: string;
    error?: string;
    statusCode?: number;
    uid?: string;
    phone?: string;
    data?: any;
  }) {
    super(message);
    this.name = 'APIError';
    
    if (options) {
      this.requestId = options.requestId;
      this.error = options.error;
      this.statusCode = options.statusCode;
      this.uid = options.uid;
      this.phone = options.phone;
      this.data = options.data;
    }
  }
}

export class AuthError extends APIError {
  constructor(message: string, options?: {
    requestId?: string;
    uid?: string;
  }) {
    super(message, options);
    this.name = 'AuthError';
  }
}

export class ValidationError extends APIError {
  constructor(message: string, options?: {
    requestId?: string;
    data?: any;
  }) {
    super(message, options);
    this.name = 'ValidationError';
  }
}

export class TenantError extends APIError {
  constructor(message: string, options?: {
    requestId?: string;
    phone?: string;
    error?: string;
  }) {
    super(message, options);
    this.name = 'TenantError';
  }
}

// Utility function to create error objects with additional properties for logging
export function createLogError(message: string, context?: Record<string, any>): APIError {
  return new APIError(message, context);
}