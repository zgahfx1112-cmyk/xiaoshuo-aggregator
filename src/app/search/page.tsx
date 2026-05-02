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
}

function SearchResultsContent() {
  const searchParams = useSearchParams()
  const query = searchParams.get('query') || ''
  const page = parseInt(searchParams.get('page') || '1', 10)

  const { getEnabledCustomSources } = useBookshelf()

  const [results, setResults] = useState<SearchResult[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState(query)
  const [sourceStats, setSourceStats] = useState<SourceStat[]>([])
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null)
  const [searchProgress, setSearchProgress] = useState<{ current: number; total: number } | null>(null)

  const abortControllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (query.trim()) {
      performSearch(query, page)
    }
    // Cleanup: cancel pending requests on unmount
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [query, page])

  const performSearch = async (q: string, p: number) => {
    // Cancel previous search if still running
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    abortControllerRef.current = new AbortController()
    const signal = abortControllerRef.current.signal

    setLoading(true)
    setError(null)
    setSelectedSourceId(null)
    setResults([])
    setTotal(0)
    setSourceStats([])

    const customSources = getEnabledCustomSources()

    if (customSources.length === 0) {
      setLoading(false)
      setError('请先在书源管理页导入并启用书源')
      return
    }

    // Batch search: 5 sources per batch
    const batchSize = 5
    const batches: UserSourceConfig[][] = []
    for (let i = 0; i < customSources.length; i += batchSize) {
      batches.push(customSources.slice(i, i + batchSize))
    }

    const allResults: SearchResult[] = []
    const allSourceStats: SourceStat[] = []

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      // Check if request was aborted
      if (signal.aborted) break

      setSearchProgress({ current: batchIndex + 1, total: batches.length })

      const batch = batches[batchIndex]

      try {
        const response = await fetch('/api/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
          body: JSON.stringify({
            query: q,
            page: 1,
            customSources: batch.map(s => ({
              sourceId: s.sourceId,
              sourceName: s.sourceName,
              config: s.config
            }))
          }),
          signal
        })

        if (signal.aborted) break

        const data = await response.json()

        if (data.success) {
          allResults.push(...data.data.novels)
          allSourceStats.push(...data.data.sources)

          // Update results incrementally
          setResults([...allResults])
          setTotal(allResults.length)
          setSourceStats([...allSourceStats])
        }
      } catch (err) {
        // Ignore abort errors
        if (err instanceof Error && err.name === 'AbortError') break
        // Batch failed, continue to next
      }

      // Small delay between batches to avoid overwhelming server
      if (batchIndex < batches.length - 1 && !signal.aborted) {
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }

    setSearchProgress(null)
    setLoading(false)

    if (!signal.aborted && allResults.length === 0) {
      setError('所有书源均无结果')
    }
  }

  // Filter results by selected source
  const filteredResults = selectedSourceId
    ? results.filter(r => r.sourceId === selectedSourceId)
    : results

  // Client-side pagination (slice for current page)
  const pageSize = 20
  const startIndex = (page - 1) * pageSize
  const displayResults = filteredResults.slice(startIndex, startIndex + pageSize)
  const displayTotal = filteredResults.length

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

        {/* 错误提示 */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* 无书源提示 */}
        {!loading && !error && query && total === 0 && (
          <Alert severity="info" sx={{ mb: 2 }}>
            请先在书源管理页导入并启用书源
          </Alert>
        )}

        {/* 加载状态 */}
        {loading && (
          <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', py: 4 }}>
            <CircularProgress />
            {searchProgress && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                搜索中... 第 {searchProgress.current}/{searchProgress.total} 批书源
              </Typography>
            )}
          </Box>
        )}

        {/* 搜索结果 */}
        {!loading && !error && results.length > 0 && (
          <>
            {/* 书源统计tabs */}
            {sourceStats.length > 1 && (
              <Box sx={{ mb: 2 }}>
                <Tabs
                  value={selectedSourceId || 'all'}
                  onChange={(_, newValue) => setSelectedSourceId(newValue === 'all' ? null : newValue)}
                  variant="scrollable"
                  scrollButtons="auto"
                >
                  <Tab value="all" label={`全部 (${total})`} />
                  {sourceStats.map(stat => (
                    <Tab
                      key={stat.id}
                      value={stat.id}
                      label={`${stat.name} (${stat.resultCount})`}
                      disabled={stat.resultCount === 0}
                    />
                  ))}
                </Tabs>
              </Box>
            )}

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