import { Icon } from '@/components/ui/Icon'
import { SaveIndicator } from '@/components/ui/SaveIndicator'
import type { Day } from '@/types/day'

interface DaySettingsProps {
  day: Day
  onUpdateMeta: (patch: { dayRating?: number | null }) => void
  saving: boolean
  savedAt: number | null
}

export function DaySettings({ day, onUpdateMeta, saving, savedAt }: DaySettingsProps) {
  return (
    <div className="space-y-3">
      <h3 className="font-medium text-sm">
        <span className="inline-flex items-center gap-1">
          <Icon name="settings" />
          <span>Tages-Einstellungen</span>
        </span>
      </h3>
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-400 inline-flex items-center gap-1">
          <Icon name="star" />
          <span>Tagesbewertung</span>
        </span>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(rating => (
          <button 
            key={rating} 
            className={`pill ${day.dayRating === rating ? 'active' : ''}`} 
            onClick={() => onUpdateMeta({ dayRating: rating })}
          >
            {rating}
          </button>
        ))}
      </div>
      <SaveIndicator saving={saving} savedAt={savedAt} />
    </div>
  )
}
