import { NextRequest, NextResponse } from 'next/server'
import { performSync, getSyncHistory } from '@/lib/prm/contact-sync'
import { cookies } from 'next/headers'

async function getUserId(): Promise<string | null> {
  const cookieStore = await cookies()
  return cookieStore.get('userId')?.value || null
}

export async function POST(_request: NextRequest) {
  try {
    const userId = await getUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    const result = await performSync(userId)
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error syncing contacts:', error)
    return NextResponse.json({ error: 'Fehler bei der Synchronisation' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')

    const history = await getSyncHistory(userId, limit)
    
    return NextResponse.json({ history })
  } catch (error) {
    console.error('Error fetching sync history:', error)
    return NextResponse.json({ error: 'Fehler beim Laden des Sync-Verlaufs' }, { status: 500 })
  }
}
