/**
 * POST /api/batch/preview
 * Dry-run: Returns list of affected entries without processing them.
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getPrisma } from '@/lib/prisma'
import { getJournalAIService } from '@/lib/services/journalAIService'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const RequestSchema = z.object({
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  typeCodes: z.array(z.string()).min(1),
  steps: z.array(z.enum(['title', 'content', 'analysis', 'summary'])).min(1),
  overwriteMode: z.enum(['empty_only', 'overwrite_all']),
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

    const entries = await service.getAffectedEntries({
      userId,
      ...parsed.data,
    })

    return NextResponse.json({
      count: entries.length,
      entries,
    })
  } catch (error) {
    console.error('POST /api/batch/preview failed', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    )
  }
}
