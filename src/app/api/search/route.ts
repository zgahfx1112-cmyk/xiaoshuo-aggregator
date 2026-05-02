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
    sources: Array<{ id: string; name: string; resultCount: number }>
  }
  error?: string
}

interface CustomSourceConfig {
  sourceId: string
  sourceName: string
  config: object
}

// Support both GET (small requests) and POST (large book source lists)
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
      data: { novels: [], total: 0, page: 1, sources: [] },
      error: 'Search query is required',
    }, { status: 400 })
  }

  return executeSearch(query, page, customSourcesJson)
}

export async function POST(request: NextRequest): Promise<NextResponse<SearchApiResponse>> {
  // Apply rate limiting
  const rateLimitResponse = await applyRateLimit(request)
  if (rateLimitResponse) {
    return rateLimitResponse as NextResponse<SearchApiResponse>
  }

  try {
    const body = await request.json()
    const query = body.query
    const page = parseInt(body.page || '1', 10)
    const customSources = body.customSources

    if (!query || query.trim().length === 0) {
      return NextResponse.json({
        success: false,
        data: { novels: [], total: 0, page: 1, sources: [] },
        error: 'Search query is required',
      }, { status: 400 })
    }

    const customSourcesJson = customSources ? JSON.stringify(customSources) : null
    return executeSearch(query, page, customSourcesJson)
  } catch {
    return NextResponse.json({
      success: false,
      data: { novels: [], total: 0, page: 1, sources: [] },
      error: 'Invalid request body',
    }, { status: 400 })
  }
}

async function executeSearch(
  query: string,
  page: number,
  customSourcesJson: string | null
): Promise<NextResponse<SearchApiResponse>> {

  const normalizedQuery = query.trim().toLowerCase()

  try {
    // Check cache first
    const cacheKey = `${CacheKeys.searchResults(normalizedQuery)}:sources`
    const cached = await cacheGet<SearchApiResponse['data']>(cacheKey)

    if (cached) {
      // Paginate cached results
      const pageSize = 20
      const startIndex = (page - 1) * pageSize
      const paginatedResults = cached.novels.slice(startIndex, startIndex + pageSize)

      return NextResponse.json({
        success: true,
        data: {
          novels: paginatedResults,
          total: cached.total,
          page,
          sources: cached.sources,
        },
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
        data: { novels: [], total: 0, page: 1, sources: [] },
        error: 'No book sources configured. Please import sources first.',
      }, { status: 400 })
    }

    // Search sources sequentially, collect results per source
    const allResults: SearchResult[] = []
    const sourceStats: Array<{ id: string; name: string; resultCount: number }> = []

    for (const source of sourcesToUse) {
      try {
        const parser = new SourceParser(source.config as SourceConfigInput)
        const results = await parser.parseSearch(query)

        sourceStats.push({
          id: source.id,
          name: source.name,
          resultCount: results.length,
        })

        // Add source info to each result
        results.forEach(r => {
          allResults.push({
            ...r,
            sourceName: source.name,
            sourceId: source.id,
          })
        })
      } catch {
        // Source failed, continue to next
        sourceStats.push({
          id: source.id,
          name: source.name,
          resultCount: 0,
        })
      }
    }

    // Sort by relevance
    allResults.sort((a, b) => {
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

    const responseData = {
      novels: allResults,
      total: allResults.length,
      page: 1,
      sources: sourceStats,
    }

    // Cache results for 15 minutes
    await cacheSet(cacheKey, responseData, CacheTTL.SHORT)

    // Paginate for current request
    const pageSize = 20
    const startIndex = (page - 1) * pageSize
    const paginatedResults = allResults.slice(startIndex, startIndex + pageSize)

    return NextResponse.json({
      success: true,
      data: {
        novels: paginatedResults,
        total: allResults.length,
        page,
        sources: sourceStats,
      },
    })
  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json({
      success: false,
      data: { novels: [], total: 0, page: 1, sources: [] },
      error: error instanceof Error ? error.message : 'Search failed',
    }, { status: 500 })
  }
}