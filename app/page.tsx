"use client"
import React, { useEffect, useMemo, useState } from 'react'
import { useUIState } from '@/hooks/useUIState'
import { useSymptomManagement } from '@/hooks/useSymptomManagement'
import { useHabitManagement } from '@/hooks/useHabitManagement'
import { useDiaryManagement } from '@/hooks/useDiaryManagement'
import { useDaySummary } from '@/hooks/useDaySummary'
import { useSaveIndicator } from '@/components/SaveIndicator'
import { SaveBar } from '@/components/SaveBar'
import { Toasts, useToasts } from '@/components/Toast'
import { Calendar } from '@/components/Calendar'
import { DateNavigation } from '@/components/DateNavigation'
import { ReflectionDueBanner } from '@/components/ReflectionDueBanner'
import { DiarySection } from '@/components/DiarySection'
import { DaySummary } from '@/components/DaySummary'
import { DarmkurSection } from '@/components/DarmkurSection'
import { ResetDaySection } from '@/components/ResetDaySection'
import { PhotoViewerModal } from '@/components/PhotoViewerModal'
import { ymd } from '@/lib/date-utils'
import type { Day, InlineData } from '@/types/day'

export default function HeutePage() {
  const [date, setDate] = useState(() => ymd(new Date()))
  const [day, setDay] = useState<Day | null>(null)
  const [daysWithData, setDaysWithData] = useState<Set<string>>(new Set())
  const [reflectionDays, setReflectionDays] = useState<Set<string>>(new Set())
  const [mealTime, setMealTime] = useState('')
  const [mealText, setMealText] = useState('')
  const { saving, savedAt, startSaving, doneSaving} = useSaveIndicator()
  const [reflectionDue, setReflectionDue] = useState<{ due: boolean; daysSince: number } | null>(null)
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
    editingText,
    editingTitle,
    setEditingTime,
    setEditingText,
    setEditingTitle,
    newDiaryText,
    newDiaryTitle,
    newDiaryAudioFileId,
    newDiaryOriginalTranscript,
    newDiaryTime,
    editorKey,
    keepAudio,
    showRetranscribeOptions,
    isRetranscribing,
    setNewDiaryText,
    setNewDiaryTitle,
    setNewDiaryAudioFileId,
    setNewDiaryOriginalTranscript: _setNewDiaryOriginalTranscript,
    setNewDiaryTime,
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

  // Inline analytics
  const [inlineData, setInlineData] = useState<InlineData | null>(null)

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
      // Prefill current time (HH:MM) when date changes or page loads
      const now = new Date()
      const hh = String(now.getHours()).padStart(2, '0')
      const mm = String(now.getMinutes()).padStart(2, '0')
      setMealTime(`${hh}:${mm}`)
      setNewDiaryTime(`${hh}:${mm}`)
      // Set default title based on date and time
      setNewDiaryTitle(`${date} ${hh}:${mm}`)
    }
    load()
  }, [date, setHabits, setNewDiaryTime, setNewDiaryTitle, setNotes, setSymptomIcons])

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
          <DaySummary
            dayId={day.id}
            summary={summary}
            loading={summaryLoading}
            onGenerate={generateSummary}
            onRegenerate={regenerateSummary}
            onDelete={deleteSummary}
          />

          <DiarySection
            date={date}
            notes={notes}
            newDiaryTitle={newDiaryTitle}
            newDiaryText={newDiaryText}
            newDiaryTime={newDiaryTime}
            newDiaryAudioFileId={newDiaryAudioFileId}
            editorKey={editorKey}
            keepAudio={keepAudio}
            showRetranscribeOptions={showRetranscribeOptions}
            isRetranscribing={isRetranscribing}
            editingNoteId={editingNoteId}
            editingText={editingText}
            editingTime={editingTime}
            editingTitle={editingTitle}
            saving={saving}
            savedAt={savedAt}
            originalDiaryText={newDiaryOriginalTranscript || undefined}
            onNewDiaryTitleChange={setNewDiaryTitle}
            onNewDiaryTextChange={setNewDiaryText}
            onNewDiaryTimeChange={setNewDiaryTime}
            onNewDiaryAudioFileIdChange={setNewDiaryAudioFileId}
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
            onEditingTitleChange={setEditingTitle}
            onUploadPhotos={uploadPhotos}
            onDeletePhoto={deletePhoto}
            onViewPhoto={(noteId, index) => setViewer({ noteId, index })}
            onDeleteAudio={deleteAudio}
            onHandleRetranscribe={handleRetranscribe}
            onGenerateTitle={handleGenerateTitle}
            onOriginalPreserved={(orig) => _setNewDiaryOriginalTranscript(orig)}
            onUpdateNoteContent={updateNoteContent}
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
            onViewPhoto={(noteId, index) => setViewer({ noteId, index })}
            onMealTimeChange={setMealTime}
            onMealTextChange={setMealText}
            onAddMealNote={addMealNote}
          />

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
    </div>
  )
}
