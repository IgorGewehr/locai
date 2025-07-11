import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';

// CORS configuration
export interface CorsOptions {
  origin?: string | string[] | ((origin: string) => boolean);
  methods?: string[];
  allowedHeaders?: string[];
  exposedHeaders?: string[];
  credentials?: boolean;
  maxAge?: number;
}

// Default CORS options
const defaultCorsOptions: CorsOptions = {
  origin: process.env.NEXT_PUBLIC_APP_URL || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
  credentials: true,
  maxAge: 86400, // 24 hours
};

// Check if origin is allowed
function isOriginAllowed(origin: string | null, allowedOrigin: CorsOptions['origin']): boolean {
  if (!origin) return false;
  
  if (typeof allowedOrigin === 'string') {
    return allowedOrigin === '*' || origin === allowedOrigin;
  }
  
  if (Array.isArray(allowedOrigin)) {
    return allowedOrigin.includes(origin);
  }
  
  if (typeof allowedOrigin === 'function') {
    return allowedOrigin(origin);
  }
  
  return false;
}

// CORS middleware
export function corsMiddleware(options: CorsOptions = {}) {
  const config = { ...defaultCorsOptions, ...options };
  
  return async function cors(request: NextRequest): Promise<NextResponse | null> {
    const origin = request.headers.get('origin');
    
    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      const response = new NextResponse(null, { status: 204 });
      
      // Set CORS headers
      if (origin && isOriginAllowed(origin, config.origin)) {
        response.headers.set('Access-Control-Allow-Origin', origin);
      } else if (config.origin === '*') {
        response.headers.set('Access-Control-Allow-Origin', '*');
      }
      
      if (config.methods) {
        response.headers.set('Access-Control-Allow-Methods', config.methods.join(', '));
      }
      
      if (config.allowedHeaders) {
        response.headers.set('Access-Control-Allow-Headers', config.allowedHeaders.join(', '));
      }
      
      if (config.credentials) {
        response.headers.set('Access-Control-Allow-Credentials', 'true');
      }
      
      if (config.maxAge) {
        response.headers.set('Access-Control-Max-Age', config.maxAge.toString());
      }
      
      return response;
    }
    
    // For actual requests, headers will be added to the response
    return null;
  };
}

// Apply CORS headers to response
export function applyCorsHeaders(
  request: NextRequest,
  response: NextResponse,
  options: CorsOptions = {}
): NextResponse {
  const config = { ...defaultCorsOptions, ...options };
  const origin = request.headers.get('origin');
  
  // Set CORS headers
  if (origin && isOriginAllowed(origin, config.origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
  } else if (config.origin === '*') {
    response.headers.set('Access-Control-Allow-Origin', '*');
  }
  
  if (config.credentials) {
    response.headers.set('Access-Control-Allow-Credentials', 'true');
  }
  
  if (config.exposedHeaders) {
    response.headers.set('Access-Control-Expose-Headers', config.exposedHeaders.join(', '));
  }
  
  return response;
}

// Security headers middleware
export function securityHeadersMiddleware() {
  return async function securityHeaders(request: NextRequest): Promise<NextResponse | null> {
    // Headers will be added to the response
    return null;
  };
}

// Apply security headers to response
export function applySecurityHeaders(response: NextResponse): NextResponse {
  // Prevent MIME type sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff');
  
  // Prevent clickjacking
  response.headers.set('X-Frame-Options', 'DENY');
  
  // Enable XSS protection
  response.headers.set('X-XSS-Protection', '1; mode=block');
  
  // Control referrer information
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Permissions Policy (formerly Feature Policy)
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  
  // Content Security Policy
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https: blob:",
    "connect-src 'self' https://api.openai.com https://firestore.googleapis.com wss://*.firebaseio.com",
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; ');
  
  response.headers.set('Content-Security-Policy', csp);
  
  // Strict Transport Security (only in production)
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
  
  return response;
}

// Request signing for webhooks
export function verifyWebhookSignature(
  request: NextRequest,
  secret: string,
  signatureHeader: string = 'x-webhook-signature'
): boolean {
  try {
    const signature = request.headers.get(signatureHeader);
    if (!signature) return false;
    
    // Get raw body (would need to be implemented based on your setup)
    const body = request.body;
    if (!body) return false;
    
    // Calculate expected signature
    const expectedSignature = createHash('sha256')
      .update(secret + body)
      .digest('hex');
    
    // Constant time comparison to prevent timing attacks
    return timingSafeEqual(signature, expectedSignature);
  } catch (error) {
    console.error('Webhook signature verification failed:', error);
    return false;
  }
}

// Timing safe string comparison
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  
  return result === 0;
}

// API key validation
export interface ApiKeyOptions {
  header?: string;
  query?: string;
  keys?: string[];
  validator?: (key: string) => Promise<boolean>;
}

export function apiKeyMiddleware(options: ApiKeyOptions) {
  const {
    header = 'x-api-key',
    query = 'api_key',
    keys = [],
    validator,
  } = options;
  
  return async function validateApiKey(request: NextRequest): Promise<NextResponse | null> {
    // Extract API key
    let apiKey = request.headers.get(header);
    
    if (!apiKey) {
      const url = new URL(request.url);
      apiKey = url.searchParams.get(query);
    }
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key required' },
        { status: 401 }
      );
    }
    
    // Validate API key
    let isValid = false;
    
    if (validator) {
      isValid = await validator(apiKey);
    } else if (keys.length > 0) {
      isValid = keys.includes(apiKey);
    }
    
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid API key' },
        { status: 401 }
      );
    }
    
    return null;
  };
}

// Combined security middleware
export function securityMiddleware(options?: {
  cors?: CorsOptions;
  apiKey?: ApiKeyOptions;
}) {
  return async function security(request: NextRequest): Promise<NextResponse | null> {
    // Handle CORS preflight
    if (options?.cors) {
      const corsResponse = await corsMiddleware(options.cors)(request);
      if (corsResponse) return corsResponse;
    }
    
    // Validate API key if configured
    if (options?.apiKey) {
      const apiKeyResponse = await apiKeyMiddleware(options.apiKey)(request);
      if (apiKeyResponse) return apiKeyResponse;
    }
    
    return null;
  };
}

// Apply all security measures to response
export function applySecurityMeasures(
  request: NextRequest,
  response: NextResponse,
  options?: {
    cors?: CorsOptions;
  }
): NextResponse {
  // Apply CORS headers
  if (options?.cors) {
    applyCorsHeaders(request, response, options.cors);
  }
  
  // Apply security headers
  applySecurityHeaders(response);
  
  return response;
}