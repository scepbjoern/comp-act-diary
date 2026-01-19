/**
 * Simple calendar that shows current month and highlights days with data
 */
export function Calendar(props: { 
  date: string
  daysWithData: Set<string>
  reflectionDays: Set<string>
  onSelect: (d: string) => void 
}) {
  const { date, daysWithData, reflectionDays, onSelect } = props
  const [y, m, _d] = date.split('-').map(n => parseInt(n, 10))
  const firstOfMonth = new Date(y, (m || 1) - 1, 1)
  const startWeekDay = (firstOfMonth.getDay() + 6) % 7 // 0=Mon
  const daysInMonth = new Date(y, (m || 1), 0).getDate()
  const cells: { ymd: string | null; inMonth: boolean }[] = []
  
  // leading blanks
  for (let i = 0; i < startWeekDay; i++) {
    cells.push({ ymd: null, inMonth: false })
  }
  
  // month days
  for (let day = 1; day <= daysInMonth; day++) {
    const ymdStr = `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    cells.push({ ymd: ymdStr, inMonth: true })
  }

  // pad to complete weeks
  while (cells.length % 7 !== 0) {
    cells.push({ ymd: null, inMonth: false })
  }

  const weekDays = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']

  return (
    <div className="w-full">
      <div className="grid grid-cols-7 gap-1 mb-2 text-xs text-gray-400">
        {weekDays.map(wd => (
          <div key={wd} className="text-center">{wd}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((c, idx) => {
          if (!c.ymd) return <div key={idx} className="h-8 rounded bg-transparent" />
          const isSelected = c.ymd === date
          const hasData = daysWithData.has(c.ymd)
          const hasReflection = reflectionDays.has(c.ymd)
          return (
            <button
              key={c.ymd}
              className={`h-8 rounded border text-xs flex items-center justify-center ${
                isSelected ? 'bg-blue-600 text-white border-blue-600' : 'bg-surface border-slate-700 hover:border-slate-500'
              }`}
              onClick={() => onSelect(c.ymd!)}
              title={c.ymd}
            >
              <span className="relative">
                {parseInt(c.ymd.split('-')[2], 10)}
                {(hasData || hasReflection) && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex items-center gap-0.5">
                    {hasData && <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />}
                    {hasReflection && <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />}
                  </span>
                )}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
