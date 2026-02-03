/**
 * scripts/migrate-journal-entries.ts
 * Migration script to ensure all JournalEntries have:
 * 1. A corresponding Entity registry entry
 * 2. Default sharing rules applied
 * 
 * Run with: npx tsx scripts/migrate-journal-entries.ts
 * 
 * Options:
 * --dry-run: Preview changes without applying them
 * --with-mentions: Also detect and create mentions (slower)
 */

import { PrismaClient } from '@prisma/client'
import { getJournalEntryAccessService } from '../lib/services/journalEntryAccessService'

const prisma = new PrismaClient()

// =============================================================================
// TYPES
// =============================================================================

interface MigrationStats {
  totalEntries: number
  entitiesCreated: number
  sharingApplied: number
  errors: string[]
}

interface MigrationOptions {
  dryRun: boolean
  withMentions: boolean
}

// =============================================================================
// MAIN MIGRATION
// =============================================================================

async function migrate(options: MigrationOptions): Promise<MigrationStats> {
  const stats: MigrationStats = {
    totalEntries: 0,
    entitiesCreated: 0,
    sharingApplied: 0,
    errors: [],
  }

  console.log('Starting JournalEntry migration...')
  console.log(`Options: dryRun=${options.dryRun}, withMentions=${options.withMentions}`)
  console.log('')

  // Get all journal entries
  const entries = await prisma.journalEntry.findMany({
    where: { deletedAt: null },
    include: {
      type: true,
      timeBox: true,
    },
  })

  stats.totalEntries = entries.length
  console.log(`Found ${entries.length} entries to process`)
  console.log('')

  for (const entry of entries) {
    try {
      // 1. Ensure Entity exists
      const existingEntity = await prisma.entity.findUnique({
        where: { id: entry.id },
      })

      if (!existingEntity) {
        if (options.dryRun) {
          console.log(`  [DRY-RUN] Would create Entity for ${entry.id}`)
        } else {
          await prisma.entity.create({
            data: {
              id: entry.id,
              userId: entry.userId,
              type: 'JOURNAL_ENTRY',
            },
          })
          console.log(`  Created Entity for ${entry.id}`)
        }
        stats.entitiesCreated++
      }

      // 2. Apply default sharing (if not already applied)
      const existingAccess = await prisma.journalEntryAccess.findFirst({
        where: { journalEntryId: entry.id },
      })

      if (!existingAccess && entry.typeId) {
        if (options.dryRun) {
          console.log(`  [DRY-RUN] Would apply sharing for ${entry.id}`)
        } else {
          const accessService = getJournalEntryAccessService()
          await accessService.applyDefaultSharingOnCreate(entry.id, entry.userId, entry.typeId)
          console.log(`  Applied sharing for ${entry.id}`)
        }
        stats.sharingApplied++
      }

      // 3. Mentions detection (optional, can be slow)
      // Skipped for now - can be done separately via batch processing
      // See /api/batch/mentions for batch mention detection

    } catch (error) {
      const msg = `Error processing ${entry.id}: ${error}`
      stats.errors.push(msg)
      console.error(msg)
    }
  }

  return stats
}

// =============================================================================
// CLI ENTRY POINT
// =============================================================================

async function main() {
  const args = process.argv.slice(2)
  const options: MigrationOptions = {
    dryRun: args.includes('--dry-run'),
    withMentions: args.includes('--with-mentions'),
  }

  if (options.dryRun) {
    console.log('='.repeat(60))
    console.log('DRY RUN MODE - No changes will be made')
    console.log('='.repeat(60))
    console.log('')
  }

  try {
    const stats = await migrate(options)

    console.log('')
    console.log('='.repeat(60))
    console.log('Migration Complete')
    console.log('='.repeat(60))
    console.log(`Total entries processed: ${stats.totalEntries}`)
    console.log(`Entities created: ${stats.entitiesCreated}`)
    console.log(`Sharing rules applied: ${stats.sharingApplied}`)
    
    if (stats.errors.length > 0) {
      console.log(`Errors: ${stats.errors.length}`)
      stats.errors.forEach((e) => console.log(`  - ${e}`))
    } else {
      console.log('No errors occurred.')
    }

    if (options.dryRun) {
      console.log('')
      console.log('This was a dry run. Run without --dry-run to apply changes.')
    }
  } catch (error) {
    console.error('Migration failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
