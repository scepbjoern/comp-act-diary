/**
 * JournalEntry Access API
 * GET: List users with access to entry
 * POST: Grant access to a user (by username)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getPrisma } from '@/lib/core/prisma'
import { getJournalEntryAccessService } from '@/lib/services/journalEntryAccessService'
import { GrantAccessSchema } from '@/lib/validators/journalEntryAccess'
import { logger } from '@/lib/core/logger'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/journal-entries/[id]/access
 * List all users who have access to this entry.
 */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: entryId } = await context.params
  const prisma = getPrisma()
  const accessService = getJournalEntryAccessService()

  // Auth
  const cookieUserId = req.cookies.get('userId')?.value
  let user = cookieUserId ? await prisma.user.findUnique({ where: { id: cookieUserId } }) : null
  if (!user) user = await prisma.user.findUnique({ where: { username: 'demo' } })
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Check if user can view this entry
  const access = await accessService.checkAccess(entryId, user.id)
  if (!access.canRead) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // List access grants
  const grants = await accessService.listAccessGrants(entryId)

  // Get owner info
  const entry = await prisma.journalEntry.findUnique({
    where: { id: entryId },
    include: {
      user: { select: { id: true, email: true, displayName: true, username: true } },
    },
  })

  return NextResponse.json({
    entryId,
    owner: entry?.user
      ? {
          userId: entry.user.id,
          email: entry.user.email,
          name: entry.user.displayName || entry.user.username,
        }
      : null,
    grants,
  })
}

/**
 * POST /api/journal-entries/[id]/access
 * Grant access to a user by email.
 */
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: entryId } = await context.params
  const prisma = getPrisma()
  const accessService = getJournalEntryAccessService()

  // Auth
  const cookieUserId = req.cookies.get('userId')?.value
  let user = cookieUserId ? await prisma.user.findUnique({ where: { id: cookieUserId } }) : null
  if (!user) user = await prisma.user.findUnique({ where: { username: 'demo' } })
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Validate body
  const body = await req.json().catch(() => ({}))
  const validation = GrantAccessSchema.safeParse(body)
  if (!validation.success) {
    return NextResponse.json(
      { error: 'Ungültige Eingabe', details: validation.error.flatten() },
      { status: 400 }
    )
  }

  const { username, role } = validation.data

  // Find target user by username
  const targetUser = await prisma.user.findUnique({
    where: { username },
  })
  if (!targetUser) {
    return NextResponse.json(
      { error: 'Benutzer mit diesem Benutzernamen nicht gefunden' },
      { status: 404 }
    )
  }

  // Grant access
  const result = await accessService.grantAccess(entryId, targetUser.id, role, user.id)
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 403 })
  }

  logger.info({ entryId, targetUsername: username, role }, 'Access granted via API')

  // Return updated grants list
  const grants = await accessService.listAccessGrants(entryId)
  return NextResponse.json({ ok: true, grants })
}
