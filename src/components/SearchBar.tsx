'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { TextField, IconButton, InputAdornment } from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'

interface SearchBarProps {
  initialQuery?: string
  onSearch?: (query: string) => void
}

export default function SearchBar({ initialQuery = '', onSearch }: SearchBarProps) {
  const router = useRouter()
  const [query, setQuery] = useState(initialQuery)
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery)

  // Debounce input (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query)
    }, 300)

    return () => clearTimeout(timer)
  }, [query])

  // Trigger search when debounced query changes (only if onSearch is provided)
  useEffect(() => {
    if (onSearch && debouncedQuery.trim().length > 0) {
      onSearch(debouncedQuery.trim())
    }
  }, [debouncedQuery, onSearch])

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    const trimmedQuery = query.trim()
    if (trimmedQuery.length > 0) {
      if (onSearch) {
        onSearch(trimmedQuery)
      } else {
        router.push(`/search?query=${encodeURIComponent(trimmedQuery)}`)
      }
    }
  }, [query, router, onSearch])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSubmit(e)
    }
  }, [handleSubmit])

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto">
      <TextField
        fullWidth
        variant="outlined"
        placeholder="Search novels by title or author..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" />
              </InputAdornment>
            ),
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  type="submit"
                  edge="end"
                  disabled={query.trim().length === 0}
                  aria-label="search"
                >
                  <SearchIcon />
                </IconButton>
              </InputAdornment>
            ),
          }
        }}
        sx={{
          '& .MuiOutlinedInput-root': {
            borderRadius: 2,
            backgroundColor: 'background.paper',
          },
        }}
      />
    </form>
  )
}