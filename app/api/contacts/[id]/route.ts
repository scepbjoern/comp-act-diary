import { NextRequest, NextResponse } from 'next/server'
import { getContact, updateContact, deleteContact, toggleFavorite } from '@/lib/prm'
import { ContactUpdateSchema } from '@/lib/validators/contact'
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
    const contact = await getContact(userId, id)

    if (!contact) {
      return NextResponse.json({ error: 'Kontakt nicht gefunden' }, { status: 404 })
    }

    return NextResponse.json({ contact })
  } catch (error) {
    console.error('Error fetching contact:', error)
    return NextResponse.json({ error: 'Fehler beim Laden des Kontakts' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const result = ContactUpdateSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json({ error: 'Ungültige Daten', details: result.error.flatten() }, { status: 400 })
    }

    const contact = await updateContact(userId, id, result.data)
    
    return NextResponse.json({ contact })
  } catch (error) {
    console.error('Error updating contact:', error)
    if (error instanceof Error && error.message === 'Kontakt nicht gefunden') {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }
    return NextResponse.json({ error: 'Fehler beim Aktualisieren des Kontakts' }, { status: 500 })
  }
}

export async function DELETE(
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
    const permanent = searchParams.get('permanent') === 'true'

    await deleteContact(userId, id, permanent)
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting contact:', error)
    if (error instanceof Error && error.message === 'Kontakt nicht gefunden') {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }
    return NextResponse.json({ error: 'Fehler beim Löschen des Kontakts' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()

    // Handle favorite toggle
    if (body.action === 'toggleFavorite') {
      const isFavorite = await toggleFavorite(userId, id)
      return NextResponse.json({ isFavorite })
    }

    return NextResponse.json({ error: 'Unbekannte Aktion' }, { status: 400 })
  } catch (error) {
    console.error('Error patching contact:', error)
    if (error instanceof Error && error.message === 'Kontakt nicht gefunden') {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }
    return NextResponse.json({ error: 'Fehler beim Aktualisieren des Kontakts' }, { status: 500 })
  }
}
