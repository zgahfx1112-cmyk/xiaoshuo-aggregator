import { notFound } from 'next/navigation'
import NovelDetailClient from './NovelDetailClient'

interface RouteParams {
  params: Promise<{ id: string }>
}

async function getNovelDetail(id: string) {
  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

  const response = await fetch(`${baseUrl}/api/novel/${id}`, {
    next: { revalidate: 3600 }, // Revalidate every hour
  })

  if (!response.ok) {
    if (response.status === 404) {
      return null
    }
    throw new Error('Failed to fetch novel')
  }

  const result = await response.json()

  if (!result.success || !result.data) {
    return null
  }

  return result.data
}

export default async function NovelDetailPage({ params }: RouteParams) {
  const { id } = await params

  const data = await getNovelDetail(id)

  if (!data) {
    notFound()
  }

  const { novel, chapters, totalChapters } = data

  return (
    <NovelDetailClient
      novel={novel}
      chapters={chapters}
      totalChapters={totalChapters}
    />
  )
}

// Generate metadata for the page
export async function generateMetadata({ params }: RouteParams) {
  const { id } = await params

  try {
    const data = await getNovelDetail(id)

    if (!data) {
      return {
        title: 'Novel Not Found',
      }
    }

    const { novel } = data

    return {
      title: `${novel.title} - Xiaoshuo`,
      description: novel.description?.slice(0, 160) || `Read ${novel.title} by ${novel.author}`,
    }
  } catch {
    return {
      title: 'Novel - Xiaoshuo',
    }
  }
}