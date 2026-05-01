import { Redis } from '@upstash/redis'

// Redis client singleton
let redisClient: Redis | null = null

export function getRedisClient(): Redis {
  if (!redisClient) {
    redisClient = new Redis({
      url: process.env.REDIS_URL || 'http://localhost:6379',
      token: process.env.REDIS_TOKEN || '',
    })
  }
  return redisClient
}

// Cache statistics key prefix
const CACHE_STATS_PREFIX = 'cache_stats:'

// Track cache hit/miss
async function recordCacheStat(key: string, hit: boolean): Promise<void> {
  try {
    const client = getRedisClient()
    const statsKey = `${CACHE_STATS_PREFIX}${key}`
    if (hit) {
      await client.hincrby(statsKey, 'hits', 1)
    } else {
      await client.hincrby(statsKey, 'misses', 1)
    }
    await client.hset(statsKey, { lastAccess: new Date().toISOString() })
  } catch (error) {
    // Silently fail stats recording to not affect main operations
  }
}

// Cache operations
export async function cacheGet<T>(key: string): Promise<T | null> {
  const client = getRedisClient()
  const value = await client.get<T>(key)
  await recordCacheStat(key, value !== null)
  return value
}

export async function cacheSet(
  key: string,
  value: unknown,
  ttl: number // seconds
): Promise<string> {
  const client = getRedisClient()
  const result = await client.set(key, value, { ex: ttl })
  return result as string
}

export async function cacheDel(key: string): Promise<number> {
  const client = getRedisClient()
  return await client.del(key)
}

// Cache key generators
export const CacheKeys = {
  novelDetail: (id: string) => `novel:${id}:detail`,
  novelChapters: (id: string, page: number) => `novel:${id}:chapters:${page}`,
  chapterContent: (novelId: string, num: number) =>
    `chapter:${novelId}:${num}:content`,
  searchResults: (query: string) => `search:${query}:results`,
  hotNovels: (category: string, period: string) =>
    `hot_novels:${category}:${period}`,
  recommend: (sessionId: string) => `recommend:${sessionId}`,
}

// Cache TTL constants (in seconds)
export const CacheTTL = {
  SHORT: 15 * 60, // 15 minutes
  MEDIUM: 60 * 60, // 1 hour
  LONG: 24 * 60 * 60, // 24 hours
  WEEK: 7 * 24 * 60 * 60, // 7 days
}