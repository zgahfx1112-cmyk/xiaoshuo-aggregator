import { NextRequest, NextResponse } from 'next/server'
import { cacheGet, cacheSet, CacheKeys, CacheTTL } from '@/lib/redis'
import { SourceParser, SourceConfigInput } from '@/lib/sourceParser'
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

interface CustomSourceConfig {
  sourceId: string
  sourceName: string
  config: object
}

// Deduplicate search results by title + author
function deduplicateResults(results: SearchResult[]): SearchResult[] {
  const seen = new Map<string, SearchResult>()

  for (const result of results) {
    const key = `${result.title.toLowerCase()}-${result.author.toLowerCase()}`
    if (!seen.has(key)) {
      seen.set(key, result)
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
  const customSourcesJson = searchParams.get('customSources')

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

    // Get sources from client request
    let sourcesToUse: Array<{ id: string; name: string; config: object }> = []

    if (customSourcesJson) {
      try {
        const customSources: CustomSourceConfig[] = JSON.parse(customSourcesJson)
        sourcesToUse = customSources.map(s => ({ id: s.sourceId, name: s.sourceName, config: s.config }))
      } catch {
        // Ignore invalid custom sources
      }
    }

    if (sourcesToUse.length === 0) {
      return NextResponse.json({
        success: false,
        data: { novels: [], total: 0, page: 1 },
        error: 'No book sources configured. Please import sources first.',
      }, { status: 400 })
    }

    // Search all sources concurrently
    const searchPromises = sourcesToUse.map(async (source) => {
      try {
        const parser = new SourceParser(source.config as SourceConfigInput)
        const results = await parser.parseSearch(query)
        return results.map(r => ({ ...r, sourceName: source.name }))
      } catch {
        return []
      }
    })

    const searchResults = await Promise.all(searchPromises)

    // Flatten and deduplicate
    const allResults = searchResults.flat()
    const dedupedResults = deduplicateResults(allResults)

    // Sort by relevance
    dedupedResults.sort((a, b) => {
      const aTitle = a.title.toLowerCase()
      const bTitle = b.title.toLowerCase()

      if (aTitle === normalizedQuery && bTitle !== normalizedQuery) return -1
      if (bTitle === normalizedQuery && aTitle !== normalizedQuery) return 1

      if (aTitle.startsWith(normalizedQuery) && !bTitle.startsWith(normalizedQuery)) return -1
      if (bTitle.startsWith(normalizedQuery) && !aTitle.startsWith(normalizedQuery)) return 1

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