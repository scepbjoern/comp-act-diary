/**
 * Calendar Rematch API Route
 * POST endpoint for re-matching unmatched events against current patterns.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getPrisma } from '@/lib/core/prisma'
import { rematchUnmatchedEvents } from '@/lib/services/calendarService'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

async function getCurrentUser(req: NextRequest) {
  const prisma = getPrisma()
  const cookieUserId = req.cookies.get('userId')?.value
  let user = cookieUserId ? await prisma.user.findUnique({ where: { id: cookieUserId } }) : null
  if (!user) user = await prisma.user.findUnique({ where: { username: 'demo' } })
  return user
}

// =============================================================================
// POST - Re-match unmatched events
// =============================================================================

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req)
    if (!user) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const result = await rematchUnmatchedEvents(user.id)

    return NextResponse.json({
      success: true,
      matched: result.matched,
      total: result.total,
      message: `${result.matched} von ${result.total} Events wurden gematcht`,
    })

  } catch (error) {
    console.error('Error re-matching events:', error)
    return NextResponse.json(
      { error: 'Fehler beim Re-Matching der Events' },
      { status: 500 }
    )
  }
}
