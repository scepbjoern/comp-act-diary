import { NextRequest, NextResponse } from 'next/server'
import { getNotification, markAsRead, archiveNotification, deleteNotification } from '@/lib/legacy/notification'
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
    const notification = await getNotification(userId, id)

    if (!notification) {
      return NextResponse.json({ error: 'Benachrichtigung nicht gefunden' }, { status: 404 })
    }

    return NextResponse.json({ notification })
  } catch (error) {
    console.error('Error fetching notification:', error)
    return NextResponse.json({ error: 'Fehler beim Laden der Benachrichtigung' }, { status: 500 })
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

    let notification
    switch (body.action) {
      case 'markRead':
        notification = await markAsRead(userId, id)
        break
      case 'archive':
        notification = await archiveNotification(userId, id)
        break
      default:
        return NextResponse.json({ error: 'Unbekannte Aktion' }, { status: 400 })
    }

    return NextResponse.json({ notification })
  } catch (error) {
    console.error('Error patching notification:', error)
    if (error instanceof Error && error.message === 'Benachrichtigung nicht gefunden') {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }
    return NextResponse.json({ error: 'Fehler beim Aktualisieren der Benachrichtigung' }, { status: 500 })
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
    await deleteNotification(userId, id)
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting notification:', error)
    if (error instanceof Error && error.message === 'Benachrichtigung nicht gefunden') {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }
    return NextResponse.json({ error: 'Fehler beim Löschen der Benachrichtigung' }, { status: 500 })
  }
}
