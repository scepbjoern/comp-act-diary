
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function backfillTimeBoxEntities() {
  console.log('Starting backfill of TimeBox entities...')

  try {
    // 1. Get all TimeBoxes
    // We fetch ID and userId only to minimize memory usage
    const timeBoxes = await prisma.timeBox.findMany({
      select: {
        id: true,
        userId: true,
      },
    })

    console.log(`Found ${timeBoxes.length} TimeBox records. Checking for missing Entities...`)

    let createdCount = 0
    let skippedCount = 0
    let errorCount = 0

    // 2. Process in chunks to be nice to the DB
    const CHUNK_SIZE = 50
    for (let i = 0; i < timeBoxes.length; i += CHUNK_SIZE) {
      const chunk = timeBoxes.slice(i, i + CHUNK_SIZE)
      
      await Promise.all(
        chunk.map(async (tb) => {
          try {
            // Check if entity exists
            const existingEntity = await prisma.entity.findUnique({
              where: { id: tb.id },
            })

            if (!existingEntity) {
              // Create Entity
              // @ts-ignore - TIMEBOX might not be fully typed if client isn't regenerated yet
              await prisma.entity.create({
                data: {
                  id: tb.id,
                  userId: tb.userId,
                  type: 'TIMEBOX',
                },
              })
              createdCount++
              // process.stdout.write('.')
            } else {
              skippedCount++
            }
          } catch (err) {
            console.error(`\nFailed to create Entity for TimeBox ${tb.id}:`, err)
            errorCount++
          }
        })
      )
      
      // Progress log every chunk
      if ((i + CHUNK_SIZE) % 500 === 0 || i + CHUNK_SIZE >= timeBoxes.length) {
         console.log(`Processed ${Math.min(i + CHUNK_SIZE, timeBoxes.length)}/${timeBoxes.length}`)
      }
    }

    console.log('\n--- Backfill Complete ---')
    console.log(`Total TimeBoxes: ${timeBoxes.length}`)
    console.log(`Entities Created: ${createdCount}`)
    console.log(`Already Existed:  ${skippedCount}`)
    console.log(`Errors:           ${errorCount}`)

  } catch (error) {
    console.error('Fatal error during backfill:', error)
  } finally {
    await prisma.$disconnect()
  }
}

backfillTimeBoxEntities()
