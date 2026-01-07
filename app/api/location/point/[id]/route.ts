/**
 * API route for managing individual GPS points.
 * Supports updating point position, manual naming, and fetching nearby POIs.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getPrisma } from '@/lib/prisma'
import { reverseGeocodeSingle } from '@/lib/services/mapboxService'

// Get current user from cookie
async function getCurrentUser(req: NextRequest) {
  const prisma = getPrisma()
  const cookieUserId = req.cookies.get('userId')?.value
  let user = cookieUserId ? await prisma.user.findUnique({ where: { id: cookieUserId } }) : null
  if (!user) user = await prisma.user.findUnique({ where: { username: 'demo' } })
  return user
}

// =============================================================================
// GET - Fetch point details with nearby POIs
// =============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const prisma = getPrisma()
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    const { id } = await params
    const { searchParams } = new URL(request.url)
    const includeNearby = searchParams.get('includeNearby') === 'true'

    // Fetch point
    const point = await prisma.rawGpsPoint.findFirst({
      where: {
        id,
        userId: user.id,
      },
      include: {
        location: true,
      },
    })

    if (!point) {
      return NextResponse.json({ error: 'Punkt nicht gefunden' }, { status: 404 })
    }

    let nearbyPois: Array<{ name: string; address: string; distance: number; lat: number; lng: number }> = []

    // Fetch nearby POIs if requested
    if (includeNearby) {
      try {
        // Search in a grid around the point for nearby addresses
        const offsets = [
          { lat: 0.0002, lng: 0 },      // ~20m north
          { lat: -0.0002, lng: 0 },     // ~20m south
          { lat: 0, lng: 0.0003 },      // ~20m east
          { lat: 0, lng: -0.0003 },     // ~20m west
          { lat: 0.0002, lng: 0.0002 }, // NE
          { lat: -0.0002, lng: 0.0002 }, // SE
          { lat: 0.0002, lng: -0.0002 }, // NW
          { lat: -0.0002, lng: -0.0002 }, // SW
        ]

        const nearbyResults = await Promise.all(
          offsets.map(async (offset) => {
            const result = await reverseGeocodeSingle(
              point.lat + offset.lat,
              point.lng + offset.lng
            )
            if (result.success && result.name) {
              const distance = Math.round(
                Math.sqrt(Math.pow(offset.lat * 111000, 2) + Math.pow(offset.lng * 111000 * Math.cos(point.lat * Math.PI / 180), 2))
              )
              return {
                name: result.name,
                address: result.address || '',
                distance,
                lat: point.lat + offset.lat,
                lng: point.lng + offset.lng,
              }
            }
            return null
          })
        )

        // Filter and dedupe by name
        const seen = new Set<string>()
        nearbyPois = nearbyResults
          .filter((r): r is NonNullable<typeof r> => r !== null && !seen.has(r.name) && (seen.add(r.name), true))
          .sort((a, b) => a.distance - b.distance)
          .slice(0, 5)
      } catch (err) {
        console.error('Failed to fetch nearby POIs:', err)
      }
    }

    return NextResponse.json({
      point: {
        id: point.id,
        lat: point.lat,
        lng: point.lng,
        capturedAt: point.capturedAt,
        geocodedAt: point.geocodedAt,
        geocodedName: point.geocodedName,
        geocodedAddress: point.geocodedAddress,
        geocodedConfidence: point.geocodedConfidence,
        geocodeError: (point as Record<string, unknown>).geocodeError as string | null,
        geocodeOverridden: point.geocodeOverridden,
        location: point.location,
      },
      nearbyPois,
    })
  } catch (error) {
    console.error('Error fetching point:', error)
    return NextResponse.json({ error: 'Fehler beim Laden' }, { status: 500 })
  }
}

// =============================================================================
// PATCH - Update point (move, manual name, retry geocode)
// =============================================================================

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const prisma = getPrisma()
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { action, lat, lng, name, address } = body

    // Verify ownership
    const point = await prisma.rawGpsPoint.findFirst({
      where: {
        id,
        userId: user.id,
      },
    })

    if (!point) {
      return NextResponse.json({ error: 'Punkt nicht gefunden' }, { status: 404 })
    }

    switch (action) {
      case 'move': {
        // Move point to new coordinates and re-geocode
        if (typeof lat !== 'number' || typeof lng !== 'number') {
          return NextResponse.json({ error: 'Koordinaten fehlen' }, { status: 400 })
        }

        // Update coordinates
        await prisma.rawGpsPoint.update({
          where: { id },
          data: {
            lat,
            lng,
            geocodedAt: null,
            geocodedName: null,
            geocodedAddress: null,
            geocodedConfidence: null,
            geocodeError: null, // Requires prisma generate after schema change
            geocodeOverridden: false,
          },
        })

        // Re-geocode at new position
        const result = await reverseGeocodeSingle(lat, lng)

        await prisma.rawGpsPoint.update({
          where: { id },
          data: {
            geocodedAt: new Date(),
            geocodedName: result.name || null,
            geocodedAddress: result.address || null,
            geocodedConfidence: result.confidenceScore,
            geocodeError: result.success ? null : (result.error || 'Unbekannter Fehler'), // Requires prisma generate
          },
        })

        return NextResponse.json({
          success: true,
          result: {
            lat,
            lng,
            name: result.name,
            address: result.address,
            confidence: result.confidence,
            error: result.error,
          },
        })
      }

      case 'rename': {
        // Manually set name and address
        if (!name) {
          return NextResponse.json({ error: 'Name fehlt' }, { status: 400 })
        }

        await prisma.rawGpsPoint.update({
          where: { id },
          data: {
            geocodedAt: new Date(),
            geocodedName: name,
            geocodedAddress: address || null,
            geocodedConfidence: 1.0, // Manual = full confidence
            geocodeError: null, // Requires prisma generate after schema change
            geocodeOverridden: true,
          },
        })

        return NextResponse.json({
          success: true,
          result: {
            name,
            address,
            confidence: 'exact',
            overridden: true,
          },
        })
      }

      case 'retry': {
        // Retry geocoding at current position
        const result = await reverseGeocodeSingle(point.lat, point.lng)

        await prisma.rawGpsPoint.update({
          where: { id },
          data: {
            geocodedAt: new Date(),
            geocodedName: result.name || null,
            geocodedAddress: result.address || null,
            geocodedConfidence: result.confidenceScore,
            geocodeError: result.success ? null : (result.error || 'Unbekannter Fehler'), // Requires prisma generate
            geocodeOverridden: false,
          },
        })

        return NextResponse.json({
          success: result.success,
          result: {
            name: result.name,
            address: result.address,
            confidence: result.confidence,
            error: result.error,
          },
        })
      }

      default:
        return NextResponse.json({ error: 'Ungültige Aktion' }, { status: 400 })
    }
  } catch (error) {
    console.error('Error updating point:', error)
    return NextResponse.json({ error: 'Fehler beim Aktualisieren' }, { status: 500 })
  }
}
