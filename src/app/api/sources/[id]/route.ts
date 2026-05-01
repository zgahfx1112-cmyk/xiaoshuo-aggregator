import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface RouteParams {
  params: Promise<{ id: string }>
}

// DELETE /api/sources/[id] - Delete a book source
export async function DELETE(request: NextRequest, { params }: RouteParams) {
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