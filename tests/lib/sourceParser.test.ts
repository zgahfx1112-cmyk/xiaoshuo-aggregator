import { SourceParser } from '@/lib/sourceParser'
import { BookSourceConfig } from '@/lib/types'
import axios from 'axios'

// Mock axios
jest.mock('axios')

// Mock book source config
const mockSourceConfig: BookSourceConfig = {
  name: 'TestSource',
  url: 'https://api.test.com',
  version: 1,
  search: {
    url: 'https://api.test.com/search?keyword={query}',
    method: 'GET',
    parseRules: {
      list: '$.data.books',
      title: 'title',
      author: 'author',
      cover: 'coverUrl',
      bookUrl: 'detailUrl',
    },
  },
  bookInfo: {
    url: 'https://api.test.com/book/{id}',
    parseRules: {
      title: '$.data.title',
      author: '$.data.author',
      description: '$.data.intro',
      chapters: {
        list: '$.data.chapters',
        title: 'name',
        url: 'url',
      },
    },
  },
  chapterContent: {
    url: 'https://api.test.com/chapter/{url}',
    parseRules: {
      content: '$.data.content',
      filters: ['广告过滤正则'],
    },
  },
}

// Mock HTTP response
const mockSearchResponse = {
  data: {
    books: [
      {
        title: '斗破苍穹',
        author: '天蚕土豆',
        coverUrl: 'https://img.test.com/cover.jpg',
        detailUrl: '/book/123',
      },
    ],
  },
}

describe('SourceParser', () => {
  let parser: SourceParser

  beforeEach(() => {
    jest.clearAllMocks()
    parser = new SourceParser(mockSourceConfig)
  })

  describe('parseSearch', () => {
    it('should parse search results from JSON response', async () => {
      const mockGet = jest.fn().mockResolvedValue({ data: mockSearchResponse })
      ;(axios.create as jest.Mock).mockReturnValue({ get: mockGet, defaults: { headers: { common: {} } } })

      parser = new SourceParser(mockSourceConfig)
      const results = await parser.parseSearch('斗破苍穹')

      expect(results).toHaveLength(1)
      expect(results[0].title).toBe('斗破苍穹')
      expect(results[0].author).toBe('天蚕土豆')
      expect(results[0].sourceName).toBe('TestSource')
    })

    it('should handle empty search results', async () => {
      const mockGet = jest.fn().mockResolvedValue({ data: { data: { books: [] } } })
      ;(axios.create as jest.Mock).mockReturnValue({ get: mockGet, defaults: { headers: { common: {} } } })

      parser = new SourceParser(mockSourceConfig)
      const results = await parser.parseSearch('nonexistent')

      expect(results).toHaveLength(0)
    })

    it('should throw error on HTTP failure', async () => {
      const mockGet = jest.fn().mockRejectedValue(new Error('Network error'))
      ;(axios.create as jest.Mock).mockReturnValue({ get: mockGet, defaults: { headers: { common: {} } } })

      parser = new SourceParser(mockSourceConfig)

      await expect(parser.parseSearch('test')).rejects.toThrow('Network error')
    })
  })

  describe('parseJSONPath', () => {
    it('should extract value using JSONPath', () => {
      const data = { data: { title: 'Test Book' } }
      const result = parser.parseJSONPath(data, '$.data.title')
      expect(result).toBe('Test Book')
    })

    it('should extract array using JSONPath', () => {
      const data = { data: { books: [{ title: 'Book1' }, { title: 'Book2' }] } }
      const result = parser.parseJSONPath(data, '$.data.books')
      expect(result).toHaveLength(2)
    })

    it('should extract simple field without JSONPath', () => {
      const data = { title: 'Simple Title' }
      const result = parser.parseJSONPath(data, 'title')
      expect(result).toBe('Simple Title')
    })

    it('should return empty array for invalid path', () => {
      const data = { title: 'Test' }
      const result = parser.parseJSONPath(data, '$.nonexistent.path')
      expect(result).toEqual([])
    })
  })

  describe('parseBookInfo', () => {
    it('should parse book info from detail URL', async () => {
      const mockBookResponse = {
        data: {
          title: '斗破苍穹',
          author: '天蚕土豆',
          intro: '这是一个测试简介',
          chapters: [
            { name: '第一章', url: '/chapter/1' },
            { name: '第二章', url: '/chapter/2' },
          ],
        },
      }
      const mockGet = jest.fn().mockResolvedValue({ data: mockBookResponse })
      ;(axios.create as jest.Mock).mockReturnValue({ get: mockGet, defaults: { headers: { common: {} } } })

      parser = new SourceParser(mockSourceConfig)
      const result = await parser.parseBookInfo('/book/123')

      expect(result.title).toBe('斗破苍穹')
      expect(result.author).toBe('天蚕土豆')
      expect(result.description).toBe('这是一个测试简介')
      expect(result.chapters).toHaveLength(2)
      expect(result.chapters[0].title).toBe('第一章')
    })
  })

  describe('parseChapterContent', () => {
    it('should parse chapter content and apply filters', async () => {
      const mockChapterResponse = {
        data: {
          content: '这是章节内容\n\n\n广告过滤正则\n\n正文继续',
        },
      }
      const mockGet = jest.fn().mockResolvedValue({ data: mockChapterResponse })
      ;(axios.create as jest.Mock).mockReturnValue({ get: mockGet, defaults: { headers: { common: {} } } })

      parser = new SourceParser(mockSourceConfig)
      const result = await parser.parseChapterContent('/chapter/1')

      expect(result).toContain('这是章节内容')
      expect(result).not.toContain('广告过滤正则')
    })
  })
})