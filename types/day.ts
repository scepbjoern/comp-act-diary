/**
 * Day-related types
 * 
 * Nach Schema-Migration: DayEntry ist jetzt mit TimeBox verknüpft.
 * phase/careCategory wurden entfernt (waren Darmkur-spezifisch).
 */

export type Day = {
  id: string
  date: string // aus TimeBox.localDate
  timeBoxId?: string // Referenz auf TimeBox
  // phase und careCategory wurden entfernt (Schema-Migration)
  symptoms: Record<string, number | undefined>
  stool?: number
  habitTicks: { habitId: string; checked: boolean }[]
  userSymptoms?: { id: string; title: string; icon?: string | null; score?: number }[]
  dayRating?: number | null
  aiSummary?: string | null
}

export type Habit = { 
  id: string
  title: string
  userId?: string | null
  icon?: string | null
}

export type DayNote = {
  id: string
  dayId: string
  type: 'MEAL' | 'REFLECTION' | 'DIARY'
  title?: string | null
  time?: string
  techTime?: string
  text: string
  originalTranscript?: string | null
  aiSummary?: string | null
  analysis?: string | null
  contentUpdatedAt?: string | null
  audioFilePath?: string | null
  audioFileId?: string | null
  keepAudio?: boolean
  photos?: { id: string; url: string }[]
  occurredAtIso?: string
  createdAtIso?: string
}

export type InlineData = {
  days: string[]
  symptoms: Record<string, (number | null)[]>
  stool: (number | null)[]
  customSymptoms?: { defs: { id: string; title: string }[]; series: Record<string, (number | null)[]> }
  yesterday: { standard: Record<string, number | null>; custom: Record<string, number | null>; stool: number | null; habits: string[] }
}
