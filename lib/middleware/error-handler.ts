import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { 
  AppError, 
  ValidationError, 
  AuthenticationError, 
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  ExternalServiceError
} from '@/lib/utils/errors';

interface ErrorResponse {
  error: {
    message: string;
    code: string;
    details?: any;
    timestamp: string;
    requestId?: string;
  };
}

// Generate request ID
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Sanitize error message for production
function sanitizeErrorMessage(message: string, isDevelopment: boolean): string {
  if (isDevelopment) {
    return message;
  }

  // Remove sensitive patterns
  const sensitized = message
    .replace(/\/[a-zA-Z0-9_\-\/]+\.(ts|js|tsx|jsx)/g, '[file]') // File paths
    .replace(/line \d+/gi, 'line [n]') // Line numbers
    .replace(/column \d+/gi, 'column [n]') // Column numbers
    .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[email]') // Emails
    .replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, '[ip]') // IP addresses
    .replace(/Bearer [A-Za-z0-9\-._~+\/]+=*/g, 'Bearer [token]') // Auth tokens
    .replace(/[a-fA-F0-9]{32,}/g, '[hash]'); // Long hex strings (potential keys)

  return sensitized;
}

// Log error for monitoring
function logError(error: any, request: NextRequest, requestId: string): void {
  const logData = {
    requestId,
    timestamp: new Date().toISOString(),
    method: request.method,
    url: request.url,
    headers: {
      'user-agent': request.headers.get('user-agent'),
      'x-forwarded-for': request.headers.get('x-forwarded-for'),
    },
    error: {
      name: error.name,
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      code: error.code,
    },
  };

  // In production, send to logging service
  if (process.env.NODE_ENV === 'production') {
    // Error tracking handled by logger service
    // Sentry, LogRocket integration available
  }
}

// Main error handler
export function handleError(
  error: any,
  request?: NextRequest
): NextResponse {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const requestId = generateRequestId();

  // Log error if request provided
  if (request) {
    logError(error, request, requestId);
  }

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    const response: ErrorResponse = {
      error: {
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: isDevelopment ? error.errors : error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message,
        })),
        timestamp: new Date().toISOString(),
        requestId,
      },
    };

    return NextResponse.json(response, { status: 400 });
  }

  // Handle custom app errors
  if (error instanceof AppError) {
    const response: ErrorResponse = {
      error: {
        message: sanitizeErrorMessage(error.message, isDevelopment),
        code: error.code,
        details: isDevelopment ? error.details : undefined,
        timestamp: new Date().toISOString(),
        requestId,
      },
    };

    // Determine status code
    let status = 500;
    if (error instanceof ValidationError) status = 400;
    else if (error instanceof AuthenticationError) status = 401;
    else if (error instanceof AuthorizationError) status = 403;
    else if (error instanceof NotFoundError) status = 404;
    else if (error instanceof ConflictError) status = 409;
    else if (error instanceof RateLimitError) status = 429;
    else if (error instanceof ExternalServiceError) status = 502;

    return NextResponse.json(response, { status });
  }

  // Handle Firebase errors
  if (error.code?.startsWith('auth/')) {
    const response: ErrorResponse = {
      error: {
        message: getFirebaseErrorMessage(error.code),
        code: error.code,
        timestamp: new Date().toISOString(),
        requestId,
      },
    };

    return NextResponse.json(response, { status: 401 });
  }

  // Handle generic errors
  const response: ErrorResponse = {
    error: {
      message: isDevelopment ? error.message : 'An unexpected error occurred',
      code: 'INTERNAL_ERROR',
      details: isDevelopment ? {
        name: error.name,
        stack: error.stack,
      } : undefined,
      timestamp: new Date().toISOString(),
      requestId,
    },
  };

  return NextResponse.json(response, { status: 500 });
}

// Firebase error message mapping
function getFirebaseErrorMessage(code: string): string {
  const messages: Record<string, string> = {
    'auth/invalid-email': 'Invalid email address',
    'auth/user-disabled': 'This account has been disabled',
    'auth/user-not-found': 'No account found with this email',
    'auth/wrong-password': 'Incorrect password',
    'auth/email-already-in-use': 'An account already exists with this email',
    'auth/weak-password': 'Password is too weak',
    'auth/invalid-credential': 'Invalid credentials',
    'auth/too-many-requests': 'Too many failed attempts. Please try again later',
    'auth/network-request-failed': 'Network error. Please check your connection',
  };

  return messages[code] || 'Authentication error';
}

// Async wrapper for route handlers
export function withErrorHandler<T extends (...args: any[]) => Promise<NextResponse>>(
  handler: T
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await handler(...args);
    } catch (error) {
      // Extract request from args if available
      const request = args.find(arg => arg instanceof NextRequest);
      return handleError(error, request);
    }
  }) as T;
}

// Helper to create consistent error responses
export function errorResponse(
  message: string,
  status: number,
  code?: string,
  details?: any
): NextResponse {
  const response: ErrorResponse = {
    error: {
      message,
      code: code || 'ERROR',
      details,
      timestamp: new Date().toISOString(),
    },
  };

  return NextResponse.json(response, { status });
}

// Helper to create consistent success responses
export function successResponse<T>(
  data: T,
  status: number = 200,
  headers?: HeadersInit
): NextResponse {
  return NextResponse.json(
    {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    },
    { status, headers }
  );
}

// Middleware to add error handling to all API routes
export async function errorHandlerMiddleware(
  request: NextRequest,
  handler: () => Promise<NextResponse>
): Promise<NextResponse> {
  try {
    const response = await handler();

    // Add security headers
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

    return response;
  } catch (error) {
    return handleError(error, request);
  }
}