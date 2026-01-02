/**
 * POST /api/generate-title
 * Generates a title for a journal entry using configured AI settings.
 * Supports both TogetherAI and OpenAI based on user configuration.
 */

import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import Together from 'together-ai'
import { z } from 'zod'
import { getPrisma } from '@/lib/prisma'
import {
  getDefaultAISettings,
  interpolatePrompt,
  formatDateForPrompt,
  type JournalAISettings,
} from '@/lib/defaultPrompts'
import { FALLBACK_MODEL_ID, inferProvider, getApiKeyForProvider, type LLMProvider } from '@/lib/llmModels'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const RequestSchema = z.object({
  text: z.string().min(1),
  journalEntryId: z.string().uuid().optional(),
  typeCode: z.string().optional(),
})

async function getCurrentUserId(req: NextRequest): Promise<string | null> {
  const prisma = getPrisma()
  const cookieUserId = req.cookies.get('userId')?.value
  if (cookieUserId) {
    const user = await prisma.user.findUnique({ where: { id: cookieUserId } })
    if (user) return user.id
  }
  const demoUser = await prisma.user.findUnique({ where: { username: 'demo' } })
  return demoUser?.id || null
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const parsed = RequestSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { text, journalEntryId, typeCode } = parsed.data
    const prisma = getPrisma()

    // Get user ID and settings
    const userId = await getCurrentUserId(req)
    let titleSettings = getDefaultAISettings(FALLBACK_MODEL_ID).title
    let entryTypeName = 'Tagebucheintrag'
    let entryDate = new Date()

    if (userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { settings: true },
      })

      const userSettings = user?.settings as Record<string, unknown> | null
      const journalAISettings = userSettings?.journalAISettings as JournalAISettings | undefined

      // Determine type code from journalEntryId or parameter
      let resolvedTypeCode = typeCode || 'diary'
      
      if (journalEntryId) {
        const entry = await prisma.journalEntry.findUnique({
          where: { id: journalEntryId },
          include: { type: true },
        })
        if (entry) {
          resolvedTypeCode = entry.type.code
          entryTypeName = entry.type.name
          entryDate = entry.createdAt
        }
      }

      // Get title settings for this type
      const typeSettings = journalAISettings?.[resolvedTypeCode]
      if (typeSettings?.title) {
        titleSettings = {
          modelId: typeSettings.title.modelId || titleSettings.modelId,
          prompt: typeSettings.title.prompt || titleSettings.prompt,
        }
      }
    }

    // Interpolate prompt variables
    const interpolatedPrompt = interpolatePrompt(titleSettings.prompt, {
      '{{date}}': formatDateForPrompt(entryDate),
      '{{entryType}}': entryTypeName,
    })

    // Determine provider from model ID or user's DB config
    let provider: LLMProvider = inferProvider(titleSettings.modelId)
    
    // Try to get provider from user's LLM model config
    if (userId) {
      const userModel = await (prisma as any).llmModel?.findFirst({
        where: { userId, modelId: titleSettings.modelId },
        select: { provider: true },
      })
      if (userModel?.provider) {
        provider = userModel.provider as LLMProvider
      }
    }
    
    const apiKey = getApiKeyForProvider(provider)
    if (!apiKey) {
      throw new Error(`Missing API key for provider: ${provider}`)
    }
    
    let title: string
    const messages: Array<{ role: 'system' | 'user'; content: string }> = [
      { role: 'system', content: interpolatedPrompt },
      { role: 'user', content: text.substring(0, 1000) },
    ]

    if (provider === 'openai') {
      const openai = new OpenAI({ apiKey })
      const completion = await openai.chat.completions.create({
        model: titleSettings.modelId,
        messages,
        temperature: 0.7,
        max_tokens: 50,
      })
      title = completion.choices[0]?.message?.content?.trim() || 'Tagebucheintrag'
    } else {
      const together = new Together({ apiKey })
      const response = await together.chat.completions.create({
        model: titleSettings.modelId,
        messages,
        max_tokens: 50,
        temperature: 0.7,
      })
      title = response.choices?.[0]?.message?.content?.trim() || 'Tagebucheintrag'
    }

    return NextResponse.json({ title, modelUsed: titleSettings.modelId })
  } catch (error) {
    console.error('Title generation error:', error)
    return NextResponse.json(
      { error: 'Title generation failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
