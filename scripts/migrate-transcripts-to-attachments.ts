/**
 * Migration Script: JournalEntry.originalTranscript → MediaAttachment.transcript
 * 
 * This script migrates existing transcript data from JournalEntry to the new
 * MediaAttachment-based storage, enabling multiple audio files per entry.
 * 
 * Usage: npx tsx scripts/migrate-transcripts-to-attachments.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface JournalEntryWithTranscript {
  id: string
  originalTranscript: string | null
  originalTranscriptModel: string | null
}

interface MediaAttachmentInfo {
  id: string
  assetId: string
  transcript: string | null
  transcriptModel: string | null
  asset: {
    mimeType: string
  }
}

async function migrateTranscripts() {
  console.log('Starting transcript migration...')
  
  // Find all journal entries that have an originalTranscript
  const entries = await prisma.journalEntry.findMany({
    where: {
      originalTranscript: { not: null },
    },
    select: {
      id: true,
      originalTranscript: true,
      originalTranscriptModel: true,
    },
  }) as JournalEntryWithTranscript[]
  
  console.log(`Found ${entries.length} entries with transcripts to migrate`)
  
  let migrated = 0
  let skipped = 0
  let noAudioAttachment = 0
  let alreadyMigrated = 0
  
  for (const entry of entries) {
    // Find audio attachment for this entry via Entity
    const entity = await prisma.entity.findUnique({
      where: { id: entry.id },
      include: {
        mediaAttachments: {
          include: {
            asset: {
              select: { mimeType: true },
            },
          },
        },
      },
    })
    
    if (!entity) {
      console.log(`  Entry ${entry.id}: No Entity found, skipping`)
      skipped++
      continue
    }
    
    // Check if entry has any audio attachments
    const audioAttachments = entity.mediaAttachments.filter(
      (att: MediaAttachmentInfo) => att.asset.mimeType.startsWith('audio/')
    )
    
    if (audioAttachments.length === 0) {
      console.log(`  Entry ${entry.id}: No audio attachment exists, skipping`)
      noAudioAttachment++
      continue
    }
    
    // Find the first audio attachment without a transcript yet
    const audioAttachment = audioAttachments.find(
      (att: MediaAttachmentInfo) => !att.transcript
    )
    
    if (!audioAttachment) {
      console.log(`  Entry ${entry.id}: All ${audioAttachments.length} audio attachment(s) already have transcript, skipping`)
      alreadyMigrated++
      continue
    }
    
    // Update the first MediaAttachment with transcript data
    await prisma.mediaAttachment.update({
      where: { id: audioAttachment.id },
      data: {
        transcript: entry.originalTranscript,
        transcriptModel: entry.originalTranscriptModel,
      },
    })
    
    console.log(`  Entry ${entry.id}: Migrated transcript to attachment ${audioAttachment.id}`)
    migrated++
  }
  
  console.log('\nMigration complete!')
  console.log(`  ✅ Migrated: ${migrated}`)
  console.log(`  ℹ️  Already migrated (attachment has transcript): ${alreadyMigrated}`)
  console.log(`  ⚠️  No audio attachment exists: ${noAudioAttachment}`)
  console.log(`  ❌ No Entity found: ${skipped}`)
  console.log('\nNote: JournalEntry.originalTranscript fields are preserved for backward compatibility.')
  console.log('They can be removed in a future schema update after verifying the migration.')
}

async function main() {
  try {
    await migrateTranscripts()
  } catch (error) {
    console.error('Migration failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
