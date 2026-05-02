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
  // 变量存储表（用于 @put/@get）
  private variables: Record<string, string> = {}

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
    // - [property$=book_name]@content → CSS attribute selector

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
    // CSS attribute selector: [property$=xxx], [property="xxx"], [class~="xxx"]
    else if (cleanRule.startsWith('[property') || cleanRule.startsWith('[class') || cleanRule.startsWith('[id')) {
      // 分离选择器和属性
      const attrMatch = cleanRule.match(/@(\w+)$/)
      const attr = attrMatch ? attrMatch[1] : 'content'
      const sel = attrMatch ? cleanRule.slice(0, -attrMatch[0].length) : cleanRule

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

    // 分离选择器和正则替换规则
    // 格式: selector##pattern##replace### 或 selector##pattern（删除）
    const replaceParts = cleanRule.split('###')
    const mainRule = replaceParts[0]

    // 提取选择器部分（不含 ## 后的替换）
    const selectorPart = mainRule.split('##')[0]

    // Handle rules starting from the element itself
    const parts = selectorPart.split('@')
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

      // Extract index from part: "p.1" → selectorPart="p", index=1
      const indexMatch = part.match(/\.(\d+)$/)
      let selectorPart = indexMatch ? part.slice(0, -indexMatch[0].length) : part
      const index = indexMatch ? parseInt(indexMatch[1], 10) : null

      // Skip first part if it's the same as the element's class (e.g., class.item inside .item element)
      // This handles rules like "class.item@tag.img@src" when parsing from .item element
      if (i === 0 && selectorPart.startsWith('class.')) {
        const cls = selectorPart.slice(6)
        // Check if current element has this class
        if (current.hasClass && current.hasClass(cls)) {
          // Skip this selector, stay at current element
          continue
        }
        current = current.find(`.${cls}`)
      } else if (selectorPart.startsWith('class.')) {
        const cls = selectorPart.slice(6)
        current = current.find(`.${cls}`)
      } else if (selectorPart.startsWith('tag.')) {
        const tag = selectorPart.slice(4)
        current = current.find(tag)
      } else if (selectorPart.startsWith('id.')) {
        const id = selectorPart.slice(3)
        current = current.find(`#${id}`)
      } else if (selectorPart.startsWith('.')) {
        current = current.find(selectorPart)
      } else if (/^[a-zA-Z]+$/.test(selectorPart)) {
        current = current.find(selectorPart)
      }

      // Apply index: select nth element from found list
      if (index !== null && current.length > index) {
        current = current.eq(index)
      }
    }

    // Get attribute/text
    let result = ''
    if (attr === 'text' || attr === 'textNodes') {
      result = current.text().trim()
    } else if (attr === 'html') {
      result = current.html() || ''
    } else {
      result = current.attr(attr) || ''
    }

    // 应用正则替换规则
    result = this.applyRegexReplace(result, rule)

    return result
  }

  // 应用正则替换规则
  // 格式: selector##pattern##replace### 或 ##pattern1##pattern2（删除）
  private applyRegexReplace(value: string, rule: string): string {
    if (!rule.includes('##')) return value

    // 分离所有 ### 部分
    const sections = rule.split('###')

    for (const section of sections) {
      const segments = section.split('##').filter(s => s)

      if (segments.length < 2) {
        // 只有选择器，无替换
        continue
      } else if (segments.length === 2) {
        // ##pattern → 删除匹配内容
        const pattern = segments[1]
        try {
          value = value.replace(new RegExp(pattern, 'g'), '')
        } catch {
          // 正则错误，忽略
        }
      } else if (segments.length >= 3) {
        // selector##pattern##replace
        const pattern = segments[1]
        const replace = segments[2]
        try {
          // 支持替换中的 $1, $2 等捕获组
          value = value.replace(new RegExp(pattern, 'g'), replace)
        } catch {
          // 正则错误，忽略
        }
      }
    }

    return value
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
      const index = indexMatch ? parseInt(indexMatch[0].slice(1), 10) : null
      const typePart = indexMatch ? part.slice(0, -indexMatch[0].length) : part

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

  // Parse @put:{n:"rule",a:"rule"} 中的键值对
  private parsePutPairs(content: string): Array<[string, string]> {
    const pairs: Array<[string, string]> = []
    // 格式：n:"[property$=book_name]@content",a:"rule",k:"rule",l:"rule",i:"rule",c:"rule"
    // 使用正则提取 key:"value" 对，支持转义引号
    const regex = /([a-zA-Z]):"((?:[^"\\]|\\.)*)"/g
    let match
    while ((match = regex.exec(content)) !== null) {
      // 处理转义字符
      const value = match[2].replace(/\\(.)/g, '$1')
      pairs.push([match[1], value])
    }
    return pairs
  }

  // 解析 @get:{n} 中的键名
  private parseGetKey(rule: string): string {
    const match = rule.match(/@get:\{([a-zA-Z])\}/)
    return match ? match[1] : ''
  }

  // 执行 @put 规则，存储变量
  private executePutRules(html: string, putRule: string): void {
    const putContent = putRule.match(/@put:\{(.+)\}/)?.[1]
    if (!putContent) return

    const pairs = this.parsePutPairs(putContent)
    for (const [key, rule] of pairs) {
      const value = this.parseRuleValue(html, rule) as string
      this.variables[key] = value.trim()
    }
  }

  // 获取变量值或执行规则
  private getValueOrVariable(html: string, rule: string): string {
    if (!rule) return ''

    // 检查是否是 @get 规则
    if (rule.startsWith('@get:')) {
      const key = this.parseGetKey(rule)
      return this.variables[key] || ''
    }

    // 执行普通规则
    return this.parseRuleValue(html, rule) as string
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

    // Replace placeholders - use encodeURIComponent for proper URL encoding
    const encodedQuery = encodeURIComponent(query)

    searchUrl = searchUrl.replace(/{{key}}/g, encodedQuery)
    searchUrl = searchUrl.replace(/{key}/g, encodedQuery)
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

      const responseData = response.data
      const config = this.config

      // Check for Cloudflare/人机验证 in HTML response
      if (typeof responseData === 'string') {
        if (responseData.includes('Just a moment...') || responseData.includes('人机验证')) {
          console.warn(`Source ${config.bookSourceName} requires CAPTCHA verification`)
          return []
        }
      }

      // Get parse rules
      const listRule = config.ruleSearch?.bookList || config.searchList || ''
      const nameRule = config.ruleSearch?.name || config.searchName || ''
      const authorRule = config.ruleSearch?.author || config.searchAuthor || ''
      const coverRule = config.ruleSearch?.coverUrl || config.searchCover || ''
      const bookUrlRule = config.ruleSearch?.bookUrl || config.searchBookUrl || ''

      if (!listRule) return []

      // Handle JSON API responses (sources like 69书吧 return JSON with bookList: "data")
      if (typeof responseData === 'object' && responseData !== null) {
        const jsonData = responseData as Record<string, unknown>

        // Get list from JSONPath or field name
        let listData: unknown[] = []
        if (listRule.startsWith('$')) {
          const listResult = JSONPath({ path: listRule, json: jsonData })
          listData = Array.isArray(listResult) ? listResult : [listResult]
        } else {
          const listField = (jsonData as Record<string, unknown>)[listRule]
          listData = Array.isArray(listField) ? listField : [listField]
        }

        const results: SearchResult[] = []
        for (const item of listData) {
          if (typeof item !== 'object' || item === null) continue

          const itemObj = item as Record<string, unknown>

          // Parse each field from JSON
          let title: string
          let author: string
          let cover: string
          let bookUrl: string

          if (nameRule.startsWith('$')) {
            const nameResult = JSONPath({ path: nameRule, json: itemObj })
            title = String(nameResult[0] || '')
          } else {
            title = String(itemObj[nameRule] || '')
          }

          if (authorRule.startsWith('$')) {
            const authorResult = JSONPath({ path: authorRule, json: itemObj })
            author = String(authorResult[0] || '')
          } else {
            author = String(itemObj[authorRule] || '')
          }

          if (coverRule.startsWith('$')) {
            const coverResult = JSONPath({ path: coverRule, json: itemObj })
            cover = String(coverResult[0] || '')
          } else {
            cover = String(itemObj[coverRule] || '')
          }

          if (bookUrlRule.startsWith('$')) {
            const urlResult = JSONPath({ path: bookUrlRule, json: itemObj })
            bookUrl = String(urlResult[0] || '')
          } else {
            bookUrl = String(itemObj[bookUrlRule] || '')
          }

          if (title && bookUrl) {
            results.push({
              title: title.trim(),
              author: author.trim(),
              cover: this.buildUrl(cover),
              bookUrl: this.buildUrl(bookUrl),
              sourceName: config.bookSourceName,
              sourceId: this.config.bookSourceUrl,
            })
          }
        }
        return results
      }

      // Handle HTML response
      const html = responseData as string
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
            sourceId: this.config.bookSourceUrl,
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

    // 清空变量表
    this.variables = {}

    // Book info URL - 先检查 init 是否是 @put 规则
    const initRule = config.ruleBookInfo?.init || config.bookInfoInit || ''

    // 如果 init 是 @put 规则，需要先获取 HTML 执行
    let infoUrl = bookUrl
    let isPutRule = initRule.startsWith('@put:')

    if (!isPutRule) {
      infoUrl = initRule || bookUrl
      infoUrl = infoUrl.replace(/{{bookUrl}}/g, bookUrl).replace(/{bookUrl}/g, bookUrl)

      // Handle JS wrapper in init rule
      if (infoUrl.includes('<js>')) {
        const urlMatch = infoUrl.match(/<\/js>(.+)$/)
        if (urlMatch) {
          infoUrl = urlMatch[1]
        }
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

      // 执行 @put 规则（如果 init 是 @put）
      if (isPutRule) {
        this.executePutRules(html, initRule)
      }

      const nameRule = config.ruleBookInfo?.name || config.bookName || ''
      const authorRule = config.ruleBookInfo?.author || config.bookAuthor || ''
      const introRule = config.ruleBookInfo?.intro || config.bookIntro || ''
      const coverRule = config.ruleBookInfo?.coverUrl || config.bookCoverUrl || ''
      const chapterListRule = config.ruleToc?.chapterList || config.chapterList || ''
      const chapterNameRule = config.ruleToc?.chapterName || config.chapterName || ''
      const chapterUrlRule = config.ruleToc?.chapterUrl || config.chapterUrl || ''

      // 使用 getValueOrVariable 支持 @get 规则
      const title = this.getValueOrVariable(html, nameRule) as string
      const author = this.getValueOrVariable(html, authorRule) as string
      const description = this.getValueOrVariable(html, introRule) as string
      const cover = this.buildUrl(this.getValueOrVariable(html, coverRule) as string)

      // Parse chapters
      const chapters: Array<{ title: string; url: string }> = []

      if (chapterListRule) {
        const chapterElements = this.selectElements($, chapterListRule)
        chapterElements.each((_: number, el: any) => {
          const chapterEl = $(el)
          const name = this.parseRuleValueFromElement($, chapterEl, chapterNameRule) as string
          const url = this.parseRuleValueFromElement($, chapterEl, chapterUrlRule) as string
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