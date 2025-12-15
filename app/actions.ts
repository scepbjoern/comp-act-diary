'use server'

import type { Day, DayNote, InlineData, Habit } from '@/types/day'

/**
 * Server actions for day-related operations
 */

export async function updateDayMeta(
  dayId: string,
  patch: Partial<Pick<Day, 'dayRating'>>
): Promise<Day> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/day/${dayId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  })
  const data = await res.json()
  return data.day
}

export async function updateStool(dayId: string, bristol: number): Promise<Day> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/day/${dayId}/stool`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bristol }),
  })
  const data = await res.json()
  return data.day
}

export async function addMealNote(
  dayId: string,
  mealTime: string,
  mealText: string
): Promise<{ notes: DayNote[] }> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/day/${dayId}/notes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'MEAL',
      time: mealTime || undefined,
      text: mealText.trim(),
      tzOffsetMinutes: new Date().getTimezoneOffset(),
    }),
  })
  return res.json()
}

export async function fetchDayData(date: string): Promise<{
  day: Day | null
  habits: Habit[]
  notes: DayNote[]
  symptomIcons: Record<string, string | null>
}> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/day?date=${date}`)
  return res.json()
}

export async function fetchInlineAnalytics(date: string): Promise<InlineData> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/analytics/inline?to=${date}`)
  return res.json()
}

export async function fetchReflectionsDue(): Promise<{ due: boolean; daysSince: number } | null> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/reflections/due`)
  return res.json()
}

export async function fetchCalendarData(yearMonth: string): Promise<{
  days: string[]
  reflectionDays: string[]
}> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/calendar?month=${yearMonth}`)
  return res.json()
}
