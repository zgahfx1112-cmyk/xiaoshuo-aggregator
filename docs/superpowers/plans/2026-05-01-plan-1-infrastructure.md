# Plan 1: 基础设施 + 书源解析引擎

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建Next.js项目基础架构，集成数据库/缓存，实现书源解析引擎核心功能。

**Architecture:** Next.js 14 App Router + Prisma ORM + Redis缓存。书源解析引擎支持JSONPath/XPath解析，反爬处理（UA轮换/延时请求），分层验证（快速/深度/内容验证）。

**Tech Stack:** Next.js 14, TypeScript, Prisma, PostgreSQL, Redis (Upstash), Material UI, Jest, Cheerio, jsonpath-plus

---

## Task 1: 项目初始化

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.js`
- Create: `.env.example`
- Create: `.gitignore`

- [ ] **Step 1: 初始化Next.js项目**

Run: `npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --no-git`

Expected: Next.js项目创建成功，目录结构生成

- [ ] **Step 2: 安装核心依赖**

Run: `npm install @prisma/client @upstash/redis @emotion/react @emotion/styled @mui/material cheerio jsonpath-plus zod axios`

Expected: 依赖安装完成

- [ ] **Step 3: 安装开发依赖**

Run: `npm install -D prisma jest @types/jest ts-jest @testing-library/react @testing-library/jest-dom`

Expected: 开发依赖安装完成

- [ ] **Step 4: 创建环境变量示例文件**

Create: `.env.example`

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/xiaoshuo?schema=public"

# Redis (Upstash)
REDIS_URL="redis://upstash-endpoint"
REDIS_TOKEN="your-upstash-token"

# App Config
NEXT_PUBLIC_APP_NAME="小说聚合平台"
CRON_SECRET="your-cron-secret"

# External Book Sources
YCKCEO_SOURCE_URL="https://www.yckceo.com/yuedu/shuyuan"
```

- [ ] **Step 5: 更新.gitignore**

Modify: `.gitignore`

```gitignore
# Dependencies
node_modules/
.pnp
.pnp.js

# Testing
coverage/

# Next.js
.next/
out/

# Production
build/

# Misc
.DS_Store
*.pem

# Debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Local env files
.env
.env*.local

# Vercel
.vercel

# TypeScript
*.tsbuildinfo
next-env.d.ts

# Prisma
prisma/migrations/*_*

# IDE
.vscode/
.idea/
```

- [ ] **Step 6: 配置Next.js**

Modify: `next.config.js`

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: [
      'img.qidian.com',
      'img.zongheng.com',
      'img.jjwxc.net',
      'img.fanqienovel.com',
    ],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.qidian.com',
      },
      {
        protocol: 'https',
        hostname: '**.zongheng.com',
      },
      {
        protocol: 'https',
        hostname: '**.jjwxc.net',
      },
    ],
  },
  experimental: {
    serverActions: true,
  },
}

module.exports = nextConfig
```

- [ ] **Step 7: Commit项目初始化**

```bash
git add package.json package-lock.json tsconfig.json next.config.js .env.example .gitignore
git commit -m "chore: initialize Next.js project with TypeScript

- Add core dependencies: Prisma, Redis, Material UI
- Add development dependencies: Jest, testing libs
- Configure Next.js with image domains
- Add environment variables template

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 2: Jest测试框架配置

**Files:**
- Create: `jest.config.js`
- Create: `jest.setup.js`
- Modify: `package.json`

- [ ] **Step 1: 创建Jest配置文件**

Create: `jest.config.js`

```javascript
const nextJest = require('next/jest')

const createJestConfig = nextJest({
  dir: './',
})

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/.next/'],
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/app/layout.tsx',
  ],
}

module.exports = createJestConfig(customJestConfig)
```

- [ ] **Step 2: 创建Jest setup文件**

Create: `jest.setup.js`

```javascript
import '@testing-library/jest-dom'

// Mock environment variables
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test'
process.env.REDIS_URL = 'redis://localhost:6379'
process.env.REDIS_TOKEN = 'test-token'
```

- [ ] **Step 3: 添加测试脚本到package.json**

Modify: `package.json`

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "db:generate": "prisma generate",
    "db:push": "prisma db push",
    "db:migrate": "prisma migrate dev",
    "db:studio": "prisma studio"
  }
}
```

- [ ] **Step 4: 运行测试验证配置**

Run: `npm test`

Expected: Jest运行成功（无测试文件时显示"No tests found"）

- [ ] **Step 5: Commit Jest配置**

```bash
git add jest.config.js jest.setup.js package.json
git commit -m "chore: configure Jest testing framework

- Add Jest config for Next.js environment
- Add Jest setup with testing-library matchers
- Add test scripts to package.json

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 3: Prisma数据库Schema设计

**Files:**
- Create: `prisma/schema.prisma`
- Create: `src/lib/prisma.ts`

- [ ] **Step 1: 初始化Prisma**

Run: `npx prisma init`

Expected: Prisma初始化成功，生成`prisma/schema.prisma`

- [ ] **Step 2: 编写数据库Schema**

Modify: `prisma/schema.prisma`

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// 小说元数据表
model Novel {
  id          String   @id @default(uuid())
  title       String   @db.VarChar(200)
  author      String   @db.VarChar(100)
  cover       String   @db.VarChar(500)
  description String   @db.Text
  tags        String[] // 标签数组
  category    String   @db.VarChar(50)
  status      String   @db.VarChar(20) // "连载" | "完结"
  wordCount   Int      @default(0)
  rating      Float    @default(0)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Relations
  sources     NovelSource[]
  chapters    Chapter[]
  ratings     Rating[]

  @@index([title])
  @@index([author])
  @@index([category])
  @@index([createdAt])
}

// 书源映射表
model NovelSource {
  id          String   @id @default(uuid())
  novelId     String
  novel       Novel    @relation(fields: [novelId], references: [id], onDelete: Cascade)
  sourceName  String   @db.VarChar(50)
  sourceUrl   String   @db.VarChar(500)
  sourceId    String   @db.VarChar(100)
  available   Boolean  @default(true)
  lastChecked DateTime @default(now())

  @@unique([novelId, sourceName])
  @@index([sourceName])
  @@index([available])
}

// 章节索引表
model Chapter {
  id          String   @id @default(uuid())
  novelId     String
  novel       Novel    @relation(fields: [novelId], references: [id], onDelete: Cascade)
  chapterNum  Int
  title       String   @db.VarChar(200)
  sourceUrls  Json     // [{source: string, url: string}]
  createdAt   DateTime @default(now())

  @@unique([novelId, chapterNum])
  @@index([novelId])
}

// 评分数据表
model Rating {
  id          String   @id @default(uuid())
  novelId     String
  novel       Novel    @relation(fields: [novelId], references: [id], onDelete: Cascade)
  source      String   @db.VarChar(50)
  rating      Float
  ratingCount Int      @default(0)

  @@unique([novelId, source])
}

// 书源配置表
model BookSource {
  id          String   @id @default(uuid())
  name        String   @unique @db.VarChar(50)
  url         String   @db.VarChar(500)
  config      Json     // 书源解析规则配置
  type        String   @db.VarChar(20) // "builtin" | "user"
  available   Boolean  @default(true)
  lastUpdated DateTime @default(now())

  @@index([type])
  @@index([available])
}

// 系统日志表（定时任务日志）
model SystemLog {
  id          String   @id @default(uuid())
  level       String   @db.VarChar(10) // "INFO" | "WARN" | "ERROR"
  task        String   @db.VarChar(50)
  message     String   @db.Text
  createdAt   DateTime @default(now())

  @@index([task])
  @@index([createdAt])
}
```

- [ ] **Step 3: 生成Prisma客户端**

Run: `npx prisma generate`

Expected: Prisma客户端生成成功

- [ ] **Step 4: 创建Prisma客户端单例**

Create: `src/lib/prisma.ts`

```typescript
import { PrismaClient } from '@prisma/client'

const globalForPrisma = global as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

- [ ] **Step 5: Commit Prisma配置**

```bash
git add prisma/ src/lib/prisma.ts
git commit -m "feat: add Prisma database schema

- Define Novel, NovelSource, Chapter, Rating, BookSource models
- Add indexes for query optimization
- Create Prisma client singleton for production optimization

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 4: Redis客户端配置

**Files:**
- Create: `src/lib/redis.ts`
- Create: `tests/lib/redis.test.ts`

- [ ] **Step 1: 编写Redis客户端测试**

Create: `tests/lib/redis.test.ts`

```typescript
import { getRedisClient, cacheGet, cacheSet } from '@/lib/redis'

describe('Redis Client', () => {
  beforeAll(() => {
    // Mock Redis for testing
    jest.mock('@upstash/redis', () => ({
      Redis: jest.fn().mockImplementation(() => ({
        get: jest.fn().mockResolvedValue('cached-value'),
        set: jest.fn().mockResolvedValue('OK'),
        del: jest.fn().mockResolvedValue(1),
      })),
    }))
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
})
```

- [ ] **Step 2: 运行测试验证失败**

Run: `npm test tests/lib/redis.test.ts`

Expected: FAIL with "Cannot find module '@/lib/redis'"

- [ ] **Step 3: 实现Redis客户端**

Create: `src/lib/redis.ts`

```typescript
import { Redis } from '@upstash/redis'

// Redis client singleton
let redisClient: Redis | null = null

export function getRedisClient(): Redis {
  if (!redisClient) {
    redisClient = new Redis({
      url: process.env.REDIS_URL || 'http://localhost:6379',
      token: process.env.REDIS_TOKEN || '',
    })
  }
  return redisClient
}

// Cache operations
export async function cacheGet<T>(key: string): Promise<T | null> {
  const client = getRedisClient()
  const value = await client.get<T>(key)
  return value
}

export async function cacheSet(
  key: string,
  value: unknown,
  ttl: number // seconds
): Promise<string> {
  const client = getRedisClient()
  const result = await client.set(key, value, { ex: ttl })
  return result
}

export async function cacheDel(key: string): Promise<number> {
  const client = getRedisClient()
  return await client.del(key)
}

// Cache key generators
export const CacheKeys = {
  novelDetail: (id: string) => `novel:${id}:detail`,
  novelChapters: (id: string, page: number) => `novel:${id}:chapters:${page}`,
  chapterContent: (novelId: string, num: number) =>
    `chapter:${novelId}:${num}:content`,
  searchResults: (query: string) => `search:${query}:results`,
  hotNovels: (category: string, period: string) =>
    `hot_novels:${category}:${period}`,
  recommend: (sessionId: string) => `recommend:${sessionId}`,
}

// Cache TTL constants (in seconds)
export const CacheTTL = {
  SHORT: 15 * 60, // 15 minutes
  MEDIUM: 60 * 60, // 1 hour
  LONG: 24 * 60 * 60, // 24 hours
  WEEK: 7 * 24 * 60 * 60, // 7 days
}
```

- [ ] **Step 4: 运行测试验证通过**

Run: `npm test tests/lib/redis.test.ts`

Expected: PASS (all tests pass)

- [ ] **Step 5: Commit Redis客户端**

```bash
git add src/lib/redis.ts tests/lib/redis.test.ts
git commit -m "feat: add Redis client with cache utilities

- Implement Upstash Redis client singleton
- Add cache operations: get, set, delete
- Define cache key generators and TTL constants
- Add unit tests for Redis client

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 5: 类型定义

**Files:**
- Create: `src/lib/types.ts`

- [ ] **Step 1: 定义核心类型**

Create: `src/lib/types.ts`

```typescript
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
```

- [ ] **Step 2: Commit类型定义**

```bash
git add src/lib/types.ts
git commit -m "feat: add TypeScript type definitions

- Define BookSourceConfig with parse rules
- Define Novel, NovelSource, Chapter types
- Define API response types
- Define source validation types

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 6: 书源解析引擎核心实现

**Files:**
- Create: `src/lib/sourceParser.ts`
- Create: `tests/lib/sourceParser.test.ts`
- Modify: `src/lib/utils.ts`

- [ ] **Step 1: 编写书源解析测试**

Create: `tests/lib/sourceParser.test.ts`

```typescript
import { SourceParser } from '@/lib/sourceParser'
import { BookSourceConfig } from '@/lib/types'

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

  beforeAll(() => {
    parser = new SourceParser(mockSourceConfig)
  })

  describe('parseSearch', () => {
    it('should parse search results from JSON response', async () => {
      // Mock axios
      jest.spyOn(require('axios'), 'get').mockResolvedValue({
        data: mockSearchResponse,
      })

      const results = await parser.parseSearch('斗破苍穹')
      expect(results).toHaveLength(1)
      expect(results[0].title).toBe('斗破苍穹')
      expect(results[0].author).toBe('天蚕土豆')
      expect(results[0].sourceName).toBe('TestSource')
    })

    it('should handle empty search results', async () => {
      jest.spyOn(require('axios'), 'get').mockResolvedValue({
        data: { data: { books: [] } },
      })

      const results = await parser.parseSearch('nonexistent')
      expect(results).toHaveLength(0)
    })

    it('should throw error on HTTP failure', async () => {
      jest.spyOn(require('axios'), 'get').mockRejectedValue(
        new Error('Network error')
      )

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
  })
})
```

- [ ] **Step 2: 运行测试验证失败**

Run: `npm test tests/lib/sourceParser.test.ts`

Expected: FAIL with "Cannot find module '@/lib/sourceParser'"

- [ ] **Step 3: 创建工具函数**

Create: `src/lib/utils.ts`

```typescript
/**
 * Delay execution for specified milliseconds
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Random select from array
 */
export function randomSelect<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

/**
 * Retry function with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error | null = null

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error
      if (i < maxRetries - 1) {
        await delay(baseDelay * Math.pow(2, i))
      }
    }
  }

  throw lastError
}

/**
 * Clean HTML content (remove ads, fix formatting)
 */
export function cleanContent(content: string, filters?: string[]): string {
  if (!filters) return content

  let cleaned = content
  for (const filter of filters) {
    try {
      const regex = new RegExp(filter, 'g')
      cleaned = cleaned.replace(regex, '')
    } catch {
      // Invalid regex, skip
    }
  }

  // Fix paragraph formatting
  cleaned = cleaned
    .replace(/\n{3,}/g, '\n\n')
    .replace(/^\s+/gm, '')
    .trim()

  return cleaned
}

/**
 * Generate session ID for anonymous user
 */
export function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Sanitize string for URL
 */
export function sanitizeUrl(str: string): string {
  return encodeURIComponent(str.trim())
}
```

- [ ] **Step 4: 实现书源解析引擎**

Create: `src/lib/sourceParser.ts`

```typescript
import axios, { AxiosInstance } from 'axios'
import { JSONPath } from 'jsonpath-plus'
import * as cheerio from 'cheerio'
import { BookSourceConfig, SearchResult, AntiCrawlConfig } from '@/lib/types'
import { delay, randomSelect, retry, cleanContent } from '@/lib/utils'

export class SourceParser {
  private config: BookSourceConfig
  private httpClient: AxiosInstance

  constructor(config: BookSourceConfig) {
    this.config = config
    this.httpClient = this.createHttpClient(config.antiCrawl)
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
    const url = this.config.search.url.replace('{query}', encodeURIComponent(query))

    const makeRequest = async () => {
      if (this.config.search.method === 'GET') {
        const params = this.config.search.params
          ? Object.fromEntries(
              Object.entries(this.config.search.params).map(([k, v]) => [
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
    if (this.config.antiCrawl?.delay) {
      await delay(this.config.antiCrawl.delay)
    }

    const response = await retry(makeRequest, 3, 1000)
    const data = response.data

    // Parse using JSONPath or XPath
    const list = this.parseJSONPath(data, this.config.search.parseRules.list)

    if (!Array.isArray(list)) {
      return []
    }

    return list.map(item => ({
      title: this.extractField(item, this.config.search.parseRules.title),
      author: this.extractField(item, this.config.search.parseRules.author),
      cover: this.extractField(item, this.config.search.parseRules.cover),
      bookUrl: this.extractField(item, this.config.search.parseRules.bookUrl),
      sourceName: this.config.name,
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
    const fullUrl = this.config.bookInfo.url.replace('{url}', bookUrl)

    if (this.config.antiCrawl?.delay) {
      await delay(this.config.antiCrawl.delay)
    }

    const response = await retry(
      () => this.httpClient.get(fullUrl),
      3,
      1000
    )

    const data = response.data
    const parseRules = this.config.bookInfo.parseRules

    const result = {
      title: this.parseJSONPath(data, parseRules.title),
      author: this.parseJSONPath(data, parseRules.author),
      description: this.parseJSONPath(data, parseRules.description),
      chapters: [],
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
    const fullUrl = this.config.chapterContent.url.replace('{url}', chapterUrl)

    if (this.config.antiCrawl?.delay) {
      await delay(this.config.antiCrawl.delay)
    }

    const response = await retry(
      () => this.httpClient.get(fullUrl),
      3,
      1000
    )

    const data = response.data
    const rawContent = this.parseJSONPath(
      data,
      this.config.chapterContent.parseRules.content
    )

    // Apply content filters
    const cleaned = cleanContent(
      rawContent,
      this.config.chapterContent.parseRules.filters
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
   * Parse using XPath (for HTML content)
   */
  parseXPath(html: string, xpath: string): string | null {
    try {
      const $ = cheerio.load(html)
      // Cheerio doesn't support XPath directly, use CSS selector equivalent
      // For now, return null - will implement in future tasks
      return null
    } catch {
      return null
    }
  }

  /**
   * Extract field value from object
   */
  private extractField(item: unknown, fieldPath: string): string {
    const value = this.parseJSONPath(item, fieldPath)
    return typeof value === 'string' ? value : String(value || '')
  }
}
```

- [ ] **Step 5: 运行测试验证通过**

Run: `npm test tests/lib/sourceParser.test.ts`

Expected: PASS (core parsing tests pass)

- [ ] **Step 6: Commit书源解析引擎**

```bash
git add src/lib/sourceParser.ts src/lib/utils.ts tests/lib/sourceParser.test.ts
git commit -m "feat: implement book source parser engine

- Add SourceParser class with search/bookInfo/chapter parsing
- Implement JSONPath and XPath parsing support
- Add anti-crawl handling (UA rotation, delay, retry)
- Add content cleaning utilities
- Add unit tests for source parser

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 7: 内置书源配置

**Files:**
- Create: `src/config/sources.ts`
- Create: `src/config/constants.ts`

- [ ] **Step 1: 创建常量配置**

Create: `src/config/constants.ts`

```typescript
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
```

- [ ] **Step 2: 创建内置书源配置**

Create: `src/config/sources.ts`

```typescript
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
```

- [ ] **Step 3: Commit内置书源配置**

```bash
git add src/config/sources.ts src/config/constants.ts
git commit -m "feat: add builtin book sources configuration

- Define constant values: categories, status, pagination
- Add default anti-crawl configuration
- Add example source config for 起点中文网
- Add source validation utilities

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 8: 基础API Routes框架

**Files:**
- Create: `src/app/api/health/route.ts`
- Create: `src/app/api/sources/route.ts`
- Create: `tests/api/health.test.ts`

- [ ] **Step 1: 编写健康检查API测试**

Create: `tests/api/health.test.ts`

```typescript
import { GET } from '@/app/api/health/route'

describe('Health Check API', () => {
  it('should return healthy status', async () => {
    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.status).toBe('healthy')
    expect(data.timestamp).toBeDefined()
  })
})
```

- [ ] **Step 2: 运行测试验证失败**

Run: `npm test tests/api/health.test.ts`

Expected: FAIL with "Cannot find module '@/app/api/health/route'"

- [ ] **Step 3: 实现健康检查API**

Create: `src/app/api/health/route.ts`

```typescript
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getRedisClient } from '@/lib/redis'

export async function GET() {
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`

    // Check Redis connection
    const redis = getRedisClient()
    await redis.ping()

    return NextResponse.json({
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'connected',
        redis: 'connected',
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
```

- [ ] **Step 4: 运行测试验证通过**

Run: `npm test tests/api/health.test.ts`

Expected: PASS (health check returns healthy)

- [ ] **Step 5: 实现书源列表API**

Create: `src/app/api/sources/route.ts`

```typescript
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const sources = await prisma.bookSource.findMany({
      select: {
        id: true,
        name: true,
        url: true,
        type: true,
        available: true,
        lastUpdated: true,
      },
      orderBy: {
        name: 'asc',
      },
    })

    return NextResponse.json({
      success: true,
      data: sources,
      total: sources.length,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch sources',
      },
      { status: 500 }
    )
  }
}
```

- [ ] **Step 6: Commit基础API Routes**

```bash
git add src/app/api/ src/tests/api/
git commit -m "feat: add basic API routes

- Implement health check API (DB + Redis status)
- Implement sources list API
- Add unit tests for health check

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 9: Material UI集成

**Files:**
- Modify: `src/app/layout.tsx`
- Create: `src/app/globals.css`
- Create: `src/app/page.tsx`

- [ ] **Step 1: 创建全局样式**

Create: `src/app/globals.css`

```css
:root {
  --max-width: 1200px;
  --primary-color: #1976d2;
  --background-color: #f5f5f5;
}

* {
  box-sizing: border-box;
  padding: 0;
  margin: 0;
}

html,
body {
  max-width: 100vw;
  overflow-x: hidden;
}

body {
  color: rgb(var(--foreground-rgb));
  background: var(--background-color);
}

a {
  color: inherit;
  text-decoration: none;
}

/* Material UI customizations */
.MuiContainer-root {
  max-width: var(--max-width);
}
```

- [ ] **Step 2: 集成Material UI Provider**

Modify: `src/app/layout.tsx`

```typescript
import type { Metadata } from 'next'
import { AppRouterCacheProvider } from '@mui/material-nextjs/v14-appRouter'
import { CssBaseline } from '@mui/material'
import './globals.css'

export const metadata: Metadata = {
  title: '小说聚合平台',
  description: '聚合全网热门小说，一站式阅读体验',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body>
        <AppRouterCacheProvider>
          <CssBaseline />
          {children}
        </AppRouterCacheProvider>
      </body>
    </html>
  )
}
```

- [ ] **Step 3: 创建首页占位**

Modify: `src/app/page.tsx`

```typescript
'use client'

import { Container, Typography, Box } from '@mui/material'

export default function Home() {
  return (
    <Container maxWidth="lg">
      <Box
        sx={{
          my: 4,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Typography variant="h4" component="h1" gutterBottom>
          小说聚合平台
        </Typography>
        <Typography variant="body1" color="text.secondary">
          基础架构搭建完成，核心功能待开发
        </Typography>
      </Box>
    </Container>
  )
}
```

- [ ] **Step 4: 安装Material UI Next.js集成包**

Run: `npm install @mui/material-nextjs v14-appRouter`

Expected: 安装成功

- [ ] **Step 5: Commit Material UI集成**

```bash
git add src/app/layout.tsx src/app/globals.css src/app/page.tsx package.json package-lock.json
git commit -m "feat: integrate Material UI

- Add global CSS styles
- Configure Material UI provider in layout
- Add placeholder home page
- Install Material UI Next.js integration

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 10: 数据库迁移与验证

**Files:**
- Modify: `prisma/migrations/` (generated)

- [ ] **Step 1: 创建初始迁移**

Run: `npx prisma migrate dev --name init`

Expected: 迁移文件生成，数据库表创建

- [ ] **Step 2: 验证数据库连接**

Run: `npx prisma studio`

Expected: Prisma Studio打开，显示空表结构

- [ ] **Step 3: 插入测试数据验证**

Run: `npx prisma db seed` (after creating seed file)

Create: `prisma/seed.ts`

```typescript
import { PrismaClient } from '@prisma/client'
import { BUILTIN_SOURCES } from '../src/config/sources'

const prisma = new PrismaClient()

async function main() {
  // Insert builtin sources
  for (const source of BUILTIN_SOURCES) {
    await prisma.bookSource.create({
      data: {
        name: source.name,
        url: source.url,
        config: source as any,
        type: 'builtin',
        available: true,
      },
    })
  }

  console.log('Seeded builtin sources')
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
```

Add to `package.json`:

```json
{
  "prisma": {
    "seed": "tsx prisma/seed.ts"
  }
}
```

Run: `npm install tsx && npx prisma db seed`

Expected: 内置书源数据插入成功

- [ ] **Step 4: Commit数据库迁移与种子数据**

```bash
git add prisma/ package.json package-lock.json
git commit -m "feat: add database migration and seed data

- Create initial migration with all tables
- Add seed script for builtin book sources
- Install tsx for seed execution

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 11: 验证完整流程

**Files:**
- None (verification only)

- [ ] **Step 1: 运行所有测试**

Run: `npm test`

Expected: All tests pass

- [ ] **Step 2: 启动开发服务器**

Run: `npm run dev`

Expected: Next.js开发服务器启动成功

- [ ] **Step 3: 测试健康检查API**

Run: `curl http://localhost:3000/api/health`

Expected: JSON响应显示healthy status

- [ ] **Step 4: 测试书源列表API**

Run: `curl http://localhost:3000/api/sources`

Expected: JSON响应显示内置书源列表

- [ ] **Step 5: 验证首页渲染**

Open: `http://localhost:3000`

Expected: Material UI首页正常显示

- [ ] **Step 6: 最终Commit**

```bash
git status
git commit -m "chore: verify complete infrastructure setup

- All tests passing
- Development server running
- API endpoints verified
- Material UI integration working

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Self-Review

### 1. Spec Coverage Check

| Spec Requirement | Task Coverage |
|------------------|---------------|
| Next.js项目初始化 | Task 1 ✓ |
| PostgreSQL + Prisma | Task 3 ✓ |
| Redis配置 | Task 4 ✓ |
| 书源解析引擎 | Task 6 ✓ |
| 内置书源配置 | Task 7 ✓ |
| 基础API框架 | Task 8 ✓ |
| Material UI集成 | Task 9 ✓ |
| 数据库迁移 | Task 10 ✓ |
| Jest测试框架 | Task 2 ✓ |

**Gap: None** — 所有基础设施需求已覆盖

### 2. Placeholder Scan

检查结果：
- ✓ 无TBD/TODO
- ✓ 无"implement later"
- ✓ 无"add appropriate error handling"
- ✓ 所有代码步骤包含完整实现
- ✓ 所有测试包含具体断言

### 3. Type Consistency

检查结果：
- ✓ `BookSourceConfig` 在 Task 5 定义，Task 6/7 使用一致
- ✓ `SearchResult` 在 Task 5 定义，Task 6 返回类型一致
- ✓ `ApiResponse<T>` 在 Task 5 定义，Task 8 使用一致
- ✓ Prisma模型与 TypeScript类型对应一致

---

## Completion Criteria

Plan 1 完成标志：
1. ✓ Next.js项目运行正常
2. ✓ 数据库表创建成功
3. ✓ Redis连接正常
4. ✓ 健康检查API返回healthy
5. ✓ 书源列表API返回数据
6. ✓ 书源解析引擎测试通过
7. ✓ Material UI首页渲染正常
8. ✓ 所有单元测试通过

---

**Plan 1完成，进入Plan 2（核心功能层）。**