/**
 * BatchResults - Shows summary after batch processing completes.
 */

'use client'

import {
  IconCheck,
  IconAlertTriangle,
  IconRefresh,
  IconCoins,
} from '@tabler/icons-react'

// =============================================================================
// TYPES
// =============================================================================

interface BatchEntryResult {
  entryId: string
  entryTitle: string | null
  entryDate: string
  success: boolean
  stepsRun: string[]
  error?: string
}

interface BatchResultsProps {
  totalProcessed: number
  successCount: number
  errorCount: number
  totalTokensUsed: number
  results: BatchEntryResult[]
  onReset: () => void
}

// =============================================================================
// COMPONENT
// =============================================================================

export function BatchResults({
  totalProcessed,
  successCount,
  errorCount,
  totalTokensUsed,
  results,
  onReset,
}: BatchResultsProps) {
  const failedResults = results.filter(r => !r.success || r.error)

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="card bg-base-200 p-6 text-center">
        <div className="text-5xl mb-4">
          {errorCount === 0 ? '✅' : '⚠️'}
        </div>
        <h3 className="text-xl font-medium mb-2">
          Verarbeitung abgeschlossen
        </h3>
        <p className="text-base-content/70">
          {totalProcessed} {totalProcessed === 1 ? 'Eintrag' : 'Einträge'} verarbeitet
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card bg-success/10 p-4 text-center">
          <IconCheck size={24} className="mx-auto text-success mb-2" />
          <div className="text-2xl font-bold text-success">{successCount}</div>
          <div className="text-sm text-base-content/70">Erfolgreich</div>
        </div>
        <div className="card bg-error/10 p-4 text-center">
          <IconAlertTriangle size={24} className="mx-auto text-error mb-2" />
          <div className="text-2xl font-bold text-error">{errorCount}</div>
          <div className="text-sm text-base-content/70">Fehler</div>
        </div>
        <div className="card bg-info/10 p-4 text-center">
          <IconCoins size={24} className="mx-auto text-info mb-2" />
          <div className="text-2xl font-bold text-info">
            {totalTokensUsed.toLocaleString('de-CH')}
          </div>
          <div className="text-sm text-base-content/70">Tokens</div>
        </div>
      </div>

      {/* Failed Entries */}
      {failedResults.length > 0 && (
        <div className="card bg-error/5 border border-error/20 p-4">
          <h4 className="font-medium mb-3 flex items-center gap-2">
            <IconAlertTriangle size={18} className="text-error" />
            Fehlerhafte Einträge
          </h4>
          <ul className="space-y-2 text-sm">
            {failedResults.map(result => (
              <li key={result.entryId} className="flex items-start gap-2">
                <span className="text-error">•</span>
                <div>
                  <span className="font-medium">{result.entryDate}</span>
                  {' '}
                  {result.entryTitle ? `"${result.entryTitle}"` : '(kein Titel)'}
                  {result.error && (
                    <span className="text-error"> – {result.error}</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Reset Button */}
      <button className="btn btn-primary w-full" onClick={onReset}>
        <IconRefresh size={18} />
        Neue Verarbeitung starten
      </button>
    </div>
  )
}
