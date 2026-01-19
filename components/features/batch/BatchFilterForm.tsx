/**
 * BatchFilterForm - Form for configuring batch processing parameters.
 * Includes date range, type selection, step selection, and overwrite mode.
 */

'use client'

import { useEffect, useState } from 'react'
import {
  IconCalendar,
  IconFilter,
  IconPlayerPlay,
  IconEye,
  IconAt,
} from '@tabler/icons-react'

// =============================================================================
// TYPES
// =============================================================================

interface JournalEntryType {
  id: string
  code: string
  name: string
  icon: string | null
}

export interface BatchFilterFormData {
  dateFrom: string
  dateTo: string
  typeCodes: string[]
  steps: ('title' | 'content' | 'analysis' | 'summary')[]
  overwriteMode: 'empty_only' | 'overwrite_all'
  // Mention detection (separate from AI steps)
  detectMentions: boolean
}

interface BatchFilterFormProps {
  onPreview: (data: BatchFilterFormData) => void
  isLoading: boolean
}

// =============================================================================
// COMPONENT
// =============================================================================

export function BatchFilterForm({ onPreview, isLoading }: BatchFilterFormProps) {
  const [entryTypes, setEntryTypes] = useState<JournalEntryType[]>([])
  const [loadingTypes, setLoadingTypes] = useState(true)

  // Default to last 30 days
  const today = new Date().toISOString().slice(0, 10)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

  // Form state managed directly
  const [dateFrom, setDateFrom] = useState(thirtyDaysAgo)
  const [dateTo, setDateTo] = useState(today)
  const [selectedTypes, setSelectedTypes] = useState<string[]>([])
  const [selectedSteps, setSelectedSteps] = useState<('title' | 'content' | 'analysis' | 'summary')[]>([])
  const [overwriteMode, setOverwriteMode] = useState<'empty_only' | 'overwrite_all'>('empty_only')
  const [detectMentions, setDetectMentions] = useState(false)
  const [errors, setErrors] = useState<{ typeCodes?: string; steps?: string }>({})

  // Load journal entry types
  useEffect(() => {
    async function loadTypes() {
      try {
        const res = await fetch('/api/journal-entry-types', { credentials: 'same-origin' })
        if (res.ok) {
          const data = await res.json()
          setEntryTypes(data.types || [])
          // Select all types by default
          if (data.types?.length > 0) {
            setSelectedTypes(data.types.map((t: JournalEntryType) => t.code))
          }
        }
      } catch (e) {
        console.error('Failed to load entry types:', e)
      } finally {
        setLoadingTypes(false)
      }
    }
    void loadTypes()
  }, [])

  // Handle "Gesamte Pipeline" toggle
  const handleAllPipelineToggle = (checked: boolean) => {
    if (checked) {
      setSelectedSteps(['title', 'content', 'analysis', 'summary'])
    } else {
      setSelectedSteps([])
    }
  }

  // Handle individual step toggle
  const handleStepToggle = (step: 'title' | 'content' | 'analysis' | 'summary', checked: boolean) => {
    if (checked) {
      setSelectedSteps(prev => [...prev, step])
    } else {
      setSelectedSteps(prev => prev.filter(s => s !== step))
    }
  }

  // Handle type toggle
  const handleTypeToggle = (code: string, checked: boolean) => {
    if (checked) {
      setSelectedTypes(prev => [...prev, code])
    } else {
      setSelectedTypes(prev => prev.filter(c => c !== code))
    }
  }

  const allPipeline = selectedSteps.length === 4

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate
    const newErrors: typeof errors = {}
    if (selectedTypes.length === 0) {
      newErrors.typeCodes = 'Mindestens ein Typ auswählen'
    }
    if (selectedSteps.length === 0 && !detectMentions) {
      newErrors.steps = 'Mindestens eine Aktion auswählen'
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }
    
    setErrors({})
    onPreview({
      dateFrom,
      dateTo,
      typeCodes: selectedTypes,
      steps: selectedSteps,
      overwriteMode,
      detectMentions,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Date Range */}
      <div className="card bg-base-200 p-4">
        <div className="flex items-center gap-2 mb-3 font-medium">
          <IconCalendar size={18} className="text-primary" />
          Zeitraum
        </div>
        <div className="flex flex-wrap gap-4">
          <div className="form-control">
            <label className="label">
              <span className="label-text">Von</span>
            </label>
            <input
              type="date"
              className="input input-bordered input-sm"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>
          <div className="form-control">
            <label className="label">
              <span className="label-text">Bis</span>
            </label>
            <input
              type="date"
              className="input input-bordered input-sm"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Entry Types */}
      <div className="card bg-base-200 p-4">
        <div className="flex items-center gap-2 mb-3 font-medium">
          <IconFilter size={18} className="text-primary" />
          Eintragstypen
        </div>
        {loadingTypes ? (
          <span className="loading loading-spinner loading-sm" />
        ) : (
          <div className="flex flex-wrap gap-4">
            {entryTypes.map(type => (
              <label key={type.code} className="inline-flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  className="w-4 h-4 accent-primary"
                  checked={selectedTypes.includes(type.code)}
                  onChange={(e) => handleTypeToggle(type.code, e.target.checked)}
                />
                <span>{type.icon} {type.name}</span>
              </label>
            ))}
          </div>
        )}
        {errors.typeCodes && (
          <span className="text-error text-xs mt-1">{errors.typeCodes}</span>
        )}
      </div>

      {/* Actions / Steps */}
      <div className="card bg-base-200 p-4">
        <div className="flex items-center gap-2 mb-3 font-medium">
          <IconPlayerPlay size={18} className="text-primary" />
          Aktionen
        </div>
        <div className="space-y-3">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              className="w-4 h-4 accent-primary"
              checked={selectedSteps.includes('title')}
              onChange={(e) => handleStepToggle('title', e.target.checked)}
            />
            <span>Titel generieren</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              className="w-4 h-4 accent-primary"
              checked={selectedSteps.includes('content')}
              onChange={(e) => handleStepToggle('content', e.target.checked)}
            />
            <span>Text verbessern (Content)</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              className="w-4 h-4 accent-primary"
              checked={selectedSteps.includes('analysis')}
              onChange={(e) => handleStepToggle('analysis', e.target.checked)}
            />
            <span>Analyse erstellen</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              className="w-4 h-4 accent-primary"
              checked={selectedSteps.includes('summary')}
              onChange={(e) => handleStepToggle('summary', e.target.checked)}
            />
            <span>Zusammenfassung erstellen</span>
          </label>
          <div className="divider my-2" />
          <label className="flex items-center gap-2 cursor-pointer select-none font-medium">
            <input
              type="checkbox"
              className="w-4 h-4 accent-primary"
              checked={allPipeline}
              onChange={(e) => handleAllPipelineToggle(e.target.checked)}
            />
            <span>Gesamte Pipeline (alle oben)</span>
          </label>
        </div>
        {errors.steps && (
          <span className="text-error text-xs mt-1">{errors.steps}</span>
        )}
      </div>

      {/* Mention Detection */}
      <div className="card bg-base-200 p-4">
        <div className="flex items-center gap-2 mb-3 font-medium">
          <IconAt size={18} className="text-primary" />
          Kontakt-Erwähnungen
        </div>
        <div className="space-y-3">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              className="w-4 h-4 accent-primary"
              checked={detectMentions}
              onChange={(e) => setDetectMentions(e.target.checked)}
            />
            <span>Mentions erkennen und Interaktionen erstellen</span>
          </label>
          <p className="text-xs text-base-content/60">
            Durchsucht den Text nach Kontaktnamen und erstellt automatisch MENTION-Interaktionen.
            Bereits erkannte Mentions werden nicht doppelt erstellt.
          </p>
        </div>
      </div>

      {/* Overwrite Mode */}
      <div className="card bg-base-200 p-4">
        <div className="mb-3 font-medium">Überschreiben-Modus</div>
        <div className="space-y-3">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="radio"
              className="w-4 h-4 accent-primary"
              name="overwriteMode"
              checked={overwriteMode === 'empty_only'}
              onChange={() => setOverwriteMode('empty_only')}
            />
            <span>Nur leere Felder füllen</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="radio"
              className="w-4 h-4 accent-primary"
              name="overwriteMode"
              checked={overwriteMode === 'overwrite_all'}
              onChange={() => setOverwriteMode('overwrite_all')}
            />
            <span>Bestehende Werte überschreiben</span>
          </label>
        </div>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        className="btn btn-primary w-full"
        disabled={isLoading}
      >
        {isLoading ? (
          <span className="loading loading-spinner loading-sm" />
        ) : (
          <IconEye size={18} />
        )}
        Vorschau anzeigen (Dry-Run)
      </button>
    </form>
  )
}
