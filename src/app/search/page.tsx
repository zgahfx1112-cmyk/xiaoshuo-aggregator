'use client'

import { useState, useEffect, Suspense } from 'react'
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
import { useBookshelf } from '@/hooks/useBookshelf'

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

  useEffect(() => {
    if (query.trim()) {
      performSearch(query, page)
    }
  }, [query, page])

  const performSearch = async (q: string, p: number) => {
    setLoading(true)
    setError(null)
    setSelectedSourceId(null)

    const customSources = getEnabledCustomSources()

    if (customSources.length === 0) {
      setLoading(false)
      setError('请先在书源管理页导入并启用书源')
      return
    }

    try {
      const searchUrl = new URL('/api/search', window.location.origin)
      searchUrl.searchParams.set('query', q)
      searchUrl.searchParams.set('page', String(p))
      searchUrl.searchParams.set('customSources', JSON.stringify(customSources.map(s => ({
        sourceId: s.sourceId,
        sourceName: s.sourceName,
        config: s.config
      }))))

      const response = await fetch(searchUrl.toString())
      const data = await response.json()

      if (data.success) {
        setResults(data.data.novels)
        setTotal(data.data.total)
        setSourceStats(data.data.sources || [])
      } else {
        setError(data.error || '搜索失败')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '搜索失败')
    } finally {
      setLoading(false)
    }
  }

  // Filter results by selected source
  const filteredResults = selectedSourceId
    ? results.filter(r => r.sourceId === selectedSourceId)
    : results

  const displayResults = filteredResults
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
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
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
            {Math.ceil(displayTotal / 20) > 1 && (
              <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mt: 3 }}>
                {page > 1 && (
                  <Link href={buildPageUrl(page - 1)} passHref legacyBehavior>
                    <Paper sx={{ px: 2, py: 1, cursor: 'pointer' }}>上一页</Paper>
                  </Link>
                )}

                <Typography sx={{ py: 1 }}>
                  第 {page} / {Math.ceil(displayTotal / 20)} 页
                </Typography>

                {page < Math.ceil(displayTotal / 20) && (
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