import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { updateBookSources, verifyCronSecret } from '@/lib/sourceUpdater'

/**
 * GET /api/cron/update-sources
 * Cron job endpoint for scheduled book source updates
 * Called by external services like UptimeRobot
 * Requires CRON_SECRET verification via query parameter
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now()

  try {
    // Verify authorization
    const authHeader = request.headers.get('authorization')
    const querySecret = request.nextUrl.searchParams.get('secret')

    if (!verifyCronSecret(authHeader, querySecret)) {
      await logExecution('WARN', 'update-sources', 'Unauthorized access attempt')
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
      await logExecution('WARN', 'update-sources', 'Skipped: Another update is already running')
      return NextResponse.json({
        success: true,
        message: 'Skipped: Another update is already running',
      })
    }

    // Log start
    await logExecution('INFO', 'update-sources', 'Started scheduled source update')

    // Execute update
    const result = await updateBookSources({
      enableDeepValidation: false, // Skip deep validation for cron jobs
      maxSources: 50,
    })

    const duration = Date.now() - startTime

    // Log completion
    await logExecution(
      'INFO',
      'update-sources',
      `Completed: ${result.added} added, ${result.updated} updated, ${result.failed} failed (${duration}ms)`
    )

    // Log errors if any
    if (result.errors.length > 0) {
      await logExecution('WARN', 'update-sources', `Errors: ${result.errors.join('; ')}`)
    }

    return NextResponse.json({
      success: true,
      data: {
        total: result.total,
        added: result.added,
        updated: result.updated,
        failed: result.failed,
        duration: `${duration}ms`,
        errors: result.errors.length > 0 ? result.errors : undefined,
      },
    })
  } catch (error) {
    const duration = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    // Log error
    await logExecution('ERROR', 'update-sources', `Failed: ${errorMessage} (${duration}ms)`)

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
 * Log execution to SystemLog table
 */
async function logExecution(
  level: 'INFO' | 'WARN' | 'ERROR',
  task: string,
  message: string
): Promise<void> {
  try {
    await prisma.systemLog.create({
      data: {
        level,
        task,
        message,
      },
    })
  } catch (error) {
    console.error('Failed to log execution:', error)
  }
}