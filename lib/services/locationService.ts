/**
 * Location Service
 * Core logic for GPS point storage, location matching, and on-demand geocoding.
 * IMPORTANT: This service does NOT automatically geocode - that's a user decision!
 */

import { prisma } from '@/lib/core/prisma'
import { GpsSource, PoiType, Prisma } from '@prisma/client'
import type { GeoJsonPolygon } from '@/lib/validators/location'
import type { MapboxGeocodeResult } from './mapboxService'

// =============================================================================
// TYPES
// =============================================================================

export interface SaveGpsPointInput {
  userId: string
  lat: number
  lng: number
  accuracy?: number
  altitude?: number
  velocity?: number
  battery?: number
  batteryState?: number
  trackerId?: string
  topic?: string
  source: GpsSource
  rawPayload?: Prisma.InputJsonValue
  capturedAt: Date
}

export interface RawGpsPointWithLocation {
  id: string
  lat: number
  lng: number
  accuracy: number | null
  capturedAt: Date
  geocodedAt: Date | null
  geocodedName: string | null
  geocodedAddress: string | null
  geocodedConfidence: number | null
  locationId: string | null
  location: {
    id: string
    name: string
    poiType: PoiType | null
  } | null
}

// =============================================================================
// CONSTANTS
// =============================================================================

// Default radius for location matching in meters
const DEFAULT_MATCHING_RADIUS_METERS = 100

// Earth radius in kilometers (for Haversine formula)
const EARTH_RADIUS_KM = 6371

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Calculate distance between two points using Haversine formula.
 * @returns Distance in meters
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const dLat = toRadians(lat2 - lat1)
  const dLng = toRadians(lng2 - lng1)

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  // Return distance in meters
  return EARTH_RADIUS_KM * c * 1000
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180)
}

/**
 * Check if a point is inside a polygon using ray casting algorithm.
 */
export function isPointInPolygon(
  lat: number,
  lng: number,
  polygon: GeoJsonPolygon
): boolean {
  const coordinates = polygon.coordinates[0] // Outer ring
  if (!coordinates || coordinates.length < 3) return false

  let inside = false
  const n = coordinates.length

  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = coordinates[i][0] // lng
    const yi = coordinates[i][1] // lat
    const xj = coordinates[j][0]
    const yj = coordinates[j][1]

    const intersect =
      yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi

    if (intersect) inside = !inside
  }

  return inside
}

/**
 * Generate URL-friendly slug from name.
 */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[äàáâã]/g, 'a')
    .replace(/[éèêë]/g, 'e')
    .replace(/[íìîï]/g, 'i')
    .replace(/[óòôõö]/g, 'o')
    .replace(/[úùûü]/g, 'u')
    .replace(/[ß]/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50)
}

// =============================================================================
// GPS POINT FUNCTIONS
// =============================================================================

/**
 * Save a raw GPS point WITHOUT geocoding.
 * Geocoding is triggered later by user action.
 */
export async function saveRawGpsPoint(input: SaveGpsPointInput): Promise<string> {
  const point = await prisma.rawGpsPoint.create({
    data: {
      userId: input.userId,
      lat: input.lat,
      lng: input.lng,
      accuracy: input.accuracy,
      altitude: input.altitude,
      velocity: input.velocity,
      battery: input.battery,
      batteryState: input.batteryState,
      trackerId: input.trackerId,
      topic: input.topic,
      source: input.source,
      rawPayload: input.rawPayload,
      capturedAt: input.capturedAt,
      // Geocoding fields remain NULL - user must trigger geocoding
      geocodedAt: null,
      geocodedName: null,
      geocodedAddress: null,
      geocodedConfidence: null,
      mapboxPlaceId: null,
      geocodeOverridden: false,
      locationId: null,
      visitCreated: false,
    },
  })

  return point.id
}

/**
 * Get ungeocoded GPS points (geocodedAt = NULL).
 */
export async function getUngeocodedPoints(
  userId: string,
  options?: {
    date?: string // Format: YYYY-MM-DD
    limit?: number
    offset?: number
  }
): Promise<RawGpsPointWithLocation[]> {
  const where: Prisma.RawGpsPointWhereInput = {
    userId,
    geocodedAt: null,
  }

  // Filter by date if provided
  if (options?.date) {
    const startOfDay = new Date(`${options.date}T00:00:00.000Z`)
    const endOfDay = new Date(`${options.date}T23:59:59.999Z`)
    where.capturedAt = {
      gte: startOfDay,
      lte: endOfDay,
    }
  }

  return prisma.rawGpsPoint.findMany({
    where,
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
    orderBy: { capturedAt: 'desc' },
    take: options?.limit ?? 100,
    skip: options?.offset ?? 0,
  })
}

/**
 * Get count of ungeocoded points for a user.
 */
export async function getUngeocodedPointsCount(userId: string): Promise<number> {
  return prisma.rawGpsPoint.count({
    where: {
      userId,
      geocodedAt: null,
    },
  })
}

/**
 * Get points within a polygon (for batch geocoding selection).
 */
export async function getPointsInPolygon(
  userId: string,
  polygon: GeoJsonPolygon,
  options?: {
    ungeocodedOnly?: boolean
    limit?: number
  }
): Promise<RawGpsPointWithLocation[]> {
  // Get bounding box of polygon for initial filter
  const lngs = polygon.coordinates[0].map(c => c[0])
  const lats = polygon.coordinates[0].map(c => c[1])
  const minLng = Math.min(...lngs)
  const maxLng = Math.max(...lngs)
  const minLat = Math.min(...lats)
  const maxLat = Math.max(...lats)

  const where: Prisma.RawGpsPointWhereInput = {
    userId,
    lat: { gte: minLat, lte: maxLat },
    lng: { gte: minLng, lte: maxLng },
  }

  if (options?.ungeocodedOnly) {
    where.geocodedAt = null
  }

  // Fetch points within bounding box
  const points = await prisma.rawGpsPoint.findMany({
    where,
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
    orderBy: { capturedAt: 'desc' },
    take: options?.limit ?? 1000,
  })

  // Filter to only points actually inside polygon
  return points.filter(point => isPointInPolygon(point.lat, point.lng, polygon))
}

/**
 * Get points within a time range.
 */
export async function getPointsInTimeRange(
  userId: string,
  startDate: Date,
  endDate: Date,
  options?: {
    ungeocodedOnly?: boolean
    limit?: number
  }
): Promise<RawGpsPointWithLocation[]> {
  const where: Prisma.RawGpsPointWhereInput = {
    userId,
    capturedAt: {
      gte: startDate,
      lte: endDate,
    },
  }

  if (options?.ungeocodedOnly) {
    where.geocodedAt = null
  }

  return prisma.rawGpsPoint.findMany({
    where,
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
    orderBy: { capturedAt: 'desc' },
    take: options?.limit ?? 1000,
  })
}

/**
 * Get GPS points for a specific day.
 */
export async function getPointsForDay(
  userId: string,
  date: string // Format: YYYY-MM-DD
): Promise<RawGpsPointWithLocation[]> {
  const startOfDay = new Date(`${date}T00:00:00.000Z`)
  const endOfDay = new Date(`${date}T23:59:59.999Z`)

  return prisma.rawGpsPoint.findMany({
    where: {
      userId,
      capturedAt: {
        gte: startOfDay,
        lte: endOfDay,
      },
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
}

// =============================================================================
// GEOCODING RESULT FUNCTIONS
// =============================================================================

/**
 * Update a GPS point with geocoding result.
 * Called after user triggers on-demand geocoding.
 * Also creates Location and LocationVisit entries.
 */
export async function updatePointWithGeocodeResult(
  pointId: string,
  result: MapboxGeocodeResult
): Promise<{ locationId?: string; visitId?: string }> {
  // Get the point first to get userId and capturedAt
  const point = await prisma.rawGpsPoint.findUnique({
    where: { id: pointId },
  })

  if (!point) {
    throw new Error('GPS point not found')
  }

  // Update the point with geocoding data (including error if failed)
  await prisma.rawGpsPoint.update({
    where: { id: pointId },
    data: {
      geocodedAt: new Date(),
      geocodedName: result.name || null,
      geocodedAddress: result.address || null,
      geocodedConfidence: result.confidenceScore,
      mapboxPlaceId: result.mapboxPlaceId || null,
      geocodeOverridden: false,
      geocodeError: result.success ? null : (result.error || 'Unbekannter Fehler'), // Requires prisma generate
    },
  })

  // If geocoding was successful and we have a name, create Location and LocationVisit
  if (result.success && result.name) {
    try {
      // Create or find Location
      const locationId = await createOrFindLocation(
        point.userId,
        point.lat,
        point.lng,
        result.name,
        result.poiType || 'OTHER',
        result.address,
        result.city,
        result.country
      )

      // Link point to location
      await prisma.rawGpsPoint.update({
        where: { id: pointId },
        data: { locationId },
      })

      // Create LocationVisit
      const visitId = await createLocationVisitForPoint(
        point.userId,
        locationId,
        point.capturedAt
      )

      return { locationId, visitId }
    } catch (error) {
      console.error('Error creating Location/Visit:', error)
      // Don't fail the whole operation if Location/Visit creation fails
    }
  }

  return {}
}

/**
 * Create or find an existing Location at the given coordinates.
 */
async function createOrFindLocation(
  userId: string,
  lat: number,
  lng: number,
  name: string,
  poiType: PoiType,
  address?: string,
  city?: string,
  country?: string
): Promise<string> {
  // First check if there's already a location at these coordinates (within 50m)
  const existingMatch = await matchLocationByCoords(lat, lng, userId, 50)
  
  if (existingMatch) {
    return existingMatch.id
  }

  // Generate unique slug
  const baseSlug = generateSlug(name)
  let slug = baseSlug
  let counter = 1

  while (true) {
    const existing = await prisma.location.findUnique({
      where: { userId_slug: { userId, slug } },
    })
    if (!existing) break
    slug = `${baseSlug}-${counter}`
    counter++
  }

  // Create new location
  const location = await prisma.location.create({
    data: {
      userId,
      slug,
      name,
      lat,
      lng,
      address,
      city,
      country,
      poiType,
    },
  })

  return location.id
}

/**
 * Create a LocationVisit for a single point.
 */
async function createLocationVisitForPoint(
  userId: string,
  locationId: string,
  capturedAt: Date
): Promise<string | undefined> {
  const date = capturedAt.toISOString().split('T')[0]

  // Get or create TimeBox for the day
  let timeBox = await prisma.timeBox.findFirst({
    where: {
      userId,
      kind: 'DAY',
      localDate: date,
    },
  })

  if (!timeBox) {
    const startAt = new Date(`${date}T00:00:00.000Z`)
    const endAt = new Date(`${date}T23:59:59.999Z`)

    timeBox = await prisma.timeBox.create({
      data: {
        userId,
        kind: 'DAY',
        localDate: date,
        startAt,
        endAt,
        timezone: 'Europe/Zurich',
      },
    })
  }

  // Check if visit already exists for this location and day
  const existingVisit = await prisma.locationVisit.findFirst({
    where: {
      userId,
      locationId,
      timeBoxId: timeBox.id,
    },
  })

  if (existingVisit) {
    // Update times if needed
    const updateData: Prisma.LocationVisitUpdateInput = {}
    
    if (!existingVisit.arrivedAt || capturedAt < existingVisit.arrivedAt) {
      updateData.arrivedAt = capturedAt
    }
    if (!existingVisit.departedAt || capturedAt > existingVisit.departedAt) {
      updateData.departedAt = capturedAt
    }

    if (Object.keys(updateData).length > 0) {
      await prisma.locationVisit.update({
        where: { id: existingVisit.id },
        data: updateData,
      })
    }
    return existingVisit.id
  }

  // Create new visit
  const visit = await prisma.locationVisit.create({
    data: {
      userId,
      locationId,
      timeBoxId: timeBox.id,
      arrivedAt: capturedAt,
      departedAt: capturedAt, // Same as arrival for single point
    },
  })

  return visit.id
}

/**
 * Override geocoding result with user-provided data.
 */
export async function overrideGeocodeResult(
  pointId: string,
  name: string,
  address?: string
): Promise<void> {
  await prisma.rawGpsPoint.update({
    where: { id: pointId },
    data: {
      geocodedName: name,
      geocodedAddress: address,
      geocodeOverridden: true,
    },
  })
}

// =============================================================================
// LOCATION MATCHING
// =============================================================================

/**
 * Match coordinates to a known location.
 * @returns The matched location or null if no match within radius
 */
export async function matchLocationByCoords(
  lat: number,
  lng: number,
  userId: string,
  radiusMeters: number = DEFAULT_MATCHING_RADIUS_METERS
): Promise<{ id: string; name: string; distance: number } | null> {
  // Get all user locations with coordinates
  const locations = await prisma.location.findMany({
    where: {
      userId,
      lat: { not: null },
      lng: { not: null },
    },
    select: {
      id: true,
      name: true,
      lat: true,
      lng: true,
    },
  })

  let closestLocation: { id: string; name: string; distance: number } | null = null

  for (const location of locations) {
    if (location.lat === null || location.lng === null) continue

    const distance = calculateDistance(lat, lng, location.lat, location.lng)

    if (distance <= radiusMeters) {
      if (!closestLocation || distance < closestLocation.distance) {
        closestLocation = {
          id: location.id,
          name: location.name,
          distance,
        }
      }
    }
  }

  return closestLocation
}

/**
 * Assign a GPS point to an existing location.
 */
export async function assignPointToLocation(
  pointId: string,
  locationId: string
): Promise<void> {
  await prisma.rawGpsPoint.update({
    where: { id: pointId },
    data: { locationId },
  })
}

/**
 * Assign multiple GPS points to an existing location.
 */
export async function assignPointsToLocation(
  pointIds: string[],
  locationId: string
): Promise<void> {
  await prisma.rawGpsPoint.updateMany({
    where: { id: { in: pointIds } },
    data: { locationId },
  })
}

// =============================================================================
// LOCATION CREATION
// =============================================================================

/**
 * Create a new Location from a geocoded GPS point.
 */
export async function createLocationFromPoint(
  userId: string,
  pointId: string,
  name: string,
  poiType?: PoiType,
  address?: string
): Promise<string> {
  // Get the point
  const point = await prisma.rawGpsPoint.findUnique({
    where: { id: pointId },
  })

  if (!point) {
    throw new Error('GPS point not found')
  }

  // Generate unique slug
  const baseSlug = generateSlug(name)
  let slug = baseSlug
  let counter = 1

  while (true) {
    const existing = await prisma.location.findUnique({
      where: { userId_slug: { userId, slug } },
    })
    if (!existing) break
    slug = `${baseSlug}-${counter}`
    counter++
  }

  // Create location
  const location = await prisma.location.create({
    data: {
      userId,
      slug,
      name,
      lat: point.lat,
      lng: point.lng,
      address: address || point.geocodedAddress,
      poiType: poiType || 'OTHER',
    },
  })

  // Link point to location
  await prisma.rawGpsPoint.update({
    where: { id: pointId },
    data: { locationId: location.id },
  })

  return location.id
}

// =============================================================================
// LOCATION VISIT CREATION
// =============================================================================

/**
 * Create LocationVisit entries from GPS points.
 * Groups consecutive points at the same location into visits.
 */
export async function createVisitsFromPoints(
  userId: string,
  pointIds: string[]
): Promise<number> {
  // Get points with their locations
  const points = await prisma.rawGpsPoint.findMany({
    where: {
      id: { in: pointIds },
      locationId: { not: null },
      visitCreated: false,
    },
    orderBy: { capturedAt: 'asc' },
  })

  if (points.length === 0) return 0

  let visitsCreated = 0

  // Group points by location and day
  const groups = new Map<string, typeof points>()

  for (const point of points) {
    const date = point.capturedAt.toISOString().split('T')[0]
    const key = `${point.locationId}-${date}`

    if (!groups.has(key)) {
      groups.set(key, [])
    }
    groups.get(key)!.push(point)
  }

  // Create visits for each group
  for (const [_key, groupPoints] of groups) {
    const locationId = groupPoints[0].locationId!
    const date = groupPoints[0].capturedAt.toISOString().split('T')[0]

    // Get or create TimeBox for the day
    let timeBox = await prisma.timeBox.findFirst({
      where: {
        userId,
        kind: 'DAY',
        localDate: date,
      },
    })

    if (!timeBox) {
      const startAt = new Date(`${date}T00:00:00.000Z`)
      const endAt = new Date(`${date}T23:59:59.999Z`)

      timeBox = await prisma.timeBox.create({
        data: {
          userId,
          kind: 'DAY',
          localDate: date,
          startAt,
          endAt,
          timezone: 'Europe/Zurich',
        },
      })
    }

    // Calculate arrival and departure times
    const arrivedAt = groupPoints[0].capturedAt
    const departedAt = groupPoints[groupPoints.length - 1].capturedAt

    // Check if visit already exists
    const existingVisit = await prisma.locationVisit.findFirst({
      where: {
        userId,
        locationId,
        timeBoxId: timeBox.id,
      },
    })

    if (!existingVisit) {
      // Create new visit
      await prisma.locationVisit.create({
        data: {
          userId,
          locationId,
          timeBoxId: timeBox.id,
          arrivedAt,
          departedAt,
        },
      })
      visitsCreated++
    } else {
      // Update existing visit with new times if needed
      const updateData: Prisma.LocationVisitUpdateInput = {}

      if (!existingVisit.arrivedAt || arrivedAt < existingVisit.arrivedAt) {
        updateData.arrivedAt = arrivedAt
      }
      if (!existingVisit.departedAt || departedAt > existingVisit.departedAt) {
        updateData.departedAt = departedAt
      }

      if (Object.keys(updateData).length > 0) {
        await prisma.locationVisit.update({
          where: { id: existingVisit.id },
          data: updateData,
        })
      }
    }

    // Mark points as processed
    await prisma.rawGpsPoint.updateMany({
      where: { id: { in: groupPoints.map(p => p.id) } },
      data: { visitCreated: true },
    })
  }

  return visitsCreated
}
