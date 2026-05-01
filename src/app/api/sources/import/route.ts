import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateSourceConfig, BookSourceConfig } from '@/config/sources'

// POST /api/sources/import - Import a book source
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Support single source or array of sources
    const sources = Array.isArray(body) ? body : [body]
    const results: Array<{
      name: string
      success: boolean
      error?: string
    }> = []

    for (const sourceConfig of sources) {
      // Validate source config
      if (!validateSourceConfig(sourceConfig)) {
        results.push({
          name: sourceConfig?.name || 'Unknown',
          success: false,
          error: 'Invalid source configuration format',
        })
        continue
      }

      const config = sourceConfig as BookSourceConfig

      // Check if source already exists
      const existing = await prisma.bookSource.findUnique({
        where: { name: config.name },
      })

      if (existing) {
        results.push({
          name: config.name,
          success: false,
          error: 'Source with this name already exists',
        })
        continue
      }

      // Quick HTTP validation - check if URL is accessible
      let available = true
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 5000)

        const response = await fetch(config.url, {
          method: 'HEAD',
          signal: controller.signal,
        })

        clearTimeout(timeoutId)
        available = response.ok
      } catch {
        available = false
      }

      // Save to database
      try {
        await prisma.bookSource.create({
          data: {
            name: config.name,
            url: config.url,
            config: config as object,
            type: 'user',
            available,
          },
        })

        results.push({
          name: config.name,
          success: true,
        })
      } catch (dbError) {
        results.push({
          name: config.name,
          success: false,
          error: dbError instanceof Error ? dbError.message : 'Database error',
        })
      }
    }

    const successCount = results.filter(r => r.success).length
    const failCount = results.filter(r => !r.success).length

    return NextResponse.json({
      success: true,
      message: `Imported ${successCount} source(s), ${failCount} failed`,
      data: {
        total: sources.length,
        succeeded: successCount,
        failed: failCount,
        results,
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to import sources',
      },
      { status: 500 }
    )
  }
}