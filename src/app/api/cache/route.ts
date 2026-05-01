import { NextRequest, NextResponse } from 'next/server'
import {
  getCacheStats,
  getOverallCacheStats,
  warmupCache,
  clearCacheStats,
  invalidateNovel,
} from '@/lib/cacheService'
import { cacheDel, CacheKeys, getRedisClient } from '@/lib/redis'

/**
 * GET /api/cache/stats
 * Get cache statistics
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const key = searchParams.get('key')
    const overview = searchParams.get('overview') === 'true'

    if (overview) {
      const stats = await getOverallCacheStats()
      return NextResponse.json({
        success: true,
        data: stats,
      })
    }

    if (key) {
      const stats = await getCacheStats(key)
      return NextResponse.json({
        success: true,
        data: stats,
      })
    }

    // Return overall stats by default
    const stats = await getOverallCacheStats()
    return NextResponse.json({
      success: true,
      data: stats,
    })
  } catch (error) {
    console.error('Failed to get cache stats:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get cache stats',
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/cache
 * Perform cache operations
 * Body: { action: 'warmup' | 'invalidate' | 'clearStats', novelId?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, novelId } = body

    switch (action) {
      case 'warmup':
        const result = await warmupCache()
        return NextResponse.json({
          success: true,
          data: result,
        })

      case 'invalidate':
        if (!novelId) {
          return NextResponse.json(
            { success: false, error: 'novelId is required for invalidate action' },
            { status: 400 }
          )
        }
        await invalidateNovel(novelId)
        return NextResponse.json({
          success: true,
          message: `Cache invalidated for novel: ${novelId}`,
        })

      case 'clearStats':
        await clearCacheStats()
        return NextResponse.json({
          success: true,
          message: 'Cache stats cleared',
        })

      case 'clearAll':
        // Clear all cache keys (use with caution)
        const client = getRedisClient()
        const patterns = [
          'novel:*',
          'chapter:*',
          'search:*',
          'hot_novels:*',
          'recommend:*',
          'cache_stats:*',
        ]

        let totalCleared = 0
        for (const pattern of patterns) {
          const keys = await client.keys(pattern)
          for (const key of keys) {
            await cacheDel(key)
            totalCleared++
          }
        }

        return NextResponse.json({
          success: true,
          message: `Cleared ${totalCleared} cache keys`,
        })

      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Cache operation failed:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Cache operation failed',
      },
      { status: 500 }
    )
  }
}