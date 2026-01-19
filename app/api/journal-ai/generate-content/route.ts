/**
 * POST /api/journal-ai/generate-content
 * Generates formatted content from originalTranscript using AI.
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getPrisma } from '@/lib/core/prisma'
import { getJournalAIService } from '@/lib/services/journalAIService'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const RequestSchema = z.object({
  journalEntryId: z.string().uuid().optional(),
  text: z.string().optional(),
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
    const userId = await getCurrentUserId(req)
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const parsed = RequestSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const prisma = getPrisma()
    const service = getJournalAIService(prisma)

    // If we have a journalEntryId, use the full service
    if (parsed.data.journalEntryId) {
      const result = await service.generateContent({
        journalEntryId: parsed.data.journalEntryId,
        userId,
        text: parsed.data.text,
      })

      return NextResponse.json({
        content: result.text,
        modelUsed: result.modelUsed,
        tokensUsed: result.tokensUsed,
      })
    }

    // Standalone text improvement (no journalEntryId)
    if (!parsed.data.text?.trim()) {
      return NextResponse.json({ error: 'Text is required when no journalEntryId is provided' }, { status: 400 })
    }

    const result = await service.generateContentFromText({
      text: parsed.data.text,
      userId,
      typeCode: parsed.data.typeCode || 'diary',
    })

    return NextResponse.json({
      content: result.text,
      modelUsed: result.modelUsed,
      tokensUsed: result.tokensUsed,
    })
  } catch (error) {
    console.error('POST /api/journal-ai/generate-content failed', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal Server Error',
      },
      { status: 500 }
    )
  }
}
