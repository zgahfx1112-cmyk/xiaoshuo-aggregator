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

// Cache operations
export async function cacheGet<T>(key: string): Promise<T | null> {
  const client = getRedisClient()
  const value = await client.get<T>(key)
  return value
}

export async function cacheSet(
  key: string,
  value: unknown,
  ttl: number // seconds
): Promise<string> {
  const client = getRedisClient()
  const result = await client.set(key, value, { ex: ttl })
  return result
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