/**
 * PointPreviewMap Component
 * Shows a single point on a map with a marker.
 * Re-centers when lat/lng props change.
 */

'use client'

import { useEffect, useState } from 'react'
import { Map, Marker } from 'react-map-gl/mapbox'
import 'mapbox-gl/dist/mapbox-gl.css'

interface PointPreviewMapProps {
  lat: number
  lng: number
  name?: string
}

interface ViewState {
  longitude: number
  latitude: number
  zoom: number
}

export default function PointPreviewMap({ lat, lng, name }: PointPreviewMapProps) {
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN
  
  const [viewState, setViewState] = useState<ViewState>({
    longitude: lng,
    latitude: lat,
    zoom: 16,
  })

  // Re-center map when lat/lng props change
  useEffect(() => {
    setViewState(prev => ({
      ...prev,
      longitude: lng,
      latitude: lat,
    }))
  }, [lat, lng])

  if (!mapboxToken) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-base-300">
        <p className="text-error">Mapbox Token nicht konfiguriert</p>
      </div>
    )
  }

  return (
    <Map
      mapboxAccessToken={mapboxToken}
      {...viewState}
      onMove={evt => setViewState(evt.viewState)}
      style={{ width: '100%', height: '100%' }}
      mapStyle="mapbox://styles/mapbox/streets-v12"
      attributionControl={false}
    >
      <Marker longitude={lng} latitude={lat} anchor="bottom">
        <div className="flex flex-col items-center">
          <div className="bg-primary text-primary-content px-2 py-1 rounded text-xs font-medium shadow-lg max-w-48 truncate">
            {name || 'Punkt'}
          </div>
          <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-primary" />
          <div className="w-3 h-3 bg-primary rounded-full shadow-lg mt-[-2px]" />
        </div>
      </Marker>
    </Map>
  )
}
