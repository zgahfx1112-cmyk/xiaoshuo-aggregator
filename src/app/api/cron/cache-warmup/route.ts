import { NextRequest, NextResponse } from 'next/server'
import { warmupCache } from '@/lib/cacheService'
import { verifyCronSecret } from '@/lib/sourceUpdater'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/cron/cache-warmup
 * Cron job endpoint for scheduled cache warmup
 * Called by external services like UptimeRobot
 * Requires CRON_SECRET verification via query parameter or Authorization header
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now()

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

    // Check if already running (prevent concurrent executions)
    const recentExecution = await prisma.systemLog.findFirst({
      where: {
        task: 'cache-warmup',
        level: 'INFO',
        message: { contains: 'Started' },
        createdAt: {
          gte: new Date(Date.now() - 10 * 60 * 1000), // Within last 10 minutes
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    if (recentExecution) {
      return NextResponse.json({
        success: true,
        message: 'Skipped: Another cache warmup is already running',
      })
    }

    // Log start
    await prisma.systemLog.create({
      data: {
        level: 'INFO',
        task: 'cache-warmup',
        message: 'Started scheduled cache warmup',
      },
    })

    // Execute warmup
    const result = await warmupCache()

    const duration = Date.now() - startTime

    // Log completion
    await prisma.systemLog.create({
      data: {
        level: 'INFO',
        task: 'cache-warmup',
        message: `Completed: ${result.novelsWarmed} novels warmed, ${result.errors.length} errors (${duration}ms)`,
      },
    })

    // Log errors if any
    if (result.errors.length > 0) {
      await prisma.systemLog.create({
        data: {
          level: 'WARN',
          task: 'cache-warmup',
          message: `Errors: ${result.errors.join('; ')}`,
        },
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        novelsWarmed: result.novelsWarmed,
        chaptersWarmed: result.chaptersWarmed,
        errorCount: result.errors.length,
        errors: result.errors.length > 0 ? result.errors : undefined,
        duration: `${duration}ms`,
      },
    })
  } catch (error) {
    const duration = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    // Log error
    await prisma.systemLog.create({
      data: {
        level: 'ERROR',
        task: 'cache-warmup',
        message: `Failed: ${errorMessage} (${duration}ms)`,
      },
    }).catch(() => {})

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