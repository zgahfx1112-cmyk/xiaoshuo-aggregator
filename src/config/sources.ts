import { BookSourceConfig } from '@/lib/types'
import { DEFAULT_ANTICRAWL } from './constants'

// Builtin book sources
export const BUILTIN_SOURCES: BookSourceConfig[] = [
  // Example source template (will add real sources later)
  {
    name: '起点中文网',
    url: 'https://www.qidian.com',
    version: 1,
    search: {
      url: 'https://www.qidian.com/search',
      method: 'GET',
      params: {
        kw: '{query}',
      },
      parseRules: {
        list: '$.data.searchBooks',
        title: 'bookName',
        author: 'authorName',
        cover: 'bookImg',
        bookUrl: 'bookId',
      },
    },
    bookInfo: {
      url: 'https://www.qidian.com/book/{id}',
      parseRules: {
        title: '$.data.bookName',
        author: '$.data.authorName',
        description: '$.data.bookDesc',
        chapters: {
          list: '$.data.chapterList',
          title: 'chapterName',
          url: 'chapterId',
        },
      },
    },
    chapterContent: {
      url: 'https://www.qidian.com/chapter/{id}',
      parseRules: {
        content: '$.data.chapterContent',
        filters: ['起点中文网提供.*?阅读'],
      },
    },
    antiCrawl: DEFAULT_ANTICRAWL,
  },
  // Placeholder for additional sources
  // Will add 纵横、晋江、番茄等 in production
]

// Get all builtin source names
export function getBuiltinSourceNames(): string[] {
  return BUILTIN_SOURCES.map(s => s.name)
}

// Get builtin source by name
export function getBuiltinSource(name: string): BookSourceConfig | undefined {
  return BUILTIN_SOURCES.find(s => s.name === name)
}

// Validate book source config
export function validateSourceConfig(config: unknown): boolean {
  if (!config || typeof config !== 'object') return false

  const source = config as Record<string, unknown>

  // Required fields
  const required = ['name', 'url', 'version', 'search', 'bookInfo', 'chapterContent']
  for (const field of required) {
    if (!source[field]) return false
  }

  // Validate parseRules structure
  const search = source.search as Record<string, unknown>
  if (!search?.parseRules) return false

  const bookInfo = source.bookInfo as Record<string, unknown>
  if (!bookInfo?.parseRules) return false

  const chapterContent = source.chapterContent as Record<string, unknown>
  if (!chapterContent?.parseRules) return false

  return true
}