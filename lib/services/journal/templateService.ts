/**
 * lib/services/journal/templateService.ts
 * Service for template management, validation, duplication, and import for sharing.
 */

import { prisma } from '@/lib/core/prisma'
import {
  TemplateField,
  TemplateAIConfig,
  templateFieldsSchema,
  templateAIConfigSchema,
} from '@/types/journal'
import { TaxonomyOrigin } from '@prisma/client'
import crypto from 'crypto'

// =============================================================================
// VALIDATION
// =============================================================================

/**
 * Validates template fields against the schema.
 * @param fields - Raw fields data (from JSON)
 * @returns Validated TemplateField array
 * @throws ZodError if validation fails
 */
export function validateTemplateFields(fields: unknown): TemplateField[] {
  if (!fields) return []
  return templateFieldsSchema.parse(fields)
}

/**
 * Validates template AI config against the schema.
 * @param aiConfig - Raw AI config data (from JSON)
 * @returns Validated TemplateAIConfig
 * @throws ZodError if validation fails
 */
export function validateTemplateAIConfig(aiConfig: unknown): TemplateAIConfig {
  if (!aiConfig) return {}
  return templateAIConfigSchema.parse(aiConfig)
}

/**
 * Migrates legacy prompts array to new fields format.
 * Used for backward compatibility with old templates.
 * @param prompts - Legacy prompts array (string[])
 * @returns Converted TemplateField array
 */
export function migratePromptsToFields(prompts: string[]): TemplateField[] {
  if (!Array.isArray(prompts)) return []

  return prompts.map((prompt, index) => ({
    id: `field_${index}`,
    label: prompt,
    type: 'textarea' as const,
    required: false,
    order: index,
  }))
}

// =============================================================================
// DUPLICATION
// =============================================================================

/**
 * Duplicates a template including all fields and AI config.
 * @param templateId - ID of the template to duplicate
 * @param userId - User ID who owns the duplicate
 * @returns The duplicated template
 */
export async function duplicateTemplate(
  templateId: string,
  userId: string
): Promise<{
  id: string
  name: string
  description: string | null
  fields: TemplateField[] | null
  aiConfig: TemplateAIConfig | null
  typeId: string | null
}> {
  // Fetch the original template
  const original = await prisma.journalTemplate.findUnique({
    where: { id: templateId },
  })

  if (!original) {
    throw new Error(`Template not found: ${templateId}`)
  }

  // Generate a unique name for the copy
  const copyName = await generateUniqueCopyName(userId, original.name)

  // Create the duplicate
  const duplicate = await prisma.journalTemplate.create({
    data: {
      userId,
      name: copyName,
      description: original.description,
      fields: original.fields ?? undefined,
      aiConfig: original.aiConfig ?? undefined,
      typeId: original.typeId,
      origin: TaxonomyOrigin.USER,
    },
  })

  return {
    id: duplicate.id,
    name: duplicate.name,
    description: duplicate.description,
    fields: duplicate.fields as TemplateField[] | null,
    aiConfig: duplicate.aiConfig as TemplateAIConfig | null,
    typeId: duplicate.typeId,
  }
}

/**
 * Generates a unique name for a template copy.
 * Appends "(Kopie)" or "(Kopie 2)", etc. if name already exists.
 */
async function generateUniqueCopyName(userId: string, baseName: string): Promise<string> {
  let copyName = `${baseName} (Kopie)`
  let counter = 1

  // Check if name already exists for this user
  while (true) {
    const existing = await prisma.journalTemplate.findFirst({
      where: {
        userId,
        name: copyName,
      },
    })

    if (!existing) {
      return copyName
    }

    counter++
    copyName = `${baseName} (Kopie ${counter})`
  }
}

// =============================================================================
// TEMPLATE SHARING / IMPORT
// =============================================================================

/**
 * Computes a hash of template fields for comparison.
 * Used to check if two templates have identical field structures.
 */
function computeFieldsHash(fields: TemplateField[] | null): string {
  if (!fields || fields.length === 0) return 'empty'

  // Normalize fields for comparison (ignore order property for hash)
  const normalized = fields
    .map((f) => ({
      id: f.id,
      label: f.label || '',
      type: f.type,
      required: f.required || false,
    }))
    .sort((a, b) => a.id.localeCompare(b.id))

  return crypto.createHash('md5').update(JSON.stringify(normalized)).digest('hex')
}

/**
 * Finds a matching template for a user based on field structure.
 * @param userId - Target user ID
 * @param fields - Fields to match
 * @returns Matching template or null
 */
export async function findMatchingTemplate(
  userId: string,
  fields: TemplateField[] | null
): Promise<{ id: string } | null> {
  const targetHash = computeFieldsHash(fields)

  // Get all user templates
  const userTemplates = await prisma.journalTemplate.findMany({
    where: {
      OR: [{ userId }, { userId: null }], // User templates + system templates
    },
    select: {
      id: true,
      fields: true,
    },
  })

  // Find template with matching fields hash
  for (const template of userTemplates) {
    const templateHash = computeFieldsHash(template.fields as TemplateField[] | null)
    if (templateHash === targetHash) {
      return { id: template.id }
    }
  }

  return null
}

/**
 * Checks if a template name already exists for a user.
 */
export async function templateNameExists(userId: string, name: string): Promise<boolean> {
  const existing = await prisma.journalTemplate.findFirst({
    where: {
      OR: [{ userId }, { userId: null }],
      name,
    },
  })
  return Boolean(existing)
}

/**
 * Imports a template for sharing.
 * Used when a shared entry references a template the recipient doesn't have.
 *
 * @param template - The template to import
 * @param targetUserId - User ID who receives the template
 * @param sourceUsername - Username of the sharing user (for naming conflicts)
 * @returns ID of the imported or existing template
 */
export async function importTemplateForShare(
  template: {
    name: string
    description: string | null
    fields: TemplateField[] | null
    aiConfig: TemplateAIConfig | null
    typeId: string | null
  },
  targetUserId: string,
  sourceUsername: string
): Promise<string> {
  // Check if identical template already exists
  const existing = await findMatchingTemplate(targetUserId, template.fields)
  if (existing) {
    return existing.id
  }

  // Check for name collision
  const nameExists = await templateNameExists(targetUserId, template.name)
  const newName = nameExists ? `${template.name} [${sourceUsername}]` : template.name

  // Create copy for target user
  const imported = await prisma.journalTemplate.create({
    data: {
      userId: targetUserId,
      name: newName,
      description: template.description,
      fields: template.fields ? JSON.parse(JSON.stringify(template.fields)) : undefined,
      aiConfig: template.aiConfig ? JSON.parse(JSON.stringify(template.aiConfig)) : undefined,
      typeId: template.typeId,
      origin: TaxonomyOrigin.IMPORT,
    },
  })

  return imported.id
}

// =============================================================================
// TEMPLATE QUERIES
// =============================================================================

/**
 * Gets all templates available to a user (own + system templates).
 */
export async function getTemplatesForUser(userId: string) {
  return prisma.journalTemplate.findMany({
    where: {
      OR: [{ userId }, { userId: null }],
    },
    include: {
      type: {
        select: {
          id: true,
          code: true,
          name: true,
          icon: true,
        },
      },
      _count: {
        select: {
          journalEntries: true,
        },
      },
    },
    orderBy: [{ origin: 'asc' }, { name: 'asc' }],
  })
}

/**
 * Gets templates for a specific journal entry type.
 */
export async function getTemplatesForType(userId: string, typeId: string) {
  return prisma.journalTemplate.findMany({
    where: {
      OR: [{ userId }, { userId: null }],
      typeId,
    },
    orderBy: { name: 'asc' },
  })
}

/**
 * Checks if a template has any associated entries.
 * Used to warn before deletion.
 */
export async function getTemplateEntryCount(templateId: string): Promise<number> {
  return prisma.journalEntry.count({
    where: { templateId },
  })
}
