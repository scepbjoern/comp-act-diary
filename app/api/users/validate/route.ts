/**
 * API route to validate a username and return the user ID.
 * Used by sharing settings to verify users exist before saving.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getPrisma } from '@/lib/core/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const prisma = getPrisma()
  const { searchParams } = new URL(req.url)
  const username = searchParams.get('username')?.trim()

  if (!username) {
    return NextResponse.json(
      { valid: false, error: 'Benutzername erforderlich' },
      { status: 400 }
    )
  }

  // Auth check
  const cookieUserId = req.cookies.get('userId')?.value
  let user = cookieUserId
    ? await prisma.user.findUnique({ where: { id: cookieUserId } })
    : null
  if (!user) {
    user = await prisma.user.findUnique({ where: { username: 'demo' } })
  }
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Find target user by username
  const targetUser = await prisma.user.findUnique({
    where: { username },
    select: { id: true, username: true, displayName: true },
  })

  if (!targetUser) {
    return NextResponse.json(
      { valid: false, error: `Benutzer "${username}" nicht gefunden` },
      { status: 404 }
    )
  }

  // Prevent sharing with self
  if (targetUser.id === user.id) {
    return NextResponse.json(
      { valid: false, error: 'Du kannst nicht mit dir selbst teilen' },
      { status: 400 }
    )
  }

  return NextResponse.json({
    valid: true,
    userId: targetUser.id,
    username: targetUser.username,
    displayName: targetUser.displayName,
  })
}
