import type { Metadata } from 'next'
import ReadingPageClient from './ReadingPageClient'

interface RouteParams {
  params: Promise<{ novelId: string; chapterNum: string }>
}

async function getChapterInfo(novelId: string, chapterNum: number) {
  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

  try {
    const response = await fetch(`${baseUrl}/api/novel/${novelId}`, {
      next: { revalidate: 3600 },
    })

    if (!response.ok) return null

    const result = await response.json()
    if (!result.success || !result.data) return null

    return {
      novelTitle: result.data.novel.title,
      author: result.data.novel.author,
      chapterTitle: `Chapter ${chapterNum}`,
    }
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: RouteParams): Promise<Metadata> {
  const { novelId, chapterNum } = await params
  const chapterNumInt = parseInt(chapterNum, 10)

  if (isNaN(chapterNumInt) || chapterNumInt < 1) {
    return {
      title: 'Invalid Chapter',
      description: 'The requested chapter could not be found.',
    }
  }

  const info = await getChapterInfo(novelId, chapterNumInt)

  if (!info) {
    return {
      title: 'Chapter Not Found',
      description: 'The requested chapter could not be found.',
    }
  }

  const title = `${info.chapterTitle} - ${info.novelTitle}`
  const description = `Read ${info.chapterTitle} of "${info.novelTitle}" by ${info.author} on Xiaoshuo platform.`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'article',
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
    robots: {
      index: false, // Reading pages behind auth logic
      follow: false,
    },
    alternates: {
      canonical: `/read/${novelId}/${chapterNum}`,
    },
  }
}

export default function ReadingPage({ params }: RouteParams) {
  return <ReadingPageClient params={params} />
}