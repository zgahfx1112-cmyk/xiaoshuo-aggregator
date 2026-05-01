import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const sources = await prisma.bookSource.findMany({
      select: {
        id: true,
        name: true,
        url: true,
        type: true,
        available: true,
        lastUpdated: true,
      },
      orderBy: {
        name: 'asc',
      },
    })

    return NextResponse.json({
      success: true,
      data: sources,
      total: sources.length,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch sources',
      },
      { status: 500 }
    )
  }
}