'use client'

import { useState, useEffect, Suspense, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  Box,
  Container,
  TextField,
  InputAdornment,
  IconButton,
  Typography,
  Grid,
  Alert,
  Paper,
  CircularProgress,
  Card,
  CardContent,
  CardMedia,
  CardActionArea,
  Chip,
  Tabs,
  Tab,
  LinearProgress,
} from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import Link from 'next/link'
import { useBookshelf, UserSourceConfig } from '@/hooks/useBookshelf'

interface SearchResult {
  title: string
  author: string
  cover: string
  bookUrl: string
  sourceName: string
  sourceId?: string
}

interface SourceStat {
  id: string
  name: string
  resultCount: number
  status: 'pending' | 'searching' | 'done' | 'error'
  error?: string
}

function SearchResultsContent() {
  const searchParams = useSearchParams()
  const query = searchParams.get('query') || ''
  const page = parseInt(searchParams.get('page') || '1', 10)

  const { getEnabledCustomSources } = useBookshelf()

  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState(query)
  const [sourceStats, setSourceStats] = useState<SourceStat[]>([])
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null)
  const [searchProgress, setSearchProgress] = useState({ completed: 0, total: 0 })
  const [foundCount, setFoundCount] = useState(0)

  const abortControllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (query.trim()) {
      performSearch(query)
    }
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [query])

  const performSearch = async (q: string) => {
    // Cancel previous search
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    abortControllerRef.current = new AbortController()
    const signal = abortControllerRef.current.signal

    setLoading(true)
    setError(null)
    setSelectedSourceId(null)
    setResults([])
    setFoundCount(0)

    const customSources = getEnabledCustomSources()

    if (customSources.length === 0) {
      setLoading(false)
      setError('请先在书源管理页导入并启用书源')
      return
    }

    // Initialize all sources as pending
    const initialStats: SourceStat[] = customSources.map(s => ({
      id: s.sourceId,
      name: s.sourceName,
      resultCount: 0,
      status: 'pending'
    }))
    setSourceStats(initialStats)
    setSearchProgress({ completed: 0, total: customSources.length })

    // Search each source individually with parallel requests
    const timeout = 8000 // 8s timeout per source

    const searchPromises = customSources.map(async (source, index) => {
      if (signal.aborted) return null

      // Update status to searching
      setSourceStats(prev => prev.map(s =>
        s.id === source.sourceId ? { ...s, status: 'searching' } : s
      ))

      try {
        const response = await fetch('/api/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
          body: JSON.stringify({
            query: q,
            source: {
              sourceId: source.sourceId,
              sourceName: source.sourceName,
              config: source.config
            },
            timeout
          }),
          signal
        })

        if (signal.aborted) return null

        const data = await response.json()

        if (data.success && data.data.novels.length > 0) {
          // Update results immediately
          setResults(prev => [...prev, ...data.data.novels])
          setFoundCount(prev => prev + data.data.novels.length)

          // Update source stat
          setSourceStats(prev => prev.map(s =>
            s.id === source.sourceId
              ? { ...s, resultCount: data.data.novels.length, status: 'done' }
              : s
          ))

          setSearchProgress(prev => ({ ...prev, completed: prev.completed + 1 }))

          return { sourceId: source.sourceId, results: data.data.novels }
        } else {
          // No results
          setSourceStats(prev => prev.map(s =>
            s.id === source.sourceId
              ? { ...s, resultCount: 0, status: 'done', error: data.error || '无结果' }
              : s
          ))
          setSearchProgress(prev => ({ ...prev, completed: prev.completed + 1 }))
          return null
        }
      } catch (err) {
        if (signal.aborted) return null

        const errorMsg = err instanceof Error && err.name === 'AbortError'
          ? '已取消'
          : err instanceof Error ? err.message : '请求失败'

        setSourceStats(prev => prev.map(s =>
          s.id === source.sourceId
            ? { ...s, resultCount: 0, status: 'error', error: errorMsg }
            : s
        ))
        setSearchProgress(prev => ({ ...prev, completed: prev.completed + 1 }))
        return null
      }
    })

    // Wait for all searches to complete
    await Promise.all(searchPromises)

    setLoading(false)

    // Check if any results found
    const finalResults = results.length
    if (finalResults === 0 && !signal.aborted) {
      setError('所有书源均无结果')
    }
  }

  // Filter results by selected source
  const filteredResults = selectedSourceId
    ? results.filter(r => r.sourceId === selectedSourceId)
    : results

  // Client-side pagination
  const pageSize = 20
  const startIndex = (page - 1) * pageSize
  const displayResults = filteredResults.slice(startIndex, startIndex + pageSize)
  const displayTotal = filteredResults.length

  // Count available sources (with results)
  const availableSources = sourceStats.filter(s => s.resultCount > 0).length

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      window.location.href = `/search?query=${encodeURIComponent(searchQuery.trim())}`
    }
  }

  const buildPageUrl = (pageNum: number) => {
    return `/search?query=${encodeURIComponent(query)}&page=${pageNum}`
  }

  return (
    <Box sx={{ pb: 7, bgcolor: '#f5f5f5' }}>
      <Container maxWidth="lg" sx={{ py: 2 }}>
        {/* 搜索框 */}
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
          <Box component="form" onSubmit={handleSearch} sx={{ width: '100%', maxWidth: 600 }}>
            <TextField
              fullWidth
              size="small"
              placeholder="搜索小说..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              sx={{ bgcolor: 'white' }}
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton type="submit" edge="end" color="primary">
                        <SearchIcon />
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />
          </Box>
        </Box>

        {/* 搜索进度 */}
        {loading && (
          <Box sx={{ mb: 2 }}>
            <LinearProgress
              variant="determinate"
              value={(searchProgress.completed / searchProgress.total) * 100}
              sx={{ mb: 1 }}
            />
            <Typography variant="body2" color="text.secondary">
              搜索中... {searchProgress.completed}/{searchProgress.total} 个书源，已找到 {foundCount} 条结果
            </Typography>
          </Box>
        )}

        {/* 可用书源统计 */}
        {!loading && availableSources > 0 && (
          <Alert severity="success" sx={{ mb: 2 }}>
            找到 {availableSources} 个可用书源，共 {results.length} 条结果
          </Alert>
        )}

        {/* 错误提示 */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* 无书源提示 */}
        {!loading && !error && query && results.length === 0 && sourceStats.length === 0 && (
          <Alert severity="info" sx={{ mb: 2 }}>
            请先在书源管理页导入并启用书源
          </Alert>
        )}

        {/* 书源状态列表 */}
        {sourceStats.length > 0 && (
          <Paper sx={{ p: 2, mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              书源状态 ({availableSources}/{sourceStats.length} 可用)
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {sourceStats.map(stat => (
                <Chip
                  key={stat.id}
                  label={`${stat.name} (${stat.resultCount})`}
                  size="small"
                  color={
                    stat.status === 'searching' ? 'primary' :
                    stat.status === 'done' && stat.resultCount > 0 ? 'success' :
                    stat.status === 'error' ? 'error' : 'default'
                  }
                  variant={stat.status === 'searching' ? 'outlined' : 'filled'}
                  onClick={() => setSelectedSourceId(
                    selectedSourceId === stat.id ? null : stat.id
                  )}
                  sx={{ cursor: 'pointer' }}
                />
              ))}
            </Box>
          </Paper>
        )}

        {/* 搜索结果 */}
        {!loading && !error && results.length > 0 && (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              找到 {displayTotal} 条结果 {selectedSourceId ? `(来自 ${sourceStats.find(s => s.id === selectedSourceId)?.name})` : ''} for "{query}"
            </Typography>

            <Grid container spacing={2}>
              {displayResults.map((novel, index) => (
                <Grid key={`${novel.title}-${novel.sourceId}-${index}`} size={{ xs: 6, sm: 4, md: 3, lg: 2 }}>
                  <Card sx={{ height: '100%' }}>
                    <CardActionArea
                      component={Link}
                      href={`/novel/${encodeURIComponent(novel.title)}?source=${encodeURIComponent(novel.sourceName)}&bookUrl=${encodeURIComponent(novel.bookUrl)}`}
                    >
                      <CardMedia
                        component="img"
                        height="140"
                        image={novel.cover || '/placeholder.png'}
                        alt={novel.title}
                        sx={{ objectFit: 'cover', bgcolor: '#e0e0e0' }}
                      />
                      <CardContent sx={{ py: 1 }}>
                        <Typography variant="subtitle2" noWrap sx={{ fontWeight: 'bold' }}>
                          {novel.title}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" noWrap>
                          {novel.author || '未知作者'}
                        </Typography>
                        <Chip label={novel.sourceName} size="small" sx={{ mt: 1 }} />
                      </CardContent>
                    </CardActionArea>
                  </Card>
                </Grid>
              ))}
            </Grid>

            {/* 分页 */}
            {Math.ceil(displayTotal / pageSize) > 1 && (
              <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mt: 3 }}>
                {page > 1 && (
                  <Link href={buildPageUrl(page - 1)} passHref legacyBehavior>
                    <Paper sx={{ px: 2, py: 1, cursor: 'pointer' }}>上一页</Paper>
                  </Link>
                )}

                <Typography sx={{ py: 1 }}>
                  第 {page} / {Math.ceil(displayTotal / pageSize)} 页
                </Typography>

                {page < Math.ceil(displayTotal / pageSize) && (
                  <Link href={buildPageUrl(page + 1)} passHref legacyBehavior>
                    <Paper sx={{ px: 2, py: 1, cursor: 'pointer' }}>下一页</Paper>
                  </Link>
                )}
              </Box>
            )}
          </>
        )}
      </Container>
    </Box>
  )
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    }>
      <SearchResultsContent />
    </Suspense>
  )
}