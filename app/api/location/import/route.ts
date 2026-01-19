/**
 * Google Timeline Import API
 * Imports GPS data from Google Timeline JSON export.
 * IMPORTANT: Does NOT trigger geocoding - just stores RawGpsPoints.
 * Supports incremental import via lastImportedDataAt.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getPrisma } from '@/lib/core/prisma'
import { saveRawGpsPoint, matchLocationByCoords } from '@/lib/services/locationService'
import { 
  parseGoogleTimelineJson, 
  filterVisitsSince, 
  filterInvalidVisits,
  getTimelineStats 
} from '@/lib/services/timelineParser'

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
// POST - Import Google Timeline JSON
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    const prisma = getPrisma()
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const userId = user.id

    // 1. Parse request body (expects JSON file content)
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'Ungültiges JSON-Format' },
        { status: 400 }
      )
    }

    // 2. Parse Google Timeline JSON
    let parsedTimeline
    try {
      parsedTimeline = parseGoogleTimelineJson(body)
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Parsing-Fehler' },
        { status: 400 }
      )
    }

    // 3. Get or create SyncProvider for Google Timeline
    let syncProvider = await prisma.syncProvider.findFirst({
      where: {
        userId,
        provider: 'GOOGLE_TIMELINE',
      },
    })

    if (!syncProvider) {
      syncProvider = await prisma.syncProvider.create({
        data: {
          userId,
          provider: 'GOOGLE_TIMELINE',
          isActive: true,
        },
      })
    }

    // 4. Filter for incremental import
    const { newVisits, skippedCount, latestTimestamp } = filterVisitsSince(
      parsedTimeline.visits,
      syncProvider.lastImportedDataAt
    )

    // 5. Filter invalid coordinates
    const { valid: validVisits, invalid: invalidCount } = filterInvalidVisits(newVisits)

    // 6. Process each visit (NO GEOCODING!)
    let matchedCount = 0
    let ungeocodedCount = 0

    for (const visit of validVisits) {
      // Check if we already have a point at this exact time
      const existingPoint = await prisma.rawGpsPoint.findFirst({
        where: {
          userId,
          capturedAt: visit.startTime,
          lat: visit.lat,
          lng: visit.lng,
        },
      })

      if (existingPoint) {
        continue // Skip duplicate
      }

      // Check for matching known location
      const matchedLocation = await matchLocationByCoords(
        visit.lat,
        visit.lng,
        userId
      )

      // Save raw GPS point (NO GEOCODING!)
      const pointId = await saveRawGpsPoint({
        userId,
        lat: visit.lat,
        lng: visit.lng,
        source: 'GOOGLE_IMPORT',
        capturedAt: visit.startTime,
        rawPayload: {
          endTime: visit.endTime.toISOString(),
          placeId: visit.placeId,
          semanticType: visit.semanticType,
        },
      })

      // If matched to known location, assign it
      if (matchedLocation) {
        await prisma.rawGpsPoint.update({
          where: { id: pointId },
          data: { locationId: matchedLocation.id },
        })
        matchedCount++
      } else {
        ungeocodedCount++
      }
    }

    // 7. Update SyncProvider with latest timestamp
    if (latestTimestamp) {
      await prisma.syncProvider.update({
        where: { id: syncProvider.id },
        data: {
          lastImportedDataAt: latestTimestamp,
          lastSyncAt: new Date(),
        },
      })
    }

    // 8. Get stats for response
    const stats = getTimelineStats(parsedTimeline)

    return NextResponse.json({
      success: true,
      total: parsedTimeline.visits.length,
      new: validVisits.length,
      matched: matchedCount,
      ungeocoded: ungeocodedCount,
      skipped: skippedCount,
      invalid: invalidCount,
      lastImportedDataAt: latestTimestamp?.toISOString(),
      stats: {
        dateRange: stats.dateRange,
        uniqueDays: stats.uniqueDays,
      },
    })

  } catch (error) {
    console.error('Timeline import error:', error)
    return NextResponse.json(
      { error: 'Fehler beim Import' },
      { status: 500 }
    )
  }
}
