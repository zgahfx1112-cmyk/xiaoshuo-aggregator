'use client'

import { useState, useEffect, useCallback } from 'react'
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
  Divider,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import FileDownloadIcon from '@mui/icons-material/FileDownload'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import DeleteIcon from '@mui/icons-material/Delete'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import SyncIcon from '@mui/icons-material/Sync'
import Switch from '@mui/material/Switch'
import { useBookshelf, UserSourceConfig } from '@/hooks/useBookshelf'

interface ServerSource {
  id: string
  name: string
  url: string
  type: string
  available: boolean
  lastUpdated: string
}

export default function SourcesPage() {
  const { userSourceConfigs, setUserSourceEnabled, addUserSource, removeUserSource } = useBookshelf()

  const [serverSources, setServerSources] = useState<ServerSource[]>([])
  const [loading, setLoading] = useState(true)
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
  const [syncing, setSyncing] = useState(false)

  const fetchServerSources = useCallback(async () => {
    try {
      const response = await fetch('/api/sources')
      const data = await response.json()
      if (data.success) {
        setServerSources(data.data)
      } else {
        showSnackbar('加载预设书源失败: ' + data.error, 'error')
      }
    } catch {
      showSnackbar('加载预设书源失败', 'error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchServerSources()
  }, [fetchServerSources])

  const showSnackbar = (message: string, severity: 'success' | 'error' | 'info') => {
    setSnackbar({ open: true, message, severity })
  }

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false })
  }

  // 检查书源是否启用（从本地配置读取）
  const isSourceEnabled = (sourceId: string) => {
    const config = userSourceConfigs.find(s => s.sourceId === sourceId)
    // 默认启用（如果本地没有记录）
    return config ? config.enabled : true
  }

  // 切换启用状态
  const handleToggleEnabled = (sourceId: string, sourceName: string) => {
    const currentEnabled = isSourceEnabled(sourceId)
    setUserSourceEnabled(sourceId, !currentEnabled)
    showSnackbar(!currentEnabled ? `已启用 ${sourceName}` : `已禁用 ${sourceName}`, 'info')
  }

  // 导入自定义书源（存入本地）
  const handleImport = async () => {
    if (!importJson.trim()) {
      showSnackbar('请输入书源配置或URL', 'error')
      return
    }

    setImporting(true)
    try {
      const isUrl = importJson.trim().startsWith('http')

      if (isUrl) {
        // 从URL获取书源
        const response = await fetch(importJson.trim())
        if (!response.ok) {
          showSnackbar('获取书源失败: ' + response.status, 'error')
          return
        }

        const text = await response.text()
        const config = JSON.parse(text)
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

  const importConfigs = (configs: Array<{ bookSourceName?: string; name?: string; bookSourceUrl?: string; url?: string } & object>) => {
    let added = 0
    for (const config of configs) {
      const name = config.bookSourceName || config.name
      const url = config.bookSourceUrl || config.url

      if (!name || !url) continue

      const sourceId = `custom_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

      addUserSource({
        sourceId,
        sourceName: name,
        enabled: true,
        isCustom: true,
        config: config as object,
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
  const handleTestSource = async (sourceId: string) => {
    setTestingSource(sourceId)
    try {
      const response = await fetch('/api/sources/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceId }),
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

  // 同步服务端书源更新
  const handleSyncSources = async () => {
    setSyncing(true)
    try {
      const response = await fetch('/api/cron/update-sources', { method: 'POST' })
      const data = await response.json()
      if (data.success) {
        showSnackbar(`同步完成：新增 ${data.data.added}，更新 ${data.data.updated}`, 'success')
        fetchServerSources()
      } else {
        showSnackbar('同步失败: ' + data.error, 'error')
      }
    } catch {
      showSnackbar('同步失败', 'error')
    } finally {
      setSyncing(false)
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

  // 统计数据
  const enabledCount = serverSources.filter(s => isSourceEnabled(s.id)).length + userSourceConfigs.filter(s => s.enabled).length
  const customCount = userSourceConfigs.filter(s => s.isCustom).length

  return (
    <Box sx={{ pb: 7 }}>
      <Container maxWidth="lg" sx={{ py: 2 }}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
          书源管理
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          服务端预设书源 + 用户自定义书源，配置存储在本地
        </Typography>

        {/* 统计 */}
        <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
          <Paper sx={{ p: 1.5, minWidth: 100 }}>
            <Typography variant="body2" color="text.secondary">已启用</Typography>
            <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'success.main' }}>{enabledCount}</Typography>
          </Paper>
          <Paper sx={{ p: 1.5, minWidth: 100 }}>
            <Typography variant="body2" color="text.secondary">自定义</Typography>
            <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'secondary.main' }}>{customCount}</Typography>
          </Paper>
          <Paper sx={{ p: 1.5, minWidth: 100 }}>
            <Typography variant="body2" color="text.secondary">预设书源</Typography>
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>{serverSources.length}</Typography>
          </Paper>
        </Box>

        {/* 操作按钮 */}
        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setImportDialogOpen(true)}>
            导入书源
          </Button>
          <Button variant="outlined" startIcon={<SyncIcon />} onClick={handleSyncSources} disabled={syncing}>
            {syncing ? '同步中...' : '同步预设'}
          </Button>
          <Button variant="outlined" startIcon={<FileDownloadIcon />} onClick={handleExportClick}>
            导出自定义
          </Button>
        </Box>

        {/* 服务端预设书源 */}
        <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'bold' }}>服务端预设书源</Typography>
        <TableContainer component={Paper} sx={{ mb: 3 }}>
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
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} align="center"><CircularProgress size={20} /></TableCell>
                </TableRow>
              ) : serverSources.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} align="center"><Typography color="text.secondary">暂无预设书源</Typography></TableCell>
                </TableRow>
              ) : (
                serverSources.map(source => (
                  <TableRow key={source.id}>
                    <TableCell>{source.name}</TableCell>
                    <TableCell>
                      <Switch
                        checked={isSourceEnabled(source.id)}
                        onChange={() => handleToggleEnabled(source.id, source.name)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip label={source.available ? '可用' : '不可用'} size="small" color={source.available ? 'success' : 'error'} />
                    </TableCell>
                    <TableCell>
                      <Tooltip title="测试">
                        <IconButton size="small" onClick={() => handleTestSource(source.id)} disabled={testingSource === source.id}>
                          {testingSource === source.id ? <CircularProgress size={16} /> : <PlayArrowIcon />}
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* 用户自定义书源 */}
        <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'bold' }}>用户自定义书源</Typography>
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>名称</TableCell>
                <TableCell>启用</TableCell>
                <TableCell>操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {userSourceConfigs.filter(s => s.isCustom).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} align="center"><Typography color="text.secondary">暂无自定义书源，点击导入添加</Typography></TableCell>
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
              支持书源JSON配置、JSON文件URL链接。导入的书源保存在本地浏览器。
            </Alert>
            <TextField
              fullWidth
              multiline
              rows={10}
              value={importJson}
              onChange={(e) => setImportJson(e.target.value)}
              placeholder='粘贴书源JSON配置，或输入书源JSON文件URL（如：https://xxx.com/sources.json）'
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
          <DialogTitle>导出自定义书源</DialogTitle>
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