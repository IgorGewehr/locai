import { NextRequest, NextResponse } from 'next/server'
import { RateLimiterMemory } from 'rate-limiter-flexible'

// In-memory rate limiters for different endpoints
const rateLimiters = new Map<string, RateLimiterMemory>()

export interface RateLimitConfig {
  points: number // Number of requests
  duration: number // Per duration in seconds
  blockDuration?: number // Block duration in seconds
}

// Default configurations for different operations
export const RATE_LIMIT_CONFIGS = {
  read: { points: 100, duration: 60 }, // 100 requests per minute
  write: { points: 20, duration: 60 }, // 20 requests per minute
  delete: { points: 10, duration: 60 }, // 10 requests per minute
  search: { points: 50, duration: 60 }, // 50 searches per minute
} as const

function getRateLimiter(key: string, config: RateLimitConfig): RateLimiterMemory {
  const limiterKey = `${key}-${config.points}-${config.duration}`

  if (!rateLimiters.has(limiterKey)) {
    rateLimiters.set(limiterKey, new RateLimiterMemory({
      points: config.points,
      duration: config.duration,
      blockDuration: config.blockDuration || 60, // Default 1 minute block
    }))
  }

  return rateLimiters.get(limiterKey)!
}

export async function withRateLimit(
  request: NextRequest,
  config: RateLimitConfig,
  handler: (request: NextRequest) => Promise<NextResponse>
): Promise<NextResponse> {
  try {
    // Get client identifier (IP address or user ID)
    const clientId = request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'anonymous'

    // Get or create rate limiter for this configuration
    const rateLimiter = getRateLimiter(`api-${request.url}`, config)

    try {
      // Consume 1 point
      await rateLimiter.consume(clientId)

      // Call the handler
      const response = await handler(request)

      // Add rate limit headers
      const rateLimitInfo = await rateLimiter.get(clientId)
      if (rateLimitInfo) {
        response.headers.set('X-RateLimit-Limit', config.points.toString())
        response.headers.set('X-RateLimit-Remaining', rateLimitInfo.remainingPoints.toString())
        response.headers.set('X-RateLimit-Reset', new Date(Date.now() + rateLimitInfo.msBeforeNext).toISOString())
      }

      return response
    } catch (rejRes: any) {
      // Rate limit exceeded
      const secs = Math.round(rejRes.msBeforeNext / 1000) || 60
      return NextResponse.json(
        { 
          error: 'Limite de requisições excedido', 
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: secs
        },
        { 
          status: 429,
          headers: {
            'Retry-After': secs.toString(),
            'X-RateLimit-Limit': config.points.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(Date.now() + rejRes.msBeforeNext).toISOString()
          }
        }
      )
    }
  } catch (error) {
    // In case of error, allow the request to proceed
    return handler(request)
  }
}

// Combine auth and rate limit
export async function withAuthAndRateLimit(
  request: NextRequest,
  config: RateLimitConfig,
  authHandler: (request: NextRequest) => Promise<NextResponse>
): Promise<NextResponse> {
  return withRateLimit(request, config, authHandler)
}

// Specific rate limiter for authentication endpoints
export const authRateLimit = {
  points: 5, // 5 attempts
  duration: 300, // Per 5 minutes
  blockDuration: 900 // Block for 15 minutes after exceeding
}

// Apply rate limit headers to response
export function applyRateLimitHeaders(
  response: NextResponse,
  config: RateLimitConfig,
  remaining: number,
  resetTime: Date
): NextResponse {
  response.headers.set('X-RateLimit-Limit', config.points.toString())
  response.headers.set('X-RateLimit-Remaining', remaining.toString())
  response.headers.set('X-RateLimit-Reset', resetTime.toISOString())
  return response
}

// Create a rate limiter middleware for specific endpoints
export function createRateLimitMiddleware(config: RateLimitConfig) {
  return (handler: (req: NextRequest) => Promise<NextResponse>) => {
    return (req: NextRequest) => withRateLimit(req, config, handler)
  }
}