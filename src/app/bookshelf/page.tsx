'use client'

import { useState, useMemo } from 'react'
import {
  Box,
  Typography,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  InputAdornment,
  Chip,
  Alert,
  CircularProgress,
} from '@mui/material'
import SortIcon from '@mui/icons-material/Sort'
import FilterListIcon from '@mui/icons-material/FilterList'
import SearchIcon from '@mui/icons-material/Search'
import { useBookshelf, BookshelfItem } from '@/hooks/useBookshelf'
import BookshelfItemComponent from '@/components/BookshelfItem'

type SortOption = 'lastReadAt' | 'progress' | 'title' | 'addedAt'
type FilterStatus = 'all' | 'reading' | 'completed'

export default function BookshelfPage() {
  const { bookshelf, removeFromBookshelf } = useBookshelf()
  const [sortBy, setSortBy] = useState<SortOption>('lastReadAt')
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all')
  const [searchQuery, setSearchQuery] = useState('')

  const handleContinueReading = (id: string) => {
    // Navigate to reading page - will be implemented when reader module is ready
    window.location.href = `/novel/${id}`
  }

  const handleDelete = (id: string) => {
    removeFromBookshelf(id)
  }

  const filteredAndSortedBooks = useMemo(() => {
    let result = [...bookshelf]

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (item) =>
          item.title.toLowerCase().includes(query) ||
          item.author.toLowerCase().includes(query)
      )
    }

    // Filter by status
    if (filterStatus === 'reading') {
      result = result.filter(
        (item) => item.totalChapters > 0 && item.lastReadChapter < item.totalChapters
      )
    } else if (filterStatus === 'completed') {
      result = result.filter(
        (item) => item.totalChapters > 0 && item.lastReadChapter >= item.totalChapters
      )
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'lastReadAt':
          return new Date(b.lastReadAt).getTime() - new Date(a.lastReadAt).getTime()
        case 'progress': {
          const progressA = a.totalChapters > 0 ? a.lastReadChapter / a.totalChapters : 0
          const progressB = b.totalChapters > 0 ? b.lastReadChapter / b.totalChapters : 0
          return progressB - progressA
        }
        case 'title':
          return a.title.localeCompare(b.title, 'zh-CN')
        case 'addedAt':
          return new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime()
        default:
          return 0
      }
    })

    return result
  }, [bookshelf, sortBy, filterStatus, searchQuery])

  const statusCounts = useMemo(() => {
    const reading = bookshelf.filter(
      (item) => item.totalChapters > 0 && item.lastReadChapter < item.totalChapters
    ).length
    const completed = bookshelf.filter(
      (item) => item.totalChapters > 0 && item.lastReadChapter >= item.totalChapters
    ).length
    return {
      all: bookshelf.length,
      reading,
      completed,
    }
  }, [bookshelf])

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold' }}>
        My Bookshelf
      </Typography>

      {/* Controls */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Search by title or author..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              },
            }}
          />
        </Grid>

        <Grid size={{ xs: 6, sm: 4 }}>
          <FormControl fullWidth size="small">
            <InputLabel id="sort-label">
              <SortIcon sx={{ mr: 0.5, fontSize: 18 }} />
              Sort
            </InputLabel>
            <Select
              labelId="sort-label"
              value={sortBy}
              label="Sort"
              onChange={(e) => setSortBy(e.target.value as SortOption)}
            >
              <MenuItem value="lastReadAt">Recently Read</MenuItem>
              <MenuItem value="addedAt">Recently Added</MenuItem>
              <MenuItem value="title">Title</MenuItem>
              <MenuItem value="progress">Progress</MenuItem>
            </Select>
          </FormControl>
        </Grid>

        <Grid size={{ xs: 6, sm: 4 }}>
          <FormControl fullWidth size="small">
            <InputLabel id="filter-label">
              <FilterListIcon sx={{ mr: 0.5, fontSize: 18 }} />
              Status
            </InputLabel>
            <Select
              labelId="filter-label"
              value={filterStatus}
              label="Status"
              onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
            >
              <MenuItem value="all">
                All ({statusCounts.all})
              </MenuItem>
              <MenuItem value="reading">
                Reading ({statusCounts.reading})
              </MenuItem>
              <MenuItem value="completed">
                Completed ({statusCounts.completed})
              </MenuItem>
            </Select>
          </FormControl>
        </Grid>
      </Grid>

      {/* Book Grid */}
      {filteredAndSortedBooks.length === 0 ? (
        <Alert severity="info" sx={{ mt: 4 }}>
          {bookshelf.length === 0
            ? 'Your bookshelf is empty. Add novels to start reading!'
            : 'No books match your current filters.'}
        </Alert>
      ) : (
        <Grid container spacing={3}>
          {filteredAndSortedBooks.map((item) => (
            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={item.id}>
              <BookshelfItemComponent
                item={item}
                onContinueReading={handleContinueReading}
                onDelete={handleDelete}
              />
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  )
}