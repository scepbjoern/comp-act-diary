/**
 * Geocode Cost Estimation API
 * Estimates actual geocoding costs considering clustering and known locations.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getPrisma } from '@/lib/core/prisma'
import { matchLocationByCoords, calculateDistance } from '@/lib/services/locationService'
import { estimateGeocodingCost } from '@/lib/services/mapboxService'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function getCurrentUser(req: NextRequest) {
  const prisma = getPrisma()
  const cookieUserId = req.cookies.get('userId')?.value
  let user = cookieUserId ? await prisma.user.findUnique({ where: { id: cookieUserId } }) : null
  if (!user) user = await prisma.user.findUnique({ where: { username: 'demo' } })
  return user
}

interface GeocodingSettings {
  clusterDistanceMeters: number
  knownLocationRadiusMeters: number
}

export async function POST(request: NextRequest) {
  try {
    const prisma = getPrisma()
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const body = await request.json()
    const pointIds: string[] = body.pointIds || []

    if (pointIds.length === 0) {
      return NextResponse.json({
        totalPoints: 0,
        matchedToKnown: 0,
        clustered: 0,
        actualApiCalls: 0,
        estimatedCost: '$0.00',
        savings: '$0.00',
      })
    }

    // Load user settings
    const userSettings = user.settings as Record<string, unknown> | null
    const settings: GeocodingSettings = {
      clusterDistanceMeters: (userSettings?.clusterDistanceMeters as number) ?? 50,
      knownLocationRadiusMeters: (userSettings?.knownLocationRadiusMeters as number) ?? 100,
    }

    // Fetch the points
    const points = await prisma.rawGpsPoint.findMany({
      where: {
        id: { in: pointIds },
        userId: user.id,
        geocodedAt: null, // Only ungeocoded
      },
      select: {
        id: true,
        lat: true,
        lng: true,
      },
    })

    if (points.length === 0) {
      return NextResponse.json({
        totalPoints: pointIds.length,
        alreadyGeocoded: pointIds.length,
        matchedToKnown: 0,
        clustered: 0,
        actualApiCalls: 0,
        estimatedCost: '$0.00',
        savings: '$0.00',
      })
    }

    // Simulate optimization logic
    let matchedToKnown = 0
    let clustered = 0
    const pointsNeedingGeocode: Array<{ id: string; lat: number; lng: number }> = []

    for (const point of points) {
      // Check if near known location
      const knownMatch = await matchLocationByCoords(
        point.lat, 
        point.lng, 
        user.id, 
        settings.knownLocationRadiusMeters
      )
      
      if (knownMatch) {
        matchedToKnown++
        continue
      }

      // Check clustering
      let foundCluster = false
      for (const existingPoint of pointsNeedingGeocode) {
        const distance = calculateDistance(point.lat, point.lng, existingPoint.lat, existingPoint.lng)
        if (distance < settings.clusterDistanceMeters) {
          clustered++
          foundCluster = true
          break
        }
      }

      if (!foundCluster) {
        pointsNeedingGeocode.push({ id: point.id, lat: point.lat, lng: point.lng })
      }
    }

    const actualApiCalls = pointsNeedingGeocode.length
    const { costFormatted } = estimateGeocodingCost(actualApiCalls)
    const { costFormatted: fullCost } = estimateGeocodingCost(points.length)
    
    // Calculate savings
    const savedCalls = points.length - actualApiCalls
    const { costFormatted: savings } = estimateGeocodingCost(savedCalls)

    return NextResponse.json({
      totalPoints: pointIds.length,
      ungeocodedPoints: points.length,
      alreadyGeocoded: pointIds.length - points.length,
      matchedToKnown,
      clustered,
      actualApiCalls,
      estimatedCost: costFormatted,
      fullCost,
      savings,
      settings: {
        clusterDistanceMeters: settings.clusterDistanceMeters,
        knownLocationRadiusMeters: settings.knownLocationRadiusMeters,
      },
    })

  } catch (error) {
    console.error('Error estimating geocode cost:', error)
    return NextResponse.json(
      { error: 'Fehler bei der Kostenschätzung' },
      { status: 500 }
    )
  }
}
