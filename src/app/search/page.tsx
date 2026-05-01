import { Suspense } from 'react'

export const dynamic = 'force-dynamic'

interface SearchPageProps {
  searchParams: Promise<{ query?: string; page?: string; customSources?: string }>
}

export default function SearchPage({ searchParams }: SearchPageProps) {
  return (
    <Suspense fallback={<SearchPageLoading />}>
      <SearchResultsHandler searchParams={searchParams} />
    </Suspense>
  )
}

function SearchPageLoading() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center mb-8">
          <div className="w-full max-w-2xl h-14 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
              <div className="h-48 bg-gray-200 dark:bg-gray-700 animate-pulse" />
              <div className="p-3 space-y-2">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3 animate-pulse" />
                <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-1/2 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Separate content component to handle async searchParams
async function SearchResultsHandler({ searchParams }: SearchPageProps) {
  const params = await searchParams
  const query = params.query || ''
  const page = parseInt(params.page || '1', 10)
  const customSources = params.customSources || ''

  let searchResults = { novels: [], total: 0, page: 1 }
  let error = null

  if (query.trim().length > 0) {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
      const searchUrl = new URL(`${baseUrl}/api/search`)
      searchUrl.searchParams.set('query', query)
      searchUrl.searchParams.set('page', String(page))
      if (customSources) {
        searchUrl.searchParams.set('customSources', customSources)
      }

      const response = await fetch(searchUrl.toString(), { cache: 'no-store' })
      const data = await response.json()
      if (data.success) {
        searchResults = data.data
      } else {
        error = data.error || 'Search failed'
      }
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to fetch search results'
    }
  }

  return <SearchResultsView query={query} results={searchResults} error={error} customSources={customSources} />
}

interface SearchResults {
  novels: Array<{
    title: string
    author: string
    cover: string
    bookUrl: string
    sourceName: string
  }>
  total: number
  page: number
}

interface SearchResultsViewProps {
  query: string
  results: SearchResults
  error: string | null
  customSources?: string
}

function SearchResultsView({
  query,
  results,
  error,
  customSources
}: SearchResultsViewProps) {
  const page = results.page || 1
  const totalPages = Math.ceil(results.total / 20)

  // 构建分页URL，保留customSources参数
  const buildPageUrl = (pageNum: number) => {
    const params = new URLSearchParams()
    params.set('query', query)
    params.set('page', String(pageNum))
    if (customSources) params.set('customSources', customSources)
    return `/search?${params.toString()}`
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-16">
      <div className="container mx-auto px-4 py-8">
        {/* Search Bar */}
        <div className="flex justify-center mb-8">
          <form action="/search" method="get" className="w-full max-w-2xl">
            <div className="flex gap-2">
              <input
                type="text"
                name="query"
                defaultValue={query}
                placeholder="搜索小说..."
                className="flex-1 px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                搜索
              </button>
            </div>
          </form>
        </div>

        {/* Results Section */}
        {error && (
          <div className="text-center py-8">
            <p className="text-red-500">{error}</p>
          </div>
        )}

        {!error && query.trim().length === 0 && (
          <div className="text-center py-16">
            <p className="text-gray-500 dark:text-gray-400 text-lg">
              Enter a search term to find novels
            </p>
          </div>
        )}

        {!error && query.trim().length > 0 && (
          <>
            {/* Results count */}
            <div className="mb-6">
              <p className="text-gray-600 dark:text-gray-400">
                Found <span className="font-semibold">{results.total}</span> results for{' '}
                <span className="font-semibold">&quot;{query}&quot;</span>
              </p>
            </div>

            {/* Results grid */}
            {results.novels.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-gray-500 dark:text-gray-400 text-lg">
                  No novels found for &quot;{query}&quot;
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {results.novels.map((novel, index) => (
                  <a
                    key={`${novel.title}-${novel.sourceName}-${index}`}
                    href={`/novel/${encodeURIComponent(novel.title)}?source=${encodeURIComponent(novel.sourceName)}&bookUrl=${encodeURIComponent(novel.bookUrl)}`}
                    className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden hover:shadow-lg transition-shadow hover:-translate-y-1 transform transition-transform"
                  >
                    <div className="h-48 bg-gray-200 dark:bg-gray-700">
                      {novel.cover ? (
                        <img
                          src={novel.cover}
                          alt={novel.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement
                            target.style.display = 'none'
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          No Cover
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <h3 className="font-semibold text-sm truncate dark:text-white">
                        {novel.title}
                      </h3>
                      <p className="text-gray-500 dark:text-gray-400 text-xs truncate mt-1">
                        {novel.author || 'Unknown Author'}
                      </p>
                      <span className="inline-block mt-2 px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">
                        {novel.sourceName}
                      </span>
                    </div>
                  </a>
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center mt-8 gap-2">
                {page > 1 && (
                  <a
                    href={buildPageUrl(page - 1)}
                    className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    上一页
                  </a>
                )}

                <div className="flex gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number
                    if (totalPages <= 5) {
                      pageNum = i + 1
                    } else if (page <= 3) {
                      pageNum = i + 1
                    } else if (page >= totalPages - 2) {
                      pageNum = totalPages - 4 + i
                    } else {
                      pageNum = page - 2 + i
                    }

                    return (
                      <a
                        key={pageNum}
                        href={buildPageUrl(pageNum)}
                        className={`px-4 py-2 rounded-lg transition-colors ${
                          pageNum === page
                            ? 'bg-blue-600 text-white'
                            : 'bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                      >
                        {pageNum}
                      </a>
                    )
                  })}
                </div>

                {page < totalPages && (
                  <a
                    href={buildPageUrl(page + 1)}
                    className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    下一页
                  </a>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}