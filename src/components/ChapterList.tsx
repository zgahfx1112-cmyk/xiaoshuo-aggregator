'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import {
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Collapse,
  Button,
  Typography,
  Box,
  CircularProgress,
  Paper,
} from '@mui/material'

// Inline SVG icons to avoid additional dependency
const ExpandMoreIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M16.59 8.59L12 13.17 7.41 8.59 6 10l6 6 6-6z" />
  </svg>
)

const ExpandLessIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 8l-6 6 1.41 1.41L12 10.83l4.59 4.58L18 14z" />
  </svg>
)

interface Chapter {
  chapterNum: number
  title: string
}

interface ChapterListProps {
  novelId: string
  initialChapters: Chapter[]
  totalChapters: number
}

export default function ChapterList({
  novelId,
  initialChapters,
  totalChapters,
}: ChapterListProps) {
  const [chapters, setChapters] = useState<Chapter[]>(initialChapters)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState(true)
  const pageSize = 50
  const hasMore = chapters.length < totalChapters

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return

    setLoading(true)
    try {
      const nextPage = page + 1
      const response = await fetch(
        `/api/novel/${novelId}/chapters?page=${nextPage}&pageSize=${pageSize}`
      )
      const data = await response.json()

      if (data.success && data.data?.chapters) {
        setChapters((prev) => [...prev, ...data.data.chapters])
        setPage(nextPage)
      }
    } catch (error) {
      console.error('Failed to load more chapters:', error)
    } finally {
      setLoading(false)
    }
  }, [loading, hasMore, page, novelId])

  const toggleExpand = () => {
    setExpanded(!expanded)
  }

  if (chapters.length === 0) {
    return (
      <Paper sx={{ p: 2, textAlign: 'center' }}>
        <Typography color="text.secondary">No chapters available</Typography>
      </Paper>
    )
  }

  return (
    <Box>
      <ListItemButton
        onClick={toggleExpand}
        sx={{
          borderRadius: 1,
          mb: 1,
          bgcolor: 'action.hover',
        }}
      >
        <ListItemText
          primary={
            <Typography variant="h6" component="span">
              Chapter List ({totalChapters} chapters)
            </Typography>
          }
        />
        {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
      </ListItemButton>

      <Collapse in={expanded} timeout="auto" unmountOnExit>
        <List
          sx={{
            maxHeight: 500,
            overflowY: 'auto',
            border: 1,
            borderColor: 'divider',
            borderRadius: 1,
          }}
        >
          {chapters.map((chapter) => (
            <ListItem
              key={chapter.chapterNum}
              disablePadding
              divider
            >
              <ListItemButton
                component={Link}
                href={`/read/${novelId}/${chapter.chapterNum}`}
                sx={{
                  '&:hover': {
                    bgcolor: 'action.selected',
                  },
                }}
              >
                <ListItemText
                  primary={
                    <Typography variant="body2">
                      <Box component="span" sx={{ color: 'text.secondary', mr: 1 }}>
                        {chapter.chapterNum}.
                      </Box>
                      {chapter.title}
                    </Typography>
                  }
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>

        {hasMore && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
            <Button
              variant="outlined"
              onClick={loadMore}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={16} /> : null}
            >
              {loading ? 'Loading...' : 'Load More'}
            </Button>
          </Box>
        )}
      </Collapse>
    </Box>
  )
}