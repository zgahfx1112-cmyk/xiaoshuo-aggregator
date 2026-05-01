'use client'

import { useState, useCallback } from 'react'
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Snackbar,
  IconButton,
  Tooltip,
  CircularProgress,
  Chip,
  Container,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import FileDownloadIcon from '@mui/icons-material/FileDownload'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import DeleteIcon from '@mui/icons-material/Delete'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import Switch from '@mui/material/Switch'
import { useBookshelf, UserSourceConfig } from '@/hooks/useBookshelf'

export default function SourcesPage() {
  const { userSourceConfigs, setUserSourceEnabled, addUserSource, removeUserSource } = useBookshelf()

  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [exportDialogOpen, setExportDialogOpen] = useState(false)
  const [importJson, setImportJson] = useState('')
  const [exportJson, setExportJson] = useState('')
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' }>({
    open: false,
    message: '',
    severity: 'info',
  })
  const [importing, setImporting] = useState(false)
  const [testingSource, setTestingSource] = useState<string | null>(null)

  const showSnackbar = (message: string, severity: 'success' | 'error' | 'info') => {
    setSnackbar({ open: true, message, severity })
  }

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false })
  }

  // 检查书源是否启用
  const isSourceEnabled = (sourceId: string) => {
    const config = userSourceConfigs.find(s => s.sourceId === sourceId)
    return config ? config.enabled : true
  }

  // 切换启用状态
  const handleToggleEnabled = (sourceId: string, sourceName: string) => {
    const currentEnabled = isSourceEnabled(sourceId)
    setUserSourceEnabled(sourceId, !currentEnabled)
    showSnackbar(!currentEnabled ? `已启用 ${sourceName}` : `已禁用 ${sourceName}`, 'info')
  }

  // 导入书源（支持 yckceo.com JSON 格式）
  const handleImport = async () => {
    if (!importJson.trim()) {
      showSnackbar('请输入书源配置或URL', 'error')
      return
    }

    setImporting(true)
    try {
      const isUrl = importJson.trim().startsWith('http')

      if (isUrl) {
        // 通过代理 API 获取书源（绕过 CORS）
        const response = await fetch(`/api/proxy?url=${encodeURIComponent(importJson.trim())}`)
        if (!response.ok) {
          const errorData = await response.json()
          showSnackbar('获取书源失败: ' + (errorData.error || response.status), 'error')
          return
        }

        const data = await response.json()
        if (!data.success) {
          showSnackbar('获取书源失败: ' + data.error, 'error')
          return
        }

        const config = data.data
        importConfigs(Array.isArray(config) ? config : [config])
      } else {
        const config = JSON.parse(importJson)
        importConfigs(Array.isArray(config) ? config : [config])
      }
    } catch (error) {
      if (error instanceof SyntaxError) {
        showSnackbar('JSON格式错误', 'error')
      } else {
        showSnackbar('导入失败', 'error')
      }
    } finally {
      setImporting(false)
    }
  }

  // 处理 yckceo.com 书源格式
  const importConfigs = (configs: Array<Record<string, unknown>>) => {
    let added = 0
    for (const config of configs) {
      // 支持 yckceo 格式：bookSourceName, bookSourceUrl
      // 和标准格式：name, url
      const name = (config.bookSourceName || config.name) as string | undefined
      const url = (config.bookSourceUrl || config.url) as string | undefined

      if (!name || !url) continue

      const sourceId = `custom_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

      addUserSource({
        sourceId,
        sourceName: name,
        enabled: true,
        isCustom: true,
        config: config,
      })
      added++
    }

    if (added > 0) {
      showSnackbar(`成功导入 ${added} 个书源`, 'success')
      setImportDialogOpen(false)
      setImportJson('')
    } else {
      showSnackbar('没有有效的书源配置', 'error')
    }
  }

  // 测试书源可用性
  const handleTestSource = async (source: UserSourceConfig) => {
    setTestingSource(source.sourceId)
    try {
      const response = await fetch('/api/sources/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceConfig: source.config }),
      })

      const data = await response.json()
      if (data.success) {
        showSnackbar(data.data.message, data.data.available ? 'success' : 'error')
      } else {
        showSnackbar('测试失败: ' + data.error, 'error')
      }
    } catch {
      showSnackbar('测试失败', 'error')
    } finally {
      setTestingSource(null)
    }
  }

  // 导出用户书源配置
  const handleExportClick = () => {
    const customSources = userSourceConfigs.filter(s => s.isCustom && s.config)
    const exportData = customSources.map(s => s.config)
    setExportJson(JSON.stringify(exportData, null, 2))
    setExportDialogOpen(true)
  }

  const handleCopyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(exportJson)
      showSnackbar('已复制到剪贴板', 'success')
    } catch {
      showSnackbar('复制失败', 'error')
    }
  }

  // 统计
  const enabledCount = userSourceConfigs.filter(s => s.enabled && s.isCustom).length
  const customCount = userSourceConfigs.filter(s => s.isCustom).length

  return (
    <Box sx={{ pb: 7 }}>
      <Container maxWidth="lg" sx={{ py: 2 }}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
          书源管理
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          导入书源配置，数据存储在本地浏览器。支持 yckceo.com 书源JSON格式。
        </Typography>

        {/* 统计 */}
        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <Paper sx={{ p: 1.5, minWidth: 100 }}>
            <Typography variant="body2" color="text.secondary">已启用</Typography>
            <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'success.main' }}>{enabledCount}</Typography>
          </Paper>
          <Paper sx={{ p: 1.5, minWidth: 100 }}>
            <Typography variant="body2" color="text.secondary">总数</Typography>
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>{customCount}</Typography>
          </Paper>
        </Box>

        {/* 操作按钮 */}
        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setImportDialogOpen(true)}>
            导入书源
          </Button>
          <Button variant="outlined" startIcon={<FileDownloadIcon />} onClick={handleExportClick}>
            导出书源
          </Button>
        </Box>

        {/* 用户书源列表 */}
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>名称</TableCell>
                <TableCell>启用</TableCell>
                <TableCell>状态</TableCell>
                <TableCell>操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {userSourceConfigs.filter(s => s.isCustom).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} align="center">
                    <Typography color="text.secondary">暂无书源，点击"导入书源"添加</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      支持导入 yckceo.com 书源JSON格式
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                userSourceConfigs.filter(s => s.isCustom).map(source => (
                  <TableRow key={source.sourceId}>
                    <TableCell>{source.sourceName}</TableCell>
                    <TableCell>
                      <Switch
                        checked={source.enabled}
                        onChange={() => handleToggleEnabled(source.sourceId, source.sourceName)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip label="自定义" size="small" color="primary" variant="outlined" />
                    </TableCell>
                    <TableCell>
                      <Tooltip title="测试">
                        <IconButton size="small" onClick={() => handleTestSource(source)} disabled={testingSource === source.sourceId}>
                          {testingSource === source.sourceId ? <CircularProgress size={16} /> : <PlayArrowIcon />}
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="删除">
                        <IconButton size="small" onClick={() => removeUserSource(source.sourceId)}>
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* 导入对话框 */}
        <Dialog open={importDialogOpen} onClose={() => setImportDialogOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle>导入书源</DialogTitle>
          <DialogContent>
            <Alert severity="info" sx={{ mb: 2 }}>
              支持书源JSON配置或JSON文件URL链接。兼容 yckceo.com/yuedu/shuyuans 格式。
            </Alert>
            <TextField
              fullWidth
              multiline
              rows={10}
              value={importJson}
              onChange={(e) => setImportJson(e.target.value)}
              placeholder='粘贴书源JSON配置，或输入书源JSON文件URL（如：https://www.yckceo.com/yuedu/shuyuans/json/id/1107.json）'
              sx={{ fontFamily: 'monospace' }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setImportDialogOpen(false)}>取消</Button>
            <Button variant="contained" onClick={handleImport} disabled={importing} startIcon={importing ? <CircularProgress size={16} /> : null}>
              {importing ? '导入中...' : '导入'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* 导出对话框 */}
        <Dialog open={exportDialogOpen} onClose={() => setExportDialogOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle>导出书源</DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
              <Button variant="outlined" size="small" startIcon={<ContentCopyIcon />} onClick={handleCopyToClipboard}>
                复制到剪贴板
              </Button>
            </Box>
            <TextField fullWidth multiline rows={15} value={exportJson} slotProps={{ input: { readOnly: true } }} sx={{ fontFamily: 'monospace' }} />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setExportDialogOpen(false)}>关闭</Button>
          </DialogActions>
        </Dialog>

        {/* Snackbar */}
        <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={handleCloseSnackbar} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
          <Alert severity={snackbar.severity} onClose={handleCloseSnackbar}>{snackbar.message}</Alert>
        </Snackbar>
      </Container>
    </Box>
  )
}