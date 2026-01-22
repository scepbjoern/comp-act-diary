/**
 * Location Service Tests
 * Tests for GPS point storage, location matching, and on-demand geocoding functions.
 */

import { describe, it, expect } from 'vitest'
import { 
  calculateDistance, 
  isPointInPolygon 
} from '@/lib/services/locationService'
import type { GeoJsonPolygon } from '@/lib/validators/location'

// =============================================================================
// HAVERSINE DISTANCE TESTS
// =============================================================================

describe('calculateDistance', () => {
  it('should return 0 for same coordinates', () => {
    const distance = calculateDistance(47.3769, 8.5417, 47.3769, 8.5417)
    expect(distance).toBe(0)
  })

  it('should calculate distance between Zurich and Bern (~95km)', () => {
    // Zurich: 47.3769, 8.5417
    // Bern: 46.9480, 7.4474
    const distance = calculateDistance(47.3769, 8.5417, 46.9480, 7.4474)
    // Should be approximately 95km (95000m)
    expect(distance).toBeGreaterThan(90000)
    expect(distance).toBeLessThan(100000)
  })

  it('should calculate short distance (~100m)', () => {
    // Two points approximately 100m apart in Zurich
    const lat1 = 47.3769
    const lng1 = 8.5417
    const lat2 = 47.3778 // ~100m north
    const lng2 = 8.5417
    const distance = calculateDistance(lat1, lng1, lat2, lng2)
    expect(distance).toBeGreaterThan(80)
    expect(distance).toBeLessThan(120)
  })

  it('should handle negative coordinates', () => {
    // Sydney: -33.8688, 151.2093
    // Melbourne: -37.8136, 144.9631
    const distance = calculateDistance(-33.8688, 151.2093, -37.8136, 144.9631)
    // Should be approximately 714km
    expect(distance).toBeGreaterThan(700000)
    expect(distance).toBeLessThan(750000)
  })
})

// =============================================================================
// POINT IN POLYGON TESTS
// =============================================================================

describe('isPointInPolygon', () => {
  const zurichPolygon: GeoJsonPolygon = {
    type: 'Polygon',
    coordinates: [[
      [8.50, 47.35],   // SW corner
      [8.60, 47.35],   // SE corner
      [8.60, 47.40],   // NE corner
      [8.50, 47.40],   // NW corner
      [8.50, 47.35],   // Close polygon
    ]],
  }

  it('should return true for point inside polygon', () => {
    // Point in center of Zurich polygon
    const result = isPointInPolygon(47.3769, 8.5417, zurichPolygon)
    expect(result).toBe(true)
  })

  it('should return false for point outside polygon', () => {
    // Point in Bern (outside Zurich polygon)
    const result = isPointInPolygon(46.9480, 7.4474, zurichPolygon)
    expect(result).toBe(false)
  })

  it('should return false for point north of polygon', () => {
    const result = isPointInPolygon(47.45, 8.55, zurichPolygon)
    expect(result).toBe(false)
  })

  it('should return false for point east of polygon', () => {
    const result = isPointInPolygon(47.37, 8.65, zurichPolygon)
    expect(result).toBe(false)
  })

  it('should handle complex polygon shapes', () => {
    // L-shaped polygon
    const lPolygon: GeoJsonPolygon = {
      type: 'Polygon',
      coordinates: [[
        [0, 0],
        [2, 0],
        [2, 1],
        [1, 1],
        [1, 2],
        [0, 2],
        [0, 0],
      ]],
    }

    // Point in lower part of L
    expect(isPointInPolygon(0.5, 0.5, lPolygon)).toBe(true)
    // Point in upper left part of L
    expect(isPointInPolygon(1.5, 0.5, lPolygon)).toBe(true)
    // Point in cutout (upper right)
    expect(isPointInPolygon(1.5, 1.5, lPolygon)).toBe(false)
  })
})

// =============================================================================
// MOCK PRISMA TESTS (Integration)
// =============================================================================

describe('locationService with mocked Prisma', () => {
  // These tests would require mocking Prisma
  // For now, we just verify the functions exist
  
  it('should export saveRawGpsPoint function', async () => {
    const { saveRawGpsPoint } = await import('@/lib/services/locationService')
    expect(typeof saveRawGpsPoint).toBe('function')
  })

  it('should export getUngeocodedPoints function', async () => {
    const { getUngeocodedPoints } = await import('@/lib/services/locationService')
    expect(typeof getUngeocodedPoints).toBe('function')
  })

  it('should export matchLocationByCoords function', async () => {
    const { matchLocationByCoords } = await import('@/lib/services/locationService')
    expect(typeof matchLocationByCoords).toBe('function')
  })

  it('should export createLocationFromPoint function', async () => {
    const { createLocationFromPoint } = await import('@/lib/services/locationService')
    expect(typeof createLocationFromPoint).toBe('function')
  })
})
