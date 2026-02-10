/**
 * lib/services/journal/journalService.ts
 * Unified service for JournalEntry CRUD operations.
 * Single source of truth for creating, reading, updating, and deleting journal entries.
 * Handles Entity registry, MediaAttachments, Mentions detection, and default sharing.
 */

import type { PrismaClient } from '@prisma/client'
import { findMentionsInText, createMentionInteractions } from '@/lib/utils/mentions'
import { getJournalEntryAccessService } from '@/lib/services/journalEntryAccessService'
import { logger } from '@/lib/core/logger'
import type {
  CreateEntryParams,
  UpdateEntryParams,
  ListEntriesParams,
  EntryWithRelations,
  ListEntriesResult,
  AudioTranscript,
  MediaAttachmentRole,
  EntryMediaAttachment,
} from './types'
import { entryIncludeLean } from './types'
import { buildContentFromFields } from './contentService'
import type { TemplateField } from '@/types/journal'

// =============================================================================
// SERVICE CLASS
// =============================================================================

export class JournalService {
  constructor(private prisma: PrismaClient) {}

  // ---------------------------------------------------------------------------
  // CREATE
  // ---------------------------------------------------------------------------

  /**
   * Creates a new journal entry with all related data.
   * Handles: Entity registry, MediaAttachments, Mentions, Default sharing.
   */
  async createEntry(params: CreateEntryParams): Promise<EntryWithRelations> {
    const {
      userId,
      typeId,
      templateId,
      locationId,
      title,
      content,
      fieldValues,
      occurredAt,
      capturedAt,
      timezoneOffset,
      isSensitive,
      audioFileIds,
      audioTranscripts,
      ocrAssetIds,
      photoAssetIds,
    } = params

    // Resolve TimeBox: either passed directly or resolved from occurredAt
    const resolvedTimeBoxId =
      params.timeBoxId ?? (await this.resolveTimeBox(userId, occurredAt || new Date(), timezoneOffset))

    // If fieldValues provided and templateId exists, build content from fields
    let finalContent = content
    if (fieldValues && templateId) {
      const template = await this.prisma.journalTemplate.findUnique({
        where: { id: templateId },
        select: { fields: true },
      })
      if (template?.fields) {
        const fields = template.fields as unknown as TemplateField[]
        finalContent = buildContentFromFields(fields, fieldValues)
      }
    }

    // All core operations in a transaction for consistency
    const entry = await this.prisma.$transaction(async (tx) => {
      // 1. Create JournalEntry
      const newEntry = await tx.journalEntry.create({
        data: {
          userId,
          timeBoxId: resolvedTimeBoxId,
          typeId,
          templateId: templateId || null,
          locationId: locationId || null,
          title: title || null,
          content: finalContent,
          occurredAt: occurredAt || new Date(),
          capturedAt: capturedAt || new Date(),
          isSensitive: isSensitive || false,
        },
      })

      // 2. Create Entity registry entry (required for polymorphic relations)
      await tx.entity.create({
        data: {
          id: newEntry.id,
          userId,
          type: 'JOURNAL_ENTRY',
        },
      })

      // 3. Create MediaAttachments for audio files
      if (audioFileIds && audioFileIds.length > 0) {
        await this.createMediaAttachmentsInTx(tx, {
          entityId: newEntry.id,
          userId,
          timeBoxId: resolvedTimeBoxId,
          assetIds: audioFileIds,
          role: 'ATTACHMENT',
          transcripts: audioTranscripts,
        })
      }

      // 4. Create MediaAttachments for OCR sources
      if (ocrAssetIds && ocrAssetIds.length > 0) {
        await this.createMediaAttachmentsInTx(tx, {
          entityId: newEntry.id,
          userId,
          timeBoxId: resolvedTimeBoxId,
          assetIds: ocrAssetIds,
          role: 'SOURCE',
        })
      }

      // 5. Create MediaAttachments for photos
      if (photoAssetIds && photoAssetIds.length > 0) {
        await this.createMediaAttachmentsInTx(tx, {
          entityId: newEntry.id,
          userId,
          timeBoxId: resolvedTimeBoxId,
          assetIds: photoAssetIds,
          role: 'GALLERY',
        })
      }

      return newEntry
    })

    // 6. Detect and create mentions (outside transaction - not critical)
    await this.processMentions(entry.id, userId, content, resolvedTimeBoxId)

    // 7. Apply default sharing rules (outside transaction - not critical)
    await this.applyDefaultSharing(entry.id, userId, typeId)

    // 8. Return full entry with relations
    return this.getEntry(entry.id, userId)
  }

  // ---------------------------------------------------------------------------
  // READ
  // ---------------------------------------------------------------------------

  /**
   * Gets a single entry by ID with all relations.
   * @throws Error if entry not found or user has no access.
   */
  async getEntry(id: string, userId: string): Promise<EntryWithRelations> {
    const entry = await this.prisma.journalEntry.findFirst({
      where: { id, userId, deletedAt: null },
      include: entryIncludeLean,
    })

    if (!entry) {
      throw new Error('Entry not found')
    }

    // Load media attachments separately (via Entity relation)
    const mediaAttachments = await this.loadMediaAttachments(id, userId)

    // Count access grants
    const accessCount = await this.prisma.journalEntryAccess.count({
      where: { journalEntryId: id },
    })

    return {
      ...entry,
      mediaAttachments,
      accessCount,
    } as EntryWithRelations
  }

  /**
   * Lists entries with optional filtering and pagination.
   * Supports "lean" mode for list views (no media attachments).
   */
  async listEntries(params: ListEntriesParams): Promise<ListEntriesResult> {
    const { userId, timeBoxId, typeId, templateId, limit = 50, offset = 0, lean = false } = params

    const where = {
      userId,
      deletedAt: null,
      ...(timeBoxId && { timeBoxId }),
      ...(typeId && { typeId }),
      ...(templateId && { templateId }),
    }

    const [entries, total] = await Promise.all([
      this.prisma.journalEntry.findMany({
        where,
        include: entryIncludeLean,
        orderBy: { occurredAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.journalEntry.count({ where }),
    ])

    // In lean mode, return without media and accessCounts
    if (lean) {
      return {
        entries: entries.map((e) => ({
          ...e,
          mediaAttachments: [] as EntryMediaAttachment[],
          accessCount: 0,
        })) as EntryWithRelations[],
        total,
      }
    }

    // Full mode: load media attachments and accessCounts
    const entryIds = entries.map((e) => e.id)
    
    // Batch load media attachments for all entries
    const allMediaAttachments = await this.prisma.mediaAttachment.findMany({
      where: { entityId: { in: entryIds }, userId },
      include: {
        asset: {
          select: {
            id: true,
            filePath: true,
            mimeType: true,
            duration: true,
            capturedAt: true,
          },
        },
      },
      orderBy: { displayOrder: 'asc' },
    })
    
    // Group by entityId
    const mediaByEntryId = new Map<string, EntryMediaAttachment[]>()
    for (const ma of allMediaAttachments) {
      const list = mediaByEntryId.get(ma.entityId) || []
      list.push({
        id: ma.id,
        role: ma.role,
        transcript: ma.transcript,
        transcriptModel: ma.transcriptModel,
        displayOrder: ma.displayOrder,
        asset: {
          id: ma.asset.id,
          filePath: ma.asset.filePath || '',
          mimeType: ma.asset.mimeType,
          duration: ma.asset.duration,
          capturedAt: ma.asset.capturedAt,
        },
      })
      mediaByEntryId.set(ma.entityId, list)
    }

    // Load access counts
    const accessCounts = await this.prisma.journalEntryAccess.groupBy({
      by: ['journalEntryId'],
      where: { journalEntryId: { in: entryIds } },
      _count: { id: true },
    })
    const accessCountMap = new Map(accessCounts.map((ac) => [ac.journalEntryId, ac._count.id]))

    const enrichedEntries = entries.map((entry) => ({
      ...entry,
      mediaAttachments: mediaByEntryId.get(entry.id) || [],
      accessCount: accessCountMap.get(entry.id) || 0,
    })) as EntryWithRelations[]

    return { entries: enrichedEntries, total }
  }

  // ---------------------------------------------------------------------------
  // UPDATE
  // ---------------------------------------------------------------------------

  /**
   * Updates an existing journal entry.
   * Re-processes mentions if content changes.
   */
  async updateEntry(id: string, userId: string, params: UpdateEntryParams): Promise<EntryWithRelations> {
    const { title, content, fieldValues: _fieldValues, occurredAt, capturedAt, isSensitive, locationId } = params

    // Build update data dynamically to avoid overwriting with undefined
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    }

    if (title !== undefined) updateData.title = title
    if (content !== undefined) {
      updateData.content = content
      updateData.contentUpdatedAt = new Date()
    }
    // Note: fieldValues are already merged into content by the frontend form.
    // JournalEntry has no fieldValues column – do not persist them separately.
    if (occurredAt !== undefined) updateData.occurredAt = occurredAt
    if (capturedAt !== undefined) updateData.capturedAt = capturedAt
    if (isSensitive !== undefined) updateData.isSensitive = isSensitive
    if (locationId !== undefined) updateData.locationId = locationId

    await this.prisma.journalEntry.update({
      where: { id },
      data: updateData,
    })

    // Re-process mentions if content changed
    if (content !== undefined) {
      const entry = await this.prisma.journalEntry.findUnique({
        where: { id },
        select: { timeBoxId: true },
      })
      if (entry?.timeBoxId) {
        await this.processMentions(id, userId, content, entry.timeBoxId)
      }
    }

    return this.getEntry(id, userId)
  }

  // ---------------------------------------------------------------------------
  // DELETE
  // ---------------------------------------------------------------------------

  /**
   * Soft-deletes an entry (sets deletedAt).
   */
  async deleteEntry(id: string, _userId: string): Promise<void> {
    await this.prisma.journalEntry.update({
      where: { id },
      data: { deletedAt: new Date() },
    })
  }

  /**
   * Hard-deletes an entry and all related data.
   * Use with caution - data cannot be recovered.
   */
  async hardDeleteEntry(id: string, _userId: string): Promise<void> {
    // Delete media attachments first
    await this.prisma.mediaAttachment.deleteMany({ where: { entityId: id } })

    // Delete entity registry (ignore if not found)
    await this.prisma.entity.delete({ where: { id } }).catch(() => {
      // Entity might not exist for older entries
    })

    // Delete journal entry
    await this.prisma.journalEntry.delete({ where: { id } })
  }

  // ---------------------------------------------------------------------------
  // MEDIA ATTACHMENTS
  // ---------------------------------------------------------------------------

  /**
   * Adds a media attachment to an entry.
   */
  async addMediaAttachment(params: {
    entryId: string
    userId: string
    assetId: string
    role: MediaAttachmentRole
    transcript?: string | null
    transcriptModel?: string | null
  }): Promise<void> {
    const entry = await this.prisma.journalEntry.findFirst({
      where: { id: params.entryId, userId: params.userId },
    })
    if (!entry) throw new Error('Entry not found')

    const maxOrder = await this.prisma.mediaAttachment.aggregate({
      where: { entityId: params.entryId },
      _max: { displayOrder: true },
    })

    await this.prisma.mediaAttachment.create({
      data: {
        entityId: params.entryId,
        userId: params.userId,
        assetId: params.assetId,
        timeBoxId: entry.timeBoxId,
        role: params.role,
        transcript: params.transcript || null,
        transcriptModel: params.transcriptModel || null,
        displayOrder: (maxOrder._max.displayOrder || 0) + 1,
      },
    })
  }

  /**
   * Removes a media attachment.
   */
  async removeMediaAttachment(attachmentId: string, userId: string): Promise<void> {
    await this.prisma.mediaAttachment.deleteMany({
      where: { id: attachmentId, userId },
    })
  }

  /**
   * Updates a media attachment (transcript, model).
   */
  async updateMediaAttachment(
    attachmentId: string,
    userId: string,
    params: { transcript?: string; transcriptModel?: string }
  ): Promise<void> {
    // Security check: verify attachment belongs to user
    const existing = await this.prisma.mediaAttachment.findFirst({
      where: { id: attachmentId, userId },
    })
    if (!existing) {
      throw new Error('Attachment not found or access denied')
    }

    const updateData: Record<string, unknown> = {}
    if (params.transcript !== undefined) updateData.transcript = params.transcript
    if (params.transcriptModel !== undefined) updateData.transcriptModel = params.transcriptModel

    await this.prisma.mediaAttachment.update({
      where: { id: attachmentId },
      data: updateData,
    })
  }

  // ---------------------------------------------------------------------------
  // PRIVATE HELPERS
  // ---------------------------------------------------------------------------

  /**
   * Loads media attachments for an entry.
   */
  private async loadMediaAttachments(entryId: string, userId: string): Promise<EntryMediaAttachment[]> {
    const attachments = await this.prisma.mediaAttachment.findMany({
      where: { entityId: entryId, userId },
      include: {
        asset: {
          select: {
            id: true,
            filePath: true,
            mimeType: true,
            duration: true,
            capturedAt: true,
          },
        },
      },
      orderBy: { displayOrder: 'asc' },
    })

    return attachments.map((ma) => ({
      id: ma.id,
      role: ma.role,
      transcript: ma.transcript,
      transcriptModel: ma.transcriptModel,
      displayOrder: ma.displayOrder,
      asset: {
        id: ma.asset.id,
        filePath: ma.asset.filePath || '',
        mimeType: ma.asset.mimeType,
        duration: ma.asset.duration,
        capturedAt: ma.asset.capturedAt,
      },
    }))
  }

  /**
   * Creates media attachments within a transaction.
   */
  private async createMediaAttachmentsInTx(
    tx: Parameters<Parameters<PrismaClient['$transaction']>[0]>[0],
    params: {
      entityId: string
      userId: string
      timeBoxId: string
      assetIds: string[]
      role: MediaAttachmentRole
      transcripts?: AudioTranscript[]
    }
  ): Promise<void> {
    const { entityId, userId, timeBoxId, assetIds, role, transcripts } = params
    const transcriptMap = new Map(transcripts?.map((t) => [t.assetId, t]) || [])

    for (let i = 0; i < assetIds.length; i++) {
      const assetId = assetIds[i]
      const transcriptData = transcriptMap.get(assetId)

      // Verify asset exists and belongs to user
      const asset = await tx.mediaAsset.findFirst({
        where: { id: assetId, userId },
      })

      if (asset) {
        await tx.mediaAttachment.create({
          data: {
            entityId,
            userId,
            assetId,
            timeBoxId,
            role,
            displayOrder: i,
            transcript: transcriptData?.transcript || null,
            transcriptModel: transcriptData?.transcriptModel || null,
          },
        })
      } else {
        logger.warn({ assetId, userId }, 'Asset not found when creating MediaAttachment')
      }
    }
  }

  /**
   * Processes mentions in entry content and creates interactions.
   */
  private async processMentions(
    entryId: string,
    userId: string,
    content: string,
    timeBoxId: string
  ): Promise<void> {
    try {
      const mentions = await findMentionsInText(userId, content)
      if (mentions.length > 0) {
        const timeBox = await this.prisma.timeBox.findUnique({ where: { id: timeBoxId } })
        if (timeBox) {
          await createMentionInteractions(
            userId,
            entryId,
            mentions.map((m) => m.contactId),
            timeBox.startAt || new Date(),
            timeBoxId
          )
        }
      }
    } catch (error) {
      // Mentions are not critical - log and continue
      logger.warn({ error, entryId }, 'Failed to process mentions')
    }
  }

  /**
   * Applies default sharing rules for new entries.
   */
  private async applyDefaultSharing(entryId: string, userId: string, typeId: string): Promise<void> {
    try {
      const accessService = getJournalEntryAccessService()
      await accessService.applyDefaultSharingOnCreate(entryId, userId, typeId)
    } catch (error) {
      // Sharing is not critical - log and continue
      logger.warn({ error, entryId }, 'Failed to apply default sharing')
    }
  }

  /**
   * Resolves or creates a TimeBox for a given date.
   * Uses timezoneOffset to determine the correct local date.
   */
  private async resolveTimeBox(userId: string, occurredAt: Date, timezoneOffset?: number): Promise<string> {
    // Calculate local date considering timezone offset
    const offsetMs = (timezoneOffset || 0) * 60 * 1000
    const localDate = new Date(occurredAt.getTime() - offsetMs)
    const localDateStr = localDate.toISOString().slice(0, 10) // YYYY-MM-DD

    // Search for existing TimeBox
    let timeBox = await this.prisma.timeBox.findFirst({
      where: { userId, kind: 'DAY', localDate: localDateStr },
    })

    // Create new TimeBox if not found
    if (!timeBox) {
      const startAt = new Date(localDateStr + 'T00:00:00Z')
      const endAt = new Date(startAt.getTime() + 24 * 60 * 60 * 1000)
      timeBox = await this.prisma.timeBox.create({
        data: {
          userId,
          kind: 'DAY',
          localDate: localDateStr,
          startAt,
          endAt,
          timezone: 'Europe/Zurich', // Default timezone
        },
      })
    }

    return timeBox.id
  }
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

/**
 * Creates a new JournalService instance.
 * Each request should get a new instance (no singleton).
 */
export function createJournalService(prisma: PrismaClient): JournalService {
  return new JournalService(prisma)
}
