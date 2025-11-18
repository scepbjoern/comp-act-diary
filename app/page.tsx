"use client"
import React, { useEffect, useMemo, useState } from 'react'
import { NumberPills } from '@/components/NumberPills'
import { Sparkline } from '@/components/Sparkline'
import { HabitChips } from '@/components/HabitChips'
import { SaveIndicator, useSaveIndicator } from '@/components/SaveIndicator'
import { CameraPicker } from '@/components/CameraPicker'
import { MicrophoneButton } from '@/components/MicrophoneButton'
import { ImproveTextButton } from '@/components/ImproveTextButton'
import { SaveBar } from '@/components/SaveBar'
import { Toasts, useToasts } from '@/components/Toast'
import { Icon } from '@/components/Icon'
import { MealNotesAccordion } from '@/components/MealNotesAccordion'
import { DiaryEntriesAccordion } from '@/components/DiaryEntriesAccordion'
import { DEFAULT_STOOL_ICON } from '@/lib/default-icons'
import { AudioPlayerH5 } from '@/components/AudioPlayerH5'
import AudioUploadButton from '@/components/AudioUploadButton'
import { RichTextEditor } from '@/components/RichTextEditor'

const SYMPTOM_LABELS: Record<string, string> = {
  BESCHWERDEFREIHEIT: 'Beschwerdefreiheit',
  ENERGIE: 'Energielevel',
  STIMMUNG: 'Stimmung',
  SCHLAF: 'Schlaf',
  ENTSPANNUNG: 'Zeit für Entspannung',
  HEISSHUNGERFREIHEIT: 'Heißhungerfreiheit',
  BEWEGUNG: 'Bewegungslevel',
}

type Day = {
  id: string
  date: string
  phase: 'PHASE_1' | 'PHASE_2' | 'PHASE_3'
  careCategory: 'SANFT' | 'MEDIUM' | 'INTENSIV'
  symptoms: Record<string, number | undefined>
  stool?: number
  habitTicks: { habitId: string; checked: boolean }[]
  userSymptoms?: { id: string; title: string; icon?: string | null; score?: number }[]
}

type Habit = { id: string; title: string; userId?: string | null; icon?: string | null }

type DayNote = {
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

function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function fmtHMLocal(iso?: string) {
  if (!iso) return '—'
  const d = new Date(iso)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}

function fmtDmyFromYmd(ymdStr: string) {
  const [y, m, d] = (ymdStr || '').split('-')
  if (!y || !m || !d) return ymdStr
  const dd = String(parseInt(d, 10))
  const mm = String(parseInt(m, 10))
  return `${dd}.${mm}.${y}`
}

// Simple calendar that shows current month and highlights days with data
function Calendar(props: { date: string; daysWithData: Set<string>; reflectionDays: Set<string>; onSelect: (d: string) => void }) {
  const { date, daysWithData, reflectionDays, onSelect } = props
  const [y, m, _d] = date.split('-').map(n => parseInt(n, 10))
  const firstOfMonth = new Date(y, (m || 1) - 1, 1)
  const startWeekDay = (firstOfMonth.getDay() + 6) % 7 // 0=Mon
  const daysInMonth = new Date(y, (m || 1), 0).getDate()
  const cells: { ymd: string | null; inMonth: boolean }[] = []
  // leading blanks
  for (let i = 0; i < startWeekDay; i++) cells.push({ ymd: null, inMonth: false })
  // month days
  for (let day = 1; day <= daysInMonth; day++) {
    const ymdStr = `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    cells.push({ ymd: ymdStr, inMonth: true })
  }

  // pad to complete weeks
  while (cells.length % 7 !== 0) cells.push({ ymd: null, inMonth: false })

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

export default function HeutePage() {
  const [date, setDate] = useState(() => ymd(new Date()))
  const [day, setDay] = useState<Day | null>(null)
  const [symptomIcons, setSymptomIcons] = useState<Record<string, string | null>>({})
  const [habits, setHabits] = useState<Habit[]>([])
  const [notes, setNotes] = useState<DayNote[]>([])
  const [daysWithData, setDaysWithData] = useState<Set<string>>(new Set())
  const [reflectionDays, setReflectionDays] = useState<Set<string>>(new Set())
  const [mealTime, setMealTime] = useState('')
  const [mealText, setMealText] = useState('')
  const { saving, savedAt, startSaving, doneSaving } = useSaveIndicator()
  const [forceBarVisible, setForceBarVisible] = useState(false)
  const [viewer, setViewer] = useState<{ noteId: string; index: number } | null>(null)
  const [swipeStartX, setSwipeStartX] = useState<number | null>(null)
  const [reflectionDue, setReflectionDue] = useState<{ due: boolean; daysSince: number } | null>(null)
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [editingTime, setEditingTime] = useState<string>('')
  const [editingText, setEditingText] = useState<string>('')
  const [editingTitle, setEditingTitle] = useState<string>('')
  const [darmkurCollapsed, setDarmkurCollapsed] = useState(true)
  // Diary entries state
  const [newDiaryText, setNewDiaryText] = useState('')
  const [newDiaryTitle, setNewDiaryTitle] = useState('')
  const [newDiaryAudio, setNewDiaryAudio] = useState<string | null>(null)
  const [newDiaryAudioFileId, setNewDiaryAudioFileId] = useState<string | null>(null)
  const [newDiaryOriginalTranscript, setNewDiaryOriginalTranscript] = useState<string | null>(null)
  const [newDiaryTime, setNewDiaryTime] = useState('')
  const [editorKey, setEditorKey] = useState(0) // Force editor remount
  const [keepAudio, setKeepAudio] = useState(true)
  const [showRetranscribeOptions, setShowRetranscribeOptions] = useState(false)
  const [isRetranscribing, setIsRetranscribing] = useState(false)
  const [notesLoading, setNotesLoading] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)
  const [pendingAudioDelete, setPendingAudioDelete] = useState<string | null>(null)
  const { toasts, push, dismiss } = useToasts()
  // Draft states for symptoms to enable manual save and clear UX feedback on slow connections
  const [draftSymptoms, setDraftSymptoms] = useState<Record<string, number | undefined>>({})
  const [draftUserSymptoms, setDraftUserSymptoms] = useState<Record<string, number | undefined>>({})
  const [clearedSymptoms, setClearedSymptoms] = useState<Set<string>>(new Set())
  const [clearedUserSymptoms, setClearedUserSymptoms] = useState<Set<string>>(new Set())

  // Inline analytics (7-day series + yesterday values)
  type InlineData = {
    days: string[]
    symptoms: Record<string, (number | null)[]>
    stool: (number | null)[]
    customSymptoms?: { defs: { id: string; title: string }[]; series: Record<string, (number | null)[]> }
    yesterday: { standard: Record<string, number | null>; custom: Record<string, number | null>; stool: number | null; habits: string[] }
  }
  const [inlineData, setInlineData] = useState<InlineData | null>(null)

  function startEditNote(n: DayNote) {
    setEditingNoteId(n.id)
    setEditingTime(fmtHMLocal(n.occurredAtIso))
    setEditingText(n.text || '')
    setEditingTitle(n.title || '')
  }

  function cancelEditNote() {
    setEditingNoteId(null)
    setEditingTime('')
    setEditingText('')
  }

  async function saveEditNote(noteId: string) {
    try {
      const res = await fetch(`/api/notes/${noteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editingTitle.trim() || null, text: editingText, time: editingTime }),
        credentials: 'same-origin',
      })
      const data = await res.json()
      if (data?.notes) setNotes(data.notes)
      cancelEditNote()
    } catch (e) {
      console.error('Edit note failed', e)
    }
  }

  async function deleteNote(noteId: string) {
    if (!window.confirm('Tagebucheintrag wirklich löschen? Audio wird ebenfalls gelöscht.')) return
    setPendingDelete(noteId)
    try {
      const res = await fetch(`/api/notes/${noteId}`, { method: 'DELETE', credentials: 'same-origin' })
      const data = await res.json()
      if (data?.notes) setNotes(data.notes)
      if (editingNoteId === noteId) cancelEditNote()
      push('Eintrag gelöscht', 'success')
    } catch (e) {
      console.error('Delete note failed', e)
      push('Löschen fehlgeschlagen', 'error')
    } finally {
      setPendingDelete(null)
    }
  }

  async function deleteAudio(noteId: string) {
    const note = notes.find(n => n.id === noteId)
    if (!note?.audioFilePath) return
    if (!window.confirm('Nur die Audioaufnahme löschen?')) return
    setPendingAudioDelete(noteId)
    try {
      const res = await fetch(`/api/notes/${note.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ audioFilePath: null, keepAudio: false }),
      })
      const data = await res.json()
      if (data?.notes) setNotes(data.notes)
      push('Audio gelöscht', 'info')
    } catch (e) {
      console.error('Delete audio failed', e)
      push('Audio löschen fehlgeschlagen', 'error')
    } finally {
      setPendingAudioDelete(null)
    }
  }

  async function retranscribeAudio(model: string) {
    if (!newDiaryAudioFileId) return
    
    setIsRetranscribing(true)
    setShowRetranscribeOptions(false)
    
    try {
      console.log('Starting re-transcription with model:', model)
      
      const formData = new FormData()
      formData.append('audioFileId', newDiaryAudioFileId)
      formData.append('model', model)
      
      const response = await fetch('/api/diary/retranscribe', {
        method: 'POST',
        body: formData,
        credentials: 'same-origin'
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        console.error('Re-transcription failed:', errorData)
        push(`Re-Transkription fehlgeschlagen: ${errorData.error || 'Unbekannter Fehler'}`, 'error')
        return
      }
      
      const data = await response.json()
      console.log('Re-transcription successful:', data)
      
      // Update both the text and original transcript
      setNewDiaryText(data.text)
      setNewDiaryOriginalTranscript(data.text)
      
      push(`Re-Transkription mit ${model} erfolgreich!`, 'success')
    } catch (error) {
      console.error('Re-transcription error:', error)
      push('Re-Transkription fehlgeschlagen: Netzwerkfehler', 'error')
    } finally {
      setIsRetranscribing(false)
    }
  }

  async function handleRetranscribe(noteId: string, newText: string) {
    // Update the local state to reflect the new transcription
    setNotes(prev => prev.map(note => 
      note.id === noteId 
        ? { ...note, text: newText, originalTranscript: newText }
        : note
    ))
    push('Transkription aktualisiert', 'success')
  }

  async function cleanupAudioFile(audioFileId: string) {
    try {
      const res = await fetch('/api/diary/cleanup-audio', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audioFileId }),
        credentials: 'same-origin'
      })
      
      if (!res.ok) {
        const errorData = await res.json()
        console.error('Cleanup audio failed:', errorData)
        // Don't show error to user if it's just that the file is still in use
        if (errorData.error !== 'Audio file is still in use') {
          push('Audio-Cleanup fehlgeschlagen', 'error')
        }
      } else {
        console.log('Audio file cleaned up successfully:', audioFileId)
      }
    } catch (e) {
      console.error('Cleanup audio error:', e)
      // Don't show error to user for cleanup failures
    }
  }

  function clearDiaryForm() {
    // Clean up audio file ONLY if it exists and wasn't saved
    if (newDiaryAudioFileId) {
      // Check if this audio file is referenced by any existing notes
      const isReferenced = notes.some(note => note.audioFileId === newDiaryAudioFileId)
      if (!isReferenced) {
        cleanupAudioFile(newDiaryAudioFileId)
      }
    }
    
    // Reset form state
    setNewDiaryText('')
    setNewDiaryAudio(null)
    setNewDiaryAudioFileId(null)
    setNewDiaryOriginalTranscript(null)
    setNewDiaryTime('')
    setShowRetranscribeOptions(false)
    setIsRetranscribing(false)
  }

  const goViewer = (delta: number) => {
    setViewer(v => {
      if (!v) return null
      const note = notes.find(nn => nn.id === v.noteId)
      const photos = note?.photos || []
      if (photos.length === 0) return v
      const nextIdx = (v.index + delta + photos.length) % photos.length
      return { ...v, index: nextIdx }
    })
  }

  useEffect(() => {
    async function load() {
      setNotesLoading(true)
      try {
        const res = await fetch(`/api/day?date=${date}`, { credentials: 'same-origin' })
        const data = await res.json()
        setDay(data.day)
        setHabits(data.habits)
        setNotes(data.notes ?? [])
        setSymptomIcons(data.symptomIcons || {})
        // Prefill current time (HH:MM) when date changes or page loads
        const now = new Date()
        const hh = String(now.getHours()).padStart(2, '0')
        const mm = String(now.getMinutes()).padStart(2, '0')
        setMealTime(`${hh}:${mm}`)
        setNewDiaryTime(`${hh}:${mm}`)
        // Set default title based on date and time
        setNewDiaryTitle(`${date} ${hh}:${mm}`)
      } finally {
        setNotesLoading(false)
      }
    }
    load()
  }, [date])

  // Update diary title when time changes
  useEffect(() => {
    if (newDiaryTime && date) {
      setNewDiaryTitle(`${date} ${newDiaryTime}`)
    }
  }, [newDiaryTime, date])

  // Load inline analytics with small debounce and abort on date change
  useEffect(() => {
    let aborted = false
    const ctrl = new AbortController()
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/analytics/inline?to=${date}`, { credentials: 'same-origin', signal: ctrl.signal })
        if (!res.ok) return
        const j = await res.json()
        if (!aborted) setInlineData(j)
      } catch {}
    }, 150)
    return () => { aborted = true; ctrl.abort(); clearTimeout(t) }
  }, [date])

  // Check if a reflection is due (business logic: > 6 Tage)
  useEffect(() => {
    let aborted = false
    ;(async () => {
      try {
        const res = await fetch('/api/reflections/due', { credentials: 'same-origin' })
        if (!res.ok) return
        const data = await res.json()
        if (!aborted) setReflectionDue({ due: !!data.due, daysSince: data.daysSince ?? 0 })
      } catch {
        // ignore
      }
    })()
    return () => { aborted = true }
  }, [])

  // Load calendar markers for the current month of the selected date (general data + reflections)
  useEffect(() => {
    const [y, m] = date.split('-')
    const ym = `${y}-${m}`
    let aborted = false
    ;(async () => {
      try {
        const res = await fetch(`/api/calendar?month=${ym}`, { credentials: 'same-origin' })
        if (!res.ok) return
        const data = await res.json()
        if (!aborted) {
          setDaysWithData(new Set<string>(data?.days ?? []))
          setReflectionDays(new Set<string>(data?.reflectionDays ?? []))
        }
      } catch {
        // ignore
      }
    })()
    return () => { aborted = true }
  }, [date])

  // When day changes, discard any symptom drafts to avoid leaking to a different day
  useEffect(() => {
    setDraftSymptoms({})
    setDraftUserSymptoms({})
    setClearedSymptoms(new Set())
    setClearedUserSymptoms(new Set())
  }, [day?.id])

  async function uploadPhotos(noteId: string, files: FileList | File[]) {
    try {
      const formData = new FormData()
      if ((files as FileList).length !== undefined && typeof (files as FileList).item === 'function') {
        Array.from(files as FileList).forEach(f => formData.append('files', f))
      } else {
        (files as File[]).forEach(f => formData.append('files', f))
      }
      
      // Find the note and pass its time for proper file naming
      const note = notes.find(n => n.id === noteId)
      if (note?.time) {
        formData.append('time', note.time)
      }
      
      // Optional image settings from localStorage for server-side processing
      try {
        const raw = localStorage.getItem('imageSettings')
        if (raw) {
          const s = JSON.parse(raw)
          if (s?.format) formData.append('imageFormat', String(s.format))
          if (s?.quality) formData.append('imageQuality', String(s.quality))
          if (s?.maxWidth) formData.append('imageMaxWidth', String(s.maxWidth))
          if (s?.maxHeight) formData.append('imageMaxHeight', String(s.maxHeight))
        }
      } catch {}
      const res = await fetch(`/api/notes/${noteId}/photos`, { method: 'POST', body: formData, credentials: 'same-origin' })
      const data = await res.json()
      if (data?.notes) setNotes(data.notes)
    } catch (e) {
      console.error('Upload failed', e)
    }
  }

  async function deletePhoto(photoId: string) {
    try {
      const res = await fetch(`/api/photos/${photoId}`, { method: 'DELETE', credentials: 'same-origin' })
      const data = await res.json()
      if (data?.ok) {
        setNotes(prev => prev.map(n => ({ ...n, photos: (n.photos || []).filter(p => p.id !== photoId) })))
      }
    } catch (e) {
      console.error('Delete failed', e)
    }
  }

  async function updateDayMeta(patch: Partial<Pick<Day, 'phase' | 'careCategory'>>) {
    if (!day) return
    startSaving()
    const res = await fetch(`/api/day/${day.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
      credentials: 'same-origin',
    })
    const data = await res.json()
    setDay(data.day)
    doneSaving()
  }
  // Removed unused updateUserSymptom and updateSymptom (replaced by draft-based save)

  async function updateStool(bristol: number) {
    if (!day) return
    startSaving()
    const res = await fetch(`/api/day/${day.id}/stool`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bristol }),
      credentials: 'same-origin',
    })
    const data = await res.json()
    setDay(data.day)
    // Refresh inline analytics so stool sparkline updates immediately
    try {
      const res2 = await fetch(`/api/analytics/inline?to=${date}`, { credentials: 'same-origin' })
      if (res2.ok) {
        const j2 = await res2.json()
        setInlineData(j2)
      }
    } catch {}
    doneSaving()
  }

  // Draft helpers for Symptome: set locally first, then allow manual save
  function setDraftSymptom(type: string, score: number) {
    if (!day) return
    // selecting a new value removes any clear-intent
    setClearedSymptoms(prev => {
      if (prev.has(type)) {
        const next = new Set(prev)
        next.delete(type)
        return next
      }
      return prev
    })
    setDraftSymptoms(prev => {
      const serverVal = day?.symptoms?.[type]
      if (serverVal === score) {
        const { [type]: _omit, ...rest } = prev
        return rest
      }
      return { ...prev, [type]: score }
    })
  }

  function setDraftUserSymptom(id: string, score: number) {
    if (!day) return
    setClearedUserSymptoms(prev => {
      if (prev.has(id)) {
        const next = new Set(prev)
        next.delete(id)
        return next
      }
      return prev
    })
    setDraftUserSymptoms(prev => {
      const serverVal = (day?.userSymptoms || []).find(u => u.id === id)?.score
      if (serverVal === score) {
        const { [id]: _omit, ...rest } = prev
        return rest
      }
      return { ...prev, [id]: score }
    })
  }

  function clearDraftSymptom(type: string) {
    if (!day) return
    // remove any draft value and mark as cleared
    setDraftSymptoms(prev => {
      if (prev[type] !== undefined) {
        const { [type]: _omit, ...rest } = prev
        return rest
      }
      return prev
    })
    setClearedSymptoms(prev => new Set(prev).add(type))
  }

  function clearDraftUserSymptom(id: string) {
    if (!day) return
    setDraftUserSymptoms(prev => {
      if (prev[id] !== undefined) {
        const { [id]: _omit, ...rest } = prev
        return rest
      }
      return prev
    })
    setClearedUserSymptoms(prev => new Set(prev).add(id))
  }

  const unsavedSymptomCount = useMemo(() => (
    Object.keys(draftSymptoms).length + Object.keys(draftUserSymptoms).length + clearedSymptoms.size + clearedUserSymptoms.size
  ), [draftSymptoms, draftUserSymptoms, clearedSymptoms, clearedUserSymptoms])

  const combinedDirtyCount = useMemo(() => unsavedSymptomCount, [unsavedSymptomCount])

  async function saveDraftSymptoms() {
    if (!day) return
    const entries = Object.entries(draftSymptoms).filter(([, v]) => typeof v === 'number') as [string, number][]
    const userEntries = Object.entries(draftUserSymptoms).filter(([, v]) => typeof v === 'number') as [string, number][]
    const cleared = Array.from(clearedSymptoms)
    const clearedUser = Array.from(clearedUserSymptoms)
    if (entries.length === 0 && userEntries.length === 0 && cleared.length === 0 && clearedUser.length === 0) return
    startSaving()
    try {
      await Promise.all([
        ...entries.map(([type, score]) => fetch(`/api/day/${day.id}/symptoms`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type, score }), credentials: 'same-origin',
        }).then(r => r.json()).catch(() => ({}))),
        ...userEntries.map(([userSymptomId, score]) => fetch(`/api/day/${day.id}/user-symptoms`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userSymptomId, score }), credentials: 'same-origin',
        }).then(r => r.json()).catch(() => ({}))),
        ...cleared.map((type) => fetch(`/api/day/${day.id}/symptoms`, {
          method: 'DELETE', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type }), credentials: 'same-origin',
        }).then(r => r.json()).catch(() => ({}))),
        ...clearedUser.map((userSymptomId) => fetch(`/api/day/${day.id}/user-symptoms`, {
          method: 'DELETE', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userSymptomId }), credentials: 'same-origin',
        }).then(r => r.json()).catch(() => ({}))),
      ])
      // Refresh authoritative day payload once after all updates
      try {
        const res = await fetch(`/api/day?date=${date}`, { credentials: 'same-origin' })
        const data = await res.json()
        if (data?.day) setDay(data.day)
        if (data?.notes) setNotes(data.notes)
        if (data?.habits) setHabits(data.habits)
        if (data?.symptomIcons) setSymptomIcons(data.symptomIcons)
      } catch {}
      setDraftSymptoms({})
      setDraftUserSymptoms({})
      setClearedSymptoms(new Set())
      setClearedUserSymptoms(new Set())
      // Refresh inline analytics so symptom sparklines update immediately
      try {
        const res2 = await fetch(`/api/analytics/inline?to=${date}`, { credentials: 'same-origin' })
        if (res2.ok) {
          const j2 = await res2.json()
          setInlineData(j2)
        }
      } catch {}
    } finally {
      doneSaving()
    }
  }

  function discardDraftSymptoms() {
    setDraftSymptoms({})
    setDraftUserSymptoms({})
    setClearedSymptoms(new Set())
    setClearedUserSymptoms(new Set())
    push('Änderungen verworfen', 'info')
  }

  async function saveAll() {
    try {
      if (unsavedSymptomCount > 0) await saveDraftSymptoms()
      if (unsavedSymptomCount === 0) return
      // Show confirmation inline in SaveBar for 1s
      setForceBarVisible(true)
      setTimeout(() => setForceBarVisible(false), 2000)
    } catch (e) {
      console.error('Save failed', e)
      push('Speichern fehlgeschlagen', 'error')
    }
  }

  function discardAll() {
    if (unsavedSymptomCount > 0) {
      discardDraftSymptoms()
      push('Änderungen verworfen', 'info')
    }
  }

  async function toggleHabit(habitId: string, checked: boolean) {
    if (!day) return
    startSaving()
    const res = await fetch(`/api/day/${day.id}/habit-ticks`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ habitId, checked }),
      credentials: 'same-origin',
    })
    const data = await res.json()
    setDay(data.day)
    doneSaving()
  }

  // Diary entry functions
  async function saveDiaryEntry() {
    if (!day || !newDiaryText.trim()) return
    startSaving()
    try {
      const res = await fetch(`/api/day/${day.id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'DIARY',
          title: newDiaryTitle.trim() || null,
          text: newDiaryText.trim(),
          audioFileId: newDiaryAudioFileId,
          keepAudio,
          originalTranscript: newDiaryOriginalTranscript,
          time: newDiaryTime || new Date().toISOString().slice(11, 16),
          tzOffsetMinutes: new Date().getTimezoneOffset(),
        }),
        credentials: 'same-origin',
      })
      const data = await res.json()
      if (data?.notes) setNotes(data.notes)
      // Reset form WITHOUT cleanup (audio was saved successfully)
      setNewDiaryText('')
      setNewDiaryAudio(null)
      setNewDiaryAudioFileId(null)
      setNewDiaryOriginalTranscript(null)
      // Reset time to current time for next entry
      const now = new Date()
      const hh = String(now.getHours()).padStart(2, '0')
      const mm = String(now.getMinutes()).padStart(2, '0')
      setNewDiaryTime(`${hh}:${mm}`)
      setNewDiaryTitle(`${date} ${hh}:${mm}`)
      setShowRetranscribeOptions(false)
      setIsRetranscribing(false)
      setEditorKey(prev => prev + 1) // Force editor remount
      
      push('Tagebucheintrag gespeichert', 'success')
    } catch (e) {
      console.error('Save diary entry failed', e)
      push('Speichern fehlgeschlagen', 'error')
    } finally {
      doneSaving()
    }
  }

  function shiftDate(cur: string, delta: number) {
    const [y, m, d] = cur.split('-').map(Number)
    const dt = new Date(y, (m || 1) - 1, d || 1)
    dt.setDate(dt.getDate() + delta)
    return ymd(dt)
  }

  async function addMealNote() {
    if (!day || !mealText.trim()) return
    startSaving()
    const res = await fetch(`/api/day/${day.id}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'MEAL',
        time: mealTime || undefined,
        text: mealText.trim(),
        tzOffsetMinutes: new Date().getTimezoneOffset(),
      }),
      credentials: 'same-origin',
    })
    const data = await res.json()
    if (data?.notes) setNotes(data.notes)
    setMealText('')
    // Refill with current time for quick subsequent entries
    const now = new Date()
    const hh = String(now.getHours()).padStart(2, '0')
    const mm = String(now.getMinutes()).padStart(2, '0')
    setMealTime(`${hh}:${mm}`)
    doneSaving()
  }

  const symptoms = useMemo(() => Object.keys(SYMPTOM_LABELS), [])
  const collator = useMemo(() => new Intl.Collator('de-DE', { sensitivity: 'base' }), [])
  const sortedUserSymptoms = useMemo(() => {
    const arr = day?.userSymptoms ? [...day.userSymptoms] : []
    return arr.sort((a, b) => collator.compare(a.title, b.title))
  }, [day?.userSymptoms, collator])


  return (
    <div className="space-y-6">
      {/* App Branding */}
      <div className="text-center space-y-1 py-4">
        <h1 className="text-3xl font-bold">CompACT Diary</h1>
        <p className="text-lg text-gray-400 font-light">Set. Track. Reflect. Act.</p>
      </div>

      {/* Date Navigation */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">
          <span className="inline-flex items-center gap-1">
            <Icon name="menu_book" />
            <span>Tagebuch {fmtDmyFromYmd(date)}</span>
          </span>
        </h2>
        <div className="flex items-center gap-2">
          <button aria-label="Vorheriger Tag" className="pill" onClick={() => setDate(d => shiftDate(d, -1))}>‹</button>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="bg-surface border border-slate-700 rounded px-2 py-1 text-sm" />
          <button aria-label="Nächster Tag" className="pill" onClick={() => setDate(d => shiftDate(d, +1))}>›</button>
        </div>
      </div>

      {/* Calendar Widget */}
      <div className="card p-4 space-y-3">
        <Calendar date={date} daysWithData={daysWithData} reflectionDays={reflectionDays} onSelect={(d) => setDate(d)} />
      </div>

      {reflectionDue?.due && (
        <div className="p-3 rounded border border-amber-500/60 bg-amber-900/20">
          <div className="text-sm">
            <span className="font-medium">Reflexion fällig:</span> Es ist {reflectionDue.daysSince} Tage her seit deiner letzten Reflexion.{' '}
            <a href="/reflections" className="underline">Jetzt eintragen</a>.
          </div>
        </div>
      )}

      {day && (
        <>
          {/* Tagebuch Section - Multiple diary entries */}
          <div className="card p-4 space-y-3">
            <h2 className="font-medium">
              <span className="inline-flex items-center gap-1">
                <Icon name="edit_note" />
                <span>Tagebuch</span>
              </span>
            </h2>

            {/* New diary entry form */}
            <div className="space-y-2 p-3 rounded border border-slate-700 bg-slate-800/30">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs text-gray-400">Titel</span>
                <input 
                  type="text" 
                  value={newDiaryTitle}
                  onChange={e => setNewDiaryTitle(e.target.value)}
                  placeholder="Optional: Titel für Eintrag"
                  className="flex-1 bg-background border border-slate-700 rounded px-2 py-1 text-sm"
                />
                <button
                  className="btn btn-ghost btn-xs text-gray-300 hover:text-gray-100"
                  onClick={async () => {
                    if (!newDiaryText.trim()) {
                      push('Bitte erst Text eingeben', 'error')
                      return
                    }
                    try {
                      const res = await fetch('/api/generate-title', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ text: newDiaryText, model: 'gpt-4o-mini' })
                      })
                      const data = await res.json()
                      if (data.title) {
                        setNewDiaryTitle(data.title)
                        push('Titel generiert', 'success')
                      }
                    } catch (e) {
                      console.error('Title generation failed', e)
                      push('Titel-Generierung fehlgeschlagen', 'error')
                    }
                  }}
                  title="Titel mit KI generieren"
                >
                  ✨ Generieren
                </button>
              </div>
              
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs text-gray-400">Uhrzeit</span>
                <input 
                  type="time" 
                  value={newDiaryTime}
                  onChange={e => setNewDiaryTime(e.target.value)}
                  className="bg-background border border-slate-700 rounded px-2 py-1 text-sm"
                />
              </div>
              
              <RichTextEditor
                key={editorKey}
                markdown={newDiaryText}
                onChange={setNewDiaryText}
                placeholder="Neuer Tagebucheintrag..."
                time={newDiaryTime}
              />
              
              {/* Direct re-transcribe button for newly uploaded audio */}
              {newDiaryAudioFileId && (
                <div className="flex items-center gap-2 p-2 bg-slate-700/30 rounded">
                  <span className="text-xs text-gray-400">
                    Audio bereit {isRetranscribing && '(transkribiere...)'}
                  </span>
                  <div className="relative">
                    <button
                      className="btn btn-ghost btn-xs text-gray-300 hover:text-gray-100"
                      onClick={() => setShowRetranscribeOptions(!showRetranscribeOptions)}
                      disabled={isRetranscribing}
                      title="Audio mit anderem Modell erneut transkribieren"
                    >
                      {isRetranscribing ? '⏳' : '🔄'} Neu transkribieren
                    </button>
                    
                    {showRetranscribeOptions && (
                      <div className="absolute top-full left-0 mt-1 bg-surface border border-slate-700 rounded shadow-lg z-50 p-2 min-w-[200px]">
                        <div className="text-xs text-gray-400 mb-2">Modell auswählen:</div>
                        <button
                          className="btn btn-ghost btn-xs w-full justify-start text-left mb-1"
                          onClick={async () => {
                            await retranscribeAudio('openai/whisper-large-v3')
                          }}
                        >
                          openai/whisper-large-v3
                        </button>
                        <button
                          className="btn btn-ghost btn-xs w-full justify-start text-left mb-1"
                          onClick={async () => {
                            await retranscribeAudio('gpt-4o-mini-transcribe')
                          }}
                        >
                          gpt-4o-mini-transcribe
                        </button>
                        <button
                          className="btn btn-ghost btn-xs w-full justify-start text-left"
                          onClick={async () => {
                            await retranscribeAudio('gpt-4o-transcribe')
                          }}
                        >
                          gpt-4o-transcribe
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              <div className="flex items-center gap-2 flex-wrap">
                <MicrophoneButton
                  date={date}
                  time={newDiaryTime}
                  keepAudio={keepAudio}
                  onAudioData={({ text, audioFileId, audioFilePath }) => {
                    setNewDiaryText(prev => prev ? (prev + '\n\n' + text) : text)
                    if (audioFileId) {
                      setNewDiaryAudioFileId(audioFileId)
                      setNewDiaryAudio(audioFilePath || null)
                    }
                    // Force editor to remount with new text
                    setEditorKey(prev => prev + 1)
                  }}
                  className="text-gray-300 hover:text-gray-100"
                  compact
                />
                
                <AudioUploadButton
                  date={date}
                  time={newDiaryTime}
                  keepAudio={keepAudio}
                  onAudioUploaded={({ text, audioFileId, audioFilePath }) => {
                    setNewDiaryText(prev => prev ? (prev + '\n\n' + text) : text)
                    if (audioFileId) {
                      setNewDiaryAudioFileId(audioFileId)
                      setNewDiaryAudio(audioFilePath || null)
                    }
                    // Force editor to remount with new text
                    setEditorKey(prev => prev + 1)
                  }}
                  compact
                />
                
                <ImproveTextButton
                  text={newDiaryText}
                  onImprovedText={(t) => setNewDiaryText(t)}
                  onOriginalPreserved={(orig) => setNewDiaryOriginalTranscript(orig)}
                  className="text-gray-300 hover:text-gray-100"
                />
                
                <label className="flex items-center gap-1 text-xs text-gray-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={keepAudio}
                    onChange={e => setKeepAudio(e.target.checked)}
                    className="rounded"
                  />
                  Audio behalten
                </label>
                
                <button 
                  className="pill !bg-blue-600 !text-white hover:!bg-blue-500"
                  onClick={saveDiaryEntry}
                  disabled={!newDiaryText.trim()}
                >
                  Speichern
                </button>
                
                {(newDiaryText.trim() || newDiaryAudioFileId || newDiaryTime) && (
                  <button 
                    className="pill !bg-gray-600 !text-white hover:!bg-gray-500"
                    onClick={clearDiaryForm}
                  >
                    Abbrechen
                  </button>
                )}
              </div>
            </div>

            {/* Existing diary entries */}
            <DiaryEntriesAccordion
              notes={notes}
              editingNoteId={editingNoteId}
              editingText={editingText}
              editingTime={editingTime}
              editingTitle={editingTitle}
              onEdit={startEditNote}
              onSave={saveEditNote}
              onCancel={cancelEditNote}
              onDelete={deleteNote}
              onTextChange={setEditingText}
              onTimeChange={setEditingTime}
              onTitleChange={setEditingTitle}
              onUploadPhotos={uploadPhotos}
              onDeletePhoto={deletePhoto}
              onViewPhoto={(noteId, index) => setViewer({ noteId, index })}
              onDeleteAudio={deleteAudio}
              onRetranscribe={handleRetranscribe}
            />
            
            <SaveIndicator saving={saving} savedAt={savedAt} />
          </div>

          {/* Collapsible Darmkur-Tagebuch Section */}
          <div className="card p-4 space-y-3">
            <button 
              className="w-full flex items-center justify-between font-medium text-left"
              onClick={() => setDarmkurCollapsed(!darmkurCollapsed)}
            >
              <span className="inline-flex items-center gap-1">
                <Icon name="spa" />
                <span>Darmkur-Tagebuch</span>
              </span>
              <span className="text-gray-400">{darmkurCollapsed ? '▾' : '▴'}</span>
            </button>
            
            {!darmkurCollapsed && (
              <div className="space-y-6 pt-3">
                {/* Tages-Einstellungen */}
                <div className="space-y-3">
                  <h3 className="font-medium text-sm">
                    <span className="inline-flex items-center gap-1">
                      <Icon name="settings" />
                      <span>Tages-Einstellungen</span>
                    </span>
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-400 inline-flex items-center gap-1"><Icon name="cycle" /><span>Phase</span></span>
                    {[1, 2, 3].map(p => {
                      const key = `PHASE_${p}` as Day['phase']
                      return (
                        <button key={key} className={`pill ${day.phase === key ? 'active' : ''}`} onClick={() => updateDayMeta({ phase: key })}>
                          {p}
                        </button>
                      )
                    })}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-400 inline-flex items-center gap-1"><Icon name="stairs_2" /><span>Kategorie</span></span>
                    {(['SANFT', 'MEDIUM', 'INTENSIV'] as const).map(c => (
                      <button key={c} className={`pill ${day.careCategory === c ? 'active' : ''}`} onClick={() => updateDayMeta({ careCategory: c })}>
                        {c.charAt(0) + c.slice(1).toLowerCase()}
                      </button>
                    ))}
                  </div>
                  <SaveIndicator saving={saving} savedAt={savedAt} />
                </div>

                {/* Symptome */}
                <div className="space-y-4">
                  <h3 className="font-medium text-sm">
                    <span className="inline-flex items-center gap-1">
                      <Icon name="stethoscope" />
                      <span>Symptome</span>
                    </span>
                  </h3>
                  <div className="space-y-0">
                    {symptoms.map(type => {
                      const series = inlineData?.symptoms?.[type]
                      const prev = inlineData?.yesterday?.standard?.[type] ?? null
                      return (
                        <div key={type} className="space-y-1 !mb-[30px]">
                          <div className="text-sm text-gray-400">
                            <span className="inline-flex items-center gap-2">
                              {symptomIcons?.[type] ? <Icon name={symptomIcons[type]} /> : null}
                              <span>{SYMPTOM_LABELS[type]}</span>
                              {series && (
                                <span className="inline-flex items-center gap-2 ml-2">
                                  <Sparkline data={series} width={72} height={24} colorByValue midValue={5} />
                                </span>
                              )}
                            </span>
                          </div>
                          <NumberPills
                            min={1}
                            max={10}
                            value={clearedSymptoms.has(type) ? undefined : (draftSymptoms[type] ?? day.symptoms[type])}
                            onChange={n => setDraftSymptom(type, n)}
                            onClear={() => clearDraftSymptom(type)}
                            ariaLabel={SYMPTOM_LABELS[type]}
                            unsaved={draftSymptoms[type] !== undefined || clearedSymptoms.has(type)}
                            previousValue={typeof prev === 'number' ? prev : null}
                          />
                        </div>
                      )
                    })}
                  </div>
                  {/* Divider and heading for user-defined symptoms */}
                  {(day.userSymptoms && day.userSymptoms.length > 0) && (
                    <>
                      <div className="border-t border-slate-700/60 my-1" />
                      <div className="text-sm text-gray-400">Eigene Symptome</div>
                    </>
                  )}
                  {/* Custom user-defined symptoms */}
                  <div className="space-y-0">
                    {(sortedUserSymptoms && sortedUserSymptoms.length > 0) ? (
                      sortedUserSymptoms.map(us => {
                        const series = inlineData?.customSymptoms?.series?.[us.id]
                        const prev = inlineData?.yesterday?.custom?.[us.id] ?? null
                        return (
                          <div key={us.id} className="space-y-1 !mb-[30px]">
                            <div className="text-sm text-gray-400">
                              <span className="inline-flex items-center gap-2">
                                {us.icon ? <Icon name={us.icon} /> : null}
                                <span>{us.title}</span>
                                {series && (
                                  <span className="inline-flex items-center gap-2 ml-2">
                                    <Sparkline data={series} width={72} height={24} colorByValue midValue={5} />
                                  </span>
                                )}
                              </span>
                            </div>
                            <NumberPills
                              min={1}
                              max={10}
                              value={clearedUserSymptoms.has(us.id) ? undefined : (draftUserSymptoms[us.id] ?? us.score)}
                              onChange={n => setDraftUserSymptom(us.id, n)}
                              onClear={() => clearDraftUserSymptom(us.id)}
                              ariaLabel={us.title}
                              unsaved={draftUserSymptoms[us.id] !== undefined || clearedUserSymptoms.has(us.id)}
                              previousValue={typeof prev === 'number' ? prev : null}
                            />
                          </div>
                        )
                      })
                    ) : (
                      <div className="text-sm text-gray-500">Noch keine eigenen Symptome. Lege welche in den Einstellungen an.</div>
                    )}
                  </div>
                </div>

                {/* Stuhl */}
                <div className="space-y-3">
                  <h3 className="font-medium text-sm">
                    <span className="inline-flex items-center gap-1">
                      <Icon name={DEFAULT_STOOL_ICON} />
                      <span>Stuhl (Bristol 1–7)</span>
                      {inlineData?.stool && (
                        <span className="inline-flex items-center gap-2 ml-2">
                          <Sparkline data={inlineData.stool} width={72} height={24} yMin={1} yMax={7} colorByValue midValue={4} scheme="stool" />
                        </span>
                      )}
                    </span>
                  </h3>
                  <div className="text-xs text-gray-400">
                    {' '}
                    <a
                      href="/docs/Darmkur-Guide_Auszug.pdf"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline text-blue-400 hover:text-blue-300"
                    >
                      Darmkur‑Guide (Auszug)
                    </a>
                    .
                  </div>
                  <NumberPills
                    min={1}
                    max={7}
                    value={day.stool}
                    onChange={updateStool}
                    ariaLabel="Bristol"
                    previousValue={typeof inlineData?.yesterday?.stool === 'number' ? inlineData!.yesterday.stool : null}
                    includeDashFirst
                    dashValue={99}
                  />
                </div>

                {/* Gewohnheiten */}
                <div className="space-y-3">
                  <h3 className="font-medium text-sm">
                    <span className="inline-flex items-center gap-1">
                      <Icon name="checklist" />
                      <span>Gewohnheiten</span>
                    </span>
                  </h3>
                  <HabitChips habits={habits} ticks={day.habitTicks} onToggle={toggleHabit} yesterdaySelectedIds={inlineData?.yesterday?.habits || []} />
                </div>

                {/* Ernährungsnotizen */}
                <div className="space-y-3">
                  <h3 className="font-medium text-sm">
                    <span className="inline-flex items-center gap-1">
                      <Icon name="menu_book_2" />
                      <span>Ernährungsnotizen</span>
                    </span>
                  </h3>
                  <MealNotesAccordion
                    notes={notes}
                    editingNoteId={editingNoteId}
                    editingText={editingText}
                    editingTime={editingTime}
                    onEdit={startEditNote}
                    onSave={saveEditNote}
                    onCancel={cancelEditNote}
                    onDelete={deleteNote}
                    onTextChange={setEditingText}
                    onTimeChange={setEditingTime}
                    onUploadPhotos={uploadPhotos}
                    onDeletePhoto={deletePhoto}
                    onViewPhoto={(noteId, index) => setViewer({ noteId, index })}
                  />
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-start gap-2">
                    <input type="time" value={mealTime} onChange={e => setMealTime(e.target.value)} className="bg-background border border-slate-700 rounded px-2 py-1 text-sm w-full sm:w-auto" />
                    <textarea value={mealText} onChange={e => setMealText(e.target.value)} placeholder="Beschreibung…" className="flex-1 bg-background border border-slate-700 rounded px-2 py-1 text-sm w-full" rows={3} />
                    <div className="flex items-center gap-2">
                      <MicrophoneButton
                        onText={(t) => setMealText(prev => prev ? (prev + ' ' + t) : t)}
                        className="text-gray-300 hover:text-gray-100 text-xs"
                        compact
                      />
                      <ImproveTextButton
                        text={mealText}
                        onImprovedText={(t) => setMealText(t)}
                        className="text-gray-300 hover:text-gray-100 text-xs"
                      />
                      <button className="pill w-full sm:w-auto" onClick={addMealNote} disabled={!mealText.trim()}>Hinzufügen</button>
                    </div>
                  </div>
                  <SaveIndicator saving={saving} savedAt={savedAt} />
                </div>
              </div>
            )}
          </div>

          {/* Tag zurücksetzen - separate section outside Darmkur */}
          <div className="card p-4 space-y-3">
            <h2 className="font-medium">
              <span className="inline-flex items-center gap-1">
                <Icon name="warning" />
                <span>Tag zurücksetzen</span>
              </span>
            </h2>
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-400">Alle Angaben (Symptome, Stuhl, Gewohnheiten, Notizen) für diesen Tag löschen.</div>
              <button
                className="pill bg-red-600 text-white border-transparent hover:bg-red-500"
                onClick={async () => {
                  if (!day) return
                  const ok = window.confirm('Wirklich alle Angaben für diesen Tag löschen? Dies kann nicht rückgängig gemacht werden.')
                  if (!ok) return
                  startSaving()
                  try {
                    const res = await fetch(`/api/day/${day.id}`, { method: 'DELETE', credentials: 'same-origin' })
                    await res.json().catch(() => ({}))
                    // Reload full day payload to reflect authoritative state
                    try {
                      const r = await fetch(`/api/day?date=${date}`, { credentials: 'same-origin' })
                      if (r.ok) {
                        const dd = await r.json()
                        setDay(dd.day)
                        setHabits(dd.habits || [])
                        setNotes(dd.notes || [])
                        if (dd.symptomIcons) setSymptomIcons(dd.symptomIcons)
                      }
                    } catch {}
                    // Refresh calendar markers for current month
                    try {
                      const [y, m] = date.split('-')
                      const ym = `${y}-${m}`
                      const c = await fetch(`/api/calendar?month=${ym}`, { credentials: 'same-origin' })
                      if (c.ok) {
                        const cj = await c.json()
                        setDaysWithData(new Set<string>(cj?.days ?? []))
                        setReflectionDays(new Set<string>(cj?.reflectionDays ?? []))
                      }
                    } catch {}
                    // Clear any drafts
                    setDraftSymptoms({})
                    setDraftUserSymptoms({})
                    setClearedSymptoms(new Set())
                    setClearedUserSymptoms(new Set())
                  } finally {
                    doneSaving()
                  }
                }}
              >
                Alle Angaben für diesen Tag löschen
              </button>
            </div>
            <div className="text-xs text-red-300">Achtung: Diese Aktion löscht alle erfassten Angaben des Tages.</div>
          </div>
        </>
      )}

      {viewer && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center" onClick={() => setViewer(null)} onTouchStart={e => setSwipeStartX(e.touches?.[0]?.clientX ?? null)} onTouchEnd={e => {
          const x = e.changedTouches?.[0]?.clientX
          if (swipeStartX != null && typeof x === 'number') {
            const dx = x - swipeStartX
            if (Math.abs(dx) > 40) {
              if (dx < 0) goViewer(1)
              else goViewer(-1)
            }
          }
          setSwipeStartX(null)
        }}>
          {(() => {
            const note = notes.find(nn => nn.id === viewer.noteId)
            const photos = note?.photos || []
            const current = photos[viewer.index]
            if (!current) return null
            return (
              <div className="relative w-full h-full flex items-center justify-center" onClick={e => e.stopPropagation()}>
                <img src={`${current.url}?v=${current.id}`} alt="Foto" className="max-w-[90vw] max-h-[90vh] object-contain" />
                <button aria-label="Vorheriges Foto" className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 text-white rounded-full w-10 h-10" onClick={() => goViewer(-1)}>‹</button>
                <button aria-label="Nächstes Foto" className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 text-white rounded-full w-10 h-10" onClick={() => goViewer(1)}>›</button>
                <button aria-label="Schließen" className="absolute top-4 right-4 bg-white/20 hover:bg-white/30 text-white rounded-full w-10 h-10" onClick={() => setViewer(null)}>×</button>
              </div>
            )
          })()}
        </div>
      )}
      <SaveBar
        visible={combinedDirtyCount > 0 || saving || forceBarVisible}
        saving={saving}
        dirtyCount={combinedDirtyCount}
        onSave={saveAll}
        onDiscard={discardAll}
      />
      <Toasts toasts={toasts} dismiss={dismiss} />
    </div>
  )
}
