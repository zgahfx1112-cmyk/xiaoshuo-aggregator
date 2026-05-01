'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Container,
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
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import FileDownloadIcon from '@mui/icons-material/FileDownload'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import DeleteIcon from '@mui/icons-material/Delete'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import SyncIcon from '@mui/icons-material/Sync'
import { validateSourceConfig } from '@/config/sources'
import { BookSource } from '@prisma/client'
import Switch from '@mui/material/Switch'

export default function SourcesPage() {
  const [sources, setSources] = useState<BookSource[]>([])
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

  const fetchSources = useCallback(async () => {
    try {
      const response = await fetch('/api/sources')
      const data = await response.json()
      if (data.success) {
        setSources(data.data)
      } else {
        showSnackbar('加载书源失败: ' + data.error, 'error')
      }
    } catch (error) {
      showSnackbar('加载书源失败', 'error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSources()
  }, [fetchSources])

  const showSnackbar = (message: string, severity: 'success' | 'error' | 'info') => {
    setSnackbar({ open: true, message, severity })
  }

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false })
  }

  const handleImportClick = () => {
    setImportJson('')
    setImportDialogOpen(true)
  }

  const handleExportClick = () => {
    const exportData = sources.map(s => {
      const config = s.config as Record<string, unknown>
      return {
        ...config,
        name: s.name,
        url: s.url,
      }
    })
    setExportJson(JSON.stringify(exportData, null, 2))
    setExportDialogOpen(true)
  }

  const handleImport = async () => {
    if (!importJson.trim()) {
      showSnackbar('请输入书源配置', 'error')
      return
    }

    setImporting(true)
    try {
      const config = JSON.parse(importJson)
      const response = await fetch('/api/sources/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })

      const data = await response.json()
      if (data.success) {
        showSnackbar(data.message, 'success')
        setImportDialogOpen(false)
        fetchSources()
      } else {
        showSnackbar('导入失败: ' + data.error, 'error')
      }
    } catch (error) {
      if (error instanceof SyntaxError) {
        showSnackbar('JSON格式错误，请检查输入', 'error')
      } else {
        showSnackbar('导入失败', 'error')
      }
    } finally {
      setImporting(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/sources/${id}`, {
        method: 'DELETE',
      })

      const data = await response.json()
      if (data.success) {
        showSnackbar('删除成功', 'success')
        setSources(sources.filter(s => s.id !== id))
      } else {
        showSnackbar('删除失败: ' + data.error, 'error')
      }
    } catch {
      showSnackbar('删除失败', 'error')
    }
  }

  const handleTestSource = async (id: string) => {
    setTestingSource(id)
    try {
      const response = await fetch('/api/sources/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceId: id }),
      })

      const data = await response.json()
      if (data.success) {
        showSnackbar(data.data.message, data.data.available ? 'success' : 'error')
        // 更新书源状态
        setSources(sources.map(s => s.id === id ? { ...s, available: data.data.available } : s))
      } else {
        showSnackbar('测试失败: ' + data.error, 'error')
      }
    } catch {
      showSnackbar('测试失败', 'error')
    } finally {
      setTestingSource(null)
    }
  }

  const handleToggleEnabled = async (id: string, enabled: boolean) => {
    try {
      const response = await fetch(`/api/sources/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      })

      const data = await response.json()
      if (data.success) {
        showSnackbar(enabled ? '书源已启用' : '书源已禁用', 'info')
        setSources(sources.map(s => s.id === id ? { ...s, enabled } : s))
      } else {
        showSnackbar('操作失败: ' + data.error, 'error')
      }
    } catch {
      showSnackbar('操作失败', 'error')
    }
  }

  const handleSyncSources = async () => {
    setSyncing(true)
    try {
      const response = await fetch('/api/cron/update-sources', {
        method: 'POST',
      })

      const data = await response.json()
      if (data.success) {
        showSnackbar(`同步完成：新增 ${data.data.added}，更新 ${data.data.updated}`, 'success')
        fetchSources()
      } else {
        showSnackbar('同步失败: ' + data.error, 'error')
      }
    } catch {
      showSnackbar('同步失败', 'error')
    } finally {
      setSyncing(false)
    }
  }

  const handleCopyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(exportJson)
      showSnackbar('已复制到剪贴板', 'success')
    } catch {
      showSnackbar('复制失败', 'error')
    }
  }

  const handleDownloadJson = () => {
    const blob = new Blob([exportJson], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'book-sources.json'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    showSnackbar('下载成功', 'success')
  }

  const builtinCount = sources.filter(s => s.type === 'builtin').length
  const userCount = sources.filter(s => s.type === 'user').length
  const availableCount = sources.filter(s => s.available).length

  return (
    <Box sx={{ pb: 7 }}>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold' }}>
            书源管理
          </Typography>
          <Typography variant="body2" color="text.secondary">
            管理小说搜索的书源配置，启用/禁用书源，测试书源可用性
          </Typography>
        </Box>

      {/* Stats Cards */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <Paper sx={{ p: 2, minWidth: 120 }}>
          <Typography variant="body2" color="text.secondary">
            总书源
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
            {sources.length}
          </Typography>
        </Paper>
        <Paper sx={{ p: 2, minWidth: 120 }}>
          <Typography variant="body2" color="text.secondary">
            内置书源
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
            {builtinCount}
          </Typography>
        </Paper>
        <Paper sx={{ p: 2, minWidth: 120 }}>
          <Typography variant="body2" color="text.secondary">
            用户导入
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'secondary.main' }}>
            {userCount}
          </Typography>
        </Paper>
        <Paper sx={{ p: 2, minWidth: 120 }}>
          <Typography variant="body2" color="text.secondary">
            可用书源
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'success.main' }}>
            {availableCount}
          </Typography>
        </Paper>
      </Box>

      /* Action Buttons */
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleImportClick}
        >
          导入书源
        </Button>
        <Button
          variant="outlined"
          startIcon={<SyncIcon />}
          onClick={handleSyncSources}
          disabled={syncing}
        >
          {syncing ? '同步中...' : '同步书源'}
        </Button>
        <Button
          variant="outlined"
          startIcon={<FileDownloadIcon />}
          onClick={handleExportClick}
        >
          导出书源
        </Button>
      </Box>

      {/* Sources Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>名称</TableCell>
              <TableCell>URL</TableCell>
              <TableCell>类型</TableCell>
              <TableCell>启用</TableCell>
              <TableCell>状态</TableCell>
              <TableCell>最后更新</TableCell>
              <TableCell align="right">操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <CircularProgress size={24} sx={{ my: 2 }} />
                </TableCell>
              </TableRow>
            ) : sources.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <Typography color="text.secondary" sx={{ py: 4 }}>
                    暂无书源数据
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              sources.map((source) => (
                <TableRow key={source.id}>
                  <TableCell>{source.name}</TableCell>
                  <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {source.url}
                  </TableCell>
                  <TableCell>
                    <Chip label={source.type} size="small" color={source.type === 'builtin' ? 'primary' : 'secondary'} />
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={source.enabled}
                      onChange={() => handleToggleEnabled(source.id, !source.enabled)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={source.available ? '可用' : '不可用'}
                      size="small"
                      color={source.available ? 'success' : 'error'}
                    />
                  </TableCell>
                  <TableCell>
                    {new Date(source.lastUpdated).toLocaleDateString()}
                  </TableCell>
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                      <Tooltip title="测试书源">
                        <IconButton
                          size="small"
                          onClick={() => handleTestSource(source.id)}
                          disabled={testingSource === source.id}
                        >
                          {testingSource === source.id ? <CircularProgress size={16} /> : <PlayArrowIcon />}
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="删除">
                        <IconButton size="small" onClick={() => handleDelete(source.id)} disabled={source.type === 'builtin'}>
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Import Dialog */}
      <Dialog
        open={importDialogOpen}
        onClose={() => setImportDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>导入书源</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            请粘贴书源JSON配置，支持单个或数组格式
          </Alert>
          <TextField
            fullWidth
            multiline
            rows={10}
            value={importJson}
            onChange={(e) => setImportJson(e.target.value)}
            placeholder='{"name": "书源名称", "url": "https://example.com", "version": 1, ...}'
            sx={{ fontFamily: 'monospace' }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImportDialogOpen(false)}>取消</Button>
          <Button
            variant="contained"
            onClick={handleImport}
            disabled={importing}
            startIcon={importing ? <CircularProgress size={16} /> : null}
          >
            {importing ? '导入中...' : '导入'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Export Dialog */}
      <Dialog
        open={exportDialogOpen}
        onClose={() => setExportDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>导出书源</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<ContentCopyIcon />}
              onClick={handleCopyToClipboard}
            >
              复制到剪贴板
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={<FileDownloadIcon />}
              onClick={handleDownloadJson}
            >
              下载JSON文件
            </Button>
          </Box>
          <TextField
            fullWidth
            multiline
            rows={15}
            value={exportJson}
            slotProps={{
              input: {
                readOnly: true,
              },
            }}
            sx={{
              fontFamily: 'monospace',
              '& .MuiInputBase-input': {
                fontFamily: 'monospace',
                fontSize: '0.85rem',
              },
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExportDialogOpen(false)}>关闭</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} onClose={handleCloseSnackbar}>
          {snackbar.message}
        </Alert>
      </Snackbar>
      </Container>
    </Box>
  )
}