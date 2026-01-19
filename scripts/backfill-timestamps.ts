/**
 * Backfill script for JournalEntry.occurredAt and capturedAt fields.
 * Sets occurredAt and capturedAt to createdAt for existing entries.
 * Also sets MediaAsset.capturedAt to createdAt for audio/image assets.
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Starting timestamp backfill...')

  // Backfill JournalEntry.occurredAt
  const occurredAtResult = await prisma.$executeRaw`
    UPDATE "JournalEntry"
    SET "occurredAt" = "createdAt"
    WHERE "occurredAt" IS NULL
  `
  console.log(`Updated ${occurredAtResult} JournalEntry rows with occurredAt`)

  // Backfill JournalEntry.capturedAt
  const capturedAtResult = await prisma.$executeRaw`
    UPDATE "JournalEntry"
    SET "capturedAt" = "createdAt"
    WHERE "capturedAt" IS NULL
  `
  console.log(`Updated ${capturedAtResult} JournalEntry rows with capturedAt`)

  // Backfill MediaAsset.capturedAt for audio/image assets
  const mediaResult = await prisma.$executeRaw`
    UPDATE "MediaAsset"
    SET "capturedAt" = "createdAt"
    WHERE "capturedAt" IS NULL
      AND ("mimeType" LIKE 'audio/%' OR "mimeType" LIKE 'image/%')
  `
  console.log(`Updated ${mediaResult} MediaAsset rows with capturedAt`)

  console.log('Backfill complete!')
}

main()
  .catch((e) => {
    console.error('Backfill failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
