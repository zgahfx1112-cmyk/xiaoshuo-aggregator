import { getRedisClient, cacheGet, cacheSet, cacheDel, CacheKeys, CacheTTL } from '@/lib/redis'

// Mock @upstash/redis before importing the module
jest.mock('@upstash/redis', () => ({
  Redis: jest.fn().mockImplementation(() => ({
    get: jest.fn().mockResolvedValue('cached-value'),
    set: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
  })),
}))

describe('Redis Client', () => {
  beforeEach(() => {
    // Reset the module cache to get fresh instances
    jest.resetModules()
  })

  it('should create Redis client with environment variables', () => {
    const client = getRedisClient()
    expect(client).toBeDefined()
  })

  it('should get cached value', async () => {
    const value = await cacheGet('test-key')
    expect(value).toBe('cached-value')
  })

  it('should set cached value with TTL', async () => {
    const result = await cacheSet('test-key', 'test-value', 3600)
    expect(result).toBe('OK')
  })

  it('should delete cached value', async () => {
    const result = await cacheDel('test-key')
    expect(result).toBe(1)
  })

  describe('CacheKeys', () => {
    it('should generate novel detail key', () => {
      expect(CacheKeys.novelDetail('123')).toBe('novel:123:detail')
    })

    it('should generate novel chapters key with page', () => {
      expect(CacheKeys.novelChapters('123', 1)).toBe('novel:123:chapters:1')
    })

    it('should generate chapter content key', () => {
      expect(CacheKeys.chapterContent('novel-1', 10)).toBe('chapter:novel-1:10:content')
    })

    it('should generate search results key', () => {
      expect(CacheKeys.searchResults('fantasy')).toBe('search:fantasy:results')
    })

    it('should generate hot novels key', () => {
      expect(CacheKeys.hotNovels('action', 'daily')).toBe('hot_novels:action:daily')
    })

    it('should generate recommend key', () => {
      expect(CacheKeys.recommend('session-123')).toBe('recommend:session-123')
    })
  })

  describe('CacheTTL', () => {
    it('should have SHORT TTL of 15 minutes', () => {
      expect(CacheTTL.SHORT).toBe(15 * 60) // 900 seconds
    })

    it('should have MEDIUM TTL of 1 hour', () => {
      expect(CacheTTL.MEDIUM).toBe(60 * 60) // 3600 seconds
    })

    it('should have LONG TTL of 24 hours', () => {
      expect(CacheTTL.LONG).toBe(24 * 60 * 60) // 86400 seconds
    })

    it('should have WEEK TTL of 7 days', () => {
      expect(CacheTTL.WEEK).toBe(7 * 24 * 60 * 60) // 604800 seconds
    })
  })
})