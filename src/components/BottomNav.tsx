'use client'

import { useRouter, usePathname } from 'next/navigation'
import { BottomNavigation, BottomNavigationAction, Paper } from '@mui/material'
import MenuBookIcon from '@mui/icons-material/MenuBook'
import ExploreIcon from '@mui/icons-material/Explore'
import SourceIcon from '@mui/icons-material/Source'
import MoreHorizIcon from '@mui/icons-material/MoreHoriz'

const TABS = [
  { label: '书架', icon: <MenuBookIcon />, path: '/' },
  { label: '发现', icon: <ExploreIcon />, path: '/discover' },
  { label: '书源', icon: <SourceIcon />, path: '/sources' },
  { label: '更多', icon: <MoreHorizIcon />, path: '/more' },
]

export default function BottomNav() {
  const router = useRouter()
  const pathname = usePathname()

  // 计算当前激活的tab索引
  const currentValue = TABS.findIndex((tab) => {
    if (tab.path === '/') return pathname === '/'
    return pathname.startsWith(tab.path)
  })

  const handleChange = (_event: React.SyntheticEvent, newValue: number) => {
    router.push(TABS[newValue].path)
  }

  return (
    <Paper
      sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
      }}
      elevation={3}
    >
      <BottomNavigation
        value={currentValue === -1 ? 0 : currentValue}
        onChange={handleChange}
        showLabels
      >
        {TABS.map((tab) => (
          <BottomNavigationAction
            key={tab.path}
            label={tab.label}
            icon={tab.icon}
          />
        ))}
      </BottomNavigation>
    </Paper>
  )
}