'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Box,
  Tabs,
  Tab,
  Grid,
  Card,
  CardContent,
  CardMedia,
  Typography,
  Rating,
  Chip,
  Skeleton,
  Container,
  CardActionArea,
} from '@mui/material'

interface HotNovel {
  id: string
  title: string
  author: string
  cover: string
  category: string
  status: string
  wordCount: number
  rating: number
  rank: number
}

const categories = ['玄幻', '都市', '言情', '历史', '科幻']

function formatWordCount(count: number): string {
  if (count >= 10000) {
    return `${(count / 10000).toFixed(1)}万字`
  }
  return `${count}字`
}

function NovelCard({ novel }: { novel: HotNovel }) {
  const router = useRouter()

  const handleClick = () => {
    router.push(`/novel/${novel.id}`)
  }

  return (
    <CardActionArea onClick={handleClick}>
      <Card
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          transition: 'transform 0.2s, box-shadow 0.2s',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: 4,
          },
        }}
      >
        <Box sx={{ position: 'relative' }}>
          <CardMedia
            component="img"
            sx={{
              height: 180,
              objectFit: 'cover',
              bgcolor: 'grey.200',
            }}
            image={novel.cover}
            alt={novel.title}
            onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
              const target = e.target as HTMLImageElement
              target.style.display = 'none'
              target.parentElement!.style.backgroundColor = '#e0e0e0'
            }}
          />
          <Chip
            label={`TOP ${novel.rank}`}
            size="small"
            color="primary"
            sx={{
              position: 'absolute',
              top: 8,
              left: 8,
              fontWeight: 'bold',
            }}
          />
          <Chip
            label={novel.status}
            size="small"
            color={novel.status === '完结' ? 'success' : 'warning'}
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
            }}
          />
        </Box>
        <CardContent sx={{ flexGrow: 1, pb: 1 }}>
          <Typography
            gutterBottom
            variant="subtitle1"
            component="div"
            sx={{
              fontWeight: 'bold',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {novel.title}
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {novel.author}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <Rating value={novel.rating / 2} precision={0.1} readOnly size="small" />
            <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
              {novel.rating.toFixed(1)}
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary">
            {formatWordCount(novel.wordCount)}
          </Typography>
        </CardContent>
      </Card>
    </CardActionArea>
  )
}

function NovelCardSkeleton() {
  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Skeleton variant="rectangular" height={180} />
      <CardContent sx={{ flexGrow: 1, pb: 1 }}>
        <Skeleton variant="text" width="80%" />
        <Skeleton variant="text" width="60%" />
        <Skeleton variant="text" width="40%" />
      </CardContent>
    </Card>
  )
}

export default function HotList() {
  const [category, setCategory] = useState(0)
  const [novels, setNovels] = useState<HotNovel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchNovels = async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await fetch(`/api/hot?category=${categories[category]}`)
        const data = await response.json()
        if (data.success) {
          setNovels(data.data.novels)
        } else {
          setError(data.error || 'Failed to load')
        }
      } catch (err) {
        setError('Network error')
      } finally {
        setLoading(false)
      }
    }

    fetchNovels()
  }, [category])

  const handleCategoryChange = (_event: React.SyntheticEvent, newValue: number) => {
    setCategory(newValue)
  }

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs
          value={category}
          onChange={handleCategoryChange}
          variant="scrollable"
          scrollButtons="auto"
          aria-label="novel category tabs"
        >
          {categories.map((cat, index) => (
            <Tab
              key={cat}
              label={cat}
              id={`category-tab-${index}`}
              aria-controls={`category-tabpanel-${index}`}
            />
          ))}
        </Tabs>
      </Box>

      {error && (
        <Typography color="error" align="center" sx={{ py: 4 }}>
          {error}
        </Typography>
      )}

      <Grid container spacing={3}>
        {loading
          ? Array.from({ length: 10 }).map((_, index) => (
              <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2.4 }} key={index}>
                <NovelCardSkeleton />
              </Grid>
            ))
          : novels.map((novel) => (
              <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2.4 }} key={novel.id}>
                <NovelCard novel={novel} />
              </Grid>
            ))}
      </Grid>
    </Container>
  )
}