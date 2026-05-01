import { NextRequest, NextResponse } from 'next/server'
import { generateRecommendation, generateMockRecommendations } from '@/lib/recommendService'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')

    // Generate session ID if not provided
    const effectiveSessionId = sessionId || `session_${Date.now()}`

    // Try to generate recommendations from database
    try {
      const novels = await generateRecommendation(effectiveSessionId)

      return NextResponse.json({
        success: true,
        data: {
          novels,
          sessionId: effectiveSessionId,
        },
      })
    } catch {
      // Fallback to mock data if database is not available
      console.log('Database not available, using mock recommendations')
      const novels = generateMockRecommendations()

      return NextResponse.json({
        success: true,
        data: {
          novels,
          sessionId: effectiveSessionId,
        },
      })
    }
  } catch (error) {
    console.error('Recommend API error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to generate recommendations' },
      { status: 500 }
    )
  }
}