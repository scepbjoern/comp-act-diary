/**
 * Locations Management Page
 * View and manage all saved locations with map integration.
 */

'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { IconSearch, IconFilter, IconMapPin } from '@tabler/icons-react'
import dynamic from 'next/dynamic'
import LocationsTable from '@/components/features/locations/LocationsTable'

const LocationsMap = dynamic(
  () => import('@/components/features/locations/LocationsMap'),
  { ssr: false, loading: () => <div className="h-full bg-base-300 animate-pulse rounded-lg" /> }
)

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

const POI_TYPES = [
  { value: '', label: 'Alle Typen' },
  { value: 'HOME', label: 'Zuhause' },
  { value: 'WORK', label: 'Arbeit' },
  { value: 'RESTAURANT', label: 'Restaurant' },
  { value: 'CAFE', label: 'Café' },
  { value: 'SHOP', label: 'Geschäft' },
  { value: 'ENTERTAINMENT', label: 'Unterhaltung' },
  { value: 'SPORT', label: 'Sport' },
  { value: 'NATURE', label: 'Natur' },
  { value: 'TRANSPORT', label: 'Transport' },
  { value: 'ACCOMMODATION', label: 'Unterkunft' },
  { value: 'EDUCATION', label: 'Bildung' },
  { value: 'HEALTH', label: 'Gesundheit' },
  { value: 'FINANCE', label: 'Finanzen' },
  { value: 'OTHER', label: 'Sonstiges' },
]

export default function LocationsPage() {
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [poiType, setPoiType] = useState('')
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const tableRef = useRef<HTMLDivElement>(null)

  // Load locations
  const loadLocations = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (poiType) params.set('poiType', poiType)
      if (favoritesOnly) params.set('favoritesOnly', 'true')

      const res = await fetch(`/api/locations?${params}`)
      if (res.ok) {
        const data = await res.json()
        setLocations(data.locations || [])
      }
    } catch (err) {
      console.error('Failed to load locations:', err)
    } finally {
      setLoading(false)
    }
  }, [search, poiType, favoritesOnly])

  useEffect(() => {
    void loadLocations()
  }, [loadLocations])

  // Handle location selection from table
  const handleSelectFromTable = useCallback((location: Location) => {
    setSelectedId(location.id)
  }, [])

  // Handle location selection from map
  const handleSelectFromMap = useCallback((location: Location) => {
    setSelectedId(location.id)
    // Scroll to row in table
    if (tableRef.current) {
      const row = tableRef.current.querySelector(`tr[data-id="${location.id}"]`)
      row?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [])

  // Update location
  const handleUpdate = useCallback(async (id: string, data: Partial<Location>) => {
    const res = await fetch(`/api/locations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    if (res.ok) {
      const { location } = await res.json()
      setLocations(prev => prev.map(loc => loc.id === id ? { ...loc, ...location } : loc))
    } else {
      const error = await res.json()
      alert(error.error || 'Fehler beim Aktualisieren')
    }
  }, [])

  // Delete location
  const handleDelete = useCallback(async (id: string) => {
    const res = await fetch(`/api/locations/${id}`, { method: 'DELETE' })

    if (res.ok) {
      setLocations(prev => prev.filter(loc => loc.id !== id))
      if (selectedId === id) setSelectedId(null)
    } else {
      const error = await res.json()
      alert(error.error || 'Fehler beim Löschen')
    }
  }, [selectedId])

  // Geocode location
  const handleGeocode = useCallback(async (id: string) => {
    const res = await fetch(`/api/locations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'geocode' }),
    })

    if (res.ok) {
      const { location } = await res.json()
      setLocations(prev => prev.map(loc => loc.id === id ? { ...loc, ...location } : loc))
    } else {
      const error = await res.json()
      alert(error.error || 'Geocoding fehlgeschlagen')
    }
  }, [])

  // Filter locations locally for immediate feedback
  const filteredLocations = locations.filter(loc => {
    if (search) {
      const searchLower = search.toLowerCase()
      const matches = 
        loc.name.toLowerCase().includes(searchLower) ||
        loc.address?.toLowerCase().includes(searchLower) ||
        loc.city?.toLowerCase().includes(searchLower)
      if (!matches) return false
    }
    if (poiType && loc.poiType !== poiType) return false
    if (favoritesOnly && !loc.isFavorite) return false
    return true
  })

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <IconMapPin className="w-6 h-6" />
          Orte verwalten
        </h1>
        <span className="text-base-content/60">
          {filteredLocations.length} von {locations.length} Orte
        </span>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="join">
          <span className="join-item btn btn-ghost btn-sm">
            <IconSearch className="w-4 h-4" />
          </span>
          <input
            type="text"
            className="input input-sm input-bordered join-item w-64"
            placeholder="Suche nach Name, Adresse..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="join">
          <span className="join-item btn btn-ghost btn-sm">
            <IconFilter className="w-4 h-4" />
          </span>
          <select
            className="select select-sm select-bordered join-item"
            value={poiType}
            onChange={(e) => setPoiType(e.target.value)}
          >
            {POI_TYPES.map(type => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            className="w-4 h-4 accent-primary"
            checked={favoritesOnly}
            onChange={(e) => setFavoritesOnly(e.target.checked)}
          />
          <span className="text-sm">Nur Favoriten</span>
        </label>
      </div>

      {/* Main content: Map + Table stacked */}
      <div className="flex flex-col gap-6">
        {/* Map */}
        <div className="h-80">
          <LocationsMap
            locations={filteredLocations}
            selectedId={selectedId}
            onSelect={handleSelectFromMap}
          />
        </div>

        {/* Table */}
        <div className="max-h-[500px] overflow-auto" ref={tableRef}>
          <LocationsTable
            locations={filteredLocations}
            selectedId={selectedId}
            onSelect={handleSelectFromTable}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
            onGeocode={handleGeocode}
            loading={loading}
          />
        </div>
      </div>
    </div>
  )
}
