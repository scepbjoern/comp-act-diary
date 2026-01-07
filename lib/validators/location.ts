/**
 * Location Tracking Validators
 * Zod schemas for OwnTracks, Google Timeline, and On-Demand Geocoding.
 */

import { z } from 'zod'

// =============================================================================
// OWNTRACKS PAYLOAD
// =============================================================================

/**
 * OwnTracks location payload schema.
 * @see https://owntracks.org/booklet/tech/json/
 */
export const owntracksPayloadSchema = z.object({
  _type: z.literal('location'),
  // Coordinates (required)
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  // Timestamp (Unix seconds)
  tst: z.number().int().positive(),
  // Accuracy in meters (optional)
  acc: z.number().optional(),
  // Altitude in meters (optional)
  alt: z.number().optional(),
  // Battery percentage 0-100 (optional)
  batt: z.number().min(0).max(100).optional(),
  // Battery status: 0=unknown, 1=unplugged, 2=charging, 3=full (optional)
  bs: z.number().min(0).max(3).optional(),
  // Velocity in km/h (optional)
  vel: z.number().optional(),
  // Tracker ID - 2 character identifier (optional)
  tid: z.string().max(2).optional(),
  // MQTT topic (optional, used in HTTP mode)
  topic: z.string().optional(),
  // Connection type: w=wifi, o=offline, m=mobile (optional)
  conn: z.string().optional(),
  // Regions the device is currently in (optional)
  inregions: z.array(z.string()).optional(),
  // Trigger type: p=ping, c=circular, b=beacon, r=response, u=manual, t=timer, v=monitoring (optional)
  t: z.string().optional(),
  // Course over ground in degrees (optional)
  cog: z.number().optional(),
  // Vertical accuracy in meters (optional)
  vac: z.number().optional(),
  // BSSID of connected WiFi (optional)
  BSSID: z.string().optional(),
  // SSID of connected WiFi (optional)
  SSID: z.string().optional(),
  // Created timestamp (optional)
  created_at: z.number().optional(),
})

export type OwnTracksPayload = z.infer<typeof owntracksPayloadSchema>

// =============================================================================
// INTERNAL GPS POINT FORMAT
// =============================================================================

/**
 * Internal GPS point format used throughout the application.
 */
export const gpsPointSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  accuracy: z.number().optional(),
  altitude: z.number().optional(),
  velocity: z.number().optional(),
  battery: z.number().min(0).max(100).optional(),
  batteryState: z.number().min(0).max(3).optional(),
  trackerId: z.string().optional(),
  topic: z.string().optional(),
  capturedAt: z.date(),
  source: z.enum(['OWNTRACKS', 'GOOGLE_IMPORT', 'MANUAL']),
})

export type GpsPoint = z.infer<typeof gpsPointSchema>

// =============================================================================
// ON-DEMAND GEOCODING
// =============================================================================

/**
 * Request schema for on-demand geocoding.
 * Supports single point or batch (up to 1000 points).
 */
export const geocodeRequestSchema = z.object({
  pointIds: z.array(z.string().uuid()).min(1).max(1000),
})

export type GeocodeRequest = z.infer<typeof geocodeRequestSchema>

/**
 * Schema for confirming/overriding geocoding results.
 */
export const confirmGeocodeSchema = z.object({
  pointId: z.string().uuid(),
  action: z.enum(['confirm', 'override', 'assign']),
  // For override: custom name/address
  name: z.string().min(1).max(100).optional(),
  address: z.string().optional(),
  poiType: z.enum([
    'HOME', 'WORK', 'RESTAURANT', 'SHOP', 'LANDMARK',
    'TRANSPORT', 'NATURE', 'SPORT', 'HEALTH', 'OTHER'
  ]).optional(),
  // For assign: existing location ID
  existingLocationId: z.string().uuid().optional(),
  // For confirm: create new location
  createNewLocation: z.boolean().optional(),
})

export type ConfirmGeocodeRequest = z.infer<typeof confirmGeocodeSchema>

// =============================================================================
// BATCH GEOCODING OPTIONS
// =============================================================================

/**
 * GeoJSON Polygon for geographic selection.
 */
export const geoJsonPolygonSchema = z.object({
  type: z.literal('Polygon'),
  coordinates: z.array(
    z.array(z.tuple([z.number(), z.number()]))
  ).min(1),
})

export type GeoJsonPolygon = z.infer<typeof geoJsonPolygonSchema>

/**
 * Options for batch geocoding selection.
 */
export const batchGeocodeOptionsSchema = z.object({
  mode: z.enum(['timeRange', 'polygon']),
  // For timeRange mode
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  // For polygon mode
  polygon: geoJsonPolygonSchema.optional(),
}).refine(
  (data) => {
    if (data.mode === 'timeRange') {
      return data.startDate && data.endDate
    }
    if (data.mode === 'polygon') {
      return data.polygon !== undefined
    }
    return false
  },
  { message: 'Für Zeitraum-Modus: startDate und endDate erforderlich. Für Polygon-Modus: polygon erforderlich.' }
)

export type BatchGeocodeOptions = z.infer<typeof batchGeocodeOptionsSchema>

// =============================================================================
// TOKEN MANAGEMENT
// =============================================================================

/**
 * Schema for creating a new webhook token.
 */
export const createTokenSchema = z.object({
  deviceName: z.string().min(1).max(50).trim(),
})

export type CreateTokenRequest = z.infer<typeof createTokenSchema>

// =============================================================================
// GOOGLE TIMELINE IMPORT
// =============================================================================

/**
 * Schema for Google Timeline semantic segment visit.
 */
export const googleTimelineVisitSchema = z.object({
  startTime: z.string(),
  endTime: z.string(),
  visit: z.object({
    topCandidate: z.object({
      placeId: z.string().optional(),
      semanticType: z.string().optional(),
      placeLocation: z.object({
        latLng: z.string(), // Format: "47.3769° N, 8.5417° E"
      }).optional(),
    }).optional(),
  }).optional(),
})

export type GoogleTimelineVisit = z.infer<typeof googleTimelineVisitSchema>

/**
 * Schema for Google Timeline JSON export (2024+ format).
 */
export const googleTimelineJsonSchema = z.object({
  semanticSegments: z.array(googleTimelineVisitSchema).optional(),
  rawSignals: z.array(z.unknown()).optional(),
  timelinePath: z.array(z.unknown()).optional(),
})

export type GoogleTimelineJson = z.infer<typeof googleTimelineJsonSchema>

// =============================================================================
// API RESPONSE TYPES
// =============================================================================

/**
 * Geocoding result for a single point.
 */
export const geocodeResultSchema = z.object({
  pointId: z.string().uuid(),
  success: z.boolean(),
  name: z.string().optional(),
  address: z.string().optional(),
  confidence: z.enum(['exact', 'high', 'medium', 'low']).optional(),
  confidenceScore: z.number().min(0).max(1).optional(),
  mapboxPlaceId: z.string().optional(),
  error: z.string().optional(),
})

export type GeocodeResult = z.infer<typeof geocodeResultSchema>

/**
 * Import result statistics.
 */
export const importResultSchema = z.object({
  total: z.number().int().nonnegative(),
  new: z.number().int().nonnegative(),
  matched: z.number().int().nonnegative(),
  ungeocoded: z.number().int().nonnegative(),
  skipped: z.number().int().nonnegative(),
  lastImportedDataAt: z.string().datetime().optional(),
})

export type ImportResult = z.infer<typeof importResultSchema>

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Normalize OwnTracks payload to internal GPS point format.
 */
export function normalizeOwnTracksPayload(payload: OwnTracksPayload): GpsPoint {
  return {
    lat: payload.lat,
    lng: payload.lon, // OwnTracks uses 'lon', we use 'lng'
    accuracy: payload.acc,
    altitude: payload.alt,
    velocity: payload.vel,
    battery: payload.batt,
    batteryState: payload.bs,
    trackerId: payload.tid,
    topic: payload.topic,
    capturedAt: new Date(payload.tst * 1000), // Unix seconds to Date
    source: 'OWNTRACKS',
  }
}

/**
 * Parse Google Timeline lat/lng string format.
 * @example "47.3769° N, 8.5417° E" -> { lat: 47.3769, lng: 8.5417 }
 */
export function parseGoogleLatLng(latLngString: string): { lat: number; lng: number } | null {
  // Match pattern like "47.3769° N, 8.5417° E" or "47.3769°N, 8.5417°E"
  const match = latLngString.match(/(-?\d+\.?\d*)\s*°?\s*([NS])?,?\s*(-?\d+\.?\d*)\s*°?\s*([EW])?/i)
  
  if (!match) {
    // Try simple decimal format "47.3769, 8.5417"
    const simpleMatch = latLngString.match(/(-?\d+\.?\d*),\s*(-?\d+\.?\d*)/)
    if (simpleMatch) {
      return {
        lat: parseFloat(simpleMatch[1]),
        lng: parseFloat(simpleMatch[2]),
      }
    }
    return null
  }

  let lat = parseFloat(match[1])
  let lng = parseFloat(match[3])

  // Handle N/S direction
  if (match[2]?.toUpperCase() === 'S') {
    lat = -lat
  }

  // Handle E/W direction
  if (match[4]?.toUpperCase() === 'W') {
    lng = -lng
  }

  return { lat, lng }
}
