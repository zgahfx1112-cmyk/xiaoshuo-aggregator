'use client'

import { Card, CardContent, CardMedia, Typography, IconButton, Box, LinearProgress, Tooltip } from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import { BookshelfItem as BookshelfItemType } from '@/hooks/useBookshelf'

interface BookshelfItemProps {
  item: BookshelfItemType
  onContinueReading: (id: string) => void
  onDelete: (id: string) => void
}

export default function BookshelfItem({ item, onContinueReading, onDelete }: BookshelfItemProps) {
  const progress = item.totalChapters > 0 ? (item.lastReadChapter / item.totalChapters) * 100 : 0
  const progressPercent = Math.min(Math.round(progress), 100)

  const handleClick = () => {
    onContinueReading(item.id)
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    onDelete(item.id)
  }

  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        cursor: 'pointer',
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: 4,
        },
      }}
      onClick={handleClick}
    >
      <Box sx={{ position: 'relative' }}>
        <CardMedia
          component="img"
          sx={{
            height: 200,
            objectFit: 'cover',
          }}
          image={item.cover || '/placeholder-book.png'}
          alt={item.title}
          onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
            const target = e.currentTarget
            target.src = '/placeholder-book.png'
          }}
        />
        <IconButton
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            bgcolor: 'rgba(255, 255, 255, 0.9)',
            '&:hover': {
              bgcolor: 'rgba(255, 255, 255, 1)',
            },
          }}
          onClick={handleDelete}
          size="small"
        >
          <DeleteIcon fontSize="small" color="error" />
        </IconButton>
        <Box
          sx={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            bgcolor: 'rgba(0, 0, 0, 0.6)',
            color: 'white',
            p: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
          }}
        >
          <PlayArrowIcon fontSize="small" />
          <Typography variant="caption">
            Continue Ch. {item.lastReadChapter}
          </Typography>
        </Box>
      </Box>

      <CardContent sx={{ flexGrow: 1, pb: 1 }}>
        <Tooltip title={item.title} placement="top">
          <Typography
            variant="subtitle1"
            component="h3"
            noWrap
            sx={{
              fontWeight: 'bold',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {item.title}
          </Typography>
        </Tooltip>
        <Typography
          variant="body2"
          color="text.secondary"
          noWrap
          sx={{ mb: 1 }}
        >
          {item.author}
        </Typography>

        <Box sx={{ mt: 'auto' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="caption" color="text.secondary">
              Progress
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {item.lastReadChapter}/{item.totalChapters} ({progressPercent}%)
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={progressPercent}
            sx={{
              height: 6,
              borderRadius: 3,
              bgcolor: 'grey.200',
              '& .MuiLinearProgress-bar': {
                borderRadius: 3,
              },
            }}
          />
        </Box>
      </CardContent>
    </Card>
  )
}