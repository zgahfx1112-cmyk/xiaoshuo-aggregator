import axios, { AxiosInstance } from 'axios'
import { JSONPath } from 'jsonpath-plus'
import { SearchResult } from '@/lib/types'
import { delay, retry, cleanContent } from '@/lib/utils'

// yckceo.com 书源格式
interface YckceoSourceConfig {
  bookSourceName: string
  bookSourceUrl: string
  searchUrl?: string
  searchList?: string
  searchName?: string
  searchAuthor?: string
  searchCover?: string
  searchBookUrl?: string
  bookInfoInit?: string
  bookName?: string
  bookAuthor?: string
  bookCoverUrl?: string
  bookIntro?: string
  chapterList?: string
  chapterName?: string
  chapterUrl?: string
  contentUrl?: string
  bookContent?: string
  header?: string
  concurrentRate?: string
  loginUrl?: string
  loginCheckJs?: string
  ruleSearch?: {
    list?: string
    name?: string
    author?: string
    cover?: string
    bookUrl?: string
  }
  ruleBookInfo?: {
    init?: string
    name?: string
    author?: string
    cover?: string
    intro?: string
  }
  ruleToc?: {
    list?: string
    name?: string
    chapterUrl?: string
  }
  ruleContent?: {
    content?: string
  }
}

export type SourceConfigInput = YckceoSourceConfig | Record<string, unknown>

export class SourceParser {
  private config: Record<string, unknown>
  private httpClient: AxiosInstance

  constructor(config: SourceConfigInput) {
    this.config = config as Record<string, unknown>
    const header = this.config.header as string | undefined
    this.httpClient = this.createHttpClient(header)
  }

  private createHttpClient(header?: string): AxiosInstance {
    const client = axios.create({
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        ...(header ? this.parseHeader(header) : {}),
      },
    })
    return client
  }

  private parseHeader(headerStr: string): Record<string, string> {
    const headers: Record<string, string> = {}
    try {
      // header format: "key:value|key2:value2"
      const pairs = headerStr.split('|')
      for (const pair of pairs) {
        const [key, value] = pair.split(':')
        if (key && value) {
          headers[key.trim()] = value.trim()
        }
      }
    } catch {
      // Ignore parse errors
    }
    return headers
  }

  async parseSearch(query: string): Promise<SearchResult[]> {
    const config = this.config as unknown as YckceoSourceConfig

    // Get search URL - support both formats
    let searchUrl = config.searchUrl || ''
    if (!searchUrl) {
      return []
    }

    // Replace query placeholder
    searchUrl = searchUrl.replace('{{key}}', encodeURIComponent(query))
    searchUrl = searchUrl.replace('{key}', encodeURIComponent(query))

    // Get parse rules - support both formats
    const listRule = config.searchList || config.ruleSearch?.list || ''
    const nameRule = config.searchName || config.ruleSearch?.name || ''
    const authorRule = config.searchAuthor || config.ruleSearch?.author || ''
    const coverRule = config.searchCover || config.ruleSearch?.cover || ''
    const bookUrlRule = config.searchBookUrl || config.ruleSearch?.bookUrl || ''

    if (!listRule) {
      return []
    }

    // Apply concurrent rate delay
    const rate = config.concurrentRate as string | undefined
    if (rate) {
      const delayMs = parseInt(rate, 10)
      if (delayMs > 0) {
        await delay(delayMs)
      }
    }

    try {
      const response = await retry(
        () => this.httpClient.get(searchUrl),
        3,
        1000
      )

      const data = response.data
      const list = this.parseRule(data, listRule)

      if (!Array.isArray(list)) {
        return []
      }

      return list.map(item => ({
        title: this.parseRule(item, nameRule) as string || '',
        author: this.parseRule(item, authorRule) as string || '',
        cover: this.parseRule(item, coverRule) as string || '',
        bookUrl: this.parseRule(item, bookUrlRule) as string || '',
        sourceName: config.bookSourceName,
      }))
    } catch {
      return []
    }
  }

  async parseBookInfo(bookUrl: string): Promise<{
    title: string
    author: string
    description: string
    chapters: Array<{ title: string; url: string }>
  }> {
    const config = this.config as unknown as YckceoSourceConfig

    // Get book info URL
    let infoUrl = config.bookInfoInit || config.bookSourceUrl || ''
    infoUrl = infoUrl.replace('{{bookUrl}}', bookUrl)
    infoUrl = infoUrl.replace('{bookUrl}', bookUrl)

    const nameRule = config.bookName || config.ruleBookInfo?.name || ''
    const authorRule = config.bookAuthor || config.ruleBookInfo?.author || ''
    const introRule = config.bookIntro || config.ruleBookInfo?.intro || ''
    const chapterListRule = config.chapterList || config.ruleToc?.list || ''
    const chapterNameRule = config.chapterName || config.ruleToc?.name || ''
    const chapterUrlRule = config.chapterUrl || config.ruleToc?.chapterUrl || ''

    try {
      const response = await retry(
        () => this.httpClient.get(infoUrl),
        3,
        1000
      )

      const data = response.data

      const result = {
        title: this.parseRule(data, nameRule) as string || '',
        author: this.parseRule(data, authorRule) as string || '',
        description: this.parseRule(data, introRule) as string || '',
        chapters: [] as Array<{ title: string; url: string }>,
      }

      if (chapterListRule) {
        const chapterList = this.parseRule(data, chapterListRule)
        if (Array.isArray(chapterList)) {
          result.chapters = chapterList.map(chapter => ({
            title: this.parseRule(chapter, chapterNameRule) as string || '',
            url: this.parseRule(chapter, chapterUrlRule) as string || '',
          }))
        }
      }

      return result
    } catch {
      return {
        title: '',
        author: '',
        description: '',
        chapters: [],
      }
    }
  }

  async parseChapterContent(chapterUrl: string): Promise<string> {
    const config = this.config as unknown as YckceoSourceConfig

    let contentUrl = config.contentUrl || config.bookSourceUrl || ''
    contentUrl = contentUrl.replace('{{chapterUrl}}', chapterUrl)
    contentUrl = contentUrl.replace('{chapterUrl}', chapterUrl)

    const contentRule = config.bookContent || config.ruleContent?.content || ''

    try {
      const response = await retry(
        () => this.httpClient.get(contentUrl),
        3,
        1000
      )

      const data = response.data
      const rawContent = this.parseRule(data, contentRule)

      return cleanContent(String(rawContent || ''), undefined)
    } catch {
      return ''
    }
  }

  // Parse using JSONPath or simple field access
  private parseRule(data: unknown, rule: string): unknown {
    if (!rule) return null

    try {
      // JSONPath
      if (rule.startsWith('$')) {
        const result = JSONPath({ path: rule, json: data as object })
        return result.length === 1 ? result[0] : result
      }

      // XPath placeholder (not implemented)
      if (rule.startsWith('/') || rule.startsWith('//')) {
        // Would need HTML parser with XPath support
        return null
      }

      // Simple field access
      if (typeof data === 'object' && data !== null) {
        return (data as Record<string, unknown>)[rule]
      }

      return null
    } catch {
      return null
    }
  }
}