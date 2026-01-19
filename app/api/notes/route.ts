import { NextRequest, NextResponse } from 'next/server'
import { getPrisma } from '@/lib/core/prisma'

// Ensure this route is always executed at request time on the Node.js runtime
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const prisma = getPrisma()

  const cookieUserId = req.cookies.get('userId')?.value
  let user = cookieUserId ? await prisma.user.findUnique({ where: { id: cookieUserId } }) : null
  if (!user) user = await prisma.user.findUnique({ where: { username: 'demo' } })
  if (!user) return NextResponse.json({ error: 'No user' }, { status: 401 })

  try {
    // Get diary-type JournalEntryType
    const diaryType = await prisma.journalEntryType.findFirst({
      where: { code: 'diary', userId: null }
    })

    if (!diaryType) {
      return NextResponse.json({ notes: [] })
    }

    // Get all diary journal entries for the user
    const entries = await prisma.journalEntry.findMany({
      where: {
        userId: user.id,
        typeId: diaryType.id,
        deletedAt: null,
        NOT: { content: '' }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Load TimeBoxes for localDate
    const timeBoxIds = [...new Set(entries.map(e => e.timeBoxId).filter(Boolean))]
    const timeBoxes = timeBoxIds.length > 0
      ? await prisma.timeBox.findMany({ where: { id: { in: timeBoxIds } }, select: { id: true, localDate: true } })
      : []
    const localDateById = new Map(timeBoxes.map(tb => [tb.id, tb.localDate]))

    // Format the notes for context
    const formattedNotes = entries.map((entry) => ({
      date: localDateById.get(entry.timeBoxId) || entry.createdAt.toISOString().slice(0, 10),
      text: entry.content || '',
      occurredAt: entry.createdAt
    }))

    return NextResponse.json({ notes: formattedNotes })
  } catch (error) {
    console.error('Error fetching notes:', error)
    return NextResponse.json({ error: 'Failed to fetch notes' }, { status: 500 })
  }
}
