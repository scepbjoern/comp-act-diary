/**
 * Batch Geocode Map Component
 * Mapbox GL JS map with polygon drawing for selecting GPS points.
 */

'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Map, { Marker, useMap } from 'react-map-gl/mapbox'
import type { MapRef } from 'react-map-gl/mapbox'
// @ts-expect-error - no types available for mapbox-gl-draw
import MapboxDraw from '@mapbox/mapbox-gl-draw'
import 'mapbox-gl/dist/mapbox-gl.css'
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css'

interface BatchGeocodeMapProps {
  onSelectPoints: (pointIds: string[]) => void
}

interface GpsPoint {
  id: string
  lat: number
  lng: number
  geocodedAt: string | null
}

// Draw control component
function DrawControl({ onPolygonComplete }: { onPolygonComplete: (polygon: GeoJSON.Polygon) => void }) {
  const { current: map } = useMap()

  useEffect(() => {
    if (!map) return

    const draw = new MapboxDraw({
      displayControlsDefault: false,
      controls: {
        polygon: true,
        trash: true,
      },
      defaultMode: 'draw_polygon',
    })

    map.addControl(draw as unknown as mapboxgl.IControl)

    const handleCreate = (e: { features: GeoJSON.Feature[] }) => {
      const feature = e.features[0]
      if (feature?.geometry.type === 'Polygon') {
        onPolygonComplete(feature.geometry as GeoJSON.Polygon)
      }
    }

    const handleUpdate = (e: { features: GeoJSON.Feature[] }) => {
      const feature = e.features[0]
      if (feature?.geometry.type === 'Polygon') {
        onPolygonComplete(feature.geometry as GeoJSON.Polygon)
      }
    }

    map.on('draw.create', handleCreate)
    map.on('draw.update', handleUpdate)

    return () => {
      map.off('draw.create', handleCreate)
      map.off('draw.update', handleUpdate)
      map.removeControl(draw as unknown as mapboxgl.IControl)
    }
  }, [map, onPolygonComplete])

  return null
}

export default function BatchGeocodeMap({ onSelectPoints }: BatchGeocodeMapProps) {
  const mapRef = useRef<MapRef>(null)
  const [points, setPoints] = useState<GpsPoint[]>([])
  const [newestPoint, setNewestPoint] = useState<GpsPoint | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN

  // Load ungeocoded points and find newest point for initial center
  useEffect(() => {
    async function loadPoints() {
      try {
        // Load ungeocoded points
        const res = await fetch('/api/location/raw-points?ungeocodedOnly=true&limit=500')
        if (res.ok) {
          const data = await res.json()
          setPoints(data.points || [])
        }
        
        // Load newest point for map centering
        const newestRes = await fetch('/api/location/raw-points?limit=1&sortBy=newest')
        if (newestRes.ok) {
          const newestData = await newestRes.json()
          if (newestData.points?.length > 0) {
            setNewestPoint(newestData.points[0])
          }
        }
      } catch (err) {
        console.error('Failed to load points:', err)
      } finally {
        setLoading(false)
      }
    }
    loadPoints()
  }, [])

  // Check if point is inside polygon
  const isPointInPolygon = useCallback((lat: number, lng: number, polygon: GeoJSON.Polygon): boolean => {
    const coords = polygon.coordinates[0]
    let inside = false
    for (let i = 0, j = coords.length - 1; i < coords.length; j = i++) {
      const xi = coords[i][0], yi = coords[i][1]
      const xj = coords[j][0], yj = coords[j][1]
      const intersect = ((yi > lat) !== (yj > lat)) &&
        (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi)
      if (intersect) inside = !inside
    }
    return inside
  }, [])

  // Handle polygon selection
  const handlePolygonComplete = useCallback((polygon: GeoJSON.Polygon) => {
    const selected = points.filter(p => 
      isPointInPolygon(p.lat, p.lng, polygon)
    )
    const ids = new Set(selected.map(p => p.id))
    setSelectedIds(ids)
    onSelectPoints(Array.from(ids))
  }, [points, isPointInPolygon, onSelectPoints])

  // Calculate bounds to fit all points
  const bounds = points.length > 0 ? {
    minLng: Math.min(...points.map(p => p.lng)),
    maxLng: Math.max(...points.map(p => p.lng)),
    minLat: Math.min(...points.map(p => p.lat)),
    maxLat: Math.max(...points.map(p => p.lat)),
  } : null

  if (!mapboxToken) {
    return (
      <div className="h-96 bg-base-300 rounded-lg flex items-center justify-center">
        <p className="text-error">NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN nicht konfiguriert</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="h-96 bg-base-300 rounded-lg flex items-center justify-center">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    )
  }

  if (points.length === 0) {
    return (
      <div className="h-96 bg-base-300 rounded-lg flex items-center justify-center">
        <p className="text-base-content/60">Keine ungeokodierten Punkte vorhanden</p>
      </div>
    )
  }

  return (
    <div className="h-96 rounded-lg overflow-hidden">
      <Map
        ref={mapRef}
        mapboxAccessToken={mapboxToken}
        initialViewState={{
          longitude: newestPoint?.lng ?? (bounds ? (bounds.minLng + bounds.maxLng) / 2 : 8.5),
          latitude: newestPoint?.lat ?? (bounds ? (bounds.minLat + bounds.maxLat) / 2 : 47.4),
          zoom: 12,
        }}
        style={{ width: '100%', height: '100%' }}
        mapStyle="mapbox://styles/mapbox/streets-v12"
      >
        <DrawControl onPolygonComplete={handlePolygonComplete} />
        
        {/* Render points as markers */}
        {points.map(point => (
          <Marker
            key={point.id}
            longitude={point.lng}
            latitude={point.lat}
          >
            <div 
              className={`w-3 h-3 rounded-full border-2 border-white shadow ${
                selectedIds.has(point.id) ? 'bg-primary' : 'bg-gray-400'
              }`}
            />
          </Marker>
        ))}
      </Map>
      
      <div className="mt-2 text-sm text-base-content/70">
        {points.length} ungeokodierte Punkte auf der Karte. Zeichne ein Polygon, um Punkte auszuwählen.
        {selectedIds.size > 0 && (
          <span className="ml-2 font-medium text-primary">
            {selectedIds.size} ausgewählt
          </span>
        )}
      </div>
    </div>
  )
}
