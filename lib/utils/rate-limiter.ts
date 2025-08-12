/**
 * Rate Limiter for API Protection
 * Token bucket algorithm with IP-based limiting
 */

import { logger } from '@/lib/utils/logger';
import { NextRequest } from 'next/server';

interface RateLimitConfig {
  windowMs: number;     // Time window in milliseconds
  maxRequests: number;  // Max requests per window
  message?: string;     // Custom error message
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

class RateLimiter {
  private limits: Map<string, RateLimitEntry> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Cleanup expired entries every minute
    this.startCleanup();
  }

  /**
   * Check if request should be rate limited
   */
  isAllowed(
    identifier: string,
    config: RateLimitConfig = {
      windowMs: 60000,      // 1 minute default
      maxRequests: 60,      // 60 requests per minute default
    }
  ): { allowed: boolean; retryAfter?: number; remaining: number } {
    const now = Date.now();
    const entry = this.limits.get(identifier);

    if (!entry || now > entry.resetTime) {
      // New window
      this.limits.set(identifier, {
        count: 1,
        resetTime: now + config.windowMs
      });

      logger.debug('🚦 [RateLimit] New window', {
        identifier: identifier.substring(0, 10) + '***',
        remaining: config.maxRequests - 1
      });

      return {
        allowed: true,
        remaining: config.maxRequests - 1
      };
    }

    // Existing window
    if (entry.count >= config.maxRequests) {
      // Rate limit exceeded
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
      
      logger.warn('⛔ [RateLimit] Limit exceeded', {
        identifier: identifier.substring(0, 10) + '***',
        retryAfter
      });

      return {
        allowed: false,
        retryAfter,
        remaining: 0
      };
    }

    // Increment counter
    entry.count++;
    this.limits.set(identifier, entry);

    return {
      allowed: true,
      remaining: config.maxRequests - entry.count
    };
  }

  /**
   * Reset rate limit for identifier
   */
  reset(identifier: string): void {
    this.limits.delete(identifier);
    logger.debug('🔄 [RateLimit] Reset', { 
      identifier: identifier.substring(0, 10) + '***' 
    });
  }

  /**
   * Get rate limit status for identifier
   */
  getStatus(identifier: string, config: RateLimitConfig): {
    count: number;
    remaining: number;
    resetTime: number;
  } {
    const entry = this.limits.get(identifier);
    
    if (!entry) {
      return {
        count: 0,
        remaining: config.maxRequests,
        resetTime: Date.now() + config.windowMs
      };
    }

    return {
      count: entry.count,
      remaining: Math.max(0, config.maxRequests - entry.count),
      resetTime: entry.resetTime
    };
  }

  /**
   * Clean up expired entries
   */
  private startCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      const keysToDelete: string[] = [];

      for (const [key, entry] of this.limits.entries()) {
        if (now > entry.resetTime) {
          keysToDelete.push(key);
        }
      }

      if (keysToDelete.length > 0) {
        keysToDelete.forEach(key => this.limits.delete(key));
        logger.debug('🧹 [RateLimit] Cleanup', { 
          expired: keysToDelete.length,
          remaining: this.limits.size 
        });
      }
    }, 60000); // Every minute
  }

  /**
   * Destroy rate limiter
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.limits.clear();
  }
}

// Singleton instances for different rate limit buckets
const limiters: Map<string, RateLimiter> = new Map();

/**
 * Get or create rate limiter for specific bucket
 */
export function getRateLimiter(bucket: string = 'default'): RateLimiter {
  if (!limiters.has(bucket)) {
    limiters.set(bucket, new RateLimiter());
  }
  return limiters.get(bucket)!;
}

/**
 * Extract client identifier from request
 */
export function getClientIdentifier(request: NextRequest): string {
  // Try to get real IP from various headers
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const cfConnectingIp = request.headers.get('cf-connecting-ip');
  
  // Priority: CF > X-Real-IP > X-Forwarded-For > request.ip
  const ip = cfConnectingIp || 
             realIp || 
             forwardedFor?.split(',')[0].trim() || 
             request.ip ||
             'unknown';

  return ip;
}

/**
 * Rate limit configurations for different endpoints
 */
export const rateLimitConfigs = {
  // Public mini-site endpoints
  miniSite: {
    windowMs: 60000,      // 1 minute
    maxRequests: 100,     // 100 requests per minute
    message: 'Muitas requisições. Tente novamente em alguns segundos.'
  },
  
  // Mini-site inquiry/contact form
  miniSiteInquiry: {
    windowMs: 3600000,    // 1 hour
    maxRequests: 10,      // 10 inquiries per hour
    message: 'Limite de envios atingido. Tente novamente mais tarde.'
  },

  // WhatsApp webhook
  whatsapp: {
    windowMs: 60000,      // 1 minute
    maxRequests: 200,     // 200 messages per minute
    message: 'Rate limit exceeded for WhatsApp'
  },

  // Authentication endpoints
  auth: {
    windowMs: 900000,     // 15 minutes
    maxRequests: 5,       // 5 attempts per 15 minutes
    message: 'Muitas tentativas de login. Aguarde 15 minutos.'
  },

  // API general
  api: {
    windowMs: 60000,      // 1 minute
    maxRequests: 60,      // 60 requests per minute
    message: 'API rate limit exceeded'
  }
};

/**
 * Middleware helper for rate limiting
 */
export function checkRateLimit(
  request: NextRequest,
  config: RateLimitConfig = rateLimitConfigs.api
): { allowed: boolean; headers: Record<string, string> } {
  const identifier = getClientIdentifier(request);
  const limiter = getRateLimiter('api');
  const result = limiter.isAllowed(identifier, config);

  const headers: Record<string, string> = {
    'X-RateLimit-Limit': config.maxRequests.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': new Date(Date.now() + config.windowMs).toISOString()
  };

  if (!result.allowed && result.retryAfter) {
    headers['Retry-After'] = result.retryAfter.toString();
  }

  return {
    allowed: result.allowed,
    headers
  };
}