import { notFound } from 'next/navigation'
import NovelDetailClient from './NovelDetailClient'

interface RouteParams {
  params: Promise<{ id: string }>
}

async function getNovelDetail(id: string) {
  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

  try {
    const response = await fetch(`${baseUrl}/api/novel/${id}`, {
      next: { revalidate: 3600 }, // Revalidate every hour
    })

    if (!response.ok) {
      if (response.status === 404) {
        return null
      }
      console.error('Error fetching novel detail:', response.status)
      return null
    }

    const result = await response.json()

    if (!result.success || !result.data) {
      return null
    }

    return result.data
  } catch (error) {
    console.error('Error fetching novel detail:', error)
    return null
  }
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
        description: 'The requested novel could not be found.',
      }
    }

    const { novel } = data
    const description = novel.description?.slice(0, 160) || `Read ${novel.title} by ${novel.author}`
    const title = `${novel.title} - ${novel.author}`

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: 'article',
        images: novel.cover ? [{ url: novel.cover, alt: novel.title }] : [],
        authors: [novel.author],
        tags: novel.tags,
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: novel.cover ? [novel.cover] : [],
      },
      alternates: {
        canonical: `/novel/${novel.id}`,
      },
    }
  } catch {
    return {
      title: 'Novel - Xiaoshuo',
      description: 'Browse novels on Xiaoshuo platform.',
    }
  }
}