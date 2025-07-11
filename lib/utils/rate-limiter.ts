import { RateLimitError } from './error-handler';

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  keyGenerator?: (request: any) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: Date;
  retryAfter?: number;
}

export class RateLimiter {
  private storage = new Map<string, { requests: number; resetTime: number }>();
  private config: Required<RateLimitConfig>;

  constructor(config: RateLimitConfig) {
    this.config = {
      maxRequests: config.maxRequests,
      windowMs: config.windowMs,
      keyGenerator: config.keyGenerator || ((req) => req.ip || 'anonymous'),
      skipSuccessfulRequests: config.skipSuccessfulRequests || false,
      skipFailedRequests: config.skipFailedRequests || false,
    };

    // Clean up expired entries every minute
    setInterval(() => this.cleanup(), 60000);
  }

  async checkLimit(request: any): Promise<RateLimitInfo> {
    const key = this.config.keyGenerator(request);
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    // Get or create entry
    let entry = this.storage.get(key);
    if (!entry || entry.resetTime <= now) {
      entry = {
        requests: 0,
        resetTime: now + this.config.windowMs,
      };
      this.storage.set(key, entry);
    }

    // Check if limit exceeded
    if (entry.requests >= this.config.maxRequests) {
      const resetDate = new Date(entry.resetTime);
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
      
      throw new RateLimitError(
        `Rate limit exceeded. Try again in ${retryAfter} seconds.`
      );
    }

    // Increment request count
    entry.requests++;

    return {
      limit: this.config.maxRequests,
      remaining: this.config.maxRequests - entry.requests,
      reset: new Date(entry.resetTime),
      retryAfter: entry.requests >= this.config.maxRequests 
        ? Math.ceil((entry.resetTime - now) / 1000) 
        : undefined,
    };
  }

  async recordSuccess(request: any): Promise<void> {
    if (this.config.skipSuccessfulRequests) {
      const key = this.config.keyGenerator(request);
      const entry = this.storage.get(key);
      if (entry) {
        entry.requests = Math.max(0, entry.requests - 1);
      }
    }
  }

  async recordFailure(request: any): Promise<void> {
    if (this.config.skipFailedRequests) {
      const key = this.config.keyGenerator(request);
      const entry = this.storage.get(key);
      if (entry) {
        entry.requests = Math.max(0, entry.requests - 1);
      }
    }
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.storage.entries()) {
      if (entry.resetTime <= now) {
        this.storage.delete(key);
      }
    }
  }

  // Get current status for a key
  getStatus(request: any): RateLimitInfo | null {
    const key = this.config.keyGenerator(request);
    const entry = this.storage.get(key);
    
    if (!entry) {
      return null;
    }

    const now = Date.now();
    if (entry.resetTime <= now) {
      return null;
    }

    return {
      limit: this.config.maxRequests,
      remaining: this.config.maxRequests - entry.requests,
      reset: new Date(entry.resetTime),
      retryAfter: entry.requests >= this.config.maxRequests 
        ? Math.ceil((entry.resetTime - now) / 1000) 
        : undefined,
    };
  }

  // Reset rate limit for a specific key
  reset(request: any): void {
    const key = this.config.keyGenerator(request);
    this.storage.delete(key);
  }

  // Get all active entries (for monitoring)
  getActiveEntries(): Array<{ key: string; requests: number; resetTime: Date }> {
    const now = Date.now();
    const active: Array<{ key: string; requests: number; resetTime: Date }> = [];

    for (const [key, entry] of this.storage.entries()) {
      if (entry.resetTime > now) {
        active.push({
          key,
          requests: entry.requests,
          resetTime: new Date(entry.resetTime),
        });
      }
    }

    return active;
  }
}

// Pre-configured rate limiters for common use cases
export const rateLimiters = {
  // API endpoints - 100 requests per minute
  api: new RateLimiter({
    maxRequests: 100,
    windowMs: 60 * 1000, // 1 minute
    keyGenerator: (req) => req.ip || req.headers?.['x-forwarded-for'] || 'default',
  }),

  // Authentication - 5 attempts per 15 minutes
  auth: new RateLimiter({
    maxRequests: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
    keyGenerator: (req) => req.ip || req.headers?.['x-forwarded-for'] || 'default',
    skipSuccessfulRequests: true,
  }),

  // WhatsApp messages - 20 per minute per phone
  whatsapp: new RateLimiter({
    maxRequests: 20,
    windowMs: 60 * 1000, // 1 minute
    keyGenerator: (req) => req.phone || req.from || 'default',
  }),

  // OpenAI API - 10 requests per minute
  openai: new RateLimiter({
    maxRequests: 10,
    windowMs: 60 * 1000, // 1 minute
    keyGenerator: (req) => req.userId || req.tenantId || 'default',
  }),

  // Password reset - 3 attempts per hour
  passwordReset: new RateLimiter({
    maxRequests: 3,
    windowMs: 60 * 60 * 1000, // 1 hour
    keyGenerator: (req) => req.email || req.ip || 'default',
  }),

  // File uploads - 50 uploads per hour
  fileUpload: new RateLimiter({
    maxRequests: 50,
    windowMs: 60 * 60 * 1000, // 1 hour
    keyGenerator: (req) => req.userId || req.ip || 'default',
  }),

  // Search queries - 200 per hour
  search: new RateLimiter({
    maxRequests: 200,
    windowMs: 60 * 60 * 1000, // 1 hour
    keyGenerator: (req) => req.userId || req.ip || 'default',
  }),
};

// Middleware function for Next.js API routes
export function createRateLimitMiddleware(rateLimiter: RateLimiter) {
  return async (request: any, response: any, next?: Function) => {
    try {
      const rateLimitInfo = await rateLimiter.checkLimit(request);
      
      // Add rate limit headers
      if (response.setHeader) {
        response.setHeader('X-RateLimit-Limit', rateLimitInfo.limit.toString());
        response.setHeader('X-RateLimit-Remaining', rateLimitInfo.remaining.toString());
        response.setHeader('X-RateLimit-Reset', rateLimitInfo.reset.toISOString());
        
        if (rateLimitInfo.retryAfter) {
          response.setHeader('Retry-After', rateLimitInfo.retryAfter.toString());
        }
      }
      
      // Call next middleware if provided
      if (next) {
        return next();
      }
      
      return rateLimitInfo;
    } catch (error) {
      if (error instanceof RateLimitError) {
        if (response.status) {
          return response.status(429).json({
            success: false,
            error: {
              code: 'RATE_LIMIT_EXCEEDED',
              message: error.message,
              type: 'RATE_LIMIT',
              timestamp: new Date().toISOString(),
            },
          });
        }
      }
      throw error;
    }
  };
}

// Helper function to extract IP from Next.js request
export function getClientIP(request: any): string {
  const forwarded = request.headers?.['x-forwarded-for'];
  const real = request.headers?.['x-real-ip'];
  const remote = request.connection?.remoteAddress;
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  return real || remote || 'unknown';
}

// Helper function to get user identifier
export function getUserIdentifier(request: any): string {
  // Try to get user ID from auth token
  const authHeader = request.headers?.authorization;
  if (authHeader) {
    // Extract user ID from JWT token (simplified)
    try {
      const token = authHeader.replace('Bearer ', '');
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.sub || payload.userId || 'authenticated';
    } catch (e) {
      // Token parsing failed, fall back to IP
    }
  }
  
  return getClientIP(request);
}

// Distributed rate limiter interface (for Redis, etc.)
export interface DistributedRateLimiter {
  checkLimit(key: string, limit: number, windowMs: number): Promise<RateLimitInfo>;
  recordSuccess(key: string): Promise<void>;
  recordFailure(key: string): Promise<void>;
  reset(key: string): Promise<void>;
}

// Redis-based rate limiter (placeholder - requires Redis client)
export class RedisRateLimiter implements DistributedRateLimiter {
  constructor(private redisClient: any) {}

  async checkLimit(key: string, limit: number, windowMs: number): Promise<RateLimitInfo> {
    // Redis implementation would go here
    // This is a placeholder for production use
    throw new Error('Redis rate limiter not implemented');
  }

  async recordSuccess(key: string): Promise<void> {
    // Redis implementation
  }

  async recordFailure(key: string): Promise<void> {
    // Redis implementation
  }

  async reset(key: string): Promise<void> {
    // Redis implementation
  }
}