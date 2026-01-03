import { google } from 'googleapis'
import { prisma } from '@/lib/prisma'

// =============================================================================
// GOOGLE AUTH SERVICE
// =============================================================================

const SCOPES = [
  'https://www.googleapis.com/auth/contacts',
  'https://www.googleapis.com/auth/contacts.readonly',
]

export interface GoogleTokens {
  access_token: string
  refresh_token?: string
  expiry_date?: number
  token_type?: string
  scope?: string
}

export interface GoogleAuthConfig {
  clientId: string
  clientSecret: string
  redirectUri: string
}

function getAuthConfig(): GoogleAuthConfig {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/sync/google-contacts/callback'

  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth credentials not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.')
  }

  return { clientId, clientSecret, redirectUri }
}

function createOAuth2Client(config?: GoogleAuthConfig) {
  const { clientId, clientSecret, redirectUri } = config || getAuthConfig()
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri)
}

/**
 * Generate the OAuth2 authorization URL for Google Contacts
 */
export function getAuthorizationUrl(state?: string): string {
  const oauth2Client = createOAuth2Client()
  
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
    state: state || '',
  })
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(code: string): Promise<GoogleTokens> {
  const oauth2Client = createOAuth2Client()
  
  const { tokens } = await oauth2Client.getToken(code)
  
  return {
    access_token: tokens.access_token!,
    refresh_token: tokens.refresh_token || undefined,
    expiry_date: tokens.expiry_date || undefined,
    token_type: tokens.token_type || undefined,
    scope: tokens.scope || undefined,
  }
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(refreshToken: string): Promise<GoogleTokens> {
  const oauth2Client = createOAuth2Client()
  oauth2Client.setCredentials({ refresh_token: refreshToken })
  
  const { credentials } = await oauth2Client.refreshAccessToken()
  
  return {
    access_token: credentials.access_token!,
    refresh_token: credentials.refresh_token || refreshToken,
    expiry_date: credentials.expiry_date || undefined,
    token_type: credentials.token_type || undefined,
    scope: credentials.scope || undefined,
  }
}

/**
 * Check if token is expired or will expire soon (within 5 minutes)
 */
export function isTokenExpired(expiryDate?: number): boolean {
  if (!expiryDate) return true
  const bufferMs = 5 * 60 * 1000 // 5 minutes buffer
  return Date.now() >= expiryDate - bufferMs
}

/**
 * Get valid tokens for a user, refreshing if necessary
 */
export async function getValidTokens(userId: string): Promise<GoogleTokens | null> {
  const provider = await prisma.syncProvider.findFirst({
    where: {
      userId,
      provider: 'GOOGLE_CONTACTS',
      isActive: true,
    },
  })

  if (!provider || !provider.credentialsEncrypted) {
    return null
  }

  try {
    const tokens = JSON.parse(provider.credentialsEncrypted) as GoogleTokens
    
    if (isTokenExpired(tokens.expiry_date) && tokens.refresh_token) {
      const newTokens = await refreshAccessToken(tokens.refresh_token)
      
      // Update stored tokens
      await prisma.syncProvider.update({
        where: { id: provider.id },
        data: {
          credentialsEncrypted: JSON.stringify(newTokens),
          updatedAt: new Date(),
        },
      })
      
      return newTokens
    }
    
    return tokens
  } catch (error) {
    console.error('Error getting valid tokens:', error)
    return null
  }
}

/**
 * Store tokens for a user (creates or updates SyncProvider)
 */
export async function storeTokens(userId: string, tokens: GoogleTokens): Promise<void> {
  const existingProvider = await prisma.syncProvider.findFirst({
    where: {
      userId,
      provider: 'GOOGLE_CONTACTS',
    },
  })

  if (existingProvider) {
    await prisma.syncProvider.update({
      where: { id: existingProvider.id },
      data: {
        credentialsEncrypted: JSON.stringify(tokens),
        isActive: true,
        updatedAt: new Date(),
      },
    })
  } else {
    await prisma.syncProvider.create({
      data: {
        userId,
        provider: 'GOOGLE_CONTACTS',
        credentialsEncrypted: JSON.stringify(tokens),
        isActive: true,
      },
    })
  }
}

/**
 * Get sync provider status for a user
 */
export async function getSyncProviderStatus(userId: string): Promise<{
  isConnected: boolean
  lastSyncAt: Date | null
  syncToken: string | null
}> {
  const provider = await prisma.syncProvider.findFirst({
    where: {
      userId,
      provider: 'GOOGLE_CONTACTS',
      isActive: true,
    },
  })

  if (!provider) {
    return { isConnected: false, lastSyncAt: null, syncToken: null }
  }

  return {
    isConnected: !!provider.credentialsEncrypted,
    lastSyncAt: provider.lastSyncAt,
    syncToken: provider.syncToken,
  }
}

/**
 * Disconnect Google Contacts (deactivate provider)
 */
export async function disconnectGoogleContacts(userId: string): Promise<void> {
  await prisma.syncProvider.updateMany({
    where: {
      userId,
      provider: 'GOOGLE_CONTACTS',
    },
    data: {
      isActive: false,
      credentialsEncrypted: null,
      syncToken: null,
      updatedAt: new Date(),
    },
  })
}

/**
 * Create an authenticated OAuth2 client for API calls
 */
export async function getAuthenticatedClient(userId: string) {
  const tokens = await getValidTokens(userId)
  
  if (!tokens) {
    throw new Error('No valid Google tokens found. Please reconnect Google Contacts.')
  }

  const oauth2Client = createOAuth2Client()
  oauth2Client.setCredentials({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expiry_date: tokens.expiry_date,
  })

  return oauth2Client
}
