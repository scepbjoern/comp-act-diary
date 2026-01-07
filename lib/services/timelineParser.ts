/**
 * Google Timeline Parser
 * Parses Google Maps Timeline JSON exports (2024+ format).
 * Supports incremental import - only processes data newer than last import.
 * IMPORTANT: Does NOT trigger geocoding - just extracts GPS points.
 */

import { 
  googleTimelineJsonSchema, 
  parseGoogleLatLng,
  type GoogleTimelineVisit 
} from '@/lib/validators/location'

// =============================================================================
// TYPES
// =============================================================================

export interface ParsedPlaceVisit {
  lat: number
  lng: number
  startTime: Date
  endTime: Date
  placeId?: string
  semanticType?: string
}

export interface ParsedTimeline {
  visits: ParsedPlaceVisit[]
  rawSignalsCount: number
  timelinePathCount: number
}

export interface FilteredImportResult {
  allVisits: ParsedPlaceVisit[]
  newVisits: ParsedPlaceVisit[]
  skippedCount: number
  latestTimestamp: Date | null
}

// =============================================================================
// PARSING FUNCTIONS
// =============================================================================

/**
 * Parse and validate Google Timeline JSON export.
 * @throws Error if JSON structure is invalid
 */
export function parseGoogleTimelineJson(json: unknown): ParsedTimeline {
  // Validate structure
  const validationResult = googleTimelineJsonSchema.safeParse(json)
  
  if (!validationResult.success) {
    throw new Error(`Ungültiges Google Timeline Format: ${validationResult.error.message}`)
  }

  const data = validationResult.data
  const visits: ParsedPlaceVisit[] = []

  // Extract place visits from semantic segments
  if (data.semanticSegments) {
    for (const segment of data.semanticSegments) {
      const visit = extractVisitFromSegment(segment)
      if (visit) {
        visits.push(visit)
      }
    }
  }

  return {
    visits,
    rawSignalsCount: data.rawSignals?.length ?? 0,
    timelinePathCount: data.timelinePath?.length ?? 0,
  }
}

/**
 * Extract visit data from a semantic segment.
 */
function extractVisitFromSegment(segment: GoogleTimelineVisit): ParsedPlaceVisit | null {
  // Must have visit data with topCandidate
  if (!segment.visit?.topCandidate) {
    return null
  }

  const topCandidate = segment.visit.topCandidate

  // Must have location coordinates
  if (!topCandidate.placeLocation?.latLng) {
    return null
  }

  // Parse coordinates
  const coords = parseGoogleLatLng(topCandidate.placeLocation.latLng)
  if (!coords) {
    console.warn('Could not parse coordinates:', topCandidate.placeLocation.latLng)
    return null
  }

  // Parse timestamps
  const startTime = parseTimestamp(segment.startTime)
  const endTime = parseTimestamp(segment.endTime)

  if (!startTime || !endTime) {
    console.warn('Could not parse timestamps:', segment.startTime, segment.endTime)
    return null
  }

  return {
    lat: coords.lat,
    lng: coords.lng,
    startTime,
    endTime,
    placeId: topCandidate.placeId,
    semanticType: topCandidate.semanticType,
  }
}

/**
 * Parse Google Timeline timestamp to Date.
 * Handles various formats like "2024-01-15T08:30:00.000Z" or "2024-01-15T08:30:00Z"
 */
function parseTimestamp(timestamp: string): Date | null {
  try {
    const date = new Date(timestamp)
    if (isNaN(date.getTime())) {
      return null
    }
    return date
  } catch {
    return null
  }
}

// =============================================================================
// INCREMENTAL IMPORT FUNCTIONS
// =============================================================================

/**
 * Filter visits to only include those newer than a given date.
 * Used for incremental import to avoid duplicates.
 */
export function filterVisitsSince(
  visits: ParsedPlaceVisit[],
  since: Date | null
): FilteredImportResult {
  if (!since) {
    // First import - include all visits
    const latestTimestamp = getLatestTimestamp(visits)
    return {
      allVisits: visits,
      newVisits: visits,
      skippedCount: 0,
      latestTimestamp,
    }
  }

  const newVisits: ParsedPlaceVisit[] = []
  let skippedCount = 0

  for (const visit of visits) {
    if (visit.startTime > since) {
      newVisits.push(visit)
    } else {
      skippedCount++
    }
  }

  const latestTimestamp = getLatestTimestamp(newVisits)

  return {
    allVisits: visits,
    newVisits,
    skippedCount,
    latestTimestamp,
  }
}

/**
 * Get the latest timestamp from a list of visits.
 * Used to update SyncProvider.lastImportedDataAt.
 */
export function getLatestTimestamp(visits: ParsedPlaceVisit[]): Date | null {
  if (visits.length === 0) {
    return null
  }

  let latest: Date | null = null

  for (const visit of visits) {
    if (!latest || visit.startTime > latest) {
      latest = visit.startTime
    }
    if (!latest || visit.endTime > latest) {
      latest = visit.endTime
    }
  }

  return latest
}

/**
 * Sort visits by start time (oldest first).
 */
export function sortVisitsByTime(visits: ParsedPlaceVisit[]): ParsedPlaceVisit[] {
  return [...visits].sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
}

// =============================================================================
// VALIDATION FUNCTIONS
// =============================================================================

/**
 * Validate that coordinates are within valid ranges.
 */
export function isValidCoordinate(lat: number, lng: number): boolean {
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
}

/**
 * Filter out visits with invalid coordinates.
 */
export function filterInvalidVisits(visits: ParsedPlaceVisit[]): {
  valid: ParsedPlaceVisit[]
  invalid: number
} {
  const valid: ParsedPlaceVisit[] = []
  let invalid = 0

  for (const visit of visits) {
    if (isValidCoordinate(visit.lat, visit.lng)) {
      valid.push(visit)
    } else {
      invalid++
    }
  }

  return { valid, invalid }
}

// =============================================================================
// SEMANTIC TYPE MAPPING
// =============================================================================

/**
 * Map Google's semantic type to a human-readable label.
 */
export function getSemanticTypeLabel(semanticType?: string): string {
  if (!semanticType) return 'Unbekannt'

  const typeMap: Record<string, string> = {
    'TYPE_HOME': 'Zuhause',
    'TYPE_WORK': 'Arbeit',
    'TYPE_RESTAURANT': 'Restaurant',
    'TYPE_CAFE': 'Café',
    'TYPE_BAR': 'Bar',
    'TYPE_GROCERY_STORE': 'Supermarkt',
    'TYPE_SHOPPING': 'Einkaufen',
    'TYPE_GYM': 'Fitnessstudio',
    'TYPE_TRANSIT_STATION': 'Bahnhof',
    'TYPE_AIRPORT': 'Flughafen',
    'TYPE_HOTEL': 'Hotel',
    'TYPE_HOSPITAL': 'Krankenhaus',
    'TYPE_PHARMACY': 'Apotheke',
    'TYPE_SCHOOL': 'Schule',
    'TYPE_UNIVERSITY': 'Universität',
    'TYPE_PARK': 'Park',
    'TYPE_CHURCH': 'Kirche',
    'TYPE_MUSEUM': 'Museum',
    'TYPE_MOVIE_THEATER': 'Kino',
    'TYPE_DOCTOR': 'Arzt',
    'TYPE_DENTIST': 'Zahnarzt',
    'TYPE_BANK': 'Bank',
    'TYPE_GAS_STATION': 'Tankstelle',
    'TYPE_PARKING': 'Parkplatz',
  }

  return typeMap[semanticType] || semanticType.replace('TYPE_', '').replace(/_/g, ' ')
}

// =============================================================================
// STATISTICS
// =============================================================================

/**
 * Get statistics about parsed timeline data.
 */
export function getTimelineStats(timeline: ParsedTimeline): {
  totalVisits: number
  dateRange: { earliest: Date | null; latest: Date | null }
  uniqueDays: number
  semanticTypes: Record<string, number>
} {
  const visits = timeline.visits

  if (visits.length === 0) {
    return {
      totalVisits: 0,
      dateRange: { earliest: null, latest: null },
      uniqueDays: 0,
      semanticTypes: {},
    }
  }

  // Calculate date range
  let earliest: Date | null = null
  let latest: Date | null = null
  const days = new Set<string>()
  const semanticTypes: Record<string, number> = {}

  for (const visit of visits) {
    // Track date range
    if (!earliest || visit.startTime < earliest) {
      earliest = visit.startTime
    }
    if (!latest || visit.endTime > latest) {
      latest = visit.endTime
    }

    // Track unique days
    const dateStr = visit.startTime.toISOString().split('T')[0]
    days.add(dateStr)

    // Track semantic types
    const type = visit.semanticType || 'UNKNOWN'
    semanticTypes[type] = (semanticTypes[type] || 0) + 1
  }

  return {
    totalVisits: visits.length,
    dateRange: { earliest, latest },
    uniqueDays: days.size,
    semanticTypes,
  }
}
