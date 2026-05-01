'use client'

import { useState } from 'react'
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
} from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import { useRouter } from 'next/navigation'
import { useBookshelf } from '@/hooks/useBookshelf'
import BookshelfItemComponent from '@/components/BookshelfItem'

export default function Home() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const { bookshelf, removeFromBookshelf, getEnabledSourceIds, getEnabledCustomSources } = useBookshelf()

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      // 构建搜索URL，包含用户启用的书源配置
      const enabledIds = getEnabledSourceIds()
      const customSources = getEnabledCustomSources()

      const params = new URLSearchParams()
      params.set('query', searchQuery.trim())

      // 如果有用户自定义书源，传递给搜索API
      if (customSources.length > 0) {
        params.set('customSources', JSON.stringify(customSources.map(s => ({
          sourceId: s.sourceId,
          sourceName: s.sourceName,
          config: s.config
        }))))
      }

      router.push(`/search?${params.toString()}`)
    }
  }

  return (
    <Box sx={{ pb: 7 }}>
      {/* 顶部搜索框 */}
      <Paper
        elevation={0}
        sx={{
          bgcolor: 'primary.main',
          color: 'white',
          py: 2,
          px: 2,
        }}
      >
        <Box component="form" onSubmit={handleSearch}>
          <TextField
            fullWidth
            size="small"
            placeholder="搜索小说..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{
              bgcolor: 'white',
              borderRadius: 1,
              '& .MuiOutlinedInput-root': {
                borderRadius: 1,
              },
            }}
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
      </Paper>

      {/* 书架内容 */}
      <Container maxWidth="lg" sx={{ py: 2 }}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
          我的书架
        </Typography>

        {bookshelf.length === 0 ? (
          <Alert severity="info" sx={{ mt: 2 }}>
            书架为空，去发现页找小说吧
          </Alert>
        ) : (
          <Grid container spacing={2}>
            {bookshelf.map((item) => (
              <Grid key={item.id} size={{ xs: 6, sm: 4, md: 3 }}>
                <BookshelfItemComponent
                  item={item}
                  onContinueReading={(id) => router.push(`/novel/${id}`)}
                  onDelete={removeFromBookshelf}
                />
              </Grid>
            ))}
          </Grid>
        )}
      </Container>
    </Box>
  )
}