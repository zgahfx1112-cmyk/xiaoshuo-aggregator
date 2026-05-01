import { prisma } from '@/lib/prisma'

interface RawBookSourceConfig {
  bookSourceName: string
  bookSourceUrl: string
  bookSourceVersion?: number
  searchUrl?: string
  ruleSearchUrl?: string
  searchList?: string
  ruleSearchList?: string
  searchName?: string
  ruleSearchName?: string
  searchAuthor?: string
  ruleSearchAuthor?: string
  searchCover?: string
  ruleSearchCover?: string
  searchIntro?: string
  ruleSearchIntro?: string
  searchKind?: string
  ruleSearchKind?: string
  searchLastChapter?: string
  ruleSearchLastChapter?: string
  searchBookUrl?: string
  ruleSearchBookUrl?: string
  bookInfoInit?: string
  ruleBookInfoInit?: string
  bookName?: string
  ruleBookName?: string
  bookAuthor?: string
  ruleBookAuthor?: string
  bookCoverUrl?: string
  ruleBookCoverUrl?: string
  bookIntro?: string
  ruleBookIntro?: string
  bookKind?: string
  ruleBookKind?: string
  bookLastChapter?: string
  ruleBookLastChapter?: string
  bookWordCount?: string
  ruleBookWordCount?: string
  bookStatus?: string
  ruleBookStatus?: string
  tocUrl?: string
  ruleTocUrl?: string
  chapterList?: string
  ruleChapterList?: string
  chapterName?: string
  ruleChapterName?: string
  chapterUrl?: string
  ruleChapterUrl?: string
  contentUrl?: string
  ruleContentUrl?: string
  bookContent?: string
  ruleBookContent?: string
  enabled?: boolean
  weight?: number
}

/**
 * 从 yckceo.com/yuedu/shuyuan 抓取书源
 * 该网站提供了大量阅读APP书源JSON配置
 */
export async function fetchYckceoSources(): Promise<RawBookSourceConfig[]> {
  try {
    // 获取书源列表页面
    const response = await fetch('https://www.yckceo.com/yuedu/shuyuan', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status}`)
    }

    const html = await response.text()

    // 解析HTML，提取书源JSON链接
    // 书源通常以JSON文件形式提供，链接可能包含 .json 扩展名
    const jsonLinks = extractJsonLinks(html)

    // 下载并解析每个书源JSON
    const sources: RawBookSourceConfig[] = []
    for (const link of jsonLinks) {
      try {
        const sourceResponse = await fetch(link, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
        })

        if (sourceResponse.ok) {
          const jsonText = await sourceResponse.text()
          const config = parseSourceJson(jsonText)
          if (config) {
            sources.push(config)
          }
        }
      } catch {
        // Skip failed source
      }
    }

    return sources
  } catch (error) {
    console.error('Failed to fetch yckceo sources:', error)
    return []
  }
}

/**
 * 从HTML中提取JSON链接
 */
function extractJsonLinks(html: string): string[] {
  const links: string[] = []

  // 匹配 href="xxx.json" 或下载链接
  const hrefMatch = html.match(/href=["'](https?:\/\/[^"']+\.json)["']/gi)
  if (hrefMatch) {
    hrefMatch.forEach((match) => {
      const url = match.replace(/href=["']/gi, '').replace(/["']$/gi, '')
      links.push(url)
    })
  }

  // 匹配 data-url 或其他属性
  const dataUrlMatch = html.match(/data-url=["'](https?:\/\/[^"']+\.json)["']/gi)
  if (dataUrlMatch) {
    dataUrlMatch.forEach((match) => {
      const url = match.replace(/data-url=["']/gi, '').replace(/["']$/gi, '')
      links.push(url)
    })
  }

  // 匹配直接的URL文本
  const urlMatch = html.match(/https?:\/\/[^\s<>"']+\.json/gi)
  if (urlMatch) {
    urlMatch.forEach((url) => {
      if (!links.includes(url)) {
        links.push(url)
      }
    })
  }

  return links.filter((link) => link.startsWith('http'))
}

/**
 * 解析书源JSON配置
 * 支持多种格式的书源配置
 */
function parseSourceJson(jsonText: string): RawBookSourceConfig | null {
  try {
    // 尝试解析JSON
    let data = JSON.parse(jsonText)

    // 如果是数组，取第一个
    if (Array.isArray(data)) {
      data = data[0]
    }

    // 验证必要的字段
    if (!data.bookSourceName || !data.bookSourceUrl) {
      return null
    }

    // 直接返回原始配置
    return {
      bookSourceName: data.bookSourceName,
      bookSourceUrl: data.bookSourceUrl,
      bookSourceVersion: data.bookSourceVersion || 1,
      searchUrl: data.searchUrl || data.ruleSearchUrl || '',
      searchList: data.searchList || data.ruleSearchList || '',
      searchName: data.searchName || data.ruleSearchName || '',
      searchAuthor: data.searchAuthor || data.ruleSearchAuthor || '',
      searchCover: data.searchCover || data.ruleSearchCover || '',
      searchIntro: data.searchIntro || data.ruleSearchIntro || '',
      searchKind: data.searchKind || data.ruleSearchKind || '',
      searchLastChapter: data.searchLastChapter || data.ruleSearchLastChapter || '',
      searchBookUrl: data.searchBookUrl || data.ruleSearchBookUrl || '',
      bookInfoInit: data.bookInfoInit || data.ruleBookInfoInit || '',
      bookName: data.bookName || data.ruleBookName || '',
      bookAuthor: data.bookAuthor || data.ruleBookAuthor || '',
      bookCoverUrl: data.bookCoverUrl || data.ruleBookCoverUrl || '',
      bookIntro: data.bookIntro || data.ruleBookIntro || '',
      bookKind: data.bookKind || data.ruleBookKind || '',
      bookLastChapter: data.bookLastChapter || data.ruleBookLastChapter || '',
      bookWordCount: data.bookWordCount || data.ruleBookWordCount || '',
      bookStatus: data.bookStatus || data.ruleBookStatus || '',
      tocUrl: data.tocUrl || data.ruleTocUrl || '',
      chapterList: data.chapterList || data.ruleChapterList || '',
      chapterName: data.chapterName || data.ruleChapterName || '',
      chapterUrl: data.chapterUrl || data.ruleChapterUrl || '',
      contentUrl: data.contentUrl || data.ruleContentUrl || '',
      bookContent: data.bookContent || data.ruleBookContent || '',
      enabled: data.enabled !== false,
      weight: data.weight || 0,
    }
  } catch {
    return null
  }
}

/**
 * 定时抓取并更新书源到数据库
 */
export async function syncYckceoSources() {
  const sources = await fetchYckceoSources()

  const results = {
    total: sources.length,
    added: 0,
    updated: 0,
    failed: 0,
  }

  for (const config of sources) {
    try {
      // 检查是否已存在
      const existing = await prisma.bookSource.findUnique({
        where: { name: config.bookSourceName },
      })

      if (existing) {
        // 更新配置
        await prisma.bookSource.update({
          where: { name: config.bookSourceName },
          data: {
            url: config.bookSourceUrl,
            config: config as object,
            lastUpdated: new Date(),
          },
        })
        results.updated++
      } else {
        // 新增书源
        await prisma.bookSource.create({
          data: {
            name: config.bookSourceName,
            url: config.bookSourceUrl,
            config: config as object,
            type: 'user',
            available: true,
            enabled: config.enabled !== false,
          },
        })
        results.added++
      }
    } catch {
      results.failed++
    }
  }

  return results
}