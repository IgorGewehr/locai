import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware, AuthContext } from './auth';
import { rateLimit, RateLimitOptions, applyRateLimitHeaders } from './rate-limit';
import { corsMiddleware, securityHeadersMiddleware, applySecurityMeasures, CorsOptions } from './security';
import { withErrorHandler } from './error-handler';
import { auditLogger } from '@/lib/services/audit-logger';
import { z } from 'zod';

export interface ApiMiddlewareOptions {
  // Authentication
  requireAuth?: boolean;
  requireRole?: ('admin' | 'agent' | 'user')[];
  requireTenant?: string;
  allowPublic?: boolean;
  
  // Rate limiting
  rateLimit?: RateLimitOptions | false;
  
  // CORS
  cors?: CorsOptions | false;
  
  // Validation
  bodySchema?: z.ZodSchema;
  querySchema?: z.ZodSchema;
  paramsSchema?: z.ZodSchema;
  
  // Audit logging
  audit?: {
    action: string;
    resource: string;
    getResourceId?: (req: NextRequest, params?: any) => string | undefined;
  } | false;
  
  // Custom middleware
  middleware?: Array<(req: NextRequest) => Promise<NextResponse | null>>;
}

export interface ApiContext {
  auth?: AuthContext;
  body?: any;
  query?: any;
  params?: any;
  startTime: number;
}

// Default rate limit options for different operations
const defaultRateLimits: Record<string, RateLimitOptions> = {
  read: { windowMs: 60 * 1000, max: 100 }, // 100 req/min
  write: { windowMs: 60 * 1000, max: 20 }, // 20 req/min
  delete: { windowMs: 60 * 1000, max: 10 }, // 10 req/min
  auth: { windowMs: 15 * 60 * 1000, max: 5 }, // 5 req/15min
};

// Determine operation type from method
function getOperationType(method: string): string {
  switch (method) {
    case 'GET':
    case 'HEAD':
      return 'read';
    case 'POST':
    case 'PUT':
    case 'PATCH':
      return 'write';
    case 'DELETE':
      return 'delete';
    default:
      return 'read';
  }
}

// Main API middleware wrapper
export function apiMiddleware(options: ApiMiddlewareOptions = {}) {
  return function <T extends (...args: any[]) => Promise<NextResponse>>(
    handler: T
  ): T {
    return withErrorHandler(async (request: NextRequest, ...args: any[]) => {
      const context: ApiContext = {
        startTime: Date.now(),
      };

      // 1. Apply CORS if enabled
      if (options.cors !== false) {
        const corsResponse = await corsMiddleware(options.cors || {})(request);
        if (corsResponse) return corsResponse; // Handle preflight
      }

      // 2. Apply rate limiting if enabled
      if (options.rateLimit !== false) {
        const rateLimitOptions = options.rateLimit || defaultRateLimits[getOperationType(request.method)];
        const rateLimitResponse = await rateLimit(rateLimitOptions)(request);
        if (rateLimitResponse) return rateLimitResponse;
      }

      // 3. Apply authentication if required
      if (options.requireAuth || options.requireRole) {
        const authResult = await authMiddleware(request, {
          requireRole: options.requireRole,
          requireTenant: options.requireTenant,
          allowPublic: options.allowPublic,
        });

        if (!authResult.success) {
          return authResult.response!;
        }

        context.auth = authResult.context;
      }

      // 4. Apply custom middleware
      if (options.middleware) {
        for (const middleware of options.middleware) {
          const response = await middleware(request);
          if (response) return response;
        }
      }

      // 5. Parse and validate request data
      try {
        // Parse body for non-GET requests
        if (request.method !== 'GET' && request.method !== 'HEAD') {
          const contentType = request.headers.get('content-type');
          
          if (contentType?.includes('application/json')) {
            context.body = await request.json();
            
            // Validate body if schema provided
            if (options.bodySchema) {
              context.body = options.bodySchema.parse(context.body);
            }
          }
        }

        // Parse query parameters
        const url = new URL(request.url);
        const query: Record<string, any> = {};
        
        url.searchParams.forEach((value, key) => {
          // Handle array parameters
          if (query[key]) {
            if (Array.isArray(query[key])) {
              query[key].push(value);
            } else {
              query[key] = [query[key], value];
            }
          } else {
            query[key] = value;
          }
        });

        context.query = query;

        // Validate query if schema provided
        if (options.querySchema) {
          context.query = options.querySchema.parse(context.query);
        }

        // Parse params if provided
        if (args[0] && typeof args[0] === 'object' && 'params' in args[0]) {
          context.params = args[0].params;
          
          // Validate params if schema provided
          if (options.paramsSchema) {
            context.params = options.paramsSchema.parse(context.params);
          }
        }
      } catch (error) {
        if (error instanceof z.ZodError) {
          return NextResponse.json(
            {
              error: {
                message: 'Validation failed',
                code: 'VALIDATION_ERROR',
                details: error.errors,
              },
            },
            { status: 400 }
          );
        }
        throw error;
      }

      // 6. Call the handler with context
      const response = await handler(request, context, ...args.slice(1));

      // 7. Apply security headers
      if (options.cors !== false) {
        applySecurityMeasures(request, response, { cors: options.cors });
      } else {
        applySecurityMeasures(request, response);
      }

      // 8. Apply rate limit headers
      applyRateLimitHeaders(request, response);

      // 9. Audit logging
      if (options.audit !== false && options.audit && context.auth) {
        const resourceId = options.audit.getResourceId?.(request, context.params);
        
        await auditLogger.log(
          request,
          {
            status: response.status,
            body: response.status >= 400 ? await response.clone().json() : undefined,
          },
          {
            userId: context.auth.uid,
            userEmail: context.auth.email,
            tenantId: context.auth.tenantId,
            action: options.audit.action,
            resource: options.audit.resource,
            resourceId,
          },
          context.startTime
        );
      }

      return response;
    }) as T;
  };
}

// Convenience wrappers for common patterns
export const publicEndpoint = (options: ApiMiddlewareOptions = {}) => 
  apiMiddleware({ ...options, requireAuth: false });

export const authenticatedEndpoint = (options: ApiMiddlewareOptions = {}) => 
  apiMiddleware({ ...options, requireAuth: true });

export const adminEndpoint = (options: ApiMiddlewareOptions = {}) => 
  apiMiddleware({ ...options, requireAuth: true, requireRole: ['admin'] });

export const agentEndpoint = (options: ApiMiddlewareOptions = {}) => 
  apiMiddleware({ ...options, requireAuth: true, requireRole: ['admin', 'agent'] });

// Helper to extract context from request
export function getApiContext(request: any): ApiContext | undefined {
  return request.context;
}