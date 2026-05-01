import axios from 'axios'
import * as cheerio from 'cheerio'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { BookSourceConfig } from '@/lib/types'
import { validateSourceConfig } from '@/config/sources'
import { delay, retry } from '@/lib/utils'

const SOURCE_PAGE_URL = 'https://www.yckceo.com/yuedu/shuyuan'
const REQUEST_TIMEOUT = 30000
const MAX_CONCURRENT_DOWNLOADS = 3

interface SourceUpdateResult {
  total: number
  added: number
  updated: number
  failed: number
  errors: string[]
}

interface SourceValidationResult {
  valid: boolean
  responseTime: number
  error?: string
}

/**
 * Fetch the source listing page and extract JSON URLs
 */
async function fetchSourceUrls(): Promise<string[]> {
  const response = await axios.get(SOURCE_PAGE_URL, {
    timeout: REQUEST_TIMEOUT,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
  })

  const $ = cheerio.load(response.data)
  const urls: string[] = []

  // Find all links that point to JSON files
  $('a[href]').each((_, element) => {
    const href = $(element).attr('href')
    if (href && (href.endsWith('.json') || href.includes('.json'))) {
      // Handle relative URLs
      if (href.startsWith('http')) {
        urls.push(href)
      } else if (href.startsWith('//')) {
        urls.push(`https:${href}`)
      } else if (href.startsWith('/')) {
        const baseUrl = new URL(SOURCE_PAGE_URL)
        urls.push(`${baseUrl.origin}${href}`)
      }
    }
  })

  // Also look for URLs in data attributes or script tags
  $('[data-source]').each((_, element) => {
    const dataSource = $(element).attr('data-source')
    if (dataSource && dataSource.startsWith('http')) {
      urls.push(dataSource)
    }
  })

  // Deduplicate URLs
  return [...new Set(urls)]
}

/**
 * Download a source configuration file
 */
async function downloadSourceConfig(url: string): Promise<unknown> {
  const response = await retry(
    () => axios.get(url, {
      timeout: REQUEST_TIMEOUT,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json, text/plain, */*',
      },
    }),
    2,
    1000
  )

  return response.data
}

/**
 * Quick validation: Check HTTP response and JSON structure
 */
async function quickValidate(config: unknown): Promise<SourceValidationResult> {
  const startTime = Date.now()

  try {
    // Check basic structure
    if (!validateSourceConfig(config)) {
      return {
        valid: false,
        responseTime: Date.now() - startTime,
        error: 'Invalid source config structure',
      }
    }

    const source = config as BookSourceConfig

    // Check required fields
    if (!source.name || !source.url) {
      return {
        valid: false,
        responseTime: Date.now() - startTime,
        error: 'Missing required fields: name or url',
      }
    }

    return {
      valid: true,
      responseTime: Date.now() - startTime,
    }
  } catch (error) {
    return {
      valid: false,
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown validation error',
    }
  }
}

/**
 * Deep validation: Test search functionality
 */
async function deepValidate(config: BookSourceConfig): Promise<SourceValidationResult> {
  const startTime = Date.now()

  try {
    // Try to perform a simple search to verify functionality
    const searchUrl = config.search.url.replace('{query}', encodeURIComponent('test'))

    const response = await axios.get(searchUrl, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      validateStatus: () => true, // Accept any status code
    })

    if (response.status >= 500) {
      return {
        valid: false,
        responseTime: Date.now() - startTime,
        error: `Server error: ${response.status}`,
      }
    }

    return {
      valid: true,
      responseTime: Date.now() - startTime,
    }
  } catch (error) {
    return {
      valid: false,
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Deep validation failed',
    }
  }
}

/**
 * Process a single source URL
 */
async function processSourceUrl(
  url: string,
  enableDeepValidation: boolean = false
): Promise<{ config: BookSourceConfig | null; validation: SourceValidationResult }> {
  try {
    // Download source config
    const rawData = await downloadSourceConfig(url)

    // Handle array of sources
    const configs = Array.isArray(rawData) ? rawData : [rawData]

    // Find first valid config
    for (const config of configs) {
      const quickResult = await quickValidate(config)

      if (!quickResult.valid) {
        continue
      }

      const sourceConfig = config as BookSourceConfig

      // Optional deep validation
      if (enableDeepValidation) {
        const deepResult = await deepValidate(sourceConfig)
        if (!deepResult.valid) {
          continue
        }
      }

      return { config: sourceConfig, validation: quickResult }
    }

    return {
      config: null,
      validation: {
        valid: false,
        responseTime: 0,
        error: 'No valid source config found in file',
      },
    }
  } catch (error) {
    return {
      config: null,
      validation: {
        valid: false,
        responseTime: 0,
        error: error instanceof Error ? error.message : 'Failed to process source',
      },
    }
  }
}

/**
 * Update book sources in database
 */
async function updateDatabase(
  sources: Array<{ config: BookSourceConfig; validation: SourceValidationResult }>
): Promise<{ added: number; updated: number }> {
  let added = 0
  let updated = 0

  for (const { config } of sources) {
    try {
      const existingSource = await prisma.bookSource.findUnique({
        where: { name: config.name },
      })

      if (existingSource) {
        // Update existing source
        await prisma.bookSource.update({
          where: { name: config.name },
          data: {
            url: config.url,
            config: config as unknown as Prisma.InputJsonValue,
            lastUpdated: new Date(),
            available: true,
          },
        })
        updated++
      } else {
        // Add new source
        await prisma.bookSource.create({
          data: {
            name: config.name,
            url: config.url,
            config: config as unknown as Prisma.InputJsonValue,
            type: 'user',
            available: true,
          },
        })
        added++
      }
    } catch (error) {
      console.error(`Failed to update source ${config.name}:`, error)
    }
  }

  return { added, updated }
}

/**
 * Main function to update all book sources
 */
export async function updateBookSources(
  options: {
    enableDeepValidation?: boolean
    maxSources?: number
  } = {}
): Promise<SourceUpdateResult> {
  const { enableDeepValidation = false, maxSources = 50 } = options
  const errors: string[] = []
  let total = 0

  try {
    // Step 1: Fetch source URLs from listing page
    console.log('Fetching source URLs from listing page...')
    const sourceUrls = await fetchSourceUrls()
    console.log(`Found ${sourceUrls.length} source URLs`)

    // Limit number of sources to process
    const urlsToProcess = sourceUrls.slice(0, maxSources)
    total = urlsToProcess.length

    // Step 2: Download and validate sources (with concurrency limit)
    const validSources: Array<{ config: BookSourceConfig; validation: SourceValidationResult }> = []

    for (let i = 0; i < urlsToProcess.length; i += MAX_CONCURRENT_DOWNLOADS) {
      const batch = urlsToProcess.slice(i, i + MAX_CONCURRENT_DOWNLOADS)

      const results = await Promise.all(
        batch.map(url => processSourceUrl(url, enableDeepValidation))
      )

      for (const result of results) {
        if (result.config) {
          validSources.push({
            config: result.config,
            validation: result.validation,
          })
        } else if (result.validation.error) {
          errors.push(result.validation.error)
        }
      }

      // Rate limiting between batches
      if (i + MAX_CONCURRENT_DOWNLOADS < urlsToProcess.length) {
        await delay(500)
      }
    }

    console.log(`Found ${validSources.length} valid sources`)

    // Step 3: Update database
    const { added, updated } = await updateDatabase(validSources)

    return {
      total,
      added,
      updated,
      failed: total - validSources.length,
      errors: errors.slice(0, 10), // Limit error messages
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    errors.push(errorMessage)

    return {
      total,
      added: 0,
      updated: 0,
      failed: total,
      errors,
    }
  }
}

/**
 * Verify CRON_SECRET for secure endpoints
 */
export function verifyCronSecret(authHeader: string | null, providedSecret: string | null): boolean {
  const expectedSecret = process.env.CRON_SECRET

  if (!expectedSecret) {
    console.warn('CRON_SECRET not configured')
    return false
  }

  // Check Authorization header (Bearer token)
  if (authHeader) {
    const token = authHeader.replace('Bearer ', '')
    return token === expectedSecret
  }

  // Check query parameter
  if (providedSecret) {
    return providedSecret === expectedSecret
  }

  return false
}