import { NextRequest, NextResponse } from 'next/server'
import { SourceParser, SourceConfigInput } from '@/lib/sourceParser'

export async function POST(request: NextRequest) {
  try {
    const bodyText = await request.text()
    const body = JSON.parse(bodyText)
    const { bookUrl, sourceConfig } = body

    if (!bookUrl || !sourceConfig) {
      return NextResponse.json({
        success: false,
        error: 'bookUrl and sourceConfig are required',
      }, { status: 400 })
    }

    const parser = new SourceParser(sourceConfig as SourceConfigInput)
    const result = await parser.parseBookInfo(bookUrl)

    return NextResponse.json({
      success: true,
      data: {
        title: result.title,
        author: result.author,
        description: result.description,
        cover: result.cover,
        chapters: result.chapters,
        sourceName: sourceConfig.bookSourceName,
      },
    })
  } catch (error) {
    console.error('Novel detail error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to parse novel',
    }, { status: 500 })
  }
}