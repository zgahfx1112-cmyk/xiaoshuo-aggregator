'use client'

import { useState } from 'react'
import {
  Container,
  Box,
  TextField,
  InputAdornment,
  IconButton,
  Typography,
  Paper,
} from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import HotList from '@/components/HotList'

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('')

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      // TODO: Implement search navigation
      console.log('Search:', searchQuery)
    }
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'grey.50' }}>
      {/* Header with Search */}
      <Paper
        elevation={0}
        sx={{
          bgcolor: 'primary.main',
          color: 'white',
          py: 4,
          mb: 3,
        }}
      >
        <Container maxWidth="lg">
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold' }}>
            小说搜索
          </Typography>
          <Typography variant="body2" sx={{ mb: 3, opacity: 0.9 }}>
            聚合多源小说搜索，一键查找热门小说
          </Typography>
          <Box
            component="form"
            onSubmit={handleSearch}
            sx={{
              display: 'flex',
              gap: 1,
            }}
          >
            <TextField
              fullWidth
              placeholder="输入小说名称、作者名搜索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              sx={{
                bgcolor: 'white',
                borderRadius: 2,
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
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
        </Container>
      </Paper>

      {/* Hot List Section */}
      <Box>
        <HotList />
      </Box>
    </Box>
  )
}