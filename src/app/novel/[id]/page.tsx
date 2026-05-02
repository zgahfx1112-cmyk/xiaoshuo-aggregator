'use client'

import { Suspense } from 'react'
import { Box, CircularProgress } from '@mui/material'
import NovelDetailClient from './NovelDetailClient'

export default function NovelDetailPage() {
  return (
    <Suspense fallback={
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    }>
      <NovelDetailClient />
    </Suspense>
  )
}