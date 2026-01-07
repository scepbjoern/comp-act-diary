/**
 * On-Demand Geocoding API
 * Triggers reverse geocoding for selected GPS points.
 * Uses Mapbox Geocoding API v6 with permanent storage rights.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getPrisma } from '@/lib/prisma'
import { geocodeRequestSchema } from '@/lib/validators/location'
import { 
  reverseGeocodeSingle, 
  reverseGeocodeBatch, 
  estimateGeocodingCost 
} from '@/lib/services/mapboxService'
import { 
  updatePointWithGeocodeResult,
  matchLocationByCoords,
  assignPointToLocation,
  calculateDistance
} from '@/lib/services/locationService'

// Default settings (can be overridden by user settings)
const DEFAULT_CLUSTER_DISTANCE_METERS = 50
const DEFAULT_KNOWN_LOCATION_RADIUS_METERS = 100

interface GeocodingSettings {
  clusterDistanceMeters: number
  knownLocationRadiusMeters: number
  includePoi: boolean
}

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
// POST - Geocode selected points
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    const prisma = getPrisma()
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const userId = user.id

    // Load user's geocoding settings
    const userSettings = user.settings as Record<string, unknown> | null
    const settings: GeocodingSettings = {
      clusterDistanceMeters: (userSettings?.clusterDistanceMeters as number) ?? DEFAULT_CLUSTER_DISTANCE_METERS,
      knownLocationRadiusMeters: (userSettings?.knownLocationRadiusMeters as number) ?? DEFAULT_KNOWN_LOCATION_RADIUS_METERS,
      includePoi: (userSettings?.includePoi as boolean) ?? false,
    }

    // 1. Parse and validate request
    const body = await request.json()
    const validationResult = geocodeRequestSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Ungültige Anfrage', details: validationResult.error.errors },
        { status: 400 }
      )
    }

    const { pointIds } = validationResult.data

    // 2. Fetch points and verify ownership
    const points = await prisma.rawGpsPoint.findMany({
      where: {
        id: { in: pointIds },
        userId, // Ensure user owns these points
      },
      select: {
        id: true,
        lat: true,
        lng: true,
        geocodedAt: true,
      },
    })

    if (points.length === 0) {
      return NextResponse.json(
        { error: 'Keine gültigen Punkte gefunden' },
        { status: 404 }
      )
    }

    // 3. Filter to only ungeocoded points
    const ungeocodedPoints = points.filter((p: { geocodedAt: Date | null }) => !p.geocodedAt)

    if (ungeocodedPoints.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Alle Punkte wurden bereits geocoded',
        results: [],
        totalCost: 0,
      })
    }

    // 4. OPTIMIZATION: Match points to known locations first (saves geocoding costs)
    const results: Array<{
      pointId: string
      success: boolean
      name?: string
      address?: string
      confidence?: string
      confidenceScore?: number
      error?: string
      matchedToKnown?: boolean
      clusteredWith?: string
      lat?: number
      lng?: number
    }> = []

    const pointsNeedingGeocode: Array<{ id: string; lat: number; lng: number }> = []
    const clusteredPoints: Map<string, string[]> = new Map() // representativeId -> [otherPointIds]

    for (const point of ungeocodedPoints) {
      // 4a. Check if point is near a known location
      const knownMatch = await matchLocationByCoords(point.lat, point.lng, userId, settings.knownLocationRadiusMeters)
      
      if (knownMatch) {
        // Assign to known location without geocoding
        await assignPointToLocation(point.id, knownMatch.id)
        await prisma.rawGpsPoint.update({
          where: { id: point.id },
          data: {
            geocodedAt: new Date(),
            geocodedName: knownMatch.name,
            geocodedConfidence: 1.0, // Exact match to known location
          },
        })
        results.push({
          pointId: point.id,
          success: true,
          name: knownMatch.name,
          confidence: 'exact',
          confidenceScore: 1.0,
          matchedToKnown: true,
          lat: point.lat,
          lng: point.lng,
        })
        continue
      }

      // 4b. Check if point is very close to another point we're already geocoding (clustering)
      let foundCluster = false
      for (const existingPoint of pointsNeedingGeocode) {
        const distance = calculateDistance(point.lat, point.lng, existingPoint.lat, existingPoint.lng)
        if (distance < settings.clusterDistanceMeters) {
          // Add to cluster - will use representative's geocode result
          const clusterList = clusteredPoints.get(existingPoint.id) || []
          clusterList.push(point.id)
          clusteredPoints.set(existingPoint.id, clusterList)
          foundCluster = true
          break
        }
      }

      if (!foundCluster) {
        pointsNeedingGeocode.push({ id: point.id, lat: point.lat, lng: point.lng })
      }
    }

    // 5. Geocode only the representative points (not clustered duplicates)
    if (pointsNeedingGeocode.length > 0) {
      if (pointsNeedingGeocode.length === 1) {
        // Single point - use single API
        const point = pointsNeedingGeocode[0]
        const result = await reverseGeocodeSingle(point.lat, point.lng, { includePoi: settings.includePoi })

        if (result.success) {
          await updatePointWithGeocodeResult(point.id, result)
          
          // Apply same result to clustered points
          const clustered = clusteredPoints.get(point.id) || []
          for (const clusteredId of clustered) {
            await updatePointWithGeocodeResult(clusteredId, result)
            results.push({
              pointId: clusteredId,
              success: true,
              name: result.name,
              address: result.address,
              confidence: result.confidence,
              confidenceScore: result.confidenceScore,
              clusteredWith: point.id,
              lat: point.lat,
              lng: point.lng,
            })
          }
        }

        results.push({
          pointId: point.id,
          success: result.success,
          name: result.name,
          address: result.address,
          confidence: result.confidence,
          confidenceScore: result.confidenceScore,
          error: result.error,
          lat: point.lat,
          lng: point.lng,
        })
      } else {
        // Multiple points - use batch API
        const batchResult = await reverseGeocodeBatch(pointsNeedingGeocode)

        for (const item of batchResult.results) {
          if (item.result.success) {
            await updatePointWithGeocodeResult(item.id, item.result)
            
            // Apply same result to clustered points
            const clustered = clusteredPoints.get(item.id) || []
            for (const clusteredId of clustered) {
              await updatePointWithGeocodeResult(clusteredId, item.result)
              results.push({
                pointId: clusteredId,
                success: true,
                name: item.result.name,
                address: item.result.address,
                confidence: item.result.confidence,
                confidenceScore: item.result.confidenceScore,
                clusteredWith: item.id,
                lat: item.lat,
                lng: item.lng,
              })
            }
          }

          results.push({
            pointId: item.id,
            success: item.result.success,
            name: item.result.name,
            address: item.result.address,
            confidence: item.result.confidence,
            confidenceScore: item.result.confidenceScore,
            error: item.result.error,
            lat: item.lat,
            lng: item.lng,
          })
        }
      }
    }

    // 6. Calculate cost and statistics
    const successCount = results.filter(r => r.success).length
    const matchedToKnownCount = results.filter(r => r.matchedToKnown).length
    const clusteredCount = results.filter(r => r.clusteredWith).length
    const actualGeocodeRequests = pointsNeedingGeocode.length
    const { costFormatted } = estimateGeocodingCost(actualGeocodeRequests)

    return NextResponse.json({
      success: true,
      results,
      totalProcessed: results.length,
      totalGeocoded: successCount,
      totalFailed: results.length - successCount,
      matchedToKnownLocations: matchedToKnownCount,
      clusteredPoints: clusteredCount,
      actualGeocodeRequests, // API calls made (after optimization)
      estimatedCost: costFormatted,
    })

  } catch (error) {
    console.error('Geocoding error:', error)
    return NextResponse.json(
      { error: 'Fehler beim Geocoding' },
      { status: 500 }
    )
  }
}
