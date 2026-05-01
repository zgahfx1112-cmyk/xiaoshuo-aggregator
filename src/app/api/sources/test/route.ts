import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { SourceParser } from '@/lib/sourceParser'

export async function POST(request: NextRequest) {
  try {
    const { sourceId } = await request.json()

    if (!sourceId) {
      return NextResponse.json({
        success: false,
        error: 'sourceId is required',
      }, { status: 400 })
    }

    const source = await prisma.bookSource.findUnique({
      where: { id: sourceId },
    })

    if (!source) {
      return NextResponse.json({
        success: false,
        error: 'Source not found',
      }, { status: 404 })
    }

    // Parse config
    const config = typeof source.config === 'string'
      ? JSON.parse(source.config)
      : source.config

    // Test with common search term
    const parser = new SourceParser(config)
    const results = await parser.parseSearch('斗罗大陆')

    const isAvailable = results.length > 0

    // Update available status
    await prisma.bookSource.update({
      where: { id: sourceId },
      data: {
        available: isAvailable,
        lastUpdated: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        available: isAvailable,
        resultCount: results.length,
        message: isAvailable ? `书源可用，找到 ${results.length} 条结果` : '书源无响应或不可用',
      },
    })
  } catch (error) {
    console.error('Test source error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Test failed',
    }, { status: 500 })
  }
}