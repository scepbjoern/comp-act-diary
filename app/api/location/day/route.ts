/**
 * Day Location API
 * Get all location data for a specific day: visits (known locations) + raw GPS points.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getPrisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function getCurrentUser(req: NextRequest) {
  const prisma = getPrisma()
  const cookieUserId = req.cookies.get('userId')?.value
  let user = cookieUserId ? await prisma.user.findUnique({ where: { id: cookieUserId } }) : null
  if (!user) user = await prisma.user.findUnique({ where: { username: 'demo' } })
  return user
}

export async function GET(request: NextRequest) {
  try {
    const prisma = getPrisma()
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const date = searchParams.get('date') // YYYY-MM-DD

    if (!date) {
      return NextResponse.json({ error: 'Datum erforderlich (date=YYYY-MM-DD)' }, { status: 400 })
    }

    // Parse date range for the day
    const dayStart = new Date(`${date}T00:00:00.000Z`)
    const dayEnd = new Date(`${date}T23:59:59.999Z`)

    // 1. Get LocationVisits for the day
    const visits = await prisma.locationVisit.findMany({
      where: {
        userId: user.id,
        OR: [
          { arrivedAt: { gte: dayStart, lte: dayEnd } },
          { departedAt: { gte: dayStart, lte: dayEnd } },
        ],
      },
      include: {
        location: {
          select: {
            id: true,
            name: true,
            lat: true,
            lng: true,
            address: true,
            poiType: true,
          },
        },
      },
      orderBy: { arrivedAt: 'asc' },
    })

    // 2. Get raw GPS points for the day
    const rawPoints = await prisma.rawGpsPoint.findMany({
      where: {
        userId: user.id,
        capturedAt: { gte: dayStart, lte: dayEnd },
      },
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
      orderBy: { capturedAt: 'asc' },
    })

    // Separate geocoded and ungeocoded points
    const geocodedPoints = rawPoints.filter(p => p.geocodedAt !== null)
    const ungeocodedPoints = rawPoints.filter(p => p.geocodedAt === null)

    return NextResponse.json({
      date,
      visits: visits.map(v => ({
        id: v.id,
        arrivedAt: v.arrivedAt,
        departedAt: v.departedAt,
        location: v.location,
      })),
      geocodedPoints,
      ungeocodedPoints,
      stats: {
        totalPoints: rawPoints.length,
        geocodedCount: geocodedPoints.length,
        ungeocodedCount: ungeocodedPoints.length,
        visitCount: visits.length,
      },
    })

  } catch (error) {
    console.error('Error fetching day location data:', error)
    return NextResponse.json(
      { error: 'Fehler beim Laden der Standortdaten' },
      { status: 500 }
    )
  }
}
