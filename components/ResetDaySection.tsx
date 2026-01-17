'use client'

import { Icon } from '@/components/Icon'
import { useReadMode } from '@/hooks/useReadMode'

interface ResetDaySectionProps {
  onResetDay: () => Promise<void>
}

export function ResetDaySection({ onResetDay }: ResetDaySectionProps) {
  const { readMode } = useReadMode()

  // Hide entire section in read mode
  if (readMode) return null

  return (
    <div className="card p-4 space-y-3">
      <h2 className="font-medium">
        <span className="inline-flex items-center gap-1">
          <Icon name="warning" />
          <span>Tag zurücksetzen</span>
        </span>
      </h2>
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-400">
          Alle Angaben (Symptome, Stuhl, Gewohnheiten, Notizen) für diesen Tag löschen.
        </div>
        <button
          className="pill bg-red-600 text-white border-transparent hover:bg-red-500"
          onClick={onResetDay}
        >
          Zurücksetzen
        </button>
      </div>
    </div>
  )
}
