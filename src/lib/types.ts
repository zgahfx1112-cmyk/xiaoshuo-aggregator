// Book Source Types
export interface BookSourceConfig {
  name: string
  url: string
  version: number
  search: SearchConfig
  bookInfo: BookInfoConfig
  chapterContent: ChapterContentConfig
  antiCrawl?: AntiCrawlConfig
}

export interface SearchConfig {
  url: string
  method: 'GET' | 'POST'
  params?: Record<string, string>
  parseRules: ParseRules
}

export interface BookInfoConfig {
  url: string
  parseRules: BookInfoParseRules
}

export interface ChapterContentConfig {
  url: string
  parseRules: ContentParseRules
}

export interface ParseRules {
  list: string // JSONPath or XPath
  title: string
  author: string
  cover: string
  bookUrl: string
}

export interface BookInfoParseRules {
  title: string
  author: string
  description: string
  chapters?: ChapterParseRules
}

export interface ChapterParseRules {
  list: string
  title: string
  url: string
}

export interface ContentParseRules {
  content: string
  filters?: string[]
}

export interface AntiCrawlConfig {
  userAgents?: string[]
  delay?: number
  cookies?: Record<string, string>
}

// Novel Types
export interface Novel {
  id: string
  title: string
  author: string
  cover: string
  description: string
  tags: string[]
  category: string
  status: '连载' | '完结'
  wordCount: number
  rating: number
  sources: NovelSource[]
}

export interface NovelSource {
  sourceName: string
  sourceUrl: string
  available: boolean
}

export interface Chapter {
  chapterNum: number
  title: string
  sourceUrls: SourceUrl[]
}

export interface SourceUrl {
  source: string
  url: string
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

// Search Result Type
export interface SearchResult {
  title: string
  author: string
  cover: string
  bookUrl: string
  sourceName: string
}

// Source Validation Types
export type SourceStatus = 'available' | 'slow' | 'unavailable' | 'content_error'

export interface SourceValidationResult {
  sourceName: string
  status: SourceStatus
  responseTime?: number
  error?: string
  lastChecked: Date
}