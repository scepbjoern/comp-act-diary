import { NextRequest, NextResponse } from 'next/server'
import { exchangeCodeForTokens, storeTokens } from '@/lib/prm/google-auth'
import { cookies } from 'next/headers'

async function getUserId(): Promise<string | null> {
  const cookieStore = await cookies()
  return cookieStore.get('userId')?.value || null
}

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId()
    if (!userId) {
      return NextResponse.redirect(new URL('/login?error=not_authenticated', request.url))
    }

    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    // Handle OAuth errors
    if (error) {
      console.error('OAuth error:', error)
      return NextResponse.redirect(new URL(`/prm?error=oauth_${error}`, request.url))
    }

    if (!code) {
      return NextResponse.redirect(new URL('/prm?error=no_code', request.url))
    }

    // Verify state parameter for CSRF protection
    const cookieStore = await cookies()
    const storedState = cookieStore.get('google_oauth_state')?.value

    if (!storedState || storedState !== state) {
      console.error('State mismatch:', { storedState, state })
      return NextResponse.redirect(new URL('/prm?error=state_mismatch', request.url))
    }

    // Clear the state cookie
    cookieStore.delete('google_oauth_state')

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code)

    // Store tokens
    await storeTokens(userId, tokens)

    // Redirect to PRM with success message
    return NextResponse.redirect(new URL('/prm?google_connected=true', request.url))
  } catch (error) {
    console.error('Error in OAuth callback:', error)
    return NextResponse.redirect(new URL('/prm?error=oauth_failed', request.url))
  }
}
