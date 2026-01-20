/**
 * Single Calendar Token Management API
 * DELETE endpoint for deactivating/deleting TASKER_CALENDAR tokens.
 * Uses generic WebhookToken model.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getPrisma } from '@/lib/core/prisma'
import { deleteWebhookToken } from '@/lib/services/webhookTokenService'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function getCurrentUser(req: NextRequest) {
  const prisma = getPrisma()
  const cookieUserId = req.cookies.get('userId')?.value
  let user = cookieUserId ? await prisma.user.findUnique({ where: { id: cookieUserId } }) : null
  if (!user) user = await prisma.user.findUnique({ where: { username: 'demo' } })
  return user
}

// =============================================================================
// DELETE - Deactivate/delete token
// =============================================================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const { id } = await params

    // Delete token using generic service (verifies ownership)
    const deleted = await deleteWebhookToken(id, user.id)

    if (!deleted) {
      return NextResponse.json(
        { error: 'Token nicht gefunden' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error deleting calendar token:', error)
    return NextResponse.json(
      { error: 'Fehler beim Löschen des Tokens' },
      { status: 500 }
    )
  }
}
