/**
 * Webhook Token Service
 * Generische Token-Verwaltung für alle Webhook-Typen (OwnTracks, Tasker Calendar, etc.).
 * Ersetzt die location-spezifische Token-Logik.
 */

import { getPrisma } from '@/lib/core/prisma'
import { SyncProviderType } from '@prisma/client'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

// =============================================================================
// TYPES
// =============================================================================

export interface WebhookTokenInfo {
  id: string
  deviceName: string
  providerType: SyncProviderType
  isActive: boolean
  lastUsedAt: Date | null
  createdAt: Date
}

export interface CreateTokenResult {
  token: WebhookTokenInfo
  plainToken: string
}

// =============================================================================
// TOKEN GENERATION
// =============================================================================

/**
 * Generate a secure random token.
 * Format depends on provider type:
 * - OWNTRACKS: loc_<base64url>
 * - TASKER_CALENDAR: cal_<base64url>
 * - Default: wh_<base64url>
 */
function generateToken(providerType: SyncProviderType): string {
  const randomBytes = crypto.randomBytes(24)
  const base64 = randomBytes.toString('base64url')
  
  const prefixes: Record<string, string> = {
    OWNTRACKS: 'loc',
    TASKER_CALENDAR: 'cal',
  }
  
  const prefix = prefixes[providerType] || 'wh'
  return `${prefix}_${base64}`
}

// =============================================================================
// TOKEN VALIDATION
// =============================================================================

/**
 * Validate webhook authentication from Authorization header.
 * Supports:
 * - HTTP Basic Auth: "Basic base64(username:password)"
 * - Bearer Token: "Bearer <token>"
 * 
 * @param authHeader - Authorization header value
 * @param providerType - Expected provider type for the token
 * @returns userId if valid, null otherwise
 */
export async function validateWebhookToken(
  authHeader: string | null,
  providerType: SyncProviderType
): Promise<string | null> {
  if (!authHeader) return null

  const prisma = getPrisma()
  
  // Extract token from header
  let tokenToValidate: string | null = null

  // Try HTTP Basic Auth first
  const basicMatch = authHeader.match(/^Basic\s+(.+)$/i)
  if (basicMatch) {
    try {
      const decoded = Buffer.from(basicMatch[1], 'base64').toString('utf-8')
      const [, password] = decoded.split(':')
      if (password) {
        tokenToValidate = password
      }
    } catch {
      // Invalid base64, continue to try Bearer
    }
  }

  // Fallback: Bearer Token
  if (!tokenToValidate) {
    const bearerMatch = authHeader.match(/^Bearer\s+(.+)$/i)
    if (bearerMatch) {
      tokenToValidate = bearerMatch[1]
    }
  }

  if (!tokenToValidate) return null

  // Find matching token by checking against hash
  const activeTokens = await prisma.webhookToken.findMany({
    where: { 
      isActive: true,
      providerType,
    },
    select: { id: true, userId: true, tokenHash: true },
  })

  for (const tokenRecord of activeTokens) {
    const isValid = await bcrypt.compare(tokenToValidate, tokenRecord.tokenHash)
    if (isValid) {
      // Update last used timestamp
      await prisma.webhookToken.update({
        where: { id: tokenRecord.id },
        data: { lastUsedAt: new Date() },
      })
      return tokenRecord.userId
    }
  }

  return null
}

// =============================================================================
// TOKEN CRUD
// =============================================================================

/**
 * Create a new webhook token for a user.
 * 
 * @param userId - User ID
 * @param deviceName - Device name for identification
 * @param providerType - Provider type (OWNTRACKS, TASKER_CALENDAR, etc.)
 * @returns Created token info with plain token (only shown once!)
 */
export async function createWebhookToken(
  userId: string,
  deviceName: string,
  providerType: SyncProviderType
): Promise<CreateTokenResult> {
  const prisma = getPrisma()
  
  // Generate token and hash
  const plainToken = generateToken(providerType)
  const tokenHash = await bcrypt.hash(plainToken, 10)

  // Create token record
  const tokenRecord = await prisma.webhookToken.create({
    data: {
      userId,
      tokenHash,
      deviceName,
      providerType,
      isActive: true,
    },
    select: {
      id: true,
      deviceName: true,
      providerType: true,
      isActive: true,
      lastUsedAt: true,
      createdAt: true,
    },
  })

  return {
    token: tokenRecord,
    plainToken, // Only returned on creation!
  }
}

/**
 * List all webhook tokens for a user.
 * 
 * @param userId - User ID
 * @param providerType - Optional filter by provider type
 * @returns Array of token info (without hash)
 */
export async function listWebhookTokens(
  userId: string,
  providerType?: SyncProviderType
): Promise<WebhookTokenInfo[]> {
  const prisma = getPrisma()

  const tokens = await prisma.webhookToken.findMany({
    where: {
      userId,
      ...(providerType && { providerType }),
    },
    select: {
      id: true,
      deviceName: true,
      providerType: true,
      isActive: true,
      lastUsedAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  return tokens
}

/**
 * Deactivate/delete a webhook token.
 * 
 * @param tokenId - Token ID
 * @param userId - User ID (for authorization check)
 * @returns true if deleted, false if not found
 */
export async function deleteWebhookToken(
  tokenId: string,
  userId: string
): Promise<boolean> {
  const prisma = getPrisma()

  // Verify token belongs to user
  const token = await prisma.webhookToken.findFirst({
    where: {
      id: tokenId,
      userId,
    },
  })

  if (!token) {
    return false
  }

  // Delete the token
  await prisma.webhookToken.delete({
    where: { id: tokenId },
  })

  return true
}

/**
 * Get provider type display name (for UI).
 */
export function getProviderTypeDisplayName(providerType: SyncProviderType): string {
  const names: Record<SyncProviderType, string> = {
    OWNTRACKS: 'OwnTracks (Standort)',
    TASKER_CALENDAR: 'Tasker Kalender',
    PHOTOPRISM: 'Photoprism',
    SAMSUNG_GALLERY: 'Samsung Galerie',
    TOGGL: 'Toggl',
    GOOGLE_CALENDAR: 'Google Kalender',
    APPLE_CALENDAR: 'Apple Kalender',
    SPOTIFY: 'Spotify',
    LAST_FM: 'Last.fm',
    GOOGLE_CONTACTS: 'Google Kontakte',
    GOOGLE_TIMELINE: 'Google Timeline',
  }
  return names[providerType] || providerType
}
