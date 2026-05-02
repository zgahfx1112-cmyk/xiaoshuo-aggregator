import { NextRequest, NextResponse } from 'next/server'
import { SourceParser, SourceConfigInput } from '@/lib/sourceParser'
import { SearchResult } from '@/lib/types'
import { applyRateLimit } from '@/lib/rateLimit'

interface SearchApiResponse {
  success: boolean
  data: {
    novels: SearchResult[]
    total: number
    page: number
    sources: Array<{ id: string; name: string; resultCount: number; error?: string }>
  }
  error?: string
}

// Single source search endpoint - parallel requests from frontend
export async function POST(request: NextRequest): Promise<NextResponse<SearchApiResponse>> {
  // Apply rate limiting
  const rateLimitResponse = await applyRateLimit(request)
  if (rateLimitResponse) {
    return rateLimitResponse as NextResponse<SearchApiResponse>
  }

  try {
    // Parse request body as UTF-8 text then JSON
    const bodyText = await request.text()
    const body = JSON.parse(bodyText)
    const query = body.query
    const source = body.source // Single source: { sourceId, sourceName, config }
    const timeout = body.timeout || 8000 // Default 8s timeout per source

    if (!query || query.trim().length === 0) {
      return NextResponse.json({
        success: false,
        data: { novels: [], total: 0, page: 1, sources: [] },
        error: 'Search query is required',
      }, { status: 400 })
    }

    if (!source) {
      return NextResponse.json({
        success: false,
        data: { novels: [], total: 0, page: 1, sources: [] },
        error: 'Source is required',
      }, { status: 400 })
    }

    // Search single source with timeout
    const results = await searchSingleSource(query, source, timeout)

    // Add sourceId to each result
    const resultsWithSourceId = results.map(r => ({
      ...r,
      sourceId: source.sourceId,
    }))

    return NextResponse.json({
      success: true,
      data: {
        novels: resultsWithSourceId,
        total: resultsWithSourceId.length,
        page: 1,
        sources: [{
          id: source.sourceId,
          name: source.sourceName,
          resultCount: resultsWithSourceId.length,
          error: resultsWithSourceId.length === 0 ? '无结果' : undefined
        }],
      },
    })
  } catch {
    return NextResponse.json({
      success: false,
      data: { novels: [], total: 0, page: 1, sources: [] },
      error: 'Invalid request body',
    }, { status: 400 })
  }
}

// Search single source with timeout
async function searchSingleSource(
  query: string,
  source: { sourceId: string; sourceName: string; config: object },
  timeoutMs: number
): Promise<SearchResult[]> {
  const timeoutPromise = new Promise<SearchResult[]>((_, reject) =>
    setTimeout(() => reject(new Error('Timeout')), timeoutMs)
  )

  try {
    const parser = new SourceParser(source.config as SourceConfigInput)
    const results = await Promise.race([
      parser.parseSearch(query),
      timeoutPromise
    ])
    return results
  } catch (err) {
    console.error(`Source ${source.sourceName} error:`, err instanceof Error ? err.message : 'Unknown')
    return []
  }
}