import { NextRequest, NextResponse } from 'next/server'
import { updateBookSources, verifyCronSecret } from '@/lib/sourceUpdater'

/**
 * POST /api/sources/update
 * Manually trigger book source update
 * Requires CRON_SECRET verification via Authorization header
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authorization
    const authHeader = request.headers.get('authorization')
    const querySecret = request.nextUrl.searchParams.get('secret')

    if (!verifyCronSecret(authHeader, querySecret)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get options from request body
    let enableDeepValidation = false
    let maxSources = 50

    try {
      const body = await request.json()
      if (typeof body.enableDeepValidation === 'boolean') {
        enableDeepValidation = body.enableDeepValidation
      }
      if (typeof body.maxSources === 'number' && body.maxSources > 0) {
        maxSources = Math.min(body.maxSources, 100) // Cap at 100
      }
    } catch {
      // Use defaults if no body provided
    }

    // Execute update
    const result = await updateBookSources({
      enableDeepValidation,
      maxSources,
    })

    return NextResponse.json({
      success: true,
      data: {
        total: result.total,
        added: result.added,
        updated: result.updated,
        failed: result.failed,
        errors: result.errors.length > 0 ? result.errors : undefined,
      },
    })
  } catch (error) {
    console.error('Source update failed:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Source update failed',
      },
      { status: 500 }
    )
  }
}