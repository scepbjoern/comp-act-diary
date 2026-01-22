/**
 * Mapbox Service Tests
 * Tests for reverse geocoding functions with mocked API responses.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { 
  getConfidenceScore, 
  extractPoiType, 
  formatAddress,
  estimateGeocodingCost 
} from '@/lib/services/mapboxService'

// =============================================================================
// CONFIDENCE SCORE TESTS
// =============================================================================

describe('getConfidenceScore', () => {
  it('should return exact confidence for exact match', () => {
    const result = getConfidenceScore({ confidence: 'exact' })
    expect(result.confidence).toBe('exact')
    expect(result.score).toBe(1.0)
  })

  it('should return high confidence for high match', () => {
    const result = getConfidenceScore({ confidence: 'high' })
    expect(result.confidence).toBe('high')
    expect(result.score).toBe(0.8)
  })

  it('should return medium confidence for medium match', () => {
    const result = getConfidenceScore({ confidence: 'medium' })
    expect(result.confidence).toBe('medium')
    expect(result.score).toBe(0.5)
  })

  it('should return low confidence for low match', () => {
    const result = getConfidenceScore({ confidence: 'low' })
    expect(result.confidence).toBe('low')
    expect(result.score).toBe(0.25)
  })

  it('should return low confidence for undefined match_code', () => {
    const result = getConfidenceScore(undefined)
    expect(result.confidence).toBe('high')
    expect(result.score).toBe(0.8)
  })

  it('should return low confidence for missing confidence field', () => {
    const result = getConfidenceScore({})
    expect(result.confidence).toBe('high')
    expect(result.score).toBe(0.8)
  })
})

// =============================================================================
// POI TYPE EXTRACTION TESTS
// =============================================================================

describe('extractPoiType', () => {
  it('should extract HOME for residential category', () => {
    const feature = {
      id: 'test',
      properties: { category: 'residential' },
      geometry: { type: 'Point', coordinates: [8.5, 47.4] as [number, number] },
    }
    expect(extractPoiType(feature)).toBe('HOME')
  })

  it('should extract RESTAURANT for restaurant category', () => {
    const feature = {
      id: 'test',
      properties: { category: 'restaurant' },
      geometry: { type: 'Point', coordinates: [8.5, 47.4] as [number, number] },
    }
    expect(extractPoiType(feature)).toBe('RESTAURANT')
  })

  it('should extract SHOP for shop category', () => {
    const feature = {
      id: 'test',
      properties: { category: 'shop' },
      geometry: { type: 'Point', coordinates: [8.5, 47.4] as [number, number] },
    }
    expect(extractPoiType(feature)).toBe('SHOP')
  })

  it('should extract TRANSPORT for bus_station category', () => {
    const feature = {
      id: 'test',
      properties: { category: 'bus_station' },
      geometry: { type: 'Point', coordinates: [8.5, 47.4] as [number, number] },
    }
    expect(extractPoiType(feature)).toBe('TRANSPORT')
  })

  it('should check poi_category array if category not found', () => {
    const feature = {
      id: 'test',
      properties: { poi_category: ['gym', 'fitness'] },
      geometry: { type: 'Point', coordinates: [8.5, 47.4] as [number, number] },
    }
    expect(extractPoiType(feature)).toBe('SPORT')
  })

  it('should return OTHER for unknown category', () => {
    const feature = {
      id: 'test',
      properties: { category: 'unknown_category' },
      geometry: { type: 'Point', coordinates: [8.5, 47.4] as [number, number] },
    }
    expect(extractPoiType(feature)).toBe('OTHER')
  })

  it('should return OTHER for empty properties', () => {
    const feature = {
      id: 'test',
      properties: {},
      geometry: { type: 'Point', coordinates: [8.5, 47.4] as [number, number] },
    }
    expect(extractPoiType(feature)).toBe('OTHER')
  })
})

// =============================================================================
// ADDRESS FORMATTING TESTS
// =============================================================================

describe('formatAddress', () => {
  it('should return full_address if available', () => {
    const feature = {
      id: 'test',
      properties: { 
        full_address: 'Bahnhofstrasse 1, 8001 Zürich, Switzerland',
        place_formatted: 'Zürich',
        name: 'HB',
      },
      geometry: { type: 'Point', coordinates: [8.5, 47.4] as [number, number] },
    }
    expect(formatAddress(feature)).toBe('Bahnhofstrasse 1, 8001 Zürich, Switzerland')
  })

  it('should fall back to place_formatted', () => {
    const feature = {
      id: 'test',
      properties: { 
        place_formatted: 'Zürich, Switzerland',
        name: 'HB',
      },
      geometry: { type: 'Point', coordinates: [8.5, 47.4] as [number, number] },
    }
    expect(formatAddress(feature)).toBe('Zürich, Switzerland')
  })

  it('should fall back to name', () => {
    const feature = {
      id: 'test',
      properties: { name: 'Hauptbahnhof Zürich' },
      geometry: { type: 'Point', coordinates: [8.5, 47.4] as [number, number] },
    }
    expect(formatAddress(feature)).toBe('Hauptbahnhof Zürich')
  })

  it('should return empty string if no address fields', () => {
    const feature = {
      id: 'test',
      properties: {},
      geometry: { type: 'Point', coordinates: [8.5, 47.4] as [number, number] },
    }
    expect(formatAddress(feature)).toBe('')
  })
})

// =============================================================================
// COST ESTIMATION TESTS
// =============================================================================

describe('estimateGeocodingCost', () => {
  it('should calculate cost for 1 point', () => {
    const result = estimateGeocodingCost(1)
    expect(result.costUsd).toBe(0.005)
    expect(result.costFormatted).toBe('<$0.01')
  })

  it('should calculate cost for 100 points', () => {
    const result = estimateGeocodingCost(100)
    expect(result.costUsd).toBe(0.5)
    expect(result.costFormatted).toBe('~$0.50')
  })

  it('should calculate cost for 1000 points', () => {
    const result = estimateGeocodingCost(1000)
    expect(result.costUsd).toBe(5)
    expect(result.costFormatted).toBe('~$5.00')
  })

  it('should calculate cost for 0 points', () => {
    const result = estimateGeocodingCost(0)
    expect(result.costUsd).toBe(0)
    expect(result.costFormatted).toBe('<$0.01')
  })
})

// =============================================================================
// MOCKED API TESTS
// =============================================================================

describe('reverseGeocodeSingle with mocked fetch', () => {
  const originalFetch = global.fetch
  
  beforeEach(() => {
    vi.stubEnv('MAPBOX_ACCESS_TOKEN', 'test_token')
  })

  afterEach(() => {
    global.fetch = originalFetch
    vi.unstubAllEnvs()
  })

  it('should handle successful API response', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        features: [{
          id: 'place.123',
          properties: {
            name: 'Test Location',
            full_address: 'Test Address, City',
            match_code: { confidence: 'high' },
          },
          geometry: { type: 'Point', coordinates: [8.5, 47.4] },
        }],
      }),
    })

    const { reverseGeocodeSingle } = await import('@/lib/services/mapboxService')
    const result = await reverseGeocodeSingle(47.4, 8.5)

    expect(result.success).toBe(true)
    expect(result.name).toBe('Test Location')
    expect(result.confidence).toBe('high')
  })

  it('should handle empty features array', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ features: [] }),
    })

    const { reverseGeocodeSingle } = await import('@/lib/services/mapboxService')
    const result = await reverseGeocodeSingle(47.4, 8.5)

    expect(result.success).toBe(false)
    expect(result.error).toContain('Keine Adresse')
  })

  it('should handle API error', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: () => Promise.resolve('Unauthorized'),
    })

    const { reverseGeocodeSingle } = await import('@/lib/services/mapboxService')
    const result = await reverseGeocodeSingle(47.4, 8.5)

    expect(result.success).toBe(false)
    expect(result.error).toContain('401')
  })
})
