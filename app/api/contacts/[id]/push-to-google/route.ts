import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { syncContactToGoogle } from '@/lib/prm/contact-sync'

async function getUserId(): Promise<string | null> {
  const cookieStore = await cookies()
  return cookieStore.get('userId')?.value || null
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    const { id: contactId } = await params

    const result = await syncContactToGoogle(userId, contactId)

    if (result.success) {
      return NextResponse.json({ 
        success: true, 
        resourceName: result.resourceName,
        message: 'Kontakt erfolgreich zu Google synchronisiert'
      })
    } else {
      return NextResponse.json({ 
        success: false, 
        error: result.error 
      }, { status: 400 })
    }
  } catch (error) {
    console.error('Error pushing contact to Google:', error)
    return NextResponse.json({ error: 'Fehler beim Synchronisieren' }, { status: 500 })
  }
}
