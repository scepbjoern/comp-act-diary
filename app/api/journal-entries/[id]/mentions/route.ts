import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'
import { findMentionsInText, createMentionInteractions, getMentionsForEntry } from '@/lib/mentions'

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

    const { id: entryId } = await params

    const mentions = await getMentionsForEntry(userId, entryId)

    return NextResponse.json({ mentions })
  } catch (error) {
    console.error('Error fetching mentions:', error)
    return NextResponse.json({ error: 'Fehler beim Laden der Erwähnungen' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    const { id: entryId } = await params
    const body = await request.json()
    const { content } = body

    if (!content) {
      return NextResponse.json({ error: 'Content erforderlich' }, { status: 400 })
    }

    // Get the journal entry to get the date
    const entry = await prisma.journalEntry.findFirst({
      where: { id: entryId, userId },
      include: { timeBox: true },
    })

    if (!entry) {
      return NextResponse.json({ error: 'Eintrag nicht gefunden' }, { status: 404 })
    }

    // Find mentions in the content
    const mentions = await findMentionsInText(userId, content)

    if (mentions.length > 0) {
      // Create MENTION interactions
      // Use the entry's timeBox startAt and timeBoxId
      await createMentionInteractions(
        userId,
        entryId,
        mentions.map(m => m.contactId),
        entry.timeBox.startAt,
        entry.timeBoxId
      )
    }

    return NextResponse.json({
      success: true,
      mentionsCreated: mentions.length,
      mentions: mentions.map(m => ({
        contactId: m.contactId,
        contactName: m.contactName,
        contactSlug: m.contactSlug,
      })),
    })
  } catch (error) {
    console.error('Error processing mentions:', error)
    return NextResponse.json({ error: 'Fehler beim Verarbeiten der Erwähnungen' }, { status: 500 })
  }
}
