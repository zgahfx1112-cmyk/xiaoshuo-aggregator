import axios, { AxiosInstance } from 'axios'
import * as cheerio from 'cheerio'
import { JSONPath } from 'jsonpath-plus'
import { SearchResult } from '@/lib/types'
import { delay, retry, cleanContent } from '@/lib/utils'

// yckceo.com 阅读APP书源格式
interface YckceoSourceConfig {
  bookSourceName: string
  bookSourceUrl: string
  searchUrl?: string
  // 新格式：ruleSearch
  ruleSearch?: {
    bookList?: string
    name?: string
    author?: string
    coverUrl?: string
    bookUrl?: string
    intro?: string
    kind?: string
    lastChapter?: string
    checkKeyWord?: string
  }
  // 旧格式兼容
  searchList?: string
  searchName?: string
  searchAuthor?: string
  searchCover?: string
  searchBookUrl?: string
  // 书籍详情
  ruleBookInfo?: {
    init?: string
    name?: string
    author?: string
    coverUrl?: string
    intro?: string
    kind?: string
    lastChapter?: string
    tocUrl?: string
    wordCount?: string
  }
  bookInfoInit?: string
  bookName?: string
  bookAuthor?: string
  bookCoverUrl?: string
  bookIntro?: string
  // 目录
  ruleToc?: {
    chapterList?: string
    chapterName?: string
    chapterUrl?: string
    nextTocUrl?: string
  }
  chapterList?: string
  chapterName?: string
  chapterUrl?: string
  // 内容
  ruleContent?: {
    content?: string
    nextContentUrl?: string
    replaceRegex?: string
  }
  contentUrl?: string
  bookContent?: string
  // 其他
  header?: string
  concurrentRate?: string
  enabledCookieJar?: boolean
  bookSourceGroup?: string
}

export type SourceConfigInput = YckceoSourceConfig | Record<string, unknown>

export class SourceParser {
  private config: YckceoSourceConfig
  private httpClient: AxiosInstance
  private baseUrl: string

  constructor(config: SourceConfigInput) {
    this.config = config as YckceoSourceConfig
    this.baseUrl = this.config.bookSourceUrl || ''
    const header = this.config.header
    this.httpClient = this.createHttpClient(header)
  }

  private createHttpClient(header?: string): AxiosInstance {
    const headers: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Linux; Android 12; Nexus 5X) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.1369.112 Mobile Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'zh-CN,zh;q=0.9',
    }

    // Parse custom header
    if (header) {
      try {
        // Format: {'key':'value','key2':'value2'} or key:value|key2:value2
        if (header.startsWith('{')) {
          const parsed = JSON.parse(header.replace(/'/g, '"'))
          Object.assign(headers, parsed)
        } else {
          const pairs = header.split('|')
          for (const pair of pairs) {
            const [key, value] = pair.split(':')
            if (key && value) {
              headers[key.trim()] = value.trim()
            }
          }
        }
      } catch {
        // Ignore parse errors
      }
    }

    // Add Referer
    if (this.baseUrl) {
      headers['Referer'] = this.baseUrl
    }

    return axios.create({
      timeout: 15000,
      headers,
      withCredentials: true,
    })
  }

  // Parse rule string and extract value from data/HTML
  private parseRuleValue(data: unknown, rule: string): string | string[] {
    if (!rule) return ''

    // Remove JS suffix like @js:java.t2s(result)
    let cleanRule = rule.split('@js:')[0].split('<js>')[0]

    // Handle JSON data
    if (typeof data === 'object' && data !== null && typeof (data as any).html !== 'function') {
      // JSONPath
      if (cleanRule.startsWith('$')) {
        const result = JSONPath({ path: cleanRule, json: data as object })
        return result.length === 1 ? String(result[0]) : result.map(String)
      }
      // Simple field
      const value = (data as Record<string, unknown>)[cleanRule]
      return value ? String(value) : ''
    }

    // Handle HTML data
    const html = typeof data === 'string' ? data : ''
    if (!html) return ''

    const $ = cheerio.load(html)

    // Parse rule patterns
    // Examples:
    // - tag.a.0@href → first <a> href attribute
    // - id.content.0@text → element with id="content" text
    // - class.title.0@text → first .title element text
    // - //meta[@property='og:title']/@content → XPath (simplified)
    // - @css:.title@text → CSS selector

    let result: string | string[] = ''

    // CSS selector format: @css:selector
    if (cleanRule.startsWith('@css:')) {
      const selector = cleanRule.slice(6)
      const attrMatch = selector.match(/@(.+)$/)
      const attr = attrMatch ? attrMatch[1] : 'text'
      const sel = attrMatch ? selector.slice(0, -attrMatch[0].length) : selector

      const elements = $(sel)
      if (elements.length > 0) {
        result = attr === 'text' || attr === 'textNodes'
          ? elements.text()
          : elements.attr(attr) || ''
      }
    }
    // XPath-like: //tag[@attr='value']/@attr
    else if (cleanRule.startsWith('//')) {
      // Simplified XPath → convert to CSS/cheerio
      result = this.parseXPath($, cleanRule)
    }
    //阅读APP规则: id.xxx, class.xxx, tag.xxx
    else if (cleanRule.match(/^(id|class|tag)\./)) {
      result = this.parseReadRule($, cleanRule)
    }
    // Plain text/HTML content
    else if (cleanRule === 'text' || cleanRule === 'html' || cleanRule === 'body') {
      result = cleanRule === 'html' ? html : $.root().text()
    }

    // Apply textNodes special handling
    if (rule.includes('@textNodes')) {
      const sel = cleanRule.split('@')[0]
      const $elements = cheerio.load(html)(sel)
      const texts: string[] = []
      $elements.contents().each((_: number, el: any) => {
        if (el.type === 'text') {
          texts.push($(el).text())
        }
      })
      result = texts.join('\n')
    }

    // Get attribute: @href, @src, @content, @alt, @text
    const attrMatch = cleanRule.match(/@([a-zA-Z]+)$/)
    if (attrMatch && typeof result === 'string' && !result) {
      const attr = attrMatch[1]
      const sel = cleanRule.slice(0, -attrMatch[0].length)
      const elements = this.selectElements($, sel)
      if (elements.length > 0) {
        result = attr === 'text' ? elements.text() : elements.attr(attr) || elements.find(attr).text() || ''
      }
    }

    return result
  }

  // Parse rule from a cheerio element (not re-loading HTML)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private parseRuleValueFromElement($: any, element: any, rule: string): string {
    if (!rule) return ''

    // Remove JS suffix like @js:java.t2s(result)
    let cleanRule = rule.split('@js:')[0].split('<js>')[0]

    // Remove ##replace patterns
    cleanRule = cleanRule.split('##')[0]

    // Handle rules starting from the element itself
    const parts = cleanRule.split('@')
    const lastPart = parts[parts.length - 1]

    // Check if last part is an attribute
    const isAttr = lastPart === 'text' || lastPart === 'textNodes' || lastPart === 'html' ||
                   lastPart === 'href' || lastPart === 'src' || lastPart === 'content' ||
                   lastPart === 'alt' || lastPart === 'name' || lastPart === 'value'

    const selectorParts = isAttr ? parts.slice(0, -1) : parts
    const attr = isAttr ? lastPart : 'text'

    let current = element

    for (let i = 0; i < selectorParts.length; i++) {
      const part = selectorParts[i]
      if (!part) continue

      // Handle class.xxx → .xxx (but skip if it's the item class itself)
      if (part.startsWith('class.')) {
        const cls = part.slice(6)
        const indexMatch = cls.match(/\.\d+$/)
        const clsName = indexMatch ? cls.slice(0, -indexMatch[0].length) : cls
        const idx = indexMatch ? parseInt(cls.slice(-indexMatch[0].length + 1), 10) : null

        current = current.find(`.${clsName}`)
        if (idx !== null && current.length > idx) {
          current = current.eq(idx)
        }
      }
      // Handle tag.xxx → xxx
      else if (part.startsWith('tag.')) {
        const tag = part.slice(4)
        const indexMatch = tag.match(/\.\d+$/)
        const tagName = indexMatch ? tag.slice(0, -indexMatch[0].length) : tag
        const idx = indexMatch ? parseInt(tag.slice(-indexMatch[0].length + 1), 10) : null

        current = current.find(tagName)
        if (idx !== null && current.length > idx) {
          current = current.eq(idx)
        }
      }
      // Handle id.xxx → #xxx
      else if (part.startsWith('id.')) {
        const id = part.slice(3).split('.')[0]
        current = current.find(`#${id}`)
      }
      // Handle plain CSS selectors like ".item", "a.1", "img"
      else if (part.startsWith('.')) {
        // .item → class item, a.1 → <a> with index 1
        const sel = part.slice(1)
        const indexMatch = sel.match(/\.\d+$/)
        const selName = indexMatch ? sel.slice(0, -indexMatch[0].length) : sel
        const idx = indexMatch ? parseInt(sel.slice(-indexMatch[0].length + 1), 10) : null

        // If selName is a number like "1", it's an index on current
        if (/^\d+$/.test(selName)) {
          const index = parseInt(selName, 10)
          if (current.length > index) {
            current = current.eq(index)
          }
        } else {
          current = current.find(`.${selName}`)
          if (idx !== null && current.length > idx) {
            current = current.eq(idx)
          }
        }
      }
      // Handle tag names like "a", "img", "h3", "p"
      else if (/^[a-zA-Z]+$/.test(part)) {
        const indexMatch = part.match(/\d+$/)
        const tagName = indexMatch ? part.slice(0, -indexMatch[0].length) : part
        const idx = indexMatch ? parseInt(part.slice(-indexMatch[0].length), 10) : null

        current = current.find(tagName)
        if (idx !== null && current.length > idx) {
          current = current.eq(idx)
        }
      }
      // Handle indexed selectors like "a.1"
      else {
        const match = part.match(/^([a-zA-Z]+)\.(\d+)$/)
        if (match) {
          const [, tagName, idxStr] = match
          const idx = parseInt(idxStr, 10)
          current = current.find(tagName)
          if (current.length > idx) {
            current = current.eq(idx)
          }
        }
      }
    }

    // Get attribute/text
    if (attr === 'text' || attr === 'textNodes') {
      return current.text().trim()
    }
    if (attr === 'html') {
      return current.html() || ''
    }
    return current.attr(attr) || ''
  }

  // Select elements by 阅读APP rule format
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private selectElements($: any, rule: string): any {
    if (!rule) return $.root()

    // id.xxx → #xxx
    if (rule.startsWith('id.')) {
      const id = rule.slice(3).split('.')[0].split('@')[0]
      return $(`#${id}`)
    }

    // class.xxx → .xxx
    if (rule.startsWith('class.')) {
      const cls = rule.slice(6).split('.')[0].split('@')[0]
      return $(`.${cls}`)
    }

    // tag.xxx → xxx
    if (rule.startsWith('tag.')) {
      const tag = rule.slice(4).split('.')[0].split('@')[0]
      return $(tag)
    }

    // Default: try as CSS selector
    return $(rule)
  }

  // Parse 阅读APP rule: id.xxx.0@text, tag.a.1@href, class.list.0@tag.li
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private parseReadRule($: any, rule: string): string {
    const parts = rule.split('@')
    const lastPart = parts[parts.length - 1]

    // Check if last part is an attribute (not a selector)
    const isAttr = lastPart === 'text' || lastPart === 'textNodes' || lastPart === 'html' ||
                   lastPart === 'href' || lastPart === 'src' || lastPart === 'content' ||
                   lastPart === 'alt' || lastPart === 'name' || lastPart === 'value'

    const selectorParts = isAttr ? parts.slice(0, -1) : parts
    const attr = isAttr ? lastPart : 'text'

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let current: any = $.root()

    for (let i = 0; i < selectorParts.length; i++) {
      const part = selectorParts[i]
      if (!part) continue

      // Split part into type prefix and index
      // e.g., "tag.p.1" → typePrefix="tag.p", index=1
      // e.g., "class.itemtxt" → typePrefix="class.itemtxt", index=null
      const indexMatch = part.match(/\.\d+$/)
      const matchIndex = indexMatch?.index ?? 0
      const index = indexMatch ? parseInt(part.slice(matchIndex + 1), 10) : null
      const typePart = indexMatch ? part.slice(0, matchIndex) : part

      // Handle type prefix and find elements
      if (typePart.startsWith('id.')) {
        const id = typePart.slice(3)
        current = $(`#${id}`)
      } else if (typePart.startsWith('class.')) {
        const cls = typePart.slice(6)
        current = current.find(`.${cls}`)
      } else if (typePart.startsWith('tag.')) {
        const tag = typePart.slice(4)
        current = current.find(tag)
      } else if (typePart) {
        // Plain selector
        current = current.find(typePart)
      }

      // Apply index if present - select from the found elements list
      if (index !== null && current.length > index) {
        current = current.eq(index)
      }
    }

    // Get attribute/text
    if (attr === 'text' || attr === 'textNodes') {
      return current.text().trim()
    }
    if (attr === 'html') {
      return current.html() || ''
    }
    return current.attr(attr) || ''
  }

  // Simplified XPath parsing
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private parseXPath($: any, xpath: string): string {
    // //meta[@property='og:title']/@content → meta[property='og:title'] attr content
    // //div[@class='content']/p → div.content p

    let cssSelector = xpath
      .replace(/^\/\//, '')  // Remove leading //
      .replace(/\[@(\w+)='([^']+)'\]/g, '[$1="$2"]')  // Keep attribute selectors
      .replace(/\[@(\w+)\]/g, '[$1]')  // Keep simple attributes
      .replace(/\/@(\w+)$/, '')  // Extract trailing attribute
      .replace(/\//g, ' > ')  // Convert path to CSS

    const attrMatch = xpath.match(/\/@(\w+)$/)
    const attr = attrMatch ? attrMatch[1] : 'text'

    const elements = $(cssSelector)
    if (elements.length > 0) {
      return attr === 'text' ? elements.text() : elements.attr(attr) || ''
    }
    return ''
  }

  // Build absolute URL
  private buildUrl(url: string): string {
    if (!url) return ''
    if (url.startsWith('http')) return url
    if (url.startsWith('/')) return this.baseUrl + url
    return this.baseUrl + '/' + url
  }

  // Extract search URL from config (handle JS code wrapper)
  private getSearchUrl(query: string): string | null {
    let searchUrl = this.config.searchUrl || ''
    if (!searchUrl) return null

    // Remove JS wrapper: <js>...;</js>/search/{{key}}/1.html
    const jsMatch = searchUrl.match(/<\/js>(.+)$/)
    if (jsMatch) {
      searchUrl = jsMatch[1]
    }

    // Replace placeholders
    searchUrl = searchUrl.replace(/{{key}}/g, encodeURIComponent(query))
    searchUrl = searchUrl.replace(/{key}/g, encodeURIComponent(query))
    searchUrl = searchUrl.replace(/{{page}}/g, '1')
    searchUrl = searchUrl.replace(/{page}/g, '1')

    // Build full URL
    return this.buildUrl(searchUrl)
  }

  async parseSearch(query: string): Promise<SearchResult[]> {
    const searchUrl = this.getSearchUrl(query)
    if (!searchUrl) return []

    // Apply concurrent rate delay
    const rate = this.config.concurrentRate
    if (rate) {
      const delayMs = parseInt(rate, 10)
      if (delayMs > 0) {
        await delay(delayMs)
      }
    }

    try {
      const response = await retry(
        () => this.httpClient.get(searchUrl!),
        2,
        1000
      )

      const html = response.data as string
      const config = this.config

      // Check for Cloudflare/人机验证
      if (html.includes('Just a moment...') || html.includes('人机验证')) {
        console.warn(`Source ${config.bookSourceName} requires CAPTCHA verification`)
        return []
      }

      // Get parse rules
      const listRule = config.ruleSearch?.bookList || config.searchList || ''
      const nameRule = config.ruleSearch?.name || config.searchName || ''
      const authorRule = config.ruleSearch?.author || config.searchAuthor || ''
      const coverRule = config.ruleSearch?.coverUrl || config.searchCover || ''
      const bookUrlRule = config.ruleSearch?.bookUrl || config.searchBookUrl || ''

      if (!listRule) return []

      const $ = cheerio.load(html)

      // Parse list - 阅读APP格式
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let listElements: any

      // Direct selector: class.item → .item (no @ separator)
      if (listRule.startsWith('class.') && !listRule.includes('@')) {
        const cls = listRule.slice(6)
        listElements = $(`.${cls}`)
      } else if (listRule.startsWith('id.') && !listRule.includes('@')) {
        const id = listRule.slice(3)
        listElements = $(`#${id}`)
      } else if (listRule.startsWith('class.')) {
        // Chained: class.container@class.item → find .item inside .container
        const parts = listRule.split('@')
        const containerCls = parts[0].slice(6)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let container: any = $(`.${containerCls}`)
        for (let i = 1; i < parts.length; i++) {
          container = this.selectElements(container, parts[i])
        }
        listElements = container
      } else if (listRule.startsWith('id.')) {
        const parts = listRule.split('@')
        const containerId = parts[0].slice(3)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let container: any = $(`#${containerId}`)
        for (let i = 1; i < parts.length; i++) {
          container = this.selectElements(container, parts[i])
        }
        listElements = container
      } else {
        listElements = this.selectElements($, listRule)
      }

      const results: SearchResult[] = []

      listElements.each((_: number, el: any) => {
        const itemEl = $(el)

        // Parse each field using the item element directly (not re-loading HTML)
        // This allows rules like "class.item@tag.img@src" to work properly
        const title = this.parseRuleValueFromElement($, itemEl, nameRule) as string
        const author = this.parseRuleValueFromElement($, itemEl, authorRule) as string
        const cover = this.parseRuleValueFromElement($, itemEl, coverRule) as string
        const bookUrl = this.parseRuleValueFromElement($, itemEl, bookUrlRule) as string

        if (title && bookUrl) {
          results.push({
            title: title.trim(),
            author: author.trim(),
            cover: this.buildUrl(cover),
            bookUrl: this.buildUrl(bookUrl),
            sourceName: config.bookSourceName,
          })
        }
      })

      return results
    } catch (error) {
      console.error(`Search error for ${this.config.bookSourceName}:`, error)
      return []
    }
  }

  async parseBookInfo(bookUrl: string): Promise<{
    title: string
    author: string
    description: string
    cover: string
    chapters: Array<{ title: string; url: string }>
  }> {
    const config = this.config

    // Book info URL
    let infoUrl = config.ruleBookInfo?.init || config.bookInfoInit || bookUrl
    infoUrl = infoUrl.replace(/{{bookUrl}}/g, bookUrl).replace(/{bookUrl}/g, bookUrl)

    // Handle JS wrapper in init rule
    if (infoUrl.includes('<js>')) {
      const urlMatch = infoUrl.match(/<\/js>(.+)$/)
      if (urlMatch) {
        infoUrl = urlMatch[1]
      }
    }

    const fullUrl = this.buildUrl(infoUrl.startsWith('/') ? infoUrl : bookUrl)

    try {
      const response = await retry(
        () => this.httpClient.get(fullUrl),
        2,
        1000
      )

      const html = response.data as string
      const $ = cheerio.load(html)

      // Check for CAPTCHA
      if (html.includes('Just a moment...')) {
        return { title: '', author: '', description: '', cover: '', chapters: [] }
      }

      const nameRule = config.ruleBookInfo?.name || config.bookName || ''
      const authorRule = config.ruleBookInfo?.author || config.bookAuthor || ''
      const introRule = config.ruleBookInfo?.intro || config.bookIntro || ''
      const coverRule = config.ruleBookInfo?.coverUrl || config.bookCoverUrl || ''
      const chapterListRule = config.ruleToc?.chapterList || config.chapterList || ''
      const chapterNameRule = config.ruleToc?.chapterName || config.chapterName || ''
      const chapterUrlRule = config.ruleToc?.chapterUrl || config.chapterUrl || ''

      const title = this.parseRuleValue(html, nameRule) as string
      const author = this.parseRuleValue(html, authorRule) as string
      const description = this.parseRuleValue(html, introRule) as string
      const cover = this.buildUrl(this.parseRuleValue(html, coverRule) as string)

      // Parse chapters
      const chapters: Array<{ title: string; url: string }> = []

      if (chapterListRule) {
        const chapterElements = this.selectElements($, chapterListRule)
        chapterElements.each((_: number, el: any) => {
          const chapterHtml = $(el).html() || ''
          const name = this.parseRuleValue(chapterHtml, chapterNameRule) as string
          const url = this.parseRuleValue(chapterHtml, chapterUrlRule) as string
          if (name && url) {
            chapters.push({
              title: name.trim(),
              url: this.buildUrl(url),
            })
          }
        })
      }

      return {
        title: title.trim(),
        author: author.trim(),
        description: description.trim(),
        cover,
        chapters,
      }
    } catch {
      return { title: '', author: '', description: '', cover: '', chapters: [] }
    }
  }

  async parseChapterContent(chapterUrl: string): Promise<string> {
    const config = this.config

    const fullUrl = this.buildUrl(chapterUrl)

    try {
      const response = await retry(
        () => this.httpClient.get(fullUrl),
        2,
        1000
      )

      const html = response.data as string

      // Check for CAPTCHA
      if (html.includes('Just a moment...')) {
        return '内容加载失败：需要人机验证'
      }

      const contentRule = config.ruleContent?.content || config.bookContent || ''
      const replaceRegex = config.ruleContent?.replaceRegex || ''

      let content = this.parseRuleValue(html, contentRule) as string

      // Apply replace regex
      if (replaceRegex) {
        try {
          // Format: ##pattern1##pattern2
          const patterns = replaceRegex.split('##').filter(p => p)
          for (const pattern of patterns) {
            content = content.replace(new RegExp(pattern, 'g'), '')
          }
        } catch {
          // Ignore regex errors
        }
      }

      return cleanContent(content, undefined)
    } catch {
      return ''
    }
  }
}