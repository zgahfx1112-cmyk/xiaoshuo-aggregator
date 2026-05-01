import { NextRequest, NextResponse } from 'next/server'
import { cacheGet, cacheSet, CacheKeys, CacheTTL } from '@/lib/redis'
import { prisma } from '@/lib/prisma'
import { SourceParser } from '@/lib/sourceParser'
import { BUILTIN_SOURCES } from '@/config/sources'
import { SearchResult } from '@/lib/types'
import { applyRateLimit } from '@/lib/rateLimit'

interface SearchApiResponse {
  success: boolean
  data: {
    novels: SearchResult[]
    total: number
    page: number
  }
  error?: string
}

// Deduplicate search results by title + author
function deduplicateResults(results: SearchResult[]): SearchResult[] {
  const seen = new Map<string, SearchResult>()

  for (const result of results) {
    const key = `${result.title.toLowerCase()}-${result.author.toLowerCase()}`
    if (!seen.has(key)) {
      seen.set(key, result)
    } else {
      // Merge sources for the same novel
      const existing = seen.get(key)!
      if (existing.sourceName !== result.sourceName) {
        // Keep the first one, but we could merge source info here if needed
      }
    }
  }

  return Array.from(seen.values())
}

export async function GET(request: NextRequest): Promise<NextResponse<SearchApiResponse>> {
  // Apply rate limiting
  const rateLimitResponse = await applyRateLimit(request)
  if (rateLimitResponse) {
    return rateLimitResponse as NextResponse<SearchApiResponse>
  }

  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get('query')
  const page = parseInt(searchParams.get('page') || '1', 10)

  if (!query || query.trim().length === 0) {
    return NextResponse.json({
      success: false,
      data: { novels: [], total: 0, page: 1 },
      error: 'Search query is required',
    }, { status: 400 })
  }

  const normalizedQuery = query.trim().toLowerCase()

  try {
    // Check cache first
    const cacheKey = `${CacheKeys.searchResults(normalizedQuery)}:page:${page}`
    const cached = await cacheGet<SearchApiResponse['data']>(cacheKey)

    if (cached) {
      return NextResponse.json({
        success: true,
        data: cached,
      })
    }

    // Get all available book sources from database
    const dbSources = await prisma.bookSource.findMany({
      where: { available: true },
      select: { name: true, config: true },
    })

    // Combine builtin sources with database sources
    const allSources = [...BUILTIN_SOURCES]

    // Add database sources (parse their config)
    for (const dbSource of dbSources) {
      if (dbSource.config) {
        try {
          const config = typeof dbSource.config === 'string'
            ? JSON.parse(dbSource.config)
            : dbSource.config
          allSources.push(config)
        } catch {
          // Skip invalid config
        }
      }
    }

    // Search all sources concurrently
    const searchPromises = allSources.map(async (source) => {
      try {
        const parser = new SourceParser(source)
        const results = await parser.parseSearch(query)
        return results
      } catch {
        // Return empty array on error, don't fail entire search
        return []
      }
    })

    const searchResults = await Promise.all(searchPromises)

    // Flatten and deduplicate
    const allResults = searchResults.flat()
    const dedupedResults = deduplicateResults(allResults)

    // Sort by relevance (exact title match first, then partial matches)
    dedupedResults.sort((a, b) => {
      const aTitle = a.title.toLowerCase()
      const bTitle = b.title.toLowerCase()

      // Exact match comes first
      if (aTitle === normalizedQuery && bTitle !== normalizedQuery) return -1
      if (bTitle === normalizedQuery && aTitle !== normalizedQuery) return 1

      // Then starts with query
      if (aTitle.startsWith(normalizedQuery) && !bTitle.startsWith(normalizedQuery)) return -1
      if (bTitle.startsWith(normalizedQuery) && !aTitle.startsWith(normalizedQuery)) return 1

      // Then contains query
      if (aTitle.includes(normalizedQuery) && !bTitle.includes(normalizedQuery)) return -1
      if (bTitle.includes(normalizedQuery) && !aTitle.includes(normalizedQuery)) return 1

      return 0
    })

    // Paginate results
    const pageSize = 20
    const startIndex = (page - 1) * pageSize
    const paginatedResults = dedupedResults.slice(startIndex, startIndex + pageSize)

    const responseData = {
      novels: paginatedResults,
      total: dedupedResults.length,
      page,
    }

    // Cache results for 15 minutes
    await cacheSet(cacheKey, responseData, CacheTTL.SHORT)

    return NextResponse.json({
      success: true,
      data: responseData,
    })
  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json({
      success: false,
      data: { novels: [], total: 0, page: 1 },
      error: error instanceof Error ? error.message : 'Search failed',
    }, { status: 500 })
  }
}