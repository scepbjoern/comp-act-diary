/**
 * CRUD operations for ChatMethod (Coach modes)
 * These functions manage the chat methods/modes with different system prompts
 */

import { getPrisma } from './prisma'

export type ChatMethod = {
  id: string
  userId: string
  name: string
  systemPrompt: string
  createdAt: Date
  updatedAt: Date
}

/**
 * List all chat methods for a user
 */
export async function listChatMethods(userId: string): Promise<ChatMethod[]> {
  const prisma = getPrisma()
  return await prisma.chatMethod.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' },
  })
}

/**
 * Get a single chat method by ID
 */
export async function getChatMethod(id: string, userId: string): Promise<ChatMethod | null> {
  const prisma = getPrisma()
  return await prisma.chatMethod.findFirst({
    where: { id, userId },
  })
}

/**
 * Create a new chat method
 */
export async function createChatMethod(
  userId: string,
  name: string,
  systemPrompt: string
): Promise<ChatMethod> {
  const prisma = getPrisma()
  return await prisma.chatMethod.create({
    data: {
      userId,
      name,
      systemPrompt,
    },
  })
}

/**
 * Update an existing chat method
 */
export async function updateChatMethod(
  id: string,
  userId: string,
  name: string,
  systemPrompt: string
): Promise<ChatMethod> {
  const prisma = getPrisma()
  return await prisma.chatMethod.update({
    where: { id, userId },
    data: {
      name,
      systemPrompt,
    },
  })
}

/**
 * Delete a chat method
 */
export async function deleteChatMethod(id: string, userId: string): Promise<void> {
  const prisma = getPrisma()
  await prisma.chatMethod.delete({
    where: { id, userId },
  })
}
