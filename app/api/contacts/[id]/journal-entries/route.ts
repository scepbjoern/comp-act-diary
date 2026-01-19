import { NextRequest, NextResponse } from 'next/server'
import { getPrisma } from '@/lib/core/prisma'
import { cookies } from 'next/headers'

async function getUserId(): Promise<string | null> {
  const cookieStore = await cookies()
  return cookieStore.get('userId')?.value || null
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    const prisma = getPrisma()
    const { id: contactId } = await params

    // Verify contact belongs to user
    const contact = await prisma.contact.findFirst({
      where: { id: contactId, userId },
    })

    if (!contact) {
      return NextResponse.json({ error: 'Kontakt nicht gefunden' }, { status: 404 })
    }

    // Get all interactions with kind=MENTION that have a journalEntryId
    const mentions = await prisma.interaction.findMany({
      where: {
        contactId,
        userId,
        kind: 'MENTION',
        journalEntryId: { not: null },
      },
      include: {
        journalEntry: {
          select: {
            id: true,
            title: true,
            content: true,
            createdAt: true,
          },
        },
      },
      orderBy: { occurredAt: 'desc' },
    })

    // Extract journal entries from mentions
    const journalEntries = mentions
      .filter(m => m.journalEntry)
      .map(m => ({
        id: m.journalEntry!.id,
        title: m.journalEntry!.title,
        content: m.journalEntry!.content,
        createdAt: m.journalEntry!.createdAt,
        mentionDate: m.occurredAt,
        interactionId: m.id,
      }))

    return NextResponse.json({ journalEntries })
  } catch (error) {
    console.error('Error fetching journal entries:', error)
    return NextResponse.json({ error: 'Fehler beim Laden der Journal-Einträge' }, { status: 500 })
  }
}
