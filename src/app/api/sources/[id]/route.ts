import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { applyRateLimit } from '@/lib/rateLimit'

interface RouteParams {
  params: Promise<{ id: string }>
}

// DELETE /api/sources/[id] - Delete a book source
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  // Apply rate limiting
  const rateLimitResponse = await applyRateLimit(request)
  if (rateLimitResponse) {
    return rateLimitResponse
  }

  try {
    const { id } = await params

    // Check if source exists and is user-imported
    const source = await prisma.bookSource.findUnique({
      where: { id },
    })

    if (!source) {
      return NextResponse.json(
        { success: false, error: 'Source not found' },
        { status: 404 }
      )
    }

    if (source.type === 'builtin') {
      return NextResponse.json(
        { success: false, error: 'Cannot delete builtin sources' },
        { status: 403 }
      )
    }

    // Delete the source
    await prisma.bookSource.delete({
      where: { id },
    })

    return NextResponse.json({
      success: true,
      message: 'Source deleted successfully',
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete source',
      },
      { status: 500 }
    )
  }
}