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
} from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import Link from 'next/link'

interface SearchResult {
  title: string
  author: string
  cover: string
  bookUrl: string
  sourceName: string
}

function SearchResultsContent() {
  const searchParams = useSearchParams()
  const query = searchParams.get('query') || ''
  const page = parseInt(searchParams.get('page') || '1', 10)
  const customSources = searchParams.get('customSources') || ''

  const [results, setResults] = useState<SearchResult[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState(query)

  useEffect(() => {
    if (query.trim()) {
      performSearch(query, page, customSources)
    }
  }, [query, page, customSources])

  const performSearch = async (q: string, p: number, sources: string) => {
    setLoading(true)
    setError(null)

    try {
      const searchUrl = new URL('/api/search', window.location.origin)
      searchUrl.searchParams.set('query', q)
      searchUrl.searchParams.set('page', String(p))
      if (sources) {
        searchUrl.searchParams.set('customSources', sources)
      }

      const response = await fetch(searchUrl.toString())
      const data = await response.json()

      if (data.success) {
        setResults(data.data.novels)
        setTotal(data.data.total)
      } else {
        setError(data.error || '搜索失败')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '搜索失败')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      const params = new URLSearchParams()
      params.set('query', searchQuery.trim())
      if (customSources) params.set('customSources', customSources)
      window.location.href = `/search?${params.toString()}`
    }
  }

  const totalPages = Math.ceil(total / 20)

  const buildPageUrl = (pageNum: number) => {
    const params = new URLSearchParams()
    params.set('query', query)
    params.set('page', String(pageNum))
    if (customSources) params.set('customSources', customSources)
    return `/search?${params.toString()}`
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
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              找到 {total} 条结果 for "{query}"
            </Typography>

            <Grid container spacing={2}>
              {results.map((novel, index) => (
                <Grid key={`${novel.title}-${index}`} size={{ xs: 6, sm: 4, md: 3, lg: 2 }}>
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
            {totalPages > 1 && (
              <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mt: 3 }}>
                {page > 1 && (
                  <Link href={buildPageUrl(page - 1)} passHref legacyBehavior>
                    <Paper sx={{ px: 2, py: 1, cursor: 'pointer' }}>上一页</Paper>
                  </Link>
                )}

                <Typography sx={{ py: 1 }}>
                  第 {page} / {totalPages} 页
                </Typography>

                {page < totalPages && (
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