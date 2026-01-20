/**
 * OwnTracks Webhook API Route
 * Receives location updates from OwnTracks app.
 * IMPORTANT: Does NOT trigger geocoding - just stores RawGpsPoint.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getPrisma } from '@/lib/core/prisma'
import { owntracksPayloadSchema, normalizeOwnTracksPayload } from '@/lib/validators/location'
import { saveRawGpsPoint, matchLocationByCoords } from '@/lib/services/locationService'
import { validateWebhookToken } from '@/lib/services/webhookTokenService'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// =============================================================================
// POST HANDLER
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    // 1. Validate authentication (using generic WebhookToken with OWNTRACKS provider)
    const authHeader = request.headers.get('Authorization')
    const userId = await validateWebhookToken(authHeader, 'OWNTRACKS')

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
