/**
 * Day Location Panel Component
 * Shows locations visited on a specific day with both known locations and raw GPS points.
 * Includes toggle between list view and map view.
 */

'use client'

import { useState, useEffect, useMemo } from 'react'
import { IconMapPin, IconMapPinOff, IconClock, IconChevronDown, IconChevronUp, IconList, IconMap } from '@tabler/icons-react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { useReadMode } from '@/hooks/useReadMode'

// Dynamic import for map (SSR incompatible)
const DayMapView = dynamic(
  () => import('@/components/features/day/DayMapView'),
  { ssr: false, loading: () => <div className="h-64 bg-base-300 animate-pulse rounded-lg" /> }
)

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
  geocodedAddress: string | null
  locationId: string | null
  location: {
    id: string
    name: string
    poiType: string | null
  } | null
}

interface GroupedPoint {
  lat: number
  lng: number
  coordKey: string
  points: RawGpsPoint[]
  firstTime: string
  lastTime: string
  geocodedName: string | null
  geocodedAddress: string | null
  isGeocoded: boolean
  hasLocation: boolean
}

interface DayLocationPanelProps {
  date: string // Format: YYYY-MM-DD
}

// POI type icons
const POI_ICONS: Record<string, string> = {
  HOME: '🏠',
  WORK: '💼',
  RESTAURANT: '🍽️',
  SHOP: '🛒',
  LANDMARK: '🏛️',
  TRANSPORT: '🚉',
  NATURE: '🌳',
  SPORT: '🏃',
  HEALTH: '🏥',
  OTHER: '📍',
}

export default function DayLocationPanel({ date }: DayLocationPanelProps) {
  const { readMode } = useReadMode()
  const router = useRouter()
  const [expanded, setExpanded] = useState(true)
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list')
  const [rawPoints, setRawPoints] = useState<RawGpsPoint[]>([])
  const [visits, setVisits] = useState<LocationVisit[]>([])
  const [loading, setLoading] = useState(true)

  // Reset to list view when date changes (cost optimization - don't load map for new day)
  useEffect(() => {
    setViewMode('list')
    setLoading(true)
  }, [date])

  // Load location data for this day
  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch(`/api/location/day?date=${date}`)
        if (res.ok) {
          const data = await res.json()
          setRawPoints([...(data.geocodedPoints || []), ...(data.ungeocodedPoints || [])])
          setVisits(data.visits || [])
        }
      } catch (err) {
        console.error('Failed to load location data:', err)
      } finally {
        setLoading(false)
      }
    }
    void loadData()
  }, [date])

  // Group points by coordinates (within ~10m precision)
  const groupedPoints = useMemo(() => {
    const groups = new Map<string, GroupedPoint>()
    
    for (const point of rawPoints) {
      // Round to ~10m precision for grouping
      const latKey = point.lat.toFixed(4)
      const lngKey = point.lng.toFixed(4)
      const coordKey = `${latKey},${lngKey}`
      
      if (!groups.has(coordKey)) {
        groups.set(coordKey, {
          lat: point.lat,
          lng: point.lng,
          coordKey,
          points: [],
          firstTime: point.capturedAt,
          lastTime: point.capturedAt,
          geocodedName: point.geocodedName,
          geocodedAddress: point.geocodedAddress,
          isGeocoded: Boolean(point.geocodedAt),
          hasLocation: Boolean(point.locationId) && Boolean(point.location),
        })
      }
      
      const group = groups.get(coordKey)!
      group.points.push(point)
      
      // Update time range
      if (new Date(point.capturedAt) < new Date(group.firstTime)) {
        group.firstTime = point.capturedAt
      }
      if (new Date(point.capturedAt) > new Date(group.lastTime)) {
        group.lastTime = point.capturedAt
      }
      
      // Update geocoded info if any point has it
      if (point.geocodedAt) {
        group.isGeocoded = true
        group.geocodedName = point.geocodedName || group.geocodedName
        group.geocodedAddress = point.geocodedAddress || group.geocodedAddress
      }
      if (point.locationId || point.location) {
        group.hasLocation = true
      }
    }
    
    return Array.from(groups.values()).sort(
      (a, b) => new Date(a.firstTime).getTime() - new Date(b.firstTime).getTime()
    )
  }, [rawPoints])

  // Separate by status
  const ungeocodedGroups = groupedPoints.filter(g => !g.isGeocoded)
  const geocodedGroups = groupedPoints.filter(g => g.isGeocoded && !g.hasLocation)
  const _assignedGroups = groupedPoints.filter(g => g.hasLocation)

  // Get all ungeocoded point IDs for batch geocoding
  const ungeocodedPointIds = useMemo(() => {
    return ungeocodedGroups.flatMap(g => g.points.map(p => p.id))
  }, [ungeocodedGroups])

  // Format time
  function formatTime(dateStr: string | null): string {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleTimeString('de-CH', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  // Get POI icon
  function getPoiIcon(poiType: string | null): string {
    return POI_ICONS[poiType || 'OTHER'] || POI_ICONS.OTHER
  }

  // Navigate to batch geocode with point IDs
  function handleBatchGeocode() {
    if (ungeocodedPointIds.length > 0) {
      sessionStorage.setItem('batchGeocodePointIds', JSON.stringify(ungeocodedPointIds))
      router.push('/batch/geocode?fromDay=' + date)
    }
  }

  const hasData = visits.length > 0 || rawPoints.length > 0
  const totalUngeocodedRawPoints = ungeocodedGroups.reduce((sum, g) => sum + g.points.length, 0)

  return (
    <div className="card bg-base-200">
      <div 
        className="card-body p-4 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <h3 className="card-title text-base flex items-center gap-2">
            <IconMapPin className="w-5 h-5" />
            Standorte
            {ungeocodedGroups.length > 0 && (
              <span className="badge badge-warning badge-sm">
                {ungeocodedGroups.length} ungeokodiert
              </span>
            )}
          </h3>
          <div className="flex items-center gap-2">
            {expanded && hasData && (
              <div className="btn-group" onClick={e => e.stopPropagation()}>
                <button
                  className={`btn btn-xs ${viewMode === 'list' ? 'btn-active' : ''}`}
                  onClick={() => setViewMode('list')}
                  title="Listenansicht"
                >
                  <IconList className="w-4 h-4" />
                </button>
                <button
                  className={`btn btn-xs ${viewMode === 'map' ? 'btn-active' : ''}`}
                  onClick={() => setViewMode('map')}
                  title="Kartenansicht"
                >
                  <IconMap className="w-4 h-4" />
                </button>
              </div>
            )}
            {expanded ? (
              <IconChevronUp className="w-5 h-5" />
            ) : (
              <IconChevronDown className="w-5 h-5" />
            )}
          </div>
        </div>
      </div>

      {expanded && (
        <div className="card-body pt-0 px-4 pb-4">
          {loading ? (
            <div className="flex justify-center py-4">
              <span className="loading loading-spinner loading-sm"></span>
            </div>
          ) : !hasData ? (
            <p className="text-sm text-base-content/60">
              Keine Standortdaten für diesen Tag
            </p>
          ) : viewMode === 'map' ? (
            /* Map View */
            <DayMapView date={date} visits={visits} />
          ) : (
            /* List View */
            <div className="space-y-2">
              {/* Known location visits */}
              {visits.map(visit => (
                <div 
                  key={visit.id}
                  className="flex items-center gap-3 p-2 bg-base-100 rounded-lg"
                >
                  <span className="text-lg">
                    {getPoiIcon(visit.location.poiType)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{visit.location.name}</p>
                    <p className="text-xs text-base-content/60 flex items-center gap-1">
                      <IconClock className="w-3 h-3" />
                      {formatTime(visit.arrivedAt)} - {formatTime(visit.departedAt)}
                    </p>
                  </div>
                </div>
              ))}

              {/* Geocoded points without location assignment (grouped) */}
              {geocodedGroups.map(group => (
                <div 
                  key={group.coordKey}
                  className="flex items-center gap-3 p-2 bg-base-100 rounded-lg border-l-2 border-success"
                >
                  <span className="text-lg">✅</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {group.geocodedName || 'Unbenannt'}
                      {group.points.length > 1 && (
                        <span className="text-xs text-base-content/50 ml-1">
                          ({group.points.length} Punkte)
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-base-content/60 flex items-center gap-1">
                      <IconClock className="w-3 h-3" />
                      {formatTime(group.firstTime)}
                      {group.firstTime !== group.lastTime && ` - ${formatTime(group.lastTime)}`}
                    </p>
                    {group.geocodedAddress && (
                      <p className="text-xs text-base-content/50 truncate">
                        {group.geocodedAddress}
                      </p>
                    )}
                  </div>
                  <span className="badge badge-success badge-xs">Geocodiert</span>
                </div>
              ))}

              {/* Ungeocoded points (grouped) */}
              {ungeocodedGroups.length > 0 && (
                <div className="mt-3 pt-3 border-t border-base-300">
                  <p className="text-sm text-base-content/60 mb-2 flex items-center gap-1">
                    <IconMapPinOff className="w-4 h-4" />
                    {ungeocodedGroups.length} ungeokodierte Ort{ungeocodedGroups.length !== 1 && 'e'}
                    {totalUngeocodedRawPoints !== ungeocodedGroups.length && (
                      <span className="text-xs">({totalUngeocodedRawPoints} Rohdatenpunkte)</span>
                    )}
                  </p>
                  
                  <div className="space-y-1">
                    {ungeocodedGroups.slice(0, 5).map(group => (
                      <div 
                        key={group.coordKey}
                        className="flex items-center gap-2 p-2 bg-base-300/50 rounded text-sm"
                      >
                        <span className="font-mono text-xs text-base-content/60">
                          {group.lat.toFixed(4)}, {group.lng.toFixed(4)}
                        </span>
                        {group.points.length > 1 && (
                          <span className="badge badge-ghost badge-xs">
                            {group.points.length}×
                          </span>
                        )}
                        <span className="text-xs text-base-content/50">
                          {formatTime(group.firstTime)}
                          {group.firstTime !== group.lastTime && ` - ${formatTime(group.lastTime)}`}
                        </span>
                      </div>
                    ))}
                    
                    {ungeocodedGroups.length > 5 && (
                      <p className="text-xs text-base-content/50 pl-2">
                        + {ungeocodedGroups.length - 5} weitere Orte
                      </p>
                    )}
                  </div>

                  {/* Hide geocode button in read mode */}
                  {!readMode && (
                    <button 
                      onClick={handleBatchGeocode}
                      className="btn btn-sm btn-outline btn-primary mt-3 w-full"
                    >
                      Alle geocoden ({totalUngeocodedRawPoints} Punkte)
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
