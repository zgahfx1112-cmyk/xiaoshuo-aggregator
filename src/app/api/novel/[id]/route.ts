import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { cacheGet, cacheSet, CacheKeys, CacheTTL } from '@/lib/redis'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Novel ID is required' },
        { status: 400 }
      )
    }

    // Try to get from cache first
    const cacheKey = CacheKeys.novelDetail(id)
    const cached = await cacheGet<{
      novel: {
        id: string
        title: string
        author: string
        cover: string
        description: string
        tags: string[]
        category: string
        status: string
        wordCount: number
        rating: number
        sources: { sourceName: string; sourceUrl: string; available: boolean }[]
      }
      chapters: { chapterNum: number; title: string }[]
    }>(cacheKey)

    if (cached) {
      return NextResponse.json({
        success: true,
        data: cached,
        cached: true,
      })
    }

    // Get novel from database
    const [novel, totalChapters] = await Promise.all([
      prisma.novel.findUnique({
        where: { id },
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
      }),
      prisma.chapter.count({ where: { novelId: id } }),
    ])

    if (!novel) {
      return NextResponse.json(
        { success: false, error: 'Novel not found' },
        { status: 404 }
      )
    }

    // Transform data for response
    const responseData = {
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
        sources: novel.sources.map((s) => ({
          sourceName: s.sourceName,
          sourceUrl: s.sourceUrl,
          available: s.available,
        })),
      },
      chapters: novel.chapters.map((c) => ({
        chapterNum: c.chapterNum,
        title: c.title,
      })),
      totalChapters,
    }

    // Cache for 24 hours
    await cacheSet(cacheKey, responseData, CacheTTL.LONG)

    return NextResponse.json({
      success: true,
      data: responseData,
      cached: false,
    })
  } catch (error) {
    console.error('Error fetching novel detail:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch novel',
      },
      { status: 500 }
    )
  }
}