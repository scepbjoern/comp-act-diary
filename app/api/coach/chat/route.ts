/**
 * Coach Chat API Route
 * 
 * This endpoint handles chat interactions with the Coach using:
 * - Vercel AI SDK for streaming responses
 * - Together AI as the LLM provider
 * - Mastra for agent orchestration (future: RAG, memory, tools)
 * 
 * The chat is session-based (not persisted) in this first prototype.
 * Only the chat methods/modes are stored in the database.
 */

import { streamText, convertToModelMessages } from 'ai'
import { createTogetherAI } from '@ai-sdk/togetherai'
import { NextRequest } from 'next/server'
import { getPrisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function getCurrentUser(req: NextRequest) {
  const prisma = getPrisma()
  const cookieUserId = req.cookies.get('userId')?.value
  let user = cookieUserId ? await prisma.user.findUnique({ where: { id: cookieUserId } }) : null
  if (!user) user = await prisma.user.findUnique({ where: { username: 'demo' } })
  return user
}

async function getChatMethod(chatMethodId: string, userId: string) {
  const prisma = getPrisma()
  return await (prisma as any).chatMethod.findFirst({
    where: {
      id: chatMethodId,
      userId: userId,
    },
  })
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req)
    if (!user) {
      return new Response('Unauthorized', { status: 401 })
    }

    const { messages, chatMethodId, modelId } = await req.json()

    // Validate inputs
    if (!messages || !Array.isArray(messages)) {
      return new Response('Invalid messages', { status: 400 })
    }

    if (!chatMethodId) {
      return new Response('chatMethodId is required', { status: 400 })
    }

    // Get the selected chat method to retrieve the system prompt
    const chatMethod = await getChatMethod(chatMethodId, user.id)
    if (!chatMethod) {
      return new Response('Chat method not found', { status: 404 })
    }

    // Initialize Together AI provider
    // Uses TOGETHERAI_API_KEY or falls back to TOGETHER_API_KEY
    const together = createTogetherAI({
      apiKey: process.env.TOGETHERAI_API_KEY || process.env.TOGETHER_API_KEY || '',
    })

    // Convert messages to the format expected by the AI SDK
    const modelMessages = convertToModelMessages(messages)

    // Ensure we have at least one user message
    if (modelMessages.length === 0) {
      return new Response('No messages to process', { status: 400 })
    }

    // Use the provided model ID or fallback to default
    const selectedModelId = modelId || 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo'

    // Stream the response using the Vercel AI SDK
    // The system prompt from the selected ChatMethod is injected here
    const result = await streamText({
      model: together(selectedModelId),
      system: chatMethod.systemPrompt, // System prompt from selected mode
      messages: modelMessages,
      // Future enhancements:
      // - Add RAG context from ACT book
      // - Add user's journal entries as context
      // - Add memory for long-term conversation tracking
      // - Add tools for specific actions (e.g., create reflection, log mood)
    })

    // Return the streamed response using the new v5 format
    return result.toUIMessageStreamResponse()
  } catch (error) {
    console.error('Coach chat error:', error)
    return new Response('Internal server error', { status: 500 })
  }
}
