'use client'

import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'

export interface BookshelfItem {
  id: string
  title: string
  author: string
  cover: string
  addedAt: string
  lastReadAt: string
  lastReadChapter: number
  totalChapters: number
}

interface BookshelfState {
  novels: BookshelfItem[]
}

interface BookshelfContextType {
  bookshelf: BookshelfItem[]
  addToBookshelf: (item: Omit<BookshelfItem, 'addedAt' | 'lastReadAt'>) => void
  removeFromBookshelf: (id: string) => void
  updateProgress: (id: string, chapter: number, totalChapters?: number) => void
  isInBookshelf: (id: string) => boolean
  getBookshelfItem: (id: string) => BookshelfItem | undefined
}

const BOOKSHELL_STORAGE_KEY = 'xiaoshuo_bookshelf'

const BookshelfContext = createContext<BookshelfContextType | undefined>(undefined)

function loadBookshelf(): BookshelfState {
  if (typeof window === 'undefined') {
    return { novels: [] }
  }

  try {
    const stored = localStorage.getItem(BOOKSHELL_STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (error) {
    console.error('Failed to load bookshelf from localStorage:', error)
  }

  return { novels: [] }
}

function saveBookshelf(state: BookshelfState): void {
  if (typeof window === 'undefined') return

  try {
    localStorage.setItem(BOOKSHELL_STORAGE_KEY, JSON.stringify(state))
  } catch (error) {
    console.error('Failed to save bookshelf to localStorage:', error)
  }
}

export function BookshelfProvider({ children }: { children: React.ReactNode }) {
  const [bookshelf, setBookshelf] = useState<BookshelfItem[]>([])
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    const state = loadBookshelf()
    setBookshelf(state.novels)
    setIsInitialized(true)
  }, [])

  useEffect(() => {
    if (isInitialized) {
      saveBookshelf({ novels: bookshelf })
    }
  }, [bookshelf, isInitialized])

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

  const value = useMemo(
    () => ({
      bookshelf,
      addToBookshelf,
      removeFromBookshelf,
      updateProgress,
      isInBookshelf,
      getBookshelfItem,
    }),
    [bookshelf, addToBookshelf, removeFromBookshelf, updateProgress, isInBookshelf, getBookshelfItem]
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