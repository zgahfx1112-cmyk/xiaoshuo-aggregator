'use client'

import { Card, CardContent, CardMedia, Typography, Chip, Box, CardActionArea } from '@mui/material'
import { useRouter } from 'next/navigation'
import { SearchResult } from '@/lib/types'

interface NovelCardProps {
  novel: SearchResult
}

export default function NovelCard({ novel }: NovelCardProps) {
  const router = useRouter()

  const handleClick = () => {
    // Navigate to novel detail page with source info
    const encodedTitle = encodeURIComponent(novel.title)
    const encodedSource = encodeURIComponent(novel.sourceName)
    const encodedBookUrl = encodeURIComponent(novel.bookUrl)
    router.push(`/novel/${encodedTitle}?source=${encodedSource}&bookUrl=${encodedBookUrl}`)
  }

  // Generate a placeholder cover if none provided
  const coverUrl = novel.cover && novel.cover.length > 0
    ? novel.cover
    : '/placeholder-cover.png'

  return (
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
      <CardActionArea onClick={handleClick} sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
        <CardMedia
          component="img"
          sx={{
            height: 200,
            objectFit: 'cover',
          }}
          image={coverUrl}
          alt={novel.title}
          onError={(e) => {
            // Fallback to placeholder on error
            const target = e.target as HTMLImageElement
            target.src = '/placeholder-cover.png'
          }}
        />
        <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Typography
            variant="subtitle1"
            component="h3"
            sx={{
              fontWeight: 'bold',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {novel.title}
          </Typography>

          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {novel.author || 'Unknown Author'}
          </Typography>

          <Box sx={{ mt: 'auto', pt: 1 }}>
            <Chip
              label={novel.sourceName}
              size="small"
              color="primary"
              variant="outlined"
              sx={{
                maxWidth: '100%',
                '& .MuiChip-label': {
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                },
              }}
            />
          </Box>
        </CardContent>
      </CardActionArea>
    </Card>
  )
}