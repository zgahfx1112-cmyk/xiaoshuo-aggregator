import { prisma } from '@/lib/prisma'

export type LogLevel = 'INFO' | 'WARN' | 'ERROR'

export interface LogEntry {
  id: string
  level: LogLevel
  task: string
  message: string
  createdAt: Date
}

export interface LogQueryOptions {
  level?: LogLevel
  task?: string
  startDate?: Date
  endDate?: Date
  limit?: number
  offset?: number
}

export interface LogStats {
  total: number
  byLevel: Record<LogLevel, number>
  byTask: Record<string, number>
}

/**
 * Log a message to the SystemLog table
 */
export async function log(
  level: LogLevel,
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
    // Fallback to console if database logging fails
    console.error(`[${level}] ${task}: ${message}`)
    console.error('Failed to write to SystemLog:', error)
  }
}

/**
 * Convenience methods for different log levels
 */
export const logger = {
  info: (task: string, message: string) => log('INFO', task, message),
  warn: (task: string, message: string) => log('WARN', task, message),
  error: (task: string, message: string) => log('ERROR', task, message),
}

/**
 * Query logs with filters
 */
export async function queryLogs(options: LogQueryOptions = {}): Promise<LogEntry[]> {
  const {
    level,
    task,
    startDate,
    endDate,
    limit = 100,
    offset = 0,
  } = options

  const where: {
    level?: LogLevel
    task?: string
    createdAt?: { gte?: Date; lte?: Date }
  } = {}

  if (level) where.level = level
  if (task) where.task = task
  if (startDate || endDate) {
    where.createdAt = {}
    if (startDate) where.createdAt.gte = startDate
    if (endDate) where.createdAt.lte = endDate
  }

  const logs = await prisma.systemLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
  })

  return logs as LogEntry[]
}

/**
 * Get log statistics
 */
export async function getLogStats(
  startDate?: Date,
  endDate?: Date
): Promise<LogStats> {
  const where: { createdAt?: { gte?: Date; lte?: Date } } = {}

  if (startDate || endDate) {
    where.createdAt = {}
    if (startDate) where.createdAt.gte = startDate
    if (endDate) where.createdAt.lte = endDate
  }

  const [total, levelCounts, taskCounts] = await Promise.all([
    prisma.systemLog.count({ where }),
    prisma.systemLog.groupBy({
      by: ['level'],
      where,
      _count: true,
    }),
    prisma.systemLog.groupBy({
      by: ['task'],
      where,
      _count: true,
    }),
  ])

  const byLevel: Record<LogLevel, number> = { INFO: 0, WARN: 0, ERROR: 0 }
  for (const item of levelCounts) {
    byLevel[item.level as LogLevel] = item._count
  }

  const byTask: Record<string, number> = {}
  for (const item of taskCounts) {
    byTask[item.task] = item._count
  }

  return { total, byLevel, byTask }
}

/**
 * Clean up old logs (retain logs newer than retentionDays)
 */
export async function cleanupOldLogs(retentionDays: number = 30): Promise<number> {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays)

  const result = await prisma.systemLog.deleteMany({
    where: {
      createdAt: { lt: cutoffDate },
    },
  })

  return result.count
}

/**
 * Log cron job execution with timing
 */
export async function logCronExecution(
  task: string,
  execution: () => Promise<void>
): Promise<{ success: boolean; duration: number; error?: string }> {
  const startTime = Date.now()

  try {
    await logger.info(task, 'Started')
    await execution()
    const duration = Date.now() - startTime
    await logger.info(task, `Completed successfully (${duration}ms)`)
    return { success: true, duration }
  } catch (error) {
    const duration = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const stackTrace = error instanceof Error ? error.stack : ''
    await logger.error(task, `Failed: ${errorMessage}${stackTrace ? `\n${stackTrace}` : ''}`)
    return { success: false, duration, error: errorMessage }
  }
}

/**
 * Capture and log unhandled errors
 */
export function setupErrorMonitoring(): void {
  if (typeof window === 'undefined') {
    // Server-side error handling
    process.on('uncaughtException', (error) => {
      logger.error('system', `Uncaught Exception: ${error.message}\n${error.stack}`)
    })

    process.on('unhandledRejection', (reason) => {
      const message = reason instanceof Error
        ? `${reason.message}\n${reason.stack}`
        : String(reason)
      logger.error('system', `Unhandled Rejection: ${message}`)
    })
  }
}