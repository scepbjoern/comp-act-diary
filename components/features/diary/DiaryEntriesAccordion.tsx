"use client"
import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { TablerIcon } from '@/components/ui/TablerIcon'
import { MicrophoneButton } from '@/components/features/transcription/MicrophoneButton'
import { CameraPicker } from '@/components/features/media/CameraPicker'
import { AudioPlayerH5 } from '@/components/features/media/AudioPlayerH5'
import { RichTextEditor } from '@/components/features/editor/RichTextEditor'
import { DiaryContentWithMentions } from '@/components/features/diary/DiaryContentWithMentions'
import { OriginalTranscriptPanel } from '@/components/features/transcription/OriginalTranscriptPanel'
import { OCRSourcePanel } from '@/components/features/ocr/OCRSourcePanel'
import { JournalEntrySection } from '@/components/features/diary/JournalEntrySection'
import { AISettingsPopup } from '@/components/features/ai/AISettingsPopup'
import dynamic from 'next/dynamic'

// Lazy load JournalTasksPanel to avoid circular dependencies and reduce initial bundle
const JournalTasksPanel = dynamic(
  () => import('@/components/features/tasks/JournalTasksPanel'),
  { loading: () => null }
)

import { useTasksForEntry } from '@/hooks/useTasksForEntry'

// Wrapper component that fetches tasks for a journal entry
function JournalTasksPanelWrapper({
  journalEntryId,
  onRefreshNotes,
}: {
  journalEntryId: string
  onRefreshNotes?: () => void
}) {
  const { tasks, refetch } = useTasksForEntry(journalEntryId)

  return (
    <JournalTasksPanel
      journalEntryId={journalEntryId}
      tasks={tasks}
      onTasksChange={() => {
        void refetch()
        onRefreshNotes?.()
      }}
      defaultExpanded={false}
    />
  )
}
import { TimestampModal } from '@/components/features/day/TimestampModal'
import { JournalEntryImage } from '@/components/features/diary/JournalEntryImage'
import { SharedBadge, ShareButton } from '@/components/features/diary/SharedBadge'
import { ShareEntryModal } from '@/components/features/diary/ShareEntryModal'
import { useJournalAI } from '@/hooks/useJournalAI'
import { useReadMode } from '@/hooks/useReadMode'
import {
  IconSettings,
  IconSparkles,
  IconClipboard,
  IconFileText,
  IconSearch,
  IconClock,
} from '@tabler/icons-react'

/** Audio attachment info for multi-audio support */
type AudioAttachmentInfo = {
  id: string
  assetId: string
  filePath: string | null
  duration: number | null
  transcript: string | null
  transcriptModel: string | null
  capturedAt: string | null
  createdAt: string | null
}

type DayNote = {
  id: string
  dayId: string
  type: 'MEAL' | 'REFLECTION' | 'DIARY'
  title?: string | null
  time?: string
  techTime?: string
  text: string
  originalTranscript?: string | null
  originalTranscriptModel?: string | null
  aiSummary?: string | null
  analysis?: string | null
  contentUpdatedAt?: string | null
  audioFilePath?: string | null
  audioFileId?: string | null
  keepAudio?: boolean
  /** All audio attachments for multi-audio support */
  audioAttachments?: AudioAttachmentInfo[]
  photos?: { id: string; url: string }[]
  occurredAtIso?: string
  capturedAtIso?: string
  createdAtIso?: string
  audioCapturedAtIso?: string | null
  audioUploadedAtIso?: string | null
  // Cross-user sharing fields
  sharedStatus?: 'owned' | 'shared-view' | 'shared-edit'
  ownerUserId?: string
  ownerName?: string | null
  accessRole?: 'VIEWER' | 'EDITOR' | null
  sharedWithCount?: number
}

interface DiaryEntriesAccordionProps {
  notes: DayNote[]
  currentDate: string
  editingNoteId: string | null
  editingText: string
  editingTime: string
  editingCapturedDate: string
  editingCapturedTime: string
  editingTitle: string
  onEdit: (note: DayNote) => void
  onSave: (id: string) => void
  onCancel: () => void
  onDelete: (id: string) => void
  onTextChange: (text: string) => void
  onTimeChange: (time: string) => void
  onCapturedDateChange: (date: string) => void
  onCapturedTimeChange: (time: string) => void
  onTitleChange: (title: string) => void
  onUploadPhotos: (id: string, files: FileList | File[]) => void
  onDeletePhoto: (id: string) => void
  onViewPhoto: (noteId: string, index: number, url?: string) => void
  onDeleteAudio?: (id: string, attachmentId?: string) => void
  onRetranscribe?: (payload: {
    noteId: string
    attachmentId?: string
    assetId?: string
    newText: string
    model?: string
  }) => void
  onUpdateContent?: (noteId: string, newContent: string) => void
  onRefreshNotes?: () => void
}

export function DiaryEntriesAccordion({
  notes,
  currentDate,
  editingNoteId,
  editingText,
  editingTime,
  editingCapturedDate,
  editingCapturedTime,
  editingTitle,
  onEdit,
  onSave,
  onCancel,
  onDelete,
  onTextChange,
  onTimeChange,
  onCapturedDateChange,
  onCapturedTimeChange,
  onTitleChange,
  onUploadPhotos,
  onDeletePhoto,
  onViewPhoto,
  onDeleteAudio,
  onRetranscribe,
  onUpdateContent,
  onRefreshNotes
}: DiaryEntriesAccordionProps) {
  const { readMode } = useReadMode()
  const [settingsPopupNoteId, setSettingsPopupNoteId] = useState<string | null>(null)
  const [timestampModalNoteId, setTimestampModalNoteId] = useState<string | null>(null)
  const [shareModalNoteId, setShareModalNoteId] = useState<string | null>(null)
  const [loadingStates, setLoadingStates] = useState<Record<string, 'content' | 'analysis' | 'summary' | 'pipeline' | null>>({})
  const [audioUploadingEntryId, setAudioUploadingEntryId] = useState<string | null>(null)
  const [highlightedEntryId, setHighlightedEntryId] = useState<string | null>(null)
  // Key to force RichTextEditor remount when text is updated externally (e.g., after audio transcription)
  const [editorKey, setEditorKey] = useState(0)
  const searchParams = useSearchParams()
  const highlightEntryId = searchParams.get('entry')
  
  const { generateContent, generateAnalysis, generateSummary, runPipeline } = useJournalAI()

  // Scroll to and highlight entry when URL hash or query param matches entry-{id}
  useEffect(() => {
    const hash = window.location.hash
    const hashEntryId = hash && hash.startsWith('#entry-') ? hash.replace('#entry-', '') : null
    const entryId = highlightEntryId || hashEntryId
    if (entryId) {
      // Delay to ensure DOM is ready
      const timeoutId = setTimeout(() => {
        const element = document.getElementById(`entry-${entryId}`)
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' })
          setHighlightedEntryId(entryId)
          // Remove highlight after animation
          setTimeout(() => setHighlightedEntryId(null), 2000)
        }
      }, 300)
      return () => clearTimeout(timeoutId)
    }
  }, [highlightEntryId, notes.length]) // Re-run when notes are loaded

  const fmtHMLocal = (iso?: string) => {
    if (!iso) return ''
    const d = new Date(iso)
    return d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
  }

  const toYmdLocal = (iso?: string | null) => {
    if (!iso) return ''
    const d = new Date(iso)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }

  const fmtDateOrTime = (iso?: string | null) => {
    if (!iso) return '—'
    const d = new Date(iso)
    const isoDate = toYmdLocal(iso)
    const isSameDay = isoDate === currentDate
    return d.toLocaleString('de-CH', {
      day: isSameDay ? undefined : '2-digit',
      month: isSameDay ? undefined : '2-digit',
      year: isSameDay ? undefined : '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).trim()
  }

  const resolveCapturedDateTime = (dateValue: string, timeValue: string) => {
    if (!dateValue || !timeValue) return ''
    return `${dateValue}T${timeValue}`
  }

  const handleCapturedDateTimeChange = (value: string) => {
    if (!value) {
      onCapturedDateChange('')
      onCapturedTimeChange('')
      return
    }
    const [datePart, timePart] = value.split('T')
    onCapturedDateChange(datePart)
    onCapturedTimeChange(timePart || '')
  }

  const extractImageUrls = (text: string): string[] => {
    const imageRegex = /!\[.*?\]\((.*?)\)/g
    const urls: string[] = []
    let match
    while ((match = imageRegex.exec(text)) !== null) {
      urls.push(match[1])
    }
    return urls
  }

  const handleRunPipeline = async (noteId: string) => {
    setLoadingStates(prev => ({ ...prev, [noteId]: 'pipeline' }))
    await runPipeline(noteId)
    
    // Also generate title after pipeline
    const note = notes.find(n => n.id === noteId)
    if (note?.text?.trim()) {
      try {
        const res = await fetch('/api/generate-title', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: note.text, model: 'gpt-4o-mini' })
        })
        const data = await res.json()
        if (data.title) {
          await fetch(`/api/notes/${noteId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: data.title })
          })
        }
      } catch (e) {
        console.error('Title generation in pipeline failed', e)
      }
    }
    
    setLoadingStates(prev => ({ ...prev, [noteId]: null }))
    onRefreshNotes?.()
  }

  const handleGenerateContent = async (noteId: string) => {
    setLoadingStates(prev => ({ ...prev, [noteId]: 'content' }))
    await generateContent(noteId)
    setLoadingStates(prev => ({ ...prev, [noteId]: null }))
    onRefreshNotes?.()
  }

  const handleGenerateAnalysis = async (noteId: string) => {
    setLoadingStates(prev => ({ ...prev, [noteId]: 'analysis' }))
    await generateAnalysis(noteId)
    setLoadingStates(prev => ({ ...prev, [noteId]: null }))
    onRefreshNotes?.()
  }

  const handleGenerateSummary = async (noteId: string) => {
    setLoadingStates(prev => ({ ...prev, [noteId]: 'summary' }))
    await generateSummary(noteId)
    setLoadingStates(prev => ({ ...prev, [noteId]: null }))
    onRefreshNotes?.()
  }

  const handleDeleteAnalysis = async (noteId: string) => {
    try {
      await fetch(`/api/notes/${noteId}/analysis`, { method: 'DELETE' })
      onRefreshNotes?.()
    } catch (err) {
      console.error('Failed to delete analysis', err)
    }
  }

  const handleDeleteSummary = async (noteId: string) => {
    try {
      await fetch(`/api/notes/${noteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aiSummary: null })
      })
      onRefreshNotes?.()
    } catch (err) {
      console.error('Failed to delete summary', err)
    }
  }

  const handleUpdateAnalysis = async (noteId: string, newAnalysis: string) => {
    try {
      await fetch(`/api/notes/${noteId}/analysis`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analysis: newAnalysis })
      })
      onRefreshNotes?.()
    } catch (err) {
      console.error('Failed to update analysis', err)
    }
  }

  const handleUpdateSummary = async (noteId: string, newSummary: string) => {
    try {
      await fetch(`/api/notes/${noteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aiSummary: newSummary })
      })
      onRefreshNotes?.()
    } catch (err) {
      console.error('Failed to update summary', err)
    }
  }

  const handleSaveTimestamps = async (noteId: string, occurredAt: string, capturedAt: string, audioFileId?: string | null) => {
    try {
      // Update JournalEntry timestamps
      await fetch(`/api/notes/${noteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ occurredAt, capturedAt })
      })
      // If audio attached, also update MediaAsset.capturedAt
      if (audioFileId) {
        await fetch(`/api/media-assets/${audioFileId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ capturedAt })
        })
      }
      onRefreshNotes?.()
    } catch (err) {
      console.error('Failed to update timestamps', err)
    }
  }

  // Handle file upload for existing entry - sends directly to the journal entry audio endpoint
  // Returns the transcript so caller can update the editor
  const handleAudioFileUpload = async (entryId: string, file: File): Promise<string | null> => {
    setAudioUploadingEntryId(entryId)
    try {
      // Get transcription model from user settings
      let model = 'gpt-4o-transcribe'
      try {
        const settingsRes = await fetch('/api/user/settings', { credentials: 'same-origin' })
        if (settingsRes.ok) {
          const data = await settingsRes.json()
          if (data.settings?.transcriptionModel) {
            model = data.settings.transcriptionModel
          }
        }
      } catch { /* use default */ }

      const formData = new FormData()
      formData.append('file', file)
      formData.append('model', model)
      // Don't append to DB - we update editor locally
      formData.append('appendText', 'false')

      const res = await fetch(`/api/journal-entries/${entryId}/audio`, {
        method: 'POST',
        body: formData,
        credentials: 'same-origin',
      })

      if (!res.ok) {
        const errorData = await res.json()
        console.error('Failed to add audio:', errorData.error || errorData)
        return null
      }

      const data = await res.json()
      onRefreshNotes?.()
      return data.transcript || null
    } catch (err) {
      console.error('Failed to add audio to entry', err)
      return null
    } finally {
      setAudioUploadingEntryId(null)
    }
  }

  const diaryNotes = notes.filter(n => n.type === 'DIARY').sort((a, b) => 
    (b.occurredAtIso || '').localeCompare(a.occurredAtIso || '')
  )

  if (diaryNotes.length === 0) {
    return <div className="text-sm text-gray-400">Noch keine Tagebucheinträge.</div>
  }

  return (
    <div className="space-y-2">
      {diaryNotes.map(n => {
        const noteLoading = loadingStates[n.id]
        const isOutdated = n.contentUpdatedAt && n.analysis && 
          new Date(n.contentUpdatedAt) > new Date(n.createdAtIso || 0)
        
        return (
          <div 
            key={n.id} 
            id={`entry-${n.id}`}
            className={`collapse collapse-arrow bg-base-200 border-2 transition-all duration-500 ${
              highlightedEntryId === n.id 
                ? 'border-primary ring-2 ring-primary/50 ring-offset-2' 
                : 'border-slate-600'
            }`}
          >
            <input type="checkbox" defaultChecked />
            <div className="collapse-title text-sm font-medium py-2">
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-gray-400">{fmtHMLocal(n.occurredAtIso)}</span>
                  <span className="text-gray-300 truncate">
                    {n.title || n.text.substring(0, 100) || 'Tagebucheintrag'}
                  </span>
                  {/* Show shared badge for entries shared with current user */}
                  <SharedBadge
                    sharedStatus={n.sharedStatus}
                    accessRole={n.accessRole}
                    ownerName={n.ownerName}
                    sharedWithCount={n.sharedWithCount}
                    compact
                  />
                </div>
                <div className="text-xs text-gray-500">
                  <span className="font-medium">Erfasst:</span>
                  <span className="font-normal"> {fmtDateOrTime(n.audioCapturedAtIso || n.capturedAtIso)}</span>
                  {n.audioUploadedAtIso && (
                    <>
                      <span className="font-normal"> · </span>
                      <span className="font-medium">Hochgeladen:</span>
                      <span className="font-normal"> {fmtDateOrTime(n.audioUploadedAtIso)}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="collapse-content">
              <div className="pt-2 space-y-3 text-sm">
                {/* Action bar with AI controls */}
                <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-700">
                  <div className="flex items-center gap-2">
                    {editingNoteId === n.id ? (
                      <>
                        <button 
                          className="btn btn-success btn-xs" 
                          onClick={() => onSave(n.id)}
                          title="Speichern"
                        >
                          <TablerIcon name="device-floppy" size={16} />
                          <span className="md:inline hidden ml-1">Speichern</span>
                        </button>
                        <button 
                          className="btn btn-ghost btn-xs" 
                          onClick={onCancel}
                          title="Abbrechen"
                        >
                          <TablerIcon name="cancel" size={16} />
                          <span className="md:inline hidden ml-1">Abbrechen</span>
                        </button>
                      </>
                    ) : (
                      /* Hide edit/delete buttons in read mode or if user has no edit rights */
                      !readMode && (n.sharedStatus === 'owned' || n.sharedStatus === undefined || n.accessRole === 'EDITOR') && (
                        <>
                          <button 
                            className="btn btn-ghost btn-xs" 
                            title="Bearbeiten" 
                            onClick={() => onEdit(n)}
                          >
                            <TablerIcon name="edit" size={16} />
                            <span className="md:inline hidden ml-1">Bearbeiten</span>
                          </button>
                          <button 
                            className="btn btn-ghost btn-xs text-red-400" 
                            title="Löschen" 
                            onClick={() => onDelete(n.id)}
                          >
                            <TablerIcon name="trash" size={16} />
                            <span className="md:inline hidden ml-1">Löschen</span>
                          </button>
                          {/* Share button for owned entries */}
                          {(n.sharedStatus === 'owned' || n.sharedStatus === undefined) && (
                            <ShareButton onClick={() => setShareModalNoteId(n.id)} />
                          )}
                        </>
                      )
                    )}
                  </div>
                  
                  {/* AI action buttons - hidden in read mode */}
                  {!readMode && (
                  <div className="flex items-center gap-1">
                    <button
                      className="btn btn-ghost btn-xs"
                      onClick={() => setTimestampModalNoteId(n.id)}
                      title="Zeitpunkte bearbeiten"
                    >
                      <IconClock size={16} />
                    </button>
                    <button
                      className="btn btn-ghost btn-xs"
                      onClick={() => setSettingsPopupNoteId(n.id)}
                      title="AI-Einstellungen"
                    >
                      <IconSettings size={16} />
                    </button>
                    <button
                      className="btn btn-ghost btn-xs text-primary"
                      onClick={() => handleRunPipeline(n.id)}
                      disabled={noteLoading === 'pipeline'}
                      title="AI-Pipeline ausführen (Content → Analyse → Zusammenfassung)"
                    >
                      {noteLoading === 'pipeline' ? (
                        <span className="loading loading-spinner loading-xs" />
                      ) : (
                        <IconSparkles size={16} />
                      )}
                      <span className="md:inline hidden ml-1">AI-Pipeline</span>
                    </button>
                    <button
                      className="btn btn-ghost btn-xs"
                      onClick={async () => {
                        if (!editingText.trim() && !n.text.trim()) return
                        try {
                          const res = await fetch('/api/generate-title', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ text: editingNoteId === n.id ? editingText : n.text, model: 'gpt-4o-mini' })
                          })
                          const data = await res.json()
                          if (data.title) {
                            if (editingNoteId === n.id) {
                              onTitleChange(data.title)
                            } else {
                              // Save title directly
                              await fetch(`/api/notes/${n.id}`, {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ title: data.title })
                              })
                              onRefreshNotes?.()
                            }
                          }
                        } catch (e) {
                          console.error('Title generation failed', e)
                        }
                      }}
                      title="Titel generieren"
                    >
                      ✨
                    </button>
                  </div>
                  )}
                </div>

                {/* Generated Image for Entry */}
                <JournalEntryImage
                  entryId={n.id}
                  summaryText={n.aiSummary || n.text || ''}
                />

                {/* AI Summary Section (blue background) */}
                <JournalEntrySection
                  title="Zusammenfassung"
                  icon={<IconClipboard size={16} className="text-info" />}
                  content={n.aiSummary || null}
                  bgColorClass="bg-blue-500/10 rounded-lg px-2"
                  isEmpty={!n.aiSummary}
                  isLoading={noteLoading === 'summary'}
                  canDelete={true}
                  canGenerate={true}
                  onEdit={(newSummary) => handleUpdateSummary(n.id, newSummary)}
                  onDelete={() => handleDeleteSummary(n.id)}
                  onGenerate={() => handleGenerateSummary(n.id)}
                  onRegenerate={() => handleGenerateSummary(n.id)}
                />
                
                {/* Content Section */}
                {editingNoteId === n.id ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">Titel</span>
                      <input 
                        type="text" 
                        value={editingTitle} 
                        onChange={e => onTitleChange(e.target.value)} 
                        placeholder="Optional: Titel für Eintrag"
                        className="flex-1 bg-background border border-slate-700 rounded px-2 py-1 text-xs" 
                      />
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-gray-400">Bezugzeit</span>
                      <input 
                        type="time" 
                        value={editingTime} 
                        onChange={e => onTimeChange(e.target.value)} 
                        className="bg-background border border-slate-700 rounded px-2 py-1 text-xs" 
                      />
                      <span className="text-xs text-gray-400">Erfasst am</span>
                      <input
                        type="datetime-local"
                        value={resolveCapturedDateTime(editingCapturedDate, editingCapturedTime)}
                        onChange={e => handleCapturedDateTimeChange(e.target.value)}
                        className="bg-background border border-slate-700 rounded px-2 py-1 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <RichTextEditor
                        key={editorKey}
                        markdown={editingText}
                        onChange={onTextChange}
                        placeholder="Tagebucheintrag bearbeiten..."
                      />
                      <div className="flex items-center gap-2">
                        <MicrophoneButton
                          existingEntryId={n.id}
                          onAudioData={({ text }) => {
                            // Append transcribed text to editor and refresh to show new audio
                            if (text) {
                              onTextChange(editingText ? (editingText + '\n\n' + text) : text)
                              // Force editor remount to show updated text
                              setTimeout(() => setEditorKey(k => k + 1), 0)
                            }
                            onRefreshNotes?.()
                          }}
                          className="text-gray-300 hover:text-gray-100 text-xs"
                          compact
                        />
                        <label className="cursor-pointer text-gray-300 hover:text-gray-100" title="Audio-Datei hochladen">
                          <TablerIcon name="cloud-upload" size={20} />
                          <input
                            type="file"
                            accept=".mp3,.m4a,.webm,.ogg,.wav,audio/*"
                            className="hidden"
                            disabled={audioUploadingEntryId === n.id}
                            onChange={async (e) => {
                              const file = e.target.files?.[0]
                              if (file) {
                                const transcript = await handleAudioFileUpload(n.id, file)
                                if (transcript) {
                                  onTextChange(editingText ? (editingText + '\n\n' + transcript) : transcript)
                                  setTimeout(() => setEditorKey(k => k + 1), 0)
                                }
                              }
                              e.target.value = ''
                            }}
                          />
                        </label>
                        {audioUploadingEntryId === n.id && (
                          <span className="loading loading-spinner loading-xs text-amber-500" />
                        )}
                        {n.originalTranscript && (
                          <button
                            className="btn btn-ghost btn-xs text-primary"
                            onClick={() => handleGenerateContent(n.id)}
                            disabled={noteLoading === 'content'}
                            title="Text mit KI verbessern"
                          >
                            {noteLoading === 'content' ? (
                              <span className="loading loading-spinner loading-xs" />
                            ) : (
                              <IconSparkles size={14} />
                            )}
                            <span className="ml-1">Verbessern</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <JournalEntrySection
                    title="Inhalt"
                    icon={<IconFileText size={16} />}
                    content={n.text}
                    isEmpty={!n.text}
                    isLoading={noteLoading === 'content'}
                    canDelete={false}
                    canGenerate={Boolean(n.originalTranscript)}
                    onEdit={(newContent) => onUpdateContent?.(n.id, newContent)}
                    onGenerate={() => handleGenerateContent(n.id)}
                    onRegenerate={() => handleGenerateContent(n.id)}
                  >
                    <DiaryContentWithMentions noteId={n.id} markdown={n.text} />
                  </JournalEntrySection>
                )}
                
                {/* Analysis Section (yellow background) */}
                <JournalEntrySection
                  title="Analyse"
                  icon={<IconSearch size={16} className="text-warning" />}
                  content={n.analysis || null}
                  bgColorClass="bg-yellow-500/10 rounded-lg px-2"
                  isEmpty={!n.analysis}
                  isOutdated={Boolean(isOutdated)}
                  isLoading={noteLoading === 'analysis'}
                  canDelete={true}
                  canGenerate={true}
                  onEdit={(newAnalysis) => handleUpdateAnalysis(n.id, newAnalysis)}
                  onDelete={() => handleDeleteAnalysis(n.id)}
                  onGenerate={() => handleGenerateAnalysis(n.id)}
                  onRegenerate={() => handleGenerateAnalysis(n.id)}
                />
                
                {/* Tasks Panel (green background) - only show if not in read mode */}
                {!readMode && (
                  <JournalTasksPanelWrapper
                    journalEntryId={n.id}
                    onRefreshNotes={onRefreshNotes}
                  />
                )}
                
                {/* Audio section - shows audio attachments and add buttons in edit mode */}
                <div className="space-y-2">
                  {/* Show existing audio attachments */}
                  {n.audioAttachments && n.audioAttachments.length > 0 && (
                    <>
                      <div className="text-xs text-gray-400 font-medium">
                        Angehängte Audios ({n.audioAttachments.length})
                      </div>
                      {n.audioAttachments.map((audio, idx) => (
                        <div key={audio.id} className="flex items-center gap-2 p-2 bg-slate-700/30 rounded">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
                              <span>🎵 {audio.capturedAt ? fmtDateOrTime(audio.capturedAt) : `Audio ${idx + 1}`}</span>
                              {audio.duration && (
                                <span>({Math.floor(audio.duration / 60)}:{String(Math.floor(audio.duration % 60)).padStart(2, '0')})</span>
                              )}
                              {audio.transcript && (
                                <span className="truncate max-w-[150px]" title={audio.transcript}>
                                  &quot;{audio.transcript.substring(0, 30)}...&quot;
                                </span>
                              )}
                            </div>
                            {audio.filePath && (
                              <AudioPlayerH5 
                                audioFilePath={audio.filePath} 
                                compact
                              />
                            )}
                          </div>
                          {editingNoteId === n.id && (
                            <button 
                              className="btn btn-ghost btn-xs text-red-400 hover:text-red-300"
                              onClick={(e) => {
                                e.stopPropagation()
                                e.preventDefault()
                                onDeleteAudio?.(n.id, audio.id)
                              }}
                              title="Audio löschen"
                            >
                              <TablerIcon name="trash" size={16} />
                            </button>
                          )}
                        </div>
                      ))}
                    </>
                  )}
                  
                  {/* Add audio buttons - only in edit mode */}
                  {editingNoteId === n.id && (
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <span>{n.audioAttachments && n.audioAttachments.length > 0 ? 'Weiteres Audio:' : 'Audio hinzufügen:'}</span>
                      {audioUploadingEntryId === n.id ? (
                        <span className="loading loading-spinner loading-xs text-amber-500" />
                      ) : (
                        <>
                          <MicrophoneButton
                            existingEntryId={n.id}
                            onAudioData={({ text }) => {
                              // Append text to editor and force remount
                              if (text) {
                                onTextChange(editingText ? (editingText + '\n\n' + text) : text)
                                setTimeout(() => setEditorKey(k => k + 1), 0)
                              }
                              onRefreshNotes?.()
                            }}
                            className="text-green-500 hover:text-green-400"
                            compact
                          />
                          <label className="cursor-pointer text-green-500 hover:text-green-400" title="Audio-Datei hochladen">
                            <TablerIcon name="cloud-upload" size={20} />
                            <input
                              type="file"
                              accept=".mp3,.m4a,.webm,.ogg,.wav,audio/*"
                              className="hidden"
                              onChange={async (e) => {
                                const file = e.target.files?.[0]
                                if (file) {
                                  const transcript = await handleAudioFileUpload(n.id, file)
                                  if (transcript) {
                                    onTextChange(editingText ? (editingText + '\n\n' + transcript) : transcript)
                                    setTimeout(() => setEditorKey(k => k + 1), 0)
                                  }
                                }
                                e.target.value = ''
                              }}
                            />
                          </label>
                        </>
                      )}
                    </div>
                  )}
                </div>
                
                {/* Original transcript - lazy loaded with edit capability */}
                {(n.audioFileId || n.originalTranscript || (n.audioAttachments && n.audioAttachments.length > 0)) && (
                  <OriginalTranscriptPanel
                    noteId={n.id}
                    initialTranscript={n.originalTranscript}
                    initialTranscriptModel={n.originalTranscriptModel}
                    audioFileId={n.audioFileId}
                    audioAttachments={n.audioAttachments}
                    onRestoreToContent={(text) => {
                      if (editingNoteId === n.id) {
                        onTextChange(text)
                      } else if (onUpdateContent) {
                        onUpdateContent(n.id, text)
                      }
                    }}
                    onOriginalUpdated={(_newOriginal) => {
                      onRefreshNotes?.()
                    }}
                    onRetranscribe={onRetranscribe}
                  />
                )}
                
                {/* OCR Sources - show for entries without audio (likely OCR-sourced) */}
                {!n.audioFileId && n.originalTranscript && (
                  <OCRSourcePanel
                    noteId={n.id}
                    initialTranscript={n.originalTranscript}
                    onRestoreToContent={(text) => {
                      if (editingNoteId === n.id) {
                        onTextChange(text)
                      } else if (onUpdateContent) {
                        onUpdateContent(n.id, text)
                      }
                    }}
                  />
                )}
                
                {/* Photos - includes both uploaded photos and images from markdown */}
                {(() => {
                  const textToScan = editingNoteId === n.id ? editingText : n.text
                  const markdownImages = extractImageUrls(textToScan)
                  const uploadedPhotos = n.photos || []
                  const allImages = [
                    ...uploadedPhotos.map((p, idx) => ({ type: 'uploaded' as const, data: p, index: idx })),
                    ...markdownImages.map((url, idx) => ({ type: 'markdown' as const, url, index: uploadedPhotos.length + idx }))
                  ]
                  
                  if (allImages.length === 0) return null
                  
                  return (
                    <div className="flex flex-wrap gap-2">
                      {allImages.map((img, idx) => {
                        // Validate URL before rendering
                        if (img.type === 'uploaded' && (!img.data.url || !img.data.url.trim())) {
                          return null
                        }
                        // Validate markdown image URLs - must start with / or http
                        if (img.type === 'markdown') {
                          const url = img.url
                          if (!url || (!url.startsWith('/') && !url.startsWith('http') && !url.startsWith('data:'))) {
                            return null
                          }
                        }
                        
                        return (
                        <div key={idx} className="relative group">
                          {img.type === 'uploaded' ? (
                            <>
                              <Image 
                                src={`${img.data.url}?v=${img.data.id}`} 
                                alt="Foto" 
                                width={64}
                                height={64}
                                className="w-16 h-16 object-cover rounded border border-slate-700 cursor-zoom-in" 
                                onClick={() => onViewPhoto(n.id, img.index)} 
                              />
                              <button 
                                className="btn btn-circle btn-error btn-xs absolute -top-2 -right-2 opacity-0 group-hover:opacity-100" 
                                title="Foto löschen" 
                                onClick={e => { e.stopPropagation(); e.preventDefault(); onDeletePhoto(img.data.id); }}
                              >
                                ×
                              </button>
                            </>
                          ) : (
                            <Image 
                              src={img.url} 
                              alt="Markdown Bild" 
                              width={64}
                              height={64}
                              className="w-16 h-16 object-cover rounded border border-blue-500/50 cursor-zoom-in" 
                              onClick={() => onViewPhoto(n.id, img.index, img.url)}
                              title="Aus Markdown"
                            />
                          )}
                        </div>
                        )
                      })}
                    </div>
                  )
                })()}
                
                {/* Photo upload */}
                <div className="flex flex-wrap gap-2">
                  <label className="inline-flex items-center gap-2">
                    <span className="pill text-xs">Foto hochladen</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={e => {
                        if (e.target.files && e.target.files.length > 0) {
                          onUploadPhotos(n.id, e.target.files)
                        }
                        e.currentTarget.value = ''
                      }}
                    />
                  </label>
                  <CameraPicker
                    label="Kamera"
                    buttonClassName="pill text-xs"
                    onCapture={(files) => onUploadPhotos(n.id, files)}
                  />
                </div>
              </div>
            </div>
          </div>
        )
      })}
      
      {/* AI Settings Popup */}
      {settingsPopupNoteId && (
        <AISettingsPopup
          isOpen={true}
          onClose={() => setSettingsPopupNoteId(null)}
          typeCode="diary"
          typeName="Tagebucheintrag"
        />
      )}
      
      {/* Timestamp Modal */}
      {timestampModalNoteId && (() => {
        const note = diaryNotes.find(n => n.id === timestampModalNoteId)
        if (!note) return null
        return (
          <TimestampModal
            isOpen={true}
            onClose={() => setTimestampModalNoteId(null)}
            onSave={(occurredAt, capturedAt, audioFileId) => handleSaveTimestamps(timestampModalNoteId, occurredAt, capturedAt, audioFileId)}
            occurredAtIso={note.occurredAtIso}
            capturedAtIso={note.capturedAtIso}
            audioCapturedAtIso={note.audioCapturedAtIso}
            audioUploadedAtIso={note.audioUploadedAtIso}
            audioFileId={note.audioFileId}
          />
        )
      })()}
      
      {/* Share Entry Modal */}
      {shareModalNoteId && (
        <ShareEntryModal
          entryId={shareModalNoteId}
          isOpen={true}
          onClose={() => setShareModalNoteId(null)}
          onAccessChange={() => onRefreshNotes?.()}
        />
      )}
    </div>
  )
}
