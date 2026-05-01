import { NextRequest, NextResponse } from 'next/server'
import { SourceParser, SourceConfigInput } from '@/lib/sourceParser'
import { applyRateLimit } from '@/lib/rateLimit'

export async function POST(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResponse = await applyRateLimit(request)
  if (rateLimitResponse) {
    return rateLimitResponse
  }

  try {
    const { sourceConfig } = await request.json()

    if (!sourceConfig) {
      return NextResponse.json({
        success: false,
        error: 'sourceConfig is required',
      }, { status: 400 })
    }

    // Test with common search term
    const parser = new SourceParser(sourceConfig as SourceConfigInput)
    const results = await parser.parseSearch('斗罗大陆')

    const isAvailable = results.length > 0

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