import { NextRequest, NextResponse } from 'next/server'
import { getInteractions, createInteraction, deleteInteraction } from '@/lib/prm'
import { InteractionCreateSchema } from '@/lib/validators/contact'
import { cookies } from 'next/headers'

async function getUserId(): Promise<string | null> {
  const cookieStore = await cookies()
  return cookieStore.get('userId')?.value || null
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    const { id } = await params
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')

    const interactions = await getInteractions(userId, id, limit)
    
    return NextResponse.json({ interactions })
  } catch (error) {
    console.error('Error fetching interactions:', error)
    return NextResponse.json({ error: 'Fehler beim Laden der Interaktionen' }, { status: 500 })
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

    const { id: contactId } = await params
    const body = await request.json()
    
    const result = InteractionCreateSchema.safeParse({ ...body, contactId })

    if (!result.success) {
      return NextResponse.json({ error: 'Ungültige Daten', details: result.error.flatten() }, { status: 400 })
    }

    await createInteraction(
      userId,
      contactId,
      result.data.kind,
      result.data.notes || undefined,
      result.data.occurredAt,
      result.data.journalEntryId || undefined
    )
    
    return NextResponse.json({ success: true }, { status: 201 })
  } catch (error) {
    console.error('Error creating interaction:', error)
    return NextResponse.json({ error: 'Fehler beim Erstellen der Interaktion' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  _context: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const interactionId = searchParams.get('interactionId')

    if (!interactionId) {
      return NextResponse.json({ error: 'Interaktions-ID erforderlich' }, { status: 400 })
    }

    await deleteInteraction(userId, interactionId)
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting interaction:', error)
    return NextResponse.json({ error: 'Fehler beim Löschen der Interaktion' }, { status: 500 })
  }
}
