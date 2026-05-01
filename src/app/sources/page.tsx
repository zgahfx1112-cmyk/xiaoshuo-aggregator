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
  Checkbox,
  Toolbar,
  Menu,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Divider,
  Tab,
  Tabs,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import FileDownloadIcon from '@mui/icons-material/FileDownload'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import DeleteIcon from '@mui/icons-material/Delete'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import Switch from '@mui/material/Switch'
import GroupIcon from '@mui/icons-material/Group'
import { useBookshelf, UserSourceConfig, SourceGroup } from '@/hooks/useBookshelf'

export default function SourcesPage() {
  const {
    userSourceConfigs,
    setUserSourceEnabled,
    addUserSource,
    addMultipleSources,
    removeMultipleSources,
    sourceGroups,
    addGroup,
    removeGroup,
    setSourceGroup,
    getSourcesByGroup,
  } = useBookshelf()

  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [exportDialogOpen, setExportDialogOpen] = useState(false)
  const [groupDialogOpen, setGroupDialogOpen] = useState(false)
  const [importJson, setImportJson] = useState('')
  const [exportJson, setExportJson] = useState('')
  const [newGroupName, setNewGroupName] = useState('')
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' }>({
    open: false,
    message: '',
    severity: 'info',
  })
  const [importing, setImporting] = useState(false)
  const [testingSources, setTestingSources] = useState<Set<string>>(new Set())
  const [selectedSources, setSelectedSources] = useState<Set<string>>(new Set())
  const [currentTab, setCurrentTab] = useState(0) // 0: all, 1-n: groups

  const showSnackbar = (message: string, severity: 'success' | 'error' | 'info') => {
    setSnackbar({ open: true, message, severity })
  }

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false })
  }

  // 获取当前显示的书源
  const getDisplayedSources = useCallback(() => {
    if (currentTab === 0) {
      return userSourceConfigs.filter(s => s.isCustom)
    }
    const groupId = sourceGroups[currentTab - 1]?.id
    if (groupId) {
      return getSourcesByGroup(groupId)
    }
    return []
  }, [currentTab, userSourceConfigs, sourceGroups, getSourcesByGroup])

  const displayedSources = getDisplayedSources()

  // 全选/取消全选
  const handleSelectAll = () => {
    if (selectedSources.size === displayedSources.length) {
      setSelectedSources(new Set())
    } else {
      setSelectedSources(new Set(displayedSources.map(s => s.sourceId)))
    }
  }

  // 单选
  const handleSelectSource = (sourceId: string) => {
    const newSelected = new Set(selectedSources)
    if (newSelected.has(sourceId)) {
      newSelected.delete(sourceId)
    } else {
      newSelected.add(sourceId)
    }
    setSelectedSources(newSelected)
  }

  // 批量删除
  const handleBatchDelete = () => {
    if (selectedSources.size === 0) {
      showSnackbar('请先选择书源', 'error')
      return
    }
    removeMultipleSources(Array.from(selectedSources))
    showSnackbar(`已删除 ${selectedSources.size} 个书源`, 'success')
    setSelectedSources(new Set())
  }

  // 批量启用/禁用
  const handleBatchToggle = (enabled: boolean) => {
    if (selectedSources.size === 0) {
      showSnackbar('请先选择书源', 'error')
      return
    }
    selectedSources.forEach(sourceId => setUserSourceEnabled(sourceId, enabled))
    showSnackbar(`已${enabled ? '启用' : '禁用'} ${selectedSources.size} 个书源`, 'info')
    setSelectedSources(new Set())
  }

  // 批量测试
  const handleBatchTest = async () => {
    if (selectedSources.size === 0) {
      showSnackbar('请先选择书源', 'error')
      return
    }

    const sourcesToTest = displayedSources.filter(s => selectedSources.has(s.sourceId))
    setTestingSources(new Set(selectedSources))

    let available = 0
    let unavailable = 0

    for (const source of sourcesToTest) {
      try {
        const response = await fetch('/api/sources/test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sourceConfig: source.config }),
        })

        const data = await response.json()
        if (data.success && data.data.available) {
          available++
        } else {
          unavailable++
        }
      } catch {
        unavailable++
      }
    }

    setTestingSources(new Set())
    showSnackbar(`测试完成：可用 ${available}，不可用 ${unavailable}`, 'info')
  }

  // 导入书源
  const handleImport = async () => {
    if (!importJson.trim()) {
      showSnackbar('请输入书源配置或URL', 'error')
      return
    }

    setImporting(true)
    try {
      const isUrl = importJson.trim().startsWith('http')

      if (isUrl) {
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

  const importConfigs = (configs: Array<Record<string, unknown>>) => {
    const groupId = currentTab > 0 ? sourceGroups[currentTab - 1]?.id : undefined

    const newSources: UserSourceConfig[] = []
    for (const config of configs) {
      const name = (config.bookSourceName || config.name) as string | undefined
      const url = (config.bookSourceUrl || config.url) as string | undefined

      if (!name || !url) continue

      const sourceId = `custom_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

      newSources.push({
        sourceId,
        sourceName: name,
        enabled: true,
        isCustom: true,
        groupId,
        config: config,
      })
    }

    if (newSources.length > 0) {
      addMultipleSources(newSources)
      showSnackbar(`成功导入 ${newSources.length} 个书源`, 'success')
      setImportDialogOpen(false)
      setImportJson('')
    } else {
      showSnackbar('没有有效的书源配置', 'error')
    }
  }

  // 单个测试
  const handleTestSource = async (source: UserSourceConfig) => {
    setTestingSources(new Set([...testingSources, source.sourceId]))
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
      const newTesting = new Set(testingSources)
      newTesting.delete(source.sourceId)
      setTestingSources(newTesting)
    }
  }

  // 导出
  const handleExportClick = () => {
    const sourcesToExport = selectedSources.size > 0
      ? displayedSources.filter(s => selectedSources.has(s.sourceId))
      : displayedSources

    const exportData = sourcesToExport.map(s => s.config)
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

  // 创建分组
  const handleCreateGroup = () => {
    if (!newGroupName.trim()) {
      showSnackbar('请输入分组名称', 'error')
      return
    }
    addGroup(newGroupName.trim())
    showSnackbar('分组已创建', 'success')
    setNewGroupName('')
    setGroupDialogOpen(false)
  }

  // 移动到分组
  const handleMoveToGroup = (groupId: string | undefined) => {
    if (selectedSources.size === 0) {
      showSnackbar('请先选择书源', 'error')
      return
    }
    selectedSources.forEach(sourceId => setSourceGroup(sourceId, groupId))
    showSnackbar(`已移动 ${selectedSources.size} 个书源`, 'success')
    setSelectedSources(new Set())
  }

  // 统计
  const totalCount = userSourceConfigs.filter(s => s.isCustom).length
  const enabledCount = userSourceConfigs.filter(s => s.enabled && s.isCustom).length

  return (
    <Box sx={{ pb: 7 }}>
      <Container maxWidth="lg" sx={{ py: 2 }}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
          书源管理
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          导入书源配置，数据存储在本地浏览器。支持批量操作和分组管理。
        </Typography>

        {/* 统计 */}
        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <Paper sx={{ p: 1.5, minWidth: 100 }}>
            <Typography variant="body2" color="text.secondary">已启用</Typography>
            <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'success.main' }}>{enabledCount}</Typography>
          </Paper>
          <Paper sx={{ p: 1.5, minWidth: 100 }}>
            <Typography variant="body2" color="text.secondary">总数</Typography>
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>{totalCount}</Typography>
          </Paper>
          <Paper sx={{ p: 1.5, minWidth: 100 }}>
            <Typography variant="body2" color="text.secondary">分组</Typography>
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>{sourceGroups.length}</Typography>
          </Paper>
        </Box>

        {/* 操作按钮 */}
        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setImportDialogOpen(true)}>
            导入书源
          </Button>
          <Button variant="outlined" startIcon={<GroupIcon />} onClick={() => setGroupDialogOpen(true)}>
            新建分组
          </Button>
          <Button variant="outlined" startIcon={<FileDownloadIcon />} onClick={handleExportClick}>
            导出书源
          </Button>
        </Box>

        {/* 分组 Tabs */}
        <Box sx={{ mb: 2 }}>
          <Tabs value={currentTab} onChange={(_, v) => setCurrentTab(v)}>
            <Tab label="全部" />
            {sourceGroups.map(group => (
              <Tab key={group.id} label={group.name} />
            ))}
          </Tabs>
        </Box>

        {/* 批量操作工具栏 */}
        {selectedSources.size > 0 && (
          <Paper sx={{ p: 1, mb: 2, display: 'flex', gap: 1, alignItems: 'center' }}>
            <Typography variant="body2">已选择 {selectedSources.size} 个</Typography>
            <Button size="small" onClick={() => handleBatchToggle(true)}>批量启用</Button>
            <Button size="small" onClick={() => handleBatchToggle(false)}>批量禁用</Button>
            <Button size="small" color="primary" onClick={handleBatchTest} disabled={testingSources.size > 0}>
              {testingSources.size > 0 ? '测试中...' : '批量测试'}
            </Button>
            <Button size="small" color="error" onClick={handleBatchDelete}>批量删除</Button>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>移动到</InputLabel>
              <Select label="移动到" onChange={(e) => handleMoveToGroup(e.target.value as string)}>
                <MenuItem value="">取消分组</MenuItem>
                {sourceGroups.map(g => (
                  <MenuItem key={g.id} value={g.id}>{g.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Paper>
        )}

        {/* 书源列表 */}
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={selectedSources.size === displayedSources.length && displayedSources.length > 0}
                    indeterminate={selectedSources.size > 0 && selectedSources.size < displayedSources.length}
                    onChange={handleSelectAll}
                  />
                </TableCell>
                <TableCell>名称</TableCell>
                <TableCell>启用</TableCell>
                <TableCell>分组</TableCell>
                <TableCell>操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {displayedSources.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    <Typography color="text.secondary">
                      {currentTab === 0 ? '暂无书源，点击"导入书源"添加' : '该分组暂无书源'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                displayedSources.map(source => (
                  <TableRow key={source.sourceId}>
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={selectedSources.has(source.sourceId)}
                        onChange={() => handleSelectSource(source.sourceId)}
                      />
                    </TableCell>
                    <TableCell>{source.sourceName}</TableCell>
                    <TableCell>
                      <Switch
                        checked={source.enabled}
                        onChange={() => setUserSourceEnabled(source.sourceId, !source.enabled)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {source.groupId ? (
                        <Chip
                          label={sourceGroups.find(g => g.id === source.groupId)?.name || ''}
                          size="small"
                          onDelete={() => setSourceGroup(source.sourceId, undefined)}
                        />
                      ) : (
                        <Typography variant="body2" color="text.secondary">未分组</Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Tooltip title="测试">
                        <IconButton size="small" onClick={() => handleTestSource(source)} disabled={testingSources.has(source.sourceId)}>
                          {testingSources.has(source.sourceId) ? <CircularProgress size={16} /> : <PlayArrowIcon />}
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="删除">
                        <IconButton size="small" onClick={() => removeMultipleSources([source.sourceId])}>
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

        {/* 分组管理区 */}
        {sourceGroups.length > 0 && (
          <Paper sx={{ mt: 2, p: 2 }}>
            <Typography variant="subtitle1" gutterBottom>分组管理</Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {sourceGroups.map(group => (
                <Chip
                  key={group.id}
                  label={`${group.name} (${getSourcesByGroup(group.id).length})`}
                  onDelete={() => {
                    removeGroup(group.id)
                    showSnackbar('分组已删除', 'info')
                  }}
                  variant="outlined"
                />
              ))}
            </Box>
          </Paper>
        )}

        {/* 导入对话框 */}
        <Dialog open={importDialogOpen} onClose={() => setImportDialogOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle>导入书源</DialogTitle>
          <DialogContent>
            <Alert severity="info" sx={{ mb: 2 }}>
              支持书源JSON配置或JSON文件URL链接。兼容 yckceo.com/yuedu/shuyuans 格式。
              导入的书源将添加到当前分组（如果选中了分组）。
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

        {/* 新建分组对话框 */}
        <Dialog open={groupDialogOpen} onClose={() => setGroupDialogOpen(false)}>
          <DialogTitle>新建分组</DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="分组名称"
              sx={{ mt: 1 }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setGroupDialogOpen(false)}>取消</Button>
            <Button variant="contained" onClick={handleCreateGroup}>创建</Button>
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