import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import { BUILTIN_SOURCES } from '../src/config/sources'
import { syncYckceoSources } from '../src/lib/yckceoScraper'

const connectionString = process.env.DATABASE_URL!
const pool = new pg.Pool({ connectionString })
const adapter = new PrismaPg(pool)

const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('Seeding builtin book sources...')

  // Insert builtin sources
  for (const source of BUILTIN_SOURCES) {
    const existingSource = await prisma.bookSource.findUnique({
      where: { name: source.name },
    })

    if (existingSource) {
      // Update existing source
      await prisma.bookSource.update({
        where: { name: source.name },
        data: {
          url: source.url,
          config: source as object,
          type: 'builtin',
          lastUpdated: new Date(),
        },
      })
      console.log(`Updated existing source: ${source.name}`)
    } else {
      // Create new source
      await prisma.bookSource.create({
        data: {
          name: source.name,
          url: source.url,
          config: source as object,
          type: 'builtin',
          enabled: true,
        },
      })
      console.log(`Created new source: ${source.name}`)
    }
  }

  // Sync from yckceo.com on startup
  console.log('Syncing sources from yckceo.com...')
  try {
    const result = await syncYckceoSources()
    console.log(`Synced ${result.total} sources: ${result.added} added, ${result.updated} updated, ${result.failed} failed`)
  } catch (error) {
    console.error('Failed to sync from yckceo:', error)
  }

  console.log('Seeding completed!')
}

main()
  .catch((e) => {
    console.error('Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })