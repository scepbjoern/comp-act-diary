import { NextRequest, NextResponse } from 'next/server'
import { getAuthorizationUrl } from '@/lib/prm/google-auth'
import { cookies } from 'next/headers'
import { v4 as uuidv4 } from 'uuid'

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

    // Generate a state parameter for CSRF protection
    const state = uuidv4()
    
    // Store state in cookie for verification in callback
    const cookieStore = await cookies()
    cookieStore.set('google_oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10 minutes
    })

    const authUrl = getAuthorizationUrl(state)
    
    return NextResponse.json({ authUrl })
  } catch (error) {
    console.error('Error generating auth URL:', error)
    return NextResponse.json({ error: 'Fehler beim Generieren der Authentifizierungs-URL' }, { status: 500 })
  }
}
