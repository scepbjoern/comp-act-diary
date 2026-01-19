/**
 * JournalEntryAccess Validators
 * Zod schemas for access-related API operations.
 */

import { z } from 'zod'

// =============================================================================
// ENUMS
// =============================================================================

/** Access role enum matching Prisma JournalEntryAccessRole */
export const JournalEntryAccessRoleSchema = z.enum(['VIEWER', 'EDITOR'])
export type JournalEntryAccessRole = z.infer<typeof JournalEntryAccessRoleSchema>

// =============================================================================
// ACCESS CRUD SCHEMAS
// =============================================================================

/** Schema for granting access to a journal entry */
export const GrantAccessSchema = z.object({
  /** Username of the user to grant access to */
  username: z.string().min(1, 'Benutzername erforderlich'),
  /** Role to assign: VIEWER or EDITOR */
  role: JournalEntryAccessRoleSchema,
})

export type GrantAccessInput = z.infer<typeof GrantAccessSchema>

/** Schema for updating access role */
export const UpdateAccessRoleSchema = z.object({
  role: JournalEntryAccessRoleSchema,
})

export type UpdateAccessRoleInput = z.infer<typeof UpdateAccessRoleSchema>

// =============================================================================
// SHARING DEFAULTS SCHEMAS (User Settings)
// =============================================================================

/** Auto-share rule for a specific JournalEntryType */
export const AutoShareRuleSchema = z.object({
  /** JournalEntryType ID (system or custom) */
  journalEntryTypeId: z.string().uuid('Ungültige JournalEntryType-ID'),
  /** User ID to share with */
  shareWithUserId: z.string().uuid('Ungültige User-ID'),
  /** Role for auto-shared entries */
  role: JournalEntryAccessRoleSchema,
})

export type AutoShareRule = z.infer<typeof AutoShareRuleSchema>

/** Sharing defaults stored in User.settings.sharingDefaults */
export const SharingDefaultsSchema = z.object({
  /** Default user to share new entries with (by ID) */
  defaultShareUserId: z.string().uuid().nullable().optional(),
  /** Default role when sharing */
  defaultShareRole: JournalEntryAccessRoleSchema.optional().default('VIEWER'),
  /** Auto-share rules per JournalEntryType */
  autoShareByType: z.array(AutoShareRuleSchema).optional().default([]),
})

export type SharingDefaults = z.infer<typeof SharingDefaultsSchema>

/** Schema for updating sharing defaults */
export const UpdateSharingDefaultsSchema = SharingDefaultsSchema.partial()

export type UpdateSharingDefaultsInput = z.infer<typeof UpdateSharingDefaultsSchema>

// =============================================================================
// RESPONSE TYPES
// =============================================================================

/** Access grant with user info for API responses */
export const AccessGrantResponseSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  username: z.string(),
  userName: z.string().nullable(),
  role: JournalEntryAccessRoleSchema,
  grantedByUserId: z.string().uuid().nullable(),
  createdAt: z.string().datetime(),
})

export type AccessGrantResponse = z.infer<typeof AccessGrantResponseSchema>

/** Shared entry info for "Shared with me" list */
export const SharedEntryResponseSchema = z.object({
  id: z.string().uuid(),
  title: z.string().nullable(),
  content: z.string(),
  occurredAt: z.string().datetime().nullable(),
  typeCode: z.string(),
  typeName: z.string(),
  ownerUserId: z.string().uuid(),
  ownerName: z.string().nullable(),
  accessRole: JournalEntryAccessRoleSchema,
})

export type SharedEntryResponse = z.infer<typeof SharedEntryResponseSchema>
