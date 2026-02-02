/**
 * types/journal.ts
 * TypeScript interfaces and Zod schemas for dynamic journal templates.
 * Used for template field definitions, AI configuration, and content parsing.
 */

import { z } from 'zod'

// =============================================================================
// FIELD TYPE ENUM
// =============================================================================

/** Available field types for template fields */
export const TEMPLATE_FIELD_TYPES = ['textarea', 'text', 'number', 'date', 'time'] as const
export type TemplateFieldType = (typeof TEMPLATE_FIELD_TYPES)[number]

// =============================================================================
// TEMPLATE FIELD
// =============================================================================

/**
 * Definition of a single field within a journal template.
 * Fields are rendered dynamically in the DynamicJournalForm component.
 */
export interface TemplateField {
  /** Unique ID for field (UUID or slug) */
  id: string
  /** Display label, e.g. "Was hat sich verändert?" - empty for minimal Diary template */
  label?: string
  /** Optional icon (emoji), e.g. "🔄" */
  icon?: string
  /** Optional instruction/help text for user (displayed expanded, small, muted) */
  instruction?: string
  /** Field type for different GUI elements */
  type: TemplateFieldType
  /** Is this field required? */
  required?: boolean
  /** Sort order */
  order: number
}

/** Zod schema for TemplateField validation */
export const templateFieldSchema = z.object({
  id: z.string().min(1, 'Field ID is required'),
  label: z.string().optional(),
  icon: z.string().optional(),
  instruction: z.string().optional(),
  type: z.enum(TEMPLATE_FIELD_TYPES),
  required: z.boolean().optional().default(false),
  order: z.number().int().min(0),
})

/** Zod schema for array of TemplateField */
export const templateFieldsSchema = z.array(templateFieldSchema)

// =============================================================================
// TEMPLATE AI CONFIG
// =============================================================================

/**
 * AI configuration for a journal template.
 * Defines models and prompts for various AI operations.
 */
export interface TemplateAIConfig {
  /** Model for content improvement (transcript → improved text) */
  contentModel?: string
  /** Prompt for content improvement */
  contentPrompt?: string
  /** Model for title generation */
  titleModel?: string
  /** Prompt for title generation */
  titlePrompt?: string
  /** Model for summary generation */
  summaryModel?: string
  /** Prompt for summary generation */
  summaryPrompt?: string
  /** Model for analysis generation (psychological analysis) */
  analysisModel?: string
  /** Prompt for analysis generation */
  analysisPrompt?: string
  /** Model for audio segmentation (only useful for multi-field templates) */
  segmentationModel?: string
  /** Prompt for audio segmentation (can include improvement) */
  segmentationPrompt?: string
}

/** Zod schema for TemplateAIConfig validation */
export const templateAIConfigSchema = z.object({
  contentModel: z.string().optional(),
  contentPrompt: z.string().optional(),
  titleModel: z.string().optional(),
  titlePrompt: z.string().optional(),
  summaryModel: z.string().optional(),
  summaryPrompt: z.string().optional(),
  analysisModel: z.string().optional(),
  analysisPrompt: z.string().optional(),
  segmentationModel: z.string().optional(),
  segmentationPrompt: z.string().optional(),
})

// =============================================================================
// PARSED FIELD (for content parsing)
// =============================================================================

/**
 * Parsed field with its value extracted from content.
 * Used when parsing markdown content back into field values.
 */
export interface ParsedField extends TemplateField {
  /** The extracted value for this field */
  value: string
}

// =============================================================================
// TEMPLATE CREATE/UPDATE SCHEMAS
// =============================================================================

/** Schema for creating a new template */
export const createTemplateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).optional().nullable(),
  fields: templateFieldsSchema.optional().nullable(),
  aiConfig: templateAIConfigSchema.optional().nullable(),
  typeId: z.string().uuid().optional().nullable(),
})

/** Schema for updating an existing template */
export const updateTemplateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  fields: templateFieldsSchema.optional().nullable(),
  aiConfig: templateAIConfigSchema.optional().nullable(),
  typeId: z.string().uuid().optional().nullable(),
})

// =============================================================================
// CONTENT PARSING RESULT
// =============================================================================

/**
 * Result of parsing content into template fields.
 * Indicates whether fields matched successfully.
 */
export interface ContentParseResult {
  /** Whether all fields were successfully matched */
  matched: boolean
  /** Parsed fields with their values */
  fields: ParsedField[]
  /** Warning message if parsing was incomplete */
  warning?: string
}

// =============================================================================
// SEGMENTATION RESULT
// =============================================================================

/**
 * Result of AI-based audio transcript segmentation.
 */
export interface SegmentationResult {
  /** Segmented content per field ID */
  segments: Record<string, string>
  /** Warning if segmentation was incomplete */
  warning?: string
}

// =============================================================================
// JOURNAL ENTRY WITH TEMPLATE (extended type)
// =============================================================================

/**
 * Extended JournalEntry type with template and type relations loaded.
 * Used in API responses and components.
 */
export interface JournalEntryWithRelations {
  id: string
  userId: string
  typeId: string
  templateId: string | null
  timeBoxId: string
  locationId: string | null
  title: string | null
  content: string
  aiSummary: string | null
  analysis: string | null
  contentUpdatedAt: Date | null
  isSensitive: boolean
  deletedAt: Date | null
  occurredAt: Date | null
  capturedAt: Date | null
  createdAt: Date
  updatedAt: Date
  type: {
    id: string
    code: string
    name: string
    icon: string | null
    bgColorClass: string | null
  }
  template: {
    id: string
    name: string
    fields: TemplateField[] | null
    aiConfig: TemplateAIConfig | null
  } | null
}

// =============================================================================
// TEMPLATE WITH TYPE (extended type)
// =============================================================================

/**
 * Extended JournalTemplate type with type relation loaded.
 */
export interface JournalTemplateWithType {
  id: string
  userId: string | null
  name: string
  description: string | null
  fields: TemplateField[] | null
  aiConfig: TemplateAIConfig | null
  prompts: unknown | null
  origin: 'SYSTEM' | 'USER' | 'IMPORT' | 'AI'
  typeId: string | null
  createdAt: Date
  updatedAt: Date
  type: {
    id: string
    code: string
    name: string
    icon: string | null
  } | null
  _count?: {
    journalEntries: number
  }
}

// =============================================================================
// API REQUEST/RESPONSE TYPES
// =============================================================================

/** Request body for creating a journal entry */
export const createJournalEntrySchema = z.object({
  typeId: z.string().uuid(),
  templateId: z.string().uuid().optional(),
  timeBoxId: z.string().uuid(),
  locationId: z.string().uuid().optional(),
  title: z.string().max(200).optional(),
  content: z.string(),
  fieldValues: z.record(z.string(), z.string()).optional(),
  occurredAt: z.string().datetime().optional(),
  capturedAt: z.string().datetime().optional(),
  isSensitive: z.boolean().optional(),
})

/** Request body for updating a journal entry */
export const updateJournalEntrySchema = z.object({
  title: z.string().max(200).optional().nullable(),
  content: z.string().optional(),
  fieldValues: z.record(z.string(), z.string()).optional(),
  aiSummary: z.string().optional().nullable(),
  analysis: z.string().optional().nullable(),
  occurredAt: z.string().datetime().optional().nullable(),
  isSensitive: z.boolean().optional(),
})

/** Request body for audio segmentation */
export const segmentAudioSchema = z.object({
  transcript: z.string().min(1, 'Transcript is required'),
  templateId: z.string().uuid(),
  options: z
    .object({
      model: z.string().optional(),
      prompt: z.string().optional(),
    })
    .optional(),
})

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type CreateTemplateInput = z.infer<typeof createTemplateSchema>
export type UpdateTemplateInput = z.infer<typeof updateTemplateSchema>
export type CreateJournalEntryInput = z.infer<typeof createJournalEntrySchema>
export type UpdateJournalEntryInput = z.infer<typeof updateJournalEntrySchema>
export type SegmentAudioInput = z.infer<typeof segmentAudioSchema>
