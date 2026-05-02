'use client'

import { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react'

export interface SourceInfo {
  sourceId: string
  sourceName: string
  bookUrl: string
  sourceConfig: object
}

export interface ChapterUrlCache {
  chapterNum: number
  title: string
  url: string
}

export interface BookshelfItem {
  id: string
  title: string
  author: string
  cover: string
  addedAt: string
  lastReadAt: string
  lastReadChapter: number
  totalChapters: number
  // 书源信息
  primarySource: SourceInfo
  // 备用书源
  backupSources?: SourceInfo[]
  // 章节 URL 缓存
  chapterUrls?: ChapterUrlCache[]
}

// 用户书源配置（本地存储）
export interface UserSourceConfig {
  sourceId: string
  sourceName: string
  enabled: boolean
  isCustom: boolean
  groupId?: string // 所属分组
  config?: object
  // 可用性测试结果
  available?: boolean      // 是否可用（测试通过）
  lastTestedAt?: string    // 最后测试时间
  resultCount?: number     // 测试结果数量
}

// 书源分组
export interface SourceGroup {
  id: string
  name: string
  createdAt: string
}

interface BookshelfState {
  novels: BookshelfItem[]
}

interface UserSourceState {
  sources: UserSourceConfig[]
  groups: SourceGroup[]
}

interface BookshelfContextType {
  bookshelf: BookshelfItem[]
  addToBookshelf: (item: Omit<BookshelfItem, 'addedAt' | 'lastReadAt'>) => void
  removeFromBookshelf: (id: string) => void
  updateProgress: (id: string, chapter: number, totalChapters?: number) => void
  isInBookshelf: (id: string) => boolean
  getBookshelfItem: (id: string) => BookshelfItem | undefined
  // 用户书源配置
  userSourceConfigs: UserSourceConfig[]
  setUserSourceEnabled: (sourceId: string, enabled: boolean) => void
  addUserSource: (config: UserSourceConfig) => void
  addMultipleSources: (configs: UserSourceConfig[]) => void
  removeUserSource: (sourceId: string) => void
  removeMultipleSources: (sourceIds: string[]) => void
  getEnabledCustomSources: () => UserSourceConfig[]
  // 分组管理
  sourceGroups: SourceGroup[]
  addGroup: (name: string) => string // 返回分组ID
  addMultipleGroups: (names: string[]) => SourceGroup[] // 批量创建分组
  removeGroup: (id: string) => void
  setSourceGroup: (sourceId: string, groupId: string | undefined) => void
  getSourcesByGroup: (groupId: string) => UserSourceConfig[]
  getGroupByName: (name: string) => SourceGroup | undefined
  // 可用性测试
  updateSourceAvailability: (sourceId: string, available: boolean, resultCount?: number) => void
  updateMultipleSourceAvailability: (results: Array<{ sourceId: string; available: boolean; resultCount?: number }>) => void
}

const BOOKSHELF_STORAGE_KEY = 'xiaoshuo_bookshelf'
const USER_SOURCES_STORAGE_KEY = 'xiaoshuo_user_sources'

const BookshelfContext = createContext<BookshelfContextType | undefined>(undefined)

function loadFromStorage<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue

  try {
    const stored = localStorage.getItem(key)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch {
    // Ignore parse errors
  }

  return defaultValue
}

function saveToStorage<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return

  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Ignore storage errors
  }
}

export function BookshelfProvider({ children }: { children: ReactNode }) {
  const [bookshelf, setBookshelf] = useState<BookshelfItem[]>([])
  const [userSourceConfigs, setUserSourceConfigs] = useState<UserSourceConfig[]>([])
  const [sourceGroups, setSourceGroups] = useState<SourceGroup[]>([])
  const [isInitialized, setIsInitialized] = useState(false)

  // 初始化：从 localStorage 加载
  useEffect(() => {
    const bookshelfState = loadFromStorage<BookshelfState>(BOOKSHELF_STORAGE_KEY, { novels: [] })
    setBookshelf(bookshelfState.novels)

    const userSourceState = loadFromStorage<UserSourceState>(USER_SOURCES_STORAGE_KEY, { sources: [], groups: [] })
    setUserSourceConfigs(userSourceState.sources)
    setSourceGroups(userSourceState.groups || [])

    setIsInitialized(true)
  }, [])

  // 保存书架到 localStorage
  useEffect(() => {
    if (isInitialized) {
      saveToStorage(BOOKSHELF_STORAGE_KEY, { novels: bookshelf })
    }
  }, [bookshelf, isInitialized])

  // 保存用户书源配置到 localStorage
  useEffect(() => {
    if (isInitialized) {
      saveToStorage(USER_SOURCES_STORAGE_KEY, { sources: userSourceConfigs, groups: sourceGroups })
    }
  }, [userSourceConfigs, sourceGroups, isInitialized])

  // 书架操作
  const addToBookshelf = useCallback((item: Omit<BookshelfItem, 'addedAt' | 'lastReadAt'>) => {
    setBookshelf((prev) => {
      const existingIndex = prev.findIndex((n) => n.id === item.id)
      if (existingIndex !== -1) {
        return prev
      }

      const now = new Date().toISOString()
      const newItem: BookshelfItem = {
        ...item,
        addedAt: now,
        lastReadAt: now,
      }

      return [newItem, ...prev]
    })
  }, [])

  const removeFromBookshelf = useCallback((id: string) => {
    setBookshelf((prev) => prev.filter((n) => n.id !== id))
  }, [])

  const updateProgress = useCallback((id: string, chapter: number, totalChapters?: number) => {
    setBookshelf((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item

        return {
          ...item,
          lastReadAt: new Date().toISOString(),
          lastReadChapter: chapter,
          ...(totalChapters !== undefined && { totalChapters }),
        }
      })
    )
  }, [])

  const isInBookshelf = useCallback((id: string) => {
    return bookshelf.some((n) => n.id === id)
  }, [bookshelf])

  const getBookshelfItem = useCallback((id: string) => {
    return bookshelf.find((n) => n.id === id)
  }, [bookshelf])

  // 用户书源配置操作
  const setUserSourceEnabled = useCallback((sourceId: string, enabled: boolean) => {
    setUserSourceConfigs((prev) =>
      prev.map((s) => s.sourceId === sourceId ? { ...s, enabled } : s)
    )
  }, [])

  const addUserSource = useCallback((config: UserSourceConfig) => {
    setUserSourceConfigs((prev) => {
      const filtered = prev.filter((s) => s.sourceId !== config.sourceId)
      return [...filtered, config]
    })
  }, [])

  const addMultipleSources = useCallback((configs: UserSourceConfig[]) => {
    setUserSourceConfigs((prev) => {
      const existingIds = new Set(configs.map(c => c.sourceId))
      const filtered = prev.filter((s) => !existingIds.has(s.sourceId))
      return [...filtered, ...configs]
    })
  }, [])

  const removeUserSource = useCallback((sourceId: string) => {
    setUserSourceConfigs((prev) => prev.filter((s) => s.sourceId !== sourceId))
  }, [])

  const removeMultipleSources = useCallback((sourceIds: string[]) => {
    setUserSourceConfigs((prev) => prev.filter((s) => !sourceIds.includes(s.sourceId)))
  }, [])

  const getEnabledCustomSources = useCallback(() => {
    return userSourceConfigs.filter((s) => s.enabled && s.isCustom && s.config)
  }, [userSourceConfigs])

  // 分组管理
  const addGroup = useCallback((name: string): string => {
    const id = `group_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
    const newGroup: SourceGroup = {
      id,
      name,
      createdAt: new Date().toISOString(),
    }
    setSourceGroups((prev) => [...prev, newGroup])
    return id
  }, [])

  const addMultipleGroups = useCallback((names: string[]): SourceGroup[] => {
    const newGroups: SourceGroup[] = names.map(name => ({
      id: `group_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name,
      createdAt: new Date().toISOString(),
    }))
    setSourceGroups((prev) => [...prev, ...newGroups])
    return newGroups
  }, [])

  const removeGroup = useCallback((id: string) => {
    setSourceGroups((prev) => prev.filter((g) => g.id !== id))
    // 清除该分组下的书源的 groupId
    setUserSourceConfigs((prev) =>
      prev.map((s) => s.groupId === id ? { ...s, groupId: undefined } : s)
    )
  }, [])

  const setSourceGroup = useCallback((sourceId: string, groupId: string | undefined) => {
    setUserSourceConfigs((prev) =>
      prev.map((s) => s.sourceId === sourceId ? { ...s, groupId } : s)
    )
  }, [])

  const getSourcesByGroup = useCallback((groupId: string) => {
    return userSourceConfigs.filter((s) => s.groupId === groupId)
  }, [userSourceConfigs])

  const getGroupByName = useCallback((name: string) => {
    return sourceGroups.find(g => g.name === name)
  }, [sourceGroups])

  // 更新书源可用状态
  const updateSourceAvailability = useCallback((
    sourceId: string,
    available: boolean,
    resultCount?: number
  ) => {
    setUserSourceConfigs((prev) =>
      prev.map((s) => s.sourceId === sourceId
        ? { ...s, available, lastTestedAt: new Date().toISOString(), resultCount }
        : s
      )
    )
  }, [])

  // 批量更新书源可用状态
  const updateMultipleSourceAvailability = useCallback((
    results: Array<{ sourceId: string; available: boolean; resultCount?: number }>
  ) => {
    const updates = new Map(results.map(r => [r.sourceId, r]))
    setUserSourceConfigs((prev) =>
      prev.map((s) => {
        const update = updates.get(s.sourceId)
        if (update) {
          return {
            ...s,
            available: update.available,
            lastTestedAt: new Date().toISOString(),
            resultCount: update.resultCount
          }
        }
        return s
      })
    )
  }, [])

  const value = useMemo(
    () => ({
      bookshelf,
      addToBookshelf,
      removeFromBookshelf,
      updateProgress,
      isInBookshelf,
      getBookshelfItem,
      userSourceConfigs,
      setUserSourceEnabled,
      addUserSource,
      addMultipleSources,
      removeUserSource,
      removeMultipleSources,
      getEnabledCustomSources,
      sourceGroups,
      addGroup,
      addMultipleGroups,
      removeGroup,
      setSourceGroup,
      getSourcesByGroup,
      getGroupByName,
      updateSourceAvailability,
      updateMultipleSourceAvailability,
    }),
    [
      bookshelf,
      addToBookshelf,
      removeFromBookshelf,
      updateProgress,
      isInBookshelf,
      getBookshelfItem,
      userSourceConfigs,
      setUserSourceEnabled,
      addUserSource,
      addMultipleSources,
      removeUserSource,
      removeMultipleSources,
      getEnabledCustomSources,
      sourceGroups,
      addGroup,
      addMultipleGroups,
      removeGroup,
      setSourceGroup,
      getSourcesByGroup,
      getGroupByName,
      updateSourceAvailability,
      updateMultipleSourceAvailability,
    ]
  )

  return (
    <BookshelfContext.Provider value={value}>
      {children}
    </BookshelfContext.Provider>
  )
}

export function useBookshelf(): BookshelfContextType {
  const context = useContext(BookshelfContext)
  if (context === undefined) {
    throw new Error('useBookshelf must be used within a BookshelfProvider')
  }
  return context
}