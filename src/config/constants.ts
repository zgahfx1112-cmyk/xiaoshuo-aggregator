// Categories
export const CATEGORIES = [
  '玄幻',
  '奇幻',
  '武侠',
  '仙侠',
  '都市',
  '现实',
  '军事',
  '历史',
  '游戏',
  '科幻',
  '灵异',
  '言情',
  '青春',
  '悬疑',
] as const

// Novel Status
export const NOVEL_STATUS = {
  ONGOING: '连载',
  COMPLETED: '完结',
} as const

// Source Types
export const SOURCE_TYPES = {
  BUILTIN: 'builtin',
  USER: 'user',
} as const

// Source Status
export const SOURCE_STATUS = {
  AVAILABLE: 'available',
  SLOW: 'slow',
  UNAVAILABLE: 'unavailable',
  CONTENT_ERROR: 'content_error',
} as const

// Default User Agents
export const DEFAULT_USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
]

// Default Anti-Crawl Config
export const DEFAULT_ANTICRAWL = {
  delay: 1000, // 1 second
  userAgents: DEFAULT_USER_AGENTS,
}

// Pagination
export const DEFAULT_PAGE_SIZE = 20
export const MAX_PAGE_SIZE = 100

// Cache TTL (seconds)
export const CACHE_TTL = {
  SEARCH: 15 * 60, // 15 minutes
  HOT: 60 * 60, // 1 hour
  DETAIL: 24 * 60 * 60, // 24 hours
  CHAPTERS: 6 * 60 * 60, // 6 hours
  CONTENT: 7 * 24 * 60 * 60, // 7 days
  RECOMMEND: 60 * 60, // 1 hour
}

// Rate Limiting
export const RATE_LIMIT = {
  MAX_REQUESTS: 10, // per minute
  WINDOW_MS: 60 * 1000, // 1 minute
}