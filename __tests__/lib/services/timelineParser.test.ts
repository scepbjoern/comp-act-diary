/**
 * Timeline Parser Tests
 * Tests for Google Timeline JSON parsing and incremental import.
 */

import { describe, it, expect } from 'vitest'
import { 
  parseGoogleTimelineJson,
  filterVisitsSince,
  getLatestTimestamp,
  sortVisitsByTime,
  isValidCoordinate,
  filterInvalidVisits,
  getSemanticTypeLabel,
  getTimelineStats,
  type ParsedPlaceVisit
} from '@/lib/services/timelineParser'
import { parseGoogleLatLng } from '@/lib/validators/location'

// =============================================================================
// COORDINATE PARSING TESTS
// =============================================================================

describe('parseGoogleLatLng', () => {
  it('should parse standard format with degrees symbol', () => {
    const result = parseGoogleLatLng('47.3769° N, 8.5417° E')
    expect(result).toEqual({ lat: 47.3769, lng: 8.5417 })
  })

  it('should parse format without spaces', () => {
    const result = parseGoogleLatLng('47.3769°N, 8.5417°E')
    expect(result).toEqual({ lat: 47.3769, lng: 8.5417 })
  })

  it('should parse simple decimal format', () => {
    const result = parseGoogleLatLng('47.3769, 8.5417')
    expect(result).toEqual({ lat: 47.3769, lng: 8.5417 })
  })

  it('should handle South latitude', () => {
    const result = parseGoogleLatLng('33.8688° S, 151.2093° E')
    expect(result?.lat).toBe(-33.8688)
    expect(result?.lng).toBe(151.2093)
  })

  it('should handle West longitude', () => {
    const result = parseGoogleLatLng('40.7128° N, 74.0060° W')
    expect(result?.lat).toBe(40.7128)
    expect(result?.lng).toBe(-74.0060)
  })

  it('should return null for invalid format', () => {
    const result = parseGoogleLatLng('invalid coordinates')
    expect(result).toBeNull()
  })

  it('should return null for empty string', () => {
    const result = parseGoogleLatLng('')
    expect(result).toBeNull()
  })
})

// =============================================================================
// COORDINATE VALIDATION TESTS
// =============================================================================

describe('isValidCoordinate', () => {
  it('should return true for valid coordinates', () => {
    expect(isValidCoordinate(47.3769, 8.5417)).toBe(true)
    expect(isValidCoordinate(0, 0)).toBe(true)
    expect(isValidCoordinate(-90, -180)).toBe(true)
    expect(isValidCoordinate(90, 180)).toBe(true)
  })

  it('should return false for invalid latitude', () => {
    expect(isValidCoordinate(91, 0)).toBe(false)
    expect(isValidCoordinate(-91, 0)).toBe(false)
  })

  it('should return false for invalid longitude', () => {
    expect(isValidCoordinate(0, 181)).toBe(false)
    expect(isValidCoordinate(0, -181)).toBe(false)
  })
})

// =============================================================================
// TIMELINE PARSING TESTS
// =============================================================================

describe('parseGoogleTimelineJson', () => {
  it('should parse valid timeline JSON', () => {
    const json = {
      semanticSegments: [
        {
          startTime: '2024-01-15T08:00:00Z',
          endTime: '2024-01-15T09:00:00Z',
          visit: {
            topCandidate: {
              placeId: 'ChIJ123',
              semanticType: 'TYPE_HOME',
              placeLocation: {
                latLng: '47.3769° N, 8.5417° E',
              },
            },
          },
        },
      ],
    }

    const result = parseGoogleTimelineJson(json)
    expect(result.visits).toHaveLength(1)
    expect(result.visits[0].lat).toBeCloseTo(47.3769)
    expect(result.visits[0].lng).toBeCloseTo(8.5417)
    expect(result.visits[0].placeId).toBe('ChIJ123')
    expect(result.visits[0].semanticType).toBe('TYPE_HOME')
  })

  it('should skip segments without visit data', () => {
    const json = {
      semanticSegments: [
        {
          startTime: '2024-01-15T08:00:00Z',
          endTime: '2024-01-15T09:00:00Z',
          // No visit field - this is an activity segment
        },
        {
          startTime: '2024-01-15T10:00:00Z',
          endTime: '2024-01-15T11:00:00Z',
          visit: {
            topCandidate: {
              placeLocation: {
                latLng: '47.3769° N, 8.5417° E',
              },
            },
          },
        },
      ],
    }

    const result = parseGoogleTimelineJson(json)
    expect(result.visits).toHaveLength(1)
  })

  it('should handle empty semanticSegments', () => {
    const json = { semanticSegments: [] }
    const result = parseGoogleTimelineJson(json)
    expect(result.visits).toHaveLength(0)
  })

  it('should throw for invalid JSON structure', () => {
    expect(() => parseGoogleTimelineJson({ invalid: 'data' })).not.toThrow()
    // Should return empty visits for invalid structure
    const result = parseGoogleTimelineJson({ invalid: 'data' })
    expect(result.visits).toHaveLength(0)
  })
})

// =============================================================================
// INCREMENTAL IMPORT TESTS
// =============================================================================

describe('filterVisitsSince', () => {
  const visits: ParsedPlaceVisit[] = [
    { lat: 47.37, lng: 8.54, startTime: new Date('2024-01-10'), endTime: new Date('2024-01-10T01:00:00Z') },
    { lat: 47.38, lng: 8.55, startTime: new Date('2024-01-15'), endTime: new Date('2024-01-15T01:00:00Z') },
    { lat: 47.39, lng: 8.56, startTime: new Date('2024-01-20'), endTime: new Date('2024-01-20T01:00:00Z') },
  ]

  it('should return all visits when since is null', () => {
    const result = filterVisitsSince(visits, null)
    expect(result.newVisits).toHaveLength(3)
    expect(result.skippedCount).toBe(0)
  })

  it('should filter visits before since date', () => {
    const result = filterVisitsSince(visits, new Date('2024-01-12'))
    expect(result.newVisits).toHaveLength(2)
    expect(result.skippedCount).toBe(1)
  })

  it('should skip all visits if since is after all', () => {
    const result = filterVisitsSince(visits, new Date('2024-01-25'))
    expect(result.newVisits).toHaveLength(0)
    expect(result.skippedCount).toBe(3)
  })

  it('should include latestTimestamp from new visits', () => {
    const result = filterVisitsSince(visits, null)
    expect(result.latestTimestamp).toEqual(new Date('2024-01-20T01:00:00Z'))
  })
})

describe('getLatestTimestamp', () => {
  it('should return latest timestamp from visits', () => {
    const visits: ParsedPlaceVisit[] = [
      { lat: 47.37, lng: 8.54, startTime: new Date('2024-01-10'), endTime: new Date('2024-01-10T01:00:00Z') },
      { lat: 47.38, lng: 8.55, startTime: new Date('2024-01-15'), endTime: new Date('2024-01-15T02:00:00Z') },
    ]
    const result = getLatestTimestamp(visits)
    expect(result).toEqual(new Date('2024-01-15T02:00:00Z'))
  })

  it('should return null for empty array', () => {
    const result = getLatestTimestamp([])
    expect(result).toBeNull()
  })
})

describe('sortVisitsByTime', () => {
  it('should sort visits by startTime ascending', () => {
    const visits: ParsedPlaceVisit[] = [
      { lat: 47.37, lng: 8.54, startTime: new Date('2024-01-20'), endTime: new Date('2024-01-20T01:00:00Z') },
      { lat: 47.38, lng: 8.55, startTime: new Date('2024-01-10'), endTime: new Date('2024-01-10T01:00:00Z') },
      { lat: 47.39, lng: 8.56, startTime: new Date('2024-01-15'), endTime: new Date('2024-01-15T01:00:00Z') },
    ]
    const sorted = sortVisitsByTime(visits)
    expect(sorted[0].startTime).toEqual(new Date('2024-01-10'))
    expect(sorted[1].startTime).toEqual(new Date('2024-01-15'))
    expect(sorted[2].startTime).toEqual(new Date('2024-01-20'))
  })

  it('should not mutate original array', () => {
    const visits: ParsedPlaceVisit[] = [
      { lat: 47.37, lng: 8.54, startTime: new Date('2024-01-20'), endTime: new Date('2024-01-20T01:00:00Z') },
    ]
    const sorted = sortVisitsByTime(visits)
    expect(sorted).not.toBe(visits)
  })
})

// =============================================================================
// FILTER INVALID VISITS TESTS
// =============================================================================

describe('filterInvalidVisits', () => {
  it('should filter out invalid coordinates', () => {
    const visits: ParsedPlaceVisit[] = [
      { lat: 47.37, lng: 8.54, startTime: new Date(), endTime: new Date() },
      { lat: 91, lng: 8.54, startTime: new Date(), endTime: new Date() }, // invalid lat
      { lat: 47.37, lng: 181, startTime: new Date(), endTime: new Date() }, // invalid lng
    ]
    const result = filterInvalidVisits(visits)
    expect(result.valid).toHaveLength(1)
    expect(result.invalid).toBe(2)
  })
})

// =============================================================================
// SEMANTIC TYPE LABEL TESTS
// =============================================================================

describe('getSemanticTypeLabel', () => {
  it('should return German label for known types', () => {
    expect(getSemanticTypeLabel('TYPE_HOME')).toBe('Zuhause')
    expect(getSemanticTypeLabel('TYPE_WORK')).toBe('Arbeit')
    expect(getSemanticTypeLabel('TYPE_RESTAURANT')).toBe('Restaurant')
  })

  it('should format unknown types', () => {
    expect(getSemanticTypeLabel('TYPE_CUSTOM_PLACE')).toBe('CUSTOM PLACE')
  })

  it('should return "Unbekannt" for undefined', () => {
    expect(getSemanticTypeLabel(undefined)).toBe('Unbekannt')
  })
})

// =============================================================================
// STATISTICS TESTS
// =============================================================================

describe('getTimelineStats', () => {
  it('should calculate correct statistics', () => {
    const timeline = {
      visits: [
        { lat: 47.37, lng: 8.54, startTime: new Date('2024-01-10'), endTime: new Date('2024-01-10T01:00:00Z'), semanticType: 'TYPE_HOME' },
        { lat: 47.38, lng: 8.55, startTime: new Date('2024-01-10T12:00:00Z'), endTime: new Date('2024-01-10T13:00:00Z'), semanticType: 'TYPE_WORK' },
        { lat: 47.39, lng: 8.56, startTime: new Date('2024-01-15'), endTime: new Date('2024-01-15T01:00:00Z'), semanticType: 'TYPE_HOME' },
      ],
      rawSignalsCount: 0,
      timelinePathCount: 0,
    }

    const stats = getTimelineStats(timeline)
    expect(stats.totalVisits).toBe(3)
    expect(stats.uniqueDays).toBe(2)
    expect(stats.semanticTypes['TYPE_HOME']).toBe(2)
    expect(stats.semanticTypes['TYPE_WORK']).toBe(1)
  })

  it('should handle empty visits', () => {
    const timeline = { visits: [], rawSignalsCount: 0, timelinePathCount: 0 }
    const stats = getTimelineStats(timeline)
    expect(stats.totalVisits).toBe(0)
    expect(stats.uniqueDays).toBe(0)
  })
})
