/**
 * POST /api/journal-ai/pipeline
 * Runs the full AI pipeline: content → analysis → summary.
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getPrisma } from '@/lib/core/prisma'
import { getJournalAIService } from '@/lib/services/journalAIService'
import { getImageGenerationService } from '@/lib/services/imageGenerationService'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const RequestSchema = z.object({
  journalEntryId: z.string().uuid(),
  steps: z.array(z.enum(['content', 'title', 'analysis', 'summary', 'image'])).optional(),
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

    // Separate image step (handled via imageGenerationService) from AI steps
    const allSteps = parsed.data.steps
    const aiSteps = allSteps?.filter((s): s is 'content' | 'title' | 'analysis' | 'summary' => s !== 'image')
    const includeImage = allSteps ? allSteps.includes('image') : false

    const result = await service.runPipeline({
      journalEntryId: parsed.data.journalEntryId,
      userId,
      steps: aiSteps,
    })

    // Handle image generation separately (Entity.id == JournalEntry.id)
    if (includeImage) {
      try {
        const entry = await prisma.journalEntry.findUnique({
          where: { id: parsed.data.journalEntryId },
        })
        const entity = await prisma.entity.findUnique({
          where: { id: parsed.data.journalEntryId },
        })
        if (entry && entity) {
          const summaryText = entry.aiSummary || entry.content || ''
          if (summaryText.trim()) {
            const imgService = getImageGenerationService(prisma)
            const userSettings = await imgService.getUserSettings(userId)
            await imgService.generateImage({
              entityId: entity.id,
              userId,
              summaryText,
              settings: userSettings,
            })
            result.steps.push({ step: 'image', success: true })
          } else {
            result.steps.push({ step: 'image', success: false, error: 'Kein Text für Bildgenerierung vorhanden' })
          }
        } else {
          result.steps.push({ step: 'image', success: false, error: 'Eintrag oder Entity nicht gefunden' })
        }
      } catch (error) {
        result.steps.push({
          step: 'image',
          success: false,
          error: error instanceof Error ? error.message : 'Image generation failed',
        })
      }
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('POST /api/journal-ai/pipeline failed', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal Server Error',
      },
      { status: 500 }
    )
  }
}
