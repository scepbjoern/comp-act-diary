/**
 * Day-related types
 */

export type Day = {
  id: string
  date: string
  phase: 'PHASE_1' | 'PHASE_2' | 'PHASE_3'
  careCategory: 'SANFT' | 'MEDIUM' | 'INTENSIV'
  symptoms: Record<string, number | undefined>
  stool?: number
  habitTicks: { habitId: string; checked: boolean }[]
  userSymptoms?: { id: string; title: string; icon?: string | null; score?: number }[]
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
