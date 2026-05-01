'use client'

import { Box, Typography, Slider, Drawer, FormControl, RadioGroup, FormControlLabel, Radio, Button } from '@mui/material'

export type BackgroundTheme = 'white' | 'sepia' | 'dark'
export type PageMode = 'scroll' | 'click'

export interface ReaderSettings {
  fontSize: number
  background: BackgroundTheme
  pageMode: PageMode
}

interface ReadingSettingsProps {
  open: boolean
  onClose: () => void
  settings: ReaderSettings
  onSettingsChange: (settings: Partial<ReaderSettings>) => void
  bgStyle: { bg: string; color: string }
}

export const DEFAULT_SETTINGS: ReaderSettings = {
  fontSize: 18,
  background: 'white',
  pageMode: 'scroll',
}

export const SETTINGS_KEY = 'xiaoshuo_reader_settings'

export const BACKGROUND_STYLES: Record<BackgroundTheme, { bg: string; color: string }> = {
  white: { bg: '#ffffff', color: '#333333' },
  sepia: { bg: '#f4ecd8', color: '#5b4636' },
  dark: { bg: '#1a1a1a', color: '#e0e0e0' },
}

export function ReadingSettings({
  open,
  onClose,
  settings,
  onSettingsChange,
  bgStyle,
}: ReadingSettingsProps) {
  return (
    <Drawer
      anchor="bottom"
      open={open}
      onClose={onClose}
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
            onChange={(_, value) => onSettingsChange({ fontSize: value as number })}
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
              onChange={e => onSettingsChange({ background: e.target.value as BackgroundTheme })}
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
              onChange={e => onSettingsChange({ pageMode: e.target.value as PageMode })}
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
        <Button variant="contained" fullWidth onClick={onClose} sx={{ mt: 2 }}>
          Close
        </Button>
      </Box>
    </Drawer>
  )
}

export default ReadingSettings