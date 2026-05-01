'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import {
  Container,
  Paper,
  Box,
  Typography,
  Button,
  Chip,
  Divider,
  Rating as MuiRating,
  IconButton,
  Snackbar,
  Alert,
} from '@mui/material'
import ChapterList from '@/components/ChapterList'

// Inline SVG icons to avoid additional dependency
const ArrowBackIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
  </svg>
)

const MenuBookIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M21 5c-1.11-.35-2.33-.5-3.5-.5-1.95 0-4.05.4-5.5 1.5-1.45-1.1-3.55-1.5-5.5-1.5S2.45 4.9 1 6v14.65c0 .25.25.5.5.5.1 0 .15-.05.25-.05C3.1 20.45 5.05 20 6.5 20c1.95 0 4.05.4 5.5 1.5 1.35-.85 3.8-1.5 5.5-1.5 1.65 0 3.35.3 4.75 1.05.1.05.15.05.25.05.25 0 .5-.25.5-.5V6c-.6-.45-1.25-.75-2-1zm0 13.5c-1.1-.35-2.3-.5-3.5-.5-1.7 0-4.15.65-5.5 1.5V8c1.35-.85 3.8-1.5 5.5-1.5 1.2 0 2.4.15 3.5.5v11.5z" />
  </svg>
)

const BookmarkAddIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2zm4 3h-3v3h-2V6h-3V4h3V1h2v3h3v2z" />
  </svg>
)

const BookmarkAddedIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2zm0 14l-5-2.18L7 17V5h10v12z" />
  </svg>
)

interface NovelDetail {
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
  sources: { sourceName: string; sourceUrl: string; available: boolean }[]
}

interface NovelDetailPageProps {
  novel: NovelDetail
  chapters: { chapterNum: number; title: string }[]
  totalChapters?: number
}

const BOOKSHELF_KEY = 'xiaoshuo_bookshelf'

interface BookshelfItem {
  id: string
  title: string
  author: string
  cover: string
  addedAt: number
  lastReadChapter?: number
}

function getBookshelf(): BookshelfItem[] {
  if (typeof window === 'undefined') return []
  try {
    const stored = localStorage.getItem(BOOKSHELF_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

function saveBookshelf(items: BookshelfItem[]) {
  localStorage.setItem(BOOKSHELF_KEY, JSON.stringify(items))
}

export default function NovelDetailClient({ novel, chapters, totalChapters }: NovelDetailPageProps) {
  // Lazy initial state for bookshelf - only runs once on client mount
  const [inBookshelf, setInBookshelf] = useState(() => {
    if (typeof window === 'undefined') return false
    const bookshelf = getBookshelf()
    return bookshelf.some((item) => item.id === novel.id)
  })
  const [snackbar, setSnackbar] = useState<{
    open: boolean
    message: string
    severity: 'success' | 'info' | 'error'
  }>({
    open: false,
    message: '',
    severity: 'success',
  })

  const toggleBookshelf = useCallback(() => {
    const bookshelf = getBookshelf()
    const existingIndex = bookshelf.findIndex((item) => item.id === novel.id)

    if (existingIndex >= 0) {
      // Remove from bookshelf
      bookshelf.splice(existingIndex, 1)
      saveBookshelf(bookshelf)
      setInBookshelf(false)
      setSnackbar({
        open: true,
        message: 'Removed from bookshelf',
        severity: 'info',
      })
    } else {
      // Add to bookshelf
      bookshelf.push({
        id: novel.id,
        title: novel.title,
        author: novel.author,
        cover: novel.cover,
        addedAt: Date.now(),
      })
      saveBookshelf(bookshelf)
      setInBookshelf(true)
      setSnackbar({
        open: true,
        message: 'Added to bookshelf',
        severity: 'success',
      })
    }
  }, [novel])

  const formatWordCount = (count: number) => {
    if (count >= 10000) {
      return `${(count / 10000).toFixed(1)}万字`
    }
    return `${count}字`
  }

  return (
    <Container maxWidth="md" sx={{ py: 3 }}>
      {/* Back button */}
      <Box sx={{ mb: 2 }}>
        <IconButton component={Link} href="/" aria-label="back to home" size="large">
          <ArrowBackIcon />
        </IconButton>
      </Box>

      {/* Novel header */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', sm: 'row' } }}>
          {/* Cover image */}
          <Box
            component="img"
            src={novel.cover || '/placeholder-cover.png'}
            alt={novel.title}
            sx={{
              width: { xs: 120, sm: 160 },
              height: { xs: 160, sm: 220 },
              objectFit: 'cover',
              borderRadius: 1,
              flexShrink: 0,
              bgcolor: 'grey.200',
            }}
          />

          {/* Novel info */}
          <Box sx={{ flex: 1 }}>
            <Typography variant="h4" component="h1" gutterBottom>
              {novel.title}
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'row', gap: 1, alignItems: 'center', mb: 1 }}>
              <Typography variant="body1" color="text.secondary">
                {novel.author}
              </Typography>
              <Chip
                label={novel.status}
                size="small"
                color={novel.status === '完结' ? 'success' : 'primary'}
              />
              <Chip label={novel.category} size="small" variant="outlined" />
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'row', gap: 2, alignItems: 'center', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <MuiRating value={novel.rating / 2} precision={0.5} readOnly size="small" />
                <Typography variant="body2" color="text.secondary">
                  {novel.rating.toFixed(1)}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                {formatWordCount(novel.wordCount)}
              </Typography>
            </Box>

            {/* Tags */}
            {novel.tags.length > 0 && (
              <Box sx={{ display: 'flex', flexDirection: 'row', gap: 0.5, flexWrap: 'wrap', mb: 2 }}>
                {novel.tags.map((tag, index) => (
                  <Chip key={index} label={tag} size="small" sx={{ mb: 0.5 }} />
                ))}
              </Box>
            )}

            {/* Action buttons */}
            <Box sx={{ display: 'flex', flexDirection: 'row', gap: 1 }}>
              {chapters.length > 0 && (
                <Button
                  variant="contained"
                  startIcon={<MenuBookIcon />}
                  component={Link}
                  href={`/read/${novel.id}/1`}
                >
                  Start Reading
                </Button>
              )}
              <Button
                variant={inBookshelf ? 'contained' : 'outlined'}
                color={inBookshelf ? 'success' : 'primary'}
                startIcon={inBookshelf ? <BookmarkAddedIcon /> : <BookmarkAddIcon />}
                onClick={toggleBookshelf}
              >
                {inBookshelf ? 'In Bookshelf' : 'Add to Bookshelf'}
              </Button>
            </Box>
          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Description */}
        <Typography variant="h6" gutterBottom>
          Description
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            whiteSpace: 'pre-wrap',
            maxHeight: 200,
            overflow: 'auto',
          }}
        >
          {novel.description || 'No description available.'}
        </Typography>
      </Paper>

      {/* Chapter list */}
      <Paper sx={{ p: 2 }}>
        <ChapterList
          novelId={novel.id}
          initialChapters={chapters}
          totalChapters={totalChapters ?? chapters.length}
        />
      </Paper>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  )
}