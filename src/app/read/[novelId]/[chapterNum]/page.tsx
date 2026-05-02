'use client'

import { Suspense } from 'react'
import { Box, CircularProgress } from '@mui/material'
import ReadingPageClient from './ReadingPageClient'

interface RouteParams {
  params: Promise<{ novelId: string; chapterNum: string }>
}

export default function ReadingPage({ params }: RouteParams) {
  return (
    <Suspense fallback={
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    }>
      <ReadingPageClient params={params} />
    </Suspense>
  )
}