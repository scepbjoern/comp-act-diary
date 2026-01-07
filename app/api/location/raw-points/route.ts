/**
 * Raw GPS Points API
 * Query raw GPS points with filters for time range, polygon, and geocoding status.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getPrisma } from '@/lib/prisma'
import { 
  getUngeocodedPoints, 
  getPointsInTimeRange, 
  getPointsInPolygon,
  getPointsForDay 
} from '@/lib/services/locationService'
import { geoJsonPolygonSchema } from '@/lib/validators/location'

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
// GET - Query raw GPS points
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    const prisma = getPrisma()
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const userId = user.id
    const searchParams = request.nextUrl.searchParams

    // Parse query parameters
    const date = searchParams.get('date') // YYYY-MM-DD
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const ungeocodedOnly = searchParams.get('ungeocodedOnly') === 'true'
    const limit = parseInt(searchParams.get('limit') || '100', 10)
    const sortBy = searchParams.get('sortBy') // 'newest' or 'oldest'

    let points

    // Query by date (single day)
    if (date) {
      points = await getPointsForDay(userId, date)
    }
    // Query by time range
    else if (startDate && endDate) {
      points = await getPointsInTimeRange(
        userId,
        new Date(startDate),
        new Date(endDate),
        { ungeocodedOnly, limit }
      )
    }
    // Query all ungeocoded
    else if (ungeocodedOnly) {
      points = await getUngeocodedPoints(userId, { limit })
    }
    // Default: recent points
    else {
      points = await prisma.rawGpsPoint.findMany({
        where: { userId },
        select: {
          id: true,
          lat: true,
          lng: true,
          accuracy: true,
          capturedAt: true,
          geocodedAt: true,
          geocodedName: true,
          geocodedAddress: true,
          geocodedConfidence: true,
          locationId: true,
          location: {
            select: {
              id: true,
              name: true,
              poiType: true,
            },
          },
        },
        orderBy: { capturedAt: sortBy === 'oldest' ? 'asc' : 'desc' },
        take: limit,
      })
    }

    return NextResponse.json({ 
      points,
      count: points.length,
    })

  } catch (error) {
    console.error('Error fetching raw points:', error)
    return NextResponse.json(
      { error: 'Fehler beim Laden der Punkte' },
      { status: 500 }
    )
  }
}

// =============================================================================
// POST - Query points by polygon
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const userId = user.id
    const body = await request.json()

    // Validate polygon
    const polygonResult = geoJsonPolygonSchema.safeParse(body.polygon)
    if (!polygonResult.success) {
      return NextResponse.json(
        { error: 'Ungültiges Polygon', details: polygonResult.error.errors },
        { status: 400 }
      )
    }

    const ungeocodedOnly = body.ungeocodedOnly === true
    const limit = body.limit || 1000

    const points = await getPointsInPolygon(
      userId,
      polygonResult.data,
      { ungeocodedOnly, limit }
    )

    return NextResponse.json({
      points,
      count: points.length,
    })

  } catch (error) {
    console.error('Error fetching points in polygon:', error)
    return NextResponse.json(
      { error: 'Fehler beim Laden der Punkte' },
      { status: 500 }
    )
  }
}
