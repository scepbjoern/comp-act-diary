import { Icon } from '@/components/Icon'
import { fmtDmyFromYmd, shiftDate, shiftMonth } from '@/lib/date-utils'

interface DateNavigationProps {
  date: string
  onDateChange: (date: string) => void
}

export function DateNavigation({ date, onDateChange }: DateNavigationProps) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-xl font-semibold">
        <span className="inline-flex items-center gap-1">
          <Icon name="menu_book" />
          <span>Tagebuch {fmtDmyFromYmd(date)}</span>
        </span>
      </h2>
      <div className="flex items-center gap-1">
        <button 
          aria-label="Vorheriger Monat" 
          className="pill" 
          onClick={() => onDateChange(shiftMonth(date, -1))}
          title="Vorheriger Monat"
        >
          «
        </button>
        <button 
          aria-label="Vorheriger Tag" 
          className="pill" 
          onClick={() => onDateChange(shiftDate(date, -1))}
          title="Vorheriger Tag"
        >
          ‹
        </button>
        <input 
          type="date" 
          value={date} 
          onChange={e => onDateChange(e.target.value)} 
          className="bg-surface border border-slate-700 rounded px-2 py-1 text-sm" 
        />
        <button 
          aria-label="Nächster Tag" 
          className="pill" 
          onClick={() => onDateChange(shiftDate(date, +1))}
          title="Nächster Tag"
        >
          ›
        </button>
        <button 
          aria-label="Nächster Monat" 
          className="pill" 
          onClick={() => onDateChange(shiftMonth(date, +1))}
          title="Nächster Monat"
        >
          »
        </button>
      </div>
    </div>
  )
}
