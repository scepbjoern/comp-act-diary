/**
 * Mapbox Geocoding Service
 * On-demand reverse geocoding using Mapbox Geocoding API v6 (Permanent Mode).
 * Supports single and batch geocoding requests.
 */

import { PoiType } from '@prisma/client'

// =============================================================================
// TYPES
// =============================================================================

export interface MapboxGeocodeResult {
  success: boolean
  name?: string
  address?: string
  city?: string
  country?: string
  confidence: 'exact' | 'high' | 'medium' | 'low'
  confidenceScore: number
  mapboxPlaceId?: string
  poiType?: PoiType
  error?: string
}

export interface BatchGeocodeResult {
  results: Array<{
    id: string
    lat: number
    lng: number
    result: MapboxGeocodeResult
  }>
  totalCost: number // Estimated cost in USD
}

interface MapboxFeature {
  id: string
  properties: {
    full_address?: string
    name?: string
    name_preferred?: string
    place_formatted?: string
    feature_type?: string
    category?: string
    maki?: string
    poi_category?: string[]
    match_code?: {
      confidence?: string
      address_number?: string
      street?: string
      postcode?: string
      place?: string
      region?: string
      country?: string
    }
    context?: {
      place?: { name: string }
      region?: { name: string }
      country?: { name: string }
      postcode?: { name: string }
    }
  }
  geometry: {
    type: string
    coordinates: [number, number] // [lng, lat]
  }
}

interface MapboxResponse {
  type: string
  features: MapboxFeature[]
  attribution?: string
}

interface MapboxBatchResponse {
  batch: MapboxResponse[]
}

// Search Box API types
interface SearchBoxFeature {
  type: 'Feature'
  geometry: {
    type: string
    coordinates: [number, number]
  }
  properties: {
    name: string
    name_preferred?: string
    mapbox_id: string
    feature_type: string
    address?: string
    full_address?: string
    place_formatted?: string
    context?: {
      country?: { id: string; name: string; country_code: string }
      region?: { id: string; name: string }
      postcode?: { id: string; name: string }
      district?: { id: string; name: string }
      place?: { id: string; name: string }
      locality?: { id: string; name: string }
      neighborhood?: { id: string; name: string }
      address?: { id: string; name: string; address_number?: string; street_name?: string }
      street?: { name: string }
    }
    coordinates?: {
      latitude: number
      longitude: number
      accuracy?: 'rooftop' | 'parcel' | 'point' | 'interpolated' | 'intersection' | 'approximate' | 'street'
      routable_points?: Array<{ name: string; latitude: number; longitude: number }>
    }
    language?: string
    maki?: string
    poi_category?: string[]
    poi_category_ids?: string[]
    brand?: string[]
    brand_id?: string[]
    external_ids?: Record<string, string>
    metadata?: Record<string, unknown>
  }
}

// =============================================================================
// CONSTANTS
// =============================================================================

const MAPBOX_GEOCODE_URL = 'https://api.mapbox.com/search/geocode/v6'
const MAPBOX_SEARCHBOX_URL = 'https://api.mapbox.com/search/searchbox/v1'
const COST_PER_REQUEST = 0.005 // ~$5 per 1000 requests (Permanent Mode)

// Enable debug logging for Mapbox requests
const DEBUG_MAPBOX = true

// Mapping from Mapbox categories to PoiType
const CATEGORY_TO_POI_TYPE: Record<string, PoiType> = {
  // Home/Residential
  'residential': 'HOME',
  'apartment': 'HOME',
  'house': 'HOME',
  
  // Work/Office
  'office': 'WORK',
  'coworking_space': 'WORK',
  'business': 'WORK',
  
  // Food & Drink
  'restaurant': 'RESTAURANT',
  'cafe': 'RESTAURANT',
  'bar': 'RESTAURANT',
  'coffee': 'RESTAURANT',
  'bakery': 'RESTAURANT',
  'fast_food': 'RESTAURANT',
  
  // Shopping
  'shop': 'SHOP',
  'store': 'SHOP',
  'supermarket': 'SHOP',
  'mall': 'SHOP',
  'grocery': 'SHOP',
  'clothing': 'SHOP',
  
  // Transport
  'bus_station': 'TRANSPORT',
  'train_station': 'TRANSPORT',
  'airport': 'TRANSPORT',
  'subway': 'TRANSPORT',
  'tram_stop': 'TRANSPORT',
  'ferry_terminal': 'TRANSPORT',
  'parking': 'TRANSPORT',
  
  // Nature
  'park': 'NATURE',
  'garden': 'NATURE',
  'forest': 'NATURE',
  'beach': 'NATURE',
  'lake': 'NATURE',
  'mountain': 'NATURE',
  'nature_reserve': 'NATURE',
  
  // Sport
  'gym': 'SPORT',
  'fitness': 'SPORT',
  'stadium': 'SPORT',
  'sports_centre': 'SPORT',
  'swimming_pool': 'SPORT',
  'tennis': 'SPORT',
  
  // Health
  'hospital': 'HEALTH',
  'clinic': 'HEALTH',
  'doctor': 'HEALTH',
  'dentist': 'HEALTH',
  'pharmacy': 'HEALTH',
  
  // Landmarks
  'museum': 'LANDMARK',
  'monument': 'LANDMARK',
  'church': 'LANDMARK',
  'castle': 'LANDMARK',
  'attraction': 'LANDMARK',
  'viewpoint': 'LANDMARK',
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get Mapbox access token from environment.
 */
function getAccessToken(): string {
  const token = process.env.MAPBOX_ACCESS_TOKEN
  if (!token) {
    throw new Error('MAPBOX_ACCESS_TOKEN is not configured')
  }
  return token
}

/**
 * Extract confidence score from Mapbox match_code.
 * Note: match_code is typically only present in forward geocoding responses,
 * not in reverse geocoding. For reverse geocoding, we use accuracy-based confidence.
 */
export function getConfidenceScore(matchCode?: MapboxFeature['properties']['match_code']): {
  confidence: 'exact' | 'high' | 'medium' | 'low'
  score: number
} {
  if (!matchCode?.confidence) {
    // For reverse geocoding without match_code, default to 'high' since
    // reverse geocoding typically returns the actual address at coordinates
    return { confidence: 'high', score: 0.8 }
  }

  switch (matchCode.confidence) {
    case 'exact':
      return { confidence: 'exact', score: 1.0 }
    case 'high':
      return { confidence: 'high', score: 0.8 }
    case 'medium':
      return { confidence: 'medium', score: 0.5 }
    case 'low':
    default:
      return { confidence: 'low', score: 0.25 }
  }
}

/**
 * Get confidence from Search Box API accuracy field.
 */
function getConfidenceFromAccuracy(accuracy?: string): {
  confidence: 'exact' | 'high' | 'medium' | 'low'
  score: number
} {
  switch (accuracy) {
    case 'rooftop':
      return { confidence: 'exact', score: 1.0 }
    case 'parcel':
      return { confidence: 'high', score: 0.9 }
    case 'point':
      return { confidence: 'high', score: 0.85 }
    case 'interpolated':
      return { confidence: 'medium', score: 0.7 }
    case 'intersection':
      return { confidence: 'medium', score: 0.6 }
    case 'street':
      return { confidence: 'medium', score: 0.5 }
    case 'approximate':
      return { confidence: 'low', score: 0.3 }
    default:
      // If no accuracy field, assume it's a valid result with medium confidence
      return { confidence: 'medium', score: 0.6 }
  }
}

/**
 * Extract POI type from Mapbox feature.
 */
export function extractPoiType(feature: MapboxFeature): PoiType {
  // Check category first
  const category = feature.properties.category?.toLowerCase()
  if (category && CATEGORY_TO_POI_TYPE[category]) {
    return CATEGORY_TO_POI_TYPE[category]
  }

  // Check poi_category array
  const poiCategories = feature.properties.poi_category || []
  for (const cat of poiCategories) {
    const lowerCat = cat.toLowerCase()
    if (CATEGORY_TO_POI_TYPE[lowerCat]) {
      return CATEGORY_TO_POI_TYPE[lowerCat]
    }
  }

  // Check maki icon name
  const maki = feature.properties.maki?.toLowerCase()
  if (maki && CATEGORY_TO_POI_TYPE[maki]) {
    return CATEGORY_TO_POI_TYPE[maki]
  }

  // Check feature type
  const featureType = feature.properties.feature_type?.toLowerCase()
  if (featureType === 'poi') {
    return 'OTHER'
  }

  return 'OTHER'
}

/**
 * Format address from Mapbox feature.
 */
export function formatAddress(feature: MapboxFeature): string {
  return feature.properties.full_address || 
         feature.properties.place_formatted || 
         feature.properties.name || 
         ''
}

/**
 * Extract city from Mapbox feature context.
 */
function extractCity(feature: MapboxFeature): string | undefined {
  return feature.properties.context?.place?.name
}

/**
 * Extract country from Mapbox feature context.
 */
function extractCountry(feature: MapboxFeature): string | undefined {
  return feature.properties.context?.country?.name
}

/**
 * Parse Mapbox feature into our result format.
 */
function parseFeature(feature: MapboxFeature): MapboxGeocodeResult {
  const { confidence, score } = getConfidenceScore(feature.properties.match_code)
  
  return {
    success: true,
    name: feature.properties.name_preferred || feature.properties.name,
    address: formatAddress(feature),
    city: extractCity(feature),
    country: extractCountry(feature),
    confidence,
    confidenceScore: score,
    mapboxPlaceId: feature.id,
    poiType: extractPoiType(feature),
  }
}

// =============================================================================
// API FUNCTIONS
// =============================================================================

/**
 * Reverse geocode a single point using Mapbox Geocoding API v6.
 * Uses permanent=true for data storage rights.
 * @param includePoi - If true, also queries Search Box API for POI data
 */
export async function reverseGeocodeSingle(
  lat: number,
  lng: number,
  options?: { includePoi?: boolean }
): Promise<MapboxGeocodeResult> {
  const accessToken = getAccessToken()
  
  // If POI lookup requested, use Search Box API instead
  if (options?.includePoi) {
    return reverseGeocodeWithSearchBox(lat, lng, accessToken)
  }
  
  const params = new URLSearchParams({
    longitude: lng.toString(),
    latitude: lat.toString(),
    access_token: accessToken,
    permanent: 'true', // Important: allows permanent storage of results
    types: 'address,place,locality,neighborhood',
    language: 'de',
  })

  const url = `${MAPBOX_GEOCODE_URL}/reverse?${params.toString()}`
  
  // Debug logging - show URL without token for security
  if (DEBUG_MAPBOX) {
    const debugUrl = url.replace(accessToken, 'TOKEN_HIDDEN')
    console.log('[Mapbox] Single reverse geocode URL:', debugUrl)
  }

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Mapbox API error:', response.status, errorText)
      console.error('[Mapbox] Failed URL (without token):', url.replace(accessToken, 'TOKEN_HIDDEN'))
      return {
        success: false,
        confidence: 'low',
        confidenceScore: 0,
        error: `Mapbox API error: ${response.status}`,
      }
    }

    const data: MapboxResponse = await response.json()

    if (!data.features || data.features.length === 0) {
      return {
        success: false,
        confidence: 'low',
        confidenceScore: 0,
        error: 'Keine Adresse für diese Koordinaten gefunden',
      }
    }

    // Return the best match (first feature)
    return parseFeature(data.features[0])

  } catch (error) {
    console.error('Mapbox geocoding error:', error)
    return {
      success: false,
      confidence: 'low',
      confidenceScore: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Reverse geocode using Search Box API (supports POIs).
 * Note: Search Box API does NOT support permanent storage - data cannot be cached permanently.
 */
async function reverseGeocodeWithSearchBox(
  lat: number,
  lng: number,
  accessToken: string
): Promise<MapboxGeocodeResult> {
  const params = new URLSearchParams({
    longitude: lng.toString(),
    latitude: lat.toString(),
    access_token: accessToken,
    language: 'de',
    limit: '1',
  })

  const url = `${MAPBOX_SEARCHBOX_URL}/reverse?${params.toString()}`
  
  if (DEBUG_MAPBOX) {
    const debugUrl = url.replace(accessToken, 'TOKEN_HIDDEN')
    console.log('[Mapbox] Search Box reverse lookup URL:', debugUrl)
  }

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Mapbox Search Box API error:', response.status, errorText)
      console.error('[Mapbox] Failed URL (without token):', url.replace(accessToken, 'TOKEN_HIDDEN'))
      return {
        success: false,
        confidence: 'low',
        confidenceScore: 0,
        error: `Mapbox Search Box API error: ${response.status}`,
      }
    }

    const data = await response.json()

    if (!data.features || data.features.length === 0) {
      return {
        success: false,
        confidence: 'low',
        confidenceScore: 0,
        error: 'Keine Adresse/POI für diese Koordinaten gefunden',
      }
    }

    // Parse Search Box response (different format than Geocoding API)
    return parseSearchBoxFeature(data.features[0])

  } catch (error) {
    console.error('Mapbox Search Box error:', error)
    return {
      success: false,
      confidence: 'low',
      confidenceScore: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Parse Search Box API feature into our result format.
 */
function parseSearchBoxFeature(feature: SearchBoxFeature): MapboxGeocodeResult {
  const props = feature.properties
  
  // Determine confidence from coordinates.accuracy
  const accuracy = props.coordinates?.accuracy
  const { confidence, score } = getConfidenceFromAccuracy(accuracy)
  
  // Determine POI type
  let poiType: PoiType = 'OTHER'
  if (props.poi_category && props.poi_category.length > 0) {
    for (const cat of props.poi_category) {
      const lowerCat = cat.toLowerCase()
      if (CATEGORY_TO_POI_TYPE[lowerCat]) {
        poiType = CATEGORY_TO_POI_TYPE[lowerCat]
        break
      }
    }
  }
  
  return {
    success: true,
    name: props.name_preferred || props.name,
    address: props.full_address || props.place_formatted || props.name || '',
    city: props.context?.place?.name,
    country: props.context?.country?.name,
    confidence,
    confidenceScore: score,
    mapboxPlaceId: props.mapbox_id,
    poiType,
  }
}

/**
 * Reverse geocode multiple points using Mapbox Batch Geocoding API v6.
 * More efficient than individual calls (single HTTP request for up to 1000 queries).
 * Uses permanent=true for data storage rights.
 */
export async function reverseGeocodeBatch(
  points: Array<{ id: string; lat: number; lng: number }>
): Promise<BatchGeocodeResult> {
  if (points.length === 0) {
    return { results: [], totalCost: 0 }
  }

  if (points.length > 1000) {
    throw new Error('Batch geocoding supports max 1000 points per request')
  }

  const accessToken = getAccessToken()
  
  const url = `${MAPBOX_GEOCODE_URL}/batch?access_token=${accessToken}&permanent=true`
  
  // Debug logging
  if (DEBUG_MAPBOX) {
    console.log('[Mapbox] Batch geocode URL:', url.replace(accessToken, 'TOKEN_HIDDEN'))
    console.log('[Mapbox] Batch size:', points.length, 'points')
  }

  // Build batch request body
  // Note: POI type is NOT available in Geocoding API v6 - use valid types only
  const batchBody = points.map(point => ({
    types: ['address', 'place', 'locality', 'neighborhood'],
    longitude: point.lng,
    latitude: point.lat,
    language: 'de',
  }))

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(batchBody),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Mapbox Batch API error:', response.status, errorText)
      console.error('[Mapbox] Failed batch URL (without token):', url.replace(accessToken, 'TOKEN_HIDDEN'))
      
      // Return error for all points
      return {
        results: points.map(point => ({
          id: point.id,
          lat: point.lat,
          lng: point.lng,
          result: {
            success: false,
            confidence: 'low' as const,
            confidenceScore: 0,
            error: `Mapbox API error: ${response.status}`,
          },
        })),
        totalCost: 0,
      }
    }

    const data: MapboxBatchResponse = await response.json()

    // Parse results, matching with input points by index
    const results = points.map((point, index) => {
      const batchResult = data.batch[index]
      
      if (!batchResult?.features || batchResult.features.length === 0) {
        return {
          id: point.id,
          lat: point.lat,
          lng: point.lng,
          result: {
            success: false,
            confidence: 'low' as const,
            confidenceScore: 0,
            error: 'Keine Adresse für diese Koordinaten gefunden',
          },
        }
      }

      return {
        id: point.id,
        lat: point.lat,
        lng: point.lng,
        result: parseFeature(batchResult.features[0]),
      }
    })

    return {
      results,
      totalCost: points.length * COST_PER_REQUEST,
    }

  } catch (error) {
    console.error('Mapbox batch geocoding error:', error)
    
    // Return error for all points
    return {
      results: points.map(point => ({
        id: point.id,
        lat: point.lat,
        lng: point.lng,
        result: {
          success: false,
          confidence: 'low' as const,
          confidenceScore: 0,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      })),
      totalCost: 0,
    }
  }
}

/**
 * Estimate cost for geocoding a number of points.
 */
export function estimateGeocodingCost(pointCount: number): {
  costUsd: number
  costFormatted: string
} {
  const cost = pointCount * COST_PER_REQUEST
  return {
    costUsd: cost,
    costFormatted: cost < 0.01 ? '<$0.01' : `~$${cost.toFixed(2)}`,
  }
}
