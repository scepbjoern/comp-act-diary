/**
 * Point Edit Modal Component
 * Allows manual correction of failed geocodes:
 * - View error reason
 * - Drag point to new position
 * - Select from nearby POIs
 * - Manual naming
 */

'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { IconX, IconMapPin, IconRefresh, IconCheck, IconGripVertical } from '@tabler/icons-react'
import dynamic from 'next/dynamic'

const Map = dynamic(
  () => import('react-map-gl/mapbox').then(mod => mod.default),
  { ssr: false }
)

const Marker = dynamic(
  () => import('react-map-gl/mapbox').then(mod => mod.Marker),
  { ssr: false }
)

interface NearbyPoi {
  name: string
  address: string
  distance: number
  lat: number
  lng: number
}

interface PointEditModalProps {
  pointId: string
  initialLat: number
  initialLng: number
  initialName?: string
  initialAddress?: string
  error?: string
  onClose: () => void
  onSave: (result: { name: string; address?: string; lat: number; lng: number }) => void
}

export default function PointEditModal({
  pointId,
  initialLat,
  initialLng,
  initialName,
  initialAddress,
  error,
  onClose,
  onSave,
}: PointEditModalProps) {
  const [lat, setLat] = useState(initialLat)
  const [lng, setLng] = useState(initialLng)
  const [name, setName] = useState(initialName || '')
  const [address, setAddress] = useState(initialAddress || '')
  const [nearbyPois, setNearbyPois] = useState<NearbyPoi[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'move' | 'nearby' | 'manual'>('move')
  const [isDragging, setIsDragging] = useState(false)
  const _mapRef = useRef<mapboxgl.Map | null>(null)

  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN
  
  // Load nearby POIs
  const loadNearbyPois = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/location/point/${pointId}?includeNearby=true`)
      if (res.ok) {
        const data = await res.json()
        setNearbyPois(data.nearbyPois || [])
      }
    } catch (err) {
      console.error('Failed to load nearby POIs:', err)
    } finally {
      setLoading(false)
    }
  }, [pointId])

  useEffect(() => {
    if (activeTab === 'nearby') {
      loadNearbyPois()
    }
  }, [activeTab, loadNearbyPois])

  // Handle marker drag
  const onMarkerDragEnd = useCallback((event: { lngLat: { lng: number; lat: number } }) => {
    setLat(event.lngLat.lat)
    setLng(event.lngLat.lng)
    setIsDragging(false)
  }, [])

  // Move and re-geocode
  const handleMoveAndGeocode = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/location/point/${pointId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'move', lat, lng }),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.result) {
          onSave({
            name: data.result.name || 'Unbenannt',
            address: data.result.address,
            lat,
            lng,
          })
        }
      }
    } catch (err) {
      console.error('Failed to move point:', err)
    } finally {
      setSaving(false)
    }
  }

  // Select nearby POI
  const handleSelectPoi = async (poi: NearbyPoi) => {
    setSaving(true)
    try {
      const res = await fetch(`/api/location/point/${pointId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'move',
          lat: poi.lat,
          lng: poi.lng,
        }),
      })
      if (res.ok) {
        onSave({
          name: poi.name,
          address: poi.address,
          lat: poi.lat,
          lng: poi.lng,
        })
      }
    } catch (err) {
      console.error('Failed to select POI:', err)
    } finally {
      setSaving(false)
    }
  }

  // Manual rename
  const handleManualRename = async () => {
    if (!name.trim()) return

    setSaving(true)
    try {
      const res = await fetch(`/api/location/point/${pointId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'rename', name: name.trim(), address: address.trim() || null }),
      })
      if (res.ok) {
        onSave({
          name: name.trim(),
          address: address.trim() || undefined,
          lat: initialLat,
          lng: initialLng,
        })
      }
    } catch (err) {
      console.error('Failed to rename point:', err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-2xl">
        <button
          className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
          onClick={onClose}
        >
          <IconX className="w-4 h-4" />
        </button>

        <h3 className="font-bold text-lg mb-2">Punkt korrigieren</h3>

        {/* Error display */}
        {error && (
          <div className="alert alert-error mb-4">
            <IconX className="w-5 h-5" />
            <div>
              <p className="font-medium">Geocoding fehlgeschlagen</p>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="tabs tabs-boxed mb-4">
          <button
            className={`tab ${activeTab === 'move' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('move')}
          >
            <IconGripVertical className="w-4 h-4 mr-1" />
            Verschieben
          </button>
          <button
            className={`tab ${activeTab === 'nearby' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('nearby')}
          >
            <IconMapPin className="w-4 h-4 mr-1" />
            In der Nähe
          </button>
          <button
            className={`tab ${activeTab === 'manual' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('manual')}
          >
            <IconCheck className="w-4 h-4 mr-1" />
            Manuell
          </button>
        </div>

        {/* Move tab - Drag marker on map */}
        {activeTab === 'move' && (
          <div className="space-y-4">
            <p className="text-sm text-base-content/70">
              Ziehe den Marker an die richtige Position und klicke auf &quot;Neu geocodieren&quot;.
            </p>

            {mapboxToken ? (
              <div className="h-64 rounded-lg overflow-hidden border border-base-300">
                <Map
                  mapboxAccessToken={mapboxToken}
                  initialViewState={{
                    longitude: lng,
                    latitude: lat,
                    zoom: 17,
                  }}
                  style={{ width: '100%', height: '100%' }}
                  mapStyle="mapbox://styles/mapbox/streets-v12"
                >
                  <Marker
                    longitude={lng}
                    latitude={lat}
                    draggable
                    onDragStart={() => setIsDragging(true)}
                    onDragEnd={onMarkerDragEnd}
                  >
                    <div
                      className={`w-8 h-8 rounded-full border-4 border-white shadow-lg flex items-center justify-center cursor-grab ${
                        isDragging ? 'bg-primary scale-125' : 'bg-error'
                      } transition-all`}
                    >
                      <IconMapPin className="w-4 h-4 text-white" />
                    </div>
                  </Marker>
                </Map>
              </div>
            ) : (
              <div className="h-64 bg-base-300 rounded-lg flex items-center justify-center">
                <p className="text-error">Mapbox Token nicht konfiguriert</p>
              </div>
            )}

            <div className="text-xs text-base-content/50">
              Neue Koordinaten: {lat.toFixed(6)}, {lng.toFixed(6)}
            </div>

            <button
              className="btn btn-primary w-full"
              onClick={handleMoveAndGeocode}
              disabled={saving || (lat === initialLat && lng === initialLng)}
            >
              {saving ? (
                <span className="loading loading-spinner loading-sm" />
              ) : (
                <>
                  <IconRefresh className="w-4 h-4" />
                  Neu geocodieren
                </>
              )}
            </button>
          </div>
        )}

        {/* Nearby tab - Show nearby POIs */}
        {activeTab === 'nearby' && (
          <div className="space-y-4">
            <p className="text-sm text-base-content/70">
              Wähle einen nahegelegenen Ort aus:
            </p>

            {loading ? (
              <div className="flex justify-center py-8">
                <span className="loading loading-spinner loading-md" />
              </div>
            ) : nearbyPois.length === 0 ? (
              <div className="text-center py-8 text-base-content/50">
                Keine POIs in der Nähe gefunden
              </div>
            ) : (
              <div className="space-y-2">
                {nearbyPois.map((poi, index) => (
                  <button
                    key={index}
                    className="w-full p-3 bg-base-200 hover:bg-base-300 rounded-lg text-left transition-colors"
                    onClick={() => handleSelectPoi(poi)}
                    disabled={saving}
                  >
                    <div className="flex items-start gap-3">
                      <IconMapPin className="w-5 h-5 text-primary mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{poi.name}</p>
                        {poi.address && (
                          <p className="text-sm text-base-content/60 truncate">{poi.address}</p>
                        )}
                        <p className="text-xs text-base-content/40">~{poi.distance}m entfernt</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            <button
              className="btn btn-ghost btn-sm w-full"
              onClick={loadNearbyPois}
              disabled={loading}
            >
              <IconRefresh className="w-4 h-4" />
              Neu laden
            </button>
          </div>
        )}

        {/* Manual tab - Enter name manually */}
        {activeTab === 'manual' && (
          <div className="space-y-4">
            <p className="text-sm text-base-content/70">
              Gib einen Namen und optional eine Adresse manuell ein:
            </p>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Name *</span>
              </label>
              <input
                type="text"
                className="input input-bordered"
                placeholder="z.B. Mein Lieblingscafé"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Adresse (optional)</span>
              </label>
              <input
                type="text"
                className="input input-bordered"
                placeholder="z.B. Musterstraße 123, 12345 Musterstadt"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>

            <button
              className="btn btn-primary w-full"
              onClick={handleManualRename}
              disabled={saving || !name.trim()}
            >
              {saving ? (
                <span className="loading loading-spinner loading-sm" />
              ) : (
                <>
                  <IconCheck className="w-4 h-4" />
                  Speichern
                </>
              )}
            </button>
          </div>
        )}
      </div>
      <div className="modal-backdrop bg-black/50" onClick={onClose} />
    </div>
  )
}
