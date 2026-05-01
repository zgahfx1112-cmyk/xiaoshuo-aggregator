'use client'

import { useState, useCallback } from 'react'

const PREFERENCE_KEY = 'user_preference'
const HISTORY_KEY = 'reading_history'
const MAX_HISTORY = 100
const MAX_PREFERENCE_TAGS = 5

export interface ReadingHistoryItem {
  novelId: string
  title: string
  tags: string[]
  readAt: number // timestamp
}

export interface UserPreference {
  topTags: Array<{ tag: string; count: number }>
  lastUpdated: number
}

function loadFromStorage<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue
  try {
    const stored = localStorage.getItem(key)
    return stored ? (JSON.parse(stored) as T) : defaultValue
  } catch {
    return defaultValue
  }
}

function isBrowser(): boolean {
  return typeof window !== 'undefined'
}

export function useUserPreference() {
  const [history, setHistory] = useState<ReadingHistoryItem[]>(() =>
    loadFromStorage<ReadingHistoryItem[]>(HISTORY_KEY, [])
  )
  const [preference, setPreference] = useState<UserPreference | null>(() =>
    loadFromStorage<UserPreference | null>(PREFERENCE_KEY, null)
  )

  // Calculate tag frequency and extract top tags
  const calculatePreferenceTags = useCallback((items: ReadingHistoryItem[]): Array<{ tag: string; count: number }> => {
    const tagCount: Record<string, number> = {}

    items.forEach(item => {
      item.tags.forEach(tag => {
        tagCount[tag] = (tagCount[tag] || 0) + 1
      })
    })

    // Sort by count and take top N
    const sortedTags = Object.entries(tagCount)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, MAX_PREFERENCE_TAGS)

    return sortedTags
  }, [])

  // Add a novel to reading history
  const addReadingHistory = useCallback((novelId: string, title: string, tags: string[]) => {
    if (typeof window === 'undefined') return

    const newItem: ReadingHistoryItem = {
      novelId,
      title,
      tags,
      readAt: Date.now(),
    }

    setHistory(prev => {
      // Remove existing entry for this novel
      const filtered = prev.filter(item => item.novelId !== novelId)
      // Add new entry at the beginning
      const updated = [newItem, ...filtered].slice(0, MAX_HISTORY)

      // Update localStorage
      localStorage.setItem(HISTORY_KEY, JSON.stringify(updated))

      // Calculate and save preference
      const topTags = calculatePreferenceTags(updated)
      const newPreference: UserPreference = {
        topTags,
        lastUpdated: Date.now(),
      }
      localStorage.setItem(PREFERENCE_KEY, JSON.stringify(newPreference))
      setPreference(newPreference)

      return updated
    })
  }, [calculatePreferenceTags])

  // Get preference tags as simple array
  const getPreferenceTags = useCallback((): string[] => {
    if (!preference || !preference.topTags) return []
    return preference.topTags.map(t => t.tag)
  }, [preference])

  // Clear reading history
  const clearHistory = useCallback(() => {
    if (typeof window === 'undefined') return

    localStorage.removeItem(HISTORY_KEY)
    localStorage.removeItem(PREFERENCE_KEY)
    setHistory([])
    setPreference(null)
  }, [])

  return {
    history,
    preference,
    isLoaded: isBrowser(),
    addReadingHistory,
    getPreferenceTags,
    clearHistory,
  }
}

export default useUserPreference