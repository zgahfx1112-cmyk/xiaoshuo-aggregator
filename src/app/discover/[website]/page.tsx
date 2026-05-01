'use client'

import { use } from 'react'
import { Box, IconButton, Typography, AppBar, Toolbar } from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { useRouter } from 'next/navigation'

const WEBSITES: Record<string, { name: string; url: string }> = {
  qidian: { name: '起点中文网', url: 'https://www.qidian.com' },
  zongheng: { name: '纵横中文网', url: 'https://www.zongheng.com' },
  jjwxc: { name: '晋江文学城', url: 'https://www.jjwxc.net' },
  '17k': { name: '17K小说网', url: 'https://www.17k.com' },
}

export default function WebsiteEmbedPage({
  params,
}: {
  params: Promise<{ website: string }>
}) {
  const router = useRouter()
  const { website } = use(params)
  const site = WEBSITES[website] || WEBSITES.qidian

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <AppBar position="static">
        <Toolbar>
          <IconButton
            edge="start"
            onClick={() => router.push('/discover')}
            sx={{ mr: 1 }}
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6">{site.name}</Typography>
        </Toolbar>
      </AppBar>
      <Box sx={{ flex: 1, overflow: 'hidden' }}>
        <iframe
          src={site.url}
          style={{ width: '100%', height: '100%', border: 'none' }}
          title={site.name}
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
        />
      </Box>
    </Box>
  )
}