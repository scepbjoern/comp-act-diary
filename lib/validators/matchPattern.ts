/**
 * MatchPattern Validators
 * Zod schemas for MatchPattern CRUD operations.
 */

import { z } from 'zod'

// =============================================================================
// MATCH PATTERN SCHEMAS
// =============================================================================

/**
 * Schema for creating a new MatchPattern.
 */
export const createMatchPatternSchema = z.object({
  sourceType: z.enum(['CALENDAR_LOCATION', 'JOURNAL_CONTENT', 'IMPORT_TAG']),
  targetType: z.enum(['LOCATION', 'CONTACT', 'TAG']),
  targetId: z.string().uuid('Ungültige Ziel-ID'),
  pattern: z.string().min(1, 'Pattern ist erforderlich'),
  description: z.string().optional(),
  priority: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
})

export type CreateMatchPatternInput = z.infer<typeof createMatchPatternSchema>

/**
 * Schema for updating an existing MatchPattern.
 */
export const updateMatchPatternSchema = z.object({
  pattern: z.string().min(1, 'Pattern ist erforderlich').optional(),
  description: z.string().optional().nullable(),
  priority: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
})

export type UpdateMatchPatternInput = z.infer<typeof updateMatchPatternSchema>

/**
 * Schema for querying MatchPatterns.
 */
export const matchPatternQuerySchema = z.object({
  sourceType: z.enum(['CALENDAR_LOCATION', 'JOURNAL_CONTENT', 'IMPORT_TAG']).optional(),
  targetType: z.enum(['LOCATION', 'CONTACT', 'TAG']).optional(),
  isActive: z.coerce.boolean().optional(),
})

export type MatchPatternQuery = z.infer<typeof matchPatternQuerySchema>

/**
 * Validate a regex pattern string.
 * Returns error message if invalid, null if valid.
 */
export function validateRegexPattern(pattern: string): string | null {
  try {
    new RegExp(pattern)
    return null
  } catch (error) {
    if (error instanceof SyntaxError) {
      return `Ungültiges Regex-Pattern: ${error.message}`
    }
    return 'Ungültiges Regex-Pattern'
  }
}
