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
import { createOpenAI } from '@ai-sdk/openai'
import { NextRequest } from 'next/server'
import { getPrisma } from '@/lib/prisma'
import { FALLBACK_MODEL_ID, inferProvider, type LLMProvider } from '@/lib/llmModels'

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

async function getModelConfig(modelId: string, userId: string): Promise<{
  provider: LLMProvider
  supportsReasoningEffort: boolean
  defaultReasoningEffort: string | null
}> {
  const prisma = getPrisma()
  const userModel = await (prisma as any).llmModel?.findFirst({
    where: { userId, modelId },
    select: { provider: true, supportsReasoningEffort: true, defaultReasoningEffort: true },
  })
  
  return {
    provider: (userModel?.provider as LLMProvider) || inferProvider(modelId),
    supportsReasoningEffort: userModel?.supportsReasoningEffort ?? false,
    defaultReasoningEffort: userModel?.defaultReasoningEffort ?? null,
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req)
    if (!user) {
      return new Response('Unauthorized', { status: 401 })
    }

    const { messages, chatMethodId, modelId, reasoningEffort } = await req.json()

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

    // Convert messages to the format expected by the AI SDK
    const modelMessages = convertToModelMessages(messages)

    // Ensure we have at least one user message
    if (modelMessages.length === 0) {
      return new Response('No messages to process', { status: 400 })
    }

    // Use the provided model ID or fallback to default
    const selectedModelId = modelId || FALLBACK_MODEL_ID

    // Get model configuration including provider and reasoning effort support
    const modelConfig = await getModelConfig(selectedModelId, user.id)

    // Initialize provider based on model configuration
    let providerModel: any
    const streamOptions: any = {
      system: chatMethod.systemPrompt,
      messages: modelMessages,
    }

    if (modelConfig.provider === 'openai') {
      const openai = createOpenAI({
        apiKey: process.env.OPENAI_API_KEY || '',
      })
      providerModel = openai(selectedModelId)
      
      // Add reasoning effort for OpenAI GPT-5 models
      if (modelConfig.supportsReasoningEffort) {
        const effort = reasoningEffort || modelConfig.defaultReasoningEffort || 'medium'
        if (effort !== 'none') {
          streamOptions.reasoning = { effort }
        }
      }
    } else {
      const together = createTogetherAI({
        apiKey: process.env.TOGETHERAI_API_KEY || process.env.TOGETHER_API_KEY || '',
      })
      providerModel = together(selectedModelId)
      
      // Add reasoning effort for TogetherAI models that support it
      if (modelConfig.supportsReasoningEffort) {
        const effort = reasoningEffort || modelConfig.defaultReasoningEffort
        if (effort && effort !== 'none') {
          streamOptions.reasoning_effort = effort
        }
      }
    }

    // Stream the response using the Vercel AI SDK
    const result = await streamText({
      model: providerModel,
      ...streamOptions,
    })

    // Return the streamed response using the new v5 format
    return result.toUIMessageStreamResponse()
  } catch (error) {
    console.error('Coach chat error:', error)
    return new Response('Internal server error', { status: 500 })
  }
}
