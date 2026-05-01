import { PrismaClient } from '@prisma/client'
import { BUILTIN_SOURCES } from '../src/config/sources'

const prisma = new PrismaClient()

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
        },
      })
      console.log(`Created new source: ${source.name}`)
    }
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