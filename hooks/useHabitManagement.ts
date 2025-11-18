import { useCallback, useState } from 'react'

type Habit = { id: string; title: string; userId?: string | null; icon?: string | null }
type HabitTick = { habitId: string; checked: boolean }

export function useHabitManagement(
  dayId: string | null,
  onSavingChange: (saving: boolean) => void
) {
  const [habits, setHabits] = useState<Habit[]>([])

  const toggleHabit = useCallback(async (habitId: string, checked: boolean) => {
    if (!dayId) return
    
    onSavingChange(true)
    
    try {
      const res = await fetch(`/api/day/${dayId}/habit-ticks`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ habitId, checked }),
        credentials: 'same-origin',
      })
      
      const data = await res.json()
      return data.day
    } catch (error) {
      console.error('Toggle habit failed:', error)
      return null
    } finally {
      onSavingChange(false)
    }
  }, [dayId, onSavingChange])

  return {
    // State
    habits,
    
    // Setters
    setHabits,
    
    // Actions
    toggleHabit,
  }
}
