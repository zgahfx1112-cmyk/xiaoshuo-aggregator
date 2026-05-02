'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Container,
  Paper,
  Box,
  Typography,
  Button,
  Chip,
  Divider,
  IconButton,
  Snackbar,
  Alert,
  CircularProgress,
  LinearProgress,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
} from '@mui/material'
import { useBookshelf, BookshelfItem, SourceInfo } from '@/hooks/useBookshelf'

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

interface NovelData {
  title: string
  author: string
  description: string
  cover: string
  chapters: Array<{ title: string; url: string }>
  sourceName: string
}

export default function NovelDetailClient() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { addToBookshelf, removeFromBookshelf, isInBookshelf } = useBookshelf()

  const sourceName = searchParams.get('source') || ''
  const bookUrl = searchParams.get('bookUrl') || ''
  const sourceConfigJson = searchParams.get('sourceConfig') || ''

  const [novel, setNovel] = useState<NovelData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [snackbar, setSnackbar] = useState<{
    open: boolean
    message: string
    severity: 'success' | 'info' | 'error'
  }>({
    open: false,
    message: '',
    severity: 'success',
  })

  // Parse source config
  const sourceConfig = sourceConfigJson ? JSON.parse(sourceConfigJson) : null
  const novelId = novel ? encodeURIComponent(novel.title) : ''

  // Check if in bookshelf
  const inBookshelf = novel ? isInBookshelf(novelId) : false

  // Fetch novel detail
  useEffect(() => {
    if (!bookUrl || !sourceConfig) {
      setError('缺少书源参数')
      setLoading(false)
      return
    }

    const fetchNovel = async () => {
      try {
        const response = await fetch('/api/novel/detail', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
          body: JSON.stringify({ bookUrl, sourceConfig }),
        })

        const data = await response.json()

        if (data.success) {
          setNovel(data.data)
        } else {
          setError(data.error || '获取小说详情失败')
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : '请求失败')
      } finally {
        setLoading(false)
      }
    }

    fetchNovel()
  }, [bookUrl, sourceConfig])

  const handleToggleBookshelf = useCallback(() => {
    if (!novel || !sourceConfig) return

    const id = encodeURIComponent(novel.title)

    if (inBookshelf) {
      removeFromBookshelf(id)
      setSnackbar({ open: true, message: '已从书架移除', severity: 'info' })
    } else {
      const primarySource: SourceInfo = {
        sourceId: sourceConfig.bookSourceUrl || sourceName,
        sourceName,
        bookUrl,
        sourceConfig,
      }

      const item: Omit<BookshelfItem, 'addedAt' | 'lastReadAt'> = {
        id,
        title: novel.title,
        author: novel.author,
        cover: novel.cover,
        lastReadChapter: 0,
        totalChapters: novel.chapters.length,
        primarySource,
        chapterUrls: novel.chapters.map((ch, idx) => ({
          chapterNum: idx + 1,
          title: ch.title,
          url: ch.url,
        })),
      }

      addToBookshelf(item)
      setSnackbar({ open: true, message: '已加入书架', severity: 'success' })
    }
  }, [novel, sourceConfig, sourceName, bookUrl, inBookshelf, addToBookshelf, removeFromBookshelf])

  const handleChapterClick = (chapterUrl: string, chapterNum: number) => {
    if (!novel) return
    router.push(
      `/read/${encodeURIComponent(novel.title)}/${chapterNum}?source=${encodeURIComponent(sourceName)}&chapterUrl=${encodeURIComponent(chapterUrl)}&sourceConfig=${encodeURIComponent(sourceConfigJson)}`
    )
  }

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ py: 3 }}>
        <Box sx={{ mb: 2 }}>
          <IconButton component={Link} href="/" aria-label="back to home" size="large">
            <ArrowBackIcon />
          </IconButton>
        </Box>
        <LinearProgress />
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          正在从书源获取小说详情...
        </Typography>
      </Container>
    )
  }

  if (error || !novel) {
    return (
      <Container maxWidth="md" sx={{ py: 3 }}>
        <Box sx={{ mb: 2 }}>
          <IconButton component={Link} href="/" aria-label="back to home" size="large">
            <ArrowBackIcon />
          </IconButton>
        </Box>
        <Alert severity="error">{error || '获取小说详情失败'}</Alert>
      </Container>
    )
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
                {novel.author || '未知作者'}
              </Typography>
              <Chip label={sourceName} size="small" color="primary" variant="outlined" />
            </Box>

            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              共 {novel.chapters.length} 章
            </Typography>

            {/* Action buttons */}
            <Box sx={{ display: 'flex', flexDirection: 'row', gap: 1 }}>
              {novel.chapters.length > 0 && (
                <Button
                  variant="contained"
                  startIcon={<MenuBookIcon />}
                  onClick={() => handleChapterClick(novel.chapters[0].url, 1)}
                >
                  开始阅读
                </Button>
              )}
              <Button
                variant={inBookshelf ? 'contained' : 'outlined'}
                color={inBookshelf ? 'success' : 'primary'}
                startIcon={inBookshelf ? <BookmarkAddedIcon /> : <BookmarkAddIcon />}
                onClick={handleToggleBookshelf}
              >
                {inBookshelf ? '已在书架' : '加入书架'}
              </Button>
            </Box>
          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Description */}
        <Typography variant="h6" gutterBottom>
          简介
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
          {novel.description || '暂无简介'}
        </Typography>
      </Paper>

      {/* Chapter list */}
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          章节列表 ({novel.chapters.length} 章)
        </Typography>
        <List>
          {novel.chapters.slice(0, 50).map((chapter, index) => (
            <ListItem key={chapter.url} disablePadding>
              <ListItemButton onClick={() => handleChapterClick(chapter.url, index + 1)}>
                <ListItemText primary={chapter.title} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
        {novel.chapters.length > 50 && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            仅显示前 50 章，完整章节列表请加入书架后查看
          </Typography>
        )}
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