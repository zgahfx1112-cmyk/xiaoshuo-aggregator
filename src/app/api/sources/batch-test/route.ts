import { NextRequest, NextResponse } from 'next/server'
import { SourceParser, SourceConfigInput } from '@/lib/sourceParser'
import { applyRateLimit } from '@/lib/rateLimit'

interface TestResult {
  sourceId: string
  available: boolean
  resultCount: number
  message: string
}

// Single source test with timeout
async function testSource(
  sourceId: string,
  config: SourceConfigInput,
  timeoutMs: number = 8000
): Promise<TestResult> {
  try {
    const parser = new SourceParser(config)

    // Create timeout promise
    const timeoutPromise = new Promise<null>((_, reject) =>
      setTimeout(() => reject(new Error('Timeout')), timeoutMs)
    )

    // Race between search and timeout
    const searchPromise = parser.parseSearch('斗罗大陆')

    const results = await Promise.race([searchPromise, timeoutPromise])

    // If timeout occurred, results would be null (rejected)
    if (results === null) {
      return {
        sourceId,
        available: false,
        resultCount: 0,
        message: 'Timeout'
      }
    }

    return {
      sourceId,
      available: results.length > 0,
      resultCount: results.length,
      message: results.length > 0 ? `找到 ${results.length} 条结果` : '无结果'
    }
  } catch (err) {
    return {
      sourceId,
      available: false,
      resultCount: 0,
      message: err instanceof Error ? err.message : '测试失败'
    }
  }
}

export async function POST(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResponse = await applyRateLimit(request)
  if (rateLimitResponse) {
    return rateLimitResponse
  }

  try {
    // Parse request body as UTF-8 text then JSON
    const bodyText = await request.text()
    const body = JSON.parse(bodyText)
    const { sources, concurrency = 5 } = body

    if (!sources || !Array.isArray(sources)) {
      return NextResponse.json({
        success: false,
        error: 'sources array is required',
      }, { status: 400 })
    }

    if (sources.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
      })
    }

    // Batch test with concurrency limit
    const results: TestResult[] = []

    for (let i = 0; i < sources.length; i += concurrency) {
      const batch = sources.slice(i, i + concurrency)
      const batchResults = await Promise.all(
        batch.map(source =>
          testSource(source.sourceId, source.config as SourceConfigInput)
        )
      )
      results.push(...batchResults)
    }

    return NextResponse.json({
      success: true,
      data: results,
    })
  } catch (error) {
    console.error('Batch test error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Batch test failed',
    }, { status: 500 })
  }
}