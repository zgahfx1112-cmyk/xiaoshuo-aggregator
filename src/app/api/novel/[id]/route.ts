import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { cacheGet, cacheSet, CacheKeys, CacheTTL } from '@/lib/redis'
import { applyRateLimit } from '@/lib/rateLimit'
import { invalidateNovel } from '@/lib/cacheService'

interface RouteParams {
  params: Promise<{ id: string }>
}

// PUT /api/novel/[id] - Update novel and invalidate cache
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params
    const body = await request.json()

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Novel ID is required' },
        { status: 400 }
      )
    }

    // Check if novel exists
    const existing = await prisma.novel.findUnique({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Novel not found' },
        { status: 404 }
      )
    }

    // Update novel
    const updated = await prisma.novel.update({
      where: { id },
      data: {
        ...(body.title && { title: body.title }),
        ...(body.author && { author: body.author }),
        ...(body.cover && { cover: body.cover }),
        ...(body.description && { description: body.description }),
        ...(body.tags && { tags: body.tags }),
        ...(body.category && { category: body.category }),
        ...(body.status && { status: body.status }),
        ...(body.wordCount && { wordCount: body.wordCount }),
        ...(body.rating && { rating: body.rating }),
      },
    })

    // Invalidate all caches related to this novel
    await invalidateNovel(id)

    return NextResponse.json({
      success: true,
      data: {
        id: updated.id,
        title: updated.title,
        author: updated.author,
        updatedAt: updated.updatedAt,
      },
    })
  } catch (error) {
    console.error('Error updating novel:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update novel',
      },
      { status: 500 }
    )
  }
}

export async function GET(request: Request, { params }: RouteParams) {
  // Apply rate limiting
  const rateLimitResponse = await applyRateLimit(request)
  if (rateLimitResponse) {
    return rateLimitResponse
  }

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