/**
 * Day Map View Component
 * Mapbox GL JS map showing locations and GPS points for a specific day.
 */

'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import Map, { Marker, Popup, MapRef } from 'react-map-gl/mapbox'
import { IconMapPin } from '@tabler/icons-react'
import 'mapbox-gl/dist/mapbox-gl.css'

interface LocationVisit {
  id: string
  arrivedAt: string | null
  departedAt: string | null
  location: {
    id: string
    name: string
    lat: number | null
    lng: number | null
    poiType: string | null
  }
}

interface RawGpsPoint {
  id: string
  lat: number
  lng: number
  capturedAt: string
  geocodedAt: string | null
  geocodedName: string | null
  location: {
    id: string
    name: string
  } | null
}

interface DayMapViewProps {
  date: string // Format: YYYY-MM-DD
  visits?: LocationVisit[]
  onPointClick?: (pointId: string) => void
}

// POI type colors
const POI_COLORS: Record<string, string> = {
  HOME: '#4ade80',     // green
  WORK: '#60a5fa',     // blue
  RESTAURANT: '#f97316', // orange
  SHOP: '#a855f7',     // purple
  LANDMARK: '#eab308', // yellow
  TRANSPORT: '#64748b', // slate
  NATURE: '#22c55e',   // green
  SPORT: '#ef4444',    // red
  HEALTH: '#ec4899',   // pink
  OTHER: '#94a3b8',    // gray
}

export default function DayMapView({ date, visits = [], onPointClick }: DayMapViewProps) {
  const [rawPoints, setRawPoints] = useState<RawGpsPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPoint, setSelectedPoint] = useState<RawGpsPoint | null>(null)
  const [selectedVisit, setSelectedVisit] = useState<LocationVisit | null>(null)

  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN

  // Load raw GPS points for this day
  useEffect(() => {
    async function loadPoints() {
      try {
        const res = await fetch(`/api/location/raw-points?date=${date}`)
        if (res.ok) {
          const data = await res.json()
          setRawPoints(data.points || [])
        }
      } catch (err) {
        console.error('Failed to load GPS points:', err)
      } finally {
        setLoading(false)
      }
    }
    loadPoints()
  }, [date])

  const mapRef = useRef<MapRef>(null)

  // Calculate map bounds from all points
  const bounds = useMemo(() => {
    const allPoints: { lat: number; lng: number }[] = []

    // Add visit locations
    visits.forEach(v => {
      if (v.location.lat && v.location.lng) {
        allPoints.push({ lat: v.location.lat, lng: v.location.lng })
      }
    })

    // Add raw points
    rawPoints.forEach(p => {
      allPoints.push({ lat: p.lat, lng: p.lng })
    })

    if (allPoints.length === 0) return null

    const minLng = Math.min(...allPoints.map(p => p.lng))
    const maxLng = Math.max(...allPoints.map(p => p.lng))
    const minLat = Math.min(...allPoints.map(p => p.lat))
    const maxLat = Math.max(...allPoints.map(p => p.lat))

    return {
      minLng,
      maxLng,
      minLat,
      maxLat,
      center: {
        lng: (minLng + maxLng) / 2,
        lat: (minLat + maxLat) / 2,
      },
    }
  }, [visits, rawPoints])

  // Fit map to bounds when data loads
  const onMapLoad = useCallback(() => {
    if (mapRef.current && bounds) {
      mapRef.current.fitBounds(
        [
          [bounds.minLng, bounds.minLat],
          [bounds.maxLng, bounds.maxLat],
        ],
        { padding: 50, maxZoom: 16, duration: 0 }
      )
    }
  }, [bounds])

  // Format time
  function formatTime(dateStr: string | null): string {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleTimeString('de-CH', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  // Get marker color
  function getMarkerColor(poiType: string | null): string {
    return POI_COLORS[poiType || 'OTHER'] || POI_COLORS.OTHER
  }

  if (!mapboxToken) {
    return (
      <div className="h-64 bg-base-300 rounded-lg flex items-center justify-center">
        <p className="text-error text-sm">NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN nicht konfiguriert</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="h-64 bg-base-300 rounded-lg flex items-center justify-center">
        <span className="loading loading-spinner loading-md"></span>
      </div>
    )
  }

  const hasData = visits.length > 0 || rawPoints.length > 0

  if (!hasData) {
    return (
      <div className="h-64 bg-base-300 rounded-lg flex items-center justify-center">
        <p className="text-base-content/60 text-sm">Keine Standortdaten für diesen Tag</p>
      </div>
    )
  }

  return (
    <div className="h-64 rounded-lg overflow-hidden">
      <Map
        ref={mapRef}
        mapboxAccessToken={mapboxToken}
        initialViewState={{
          longitude: bounds?.center.lng ?? 8.5,
          latitude: bounds?.center.lat ?? 47.4,
          zoom: 10,
        }}
        onLoad={onMapLoad}
        style={{ width: '100%', height: '100%' }}
        mapStyle="mapbox://styles/mapbox/streets-v12"
      >
        {/* Known location markers */}
        {visits.map(visit => {
          if (!visit.location.lat || !visit.location.lng) return null
          return (
            <Marker
              key={visit.id}
              longitude={visit.location.lng}
              latitude={visit.location.lat}
              onClick={(e) => {
                e.originalEvent.stopPropagation()
                setSelectedVisit(visit)
                setSelectedPoint(null)
              }}
            >
              <div 
                className="w-6 h-6 rounded-full border-2 border-white shadow-lg flex items-center justify-center cursor-pointer"
                style={{ backgroundColor: getMarkerColor(visit.location.poiType) }}
              >
                <IconMapPin className="w-3 h-3 text-white" />
              </div>
            </Marker>
          )
        })}

        {/* Raw GPS point markers (unassigned) */}
        {rawPoints
          .filter(p => !p.location)
          .map(point => (
            <Marker
              key={point.id}
              longitude={point.lng}
              latitude={point.lat}
              onClick={(e) => {
                e.originalEvent.stopPropagation()
                setSelectedPoint(point)
                setSelectedVisit(null)
              }}
            >
              <div 
                className={`w-4 h-4 rounded-full border-2 border-white shadow cursor-pointer ${
                  point.geocodedAt ? 'bg-warning' : 'bg-gray-400'
                }`}
              />
            </Marker>
          ))}

        {/* Visit popup */}
        {selectedVisit && selectedVisit.location.lat && selectedVisit.location.lng && (
          <Popup
            longitude={selectedVisit.location.lng}
            latitude={selectedVisit.location.lat}
            onClose={() => setSelectedVisit(null)}
            closeButton={true}
            closeOnClick={false}
          >
            <div className="p-1">
              <p className="font-medium">{selectedVisit.location.name}</p>
              <p className="text-xs text-gray-600">
                {formatTime(selectedVisit.arrivedAt)} - {formatTime(selectedVisit.departedAt)}
              </p>
            </div>
          </Popup>
        )}

        {/* Point popup */}
        {selectedPoint && (
          <Popup
            longitude={selectedPoint.lng}
            latitude={selectedPoint.lat}
            onClose={() => setSelectedPoint(null)}
            closeButton={true}
            closeOnClick={false}
          >
            <div className="p-1">
              {selectedPoint.geocodedName ? (
                <p className="font-medium">{selectedPoint.geocodedName}</p>
              ) : (
                <p className="font-mono text-xs">
                  {selectedPoint.lat.toFixed(4)}, {selectedPoint.lng.toFixed(4)}
                </p>
              )}
              <p className="text-xs text-gray-600">
                {formatTime(selectedPoint.capturedAt)}
              </p>
              {!selectedPoint.geocodedAt && onPointClick && (
                <button
                  className="btn btn-xs btn-primary mt-1"
                  onClick={() => {
                    onPointClick(selectedPoint.id)
                    setSelectedPoint(null)
                  }}
                >
                  Geocoden
                </button>
              )}
            </div>
          </Popup>
        )}
      </Map>
    </div>
  )
}
