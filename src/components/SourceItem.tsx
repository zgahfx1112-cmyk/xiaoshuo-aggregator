'use client'

import {
  TableRow,
  TableCell,
  Chip,
  IconButton,
  Tooltip,
  Box,
  Typography,
} from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'
import { BookSource } from '@prisma/client'

interface SourceItemProps {
  source: BookSource
  onDelete?: (id: string) => void
}

export default function SourceItem({ source, onDelete }: SourceItemProps) {
  const getStatusColor = () => {
    if (!source.available) return 'error'
    // Check if slow based on lastUpdated (older than 1 day without check)
    const oneDayAgo = new Date()
    oneDayAgo.setDate(oneDayAgo.getDate() - 1)
    if (source.lastUpdated < oneDayAgo) return 'warning'
    return 'success'
  }

  const getStatusLabel = () => {
    if (!source.available) return '不可用'
    const oneDayAgo = new Date()
    oneDayAgo.setDate(oneDayAgo.getDate() - 1)
    if (source.lastUpdated < oneDayAgo) return '慢速'
    return '可用'
  }

  const getTypeLabel = () => {
    return source.type === 'builtin' ? '内置' : '用户导入'
  }

  const canDelete = source.type === 'user'

  return (
    <TableRow
      sx={{
        '&:hover': {
          bgcolor: 'action.hover',
        },
      }}
    >
      <TableCell>
        <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
          {source.name}
        </Typography>
      </TableCell>
      <TableCell>
        <Typography
          variant="body2"
          sx={{
            maxWidth: 300,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
          title={source.url}
        >
          {source.url}
        </Typography>
      </TableCell>
      <TableCell>
        <Chip
          label={getTypeLabel()}
          size="small"
          variant="outlined"
          color={source.type === 'builtin' ? 'primary' : 'secondary'}
        />
      </TableCell>
      <TableCell>
        <Chip
          label={getStatusLabel()}
          size="small"
          color={getStatusColor()}
        />
      </TableCell>
      <TableCell>
        <Typography variant="body2" color="text.secondary">
          {new Date(source.lastUpdated).toLocaleDateString('zh-CN')}
        </Typography>
      </TableCell>
      <TableCell>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          {canDelete ? (
            <Tooltip title="删除书源">
              <IconButton
                size="small"
                color="error"
                onClick={() => onDelete?.(source.id)}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          ) : (
            <Tooltip title="内置书源不可删除">
              <span>
                <IconButton size="small" disabled>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          )}
        </Box>
      </TableCell>
    </TableRow>
  )
}