/**
 * Geocode Confirm API
 * Confirms, overrides, or assigns geocoding results to locations.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getPrisma } from '@/lib/core/prisma'
import { confirmGeocodeSchema } from '@/lib/validators/location'
import { 
  overrideGeocodeResult, 
  assignPointToLocation, 
  createLocationFromPoint,
  createVisitsFromPoints 
} from '@/lib/services/locationService'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function getCurrentUser(req: NextRequest) {
  const prisma = getPrisma()
  const cookieUserId = req.cookies.get('userId')?.value
  let user = cookieUserId ? await prisma.user.findUnique({ where: { id: cookieUserId } }) : null
  if (!user) user = await prisma.user.findUnique({ where: { username: 'demo' } })
  return user
}

// =============================================================================
// POST - Confirm/Override/Assign geocoding result
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    const prisma = getPrisma()
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const userId = user.id

    // 1. Parse and validate request
    const body = await request.json()
    const validationResult = confirmGeocodeSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Ungültige Anfrage', details: validationResult.error.errors },
        { status: 400 }
      )
    }

    const { pointId, action, name, address, poiType, existingLocationId, createNewLocation } = validationResult.data

    // 2. Verify point exists and belongs to user
    const point = await prisma.rawGpsPoint.findFirst({
      where: {
        id: pointId,
        userId,
      },
    })

    if (!point) {
      return NextResponse.json(
        { error: 'Punkt nicht gefunden' },
        { status: 404 }
      )
    }

    // 3. Handle action
    let locationId: string | null = null

    switch (action) {
      case 'confirm':
        // Create new location from geocoded data
        if (createNewLocation && point.geocodedName) {
          locationId = await createLocationFromPoint(
            userId,
            pointId,
            name || point.geocodedName,
            poiType,
            address || point.geocodedAddress || undefined
          )
        }
        break

      case 'override':
        // Override geocoding result with user-provided data
        if (!name) {
          return NextResponse.json(
            { error: 'Name ist erforderlich für Override' },
            { status: 400 }
          )
        }
        await overrideGeocodeResult(pointId, name, address)
        
        // Also create location if requested
        if (createNewLocation) {
          locationId = await createLocationFromPoint(
            userId,
            pointId,
            name,
            poiType,
            address
          )
        }
        break

      case 'assign':
        // Assign to existing location
        if (!existingLocationId) {
          return NextResponse.json(
            { error: 'existingLocationId ist erforderlich für Assign' },
            { status: 400 }
          )
        }

        // Verify location exists and belongs to user
        const location = await prisma.location.findFirst({
          where: {
            id: existingLocationId,
            userId,
          },
        })

        if (!location) {
          return NextResponse.json(
            { error: 'Location nicht gefunden' },
            { status: 404 }
          )
        }

        await assignPointToLocation(pointId, existingLocationId)
        locationId = existingLocationId
        break

      default:
        return NextResponse.json(
          { error: 'Ungültige Aktion' },
          { status: 400 }
        )
    }

    // 4. Create LocationVisit if location was assigned
    let visitsCreated = 0
    if (locationId) {
      visitsCreated = await createVisitsFromPoints(userId, [pointId])
    }

    return NextResponse.json({
      success: true,
      locationId,
      visitsCreated,
    })

  } catch (error) {
    console.error('Confirm geocode error:', error)
    return NextResponse.json(
      { error: 'Fehler beim Bestätigen' },
      { status: 500 }
    )
  }
}
