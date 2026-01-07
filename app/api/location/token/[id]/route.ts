/**
 * Single Token Management API
 * DELETE endpoint for deactivating/deleting tokens.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getPrisma } from '@/lib/prisma'

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
    const prisma = getPrisma()
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const { id } = await params

    // Verify token belongs to user
    const token = await prisma.locationWebhookToken.findFirst({
      where: {
        id,
        userId: user.id,
      },
    })

    if (!token) {
      return NextResponse.json(
        { error: 'Token nicht gefunden' },
        { status: 404 }
      )
    }

    // Delete the token
    await prisma.locationWebhookToken.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error deleting token:', error)
    return NextResponse.json(
      { error: 'Fehler beim Löschen des Tokens' },
      { status: 500 }
    )
  }
}
