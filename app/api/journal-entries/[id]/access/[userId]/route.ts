/**
 * JournalEntry Access User API
 * PATCH: Update access role for a user
 * DELETE: Revoke access from a user
 */

import { NextRequest, NextResponse } from 'next/server'
import { getPrisma } from '@/lib/core/prisma'
import { getJournalEntryAccessService } from '@/lib/services/journalEntryAccessService'
import { UpdateAccessRoleSchema } from '@/lib/validators/journalEntryAccess'
import { logger } from '@/lib/core/logger'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * PATCH /api/journal-entries/[id]/access/[userId]
 * Update the role for an existing access grant.
 */
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string; userId: string }> }
) {
  const { id: entryId, userId: targetUserId } = await context.params
  const prisma = getPrisma()
  const accessService = getJournalEntryAccessService()

  // Auth
  const cookieUserId = req.cookies.get('userId')?.value
  let user = cookieUserId ? await prisma.user.findUnique({ where: { id: cookieUserId } }) : null
  if (!user) user = await prisma.user.findUnique({ where: { username: 'demo' } })
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Validate body
  const body = await req.json().catch(() => ({}))
  const validation = UpdateAccessRoleSchema.safeParse(body)
  if (!validation.success) {
    return NextResponse.json(
      { error: 'Ungültige Eingabe', details: validation.error.flatten() },
      { status: 400 }
    )
  }

  const { role } = validation.data

  // Update access role
  const result = await accessService.updateAccessRole(entryId, targetUserId, role, user.id)
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 403 })
  }

  logger.info({ entryId, targetUserId, newRole: role }, 'Access role updated via API')

  // Return updated grants list
  const grants = await accessService.listAccessGrants(entryId)
  return NextResponse.json({ ok: true, grants })
}

/**
 * DELETE /api/journal-entries/[id]/access/[userId]
 * Revoke access from a user.
 */
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string; userId: string }> }
) {
  const { id: entryId, userId: targetUserId } = await context.params
  const prisma = getPrisma()
  const accessService = getJournalEntryAccessService()

  // Auth
  const cookieUserId = req.cookies.get('userId')?.value
  let user = cookieUserId ? await prisma.user.findUnique({ where: { id: cookieUserId } }) : null
  if (!user) user = await prisma.user.findUnique({ where: { username: 'demo' } })
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Revoke access
  const result = await accessService.revokeAccess(entryId, targetUserId, user.id)
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 403 })
  }

  logger.info({ entryId, targetUserId }, 'Access revoked via API')

  // Return updated grants list
  const grants = await accessService.listAccessGrants(entryId)
  return NextResponse.json({ ok: true, grants })
}
