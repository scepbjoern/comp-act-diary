import { prisma } from '@/lib/prisma'

interface MentionResult {
  contactId: string
  contactName: string
  contactSlug: string
  startIndex: number
  endIndex: number
}

/**
 * Find contact mentions in text content
 * Searches for contact names in the text and returns their positions
 */
export async function findMentionsInText(
  userId: string,
  text: string
): Promise<MentionResult[]> {
  if (!text || text.length < 2) return []

  // Get all contacts for the user
  const contacts = await prisma.contact.findMany({
    where: { userId, isArchived: false },
    select: { id: true, name: true, slug: true, givenName: true, familyName: true },
  })

  const mentions: MentionResult[] = []
  const textLower = text.toLowerCase()

  for (const contact of contacts) {
    // Search for full name
    const nameLower = contact.name.toLowerCase()
    let index = textLower.indexOf(nameLower)
    
    while (index !== -1) {
      // Check word boundaries to avoid partial matches
      const before = index === 0 || /\s|[.,!?;:'"()]/.test(text[index - 1])
      const after = index + contact.name.length >= text.length || 
                    /\s|[.,!?;:'"()]/.test(text[index + contact.name.length])
      
      if (before && after) {
        mentions.push({
          contactId: contact.id,
          contactName: contact.name,
          contactSlug: contact.slug,
          startIndex: index,
          endIndex: index + contact.name.length,
        })
      }
      
      index = textLower.indexOf(nameLower, index + 1)
    }
  }

  // Sort by position and remove overlaps
  mentions.sort((a, b) => a.startIndex - b.startIndex)
  
  const filtered: MentionResult[] = []
  let lastEnd = -1
  
  for (const mention of mentions) {
    if (mention.startIndex >= lastEnd) {
      filtered.push(mention)
      lastEnd = mention.endIndex
    }
  }

  return filtered
}

/**
 * Create MENTION interactions for detected contacts
 */
export async function createMentionInteractions(
  userId: string,
  journalEntryId: string,
  contactIds: string[],
  occurredAt: Date,
  timeBoxId?: string
): Promise<void> {
  // Remove duplicates
  const uniqueIds = [...new Set(contactIds)]

  for (const contactId of uniqueIds) {
    // Check if mention interaction already exists for this entry
    const existing = await prisma.interaction.findFirst({
      where: {
        userId,
        contactId,
        journalEntryId,
        kind: 'MENTION',
      },
    })

    if (!existing) {
      await prisma.interaction.create({
        data: {
          userId,
          contactId,
          journalEntryId,
          kind: 'MENTION',
          occurredAt,
          timeBoxId,
        },
      })
    } else {
      // Update existing if occurredAt or timeBoxId is different
      // This helps fix data created before the date/timebox fixes
      const needsUpdate = 
        (timeBoxId && existing.timeBoxId !== timeBoxId) || 
        (occurredAt.getTime() !== existing.occurredAt.getTime())

      if (needsUpdate) {
        await prisma.interaction.update({
          where: { id: existing.id },
          data: {
            occurredAt,
            timeBoxId: timeBoxId || existing.timeBoxId,
          },
        })
      }
    }
  }
}

/**
 * Get mentions for a journal entry
 */
export async function getMentionsForEntry(
  userId: string,
  journalEntryId: string
): Promise<Array<{ contactId: string; contactName: string; contactSlug: string }>> {
  const interactions = await prisma.interaction.findMany({
    where: {
      userId,
      journalEntryId,
      kind: 'MENTION',
    },
    include: {
      contact: {
        select: { id: true, name: true, slug: true },
      },
    },
  })

  return interactions.map(i => ({
    contactId: i.contact.id,
    contactName: i.contact.name,
    contactSlug: i.contact.slug,
  }))
}

/**
 * Render text with mentions as HTML with links
 */
export function renderTextWithMentions(
  text: string,
  mentions: Array<{ contactName: string; contactSlug: string }>
): string {
  if (!mentions.length) return text

  let result = text
  
  // Sort by name length descending to avoid partial replacements
  const sortedMentions = [...mentions].sort((a, b) => b.contactName.length - a.contactName.length)
  
  for (const mention of sortedMentions) {
    const regex = new RegExp(`\\b${escapeRegex(mention.contactName)}\\b`, 'gi')
    result = result.replace(
      regex,
      `<a href="/prm/${mention.contactSlug}" class="text-primary hover:underline font-medium">${mention.contactName}</a>`
    )
  }

  return result
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// =============================================================================
// BATCH MENTION PROCESSING
// =============================================================================

export interface BatchMentionParams {
  userId: string
  dateFrom: string
  dateTo: string
  typeCodes: string[]
}

export interface BatchMentionEntry {
  id: string
  title: string | null
  date: string
  typeCode: string
  contentPreview: string
  existingMentionCount: number
}

export interface BatchMentionEntryResult {
  entryId: string
  entryTitle: string | null
  entryDate: string
  success: boolean
  mentionsFound: number
  mentionsCreated: number
  error?: string
}

export interface BatchMentionResult {
  totalProcessed: number
  successCount: number
  errorCount: number
  totalMentionsFound: number
  totalMentionsCreated: number
  results: BatchMentionEntryResult[]
}

/**
 * Get entries that can be processed for mention detection
 */
export async function getEntriesForMentionBatch(
  params: BatchMentionParams
): Promise<BatchMentionEntry[]> {
  const { userId, dateFrom, dateTo, typeCodes } = params

  // Parse dates
  const fromDate = new Date(dateFrom + 'T00:00:00Z')
  const toDate = new Date(dateTo + 'T23:59:59Z')

  // Find TimeBoxes in date range
  const timeBoxes = await prisma.timeBox.findMany({
    where: {
      userId,
      startAt: {
        gte: fromDate,
        lte: toDate,
      },
    },
    select: { id: true, startAt: true },
  })

  if (timeBoxes.length === 0) return []

  const timeBoxIds = timeBoxes.map(tb => tb.id)
  const timeBoxDateMap = new Map(timeBoxes.map(tb => [tb.id, tb.startAt]))

  // Find JournalEntryTypes by code
  const entryTypes = await prisma.journalEntryType.findMany({
    where: {
      code: { in: typeCodes },
      OR: [{ userId }, { userId: null }],
    },
  })

  if (entryTypes.length === 0) return []

  const typeIds = entryTypes.map(t => t.id)
  const typeCodeMap = new Map(entryTypes.map(t => [t.id, t.code]))

  // Get journal entries
  const entriesRaw = await prisma.journalEntry.findMany({
    where: {
      userId,
      timeBoxId: { in: timeBoxIds },
      typeId: { in: typeIds },
      deletedAt: null,
    },
    select: {
      id: true,
      title: true,
      content: true,
      timeBoxId: true,
      typeId: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' },
  })

  // Filter entries with content
  const entries = entriesRaw.filter(e => e.content && e.content.length > 0)

  // Get existing mention counts for each entry
  const mentionCounts = await prisma.interaction.groupBy({
    by: ['journalEntryId'],
    where: {
      userId,
      journalEntryId: { in: entries.map(e => e.id) },
      kind: 'MENTION',
    },
    _count: { id: true },
  })

  const countMap = new Map(mentionCounts.map(mc => [mc.journalEntryId, mc._count.id]))

  return entries.map(entry => {
    const date = timeBoxDateMap.get(entry.timeBoxId)
    return {
      id: entry.id,
      title: entry.title,
      date: date ? date.toISOString().slice(0, 10) : entry.createdAt.toISOString().slice(0, 10),
      typeCode: typeCodeMap.get(entry.typeId) || 'unknown',
      contentPreview: (entry.content || '').slice(0, 100) + ((entry.content || '').length > 100 ? '...' : ''),
      existingMentionCount: countMap.get(entry.id) || 0,
    }
  })
}

/**
 * Run batch mention detection on entries
 */
export async function runBatchMentionDetection(
  params: BatchMentionParams
): Promise<BatchMentionResult> {
  const { userId, dateFrom, dateTo, typeCodes } = params

  // Parse dates
  const fromDate = new Date(dateFrom + 'T00:00:00Z')
  const toDate = new Date(dateTo + 'T23:59:59Z')

  // Find TimeBoxes in date range
  const timeBoxes2 = await prisma.timeBox.findMany({
    where: {
      userId,
      startAt: {
        gte: fromDate,
        lte: toDate,
      },
    },
    select: { id: true, startAt: true },
  })

  if (timeBoxes2.length === 0) {
    return {
      totalProcessed: 0,
      successCount: 0,
      errorCount: 0,
      totalMentionsFound: 0,
      totalMentionsCreated: 0,
      results: [],
    }
  }

  const timeBoxIds = timeBoxes2.map(tb => tb.id)
  const timeBoxDateMap = new Map(timeBoxes2.map(tb => [tb.id, tb.startAt]))

  // Find JournalEntryTypes by code
  const entryTypes = await prisma.journalEntryType.findMany({
    where: {
      code: { in: typeCodes },
      OR: [{ userId }, { userId: null }],
    },
  })

  if (entryTypes.length === 0) {
    return {
      totalProcessed: 0,
      successCount: 0,
      errorCount: 0,
      totalMentionsFound: 0,
      totalMentionsCreated: 0,
      results: [],
    }
  }

  const typeIds = entryTypes.map(t => t.id)

  // Get journal entries with content
  const entriesRaw2 = await prisma.journalEntry.findMany({
    where: {
      userId,
      timeBoxId: { in: timeBoxIds },
      typeId: { in: typeIds },
      deletedAt: null,
    },
    select: {
      id: true,
      title: true,
      content: true,
      timeBoxId: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' },
  })

  // Filter entries with content
  const entries = entriesRaw2.filter(e => e.content && e.content.length > 0)

  const results: BatchMentionEntryResult[] = []
  let totalMentionsFound = 0
  let totalMentionsCreated = 0

  for (const entry of entries) {
    const date = timeBoxDateMap.get(entry.timeBoxId)
    const dateStr = date ? date.toISOString().slice(0, 10) : entry.createdAt.toISOString().slice(0, 10)

    try {
      // Find mentions in the content
      const mentions = await findMentionsInText(userId, entry.content || '')
      const mentionsFound = mentions.length
      totalMentionsFound += mentionsFound

      if (mentionsFound > 0) {
        // Use the TimeBox date as occurredAt, not entry.createdAt
        // We call this even if mentions already exist to allow repairing occurredAt/timeBoxId
        const uniqueContactIds = [...new Set(mentions.map(m => m.contactId))]
        const occurredAt = date || entry.createdAt
        await createMentionInteractions(
          userId,
          entry.id,
          uniqueContactIds,
          occurredAt,
          entry.timeBoxId
        )

        // Count how many were actually NEW (not already existing)
        // This is just for the result stats
        const existingMentions = await prisma.interaction.findMany({
          where: {
            userId,
            journalEntryId: entry.id,
            kind: 'MENTION',
            createdAt: { lt: new Date(Date.now() - 1000) } // Rough way to exclude the ones just created/updated
          },
          select: { contactId: true },
        })
        const existingContactIds = new Set(existingMentions.map(m => m.contactId))
        const newMentionsCount = uniqueContactIds.filter(id => !existingContactIds.has(id)).length

        totalMentionsCreated += newMentionsCount

        results.push({
          entryId: entry.id,
          entryTitle: entry.title,
          entryDate: dateStr,
          success: true,
          mentionsFound,
          mentionsCreated: newMentionsCount,
        })
      } else {
        results.push({
          entryId: entry.id,
          entryTitle: entry.title,
          entryDate: dateStr,
          success: true,
          mentionsFound: 0,
          mentionsCreated: 0,
        })
      }
    } catch (error) {
      results.push({
        entryId: entry.id,
        entryTitle: entry.title,
        entryDate: dateStr,
        success: false,
        mentionsFound: 0,
        mentionsCreated: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  const successCount = results.filter(r => r.success).length
  const errorCount = results.filter(r => !r.success).length

  return {
    totalProcessed: entries.length,
    successCount,
    errorCount,
    totalMentionsFound,
    totalMentionsCreated,
    results,
  }
}
