import { useCallback, useEffect, useState } from 'react'

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
  capturedAtIso?: string
  createdAtIso?: string
  audioCapturedAtIso?: string | null
  audioUploadedAtIso?: string | null
}

export function useDiaryManagement(
  dayId: string | null,
  date: string,
  onSavingChange: (saving: boolean) => void,
  onToast: (message: string, type: 'success' | 'error' | 'info') => void
) {
  const [notes, setNotes] = useState<DayNote[]>([])
  
  // Editing state
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [editingTime, setEditingTime] = useState<string>('')
  const [editingCapturedDate, setEditingCapturedDate] = useState<string>('')
  const [editingCapturedTime, setEditingCapturedTime] = useState<string>('')
  const [editingText, setEditingText] = useState<string>('')
  const [editingTitle, setEditingTitle] = useState<string>('')
  
  // New diary entry state
  const [newDiaryText, setNewDiaryText] = useState('')
  const [newDiaryTitle, setNewDiaryTitle] = useState('')
  const [newDiaryAudioFileId, setNewDiaryAudioFileId] = useState<string | null>(null)
  const [newDiaryOriginalTranscript, setNewDiaryOriginalTranscript] = useState<string | null>(null)
  const [newDiaryOcrAssetIds, setNewDiaryOcrAssetIds] = useState<string[]>([])
  const [newDiaryTime, setNewDiaryTime] = useState('')
  const [newDiaryCapturedDate, setNewDiaryCapturedDate] = useState('')
  const [newDiaryCapturedTime, setNewDiaryCapturedTime] = useState('')
  const [editorKey, setEditorKey] = useState(0)
  const [keepAudio, setKeepAudio] = useState(true)
  const [showRetranscribeOptions, setShowRetranscribeOptions] = useState(false)
  const [isRetranscribing, setIsRetranscribing] = useState(false)

  // Update diary title when time or date changes
  useEffect(() => {
    if (newDiaryTime && date) {
      setNewDiaryTitle(`${date} ${newDiaryTime}`)
    }
  }, [newDiaryTime, date])

  // Format helper
  const fmtHMLocal = useCallback((iso?: string) => {
    if (!iso) return '—'
    const d = new Date(iso)
    const hh = String(d.getHours()).padStart(2, '0')
    const mm = String(d.getMinutes()).padStart(2, '0')
    return `${hh}:${mm}`
  }, [])

  const fmtDateInput = useCallback((iso?: string) => {
    if (!iso) return ''
    const d = new Date(iso)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }, [])

  const fmtTimeInput = useCallback((iso?: string) => {
    if (!iso) return ''
    const d = new Date(iso)
    const hh = String(d.getHours()).padStart(2, '0')
    const mm = String(d.getMinutes()).padStart(2, '0')
    return `${hh}:${mm}`
  }, [])

  const buildIsoFromDateTime = useCallback((dateStr: string, timeStr: string) => {
    const [year, month, day] = dateStr.split('-').map(Number)
    const [hours, minutes] = timeStr.split(':').map(Number)
    const dt = new Date(year, (month || 1) - 1, day || 1, hours || 0, minutes || 0, 0, 0)
    return dt.toISOString()
  }, [])

  // Start editing a note
  const startEditNote = useCallback((n: DayNote) => {
    const capturedSource = n.audioCapturedAtIso || n.capturedAtIso || n.createdAtIso
    setEditingNoteId(n.id)
    setEditingTime(fmtHMLocal(n.occurredAtIso))
    setEditingCapturedDate(fmtDateInput(capturedSource))
    setEditingCapturedTime(fmtTimeInput(capturedSource))
    setEditingText(n.text || '')
    setEditingTitle(n.title || '')
  }, [fmtDateInput, fmtHMLocal, fmtTimeInput])

  // Cancel editing
  const cancelEditNote = useCallback(() => {
    setEditingNoteId(null)
    setEditingTime('')
    setEditingCapturedDate('')
    setEditingCapturedTime('')
    setEditingText('')
    setEditingTitle('')
  }, [])

  // Save edited note
  const saveEditNote = useCallback(async (noteId: string) => {
    try {
      const occurredAtIso = buildIsoFromDateTime(date, editingTime)
      const capturedAtIso = editingCapturedDate && editingCapturedTime
        ? buildIsoFromDateTime(editingCapturedDate, editingCapturedTime)
        : new Date().toISOString()

      const res = await fetch(`/api/notes/${noteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          title: editingTitle.trim() || null, 
          text: editingText, 
          occurredAt: occurredAtIso,
          capturedAt: capturedAtIso
        }),
        credentials: 'same-origin',
      })
      const data = await res.json()
      if (data?.notes) setNotes(data.notes)

      const note = notes.find(n => n.id === noteId)
      if (note?.audioFileId) {
        await fetch(`/api/media-assets/${note.audioFileId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ capturedAt: capturedAtIso }),
        })
      }
      cancelEditNote()
      return true
    } catch (e) {
      console.error('Edit note failed', e)
      return false
    }
  }, [buildIsoFromDateTime, cancelEditNote, date, editingCapturedDate, editingCapturedTime, editingText, editingTime, editingTitle, notes])

  // Update note content directly (for restoring original transcript)
  const updateNoteContent = useCallback(async (noteId: string, newContent: string) => {
    try {
      const res = await fetch(`/api/notes/${noteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: newContent }),
        credentials: 'same-origin',
      })
      const data = await res.json()
      if (data?.notes) setNotes(data.notes)
      onToast('Inhalt aktualisiert', 'success')
      return true
    } catch (e) {
      console.error('Update note content failed', e)
      onToast('Aktualisieren fehlgeschlagen', 'error')
      return false
    }
  }, [onToast])

  // Delete note
  const deleteNote = useCallback(async (noteId: string) => {
    if (!window.confirm('Tagebucheintrag wirklich löschen? Audio wird ebenfalls gelöscht.')) return false
    
    try {
      const res = await fetch(`/api/notes/${noteId}`, { 
        method: 'DELETE', 
        credentials: 'same-origin' 
      })
      const data = await res.json()
      if (data?.notes) setNotes(data.notes)
      if (editingNoteId === noteId) cancelEditNote()
      onToast('Eintrag gelöscht', 'success')
      return true
    } catch (e) {
      console.error('Delete note failed', e)
      onToast('Löschen fehlgeschlagen', 'error')
      return false
    }
  }, [editingNoteId, cancelEditNote, onToast])

  // Delete audio from note
  const deleteAudio = useCallback(async (noteId: string) => {
    const note = notes.find(n => n.id === noteId)
    if (!note?.audioFilePath) return false
    if (!window.confirm('Nur die Audioaufnahme löschen?')) return false
    
    try {
      const res = await fetch(`/api/notes/${note.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ audioFilePath: null, keepAudio: false }),
      })
      const data = await res.json()
      if (data?.notes) setNotes(data.notes)
      onToast('Audio gelöscht', 'info')
      return true
    } catch (e) {
      console.error('Delete audio failed', e)
      onToast('Audio löschen fehlgeschlagen', 'error')
      return false
    }
  }, [notes, onToast])

  // Upload photos to note
  const uploadPhotos = useCallback(async (noteId: string, files: FileList | File[]) => {
    try {
      const formData = new FormData()
      if ((files as FileList).length !== undefined && typeof (files as FileList).item === 'function') {
        Array.from(files as FileList).forEach(f => formData.append('files', f))
      } else {
        (files as File[]).forEach(f => formData.append('files', f))
      }
      
      const note = notes.find(n => n.id === noteId)
      if (note?.time) {
        formData.append('time', note.time)
      }
      
      // Image settings from localStorage
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
      
      const res = await fetch(`/api/notes/${noteId}/photos`, { 
        method: 'POST', 
        body: formData, 
        credentials: 'same-origin' 
      })
      const data = await res.json()
      if (data?.notes) setNotes(data.notes)
      return true
    } catch (e) {
      console.error('Upload failed', e)
      return false
    }
  }, [notes])

  // Delete photo
  const deletePhoto = useCallback(async (photoId: string) => {
    try {
      const res = await fetch(`/api/photos/${photoId}`, { 
        method: 'DELETE', 
        credentials: 'same-origin' 
      })
      const data = await res.json()
      if (data?.ok) {
        setNotes(prev => prev.map(n => ({ 
          ...n, 
          photos: (n.photos || []).filter(p => p.id !== photoId) 
        })))
      }
      return true
    } catch (e) {
      console.error('Delete failed', e)
      return false
    }
  }, [])

  // Retranscribe audio
  const retranscribeAudio = useCallback(async (model: string) => {
    if (!newDiaryAudioFileId) return false
    
    setIsRetranscribing(true)
    setShowRetranscribeOptions(false)
    
    try {
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
        onToast(`Re-Transkription fehlgeschlagen: ${errorData.error || 'Unbekannter Fehler'}`, 'error')
        return false
      }
      
      const data = await response.json()
      setNewDiaryText(data.text)
      setNewDiaryOriginalTranscript(data.text)
      onToast(`Re-Transkription mit ${model} erfolgreich!`, 'success')
      return true
    } catch (error) {
      console.error('Re-transcription error:', error)
      onToast('Re-Transkription fehlgeschlagen: Netzwerkfehler', 'error')
      return false
    } finally {
      setIsRetranscribing(false)
    }
  }, [newDiaryAudioFileId, onToast])

  // Handle retranscribe from existing note
  const handleRetranscribe = useCallback(async (noteId: string, newText: string) => {
    setNotes(prev => prev.map(note => 
      note.id === noteId 
        ? { ...note, text: newText, originalTranscript: newText }
        : note
    ))
    onToast('Transkription aktualisiert', 'success')
  }, [onToast])

  // Cleanup audio file
  const cleanupAudioFile = useCallback(async (audioFileId: string) => {
    try {
      const res = await fetch('/api/diary/cleanup-audio', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audioFileId }),
        credentials: 'same-origin'
      })
      
      if (!res.ok) {
        const errorData = await res.json()
        if (errorData.error !== 'Audio file is still in use') {
          onToast('Audio-Cleanup fehlgeschlagen', 'error')
        }
      }
    } catch (e) {
      console.error('Cleanup audio error:', e)
    }
  }, [onToast])

  // Clear diary form
  const clearDiaryForm = useCallback(() => {
    // Clean up audio file ONLY if it exists and wasn't saved
    if (newDiaryAudioFileId) {
      const isReferenced = notes.some(note => note.audioFileId === newDiaryAudioFileId)
      if (!isReferenced) {
        void cleanupAudioFile(newDiaryAudioFileId)
      }
    }
    
    setNewDiaryText('')
    setNewDiaryAudioFileId(null)
    setNewDiaryOriginalTranscript(null)
    setNewDiaryOcrAssetIds([])
    setNewDiaryTime('')
    setNewDiaryCapturedDate('')
    setNewDiaryCapturedTime('')
    setShowRetranscribeOptions(false)
    setIsRetranscribing(false)
  }, [newDiaryAudioFileId, notes, cleanupAudioFile])

  // Save new diary entry
  const saveDiaryEntry = useCallback(async () => {
    if (!dayId || !newDiaryText.trim()) return false
    
    onSavingChange(true)
    
    try {
      // Build occurredAt from date + time
      const timeToUse = newDiaryTime || new Date().toISOString().slice(11, 16)
      const [hours, minutes] = timeToUse.split(':').map(Number)
      const occurredAtDate = new Date(date)
      occurredAtDate.setHours(hours, minutes, 0, 0)
      
      // capturedAt uses UI inputs; fallback to current time
      const capturedAt = newDiaryCapturedDate && newDiaryCapturedTime
        ? buildIsoFromDateTime(newDiaryCapturedDate, newDiaryCapturedTime)
        : new Date().toISOString()
      
      const res = await fetch(`/api/day/${dayId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'DIARY',
          title: newDiaryTitle.trim() || null,
          text: newDiaryText.trim(),
          audioFileId: newDiaryAudioFileId,
          keepAudio,
          originalTranscript: newDiaryOriginalTranscript,
          ocrAssetIds: newDiaryOcrAssetIds,
          occurredAt: occurredAtDate.toISOString(),
          capturedAt,
          tzOffsetMinutes: new Date().getTimezoneOffset(),
        }),
        credentials: 'same-origin',
      })
      
      const data = await res.json()
      if (data?.notes) setNotes(data.notes)
      
      // Reset form WITHOUT cleanup (audio was saved successfully)
      setNewDiaryText('')
      setNewDiaryAudioFileId(null)
      setNewDiaryOriginalTranscript(null)
      setNewDiaryOcrAssetIds([])
      
      // Reset time to current time for next entry
      const now = new Date()
      const hh = String(now.getHours()).padStart(2, '0')
      const mm = String(now.getMinutes()).padStart(2, '0')
      setNewDiaryTime(`${hh}:${mm}`)
      setNewDiaryTitle(`${date} ${hh}:${mm}`)
      const y = now.getFullYear()
      const m = String(now.getMonth() + 1).padStart(2, '0')
      const d = String(now.getDate()).padStart(2, '0')
      setNewDiaryCapturedDate(`${y}-${m}-${d}`)
      setNewDiaryCapturedTime(`${hh}:${mm}`)
      setShowRetranscribeOptions(false)
      setIsRetranscribing(false)
      setEditorKey(prev => prev + 1)
      
      onToast('Tagebucheintrag gespeichert', 'success')
      return true
    } catch (e) {
      console.error('Save diary entry failed', e)
      onToast('Speichern fehlgeschlagen', 'error')
      return false
    } finally {
      onSavingChange(false)
    }
  }, [buildIsoFromDateTime, date, dayId, keepAudio, newDiaryAudioFileId, newDiaryCapturedDate, newDiaryCapturedTime, newDiaryOcrAssetIds, newDiaryOriginalTranscript, newDiaryText, newDiaryTime, newDiaryTitle, onSavingChange, onToast])

  return {
    // State
    notes,
    editingNoteId,
    editingTime,
    editingCapturedDate,
    editingCapturedTime,
    editingText,
    editingTitle,
    newDiaryText,
    newDiaryTitle,
    newDiaryAudioFileId,
    newDiaryOriginalTranscript,
    newDiaryOcrAssetIds,
    newDiaryTime,
    newDiaryCapturedDate,
    newDiaryCapturedTime,
    editorKey,
    keepAudio,
    showRetranscribeOptions,
    isRetranscribing,
    
    // Setters
    setNotes,
    setEditingTime,
    setEditingCapturedDate,
    setEditingCapturedTime,
    setEditingText,
    setEditingTitle,
    setNewDiaryText,
    setNewDiaryTitle,
    setNewDiaryAudioFileId,
    setNewDiaryOriginalTranscript,
    setNewDiaryOcrAssetIds,
    setNewDiaryTime,
    setNewDiaryCapturedDate,
    setNewDiaryCapturedTime,
    setEditorKey,
    setKeepAudio,
    setShowRetranscribeOptions,
    
    // Actions
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
    saveDiaryEntry,
  }
}
