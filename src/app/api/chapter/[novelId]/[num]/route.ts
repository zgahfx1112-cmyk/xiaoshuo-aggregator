import { NextRequest, NextResponse } from 'next/server'
import { cacheGet, cacheSet, CacheKeys, CacheTTL } from '@/lib/redis'
import { SourceParser, SourceConfigInput } from '@/lib/sourceParser'
import { ApiResponse } from '@/lib/types'
import { applyRateLimit } from '@/lib/rateLimit'

interface ChapterContentResponse {
  content: string
  source: string
  nextChapter: number | null
  prevChapter: number | null
  title: string
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ novelId: string; num: string }> }
) {
  // Apply rate limiting
  const rateLimitResponse = await applyRateLimit(request)
  if (rateLimitResponse) {
    return rateLimitResponse
  }

  try {
    const { novelId, num } = await params
    const chapterNum = parseInt(num, 10)

    if (isNaN(chapterNum) || chapterNum < 1) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Invalid chapter number' },
        { status: 400 }
      )
    }

    // Get source config from query params
    const searchParams = request.nextUrl.searchParams
    const sourceConfigJson = searchParams.get('sourceConfig')
    const chapterUrl = searchParams.get('chapterUrl')

    if (!sourceConfigJson || !chapterUrl) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'sourceConfig and chapterUrl are required' },
        { status: 400 }
      )
    }

    // Try to get from cache first
    const cacheKey = CacheKeys.chapterContent(novelId, chapterNum)
    const cached = await cacheGet<ChapterContentResponse>(cacheKey)

    if (cached) {
      return NextResponse.json<ApiResponse<ChapterContentResponse>>({
        success: true,
        data: cached,
      })
    }

    // Parse source config
    let sourceConfig: SourceConfigInput
    try {
      sourceConfig = JSON.parse(sourceConfigJson)
    } catch {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Invalid source config JSON' },
        { status: 400 }
      )
    }

    // Parse chapter content
    const parser = new SourceParser(sourceConfig)
    const content = await parser.parseChapterContent(chapterUrl)

    if (!content || content.trim().length === 0) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Failed to fetch chapter content' },
        { status: 500 }
      )
    }

    const sourceName = (sourceConfig as Record<string, unknown>).bookSourceName as string || 'Unknown'

    const response: ChapterContentResponse = {
      content,
      source: sourceName,
      nextChapter: chapterNum + 1,
      prevChapter: chapterNum > 1 ? chapterNum - 1 : null,
      title: `第${chapterNum}章`,
    }

    // Cache for 7 days
    await cacheSet(cacheKey, response, CacheTTL.WEEK)

    return NextResponse.json<ApiResponse<ChapterContentResponse>>({
      success: true,
      data: response,
    })
  } catch (error) {
    console.error('Chapter content API error:', error)
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    )
  }
}