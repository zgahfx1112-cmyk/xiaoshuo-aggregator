import { prisma } from '@/lib/prisma'
import { cacheGet, cacheSet, CacheKeys, CacheTTL } from '@/lib/redis'

export interface RecommendNovel {
  id: string
  title: string
  author: string
  cover: string
  description: string
  tags: string[]
  category: string
  status: string
  wordCount: number
  rating: number
  score: number
  reason: string
}

interface NovelWithScore {
  id: string
  title: string
  author: string
  cover: string
  description: string
  tags: string[]
  category: string
  status: string
  wordCount: number
  rating: number
  tagMatch: number
  popularity: number
}

const TAG_MATCH_COUNT = 5
const HOT_COUNT = 3
const RANDOM_COUNT = 2
const TOTAL_COUNT = TAG_MATCH_COUNT + HOT_COUNT + RANDOM_COUNT

// Calculate tag match score (0-1)
function calculateTagMatch(novelTags: string[], preferenceTags: string[]): number {
  if (!preferenceTags.length || !novelTags.length) return 0

  const matchCount = novelTags.filter(tag => preferenceTags.includes(tag)).length
  return matchCount / Math.min(novelTags.length, preferenceTags.length)
}

// Calculate popularity score (0-1) based on word count and rating
function calculatePopularity(wordCount: number, rating: number): number {
  // Normalize word count (assuming max around 10 million words)
  const wordCountScore = Math.min(wordCount / 10000000, 1)
  // Normalize rating (assuming 0-10 scale)
  const ratingScore = rating / 10
  // Weighted average
  return wordCountScore * 0.3 + ratingScore * 0.7
}

// Calculate final score
function calculateFinalScore(tagMatch: number, rating: number, popularity: number): number {
  return tagMatch * 0.4 + (rating / 10) * 0.3 + popularity * 0.3
}

// Get novels matching user preference tags
async function getTagMatchedNovels(preferenceTags: string[], excludeIds: Set<string>): Promise<NovelWithScore[]> {
  if (!preferenceTags.length) return []

  try {
    const novels = await prisma.novel.findMany({
      where: {
        id: { notIn: Array.from(excludeIds) },
        tags: { hasSome: preferenceTags },
      },
      take: 50,
      orderBy: { rating: 'desc' },
    })

    return novels.map(novel => ({
      id: novel.id,
      title: novel.title,
      author: novel.author,
      cover: novel.cover,
      description: novel.description,
      tags: novel.tags,
      category: novel.category,
      status: novel.status,
      wordCount: novel.wordCount,
      rating: novel.rating,
      tagMatch: calculateTagMatch(novel.tags, preferenceTags),
      popularity: calculatePopularity(novel.wordCount, novel.rating),
    }))
  } catch (error) {
    console.error('Failed to fetch tag matched novels:', error)
    return []
  }
}

// Get hot novels
async function getHotNovels(excludeIds: Set<string>): Promise<NovelWithScore[]> {
  try {
    const novels = await prisma.novel.findMany({
      where: {
        id: { notIn: Array.from(excludeIds) },
        rating: { gte: 7.0 },
      },
      take: 30,
      orderBy: [
        { rating: 'desc' },
        { wordCount: 'desc' },
      ],
    })

    return novels.map(novel => ({
      id: novel.id,
      title: novel.title,
      author: novel.author,
      cover: novel.cover,
      description: novel.description,
      tags: novel.tags,
      category: novel.category,
      status: novel.status,
      wordCount: novel.wordCount,
      rating: novel.rating,
      tagMatch: 0,
      popularity: calculatePopularity(novel.wordCount, novel.rating),
    }))
  } catch (error) {
    console.error('Failed to fetch hot novels:', error)
    return []
  }
}

// Get random exploration novels (completed with rating > 3.0)
async function getRandomNovels(excludeIds: Set<string>): Promise<NovelWithScore[]> {
  try {
    const novels = await prisma.novel.findMany({
      where: {
        id: { notIn: Array.from(excludeIds) },
        status: '完结',
        rating: { gte: 3.0 },
      },
      take: 50,
    })

    // Shuffle and take random novels
    const shuffled = novels.sort(() => Math.random() - 0.5)

    return shuffled.map(novel => ({
      id: novel.id,
      title: novel.title,
      author: novel.author,
      cover: novel.cover,
      description: novel.description,
      tags: novel.tags,
      category: novel.category,
      status: novel.status,
      wordCount: novel.wordCount,
      rating: novel.rating,
      tagMatch: 0,
      popularity: calculatePopularity(novel.wordCount, novel.rating),
    }))
  } catch (error) {
    console.error('Failed to fetch random novels:', error)
    return []
  }
}

// Main function to generate recommendations
export async function generateRecommendation(sessionId: string): Promise<RecommendNovel[]> {
  // Try to get cached recommendations first
  const cacheKey = CacheKeys.recommend(sessionId)
  const cached = await cacheGet<RecommendNovel[]>(cacheKey)
  if (cached) {
    return cached
  }

  // Get user preference tags from cache or use empty array
  // In a real app, this would be fetched from the database or session
  const preferenceTags: string[] = []

  const result: RecommendNovel[] = []
  const usedIds = new Set<string>()

  // 1. Get tag-matched novels (5)
  const tagMatchedNovels = await getTagMatchedNovels(preferenceTags, usedIds)
  const sortedTagMatched = tagMatchedNovels
    .sort((a, b) => calculateFinalScore(b.tagMatch, b.rating, b.popularity) -
                   calculateFinalScore(a.tagMatch, a.rating, a.popularity))
    .slice(0, TAG_MATCH_COUNT)

  for (const novel of sortedTagMatched) {
    usedIds.add(novel.id)
    result.push({
      ...novel,
      score: calculateFinalScore(novel.tagMatch, novel.rating, novel.popularity),
      reason: '根据您的阅读偏好推荐',
    })
  }

  // 2. Get hot novels (3)
  const hotNovels = await getHotNovels(usedIds)
  const sortedHot = hotNovels
    .sort((a, b) => calculateFinalScore(b.tagMatch, b.rating, b.popularity) -
                 calculateFinalScore(a.tagMatch, a.rating, a.popularity))
    .slice(0, HOT_COUNT)

  for (const novel of sortedHot) {
    usedIds.add(novel.id)
    result.push({
      ...novel,
      score: calculateFinalScore(novel.tagMatch, novel.rating, novel.popularity),
      reason: '热门榜单推荐',
    })
  }

  // 3. Get random exploration novels (2)
  const randomNovels = await getRandomNovels(usedIds)
  const selectedRandom = randomNovels.slice(0, RANDOM_COUNT)

  for (const novel of selectedRandom) {
    usedIds.add(novel.id)
    result.push({
      ...novel,
      score: calculateFinalScore(novel.tagMatch, novel.rating, novel.popularity),
      reason: '随机探索发现',
    })
  }

  // If we don't have enough novels, try to fill with any novels
  if (result.length < TOTAL_COUNT) {
    try {
      const moreNovels = await prisma.novel.findMany({
        where: {
          id: { notIn: Array.from(usedIds) },
        },
        take: TOTAL_COUNT - result.length,
        orderBy: { rating: 'desc' },
      })

      for (const novel of moreNovels) {
        result.push({
          id: novel.id,
          title: novel.title,
          author: novel.author,
          cover: novel.cover,
          description: novel.description,
          tags: novel.tags,
          category: novel.category,
          status: novel.status,
          wordCount: novel.wordCount,
          rating: novel.rating,
          score: calculateFinalScore(0, novel.rating, calculatePopularity(novel.wordCount, novel.rating)),
          reason: '为您推荐',
        })
      }
    } catch (error) {
      console.error('Failed to fetch additional novels:', error)
    }
  }

  // Sort by score and cache the result
  const sortedResult = result.sort((a, b) => b.score - a.score)

  // Cache for 1 hour
  await cacheSet(cacheKey, sortedResult, CacheTTL.MEDIUM)

  return sortedResult
}

// Generate mock recommendations when database is not available
export function generateMockRecommendations(): RecommendNovel[] {
  const mockNovels: RecommendNovel[] = [
    {
      id: '1',
      title: '斗破苍穹',
      author: '天蚕土豆',
      cover: '/covers/1.jpg',
      description: '三十年河东，三十年河西，莫欺少年穷！',
      tags: ['玄幻', '热血', '升级'],
      category: '玄幻',
      status: '完结',
      wordCount: 5300000,
      rating: 9.2,
      score: 0.85,
      reason: '热门榜单推荐',
    },
    {
      id: '2',
      title: '遮天',
      author: '辰东',
      cover: '/covers/2.jpg',
      description: '冰冷与黑暗并存的宇宙深处，九具庞大的龙尸拉着一口铜棺...',
      tags: ['玄幻', '仙侠', '热血'],
      category: '玄幻',
      status: '完结',
      wordCount: 4500000,
      rating: 9.0,
      score: 0.82,
      reason: '热门榜单推荐',
    },
    {
      id: '3',
      title: '完美世界',
      author: '辰东',
      cover: '/covers/3.jpg',
      description: '一粒尘可填海，一根草斩日月星辰...',
      tags: ['玄幻', '热血', '玄幻'],
      category: '玄幻',
      status: '完结',
      wordCount: 4800000,
      rating: 8.9,
      score: 0.80,
      reason: '热门榜单推荐',
    },
    {
      id: '41',
      title: '三体',
      author: '刘慈欣',
      cover: '/covers/41.jpg',
      description: '文化大革命如火如荼进行的同时，军方探寻外星文明的绝秘计划"红岸工程"取得了突破性进展。',
      tags: ['科幻', '硬科幻', '宇宙'],
      category: '科幻',
      status: '完结',
      wordCount: 880000,
      rating: 9.6,
      score: 0.78,
      reason: '随机探索发现',
    },
    {
      id: '31',
      title: '明朝那些事儿',
      author: '当年明月',
      cover: '/covers/31.jpg',
      description: '以史料为基础，以年代和具体人物为主线，并加入了小说的笔法...',
      tags: ['历史', '传记', '明朝'],
      category: '历史',
      status: '完结',
      wordCount: 1700000,
      rating: 9.5,
      score: 0.75,
      reason: '随机探索发现',
    },
  ]

  return mockNovels
}