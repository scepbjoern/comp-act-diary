/**
 * Calendar Event [id] API Route
 * PATCH endpoint for updating individual calendar events.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getPrisma } from '@/lib/core/prisma'
import { updateCalendarEvent } from '@/lib/services/calendarService'

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
// PATCH - Update calendar event
// =============================================================================

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(req)
    if (!user) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const { id } = await params

    const body = await req.json()
    const { title, description, isHidden } = body

    // Validate at least one field is provided
    if (title === undefined && description === undefined && isHidden === undefined) {
      return NextResponse.json(
        { error: 'Mindestens ein Feld (title, description, isHidden) erforderlich' },
        { status: 400 }
      )
    }

    const updated = await updateCalendarEvent(user.id, id, {
      title,
      description,
      isHidden,
    })

    if (!updated) {
      return NextResponse.json(
        { error: 'Event nicht gefunden' },
        { status: 404 }
      )
    }

    return NextResponse.json({ ok: true, id: updated.id })

  } catch (error) {
    console.error('Error updating calendar event:', error)
    return NextResponse.json(
      { error: 'Fehler beim Aktualisieren des Events' },
      { status: 500 }
    )
  }
}
