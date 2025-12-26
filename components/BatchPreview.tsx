/**
 * BatchPreview - Shows preview of entries that will be affected by batch processing.
 */

'use client'

import {
  IconCheck,
  IconCircle,
  IconArrowLeft,
  IconPlayerPlay,
} from '@tabler/icons-react'

// =============================================================================
// TYPES
// =============================================================================

export interface AffectedEntry {
  id: string
  date: string
  title: string | null
  typeName: string
  typeCode: string
  typeIcon: string | null
  hasTitle: boolean
  hasContent: boolean
  hasAnalysis: boolean
  hasSummary: boolean
}

interface BatchPreviewProps {
  entries: AffectedEntry[]
  onBack: () => void
  onRun: () => void
  isRunning: boolean
}

// =============================================================================
// COMPONENT
// =============================================================================

export function BatchPreview({ entries, onBack, onRun, isRunning }: BatchPreviewProps) {
  if (entries.length === 0) {
    return (
      <div className="card bg-base-200 p-6 text-center">
        <div className="text-4xl mb-4">📭</div>
        <h3 className="text-lg font-medium mb-2">Keine Einträge gefunden</h3>
        <p className="text-base-content/70 mb-4">
          Mit den gewählten Filtern wurden keine zu verarbeitenden Einträge gefunden.
        </p>
        <button className="btn btn-ghost" onClick={onBack}>
          <IconArrowLeft size={18} />
          Zurück zu den Filtern
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="card bg-base-200 p-4">
        <div className="flex items-center gap-3">
          <div className="text-3xl">📊</div>
          <div>
            <div className="text-lg font-medium">
              {entries.length} {entries.length === 1 ? 'Eintrag' : 'Einträge'} werden verarbeitet
            </div>
            <div className="text-sm text-base-content/70">
              Prüfe die Liste und bestätige die Verarbeitung
            </div>
          </div>
        </div>
      </div>

      {/* Entry List */}
      <div className="card bg-base-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table table-sm">
            <thead>
              <tr>
                <th>Datum</th>
                <th>Typ</th>
                <th>Titel</th>
                <th className="text-center" title="Titel | Content | Analyse | Zusammenfassung">Status</th>
              </tr>
            </thead>
            <tbody>
              {entries.slice(0, 100).map(entry => (
                <tr key={entry.id}>
                  <td className="whitespace-nowrap">{entry.date}</td>
                  <td className="whitespace-nowrap">
                    {entry.typeIcon} {entry.typeName}
                  </td>
                  <td className="max-w-xs truncate">
                    {entry.title || <span className="text-base-content/50 italic">(kein Titel)</span>}
                  </td>
                  <td>
                    <div className="flex justify-center gap-1">
                      <StatusIcon filled={entry.hasTitle} title="Titel" />
                      <StatusIcon filled={entry.hasContent} title="Content" />
                      <StatusIcon filled={entry.hasAnalysis} title="Analyse" />
                      <StatusIcon filled={entry.hasSummary} title="Zusammenfassung" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {entries.length > 100 && (
          <div className="p-2 text-center text-sm text-base-content/70 border-t border-base-300">
            ...und {entries.length - 100} weitere Einträge
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="text-sm text-base-content/60 p-3 bg-base-200/50 rounded-lg">
        <span className="font-medium">Legende:</span>{' '}
        <span className="inline-flex items-center gap-1">
          <IconCheck size={14} className="text-success" /> vorhanden
        </span>
        {' | '}
        <span className="inline-flex items-center gap-1">
          <IconCircle size={14} className="text-base-content/30" /> leer
        </span>
        {' '}
        (Titel | Content | Analyse | Zusammenfassung)
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button className="btn btn-ghost flex-1" onClick={onBack} disabled={isRunning}>
          <IconArrowLeft size={18} />
          Abbrechen
        </button>
        <button className="btn btn-primary flex-1" onClick={onRun} disabled={isRunning}>
          {isRunning ? (
            <span className="loading loading-spinner loading-sm" />
          ) : (
            <IconPlayerPlay size={18} />
          )}
          Verarbeitung starten ({entries.length})
        </button>
      </div>
    </div>
  )
}

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

function StatusIcon({ filled, title }: { filled: boolean; title: string }) {
  return filled ? (
    <IconCheck size={14} className="text-success" title={title} />
  ) : (
    <IconCircle size={14} className="text-base-content/30" title={title} />
  )
}
