/**
 * scripts/migrate-audio-attachments.ts
 * Migration script to link orphaned audio MediaAssets to JournalEntries via MediaAttachments.
 *
 * Problem: Audio uploads via legacy /api/diary/upload-audio created MediaAssets
 * but NO MediaAttachments. The link to JournalEntry is missing.
 *
 * Solution: Match audio assets to entries by:
 * - Same userId
 * - mimeType starts with 'audio/'
 * - capturedAt within ±5 minutes of entry.occurredAt
 * - No existing MediaAttachment for this asset
 *
 * Run with: npx tsx scripts/migrate-audio-attachments.ts
 *
 * Options:
 * --dry-run (default): Preview changes without applying them
 * --execute: Actually apply changes to the database
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// =============================================================================
// TYPES
// =============================================================================

interface MigrationStats {
  totalEntries: number
  entriesWithAudio: number
  orphanedAssetsFound: number
  attachmentsCreated: number
  skippedAssets: number
  errors: string[]
}

interface MigrationOptions {
  dryRun: boolean
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Calculate time difference in minutes between two dates
 */
function minutesDiff(a: Date, b: Date): number {
  return Math.abs(a.getTime() - b.getTime()) / (1000 * 60)
}

/**
 * Add progress indicator for large datasets
 */
function progress(current: number, total: number): string {
  const percent = Math.round((current / total) * 100)
  const bar = '█'.repeat(Math.floor(percent / 5)) + '░'.repeat(20 - Math.floor(percent / 5))
  return `[${bar}] ${percent}% (${current}/${total})`
}

// =============================================================================
// MAIN MIGRATION
// =============================================================================

async function migrate(options: MigrationOptions): Promise<MigrationStats> {
  const stats: MigrationStats = {
    totalEntries: 0,
    entriesWithAudio: 0,
    orphanedAssetsFound: 0,
    attachmentsCreated: 0,
    skippedAssets: 0,
    errors: [],
  }

  console.log('Starting Audio-MediaAttachment migration...')
  console.log(`Options: dryRun=${options.dryRun}`)
  console.log('')

  // Step 1: Get all non-deleted journal entries with occurredAt
  // Note: mediaAttachments relation is via Entity, not direct on JournalEntry
  const entries = await prisma.journalEntry.findMany({
    where: {
      deletedAt: null,
      occurredAt: { not: null }, // Only entries with occurredAt can be matched
    },
    orderBy: { occurredAt: 'asc' },
  })

  stats.totalEntries = entries.length
  console.log(`Found ${entries.length} entries with occurredAt to process`)
  console.log('')

  // Step 2: Get all audio assets that have NO attachments (orphaned)
  // We need to check which assets are already linked
  const allAudioAssets = await prisma.mediaAsset.findMany({
    where: {
      mimeType: { startsWith: 'audio/' },
    },
    include: {
      attachments: true,
    },
  })

  const orphanedAssets = allAudioAssets.filter((asset) => asset.attachments.length === 0)

  console.log(`Total audio assets: ${allAudioAssets.length}`)
  console.log(`Orphaned audio assets (no attachments): ${orphanedAssets.length}`)
  console.log('')

  if (orphanedAssets.length === 0) {
    console.log('No orphaned audio assets found. Nothing to migrate.')
    return stats
  }

  stats.orphanedAssetsFound = orphanedAssets.length

  // Step 3: Match orphaned assets to entries
  const TIME_WINDOW_MINUTES = 5

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i]

    // Progress indicator every 10 entries
    if (i % 10 === 0) {
      console.log(`\r${progress(i, entries.length)} - Processing entry ${entry.id.slice(0, 8)}...`)
    }

    if (!entry.occurredAt) continue

    // Find matching orphaned assets for this entry
    const matchingAssets = orphanedAssets.filter((asset) => {
      // Must be same user
      if (asset.userId !== entry.userId) return false

      // Must have capturedAt
      if (!asset.capturedAt) return false

      // Must be within time window
      const timeDiff = minutesDiff(asset.capturedAt, entry.occurredAt!)
      return timeDiff <= TIME_WINDOW_MINUTES
    })

    if (matchingAssets.length > 0) {
      stats.entriesWithAudio++

      for (const asset of matchingAssets) {
        try {
          // Check if this asset was already processed (removed from orphanedAssets)
          const stillOrphaned = await prisma.mediaAttachment.findFirst({
            where: { assetId: asset.id },
          })

          if (stillOrphaned) {
            stats.skippedAssets++
            continue
          }

          if (options.dryRun) {
            console.log(`\n  [DRY-RUN] Would create MediaAttachment:`)
            console.log(`    Asset: ${asset.id} (${asset.mimeType})`)
            console.log(`    Entry: ${entry.id}`)
            console.log(`    Time diff: ${minutesDiff(asset.capturedAt!, entry.occurredAt!).toFixed(2)} min`)
          } else {
            // Create MediaAttachment within transaction
            await prisma.$transaction(async (tx) => {
              await tx.mediaAttachment.create({
                data: {
                  entityId: entry.id,
                  userId: entry.userId,
                  assetId: asset.id,
                  timeBoxId: entry.timeBoxId,
                  role: 'ATTACHMENT',
                  displayOrder: 0,
                },
              })
            })

            console.log(`\n  Created MediaAttachment for asset ${asset.id.slice(0, 8)} -> entry ${entry.id.slice(0, 8)}`)
          }

          stats.attachmentsCreated++

          // Remove from orphanedAssets to prevent duplicate processing
          const idx = orphanedAssets.findIndex((a) => a.id === asset.id)
          if (idx > -1) {
            orphanedAssets.splice(idx, 1)
          }
        } catch (error) {
          const msg = `Error creating attachment for asset ${asset.id}: ${error}`
          stats.errors.push(msg)
          console.error(`\n  ${msg}`)
        }
      }
    }
  }

  console.log('\n') // New line after progress

  // Step 4: Report remaining orphaned assets
  if (orphanedAssets.length > 0) {
    console.log(`\n${orphanedAssets.length} orphaned audio assets could not be matched to any entry:`)
    orphanedAssets.slice(0, 10).forEach((asset) => {
      console.log(`  - ${asset.id} (capturedAt: ${asset.capturedAt}, user: ${asset.userId.slice(0, 8)})`)
    })
    if (orphanedAssets.length > 10) {
      console.log(`  ... and ${orphanedAssets.length - 10} more`)
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
    dryRun: !args.includes('--execute'),
  }

  if (options.dryRun) {
    console.log('='.repeat(60))
    console.log('DRY RUN MODE - No changes will be made')
    console.log('='.repeat(60))
    console.log('')
  } else {
    console.log('='.repeat(60))
    console.log('EXECUTE MODE - Changes WILL be applied!')
    console.log('='.repeat(60))
    console.log('')
    console.log('⚠️  WARNING: This will modify the database.')
    console.log('   Make sure you have a backup before proceeding.')
    console.log('')
  }

  try {
    const stats = await migrate(options)

    console.log('')
    console.log('='.repeat(60))
    console.log('Migration Summary')
    console.log('='.repeat(60))
    console.log(`Entries processed:        ${stats.totalEntries}`)
    console.log(`Entries with audio:       ${stats.entriesWithAudio}`)
    console.log(`Orphaned assets found:    ${stats.orphanedAssetsFound}`)
    console.log(`Attachments created:      ${stats.attachmentsCreated}`)
    console.log(`Assets skipped:           ${stats.skippedAssets}`)

    if (stats.errors.length > 0) {
      console.log(`Errors:                   ${stats.errors.length}`)
      stats.errors.forEach((e) => console.log(`  - ${e}`))
    } else {
      console.log('No errors occurred.')
    }

    if (options.dryRun) {
      console.log('')
      console.log('This was a dry run. Run with --execute to apply changes.')
    }
  } catch (error) {
    console.error('Migration failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
