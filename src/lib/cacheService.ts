import { prisma } from './prisma'
import { cacheGet, cacheSet, cacheDel, CacheKeys, CacheTTL, getRedisClient } from './redis'

// Cache statistics key prefix
const CACHE_STATS_PREFIX = 'cache_stats:'

// Cache stats interface
export interface CacheStats {
  hits: number
  misses: number
  lastAccess: string
}

// Track cache hit
export async function recordCacheHit(key: string): Promise<void> {
  try {
    const client = getRedisClient()
    const statsKey = `${CACHE_STATS_PREFIX}${key}`
    await client.hincrby(statsKey, 'hits', 1)
    await client.hset(statsKey, { lastAccess: new Date().toISOString() })
  } catch (error) {
    console.error('Failed to record cache hit:', error)
  }
}

// Track cache miss
export async function recordCacheMiss(key: string): Promise<void> {
  try {
    const client = getRedisClient()
    const statsKey = `${CACHE_STATS_PREFIX}${key}`
    await client.hincrby(statsKey, 'misses', 1)
    await client.hset(statsKey, { lastAccess: new Date().toISOString() })
  } catch (error) {
    console.error('Failed to record cache miss:', error)
  }
}

// Get cache statistics for a key
export async function getCacheStats(key: string): Promise<CacheStats | null> {
  try {
    const client = getRedisClient()
    const statsKey = `${CACHE_STATS_PREFIX}${key}`
    const stats = await client.hgetall(statsKey)

    if (!stats || Object.keys(stats).length === 0) {
      return null
    }

    return {
      hits: parseInt((stats.hits as string) || '0', 10),
      misses: parseInt((stats.misses as string) || '0', 10),
      lastAccess: (stats.lastAccess as string) || new Date().toISOString(),
    }
  } catch (error) {
    console.error('Failed to get cache stats:', error)
    return null
  }
}

// Get overall cache statistics
export async function getOverallCacheStats(): Promise<{
  totalHits: number
  totalMisses: number
  hitRate: number
  keysTracked: number
}> {
  try {
    const client = getRedisClient()
    const keys = await client.keys(`${CACHE_STATS_PREFIX}*`)

    let totalHits = 0
    let totalMisses = 0

    for (const key of keys) {
      const stats = await client.hgetall(key)
      if (stats) {
        totalHits += parseInt((stats.hits as string) || '0', 10)
        totalMisses += parseInt((stats.misses as string) || '0', 10)
      }
    }

    const total = totalHits + totalMisses
    const hitRate = total > 0 ? (totalHits / total) * 100 : 0

    return {
      totalHits,
      totalMisses,
      hitRate: Math.round(hitRate * 100) / 100,
      keysTracked: keys.length,
    }
  } catch (error) {
    console.error('Failed to get overall cache stats:', error)
    return {
      totalHits: 0,
      totalMisses: 0,
      hitRate: 0,
      keysTracked: 0,
    }
  }
}

// Invalidate all caches related to a novel
export async function invalidateNovel(novelId: string): Promise<void> {
  try {
    const client = getRedisClient()

    // Delete novel detail cache
    await cacheDel(CacheKeys.novelDetail(novelId))

    // Delete chapter list caches (all pages)
    const chapterKeys = await client.keys(`novel:${novelId}:chapters:*`)
    for (const key of chapterKeys) {
      await cacheDel(key)
    }

    // Delete chapter content caches
    const contentKeys = await client.keys(`chapter:${novelId}:*:content`)
    for (const key of contentKeys) {
      await cacheDel(key)
    }

    // Delete stats keys
    const statsKeys = await client.keys(`${CACHE_STATS_PREFIX}novel:${novelId}:*`)
    for (const key of statsKeys) {
      await cacheDel(key)
    }

    console.log(`Cache invalidated for novel: ${novelId}`)
  } catch (error) {
    console.error('Failed to invalidate novel cache:', error)
  }
}

// Invalidate chapter content cache
export async function invalidateChapter(novelId: string, chapterNum: number): Promise<void> {
  try {
    await cacheDel(CacheKeys.chapterContent(novelId, chapterNum))
    console.log(`Cache invalidated for chapter: ${novelId}:${chapterNum}`)
  } catch (error) {
    console.error('Failed to invalidate chapter cache:', error)
  }
}

// Cache warmup - preload top novels' first chapters
export async function warmupCache(): Promise<{
  novelsWarmed: number
  chaptersWarmed: number
  errors: string[]
}> {
  const result = {
    novelsWarmed: 0,
    chaptersWarmed: 0,
    errors: [] as string[],
  }

  try {
    console.log('Starting cache warmup...')

    // Get top 50 novels by rating
    const topNovels = await prisma.novel.findMany({
      take: 50,
      orderBy: { rating: 'desc' },
      include: {
        sources: {
          select: {
            sourceName: true,
            sourceUrl: true,
            available: true,
          },
        },
        chapters: {
          select: {
            chapterNum: true,
            title: true,
          },
          orderBy: {
            chapterNum: 'asc',
          },
          take: 50,
        },
      },
    })

    // Warm up novel details and first 10 chapters
    for (const novel of topNovels) {
      try {
        // Warm up novel detail
        const detailKey = CacheKeys.novelDetail(novel.id)
        const cachedDetail = await cacheGet(detailKey)

        if (!cachedDetail) {
          const detailData = {
            novel: {
              id: novel.id,
              title: novel.title,
              author: novel.author,
              cover: novel.cover,
              description: novel.description,
              tags: novel.tags,
              category: novel.category,
              status: novel.status,
              wordCount: novel.wordCount,
              rating: novel.rating,
              sources: novel.sources.map(s => ({
                sourceName: s.sourceName,
                sourceUrl: s.sourceUrl,
                available: s.available,
              })),
            },
            chapters: novel.chapters.slice(0, 50).map(c => ({
              chapterNum: c.chapterNum,
              title: c.title,
            })),
            totalChapters: novel.chapters.length,
          }

          await cacheSet(detailKey, detailData, CacheTTL.LONG)
          result.novelsWarmed++
        }

        // Warm up first 10 chapters content
        const chaptersToWarm = novel.chapters.slice(0, 10)
        for (const chapter of chaptersToWarm) {
          try {
            const chapterKey = CacheKeys.chapterContent(novel.id, chapter.chapterNum)
            const cachedChapter = await cacheGet(chapterKey)

            if (!cachedChapter) {
              // We don't fetch actual content during warmup to avoid
              // hitting external sources too hard. Just cache the metadata.
              // Content will be fetched on first access.
            }
          } catch (err) {
            const errorMsg = `Failed to warm chapter ${novel.id}:${chapter.chapterNum}: ${err}`
            console.error(errorMsg)
            result.errors.push(errorMsg)
          }
        }
      } catch (err) {
        const errorMsg = `Failed to warm novel ${novel.id}: ${err}`
        console.error(errorMsg)
        result.errors.push(errorMsg)
      }
    }

    console.log(`Cache warmup complete. Novels: ${result.novelsWarmed}, Errors: ${result.errors.length}`)
    return result
  } catch (error) {
    const errorMsg = `Cache warmup failed: ${error}`
    console.error(errorMsg)
    result.errors.push(errorMsg)
    return result
  }
}

// Clear all cache stats
export async function clearCacheStats(): Promise<void> {
  try {
    const client = getRedisClient()
    const keys = await client.keys(`${CACHE_STATS_PREFIX}*`)
    for (const key of keys) {
      await cacheDel(key)
    }
    console.log('Cache stats cleared')
  } catch (error) {
    console.error('Failed to clear cache stats:', error)
  }
}