import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { cacheGet, cacheSet, CacheKeys, CacheTTL } from '@/lib/redis'
import { SourceParser } from '@/lib/sourceParser'
import { getBuiltinSource } from '@/config/sources'
import { ApiResponse } from '@/lib/types'

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
  try {
    const { novelId, num } = await params
    const chapterNum = parseInt(num, 10)

    if (isNaN(chapterNum) || chapterNum < 1) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Invalid chapter number' },
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

    // Get chapter info from database
    const chapter = await prisma.chapter.findUnique({
      where: {
        novelId_chapterNum: {
          novelId,
          chapterNum,
        },
      },
      include: {
        novel: {
          include: {
            sources: true,
          },
        },
      },
    })

    if (!chapter) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Chapter not found' },
        { status: 404 }
      )
    }

    // Get source URLs for this chapter
    const sourceUrls = chapter.sourceUrls as Array<{ source: string; url: string }>

    if (!sourceUrls || sourceUrls.length === 0) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'No source URLs available for this chapter' },
        { status: 404 }
      )
    }

    // Try each source until we get content
    let content = ''
    let usedSource = ''
    let lastError: Error | null = null

    for (const sourceUrl of sourceUrls) {
      try {
        const sourceConfig = getBuiltinSource(sourceUrl.source)

        if (!sourceConfig) {
          continue
        }

        const parser = new SourceParser(sourceConfig)
        content = await parser.parseChapterContent(sourceUrl.url)

        if (content && content.trim().length > 0) {
          usedSource = sourceUrl.source
          break
        }
      } catch (error) {
        lastError = error as Error
        console.error(`Failed to fetch from source ${sourceUrl.source}:`, error)
        // Continue to next source
      }
    }

    if (!content || content.trim().length === 0) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: lastError?.message || 'Failed to fetch chapter content from all sources',
        },
        { status: 500 }
      )
    }

    // Get next and prev chapter info
    const [nextChapter, prevChapter] = await Promise.all([
      prisma.chapter.findFirst({
        where: { novelId, chapterNum: chapterNum + 1 },
        select: { chapterNum: true },
      }),
      prisma.chapter.findFirst({
        where: { novelId, chapterNum: chapterNum - 1 },
        select: { chapterNum: true },
      }),
    ])

    const response: ChapterContentResponse = {
      content,
      source: usedSource,
      nextChapter: nextChapter?.chapterNum ?? null,
      prevChapter: prevChapter?.chapterNum ?? null,
      title: chapter.title,
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