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

/** Sharing status for a DayNote */
export type SharedStatus = 'owned' | 'shared-view' | 'shared-edit'

/** Access role for shared entries */
export type AccessRole = 'VIEWER' | 'EDITOR'

/** Audio attachment info for multi-audio support */
export type AudioAttachment = {
  id: string
  assetId: string
  filePath: string | null
  duration: number | null
  transcript: string | null
  transcriptModel: string | null
  capturedAt: string | null
  createdAt: string | null
}

export type DayNote = {
  id: string
  dayId: string
  type: 'MEAL' | 'REFLECTION' | 'DIARY'
  title?: string | null
  time?: string
  techTime?: string
  text: string
  aiSummary?: string | null
  analysis?: string | null
  contentUpdatedAt?: string | null
  audioFilePath?: string | null
  audioFileId?: string | null
  keepAudio?: boolean
  /** All audio attachments for multi-audio support */
  audioAttachments?: AudioAttachment[]
  photos?: { id: string; url: string }[]
  occurredAtIso?: string
  capturedAtIso?: string
  createdAtIso?: string
  audioCapturedAtIso?: string | null
  audioUploadedAtIso?: string | null
  // Cross-user sharing fields
  sharedStatus?: SharedStatus
  ownerUserId?: string
  ownerName?: string | null
  accessRole?: AccessRole | null
  /** Number of users this entry is shared with (for owned entries) */
  sharedWithCount?: number
}

export type InlineData = {
  days: string[]
  symptoms: Record<string, (number | null)[]>
  stool: (number | null)[]
  customSymptoms?: { defs: { id: string; title: string }[]; series: Record<string, (number | null)[]> }
  yesterday: { standard: Record<string, number | null>; custom: Record<string, number | null>; stool: number | null; habits: string[] }
}
