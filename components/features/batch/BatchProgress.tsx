/**
 * BatchProgress - Shows progress during batch processing.
 */

'use client'

import { IconLoader2 } from '@tabler/icons-react'

// =============================================================================
// TYPES
// =============================================================================

interface BatchProgressProps {
  current: number
  total: number
  currentTitle: string | null
  currentStep: string | null
  successCount: number
  errorCount: number
}

// =============================================================================
// COMPONENT
// =============================================================================

export function BatchProgress({
  current,
  total,
  currentTitle,
  currentStep,
  successCount,
  errorCount,
}: BatchProgressProps) {
  const percent = total > 0 ? Math.round((current / total) * 100) : 0

  return (
    <div className="card bg-base-200 p-6 space-y-6">
      {/* Header */}
      <div className="text-center">
        <IconLoader2 size={48} className="mx-auto text-primary animate-spin" />
        <h3 className="text-xl font-medium mt-4">Verarbeitung läuft</h3>
      </div>

      {/* Progress Counter */}
      <div className="text-center text-lg">
        Verarbeite Eintrag <span className="font-bold">{current}</span> von{' '}
        <span className="font-bold">{total}</span>
      </div>

      {/* Progress Bar */}
      <div className="w-full">
        <progress
          className="progress progress-primary w-full h-4"
          value={percent}
          max={100}
        />
        <div className="text-right text-sm text-base-content/70 mt-1">{percent}%</div>
      </div>

      {/* Current Entry */}
      {currentTitle && (
        <div className="text-center text-base-content/70">
          <div className="text-sm">Aktuell:</div>
          <div className="font-medium truncate max-w-md mx-auto">
            &quot;{currentTitle}&quot;
          </div>
          {currentStep && (
            <div className="text-sm mt-1">Schritt: {getStepLabel(currentStep)}...</div>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="flex justify-center gap-8 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-success">✅</span>
          <span>{successCount} erfolgreich</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-error">❌</span>
          <span>{errorCount} Fehler</span>
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// HELPERS
// =============================================================================

function getStepLabel(step: string): string {
  switch (step) {
    case 'title': return 'Titel generieren'
    case 'content': return 'Text verbessern'
    case 'analysis': return 'Analyse erstellen'
    case 'summary': return 'Zusammenfassung erstellen'
    default: return step
  }
}
