'use client'

import { useState, useEffect } from 'react'
import {
  Box,
  Container,
  Tabs,
  Tab,
  Grid,
  Card,
  CardContent,
  CardMedia,
  Typography,
  CardActionArea,
  Button,
  CircularProgress,
} from '@mui/material'
import { useRouter } from 'next/navigation'
import LaunchIcon from '@mui/icons-material/Launch'

const WEBSITES = [
  { name: '起点中文网', url: 'https://www.qidian.com', apiSource: 'qidian' },
  { name: '纵横中文网', url: 'https://www.zongheng.com', apiSource: 'zongheng' },
  { name: '晋江文学城', url: 'https://www.jjwxc.net', apiSource: 'jjwxc' },
  { name: '17K小说网', url: 'https://www.17k.com', apiSource: '17k' },
]

export default function DiscoverPage() {
  const router = useRouter()
  const [currentTab, setCurrentTab] = useState(0)
  const [recommendations, setRecommendations] = useState<Array<{
    id: string
    title: string
    author: string
    cover: string
  }>>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    const source = WEBSITES[currentTab].apiSource
    fetch(`/api/recommend?source=${source}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setRecommendations(data.data || [])
      })
      .catch(() => setRecommendations([]))
      .finally(() => setLoading(false))
  }, [currentTab])

  const openInIframe = (website: typeof WEBSITES[0]) => {
    router.push(`/discover/${website.apiSource}`)
  }

  return (
    <Box sx={{ pb: 7 }}>
      <Container maxWidth="lg" sx={{ py: 2 }}>
        {/* 网站Tabs */}
        <Tabs
          value={currentTab}
          onChange={(_, v) => setCurrentTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ mb: 2 }}
        >
          {WEBSITES.map((w) => (
            <Tab key={w.name} label={w.name} />
          ))}
        </Tabs>

        {/* 网站快捷入口 - iframe嵌入 */}
        <Box sx={{ my: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {WEBSITES.map((w) => (
            <Button
              key={w.name}
              variant="outlined"
              size="small"
              onClick={() => openInIframe(w)}
              startIcon={<LaunchIcon />}
            >
              进入 {w.name}
            </Button>
          ))}
        </Box>

        {/* 推荐列表 */}
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
          {WEBSITES[currentTab].name} 热门推荐
        </Typography>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : recommendations.length === 0 ? (
          <Typography color="text.secondary" sx={{ py: 4 }}>
            暂无推荐数据
          </Typography>
        ) : (
          <Grid container spacing={2}>
            {recommendations.map((novel) => (
              <Grid key={novel.id} size={{ xs: 6, sm: 4, md: 3 }}>
                <Card>
                  <CardActionArea
                    onClick={() =>
                      router.push(
                        `/novel/${novel.id}?source=${WEBSITES[currentTab].apiSource}`
                      )
                    }
                  >
                    <CardMedia
                      component="img"
                      height="140"
                      image={novel.cover || '/placeholder-cover.png'}
                      alt={novel.title}
                      sx={{ objectFit: 'cover' }}
                    />
                    <CardContent>
                      <Typography variant="subtitle2" noWrap>
                        {novel.title}
                      </Typography>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        noWrap
                      >
                        {novel.author}
                      </Typography>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Container>
    </Box>
  )
}