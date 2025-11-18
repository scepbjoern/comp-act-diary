interface ReflectionDueBannerProps {
  reflectionDue: { due: boolean; daysSince: number } | null
}

export function ReflectionDueBanner({ reflectionDue }: ReflectionDueBannerProps) {
  if (!reflectionDue?.due) return null
  
  return (
    <div className="p-3 rounded border border-amber-500/60 bg-amber-900/20">
      <div className="text-sm">
        <span className="font-medium">Reflexion fällig:</span> Es ist {reflectionDue.daysSince} Tage her seit deiner letzten Reflexion.{' '}
        <a href="/reflections" className="underline">Jetzt eintragen</a>.
      </div>
    </div>
  )
}
