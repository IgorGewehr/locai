// lib/services/rate-limit-service.ts
import { Redis } from 'ioredis'

interface RateLimitConfig {
  windowMs: number // Time window in milliseconds
  maxRequests: number // Maximum requests per window
  keyPrefix?: string // Optional prefix for keys
}

export class RateLimitService {
  private redis: Redis | null = null
  private inMemoryStore: Map<string, { count: number; resetAt: number }> = new Map()

  constructor() {
    // Try to connect to Redis if available
    if (process.env.REDIS_URL) {
      try {
        this.redis = new Redis(process.env.REDIS_URL)
      } catch (error) {
        console.warn('Failed to connect to Redis, falling back to in-memory rate limiting')
      }
    }
  }

  async checkRateLimit(
    key: string,
    config: RateLimitConfig
  ): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
    const fullKey = `${config.keyPrefix || 'rate_limit'}:${key}`
    const now = Date.now()
    const windowStart = now - config.windowMs
    
    if (this.redis) {
      try {
        // Use Redis sliding window algorithm
        const pipe = this.redis.pipeline()
        
        // Remove old entries
        pipe.zremrangebyscore(fullKey, '-inf', windowStart)
        
        // Count current entries
        pipe.zcard(fullKey)
        
        // Add current request
        pipe.zadd(fullKey, now, `${now}-${Math.random()}`)
        
        // Set expiry
        pipe.expire(fullKey, Math.ceil(config.windowMs / 1000))
        
        const results = await pipe.exec()
        const count = results?.[1]?.[1] as number || 0
        
        const allowed = count < config.maxRequests
        const remaining = Math.max(0, config.maxRequests - count - 1)
        const resetAt = now + config.windowMs
        
        return { allowed, remaining, resetAt }
      } catch (error) {
        console.error('Redis rate limit error:', error)
        // Fall back to in-memory
      }
    }
    
    // In-memory fallback
    const entry = this.inMemoryStore.get(fullKey)
    
    if (!entry || entry.resetAt < now) {
      // New window
      this.inMemoryStore.set(fullKey, {
        count: 1,
        resetAt: now + config.windowMs
      })
      
      // Clean up old entries periodically
      if (this.inMemoryStore.size > 10000) {
        this.cleanupInMemoryStore()
      }
      
      return {
        allowed: true,
        remaining: config.maxRequests - 1,
        resetAt: now + config.windowMs
      }
    }
    
    if (entry.count >= config.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: entry.resetAt
      }
    }
    
    entry.count++
    return {
      allowed: true,
      remaining: config.maxRequests - entry.count,
      resetAt: entry.resetAt
    }
  }

  private cleanupInMemoryStore(): void {
    const now = Date.now()
    for (const [key, entry] of this.inMemoryStore.entries()) {
      if (entry.resetAt < now) {
        this.inMemoryStore.delete(key)
      }
    }
  }

  async reset(key: string, keyPrefix?: string): Promise<void> {
    const fullKey = `${keyPrefix || 'rate_limit'}:${key}`
    
    if (this.redis) {
      try {
        await this.redis.del(fullKey)
      } catch (error) {
        console.error('Redis reset error:', error)
      }
    }
    
    this.inMemoryStore.delete(fullKey)
  }

  async close(): Promise<void> {
    if (this.redis) {
      await this.redis.quit()
    }
  }
}

// Default rate limit configurations
export const RATE_LIMITS = {
  whatsapp: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 20,
    keyPrefix: 'whatsapp'
  },
  api: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100,
    keyPrefix: 'api'
  },
  ai: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10,
    keyPrefix: 'ai'
  }
}

// Singleton instance
let rateLimitService: RateLimitService | null = null

export function getRateLimitService(): RateLimitService {
  if (!rateLimitService) {
    rateLimitService = new RateLimitService()
  }
  return rateLimitService
}