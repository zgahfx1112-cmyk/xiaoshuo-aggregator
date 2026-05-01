import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateSourceConfig, BookSourceConfig } from '@/config/sources'
import { applyRateLimit } from '@/lib/rateLimit'

// POST /api/sources/import - Import a book source
// Supports: JSON config, URL to JSON file, array of configs
export async function POST(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResponse = await applyRateLimit(request)
  if (rateLimitResponse) {
    return rateLimitResponse
  }

  try {
    const body = await request.json()

    // Check if body is a URL string
    if (typeof body === 'string' && body.startsWith('http')) {
      return await importFromUrl(body)
    }

    // Check if body has url field pointing to external JSON
    if (body.url && typeof body.url === 'string' && body.url.startsWith('http') && !body.name) {
      return await importFromUrl(body.url)
    }

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
        // Update existing source
        await prisma.bookSource.update({
          where: { name: config.name },
          data: {
            url: config.url,
            config: config as object,
            lastUpdated: new Date(),
          },
        })
        results.push({
          name: config.name,
          success: true,
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
            enabled: true,
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

// Import book sources from a URL pointing to JSON file
async function importFromUrl(url: string): Promise<NextResponse> {
  try {
    // Fetch JSON from URL
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000)

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      return NextResponse.json({
        success: false,
        error: `Failed to fetch from URL: ${response.status}`,
      }, { status: 400 })
    }

    const jsonText = await response.text()
    let configs: unknown

    try {
      configs = JSON.parse(jsonText)
    } catch {
      return NextResponse.json({
        success: false,
        error: 'Invalid JSON format from URL',
      }, { status: 400 })
    }

    // Handle array or single config
    const sources = Array.isArray(configs) ? configs : [configs]
    const results: Array<{
      name: string
      success: boolean
      error?: string
    }> = []

    for (const sourceConfig of sources) {
      // Validate source config
      if (!validateSourceConfig(sourceConfig)) {
        results.push({
          name: sourceConfig?.name || sourceConfig?.bookSourceName || 'Unknown',
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
        // Update existing source
        await prisma.bookSource.update({
          where: { name: config.name },
          data: {
            url: config.url,
            config: config as object,
            lastUpdated: new Date(),
          },
        })
        results.push({
          name: config.name,
          success: true,
        })
        continue
      }

      // Save to database
      try {
        await prisma.bookSource.create({
          data: {
            name: config.name,
            url: config.url,
            config: config as object,
            type: 'user',
            available: true,
            enabled: true,
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
      message: `Imported ${successCount} source(s) from URL, ${failCount} failed`,
      data: {
        url,
        total: sources.length,
        succeeded: successCount,
        failed: failCount,
        results,
      },
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to import from URL',
    }, { status: 500 })
  }
}