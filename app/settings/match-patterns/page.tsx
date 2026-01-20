'use client'

import { useState, useEffect, useCallback } from 'react'
import { IconPlus, IconTrash, IconPencil, IconCheck, IconX, IconMapPin } from '@tabler/icons-react'
import Link from 'next/link'

// =============================================================================
// TYPES
// =============================================================================

interface MatchPattern {
  id: string
  sourceType: 'CALENDAR_LOCATION' | 'JOURNAL_CONTENT' | 'IMPORT_TAG'
  targetType: 'LOCATION' | 'CONTACT' | 'TAG'
  targetId: string
  pattern: string
  description: string | null
  priority: number
  isActive: boolean
  createdAt: string
}

interface Location {
  id: string
  name: string
  slug: string
}

// =============================================================================
// CONSTANTS
// =============================================================================

const SOURCE_TYPE_LABELS: Record<MatchPattern['sourceType'], string> = {
  CALENDAR_LOCATION: 'Kalender-Ort',
  JOURNAL_CONTENT: 'Journal-Inhalt',
  IMPORT_TAG: 'Import-Tag',
}

const TARGET_TYPE_LABELS: Record<MatchPattern['targetType'], string> = {
  LOCATION: 'Location',
  CONTACT: 'Kontakt',
  TAG: 'Tag',
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function MatchPatternsPage() {
  const [patterns, setPatterns] = useState<MatchPattern[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    sourceType: 'CALENDAR_LOCATION' as MatchPattern['sourceType'],
    targetType: 'LOCATION' as MatchPattern['targetType'],
    targetId: '',
    pattern: '',
    description: '',
    priority: 0,
    isActive: true,
  })
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Load patterns and locations
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [patternsRes, locationsRes] = await Promise.all([
        fetch('/api/match-patterns'),
        fetch('/api/locations'),
      ])

      if (patternsRes.ok) {
        const data = await patternsRes.json()
        setPatterns(data.patterns || [])
      }

      if (locationsRes.ok) {
        const data = await locationsRes.json()
        setLocations(data.locations || [])
      }
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadData()
  }, [loadData])

  // Reset form
  const resetForm = () => {
    setFormData({
      sourceType: 'CALENDAR_LOCATION',
      targetType: 'LOCATION',
      targetId: '',
      pattern: '',
      description: '',
      priority: 0,
      isActive: true,
    })
    setFormError(null)
    setEditingId(null)
    setShowAddForm(false)
  }

  // Create pattern
  const createPattern = async () => {
    if (!formData.pattern.trim() || !formData.targetId) {
      setFormError('Pattern und Ziel sind erforderlich')
      return
    }

    // Validate regex
    try {
      new RegExp(formData.pattern)
    } catch {
      setFormError('Ungültiges Regex-Pattern')
      return
    }

    setSaving(true)
    setFormError(null)

    try {
      const res = await fetch('/api/match-patterns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (res.ok) {
        resetForm()
        void loadData()
      } else {
        const data = await res.json()
        setFormError(data.error || 'Fehler beim Erstellen')
      }
    } catch (_error) {
      setFormError('Netzwerkfehler')
    } finally {
      setSaving(false)
    }
  }

  // Update pattern
  const updatePattern = async (id: string) => {
    if (!formData.pattern.trim()) {
      setFormError('Pattern ist erforderlich')
      return
    }

    // Validate regex
    try {
      new RegExp(formData.pattern)
    } catch {
      setFormError('Ungültiges Regex-Pattern')
      return
    }

    setSaving(true)
    setFormError(null)

    try {
      const res = await fetch(`/api/match-patterns/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pattern: formData.pattern,
          description: formData.description || null,
          priority: formData.priority,
          isActive: formData.isActive,
        }),
      })

      if (res.ok) {
        resetForm()
        void loadData()
      } else {
        const data = await res.json()
        setFormError(data.error || 'Fehler beim Aktualisieren')
      }
    } catch (_error) {
      setFormError('Netzwerkfehler')
    } finally {
      setSaving(false)
    }
  }

  // Delete pattern
  const deletePattern = async (id: string) => {
    if (!confirm('Pattern wirklich löschen?')) return

    try {
      const res = await fetch(`/api/match-patterns/${id}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        void loadData()
      }
    } catch (error) {
      console.error('Failed to delete pattern:', error)
    }
  }

  // Start editing
  const startEditing = (pattern: MatchPattern) => {
    setEditingId(pattern.id)
    setFormData({
      sourceType: pattern.sourceType,
      targetType: pattern.targetType,
      targetId: pattern.targetId,
      pattern: pattern.pattern,
      description: pattern.description || '',
      priority: pattern.priority,
      isActive: pattern.isActive,
    })
    setShowAddForm(false)
    setFormError(null)
  }

  // Get target name
  const getTargetName = (targetType: string, targetId: string): string => {
    if (targetType === 'LOCATION') {
      const location = locations.find(l => l.id === targetId)
      return location?.name || 'Unbekannt'
    }
    return targetId
  }

  // Group patterns by source type
  const patternsBySource = patterns.reduce((acc, p) => {
    if (!acc[p.sourceType]) acc[p.sourceType] = []
    acc[p.sourceType].push(p)
    return acc
  }, {} as Record<string, MatchPattern[]>)

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Match-Patterns</h1>
          <p className="text-base-content/60 mt-1">
            Regex-Patterns für automatisches Matching von Kalender-Orten zu Locations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/settings/calendar" className="btn btn-ghost btn-sm">
            ← Zurück
          </Link>
          {!showAddForm && !editingId && (
            <button 
              onClick={() => setShowAddForm(true)}
              className="btn btn-primary btn-sm"
            >
              <IconPlus className="w-4 h-4" />
              Neues Pattern
            </button>
          )}
        </div>
      </div>

      {/* Add/Edit Form */}
      {(showAddForm || editingId) && (
        <div className="card bg-base-100 shadow mb-6">
          <div className="card-body">
            <h2 className="card-title text-lg">
              {editingId ? 'Pattern bearbeiten' : 'Neues Pattern erstellen'}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Source Type */}
              {!editingId && (
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Quelltyp</span>
                  </label>
                  <select
                    value={formData.sourceType}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      sourceType: e.target.value as MatchPattern['sourceType'] 
                    }))}
                    className="select select-bordered"
                  >
                    {Object.entries(SOURCE_TYPE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Target Type */}
              {!editingId && (
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Zieltyp</span>
                  </label>
                  <select
                    value={formData.targetType}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      targetType: e.target.value as MatchPattern['targetType'],
                      targetId: '',
                    }))}
                    className="select select-bordered"
                  >
                    {Object.entries(TARGET_TYPE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Target Selection */}
              {!editingId && formData.targetType === 'LOCATION' && (
                <div className="form-control md:col-span-2">
                  <label className="label">
                    <span className="label-text">Ziel-Location</span>
                  </label>
                  <select
                    value={formData.targetId}
                    onChange={(e) => setFormData(prev => ({ ...prev, targetId: e.target.value }))}
                    className="select select-bordered"
                  >
                    <option value="">Location wählen...</option>
                    {locations.map(location => (
                      <option key={location.id} value={location.id}>
                        {location.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Pattern */}
              <div className="form-control md:col-span-2">
                <label className="label">
                  <span className="label-text">Regex-Pattern</span>
                  <a 
                    href="https://regex101.com/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="label-text-alt link link-primary"
                  >
                    Regex-Hilfe
                  </a>
                </label>
                <input
                  type="text"
                  value={formData.pattern}
                  onChange={(e) => setFormData(prev => ({ ...prev, pattern: e.target.value }))}
                  className="input input-bordered font-mono"
                  placeholder="z.B. SM\s*\d+|Sitzungszimmer"
                />
                <label className="label">
                  <span className="label-text-alt text-base-content/60">
                    Case-insensitive. Beispiel: <code>SM\s*\d+</code> matcht &quot;SM 101&quot;, &quot;SM101&quot;
                  </span>
                </label>
              </div>

              {/* Description */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Beschreibung (optional)</span>
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="input input-bordered"
                  placeholder="z.B. Alle SM-Räume"
                />
              </div>

              {/* Priority */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Priorität</span>
                </label>
                <input
                  type="number"
                  value={formData.priority}
                  onChange={(e) => setFormData(prev => ({ ...prev, priority: parseInt(e.target.value) || 0 }))}
                  className="input input-bordered"
                  min={0}
                />
                <label className="label">
                  <span className="label-text-alt text-base-content/60">
                    Höhere Priorität wird zuerst geprüft
                  </span>
                </label>
              </div>

              {/* Is Active */}
              <div className="form-control">
                <label className="label cursor-pointer justify-start gap-3">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                    className="checkbox checkbox-primary"
                  />
                  <span className="label-text">Pattern aktiv</span>
                </label>
              </div>
            </div>

            {/* Error */}
            {formError && (
              <div className="alert alert-error mt-4">
                <span>{formError}</span>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={resetForm} className="btn btn-ghost">
                <IconX className="w-4 h-4" />
                Abbrechen
              </button>
              <button
                onClick={() => editingId ? updatePattern(editingId) : createPattern()}
                disabled={saving}
                className="btn btn-primary"
              >
                {saving ? (
                  <span className="loading loading-spinner loading-sm"></span>
                ) : (
                  <IconCheck className="w-4 h-4" />
                )}
                {editingId ? 'Speichern' : 'Erstellen'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Patterns List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      ) : patterns.length === 0 ? (
        <div className="text-center py-12">
          <IconMapPin className="w-16 h-16 mx-auto text-base-content/30 mb-4" />
          <h3 className="text-lg font-medium mb-2">Keine Patterns</h3>
          <p className="text-base-content/60 mb-4">
            Erstelle Patterns, um Kalender-Orte automatisch mit Locations zu verknüpfen.
          </p>
          {!showAddForm && (
            <button 
              onClick={() => setShowAddForm(true)}
              className="btn btn-primary btn-sm"
            >
              <IconPlus className="w-4 h-4" />
              Erstes Pattern erstellen
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(patternsBySource).map(([sourceType, sourcePatterns]) => (
            <div key={sourceType} className="card bg-base-100 shadow">
              <div className="card-body">
                <h3 className="card-title text-base">
                  {SOURCE_TYPE_LABELS[sourceType as MatchPattern['sourceType']] || sourceType}
                </h3>
                <div className="overflow-x-auto">
                  <table className="table table-sm">
                    <thead>
                      <tr>
                        <th>Pattern</th>
                        <th>Ziel</th>
                        <th>Beschreibung</th>
                        <th>Prio</th>
                        <th>Status</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {sourcePatterns.map(pattern => (
                        <tr key={pattern.id} className={!pattern.isActive ? 'opacity-50' : ''}>
                          <td>
                            <code className="text-xs bg-base-200 px-1 rounded">
                              {pattern.pattern}
                            </code>
                          </td>
                          <td>
                            <span className="badge badge-ghost badge-sm">
                              {getTargetName(pattern.targetType, pattern.targetId)}
                            </span>
                          </td>
                          <td className="text-sm text-base-content/70">
                            {pattern.description || '-'}
                          </td>
                          <td>{pattern.priority}</td>
                          <td>
                            <span className={`badge badge-sm ${pattern.isActive ? 'badge-success' : 'badge-ghost'}`}>
                              {pattern.isActive ? 'Aktiv' : 'Inaktiv'}
                            </span>
                          </td>
                          <td>
                            <div className="flex gap-1">
                              <button
                                onClick={() => startEditing(pattern)}
                                className="btn btn-ghost btn-xs"
                              >
                                <IconPencil className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => void deletePattern(pattern.id)}
                                className="btn btn-ghost btn-xs text-error"
                              >
                                <IconTrash className="w-3 h-3" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
