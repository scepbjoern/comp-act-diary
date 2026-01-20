/**
 * Calendar Events API Route
 * GET endpoint for querying calendar events by date/range.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getPrisma } from '@/lib/core/prisma'
import { getEventsForDay, getEventsForRange } from '@/lib/services/calendarService'

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
// GET - Query calendar events
// =============================================================================

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req)
    if (!user) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const date = searchParams.get('date')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // Validate query parameters
    if (!date && (!startDate || !endDate)) {
      return NextResponse.json(
        { error: 'Entweder date oder startDate+endDate ist erforderlich' },
        { status: 400 }
      )
    }

    // Date format validation (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (date && !dateRegex.test(date)) {
      return NextResponse.json(
        { error: 'Datum muss im Format YYYY-MM-DD sein' },
        { status: 400 }
      )
    }
    if (startDate && !dateRegex.test(startDate)) {
      return NextResponse.json(
        { error: 'Startdatum muss im Format YYYY-MM-DD sein' },
        { status: 400 }
      )
    }
    if (endDate && !dateRegex.test(endDate)) {
      return NextResponse.json(
        { error: 'Enddatum muss im Format YYYY-MM-DD sein' },
        { status: 400 }
      )
    }

    // Query events
    let events
    if (date) {
      events = await getEventsForDay(user.id, date)
    } else {
      events = await getEventsForRange(user.id, startDate!, endDate!)
    }

    return NextResponse.json({ events })

  } catch (error) {
    console.error('Error fetching calendar events:', error)
    return NextResponse.json(
      { error: 'Fehler beim Laden der Kalender-Events' },
      { status: 500 }
    )
  }
}
