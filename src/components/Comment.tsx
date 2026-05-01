'use client'

import { useEffect, useRef, useState } from 'react'
import { Box } from '@mui/material'

interface CommentProps {
  /**
   * GitHub repository in format "owner/repo"
   * Can also be set via NEXT_PUBLIC_GISCUS_REPO environment variable
   */
  repo?: string
  /**
   * Repository ID from GitHub Discussions
   * Can also be set via NEXT_PUBLIC_GISCUS_REPO_ID environment variable
   */
  repoId?: string
  /**
   * Discussion category ID
   * Can also be set via NEXT_PUBLIC_GISCUS_CATEGORY_ID environment variable
   */
  categoryId?: string
  /**
   * Discussion category name (default: "Announcements")
   * Can also be set via NEXT_PUBLIC_GISCUS_CATEGORY environment variable
   */
  category?: string
  /**
   * Mapping strategy (default: "pathname")
   */
  mapping?: 'pathname' | 'url' | 'title' | 'og:title' | 'number' | 'specific'
  /**
   * Term to use with specific mapping
   */
  term?: string
  /**
   * Theme for comments (default: preferred_color_scheme for auto dark/light)
   */
  theme?: string
  /**
   * Language for comments (default: "en")
   */
  lang?: string
  /**
   * Lazy loading (default: true)
   */
  lazyLoad?: boolean
}

declare global {
  interface Window {
    giscus?: {
      reload: () => void
    }
  }
}

/**
 * Detects if dark mode is preferred by the user
 */
function useDarkMode(): boolean {
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    setIsDark(mediaQuery.matches)

    const handler = (e: MediaQueryListEvent) => setIsDark(e.matches)
    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [])

  return isDark
}

export default function Comment({
  repo,
  repoId,
  categoryId,
  category = 'Announcements',
  mapping = 'pathname',
  term,
  theme = 'preferred_color_scheme',
  lang = 'en',
  lazyLoad = true,
}: CommentProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const isDark = useDarkMode()

  // Get configuration from props or environment variables
  const giscusRepo = repo || process.env.NEXT_PUBLIC_GISCUS_REPO || ''
  const giscusRepoId = repoId || process.env.NEXT_PUBLIC_GISCUS_REPO_ID || ''
  const giscusCategoryId =
    categoryId || process.env.NEXT_PUBLIC_GISCUS_CATEGORY_ID || ''
  const giscusCategory =
    category || process.env.NEXT_PUBLIC_GISCUS_CATEGORY || 'Announcements'

  // Determine theme based on dark mode preference
  const giscusTheme =
    theme === 'preferred_color_scheme' ? (isDark ? 'dark' : 'light') : theme

  useEffect(() => {
    // Skip if required configuration is missing
    if (!giscusRepo || !giscusRepoId || !giscusCategoryId) {
      return
    }

    // Create iframe for Giscus
    const iframe = document.createElement('iframe')
    iframe.src = 'https://giscus.app/client.js'
    iframe.style.width = '100%'
    iframe.style.height = '100%'
    iframe.style.border = 'none'
    iframe.style.minHeight = '200px'
    iframe.setAttribute('loading', lazyLoad ? 'lazy' : 'eager')
    iframe.setAttribute('scrolling', 'no')
    iframe.setAttribute(
      'src',
      `https://giscus.app/client.js?repo=${encodeURIComponent(giscusRepo)}&repoId=${encodeURIComponent(giscusRepoId)}&category=${encodeURIComponent(giscusCategory)}&categoryId=${encodeURIComponent(giscusCategoryId)}&mapping=${mapping}${term ? `&term=${encodeURIComponent(term)}` : ''}&theme=${encodeURIComponent(giscusTheme)}&lang=${lang}&strict=0&reactionsEnabled=1&emitMetadata=0&inputPosition=bottom&crossOrigin=anonymous`
    )

    // Clear and append iframe
    if (containerRef.current) {
      containerRef.current.innerHTML = ''
      containerRef.current.appendChild(iframe)
      iframeRef.current = iframe
    }

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = ''
      }
    }
  }, [
    giscusRepo,
    giscusRepoId,
    giscusCategoryId,
    giscusCategory,
    mapping,
    term,
    giscusTheme,
    lang,
    lazyLoad,
  ])

  // Handle theme changes
  useEffect(() => {
    if (!iframeRef.current || theme !== 'preferred_color_scheme') return

    const currentTheme = isDark ? 'dark' : 'light'

    // Post message to Giscus iframe to update theme
    iframeRef.current.contentWindow?.postMessage(
      { giscus: { setConfig: { theme: currentTheme } } },
      'https://giscus.app'
    )
  }, [isDark, theme])

  // Show placeholder if configuration is missing
  if (!giscusRepo || !giscusRepoId || !giscusCategoryId) {
    return (
      <Box
        sx={{
          p: 3,
          textAlign: 'center',
          bgcolor: 'action.hover',
          borderRadius: 1,
          color: 'text.secondary',
        }}
      >
        Comments are not configured. Please set up Giscus configuration in
        environment variables:
        <Box
          component="code"
          sx={{ display: 'block', mt: 1, fontSize: '0.85em' }}
        >
          NEXT_PUBLIC_GISCUS_REPO=owner/repo
          <br />
          NEXT_PUBLIC_GISCUS_REPO_ID=xxx
          <br />
          NEXT_PUBLIC_GISCUS_CATEGORY_ID=xxx
        </Box>
      </Box>
    )
  }

  return (
    <Box
      ref={containerRef}
      sx={{
        width: '100%',
        minHeight: 200,
        my: 2,
      }}
    />
  )
}