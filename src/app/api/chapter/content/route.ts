import { NextRequest, NextResponse } from 'next/server'
import { SourceParser, SourceConfigInput } from '@/lib/sourceParser'

export async function POST(request: NextRequest) {
  try {
    const bodyText = await request.text()
    const body = JSON.parse(bodyText)
    const { chapterUrl, sourceConfig } = body

    if (!chapterUrl || !sourceConfig) {
      return NextResponse.json({
        success: false,
        error: 'chapterUrl and sourceConfig are required',
      }, { status: 400 })
    }

    const parser = new SourceParser(sourceConfig as SourceConfigInput)
    const content = await parser.parseChapterContent(chapterUrl)

    return NextResponse.json({
      success: true,
      data: {
        content,
        source: sourceConfig.bookSourceName,
      },
    })
  } catch (error) {
    console.error('Chapter content error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to parse chapter',
    }, { status: 500 })
  }
}