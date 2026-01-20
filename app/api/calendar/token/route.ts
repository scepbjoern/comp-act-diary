/**
 * Calendar Webhook Token Management API
 * CRUD operations for TASKER_CALENDAR authentication tokens.
 * Uses generic WebhookToken with providerType=TASKER_CALENDAR.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getPrisma } from '@/lib/core/prisma'
import { createTokenSchema } from '@/lib/validators/location'
import { createWebhookToken, listWebhookTokens } from '@/lib/services/webhookTokenService'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

async function getCurrentUser(req: NextRequest) {
  const prisma = getPrisma()
  const cookieUserId = req.cookies.get('userId')?.value
  let user = cookieUserId ? await prisma.user.findUnique({ where: { id: cookieUserId } }) : null
  if (!user) user = await prisma.user.findUnique({ where: { username: 'demo' } })
  return user
}

// =============================================================================
// GET - List all TASKER_CALENDAR tokens for user
// =============================================================================

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req)
    if (!user) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const tokens = await listWebhookTokens(user.id, 'TASKER_CALENDAR')
    return NextResponse.json({ tokens })

  } catch (error) {
    console.error('Error fetching calendar tokens:', error)
    return NextResponse.json(
      { error: 'Fehler beim Laden der Tokens' },
      { status: 500 }
    )
  }
}

// =============================================================================
// POST - Create new TASKER_CALENDAR token
// =============================================================================

export async function POST(request: NextRequest) {
  try {
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

    // Create token using generic service with TASKER_CALENDAR provider
    const result = await createWebhookToken(user.id, deviceName, 'TASKER_CALENDAR')

    // Return token - IMPORTANT: Plain token is only shown once!
    return NextResponse.json({
      token: {
        ...result.token,
        plainToken: result.plainToken, // Only returned on creation!
      },
      message: 'Token erstellt. Achtung: Der Token wird nur einmal angezeigt!',
    })

  } catch (error) {
    console.error('Error creating calendar token:', error)
    return NextResponse.json(
      { error: 'Fehler beim Erstellen des Tokens' },
      { status: 500 }
    )
  }
}
