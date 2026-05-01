'use client'

import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'reading_progress'
const HISTORY_KEY = 'reading_history'
const MAX_HISTORY = 50

export interface ReadingProgress {
  novelId: string
  novelTitle: string
  chapterNum: number
  chapterTitle: string
  lastRead: number // timestamp
}

export interface ReadingHistoryItem extends ReadingProgress {
  position?: number // scroll position within chapter
}

export function useReadingProgress(novelId?: string) {
  const [progress, setProgress] = useState<ReadingProgress | null>(null)
  const [history, setHistory] = useState<ReadingHistoryItem[]>([])
  const [isLoaded, setIsLoaded] = useState(false)

  // Load progress and history from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return

    try {
      // Load history
      const storedHistory = localStorage.getItem(HISTORY_KEY)
      if (storedHistory) {
        const parsed = JSON.parse(storedHistory) as ReadingHistoryItem[]
        setHistory(parsed)
      }

      // Load current novel progress if novelId provided
      if (novelId) {
        const storedProgress = localStorage.getItem(`${STORAGE_KEY}_${novelId}`)
        if (storedProgress) {
          const parsed = JSON.parse(storedProgress) as ReadingProgress
          setProgress(parsed)
        }
      }
    } catch (error) {
      console.error('Failed to load reading progress:', error)
    }

    setIsLoaded(true)
  }, [novelId])

  // Save progress for current novel
  const saveProgress = useCallback(
    (data: Omit<ReadingProgress, 'lastRead'>) => {
      if (typeof window === 'undefined') return

      const newProgress: ReadingProgress = {
        ...data,
        lastRead: Date.now(),
      }

      // Save to novel-specific storage
      localStorage.setItem(`${STORAGE_KEY}_${data.novelId}`, JSON.stringify(newProgress))
      setProgress(newProgress)

      // Update history
      setHistory(prev => {
        // Remove existing entry for this novel
        const filtered = prev.filter(item => item.novelId !== data.novelId)
        // Add new entry at the beginning
        const updated = [newProgress, ...filtered].slice(0, MAX_HISTORY)
        localStorage.setItem(HISTORY_KEY, JSON.stringify(updated))
        return updated
      })
    },
    []
  )

  // Save scroll position within chapter
  const savePosition = useCallback((position: number) => {
    if (typeof window === 'undefined' || !progress) return

    const updatedHistory = history.map(item =>
      item.novelId === progress.novelId ? { ...item, position } : item
    )
    setHistory(updatedHistory)
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updatedHistory))
  }, [progress, history])

  // Get progress for a specific novel
  const getProgress = useCallback((targetNovelId: string): ReadingProgress | null => {
    if (typeof window === 'undefined') return null

    try {
      const stored = localStorage.getItem(`${STORAGE_KEY}_${targetNovelId}`)
      return stored ? (JSON.parse(stored) as ReadingProgress) : null
    } catch {
      return null
    }
  }, [])

  // Clear progress for a specific novel
  const clearProgress = useCallback((targetNovelId: string) => {
    if (typeof window === 'undefined') return

    localStorage.removeItem(`${STORAGE_KEY}_${targetNovelId}`)

    if (progress?.novelId === targetNovelId) {
      setProgress(null)
    }

    setHistory(prev => {
      const updated = prev.filter(item => item.novelId !== targetNovelId)
      localStorage.setItem(HISTORY_KEY, JSON.stringify(updated))
      return updated
    })
  }, [progress])

  // Clear all history
  const clearAllHistory = useCallback(() => {
    if (typeof window === 'undefined') return

    // Clear all novel-specific progress
    history.forEach(item => {
      localStorage.removeItem(`${STORAGE_KEY}_${item.novelId}`)
    })

    localStorage.removeItem(HISTORY_KEY)
    setHistory([])
    setProgress(null)
  }, [history])

  return {
    progress,
    history,
    isLoaded,
    saveProgress,
    savePosition,
    getProgress,
    clearProgress,
    clearAllHistory,
  }
}

export default useReadingProgress