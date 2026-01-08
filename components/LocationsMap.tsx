/**
 * LocationsMap Component
 * Mapbox map showing all locations with interactive markers.
 */

'use client'

import { useRef, useMemo, useCallback, useEffect, useState } from 'react'
import Map, { Marker, Popup, MapRef } from 'react-map-gl/mapbox'
import { IconMapPin } from '@tabler/icons-react'
import 'mapbox-gl/dist/mapbox-gl.css'

interface Location {
  id: string
  name: string
  slug: string
  lat: number | null
  lng: number | null
  address: string | null
  city: string | null
  country: string | null
  poiType: string | null
  isFavorite: boolean
  notes: string | null
  _count?: {
    visits: number
  }
}

interface LocationsMapProps {
  locations: Location[]
  selectedId: string | null
  onSelect: (location: Location) => void
}

const POI_COLORS: Record<string, string> = {
  HOME: '#4ade80',
  WORK: '#60a5fa',
  RESTAURANT: '#f97316',
  CAFE: '#a855f7',
  SHOP: '#eab308',
  ENTERTAINMENT: '#ec4899',
  SPORT: '#ef4444',
  NATURE: '#22c55e',
  TRANSPORT: '#64748b',
  ACCOMMODATION: '#8b5cf6',
  EDUCATION: '#14b8a6',
  HEALTH: '#f43f5e',
  FINANCE: '#84cc16',
  OTHER: '#94a3b8',
}

export default function LocationsMap({ locations, selectedId, onSelect }: LocationsMapProps) {
  const mapRef = useRef<MapRef>(null)
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN
  const [popupInfo, setPopupInfo] = useState<Location | null>(null)

  // Filter locations with valid coordinates
  const validLocations = useMemo(() => 
    locations.filter(loc => loc.lat !== null && loc.lng !== null),
    [locations]
  )

  // Calculate bounds for all locations
  const bounds = useMemo(() => {
    if (validLocations.length === 0) return null

    const lngs = validLocations.map(loc => loc.lng!)
    const lats = validLocations.map(loc => loc.lat!)

    return {
      minLng: Math.min(...lngs),
      maxLng: Math.max(...lngs),
      minLat: Math.min(...lats),
      maxLat: Math.max(...lats),
      center: {
        lng: (Math.min(...lngs) + Math.max(...lngs)) / 2,
        lat: (Math.min(...lats) + Math.max(...lats)) / 2,
      },
    }
  }, [validLocations])

  // Fit map to bounds on initial load
  const onMapLoad = useCallback(() => {
    if (mapRef.current && bounds && validLocations.length > 1) {
      mapRef.current.fitBounds(
        [
          [bounds.minLng, bounds.minLat],
          [bounds.maxLng, bounds.maxLat],
        ],
        { padding: 50, maxZoom: 14, duration: 0 }
      )
    }
  }, [bounds, validLocations.length])

  // Fly to selected location
  useEffect(() => {
    if (!selectedId || !mapRef.current) return

    const location = validLocations.find(loc => loc.id === selectedId)
    if (location && location.lat && location.lng) {
      mapRef.current.flyTo({
        center: [location.lng, location.lat],
        zoom: 16,
        duration: 1000,
      })
      setPopupInfo(location)
    }
  }, [selectedId, validLocations])

  // Get marker color based on POI type
  const getMarkerColor = useCallback((poiType: string | null) => {
    return POI_COLORS[poiType || 'OTHER'] || POI_COLORS.OTHER
  }, [])

  if (!mapboxToken) {
    return (
      <div className="h-full bg-base-300 rounded-lg flex items-center justify-center">
        <p className="text-error text-sm">NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN nicht konfiguriert</p>
      </div>
    )
  }

  if (validLocations.length === 0) {
    return (
      <div className="h-full bg-base-300 rounded-lg flex items-center justify-center">
        <p className="text-base-content/60 text-sm">Keine Orte mit Koordinaten vorhanden</p>
      </div>
    )
  }

  return (
    <div className="h-full rounded-lg overflow-hidden">
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
        {validLocations.map((location) => (
          <Marker
            key={location.id}
            longitude={location.lng!}
            latitude={location.lat!}
            onClick={(e) => {
              e.originalEvent.stopPropagation()
              onSelect(location)
              setPopupInfo(location)
            }}
          >
            <div
              className={`
                w-6 h-6 rounded-full border-2 shadow-lg flex items-center justify-center cursor-pointer
                transition-transform duration-200
                ${selectedId === location.id ? 'scale-125 border-white' : 'border-white/70'}
              `}
              style={{ backgroundColor: getMarkerColor(location.poiType) }}
            >
              <IconMapPin className="w-3 h-3 text-white" />
            </div>
          </Marker>
        ))}

        {popupInfo && popupInfo.lat && popupInfo.lng && (
          <Popup
            longitude={popupInfo.lng}
            latitude={popupInfo.lat}
            onClose={() => setPopupInfo(null)}
            closeButton={true}
            closeOnClick={false}
            anchor="bottom"
            offset={15}
          >
            <div className="p-1 min-w-32">
              <p className="font-medium text-sm">{popupInfo.name}</p>
              {popupInfo.address && (
                <p className="text-xs text-gray-600 mt-1">{popupInfo.address}</p>
              )}
              {popupInfo.city && (
                <p className="text-xs text-gray-500">{popupInfo.city}</p>
              )}
            </div>
          </Popup>
        )}
      </Map>
    </div>
  )
}
