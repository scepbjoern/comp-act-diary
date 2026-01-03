import { NextRequest, NextResponse } from 'next/server'
import { getSyncProviderStatus, disconnectGoogleContacts } from '@/lib/prm/google-auth'
import { cookies } from 'next/headers'

async function getUserId(): Promise<string | null> {
  const cookieStore = await cookies()
  return cookieStore.get('userId')?.value || null
}

export async function GET(_request: NextRequest) {
  try {
    const userId = await getUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    const status = await getSyncProviderStatus(userId)
    
    return NextResponse.json(status)
  } catch (error) {
    console.error('Error fetching sync status:', error)
    return NextResponse.json({ error: 'Fehler beim Laden des Sync-Status' }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest) {
  try {
    const userId = await getUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    await disconnectGoogleContacts(userId)
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error disconnecting Google Contacts:', error)
    return NextResponse.json({ error: 'Fehler beim Trennen von Google Contacts' }, { status: 500 })
  }
}
