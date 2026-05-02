'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  Box,
  CircularProgress,
  Alert,
  Container,
  Typography,
  Button,
  IconButton,
  AppBar,
  Toolbar,
  LinearProgress,
} from '@mui/material'
import { Reader } from '@/components/Reader'
import { useReadingProgress } from '@/hooks/useReadingProgress'

const ArrowBackIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
  </svg>
)

interface ChapterData {
  content: string
  source: string
}

interface ReadingPageClientProps {
  params: Promise<{ novelId: string; chapterNum: string }>
}

export default function ReadingPageClient({ params }: ReadingPageClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [resolvedParams, setResolvedParams] = useState<{
    novelId: string
    chapterNum: number
  } | null>(null)

  const sourceName = searchParams.get('source') || ''
  const chapterUrl = searchParams.get('chapterUrl') || ''
  const sourceConfigJson = searchParams.get('sourceConfig') || ''

  const [chapterData, setChapterData] = useState<ChapterData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const { saveProgress } = useReadingProgress(resolvedParams?.novelId || '')

  // Parse source config
  const sourceConfig = sourceConfigJson ? JSON.parse(sourceConfigJson) : null

  // Resolve params
  useEffect(() => {
    params.then((p) => {
      setResolvedParams({
        novelId: p.novelId,
        chapterNum: parseInt(p.chapterNum, 10),
      })
    })
  }, [params])

  // Fetch chapter content
  const fetchChapter = useCallback(async () => {
    if (!chapterUrl || !sourceConfig) {
      setError('缺少章节或书源参数')
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/chapter/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify({ chapterUrl, sourceConfig }),
      })

      const result = await response.json()

      if (!result.success) {
        setError(result.error || '获取章节内容失败')
        return
      }

      setChapterData(result.data)

      // Save reading progress
      if (resolvedParams?.novelId) {
        saveProgress({
          novelId: resolvedParams.novelId,
          novelTitle: resolvedParams.novelId, // Use ID as title since we don't have it
          chapterNum: resolvedParams.chapterNum,
          chapterTitle: `第${resolvedParams.chapterNum}章`,
        })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '请求失败')
    } finally {
      setLoading(false)
    }
  }, [chapterUrl, sourceConfig, resolvedParams, saveProgress])

  // Fetch chapter when ready
  useEffect(() => {
    if (resolvedParams && chapterUrl && sourceConfig) {
      fetchChapter()
    }
  }, [resolvedParams, chapterUrl, sourceConfig, fetchChapter])

  // Go back to novel detail
  const handleGoBack = useCallback(() => {
    if (!resolvedParams) return
    router.push(
      `/novel/${resolvedParams.novelId}?source=${encodeURIComponent(sourceName)}&bookUrl=${encodeURIComponent(sourceConfig?.bookSourceUrl || '')}&sourceConfig=${encodeURIComponent(sourceConfigJson)}`
    )
  }, [resolvedParams, sourceName, sourceConfig, sourceConfigJson, router])

  // Loading state
  if (loading || !resolvedParams) {
    return (
      <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
        <AppBar position="static">
          <Toolbar>
            <IconButton edge="start" onClick={handleGoBack}>
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="h6" sx={{ ml: 2 }}>
              第 {resolvedParams?.chapterNum || '?'} 章
            </Typography>
          </Toolbar>
        </AppBar>
        <LinearProgress />
        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            正在从书源获取章节内容...
          </Typography>
        </Box>
      </Box>
    )
  }

  // Error state
  if (error) {
    return (
      <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
        <AppBar position="static">
          <Toolbar>
            <IconButton edge="start" onClick={handleGoBack}>
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="h6">加载失败</Typography>
          </Toolbar>
        </AppBar>
        <Container sx={{ py: 4 }}>
          <Alert severity="error">{error}</Alert>
          <Button variant="outlined" onClick={fetchChapter} sx={{ mt: 2 }}>
            重试
          </Button>
        </Container>
      </Box>
    )
  }

  // No data
  if (!chapterData) {
    return (
      <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
        <AppBar position="static">
          <Toolbar>
            <IconButton edge="start" onClick={handleGoBack}>
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="h6">章节不存在</Typography>
          </Toolbar>
        </AppBar>
        <Container sx={{ py: 4 }}>
          <Alert severity="warning">章节内容获取失败</Alert>
        </Container>
      </Box>
    )
  }

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <AppBar position="static">
        <Toolbar>
          <IconButton edge="start" onClick={handleGoBack}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" sx={{ ml: 2 }}>
            第 {resolvedParams.chapterNum} 章 - {sourceName}
          </Typography>
        </Toolbar>
      </AppBar>
      <Reader
        content={chapterData.content}
        title={`第 ${resolvedParams.chapterNum} 章`}
        chapterNum={resolvedParams.chapterNum}
        nextChapter={resolvedParams.chapterNum + 1}
        prevChapter={resolvedParams.chapterNum > 1 ? resolvedParams.chapterNum - 1 : null}
        onNextChapter={() => {
          // Need to get next chapter URL from somewhere - for now just go back
          handleGoBack()
        }}
        onPrevChapter={() => {
          handleGoBack()
        }}
      />
    </Box>
  )
}