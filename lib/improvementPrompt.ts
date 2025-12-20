/**
 * CRUD operations for ImprovementPrompt (Text improvement templates)
 * These functions manage user-defined prompts for AI text improvement
 */

import { getPrisma } from './prisma'

export type ImprovementPrompt = {
  id: string
  userId: string
  name: string
  prompt: string
  isSystem: boolean
  sortOrder: number
  createdAt: Date
  updatedAt: Date
}

// Default prompts that will be created for new users
export const DEFAULT_IMPROVEMENT_PROMPTS = [
  {
    name: 'Grammatik & Struktur',
    prompt: 'Verbessere diesen Text grammatikalisch. Bilde Abschnitte mit Überschriften. Gib alles formatiert als Markdown zurück.',
    isSystem: false,
    sortOrder: 0,
  },
  {
    name: 'Formell umformulieren',
    prompt: 'Formuliere diesen Text in einem formelleren, professionellen Stil um. Behalte die Kernaussagen bei.',
    isSystem: false,
    sortOrder: 1,
  },
  {
    name: 'Zusammenfassen',
    prompt: 'Fasse diesen Text in wenigen Sätzen zusammen. Behalte die wichtigsten Punkte bei.',
    isSystem: false,
    sortOrder: 2,
  },
  {
    name: 'Erweitern & Detail',
    prompt: 'Erweitere diesen Text mit mehr Details und Beispielen, ohne die ursprüngliche Aussage zu verändern.',
    isSystem: false,
    sortOrder: 3,
  },
]

/**
 * List all improvement prompts for a user
 */
export async function listImprovementPrompts(userId: string): Promise<ImprovementPrompt[]> {
  const prisma = getPrisma()
  return await prisma.improvementPrompt.findMany({
    where: { userId },
    orderBy: { sortOrder: 'asc' },
  })
}

/**
 * Get a single improvement prompt by ID
 */
export async function getImprovementPrompt(id: string, userId: string): Promise<ImprovementPrompt | null> {
  const prisma = getPrisma()
  return await prisma.improvementPrompt.findFirst({
    where: { id, userId },
  })
}

/**
 * Create a new improvement prompt
 */
export async function createImprovementPrompt(
  userId: string,
  name: string,
  prompt: string,
  isSystem: boolean = false
): Promise<ImprovementPrompt> {
  const prisma = getPrisma()
  
  // Get the highest sortOrder for this user
  const maxOrder = await prisma.improvementPrompt.aggregate({
    where: { userId },
    _max: { sortOrder: true },
  })
  const nextOrder = (maxOrder._max.sortOrder ?? -1) + 1

  return await prisma.improvementPrompt.create({
    data: {
      userId,
      name,
      prompt,
      isSystem,
      sortOrder: nextOrder,
    },
  })
}

/**
 * Update an existing improvement prompt
 */
export async function updateImprovementPrompt(
  id: string,
  userId: string,
  name: string,
  prompt: string
): Promise<ImprovementPrompt> {
  const prisma = getPrisma()
  return await prisma.improvementPrompt.update({
    where: { id, userId },
    data: {
      name,
      prompt,
    },
  })
}

/**
 * Delete an improvement prompt (only non-system prompts can be deleted)
 */
export async function deleteImprovementPrompt(id: string, userId: string): Promise<void> {
  const prisma = getPrisma()
  await prisma.improvementPrompt.delete({
    where: { id, userId },
  })
}

/**
 * Initialize default prompts for a new user
 */
export async function initializeDefaultPrompts(userId: string): Promise<void> {
  const prisma = getPrisma()
  
  // Check if user already has prompts
  const existingCount = await prisma.improvementPrompt.count({
    where: { userId },
  })
  
  if (existingCount > 0) return

  // Create default prompts
  await prisma.improvementPrompt.createMany({
    data: DEFAULT_IMPROVEMENT_PROMPTS.map((p) => ({
      userId,
      ...p,
    })),
  })
}
