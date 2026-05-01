import { NextRequest, NextResponse } from 'next/server'
import { queryLogs, getLogStats } from '@/lib/logger'
import { verifyCronSecret } from '@/lib/auth'

/**
 * GET /api/logs
 * Query system logs with filters
 * Requires CRON_SECRET authorization
 */
export async function GET(request: NextRequest) {
  // Verify authorization
  const authHeader = request.headers.get('authorization')
  const querySecret = request.nextUrl.searchParams.get('secret')

  if (!verifyCronSecret(authHeader, querySecret)) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    )
  }

  const { searchParams } = request.nextUrl

  // Parse query parameters
  const level = searchParams.get('level') as 'INFO' | 'WARN' | 'ERROR' | null
  const task = searchParams.get('task')
  const startDateStr = searchParams.get('startDate')
  const endDateStr = searchParams.get('endDate')
  const limit = parseInt(searchParams.get('limit') || '100', 10)
  const offset = parseInt(searchParams.get('offset') || '0', 10)
  const statsOnly = searchParams.get('stats') === 'true'

  // Parse dates
  const startDate = startDateStr ? new Date(startDateStr) : undefined
  const endDate = endDateStr ? new Date(endDateStr) : undefined

  // Validate dates
  if ((startDateStr && isNaN(startDate!.getTime())) || (endDateStr && isNaN(endDate!.getTime()))) {
    return NextResponse.json(
      { success: false, error: 'Invalid date format. Use ISO 8601 format.' },
      { status: 400 }
    )
  }

  // Validate level
  if (level && !['INFO', 'WARN', 'ERROR'].includes(level)) {
    return NextResponse.json(
      { success: false, error: 'Invalid level. Must be INFO, WARN, or ERROR.' },
      { status: 400 }
    )
  }

  try {
    if (statsOnly) {
      // Return only statistics
      const stats = await getLogStats(startDate, endDate)
      return NextResponse.json({
        success: true,
        data: stats,
      })
    }

    // Query logs
    const logs = await queryLogs({
      level: level || undefined,
      task: task || undefined,
      startDate,
      endDate,
      limit: Math.min(limit, 1000), // Cap at 1000
      offset,
    })

    // Get stats for the same query
    const stats = await getLogStats(startDate, endDate)

    return NextResponse.json({
      success: true,
      data: {
        logs,
        stats,
        pagination: {
          limit,
          offset,
          hasMore: logs.length === limit,
        },
      },
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    )
  }
}