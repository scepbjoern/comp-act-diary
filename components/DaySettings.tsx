import { Icon } from '@/components/Icon'
import { SaveIndicator } from '@/components/SaveIndicator'
import type { Day } from '@/types/day'

interface DaySettingsProps {
  day: Day
  onUpdateMeta: (patch: Partial<Pick<Day, 'phase' | 'careCategory'>>) => void
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
          <Icon name="cycle" />
          <span>Phase</span>
        </span>
        {[1, 2, 3].map(p => {
          const key = `PHASE_${p}` as Day['phase']
          return (
            <button 
              key={key} 
              className={`pill ${day.phase === key ? 'active' : ''}`} 
              onClick={() => onUpdateMeta({ phase: key })}
            >
              {p}
            </button>
          )
        })}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-400 inline-flex items-center gap-1">
          <Icon name="stairs_2" />
          <span>Kategorie</span>
        </span>
        {(['SANFT', 'MEDIUM', 'INTENSIV'] as const).map(c => (
          <button 
            key={c} 
            className={`pill ${day.careCategory === c ? 'active' : ''}`} 
            onClick={() => onUpdateMeta({ careCategory: c })}
          >
            {c.charAt(0) + c.slice(1).toLowerCase()}
          </button>
        ))}
      </div>
      <SaveIndicator saving={saving} savedAt={savedAt} />
    </div>
  )
}
