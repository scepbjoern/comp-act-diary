import { Icon } from '@/components/Icon'
import { HabitChips } from '@/components/HabitChips'
import type { Day, Habit, InlineData } from '@/types/day'

interface HabitsSectionProps {
  day: Day
  habits: Habit[]
  inlineData: InlineData | null
  onToggleHabit: (habitId: string, checked: boolean) => void
}

export function HabitsSection({ day, habits, inlineData, onToggleHabit }: HabitsSectionProps) {
  return (
    <div className="space-y-3">
      <h3 className="font-medium text-sm">
        <span className="inline-flex items-center gap-1">
          <Icon name="checklist" />
          <span>Gewohnheiten</span>
        </span>
      </h3>
      <HabitChips 
        habits={habits} 
        ticks={day.habitTicks} 
        onToggle={onToggleHabit} 
        yesterdaySelectedIds={inlineData?.yesterday?.habits || []} 
      />
    </div>
  )
}
