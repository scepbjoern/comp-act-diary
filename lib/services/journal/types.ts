/**
 * lib/services/journal/types.ts
 * Unified types for JournalEntry CRUD operations.
 * Used by JournalService, API routes, and frontend hooks.
 */

import type { JournalEntry, Prisma } from '@prisma/client'
import { z } from 'zod'

// =============================================================================
// ZOD SCHEMAS FOR VALIDATION
// =============================================================================

/**
 * Schema for audio transcript data when creating entries.
 */
export const audioTranscriptSchema = z.object({
  assetId: z.string().uuid(),
  transcript: z.string(),
  transcriptModel: z.string().nullable().optional(),
})

/**
 * Schema for creating a new journal entry.
 */
export const createEntryParamsSchema = z.object({
  // TimeBox: either timeBoxId OR occurredAt+timezoneOffset
  timeBoxId: z.string().uuid().optional(),
  occurredAt: z.coerce.date().optional(),
  timezoneOffset: z.number().int().optional(),

  // Entry type and template
  typeId: z.string().uuid(),
  templateId: z.string().uuid().nullable().optional(),
  locationId: z.string().uuid().nullable().optional(),

  // Content
  title: z.string().nullable().optional(),
  content: z.string(),
  fieldValues: z.record(z.string(), z.string()).optional(),

  // Timestamps
  capturedAt: z.coerce.date().optional(),

  // Flags
  isSensitive: z.boolean().optional(),

  // Media
  audioFileIds: z.array(z.string().uuid()).optional(),
  audioTranscripts: z.array(audioTranscriptSchema).optional(),
  ocrAssetIds: z.array(z.string().uuid()).optional(),
  photoAssetIds: z.array(z.string().uuid()).optional(),
})

/**
 * Schema for updating an existing journal entry.
 */
export const updateEntryParamsSchema = z.object({
  title: z.string().nullable().optional(),
  content: z.string().optional(),
  fieldValues: z.record(z.string(), z.string()).optional(),
  occurredAt: z.coerce.date().optional(),
  capturedAt: z.coerce.date().optional(),
  isSensitive: z.boolean().optional(),
  locationId: z.string().uuid().nullable().optional(),
})

/**
 * Schema for listing entries with filters.
 */
export const listEntriesParamsSchema = z.object({
  timeBoxId: z.string().uuid().optional(),
  typeId: z.string().uuid().optional(),
  templateId: z.string().uuid().optional(),
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0),
  lean: z.boolean().default(false),
})

// =============================================================================
// TYPESCRIPT TYPES (derived from Zod schemas)
// =============================================================================

export type AudioTranscript = z.infer<typeof audioTranscriptSchema>
export type CreateEntryParams = z.infer<typeof createEntryParamsSchema> & {
  userId: string
}
export type UpdateEntryParams = z.infer<typeof updateEntryParamsSchema>
export type ListEntriesParams = z.infer<typeof listEntriesParamsSchema> & {
  userId: string
}

// =============================================================================
// RESPONSE TYPES
// =============================================================================

/**
 * Type/Template relation data included in responses.
 */
export interface EntryTypeInfo {
  id: string
  code: string
  name: string
  icon: string | null
}

export interface EntryTemplateInfo {
  id: string
  name: string
  fields: unknown // JSON - parsed by consumer
}

export interface EntryLocationInfo {
  id: string
  name: string
}

/**
 * Media attachment data included in entry responses.
 */
export interface EntryMediaAttachment {
  id: string
  role: string
  transcript: string | null
  transcriptModel: string | null
  displayOrder: number
  asset: {
    id: string
    filePath: string
    mimeType: string | null
    duration: number | null
    capturedAt: Date | null
  }
}

/**
 * Base entry with relations (without media).
 * Used for lean list views.
 */
export interface EntryWithBaseRelations extends JournalEntry {
  type: EntryTypeInfo | null
  template: EntryTemplateInfo | null
  location: EntryLocationInfo | null
}

/**
 * Full entry with all relations, returned by getEntry and createEntry.
 * MediaAttachments are always included for full entries.
 */
export interface EntryWithRelations extends EntryWithBaseRelations {
  mediaAttachments: EntryMediaAttachment[]
  accessCount: number
}

/**
 * Result of listEntries operation.
 */
export interface ListEntriesResult {
  entries: EntryWithRelations[]
  total: number
}

// =============================================================================
// MEDIA ATTACHMENT TYPES
// =============================================================================

export type MediaAttachmentRole = 'ATTACHMENT' | 'SOURCE' | 'GALLERY'

export interface AddMediaParams {
  entryId: string
  userId: string
  assetId: string
  role: MediaAttachmentRole
  transcript?: string | null
  transcriptModel?: string | null
}

export interface UpdateMediaParams {
  transcript?: string
  transcriptModel?: string
}

// =============================================================================
// PRISMA INCLUDE HELPERS
// =============================================================================

/**
 * Standard include for entry loading (without media).
 * MediaAttachments are loaded separately via Entity relation.
 */
export const entryIncludeLean = {
  type: { select: { id: true, code: true, name: true, icon: true } },
  template: { select: { id: true, name: true, fields: true } },
  location: { select: { id: true, name: true } },
} as const

/**
 * Helper type for Prisma query results.
 * Since MediaAttachments are via Entity (polymorphic), they're loaded separately.
 */
export type PrismaEntryWithRelations = Prisma.JournalEntryGetPayload<{
  include: typeof entryIncludeLean
}>
