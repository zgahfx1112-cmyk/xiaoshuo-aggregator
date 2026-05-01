import { NextRequest, NextResponse } from 'next/server'
import { applyRateLimit } from '@/lib/rateLimit'

/**
 * GET /api/proxy?url=...
 * Proxy fetch to bypass CORS restrictions
 */
export async function GET(request: NextRequest) {
  const rateLimitResponse = await applyRateLimit(request)
  if (rateLimitResponse) {
    return rateLimitResponse
  }

  const url = request.nextUrl.searchParams.get('url')

  if (!url) {
    return NextResponse.json({
      success: false,
      error: 'url parameter is required',
    }, { status: 400 })
  }

  // Only allow specific domains for security
  const allowedDomains = [
    'yckceo.com',
    'www.yckceo.com',
  ]

  try {
    const targetUrl = new URL(url)
    const isAllowed = allowedDomains.some(domain => targetUrl.hostname === domain)

    if (!isAllowed) {
      return NextResponse.json({
        success: false,
        error: 'Domain not allowed',
      }, { status: 403 })
    }
  } catch {
    return NextResponse.json({
      success: false,
      error: 'Invalid URL',
    }, { status: 400 })
  }

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json, text/plain, */*',
      },
    })

    if (!response.ok) {
      return NextResponse.json({
        success: false,
        error: `Fetch failed: ${response.status}`,
      }, { status: 400 })
    }

    const text = await response.text()

    // Try to parse as JSON to validate
    try {
      const json = JSON.parse(text)
      return NextResponse.json({
        success: true,
        data: json,
      })
    } catch {
      // Return as text if not valid JSON
      return new NextResponse(text, {
        headers: {
          'Content-Type': 'text/plain',
        },
      })
    }
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Fetch failed',
    }, { status: 500 })
  }
}