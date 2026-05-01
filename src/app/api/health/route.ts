import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getRedisClient } from '@/lib/redis'

export async function GET() {
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`

    // Check Redis connection
    const redis = getRedisClient()
    await redis.ping()

    return NextResponse.json({
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'connected',
        redis: 'connected',
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}