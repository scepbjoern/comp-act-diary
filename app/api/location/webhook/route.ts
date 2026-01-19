/**
 * OwnTracks Webhook API Route
 * Receives location updates from OwnTracks app.
 * IMPORTANT: Does NOT trigger geocoding - just stores RawGpsPoint.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getPrisma } from '@/lib/core/prisma'
import { owntracksPayloadSchema, normalizeOwnTracksPayload } from '@/lib/validators/location'
import { saveRawGpsPoint, matchLocationByCoords } from '@/lib/services/locationService'
import bcrypt from 'bcryptjs'

// =============================================================================
// TOKEN VALIDATION
// =============================================================================

/**
 * Validate webhook authentication from Authorization header.
 * Supports both:
 * - HTTP Basic Auth: "Basic base64(username:password)" (OwnTracks standard)
 * - Bearer Token: "Bearer <token>" (legacy/alternative)
 * 
 * OwnTracks uses HTTP Basic Auth where:
 * - username = device name or user identifier
 * - password = the token created in the app
 */
async function validateAuth(authHeader: string | null): Promise<string | null> {
  if (!authHeader) return null

  const prisma = getPrisma()

  // Try HTTP Basic Auth first (OwnTracks standard)
  const basicMatch = authHeader.match(/^Basic\s+(.+)$/i)
  if (basicMatch) {
    try {
      const decoded = Buffer.from(basicMatch[1], 'base64').toString('utf-8')
      const [_username, password] = decoded.split(':')
      
      if (password) {
        // Find matching token by checking password against hash
        const activeTokens = await prisma.locationWebhookToken.findMany({
          where: { isActive: true },
          select: { id: true, userId: true, tokenHash: true },
        })

        for (const tokenRecord of activeTokens) {
          const isValid = await bcrypt.compare(password, tokenRecord.tokenHash)
          if (isValid) {
            await prisma.locationWebhookToken.update({
              where: { id: tokenRecord.id },
              data: { lastUsedAt: new Date() },
            })
            return tokenRecord.userId
          }
        }
      }
    } catch {
      // Invalid base64, continue to try Bearer
    }
  }

  // Fallback: Bearer Token (legacy support)
  const bearerMatch = authHeader.match(/^Bearer\s+(.+)$/i)
  if (bearerMatch) {
    const token = bearerMatch[1]

    const activeTokens = await prisma.locationWebhookToken.findMany({
      where: { isActive: true },
      select: { id: true, userId: true, tokenHash: true },
    })

    for (const tokenRecord of activeTokens) {
      const isValid = await bcrypt.compare(token, tokenRecord.tokenHash)
      if (isValid) {
        await prisma.locationWebhookToken.update({
          where: { id: tokenRecord.id },
          data: { lastUsedAt: new Date() },
        })
        return tokenRecord.userId
      }
    }
  }

  return null
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// =============================================================================
// POST HANDLER
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    // 1. Validate authentication
    const authHeader = request.headers.get('Authorization')
    const userId = await validateAuth(authHeader)

    if (!userId) {
      console.warn('Location webhook: Invalid or missing token')
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // 2. Parse request body
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON' },
        { status: 400 }
      )
    }

    // 3. Validate OwnTracks payload
    const validationResult = owntracksPayloadSchema.safeParse(body)
    
    if (!validationResult.success) {
      console.warn('Location webhook: Invalid payload', validationResult.error.errors)
      // OwnTracks expects empty array for non-location messages
      // Return success to avoid retry loops
      return NextResponse.json([])
    }

    const payload = validationResult.data

    // 4. Normalize to internal format
    const gpsPoint = normalizeOwnTracksPayload(payload)

    // 5. Check for matching known location (without geocoding!)
    const matchedLocation = await matchLocationByCoords(
      gpsPoint.lat,
      gpsPoint.lng,
      userId
    )

    // 6. Save raw GPS point (NO GEOCODING!)
    const pointId = await saveRawGpsPoint({
      userId,
      lat: gpsPoint.lat,
      lng: gpsPoint.lng,
      accuracy: gpsPoint.accuracy,
      altitude: gpsPoint.altitude,
      velocity: gpsPoint.velocity,
      battery: gpsPoint.battery,
      batteryState: gpsPoint.batteryState,
      trackerId: gpsPoint.trackerId,
      topic: gpsPoint.topic,
      source: 'OWNTRACKS',
      rawPayload: payload,
      capturedAt: gpsPoint.capturedAt,
    })

    // 7. If matched to known location, assign it
    const prisma = getPrisma()
    if (matchedLocation) {
      await prisma.rawGpsPoint.update({
        where: { id: pointId },
        data: { locationId: matchedLocation.id },
      })
    }

    // OwnTracks expects empty array as success response
    // Can also send commands like: [{ _type: "cmd", action: "reportLocation" }]
    return NextResponse.json([])

  } catch (error) {
    console.error('Location webhook error:', error)
    // Return empty array to prevent OwnTracks retry loops
    return NextResponse.json([])
  }
}

// =============================================================================
// OPTIONS HANDLER (CORS)
// =============================================================================

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    },
  })
}
