'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  Box,
  CircularProgress,
  Alert,
  Container,
  Typography,
  Button,
} from '@mui/material'
import { ArrowBack, Home } from '@mui/icons-material'
import { Reader } from '@/components/Reader'
import { useReadingProgress } from '@/hooks/useReadingProgress'

interface ChapterData {
  content: string
  source: string
  nextChapter: number | null
  prevChapter: number | null
  title: string
}

interface NovelInfo {
  id: string
  title: string
}

export default function ReadingPage() {
  const params = useParams()
  const router = useRouter()
  const novelId = params?.novelId as string
  const chapterNum = parseInt(params?.chapterNum as string, 10)

  const [chapterData, setChapterData] = useState<ChapterData | null>(null)
  const [novelInfo, setNovelInfo] = useState<NovelInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const { saveProgress } = useReadingProgress(novelId)

  // Fetch chapter content
  const fetchChapter = useCallback(async () => {
    if (!novelId || isNaN(chapterNum)) {
      setError('Invalid chapter URL')
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/chapter/${novelId}/${chapterNum}`)
      const result = await response.json()

      if (!result.success) {
        setError(result.error || 'Failed to load chapter')
        return
      }

      setChapterData(result.data)

      // Save reading progress
      if (novelInfo?.title) {
        saveProgress({
          novelId,
          novelTitle: novelInfo.title,
          chapterNum,
          chapterTitle: result.data.title,
        })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load chapter')
    } finally {
      setLoading(false)
    }
  }, [novelId, chapterNum, novelInfo?.title, saveProgress])

  // Fetch novel info
  useEffect(() => {
    if (!novelId) return

    const fetchNovelInfo = async () => {
      try {
        const response = await fetch(`/api/novel/${novelId}`)
        const result = await response.json()

        if (result.success) {
          setNovelInfo({
            id: novelId,
            title: result.data.title,
          })
        }
      } catch (err) {
        console.error('Failed to fetch novel info:', err)
      }
    }

    fetchNovelInfo()
  }, [novelId])

  // Fetch chapter when params change
  useEffect(() => {
    fetchChapter()
  }, [fetchChapter])

  // Navigate to next chapter
  const handleNextChapter = useCallback(() => {
    if (chapterData?.nextChapter !== null) {
      router.push(`/read/${novelId}/${chapterData?.nextChapter}`)
    }
  }, [chapterData?.nextChapter, novelId, router])

  // Navigate to prev chapter
  const handlePrevChapter = useCallback(() => {
    if (chapterData?.prevChapter !== null) {
      router.push(`/read/${novelId}/${chapterData?.prevChapter}`)
    }
  }, [chapterData?.prevChapter, novelId, router])

  // Go back to novel detail
  const handleGoBack = useCallback(() => {
    router.push(`/novel/${novelId}`)
  }, [novelId, router])

  // Loading state
  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          gap: 2,
        }}
      >
        <CircularProgress />
        <Typography variant="body2" color="text.secondary">
          Loading chapter...
        </Typography>
      </Box>
    )
  }

  // Error state
  if (error) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button startIcon={<ArrowBack />} onClick={handleGoBack}>
            Back to Novel
          </Button>
          <Button startIcon={<Home />} onClick={() => router.push('/')}>
            Home
          </Button>
        </Box>
      </Container>
    )
  }

  // No data
  if (!chapterData) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="warning">Chapter not found</Alert>
        <Button startIcon={<ArrowBack />} onClick={handleGoBack} sx={{ mt: 2 }}>
          Back to Novel
        </Button>
      </Container>
    )
  }

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Reader
        content={chapterData.content}
        title={chapterData.title}
        chapterNum={chapterNum}
        nextChapter={chapterData.nextChapter}
        prevChapter={chapterData.prevChapter}
        onNextChapter={handleNextChapter}
        onPrevChapter={handlePrevChapter}
      />
    </Box>
  )
}