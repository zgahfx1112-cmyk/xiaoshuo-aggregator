import axios, { AxiosInstance } from 'axios'
import { JSONPath } from 'jsonpath-plus'
import { BookSourceConfig, SearchResult, AntiCrawlConfig } from '@/lib/types'
import { delay, randomSelect, retry, cleanContent } from '@/lib/utils'

export type SourceConfigInput = BookSourceConfig | Record<string, unknown>

export class SourceParser {
  private config: Record<string, unknown>
  private httpClient: AxiosInstance

  constructor(config: SourceConfigInput) {
    this.config = config as Record<string, unknown>
    const antiCrawl = (config as Record<string, unknown>).antiCrawl as AntiCrawlConfig | undefined
    this.httpClient = this.createHttpClient(antiCrawl)
  }

  /**
   * Create HTTP client with anti-crawl configuration
   */
  private createHttpClient(antiCrawl?: AntiCrawlConfig): AxiosInstance {
    const client = axios.create({
      timeout: 10000,
      headers: {
        'User-Agent': antiCrawl?.userAgents
          ? randomSelect(antiCrawl.userAgents)
          : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    })

    // Add cookies if configured
    if (antiCrawl?.cookies) {
      client.defaults.headers.common['Cookie'] = Object.entries(
        antiCrawl.cookies
      )
        .map(([k, v]) => `${k}=${v}`)
        .join('; ')
    }

    return client
  }

  /**
   * Parse search results from book source
   */
  async parseSearch(query: string): Promise<SearchResult[]> {
    const searchConfig = this.config.search as { url: string; method: string; params?: Record<string, string>; parseRules: { list: string; title: string; author: string; cover: string; bookUrl: string } }
    const url = searchConfig.url.replace('{query}', encodeURIComponent(query))

    const makeRequest = async () => {
      if (searchConfig.method === 'GET') {
        const params = searchConfig.params
          ? Object.fromEntries(
              Object.entries(searchConfig.params).map(([k, v]) => [
                k,
                v.replace('{query}', query),
              ])
            )
          : {}
        return await this.httpClient.get(url, { params })
      } else {
        return await this.httpClient.post(url, { keyword: query })
      }
    }

    // Apply delay if configured
    const antiCrawl = this.config.antiCrawl as AntiCrawlConfig | undefined
    if (antiCrawl?.delay) {
      await delay(antiCrawl.delay)
    }

    const response = await retry(makeRequest, 3, 1000)
    const data = response.data

    // Parse using JSONPath or XPath
    const list = this.parseJSONPath(data, searchConfig.parseRules.list)

    if (!Array.isArray(list)) {
      return []
    }

    return list.map(item => ({
      title: this.extractField(item, searchConfig.parseRules.title),
      author: this.extractField(item, searchConfig.parseRules.author),
      cover: this.extractField(item, searchConfig.parseRules.cover),
      bookUrl: this.extractField(item, searchConfig.parseRules.bookUrl),
      sourceName: this.config.name as string,
    }))
  }

  /**
   * Parse book info from detail URL
   */
  async parseBookInfo(bookUrl: string): Promise<{
    title: string
    author: string
    description: string
    chapters: Array<{ title: string; url: string }>
  }> {
    const bookInfoConfig = this.config.bookInfo as { url: string; parseRules: { title: string; author: string; description: string; chapters?: { list: string; title: string; url: string } } }
    const fullUrl = bookInfoConfig.url.replace('{id}', bookUrl)

    const antiCrawl = this.config.antiCrawl as AntiCrawlConfig | undefined
    if (antiCrawl?.delay) {
      await delay(antiCrawl.delay)
    }

    const response = await retry(
      () => this.httpClient.get(fullUrl),
      3,
      1000
    )

    const data = response.data
    const parseRules = bookInfoConfig.parseRules

    const result = {
      title: this.parseJSONPath(data, parseRules.title) as string,
      author: this.parseJSONPath(data, parseRules.author) as string,
      description: this.parseJSONPath(data, parseRules.description) as string,
      chapters: [] as Array<{ title: string; url: string }>,
    }

    if (parseRules.chapters) {
      const chapterList = this.parseJSONPath(data, parseRules.chapters.list)
      if (Array.isArray(chapterList)) {
        result.chapters = chapterList.map(chapter => ({
          title: this.extractField(chapter, parseRules.chapters!.title),
          url: this.extractField(chapter, parseRules.chapters!.url),
        }))
      }
    }

    return result
  }

  /**
   * Parse chapter content from chapter URL
   */
  async parseChapterContent(chapterUrl: string): Promise<string> {
    const chapterConfig = this.config.chapterContent as { url: string; parseRules: { content: string; filters?: string[] } }
    const fullUrl = chapterConfig.url.replace('{url}', chapterUrl)

    const antiCrawl = this.config.antiCrawl as AntiCrawlConfig | undefined
    if (antiCrawl?.delay) {
      await delay(antiCrawl.delay)
    }

    const response = await retry(
      () => this.httpClient.get(fullUrl),
      3,
      1000
    )

    const data = response.data
    const rawContent = this.parseJSONPath(
      data,
      chapterConfig.parseRules.content
    )

    // Apply content filters
    const cleaned = cleanContent(
      String(rawContent || ''),
      chapterConfig.parseRules.filters
    )

    return cleaned
  }

  /**
   * Parse using JSONPath
   */
  parseJSONPath(data: unknown, path: string): unknown {
    try {
      // Check if path is simple field name (no $ prefix)
      if (!path.startsWith('$') && !path.startsWith('/')) {
        // Simple field access
        if (typeof data === 'object' && data !== null) {
          return (data as Record<string, unknown>)[path]
        }
        return null
      }

      // JSONPath query
      const result = JSONPath({ path, json: data as object })
      return result.length === 1 ? result[0] : result
    } catch {
      return null
    }
  }

  /**
   * Parse using XPath (for HTML content) - placeholder for future implementation
   */
  parseXPath(_html: string, _xpath: string): string | null {
    // Cheerio doesn't support XPath directly
    // Will implement with a proper XPath library in future tasks
    return null
  }

  /**
   * Extract field value from object
   */
  private extractField(item: unknown, fieldPath: string): string {
    const value = this.parseJSONPath(item, fieldPath)
    return typeof value === 'string' ? value : String(value || '')
  }
}