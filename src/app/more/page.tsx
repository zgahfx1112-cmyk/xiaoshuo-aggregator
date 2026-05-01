'use client'

import { useState } from 'react'
import {
  Box,
  Container,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Slider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  Snackbar,
  Alert,
} from '@mui/material'
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep'
import SettingsIcon from '@mui/icons-material/Settings'
import InfoIcon from '@mui/icons-material/Info'
import BugReportIcon from '@mui/icons-material/BugReport'

export default function MorePage() {
  const [fontSize, setFontSize] = useState(16)
  const [clearCacheDialog, setClearCacheDialog] = useState(false)
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string }>({
    open: false,
    message: '',
  })

  const handleClearCache = async () => {
    try {
      const response = await fetch('/api/cache', { method: 'DELETE' })
      const data = await response.json()
      if (data.success) {
        setSnackbar({ open: true, message: '缓存已清除' })
      } else {
        setSnackbar({ open: true, message: '清除失败: ' + data.error })
      }
    } catch {
      setSnackbar({ open: true, message: '清除失败' })
    }
    setClearCacheDialog(false)
  }

  return (
    <Box sx={{ pb: 7 }}>
      <Container maxWidth="lg" sx={{ py: 2 }}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
          更多设置
        </Typography>

        {/* 阅读设置 */}
        <Paper sx={{ mb: 2 }}>
          <Typography variant="subtitle1" sx={{ p: 2, bgcolor: 'grey.100' }}>
            <SettingsIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            阅读设置
          </Typography>
          <List>
            <ListItem>
              <ListItemText primary="字体大小" secondary={`${fontSize}px`} />
              <Slider
                value={fontSize}
                onChange={(_, v) => setFontSize(v as number)}
                min={12}
                max={24}
                step={1}
                sx={{ width: 150 }}
              />
            </ListItem>
          </List>
        </Paper>

        {/* 系统设置 */}
        <Paper sx={{ mb: 2 }}>
          <Typography variant="subtitle1" sx={{ p: 2, bgcolor: 'grey.100' }}>
            系统设置
          </Typography>
          <List>
            <ListItemButton onClick={() => setClearCacheDialog(true)}>
              <ListItemIcon>
                <DeleteSweepIcon />
              </ListItemIcon>
              <ListItemText primary="清除缓存" secondary="清除所有缓存数据" />
            </ListItemButton>
          </List>
        </Paper>

        {/* 关于信息 */}
        <Paper sx={{ mb: 2 }}>
          <Typography variant="subtitle1" sx={{ p: 2, bgcolor: 'grey.100' }}>
            <InfoIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            关于
          </Typography>
          <List>
            <ListItem>
              <ListItemText primary="版本" secondary="1.0.0" />
            </ListItem>
            <ListItem>
              <ListItemText primary="书源来源" secondary="yckceo.com/yuedu/shuyuan" />
            </ListItem>
            <ListItemButton onClick={() => window.open('https://github.com/zgahfx1112-cmyk/xiaoshuo', '_blank')}>
              <ListItemIcon>
                <BugReportIcon />
              </ListItemIcon>
              <ListItemText primary="GitHub" secondary="问题反馈与源码" />
            </ListItemButton>
          </List>
        </Paper>
      </Container>

      {/* 清除缓存确认对话框 */}
      <Dialog open={clearCacheDialog} onClose={() => setClearCacheDialog(false)}>
        <DialogTitle>清除缓存</DialogTitle>
        <DialogContent>
          <DialogContentText>
            定要清除所有缓存数据吗？这将清除搜索结果、小说详情等缓存，但不会影响书架数据。
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setClearCacheDialog(false)}>取消</Button>
          <Button onClick={handleClearCache} color="primary">
            清除
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="info">{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  )
}