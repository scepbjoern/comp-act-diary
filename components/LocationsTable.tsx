/**
 * LocationsTable Component
 * Filterable, editable table of all locations.
 */

'use client'

import { useState, useCallback } from 'react'
import { IconTrash, IconMapPin, IconRefresh, IconStar, IconStarFilled } from '@tabler/icons-react'
import { useReadMode } from '@/hooks/useReadMode'

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

interface LocationsTableProps {
  locations: Location[]
  selectedId: string | null
  onSelect: (location: Location) => void
  onUpdate: (id: string, data: Partial<Location>) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onGeocode: (id: string) => Promise<void>
  loading?: boolean
}

const POI_TYPE_LABELS: Record<string, string> = {
  HOME: 'Zuhause',
  WORK: 'Arbeit',
  RESTAURANT: 'Restaurant',
  CAFE: 'Café',
  SHOP: 'Geschäft',
  ENTERTAINMENT: 'Unterhaltung',
  SPORT: 'Sport',
  NATURE: 'Natur',
  TRANSPORT: 'Transport',
  ACCOMMODATION: 'Unterkunft',
  EDUCATION: 'Bildung',
  HEALTH: 'Gesundheit',
  FINANCE: 'Finanzen',
  OTHER: 'Sonstiges',
}

export default function LocationsTable({
  locations,
  selectedId,
  onSelect,
  onUpdate,
  onDelete,
  onGeocode,
  loading,
}: LocationsTableProps) {
  const { readMode } = useReadMode()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editField, setEditField] = useState<'name' | 'address' | 'city' | 'poiType' | null>(null)
  const [editValue, setEditValue] = useState('')
  const [savingId, setSavingId] = useState<string | null>(null)
  const [geocodingId, setGeocodingId] = useState<string | null>(null)

  const handleStartEdit = useCallback((location: Location, field: 'name' | 'address' | 'city' | 'poiType') => {
    setEditingId(location.id)
    setEditField(field)
    setEditValue(location[field] || '')
  }, [])

  const handleSaveEdit = useCallback(async (id: string) => {
    if (!editField) return
    setSavingId(id)
    try {
      await onUpdate(id, { [editField]: editValue.trim() || null })
      setEditingId(null)
      setEditField(null)
    } finally {
      setSavingId(null)
    }
  }, [editField, editValue, onUpdate])

  const handleCancelEdit = useCallback(() => {
    setEditingId(null)
    setEditField(null)
    setEditValue('')
  }, [])

  const handleToggleFavorite = useCallback(async (location: Location) => {
    setSavingId(location.id)
    try {
      await onUpdate(location.id, { isFavorite: !location.isFavorite })
    } finally {
      setSavingId(null)
    }
  }, [onUpdate])

  const handleGeocode = useCallback(async (id: string) => {
    setGeocodingId(id)
    try {
      await onGeocode(id)
    } finally {
      setGeocodingId(null)
    }
  }, [onGeocode])

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('Diesen Ort wirklich löschen? Alle zugehörigen Besuche werden ebenfalls gelöscht.')) {
      return
    }
    await onDelete(id)
  }, [onDelete])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    )
  }

  if (locations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-base-content/60">
        <IconMapPin className="w-12 h-12 mb-2" />
        <p>Keine Orte gefunden</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="table table-sm w-full">
        <thead>
          <tr>
            <th className="w-8"></th>
            <th>Name</th>
            <th>Adresse</th>
            <th>Stadt</th>
            <th>Typ</th>
            <th className="text-center">Besuche</th>
            {!readMode && <th className="w-32">Aktionen</th>}
          </tr>
        </thead>
        <tbody>
          {locations.map((location) => (
            <tr
              key={location.id}
              className={`hover:bg-base-200 cursor-pointer ${selectedId === location.id ? 'bg-primary/10' : ''}`}
              onClick={() => onSelect(location)}
            >
              <td onClick={(e) => e.stopPropagation()}>
                <button
                  className="btn btn-ghost btn-xs"
                  onClick={() => handleToggleFavorite(location)}
                  disabled={savingId === location.id}
                >
                  {location.isFavorite ? (
                    <IconStarFilled className="w-4 h-4 text-warning" />
                  ) : (
                    <IconStar className="w-4 h-4" />
                  )}
                </button>
              </td>
              <td onClick={(e) => e.stopPropagation()}>
                {editingId === location.id && editField === 'name' ? (
                  <div className="flex gap-1">
                    <input
                      type="text"
                      className="input input-xs input-bordered w-full"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveEdit(location.id)
                        if (e.key === 'Escape') handleCancelEdit()
                      }}
                      autoFocus
                    />
                    <button
                      className="btn btn-xs btn-primary"
                      onClick={() => handleSaveEdit(location.id)}
                      disabled={savingId === location.id}
                    >
                      {savingId === location.id ? <span className="loading loading-spinner loading-xs"></span> : 'OK'}
                    </button>
                    <button className="btn btn-xs btn-ghost" onClick={handleCancelEdit}>✕</button>
                  </div>
                ) : (
                  <span 
                    className="font-medium cursor-pointer hover:underline" 
                    onClick={() => handleStartEdit(location, 'name')}
                    title="Klicken zum Bearbeiten"
                  >
                    {location.name}
                  </span>
                )}
              </td>
              <td className="text-sm text-base-content/70 max-w-48" onClick={(e) => e.stopPropagation()}>
                {editingId === location.id && editField === 'address' ? (
                  <div className="flex gap-1">
                    <input
                      type="text"
                      className="input input-xs input-bordered w-full"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveEdit(location.id)
                        if (e.key === 'Escape') handleCancelEdit()
                      }}
                      autoFocus
                    />
                    <button className="btn btn-xs btn-primary" onClick={() => handleSaveEdit(location.id)} disabled={savingId === location.id}>OK</button>
                    <button className="btn btn-xs btn-ghost" onClick={handleCancelEdit}>✕</button>
                  </div>
                ) : (
                  <span 
                    className="cursor-pointer hover:underline truncate block"
                    onClick={() => handleStartEdit(location, 'address')}
                    title="Klicken zum Bearbeiten"
                  >
                    {location.address || '-'}
                  </span>
                )}
              </td>
              <td className="text-sm" onClick={(e) => e.stopPropagation()}>
                {editingId === location.id && editField === 'city' ? (
                  <div className="flex gap-1">
                    <input
                      type="text"
                      className="input input-xs input-bordered w-24"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveEdit(location.id)
                        if (e.key === 'Escape') handleCancelEdit()
                      }}
                      autoFocus
                    />
                    <button className="btn btn-xs btn-primary" onClick={() => handleSaveEdit(location.id)} disabled={savingId === location.id}>OK</button>
                    <button className="btn btn-xs btn-ghost" onClick={handleCancelEdit}>✕</button>
                  </div>
                ) : (
                  <span 
                    className="cursor-pointer hover:underline"
                    onClick={() => handleStartEdit(location, 'city')}
                    title="Klicken zum Bearbeiten"
                  >
                    {location.city || '-'}
                  </span>
                )}
              </td>
              <td onClick={(e) => e.stopPropagation()}>
                {editingId === location.id && editField === 'poiType' ? (
                  <div className="flex gap-1">
                    <select
                      className="select select-xs select-bordered"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      autoFocus
                    >
                      <option value="">-</option>
                      {Object.entries(POI_TYPE_LABELS).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                    </select>
                    <button className="btn btn-xs btn-primary" onClick={() => handleSaveEdit(location.id)} disabled={savingId === location.id}>OK</button>
                    <button className="btn btn-xs btn-ghost" onClick={handleCancelEdit}>✕</button>
                  </div>
                ) : (
                  <span 
                    className="badge badge-sm badge-ghost cursor-pointer hover:bg-base-300"
                    onClick={() => handleStartEdit(location, 'poiType')}
                    title="Klicken zum Bearbeiten"
                  >
                    {location.poiType ? (POI_TYPE_LABELS[location.poiType] || location.poiType) : '-'}
                  </span>
                )}
              </td>
              <td className="text-center">
                {location._count?.visits || 0}
              </td>
              {/* Hide action buttons in read mode */}
              {!readMode && (
              <td onClick={(e) => e.stopPropagation()}>
                <div className="flex gap-1">
                  <button
                    className="btn btn-ghost btn-xs"
                    onClick={() => handleGeocode(location.id)}
                    disabled={geocodingId === location.id || !location.lat || !location.lng}
                    title="Adresse neu ermitteln"
                  >
                    {geocodingId === location.id ? (
                      <span className="loading loading-spinner loading-xs"></span>
                    ) : (
                      <IconRefresh className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    className="btn btn-ghost btn-xs text-error"
                    onClick={() => handleDelete(location.id)}
                    title="Löschen"
                  >
                    <IconTrash className="w-4 h-4" />
                  </button>
                </div>
              </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
