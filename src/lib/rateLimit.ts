import { getRedisClient, isRedisAvailable } from './redis'

// Rate limit configuration
const RATE_LIMIT_WINDOW = 60 // 60 seconds sliding window
const RATE_LIMIT_MAX = 10 // 10 requests per minute

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
}

/**
 * Extract IP address from request
 */
export function extractIp(request: Request): string {
  // Check for forwarded headers (reverse proxy)
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    // Take the first IP in the chain
    return forwarded.split(',')[0].trim()
  }

  const realIp = request.headers.get('x-real-ip')
  if (realIp) {
    return realIp.trim()
  }

  // Fallback to a default for development
  return 'unknown'
}

/**
 * Check rate limit for an IP address
 * Uses sliding window algorithm with Redis
 */
export async function rateLimit(ip: string): Promise<RateLimitResult> {
  // If Redis is not available, skip rate limiting (fail open)
  if (!isRedisAvailable()) {
    return {
      allowed: true,
      remaining: RATE_LIMIT_MAX,
      resetAt: Date.now() + RATE_LIMIT_WINDOW * 1000,
    }
  }

  const redis = getRedisClient()
  const key = `rate_limit:${ip}`
  const now = Date.now()
  const windowStart = now - RATE_LIMIT_WINDOW * 1000

  try {
    // Use Redis transaction for atomic operations
    const pipeline = redis.pipeline()

    // Remove old entries outside the window
    pipeline.zremrangebyscore(key, 0, windowStart)

    // Count current entries in the window
    pipeline.zcard(key)

    // Execute the pipeline
    const results = (await pipeline.exec()) as [
      [null, number],
      [null, number]
    ]

    // Get the count from results
    const count = results[1][1]

    if (count >= RATE_LIMIT_MAX) {
      // Get the oldest entry to calculate reset time
      const oldest = await redis.zrange(key, 0, 0, { withScores: true })
      const oldestTime = oldest.length > 0 ? parseFloat((oldest[0] as { score: string }).score) : now

      return {
        allowed: false,
        remaining: 0,
        resetAt: Math.ceil(oldestTime + RATE_LIMIT_WINDOW * 1000),
      }
    }

    // Add current request
    await redis.zadd(key, { score: now, member: `${now}-${Math.random()}` })

    // Set expiry on the key
    await redis.expire(key, RATE_LIMIT_WINDOW)

    return {
      allowed: true,
      remaining: RATE_LIMIT_MAX - count - 1,
      resetAt: now + RATE_LIMIT_WINDOW * 1000,
    }
  } catch (error) {
    console.error('Rate limit error:', error)
    // On error, allow the request (fail open)
    return {
      allowed: true,
      remaining: RATE_LIMIT_MAX,
      resetAt: now + RATE_LIMIT_WINDOW * 1000,
    }
  }
}

/**
 * Create rate limit response headers
 */
export function rateLimitHeaders(result: RateLimitResult): HeadersInit {
  return {
    'X-RateLimit-Limit': String(RATE_LIMIT_MAX),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(Math.ceil(result.resetAt / 1000)),
  }
}

/**
 * Apply rate limiting to a request
 * Returns null if allowed, or a Response object with 429 if rate limited
 */
export async function applyRateLimit(request: Request): Promise<Response | null> {
  const ip = extractIp(request)
  const result = await rateLimit(ip)

  if (!result.allowed) {
    const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000)

    return new Response(
      JSON.stringify({
        success: false,
        error: 'Too many requests. Please try again later.',
        retryAfter,
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(retryAfter),
          ...rateLimitHeaders(result),
        },
      }
    )
  }

  return null
}