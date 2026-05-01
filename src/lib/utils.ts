/**
 * Delay execution for specified milliseconds
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Random select from array
 */
export function randomSelect<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

/**
 * Retry function with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error | null = null

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error
      if (i < maxRetries - 1) {
        await delay(baseDelay * Math.pow(2, i))
      }
    }
  }

  throw lastError
}

/**
 * Clean HTML content (remove ads, fix formatting)
 */
export function cleanContent(content: string, filters?: string[]): string {
  if (!filters) return content

  let cleaned = content
  for (const filter of filters) {
    try {
      const regex = new RegExp(filter, 'g')
      cleaned = cleaned.replace(regex, '')
    } catch {
      // Invalid regex, skip
    }
  }

  // Fix paragraph formatting
  cleaned = cleaned
    .replace(/\n{3,}/g, '\n\n')
    .replace(/^\s+/gm, '')
    .trim()

  return cleaned
}

/**
 * Generate session ID for anonymous user
 */
export function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Sanitize string for URL
 */
export function sanitizeUrl(str: string): string {
  return encodeURIComponent(str.trim())
}