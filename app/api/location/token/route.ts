/**
 * Location Webhook Token Management API
 * CRUD operations for OwnTracks authentication tokens.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getPrisma } from '@/lib/core/prisma'
import { createTokenSchema } from '@/lib/validators/location'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get current user from cookie
 */
async function getCurrentUser(req: NextRequest) {
  const prisma = getPrisma()
  const cookieUserId = req.cookies.get('userId')?.value
  let user = cookieUserId ? await prisma.user.findUnique({ where: { id: cookieUserId } }) : null
  if (!user) user = await prisma.user.findUnique({ where: { username: 'demo' } })
  return user
}

/**
 * Generate a secure random token.
 * Format: loc_<base64url string>
 */
function generateToken(): string {
  const randomBytes = crypto.randomBytes(24)
  const base64 = randomBytes.toString('base64url')
  return `loc_${base64}`
}

// =============================================================================
// GET - List all tokens for user
// =============================================================================

export async function GET(req: NextRequest) {
  try {
    const prisma = getPrisma()
    const user = await getCurrentUser(req)
    if (!user) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const tokens = await prisma.locationWebhookToken.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        deviceName: true,
        isActive: true,
        lastUsedAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ tokens })

  } catch (error) {
    console.error('Error fetching tokens:', error)
    return NextResponse.json(
      { error: 'Fehler beim Laden der Tokens' },
      { status: 500 }
    )
  }
}

// =============================================================================
// POST - Create new token
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    const prisma = getPrisma()
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    // Parse and validate request
    const body = await request.json()
    const validationResult = createTokenSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Ungültige Eingabe', details: validationResult.error.errors },
        { status: 400 }
      )
    }

    const { deviceName } = validationResult.data

    // Generate token and hash
    const plainToken = generateToken()
    const tokenHash = await bcrypt.hash(plainToken, 10)

    // Create token record
    const tokenRecord = await prisma.locationWebhookToken.create({
      data: {
        userId: user.id,
        tokenHash,
        deviceName,
        isActive: true,
      },
      select: {
        id: true,
        deviceName: true,
        isActive: true,
        createdAt: true,
      },
    })

    // Return token - IMPORTANT: Plain token is only shown once!
    return NextResponse.json({
      token: {
        ...tokenRecord,
        plainToken, // Only returned on creation!
      },
      message: 'Token erstellt. Achtung: Der Token wird nur einmal angezeigt!',
    })

  } catch (error) {
    console.error('Error creating token:', error)
    return NextResponse.json(
      { error: 'Fehler beim Erstellen des Tokens' },
      { status: 500 }
    )
  }
}
