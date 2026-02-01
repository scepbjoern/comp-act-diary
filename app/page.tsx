"use client"
import React, { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { useUIState } from '@/hooks/useUIState'
import { useSymptomManagement } from '@/hooks/useSymptomManagement'
import { useHabitManagement } from '@/hooks/useHabitManagement'
import { useDiaryManagement } from '@/hooks/useDiaryManagement'
import { useDaySummary } from '@/hooks/useDaySummary'
import { useGeneratedImages } from '@/hooks/useGeneratedImages'
import { useSaveIndicator } from '@/components/ui/SaveIndicator'
import { SaveBar } from '@/components/ui/SaveBar'
import { Toasts, useToasts } from '@/components/ui/Toast'
import { Calendar } from '@/components/features/calendar/Calendar'
import { DateNavigation } from '@/components/features/calendar/DateNavigation'
import { ReflectionDueBanner } from '@/components/features/diary/ReflectionDueBanner'
import { DiarySection } from '@/components/features/diary/DiarySection'
import { DaySummary } from '@/components/features/day/DaySummary'
import { DEFAULT_IMAGE_PROMPT } from '@/lib/config/defaultImagePrompt'
import { DarmkurSection } from '@/components/features/meals/DarmkurSection'
import { ResetDaySection } from '@/components/features/day/ResetDaySection'
import { PhotoViewerModal } from '@/components/features/media/PhotoViewerModal'
import { EdgeNavigationBars } from '@/components/layout/EdgeNavigationBars'
import { ymd, shiftDate } from '@/lib/utils/date-utils'
import type { Day, InlineData } from '@/types/day'

// Dynamic Imports für Performance-Optimierung
const DayLocationPanel = dynamic(() => import('@/components/features/day/DayLocationPanel'), {
  loading: () => <div className="skeleton h-64 w-full"></div>,
  ssr: false
})

const GeneratedImageGallery = dynamic(
  () => import('@/components/features/media/GeneratedImageGallery').then(mod => ({ default: mod.GeneratedImageGallery })),
  { loading: () => <div className="skeleton h-32 w-full"></div> }
)

const ImageGenerationModal = dynamic(
  () => import('@/components/features/media/ImageGenerationModal').then(mod => ({ default: mod.ImageGenerationModal })),
  { loading: () => <div className="loading loading-spinner loading-lg"></div> }
)

const DebugDayPanel = dynamic(
  () => import('@/components/features/day/DebugDayPanel').then(mod => ({ default: mod.DebugDayPanel })),
  { loading: () => <div className="skeleton h-48 w-full"></div> }
)

export default function HeutePage() {
  const searchParams = useSearchParams()
  const highlightEntryId = searchParams.get('entry')
  const urlDate = searchParams.get('date')
  
  // Initialize date from URL params or today (avoid window check during SSR)
  const [date, setDate] = useState(() => {
    if (urlDate && /^\d{4}-\d{2}-\d{2}$/.test(urlDate)) {
      return urlDate
    }
    return ymd(new Date())
  })
  
  // Handle sessionStorage navigation after mount
  useEffect(() => {
    const targetDate = sessionStorage.getItem('navigateToDate')
    if (targetDate && /^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
      sessionStorage.removeItem('navigateToDate')
      setDate(targetDate)
    }
  }, [])
  
  // Sync date state with URL parameter changes (e.g., from search navigation)
  useEffect(() => {
    if (urlDate && /^\d{4}-\d{2}-\d{2}$/.test(urlDate) && urlDate !== date) {
      setDate(urlDate)
    }
  }, [urlDate, date])
  const [day, setDay] = useState<Day | null>(null)
  const [daysWithData, setDaysWithData] = useState<Set<string>>(new Set())
  const [reflectionDays, setReflectionDays] = useState<Set<string>>(new Set())
  const [mealTime, setMealTime] = useState('')
  const [mealText, setMealText] = useState('')
  const { saving, savedAt, startSaving, doneSaving} = useSaveIndicator()
  const [reflectionDue, setReflectionDue] = useState<{ due: boolean; daysSince: number } | null>(null)
  const [debugData, setDebugData] = useState<{
    taggings: { id: string; taxonomyName: string; entityType: string }[]
    contacts: { id: string; name: string }[]
    locations: { id: string; name: string; lat?: number; lng?: number }[]
    measurements: { id: string; metricName: string; value: number; unit?: string }[]
  } | null>(null)
  const { toasts, push, dismiss } = useToasts()
  
  // UI State Hook
  const { darmkurCollapsed, viewer, swipeStartX, forceBarVisible, setDarmkurCollapsed, setViewer, setSwipeStartX, setForceBarVisible } = useUIState()
  
  // Symptom Management Hook
  const { 
    symptomIcons, 
    setSymptomIcons, 
    draftSymptoms, 
    draftUserSymptoms, 
    clearedSymptoms, 
    clearedUserSymptoms, 
    unsavedSymptomCount, 
    setDraftSymptom, 
    setDraftUserSymptom, 
    clearDraftSymptom, 
    clearDraftUserSymptom, 
    saveDraftSymptoms: saveDraftSymptomsHook, 
    discardDraftSymptoms: discardDraftSymptomsHook 
  } = useSymptomManagement(day, date, (saving) => {
    if (saving) startSaving()
    else doneSaving()
  })
  
  // Habit Management Hook
  const { habits, setHabits, toggleHabit: toggleHabitHook } = useHabitManagement(day?.id || null, (saving) => {
    if (saving) startSaving()
    else doneSaving()
  })
  
  // Diary Management Hook
  const {
    notes,
    setNotes,
    editingNoteId,
    editingTime,
    editingCapturedDate,
    editingCapturedTime,
    editingText,
    editingTitle,
    setEditingTime,
    setEditingCapturedDate,
    setEditingCapturedTime,
    setEditingText,
    setEditingTitle,
    newDiaryText,
    newDiaryTitle,
    newDiaryAudioFileIds,
    newDiaryAudioTranscripts,
    newDiaryTime,
    editorKey,
    keepAudio,
    showRetranscribeOptions,
    isRetranscribing,
    setNewDiaryText,
    setNewDiaryTitle,
    setNewDiaryAudioFileIds,
    setNewDiaryAudioTranscripts,
    setNewDiaryOcrAssetIds,
    setNewDiaryTime,
    newDiaryCapturedDate,
    newDiaryCapturedTime,
    setNewDiaryCapturedDate,
    setNewDiaryCapturedTime,
    setEditorKey,
    setKeepAudio,
    setShowRetranscribeOptions,
    startEditNote,
    cancelEditNote,
    saveEditNote,
    updateNoteContent,
    deleteNote,
    deleteAudio,
    uploadPhotos,
    deletePhoto,
    retranscribeAudio,
    handleRetranscribe,
    addNewDiaryAudioTranscript,
    clearDiaryForm,
    saveDiaryEntry
  } = useDiaryManagement(day?.id || null, date, (saving) => {
    if (saving) startSaving()
    else doneSaving()
  }, push)

  // Day Summary Hook
  const {
    summary,
    loading: summaryLoading,
    generateSummary,
    regenerateSummary,
    deleteSummary
  } = useDaySummary(day?.id || null, push)

  // Generated Images Hook (uses day's entity ID, which is the timeBoxId)
  const {
    images: generatedImages,
    loading: imagesLoading,
    generating: imageGenerating,
    generateImage,
    deleteImage
  } = useGeneratedImages(day?.timeBoxId || null, push)

  // Inline analytics
  const [inlineData, setInlineData] = useState<InlineData | null>(null)
  
  // Image generation modal state
  const [imageModalOpen, setImageModalOpen] = useState(false)
  const [imagePromptTemplate, _setImagePromptTemplate] = useState(DEFAULT_IMAGE_PROMPT)

  // Diary functions are now handled by useDiaryManagement hook
  
  const goViewer = (delta: number) => {
    setViewer((v: { noteId: string; index: number } | null) => {
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
      const res = await fetch(`/api/day?date=${date}`, { credentials: 'same-origin' })
      const data = await res.json()
      setDay(data.day)
      setHabits(data.habits)
      setNotes(data.notes ?? [])
      setSymptomIcons(data.symptomIcons || {})
      setDebugData(data.debugData || null)
      // Prefill current time (HH:MM) when date changes or page loads
      const now = new Date()
      const hh = String(now.getHours()).padStart(2, '0')
      const mm = String(now.getMinutes()).padStart(2, '0')
      setMealTime(`${hh}:${mm}`)
      setNewDiaryTime(`${hh}:${mm}`)
      // Set default title based on date and time
      setNewDiaryTitle(`${date} ${hh}:${mm}`)
      const y = now.getFullYear()
      const m = String(now.getMonth() + 1).padStart(2, '0')
      const d = String(now.getDate()).padStart(2, '0')
      setNewDiaryCapturedDate(`${y}-${m}-${d}`)
      setNewDiaryCapturedTime(`${hh}:${mm}`)
    }
    void load()
  }, [date, setHabits, setNewDiaryCapturedDate, setNewDiaryCapturedTime, setNewDiaryTime, setNewDiaryTitle, setNotes, setSymptomIcons])

  // Update diary title when time changes
  useEffect(() => {
    if (newDiaryTime && date) {
      setNewDiaryTitle(`${date} ${newDiaryTime}`)
    }
  }, [newDiaryTime, date, setNewDiaryTitle])

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

  // Scroll to and highlight entry from search result navigation
  useEffect(() => {
    if (highlightEntryId && notes.length > 0) {
      // Small delay to ensure DOM is rendered
      const timer = setTimeout(() => {
        const element = document.getElementById(`entry-${highlightEntryId}`)
        if (element) {
          // Scroll to the entry
          element.scrollIntoView({ behavior: 'smooth', block: 'center' })
          // Add highlight animation
          element.classList.add('highlight-pulse')
          // Remove animation after it completes
          setTimeout(() => {
            element.classList.remove('highlight-pulse')
          }, 2500)
        }
      }, 300)
      return () => clearTimeout(timer)
    }
    return undefined
  }, [highlightEntryId, notes])

  // Check if a reflection is due (business logic: > 6 Tage)
  useEffect(() => {
    let aborted = false
    void (async () => {
      try {
        const res = await fetch('/api/reflections/due', { credentials: 'same-origin' })
        if (!res.ok) return
        const data = await res.json()
        if (!aborted) setReflectionDue({ due: Boolean(data.due), daysSince: data.daysSince ?? 0 })
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
    void (async () => {
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

  // Photo upload/delete functions are now handled by useDiaryManagement hook

  async function updateDayMeta(patch: { dayRating?: number | null }) {
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
      body: JSON.stringify({ score: bristol }),
      credentials: 'same-origin',
    })
    const data = await res.json()
    // Merge with existing day to preserve other fields like symptoms
    setDay(prev => prev ? { ...prev, stool: data.day?.stool } : prev)
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

  // Symptom functions from hook
  const combinedDirtyCount = useMemo(() => unsavedSymptomCount, [unsavedSymptomCount])

  async function saveDraftSymptoms() {
    const success = await saveDraftSymptomsHook()
    if (success) {
      // Refresh authoritative day payload once after all updates
      try {
        const res = await fetch(`/api/day?date=${date}`, { credentials: 'same-origin' })
        const data = await res.json()
        if (data?.day) setDay(data.day)
        if (data?.notes) setNotes(data.notes)
        if (data?.habits) setHabits(data.habits)
        if (data?.symptomIcons) setSymptomIcons(data.symptomIcons)
      if (data?.debugData) setDebugData(data.debugData)
      } catch {}
      // Refresh inline analytics so symptom sparklines update immediately
      try {
        const res2 = await fetch(`/api/analytics/inline?to=${date}`, { credentials: 'same-origin' })
        if (res2.ok) {
          const j2 = await res2.json()
          setInlineData(j2)
        }
      } catch {}
    }
  }

  function discardDraftSymptoms() {
    discardDraftSymptomsHook()
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
    }
  }

  async function toggleHabit(habitId: string, checked: boolean) {
    const updatedDay = await toggleHabitHook(habitId, checked)
    if (updatedDay) setDay(updatedDay)
  }

  // saveDiaryEntry and shiftDate are now handled by useDiaryManagement and lib/date-utils

  // Save diary entry and run AI pipeline (keeps form open during processing)
  async function saveDiaryEntryAndRunPipeline(): Promise<void> {
    if (!day || !newDiaryText.trim()) return
    
    // Build occurredAt from date + time
    const timeToUse = newDiaryTime || new Date().toISOString().slice(11, 16)
    const timeParts = timeToUse.split(':').map(Number)
    const hours = timeParts[0] ?? 0
    const minutes = timeParts[1] ?? 0
    const occurredAtDate = new Date(date)
    occurredAtDate.setHours(hours, minutes, 0, 0)
    const capturedAt = newDiaryCapturedDate && newDiaryCapturedTime
      ? new Date(`${newDiaryCapturedDate}T${newDiaryCapturedTime}:00`).toISOString()
      : new Date().toISOString()
    
    // Step 1: Save entry WITHOUT closing form (don't use saveDiaryEntry which resets form)
    const saveRes = await fetch(`/api/day/${day.id}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'DIARY',
        title: newDiaryTitle.trim() || null,
        text: newDiaryText.trim(),
        audioFileIds: newDiaryAudioFileIds,
        audioTranscripts: newDiaryAudioTranscripts,
        keepAudio,
        occurredAt: occurredAtDate.toISOString(),
        capturedAt,
        tzOffsetMinutes: new Date().getTimezoneOffset(),
      }),
      credentials: 'same-origin',
    })
    
    const saveData = await saveRes.json()
    if (!saveRes.ok || !saveData?.notes) {
      push('Speichern fehlgeschlagen', 'error')
      return
    }
    
    // Find the newly created entry
    const diaryNotes = saveData.notes.filter((n: { type: string }) => n.type === 'DIARY')
    const latestNote = diaryNotes.sort((a: { createdAtIso: string }, b: { createdAtIso: string }) => 
      (b.createdAtIso || '').localeCompare(a.createdAtIso || '')
    )[0]
    
    if (!latestNote) {
      push('Eintrag nicht gefunden', 'error')
      return
    }
    
    // Step 2: Run pipeline
    try {
      await fetch('/api/journal-ai/pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ journalEntryId: latestNote.id }),
      })
      
      // Step 3: Generate title
      if (latestNote.text?.trim()) {
        const titleRes = await fetch('/api/generate-title', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: latestNote.text, model: 'gpt-4o-mini' })
        })
        const titleData = await titleRes.json()
        if (titleData.title) {
          await fetch(`/api/notes/${latestNote.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: titleData.title })
          })
        }
      }
      
      // Step 4: Refresh notes and THEN close form
      const refreshRes = await fetch(`/api/day?date=${date}`, { credentials: 'same-origin' })
      const refreshData = await refreshRes.json()
      if (refreshData?.notes) setNotes(refreshData.notes)
      
      // Now reset the form (close edit mode)
      setNewDiaryText('')
      setNewDiaryAudioFileIds([])
      setNewDiaryAudioTranscripts([])
      const now = new Date()
      const hh = String(now.getHours()).padStart(2, '0')
      const mm = String(now.getMinutes()).padStart(2, '0')
      setNewDiaryTime(`${hh}:${mm}`)
      setNewDiaryTitle(`${date} ${hh}:${mm}`)
      setEditorKey(prev => prev + 1)
      
      push('AI-Pipeline abgeschlossen', 'success')
    } catch (e) {
      console.error('Pipeline failed', e)
      push('AI-Pipeline fehlgeschlagen', 'error')
    }
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

  // Callbacks for DiarySection
  const handleGenerateTitle = async () => {
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
  }

  // Callback for ResetDaySection
  const handleResetDay = async () => {
    if (!day) return
    const ok = window.confirm('Wirklich alle Angaben für diesen Tag löschen? Dies kann nicht rückgängig gemacht werden.')
    if (!ok) return
    startSaving()
    try {
      const res = await fetch(`/api/day/${day.id}`, { method: 'DELETE', credentials: 'same-origin' })
      await res.json().catch(() => ({}))
      // Reload full day payload
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
      // Refresh calendar markers
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
    } finally {
      doneSaving()
    }
  }

  // Callback for PhotoViewerModal
  const handleSwipeEnd = (x: number | null, startX: number | null) => {
    if (startX != null && x != null) {
      const dx = x - startX
      if (Math.abs(dx) > 40) {
        if (dx < 0) goViewer(1)
        else goViewer(-1)
      }
    }
    setSwipeStartX(null)
  }


  return (
    <div className="space-y-6">
      {/* App Branding */}
      <div className="text-center space-y-1 py-4">
        <h1 className="text-3xl font-bold">CompACT Diary</h1>
        <p className="text-lg text-gray-400 font-light">Set. Track. Reflect. Act.</p>
      </div>

      <DateNavigation date={date} onDateChange={setDate} />

      {/* Calendar Widget */}
      <div className="card p-4 space-y-3">
        <Calendar date={date} daysWithData={daysWithData} reflectionDays={reflectionDays} onSelect={(d) => setDate(d)} />
      </div>

      <ReflectionDueBanner reflectionDue={reflectionDue} />

      {day && (
        <>
          {/* Generated Day Image */}
          <GeneratedImageGallery
            images={generatedImages}
            loading={imagesLoading}
            generating={imageGenerating}
            hasSummary={Boolean(summary)}
            onGenerate={() => void generateImage(summary?.content || '')}
            onDelete={deleteImage}
            onOpenModal={() => setImageModalOpen(true)}
          />
          
          {/* Image Generation Modal */}
          <ImageGenerationModal
            isOpen={imageModalOpen}
            onClose={() => setImageModalOpen(false)}
            onGenerate={(finalPrompt) => {
              setImageModalOpen(false)
              void generateImage(summary?.content || '', finalPrompt)
            }}
            summaryText={summary?.content || ''}
            defaultPromptTemplate={imagePromptTemplate}
            generating={imageGenerating}
            title="Tagesbild generieren"
          />

          <DaySummary
            dayId={day.id}
            summary={summary}
            loading={summaryLoading}
            onGenerate={async (withImage) => {
              const newSummary = await generateSummary()
              if (newSummary && withImage) {
                // Use the returned summary content directly
                void generateImage(newSummary.content)
              }
            }}
            onRegenerate={async (withImage) => {
              const newSummary = await regenerateSummary()
              if (newSummary && withImage) {
                void generateImage(newSummary.content)
              }
            }}
            onDelete={deleteSummary}
          />

          <DiarySection
            date={date}
            timeBoxId={day.timeBoxId}
            notes={notes}
            newDiaryTitle={newDiaryTitle}
            newDiaryText={newDiaryText}
            newDiaryTime={newDiaryTime}
            newDiaryCapturedDate={newDiaryCapturedDate}
            newDiaryCapturedTime={newDiaryCapturedTime}
            newDiaryAudioFileIds={newDiaryAudioFileIds}
            editorKey={editorKey}
            keepAudio={keepAudio}
            showRetranscribeOptions={showRetranscribeOptions}
            isRetranscribing={isRetranscribing}
            editingNoteId={editingNoteId}
            editingText={editingText}
            editingTime={editingTime}
            editingCapturedDate={editingCapturedDate}
            editingCapturedTime={editingCapturedTime}
            editingTitle={editingTitle}
            saving={saving}
            savedAt={savedAt}
            onNewDiaryTitleChange={setNewDiaryTitle}
            onNewDiaryTextChange={setNewDiaryText}
            onNewDiaryTimeChange={setNewDiaryTime}
            onNewDiaryCapturedDateChange={setNewDiaryCapturedDate}
            onNewDiaryCapturedTimeChange={setNewDiaryCapturedTime}
            onAddNewDiaryAudioFileId={(id) => setNewDiaryAudioFileIds(prev => [...prev, id])}
            onAddNewDiaryAudioTranscript={addNewDiaryAudioTranscript}
            onNewDiaryOcrAssetIdsChange={setNewDiaryOcrAssetIds}
            onEditorKeyIncrement={() => setEditorKey(prev => prev + 1)}
            onKeepAudioChange={setKeepAudio}
            onShowRetranscribeOptionsToggle={() => setShowRetranscribeOptions(!showRetranscribeOptions)}
            onSaveDiaryEntry={saveDiaryEntry}
            onClearDiaryForm={clearDiaryForm}
            onRetranscribeAudio={async (model: string) => { await retranscribeAudio(model) }}
            onStartEditNote={startEditNote}
            onSaveEditNote={saveEditNote}
            onCancelEditNote={cancelEditNote}
            onDeleteNote={deleteNote}
            onEditingTextChange={setEditingText}
            onEditingTimeChange={setEditingTime}
            onEditingCapturedDateChange={setEditingCapturedDate}
            onEditingCapturedTimeChange={setEditingCapturedTime}
            onEditingTitleChange={setEditingTitle}
            onUploadPhotos={uploadPhotos}
            onDeletePhoto={deletePhoto}
            onViewPhoto={(noteId, index, url) => setViewer({ noteId, index, url })}
            onDeleteAudio={deleteAudio}
            onHandleRetranscribe={handleRetranscribe}
            onGenerateTitle={handleGenerateTitle}
            onUpdateNoteContent={updateNoteContent}
            onRefreshNotes={async () => {
              try {
                const res = await fetch(`/api/day?date=${date}`, { credentials: 'same-origin' })
                const data = await res.json()
                if (data?.notes) setNotes(data.notes)
              } catch (e) {
                console.error('Refresh notes failed', e)
              }
            }}
            onSaveAndRunPipeline={saveDiaryEntryAndRunPipeline}
          />

          <DarmkurSection
            day={day}
            habits={habits}
            notes={notes}
            symptomIcons={symptomIcons}
            draftSymptoms={draftSymptoms}
            draftUserSymptoms={draftUserSymptoms}
            clearedSymptoms={clearedSymptoms}
            clearedUserSymptoms={clearedUserSymptoms}
            inlineData={inlineData}
            darmkurCollapsed={darmkurCollapsed}
            mealTime={mealTime}
            mealText={mealText}
            editingNoteId={editingNoteId}
            editingText={editingText}
            editingTime={editingTime}
            saving={saving}
            savedAt={savedAt}
            onToggleCollapse={() => setDarmkurCollapsed(!darmkurCollapsed)}
            onUpdateDayMeta={updateDayMeta}
            onSetDraftSymptom={setDraftSymptom}
            onSetDraftUserSymptom={setDraftUserSymptom}
            onClearDraftSymptom={clearDraftSymptom}
            onClearDraftUserSymptom={clearDraftUserSymptom}
            onUpdateStool={updateStool}
            onToggleHabit={toggleHabit}
            onStartEditNote={startEditNote}
            onSaveEditNote={saveEditNote}
            onCancelEditNote={cancelEditNote}
            onDeleteNote={deleteNote}
            onEditingTextChange={setEditingText}
            onEditingTimeChange={setEditingTime}
            onUploadPhotos={uploadPhotos}
            onDeletePhoto={deletePhoto}
            onViewPhoto={(noteId, index, url) => setViewer({ noteId, index, url })}
            onMealTimeChange={setMealTime}
            onMealTextChange={setMealText}
            onAddMealNote={addMealNote}
          />

          <DayLocationPanel date={date} />

          <DebugDayPanel debugData={debugData} />

          <ResetDaySection onResetDay={handleResetDay} />
        </>
      )}

      <PhotoViewerModal 
        viewer={viewer} 
        notes={notes} 
        swipeStartX={swipeStartX}
        onClose={() => setViewer(null)} 
        onNavigate={goViewer}
        onSwipeStart={setSwipeStartX}
        onSwipeEnd={handleSwipeEnd}
      />
      <SaveBar
        visible={combinedDirtyCount > 0 || saving || forceBarVisible}
        saving={saving}
        dirtyCount={combinedDirtyCount}
        onSave={saveAll}
        onDiscard={discardAll}
      />
      <Toasts toasts={toasts} dismiss={dismiss} />
      <EdgeNavigationBars 
        onPrevious={() => setDate(shiftDate(date, -1))} 
        onNext={() => setDate(shiftDate(date, +1))} 
      />
    </div>
  )
}

