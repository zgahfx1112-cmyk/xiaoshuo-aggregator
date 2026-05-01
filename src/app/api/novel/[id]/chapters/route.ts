import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { cacheGet, cacheSet, CacheKeys, CacheTTL } from '@/lib/redis'
import { applyRateLimit } from '@/lib/rateLimit'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(
  request: Request,
  { params }: RouteParams
) {
  // Apply rate limiting
  const rateLimitResponse = await applyRateLimit(request)
  if (rateLimitResponse) {
    return rateLimitResponse
  }

  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '0', 10)
    const pageSize = Math.min(
      parseInt(searchParams.get('pageSize') || '50', 10),
      100
    )

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Novel ID is required' },
        { status: 400 }
      )
    }

    // Skip pages 0 as it's included in the detail API
    if (page === 0) {
      return NextResponse.json({
        success: true,
        data: {
          chapters: [],
          page: 0,
          pageSize,
          total: 0,
        },
      })
    }

    // Try to get from cache
    const cacheKey = CacheKeys.novelChapters(id, page)
    const cached = await cacheGet<{
      chapters: { chapterNum: number; title: string }[]
      page: number
      pageSize: number
      total: number
    }>(cacheKey)

    if (cached) {
      return NextResponse.json({
        success: true,
        data: cached,
        cached: true,
      })
    }

    // Get total chapter count
    const totalCount = await prisma.chapter.count({
      where: { novelId: id },
    })

    // Get chapters for the requested page (skip initial 50 chapters for page 1+)
    const skip = page * pageSize
    const chapters = await prisma.chapter.findMany({
      where: { novelId: id },
      select: {
        chapterNum: true,
        title: true,
      },
      orderBy: {
        chapterNum: 'asc',
      },
      skip,
      take: pageSize,
    })

    const responseData = {
      chapters: chapters.map((c) => ({
        chapterNum: c.chapterNum,
        title: c.title,
      })),
      page,
      pageSize,
      total: totalCount,
    }

    // Cache for 24 hours
    await cacheSet(cacheKey, responseData, CacheTTL.LONG)

    return NextResponse.json({
      success: true,
      data: responseData,
      cached: false,
    })
  } catch (error) {
    console.error('Error fetching chapters:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch chapters',
      },
      { status: 500 }
    )
  }
}