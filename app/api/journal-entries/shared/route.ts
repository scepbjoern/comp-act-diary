/**
 * Shared JournalEntries API
 * GET: List entries shared with the current user
 */

import { NextRequest, NextResponse } from 'next/server'
import { getPrisma } from '@/lib/core/prisma'
import { getJournalEntryAccessService } from '@/lib/services/journalEntryAccessService'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/journal-entries/shared
 * List all journal entries shared with the current user.
 * Query params:
 * - dateFrom: ISO date string (optional)
 * - dateTo: ISO date string (optional)
 */
export async function GET(req: NextRequest) {
  const prisma = getPrisma()
  const accessService = getJournalEntryAccessService()

  // Auth
  const cookieUserId = req.cookies.get('userId')?.value
  let user = cookieUserId ? await prisma.user.findUnique({ where: { id: cookieUserId } }) : null
  if (!user) user = await prisma.user.findUnique({ where: { username: 'demo' } })
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Parse optional date filters
  const { searchParams } = new URL(req.url)
  const dateFromStr = searchParams.get('dateFrom')
  const dateToStr = searchParams.get('dateTo')

  const dateFrom = dateFromStr ? new Date(dateFromStr) : undefined
  const dateTo = dateToStr ? new Date(dateToStr) : undefined

  // Get shared entries
  const sharedEntries = await accessService.listSharedEntries(user.id, dateFrom, dateTo)

  return NextResponse.json({
    entries: sharedEntries.map((e) => ({
      id: e.id,
      title: e.title,
      content: e.content,
      occurredAt: e.occurredAt?.toISOString() ?? null,
      typeCode: e.typeCode,
      typeName: e.typeName,
      ownerUserId: e.ownerUserId,
      ownerName: e.ownerName,
      accessRole: e.accessRole,
    })),
  })
}
