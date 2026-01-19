/**
 * POST /api/journal-ai/pipeline
 * Runs the full AI pipeline: content → analysis → summary.
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getPrisma } from '@/lib/core/prisma'
import { getJournalAIService } from '@/lib/services/journalAIService'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const RequestSchema = z.object({
  journalEntryId: z.string().uuid(),
  steps: z.array(z.enum(['content', 'analysis', 'summary'])).optional(),
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

    const result = await service.runPipeline({
      journalEntryId: parsed.data.journalEntryId,
      userId,
      steps: parsed.data.steps,
    })

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
