import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { updateBookSources, verifyCronSecret } from '@/lib/sourceUpdater'
import { syncYckceoSources } from '@/lib/yckceoScraper'
import { logger } from '@/lib/logger'
import { applyRateLimit } from '@/lib/rateLimit'

/**
 * GET /api/cron/update-sources
 * Cron job endpoint for scheduled book source updates
 * Called by external services like UptimeRobot
 * Requires CRON_SECRET verification via query parameter
 */
export async function GET(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResponse = await applyRateLimit(request)
  if (rateLimitResponse) {
    return rateLimitResponse
  }

  const startTime = Date.now()

  try {
    // Verify authorization
    const authHeader = request.headers.get('authorization')
    const querySecret = request.nextUrl.searchParams.get('secret')

    if (!verifyCronSecret(authHeader, querySecret)) {
      await logger.warn('update-sources', 'Unauthorized access attempt')
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if already running (prevent concurrent executions)
    const recentExecution = await prisma.systemLog.findFirst({
      where: {
        task: 'update-sources',
        level: 'INFO',
        message: { contains: 'Started' },
        createdAt: {
          gte: new Date(Date.now() - 5 * 60 * 1000), // Within last 5 minutes
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    if (recentExecution) {
      await logger.warn('update-sources', 'Skipped: Another update is already running')
      return NextResponse.json({
        success: true,
        message: 'Skipped: Another update is already running',
      })
    }

    // Log start
    await logger.info('update-sources', 'Started scheduled source update from yckceo.com')

    // Execute sync from yckceo.com
    const result = await syncYckceoSources()

    const duration = Date.now() - startTime

    // Log completion
    await logger.info(
      'update-sources',
      `Completed: ${result.added} added, ${result.updated} updated, ${result.failed} failed (${duration}ms)`
    )

    return NextResponse.json({
      success: true,
      data: {
        total: result.total,
        added: result.added,
        updated: result.updated,
        failed: result.failed,
        duration: `${duration}ms`,
      },
    })
  } catch (error) {
    const duration = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const stackTrace = error instanceof Error ? error.stack : ''

    // Log error with stack trace
    await logger.error('update-sources', `Failed: ${errorMessage} (${duration}ms)${stackTrace ? `\n${stackTrace}` : ''}`)

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        duration: `${duration}ms`,
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/cron/update-sources
 * Manual trigger for source update (for testing)
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    await logger.info('update-sources', 'Manual trigger: Started source update')

    const result = await syncYckceoSources()

    const duration = Date.now() - startTime

    await logger.info(
      'update-sources',
      `Manual trigger completed: ${result.added} added, ${result.updated} updated (${duration}ms)`
    )

    return NextResponse.json({
      success: true,
      data: {
        total: result.total,
        added: result.added,
        updated: result.updated,
        failed: result.failed,
        duration: `${duration}ms`,
      },
    })
  } catch (error) {
    const duration = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    await logger.error('update-sources', `Manual trigger failed: ${errorMessage} (${duration}ms)`)

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        duration: `${duration}ms`,
      },
      { status: 500 }
    )
  }
}