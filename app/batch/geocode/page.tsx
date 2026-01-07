/**
 * Batch Geocoding Page
 * Select GPS points by time range or polygon and trigger geocoding.
 */

'use client'

import { useState, useCallback, useEffect } from 'react'
import { IconMapPin, IconClock, IconPolygon, IconLoader2, IconPencil } from '@tabler/icons-react'
import dynamic from 'next/dynamic'

// Dynamic import for map components (SSR incompatible)
const BatchGeocodeMap = dynamic(
  () => import('@/components/BatchGeocodeMap'),
  { ssr: false, loading: () => <div className="h-96 bg-base-300 animate-pulse rounded-lg" /> }
)

const PointPreviewMap = dynamic(
  () => import('@/components/PointPreviewMap'),
  { ssr: false, loading: () => <div className="h-64 bg-base-300 animate-pulse rounded-lg" /> }
)

const PointEditModal = dynamic(
  () => import('@/components/PointEditModal'),
  { ssr: false }
)

interface GeocodeResult {
  pointId: string
  success: boolean
  name?: string
  address?: string
  confidence?: string
  confidenceScore?: number
  error?: string
  lat?: number
  lng?: number
}

type SelectionMode = 'timeRange' | 'polygon'

interface CostEstimate {
  totalPoints: number
  ungeocodedPoints: number
  alreadyGeocoded: number
  matchedToKnown: number
  clustered: number
  actualApiCalls: number
  estimatedCost: string
  fullCost: string
  savings: string
}

export default function BatchGeocodePage() {
  const [mode, setMode] = useState<SelectionMode>('timeRange')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [selectedPointIds, setSelectedPointIds] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [geocoding, setGeocoding] = useState(false)
  const [results, setResults] = useState<GeocodeResult[]>([])
  const [error, setError] = useState<string | null>(null)
  const [selectedResult, setSelectedResult] = useState<GeocodeResult | null>(null)
  const [costEstimate, setCostEstimate] = useState<CostEstimate | null>(null)
  const [estimating, setEstimating] = useState(false)
  const [editingResult, setEditingResult] = useState<GeocodeResult | null>(null)

  // Handle polygon selection from map
  const handlePolygonSelect = useCallback((pointIds: string[]) => {
    setSelectedPointIds(pointIds)
  }, [])

  // Estimate cost when points are selected
  async function estimateCost(pointIds: string[]) {
    if (pointIds.length === 0) {
      setCostEstimate(null)
      return
    }

    try {
      setEstimating(true)
      const res = await fetch('/api/location/geocode/estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pointIds }),
      })

      if (res.ok) {
        const data = await res.json()
        setCostEstimate(data)
      }
    } catch (err) {
      console.error('Cost estimation failed:', err)
    } finally {
      setEstimating(false)
    }
  }

  // Re-estimate when points change
  useEffect(() => {
    if (selectedPointIds.length > 0) {
      estimateCost(selectedPointIds)
    } else {
      setCostEstimate(null)
    }
  }, [selectedPointIds])

  // Load point IDs from sessionStorage (when navigating from DayLocationPanel)
  useEffect(() => {
    const storedIds = sessionStorage.getItem('batchGeocodePointIds')
    if (storedIds) {
      try {
        const ids = JSON.parse(storedIds) as string[]
        if (Array.isArray(ids) && ids.length > 0) {
          setSelectedPointIds(ids)
        }
      } catch (e) {
        console.error('Failed to parse stored point IDs:', e)
      }
      sessionStorage.removeItem('batchGeocodePointIds')
    }
  }, [])

  // Load points for time range
  async function loadPointsForTimeRange() {
    if (!startDate || !endDate) {
      setError('Bitte Start- und Enddatum wählen')
      return
    }

    try {
      setLoading(true)
      setError(null)

      const res = await fetch('/api/location/raw-points?' + new URLSearchParams({
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        ungeocodedOnly: 'true',
      }))

      if (res.ok) {
        const data = await res.json()
        setSelectedPointIds(data.points?.map((p: { id: string }) => p.id) || [])
      } else {
        const data = await res.json()
        setError(data.error || 'Fehler beim Laden')
      }
    } catch {
      setError('Fehler beim Laden der Punkte')
    } finally {
      setLoading(false)
    }
  }

  // Trigger geocoding
  async function startGeocoding() {
    if (selectedPointIds.length === 0) {
      setError('Keine Punkte ausgewählt')
      return
    }

    if (selectedPointIds.length > 1000) {
      setError('Maximal 1000 Punkte pro Batch')
      return
    }

    try {
      setGeocoding(true)
      setError(null)
      setResults([])

      const res = await fetch('/api/location/geocode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pointIds: selectedPointIds }),
      })

      const data = await res.json()

      if (res.ok) {
        setResults(data.results || [])
        setSelectedPointIds([]) // Clear selection after geocoding
      } else {
        setError(data.error || 'Geocoding fehlgeschlagen')
      }
    } catch {
      setError('Fehler beim Geocoding')
    } finally {
      setGeocoding(false)
    }
  }

  // Get confidence badge color
  function getConfidenceBadge(confidence?: string) {
    switch (confidence) {
      case 'exact':
        return <span className="badge badge-success">Exakt</span>
      case 'high':
        return <span className="badge badge-success">Hoch</span>
      case 'medium':
        return <span className="badge badge-warning">Mittel</span>
      case 'low':
        return <span className="badge badge-error">Niedrig</span>
      default:
        return <span className="badge">Unbekannt</span>
    }
  }

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <IconMapPin className="w-7 h-7" />
        Batch-Geocoding
      </h1>

      {error && (
        <div className="alert alert-error mb-4">
          <span>{error}</span>
          <button className="btn btn-sm btn-ghost" onClick={() => setError(null)}>×</button>
        </div>
      )}

      {/* Selection Mode */}
      <div className="card bg-base-200 mb-6">
        <div className="card-body">
          <h2 className="card-title">Auswahl-Modus</h2>
          
          <div className="flex gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="mode"
                checked={mode === 'timeRange'}
                onChange={() => setMode('timeRange')}
                className="w-4 h-4 accent-primary"
              />
              <IconClock className="w-5 h-5" />
              <span>Nach Zeitraum</span>
            </label>
            
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="mode"
                checked={mode === 'polygon'}
                onChange={() => setMode('polygon')}
                className="w-4 h-4 accent-primary"
              />
              <IconPolygon className="w-5 h-5" />
              <span>Nach Kartenbereich</span>
            </label>
          </div>

          {/* Time Range Selection */}
          {mode === 'timeRange' && (
            <div className="mt-4 flex flex-wrap gap-4 items-end">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Von</span>
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="input input-bordered"
                />
              </div>
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Bis</span>
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="input input-bordered"
                />
              </div>
              <button 
                className="btn btn-primary"
                onClick={loadPointsForTimeRange}
                disabled={loading || !startDate || !endDate}
              >
                {loading ? (
                  <IconLoader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Punkte laden'
                )}
              </button>
            </div>
          )}

          {/* Polygon Selection Map */}
          {mode === 'polygon' && (
            <div className="mt-4">
              <p className="text-sm text-base-content/70 mb-2">
                Zeichne ein Polygon auf der Karte, um Punkte auszuwählen.
              </p>
              <BatchGeocodeMap onSelectPoints={handlePolygonSelect} />
            </div>
          )}
        </div>
      </div>

      {/* Selection Summary & Action */}
      <div className="card bg-base-200 mb-6">
        <div className="card-body">
          <div className="flex flex-wrap justify-between items-center gap-4">
            <div>
              <h2 className="card-title">Ausgewählte Punkte</h2>
              <p className="text-base-content/70">
                {selectedPointIds.length} Punkt{selectedPointIds.length !== 1 && 'e'} ausgewählt
              </p>
              {selectedPointIds.length > 0 && (
                <div className="text-sm space-y-1 mt-2">
                  {estimating ? (
                    <p className="text-base-content/60">Kosten werden berechnet...</p>
                  ) : costEstimate ? (
                    <>
                      <p className="text-success font-medium">
                        Geschätzte Kosten: {costEstimate.estimatedCost}
                      </p>
                      {costEstimate.matchedToKnown > 0 && (
                        <p className="text-xs text-base-content/60">
                          📍 {costEstimate.matchedToKnown} Punkte bei bekannten Orten (kostenlos)
                        </p>
                      )}
                      {costEstimate.clustered > 0 && (
                        <p className="text-xs text-base-content/60">
                          🔗 {costEstimate.clustered} Punkte in Clustern (gespart)
                        </p>
                      )}
                      {costEstimate.savings !== '$0.00' && (
                        <p className="text-xs text-success">
                          💰 Ersparnis durch Optimierung: {costEstimate.savings}
                        </p>
                      )}
                      <p className="text-xs text-base-content/50">
                        API-Aufrufe: {costEstimate.actualApiCalls} von {costEstimate.ungeocodedPoints}
                      </p>
                    </>
                  ) : null}
                </div>
              )}
            </div>
            
            <button
              className="btn btn-primary btn-lg"
              onClick={startGeocoding}
              disabled={geocoding || selectedPointIds.length === 0}
            >
              {geocoding ? (
                <>
                  <IconLoader2 className="w-5 h-5 animate-spin" />
                  Geocoding läuft...
                </>
              ) : (
                <>
                  <IconMapPin className="w-5 h-5" />
                  {selectedPointIds.length} Punkte geocoden
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div className="card bg-base-200">
          <div className="card-body">
            <h2 className="card-title">Ergebnisse</h2>
            <p className="text-sm text-base-content/70 mb-2">
              Klicke auf eine Zeile, um den Punkt auf der Karte anzuzeigen.
            </p>
            
            <div className="overflow-x-auto max-h-80">
              <table className="table table-pin-rows">
                <thead>
                  <tr>
                    <th>Status</th>
                    <th>Name</th>
                    <th>Adresse</th>
                    <th>Confidence</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((result, idx) => (
                    <tr 
                      key={result.pointId || idx}
                      className={`cursor-pointer hover:bg-base-300 ${selectedResult?.pointId === result.pointId ? 'bg-primary/20' : ''}`}
                      onClick={() => setSelectedResult(result)}
                    >
                      <td>
                        {result.success ? (
                          <span className="badge badge-success">✓</span>
                        ) : (
                          <span className="badge badge-error" title={result.error}>✗</span>
                        )}
                      </td>
                      <td className="font-medium">
                        {result.name || '-'}
                        {result.error && (
                          <p className="text-xs text-error mt-0.5">{result.error}</p>
                        )}
                      </td>
                      <td className="max-w-xs truncate">{result.address || '-'}</td>
                      <td>{getConfidenceBadge(result.confidence)}</td>
                      <td>
                        {!result.success && result.lat && result.lng && (
                          <button
                            className="btn btn-xs btn-ghost"
                            onClick={(e) => {
                              e.stopPropagation()
                              setEditingResult(result)
                            }}
                            title="Punkt korrigieren"
                          >
                            <IconPencil className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Selected Point Map */}
            {selectedResult && selectedResult.lat && selectedResult.lng && (
              <div className="mt-4">
                <h3 className="font-medium mb-2">
                  📍 {selectedResult.name || 'Ausgewählter Punkt'}
                </h3>
                <div className="h-64 rounded-lg overflow-hidden border border-base-300">
                  <PointPreviewMap 
                    lat={selectedResult.lat} 
                    lng={selectedResult.lng}
                    name={selectedResult.name}
                  />
                </div>
              </div>
            )}

            <div className="mt-4 flex gap-2">
              <a href="/settings/location" className="btn btn-outline">
                Zurück zu Einstellungen
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Point Edit Modal for failed geocodes */}
      {editingResult && editingResult.lat && editingResult.lng && (
        <PointEditModal
          pointId={editingResult.pointId}
          initialLat={editingResult.lat}
          initialLng={editingResult.lng}
          initialName={editingResult.name}
          initialAddress={editingResult.address}
          error={editingResult.error}
          onClose={() => setEditingResult(null)}
          onSave={(savedResult) => {
            // Update the result in the list
            setResults(prev => prev.map(r => 
              r.pointId === editingResult.pointId
                ? {
                    ...r,
                    success: true,
                    name: savedResult.name,
                    address: savedResult.address,
                    lat: savedResult.lat,
                    lng: savedResult.lng,
                    confidence: 'high',
                    error: undefined,
                  }
                : r
            ))
            setEditingResult(null)
          }}
        />
      )}
    </div>
  )
}
