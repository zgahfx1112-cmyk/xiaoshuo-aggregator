'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Box,
  Container,
  Typography,
  IconButton,
  Slider,
  Drawer,
  FormControl,
  RadioGroup,
  FormControlLabel,
  Radio,
  Button,
  AppBar,
  Toolbar,
  Paper,
  useTheme,
  useMediaQuery,
} from '@mui/material'
import {
  ArrowBack,
  Settings as SettingsIcon,
  ChevronLeft,
  ChevronRight,
} from '@mui/icons-material'

export type BackgroundTheme = 'white' | 'sepia' | 'dark'
export type PageMode = 'click' | 'scroll'

interface ReaderProps {
  content: string
  title: string
  chapterNum: number
  nextChapter: number | null
  prevChapter: number | null
  onPrevChapter?: () => void
  onNextChapter?: () => void
  onSettingsChange?: (settings: ReaderSettings) => void
}

export interface ReaderSettings {
  fontSize: number
  background: BackgroundTheme
  pageMode: PageMode
}

const SETTINGS_KEY = 'reader_settings'

const DEFAULT_SETTINGS: ReaderSettings = {
  fontSize: 18,
  background: 'white',
  pageMode: 'scroll',
}

const BACKGROUND_STYLES: Record<BackgroundTheme, { bg: string; color: string }> = {
  white: { bg: '#ffffff', color: '#333333' },
  sepia: { bg: '#f4ecd8', color: '#5b4636' },
  dark: { bg: '#1a1a1a', color: '#e0e0e0' },
}

export function Reader({
  content,
  title,
  chapterNum,
  nextChapter,
  prevChapter,
  onPrevChapter,
  onNextChapter,
  onSettingsChange,
}: ReaderProps) {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const containerRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  const [settings, setSettings] = useState<ReaderSettings>(DEFAULT_SETTINGS)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  // Load settings from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return

    try {
      const stored = localStorage.getItem(SETTINGS_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<ReaderSettings>
        setSettings({ ...DEFAULT_SETTINGS, ...parsed })
      }
    } catch {
      // Use defaults
    }
  }, [])

  // Save settings to localStorage
  const updateSettings = useCallback(
    (newSettings: Partial<ReaderSettings>) => {
      setSettings(prev => {
        const updated = { ...prev, ...newSettings }
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated))
        onSettingsChange?.(updated)
        return updated
      })
    },
    [onSettingsChange]
  )

  // Calculate pages for click mode
  useEffect(() => {
    if (settings.pageMode !== 'click' || !contentRef.current || !containerRef.current) {
      setTotalPages(1)
      setCurrentPage(0)
      return
    }

    const calculatePages = () => {
      const container = containerRef.current
      const contentEl = contentRef.current

      if (!container || !contentEl) return

      const containerHeight = container.clientHeight
      const contentHeight = contentEl.scrollHeight
      const pages = Math.ceil(contentHeight / containerHeight) || 1

      setTotalPages(pages)
    }

    calculatePages()
    window.addEventListener('resize', calculatePages)
    return () => window.removeEventListener('resize', calculatePages)
  }, [content, settings.pageMode])

  // Handle keyboard navigation
  useEffect(() => {
    if (settings.pageMode !== 'click') return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault()
        handlePrevPage()
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ') {
        e.preventDefault()
        handleNextPage()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [settings.pageMode, currentPage, totalPages])

  // Handle click navigation
  const handleContentClick = useCallback(
    (e: React.MouseEvent) => {
      if (settings.pageMode !== 'click') return

      const container = containerRef.current
      if (!container) return

      const rect = container.getBoundingClientRect()
      const clickX = e.clientX - rect.left
      const containerWidth = rect.width

      if (clickX < containerWidth * 0.3) {
        handlePrevPage()
      } else if (clickX > containerWidth * 0.7) {
        handleNextPage()
      }
    },
    [settings.pageMode, currentPage, totalPages]
  )

  const handlePrevPage = useCallback(() => {
    if (currentPage > 0) {
      setCurrentPage(prev => prev - 1)
    } else if (prevChapter !== null) {
      onPrevChapter?.()
    }
  }, [currentPage, prevChapter, onPrevChapter])

  const handleNextPage = useCallback(() => {
    if (currentPage < totalPages - 1) {
      setCurrentPage(prev => prev + 1)
    } else if (nextChapter !== null) {
      onNextChapter?.()
    }
  }, [currentPage, totalPages, nextChapter, onNextChapter])

  // Background style
  const bgStyle = BACKGROUND_STYLES[settings.background]

  // Content paragraphs
  const paragraphs = content.split('\n').filter(p => p.trim())

  // Scroll offset for click mode
  const scrollOffset =
    settings.pageMode === 'click' && containerRef.current
      ? currentPage * containerRef.current.clientHeight
      : 0

  return (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: bgStyle.bg,
        color: bgStyle.color,
        transition: 'background-color 0.3s, color 0.3s',
      }}
    >
      {/* Header */}
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          bgcolor: bgStyle.bg,
          color: bgStyle.color,
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Toolbar sx={{ px: { xs: 1, sm: 2 } }}>
          <Typography
            variant="h6"
            component="h1"
            sx={{
              flex: 1,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              fontSize: { xs: '0.9rem', sm: '1.1rem' },
            }}
          >
            {title}
          </Typography>
          <IconButton
            edge="end"
            onClick={() => setSettingsOpen(true)}
            sx={{ color: bgStyle.color }}
            aria-label="Settings"
          >
            <SettingsIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* Content Area */}
      <Box
        ref={containerRef}
        onClick={handleContentClick}
        sx={{
          flex: 1,
          overflow: settings.pageMode === 'scroll' ? 'auto' : 'hidden',
          cursor: settings.pageMode === 'click' ? 'pointer' : 'default',
        }}
      >
        <Container maxWidth="md" sx={{ py: 3 }}>
          <Box
            ref={contentRef}
            sx={{
              fontSize: settings.fontSize,
              lineHeight: 1.8,
              transform:
                settings.pageMode === 'click' ? `translateY(-${scrollOffset}px)` : 'none',
              transition: settings.pageMode === 'click' ? 'transform 0.3s ease-out' : 'none',
            }}
          >
            {paragraphs.map((paragraph, index) => (
              <Box
                key={index}
                component="p"
                sx={{
                  textIndent: '2em',
                  mb: 1,
                  fontSize: 'inherit',
                  lineHeight: 'inherit',
                  margin: 0,
                  marginBottom: '0.5em',
                }}
              >
                {paragraph}
              </Box>
            ))}
          </Box>
        </Container>
      </Box>

      {/* Page indicator for click mode */}
      {settings.pageMode === 'click' && totalPages > 1 && (
        <Box
          sx={{
            position: 'fixed',
            bottom: 80,
            left: '50%',
            transform: 'translateX(-50%)',
            bgcolor: 'rgba(0, 0, 0, 0.6)',
            color: 'white',
            px: 2,
            py: 0.5,
            borderRadius: 2,
            fontSize: '0.85rem',
          }}
        >
          {currentPage + 1} / {totalPages}
        </Box>
      )}

      {/* Navigation Footer */}
      <Paper
        elevation={3}
        sx={{
          bgcolor: bgStyle.bg,
          color: bgStyle.color,
          borderTop: '1px solid',
          borderColor: 'divider',
          py: 1,
          px: 2,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1,
          }}
        >
          <Button
            startIcon={<ChevronLeft />}
            disabled={prevChapter === null}
            onClick={onPrevChapter}
            sx={{ color: bgStyle.color, opacity: prevChapter === null ? 0.5 : 1 }}
          >
            {isMobile ? '' : 'Previous'}
          </Button>

          <Typography variant="body2" color="inherit">
            Chapter {chapterNum}
          </Typography>

          <Button
            endIcon={<ChevronRight />}
            disabled={nextChapter === null}
            onClick={onNextChapter}
            sx={{ color: bgStyle.color, opacity: nextChapter === null ? 0.5 : 1 }}
          >
            {isMobile ? '' : 'Next'}
          </Button>
        </Box>
      </Paper>

      {/* Settings Drawer */}
      <Drawer
        anchor="bottom"
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        slotProps={{
          paper: {
            sx: { bgcolor: bgStyle.bg, color: bgStyle.color },
          },
        }}
      >
        <Box sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Reading Settings
          </Typography>

          {/* Font Size */}
          <Box sx={{ mb: 3 }}>
            <Typography gutterBottom>Font Size: {settings.fontSize}px</Typography>
            <Slider
              value={settings.fontSize}
              onChange={(_, value) => updateSettings({ fontSize: value as number })}
              min={12}
              max={24}
              step={1}
              marks={[
                { value: 12, label: '12' },
                { value: 18, label: '18' },
                { value: 24, label: '24' },
              ]}
              valueLabelDisplay="auto"
              sx={{ color: bgStyle.color === '#e0e0e0' ? '#90caf9' : 'primary' }}
            />
          </Box>

          {/* Background Theme */}
          <Box sx={{ mb: 3 }}>
            <Typography gutterBottom>Background Theme</Typography>
            <FormControl>
              <RadioGroup
                row
                value={settings.background}
                onChange={e =>
                  updateSettings({ background: e.target.value as BackgroundTheme })
                }
              >
                <FormControlLabel
                  value="white"
                  control={<Radio />}
                  label="White"
                  sx={{ color: bgStyle.color }}
                />
                <FormControlLabel
                  value="sepia"
                  control={<Radio />}
                  label="Sepia"
                  sx={{ color: bgStyle.color }}
                />
                <FormControlLabel
                  value="dark"
                  control={<Radio />}
                  label="Dark"
                  sx={{ color: bgStyle.color }}
                />
              </RadioGroup>
            </FormControl>
          </Box>

          {/* Page Mode */}
          <Box sx={{ mb: 2 }}>
            <Typography gutterBottom>Page Mode</Typography>
            <FormControl>
              <RadioGroup
                row
                value={settings.pageMode}
                onChange={e => updateSettings({ pageMode: e.target.value as PageMode })}
              >
                <FormControlLabel
                  value="scroll"
                  control={<Radio />}
                  label="Scroll"
                  sx={{ color: bgStyle.color }}
                />
                <FormControlLabel
                  value="click"
                  control={<Radio />}
                  label="Click to Page"
                  sx={{ color: bgStyle.color }}
                />
              </RadioGroup>
            </FormControl>
          </Box>

          {/* Close Button */}
          <Button
            variant="contained"
            fullWidth
            onClick={() => setSettingsOpen(false)}
            sx={{ mt: 2 }}
          >
            Close
          </Button>
        </Box>
      </Drawer>
    </Box>
  )
}

export default Reader