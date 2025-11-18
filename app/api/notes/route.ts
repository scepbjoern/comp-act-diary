import { NextRequest, NextResponse } from 'next/server'
import { getPrisma } from '@/lib/prisma'

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
    // Get all diary notes for the user with improved text
    const notes = await prisma.dayNote.findMany({
      where: {
        day: {
          userId: user.id
        },
        type: 'DIARY',
        // Only include notes that have text (improved or original)
        OR: [
          { text: { not: null } },
          { originalTranscript: { not: null } }
        ]
      },
      include: {
        day: {
          select: {
            date: true
          }
        }
      },
      orderBy: {
        day: {
          date: 'desc'
        }
      }
    })

    // Format the notes for context
    const formattedNotes = notes.map((note: any) => ({
      date: note.day.date,
      text: note.text || note.originalTranscript || '', // Use improved text first, fallback to original
      occurredAt: note.occurredAt
    }))

    return NextResponse.json({ notes: formattedNotes })
  } catch (error) {
    console.error('Error fetching notes:', error)
    return NextResponse.json({ error: 'Failed to fetch notes' }, { status: 500 })
  }
}
