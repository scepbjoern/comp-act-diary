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
  occurredAt: Date
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
        },
      })
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
