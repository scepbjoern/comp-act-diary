'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { TablerIcon } from '@/components/ui/TablerIcon'
import { MicrophoneButton } from '@/components/features/transcription/MicrophoneButton'
import AudioUploadButton from '@/components/features/media/AudioUploadButton'
import OCRUploadButton from '@/components/features/ocr/OCRUploadButton'
import { OriginalTranscriptSection } from '@/components/features/transcription/OriginalTextButton'
import { IconSparkles, IconX } from '@tabler/icons-react'
import { RichTextEditor } from '@/components/features/editor/RichTextEditor'
import { SaveIndicator } from '@/components/ui/SaveIndicator'
import dynamic from 'next/dynamic'
import type { DayNote } from '@/types/day'
import DiaryInteractionPanel from './DiaryInteractionPanel'
import { useReadMode } from '@/hooks/useReadMode'

import { DynamicJournalForm } from '@/components/features/journal/DynamicJournalForm'
import { JournalEntryCard } from '@/components/features/journal/JournalEntryCard'

interface DiarySectionProps {
  date: string
  timeBoxId?: string
  notes: DayNote[]
  newDiaryTitle: string
  newDiaryText: string
  newDiaryTime: string
  newDiaryCapturedDate: string
  newDiaryCapturedTime: string
  newDiaryAudioFileIds: string[]
  editorKey: number
  keepAudio: boolean
  showRetranscribeOptions: boolean
  isRetranscribing: boolean
  editingNoteId: string | null
  editingText: string
  editingTime: string
  editingCapturedDate: string
  editingCapturedTime: string
  editingTitle: string
  saving: boolean
  savedAt: number | null
  originalDiaryText?: string
  onNewDiaryTitleChange: (title: string) => void
  onNewDiaryTextChange: (text: string) => void
  onNewDiaryTimeChange: (time: string) => void
  onNewDiaryCapturedDateChange: (date: string) => void
  onNewDiaryCapturedTimeChange: (time: string) => void
  onAddNewDiaryAudioFileId: (id: string) => void
  onAddNewDiaryAudioTranscript: (assetId: string, transcript: string, transcriptModel: string | null) => void
  onNewDiaryOcrAssetIdsChange?: (ids: string[]) => void
  onEditorKeyIncrement: () => void
  onKeepAudioChange: (keep: boolean) => void
  onShowRetranscribeOptionsToggle: () => void
  onSaveDiaryEntry: () => void
  onClearDiaryForm: () => void
  onRetranscribeAudio: (model: string) => Promise<void>
  onStartEditNote: (note: DayNote) => void
  onSaveEditNote: (noteId: string) => void
  onCancelEditNote: () => void
  onDeleteNote: (noteId: string) => void
  onEditingTextChange: (text: string) => void
  onEditingTimeChange: (time: string) => void
  onEditingCapturedDateChange: (date: string) => void
  onEditingCapturedTimeChange: (time: string) => void
  onEditingTitleChange: (title: string) => void
  onUploadPhotos: (noteId: string, files: FileList | File[]) => void
  onDeletePhoto: (photoId: string) => void
  onViewPhoto: (noteId: string, index: number, url?: string) => void
  onDeleteAudio: (noteId: string, attachmentId?: string) => void
  onHandleRetranscribe: (payload: {
    noteId: string
    attachmentId?: string
    assetId?: string
    newText: string
    model?: string
  }) => Promise<void>
  onGenerateTitle: () => Promise<void>
  onUpdateNoteContent: (noteId: string, newContent: string) => Promise<boolean>
  onRefreshNotes?: () => Promise<void>
  onSaveAndRunPipeline?: () => Promise<void>
}

export function DiarySection({
  date,
  timeBoxId,
  notes,
  newDiaryTitle,
  newDiaryText,
  newDiaryTime,
  newDiaryCapturedDate,
  newDiaryCapturedTime,
  newDiaryAudioFileIds,
  editorKey,
  keepAudio,
  showRetranscribeOptions,
  isRetranscribing,
  editingNoteId,
  editingText,
  editingTime,
  editingCapturedDate,
  editingCapturedTime,
  editingTitle,
  saving,
  savedAt,
  originalDiaryText,
  onNewDiaryTitleChange,
  onNewDiaryTextChange,
  onNewDiaryTimeChange,
  onNewDiaryCapturedDateChange,
  onNewDiaryCapturedTimeChange,
  onAddNewDiaryAudioFileId,
  onAddNewDiaryAudioTranscript,
  onNewDiaryOcrAssetIdsChange,
  onEditorKeyIncrement,
  onKeepAudioChange,
  onShowRetranscribeOptionsToggle,
  onSaveDiaryEntry,
  onClearDiaryForm,
  onRetranscribeAudio,
  onStartEditNote,
  onSaveEditNote,
  onCancelEditNote,
  onDeleteNote,
  onEditingTextChange,
  onEditingTimeChange,
  onEditingCapturedDateChange,
  onEditingCapturedTimeChange,
  onEditingTitleChange,
  onUploadPhotos,
  onDeletePhoto,
  onViewPhoto,
  onDeleteAudio,
  onHandleRetranscribe,
  onGenerateTitle,
  onUpdateNoteContent,
  onRefreshNotes,
  onSaveAndRunPipeline,
}: DiarySectionProps) {
  const { readMode } = useReadMode()
  const [isImproving, setIsImproving] = useState(false)
  const [isSavingWithPipeline, setIsSavingWithPipeline] = useState(false)

  const resolveCapturedDateTime = (dateValue: string, timeValue: string) => {
    if (!dateValue || !timeValue) return ''
    return `${dateValue}T${timeValue}`
  }

  const handleCapturedDateTimeChange = (value: string) => {
    if (!value) {
      onNewDiaryCapturedDateChange('')
      onNewDiaryCapturedTimeChange('')
      return
    }
    const [datePart, timePart] = value.split('T')
    onNewDiaryCapturedDateChange(datePart)
    onNewDiaryCapturedTimeChange(timePart || '')
  }

  const handleSaveAndRunPipeline = async () => {
    if (!newDiaryText.trim()) return
    setIsSavingWithPipeline(true)
    try {
      await onSaveAndRunPipeline?.()
    } finally {
      setIsSavingWithPipeline(false)
    }
  }

  const handleImproveText = async () => {
    if (!newDiaryText.trim() && !originalDiaryText?.trim()) return
    
    setIsImproving(true)
    try {
      // Use the new Journal AI content generation API
      const response = await fetch('/api/journal-ai/generate-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: originalDiaryText || newDiaryText,
          typeCode: 'diary',
        }),
      })
      
      const data = await response.json()
      
      if (response.ok && data.content) {
        onNewDiaryTextChange(data.content)
        setTimeout(() => onEditorKeyIncrement(), 0)
      } else {
        console.error('Text improvement failed:', data.error)
      }
    } catch (err) {
      console.error('Text improvement failed:', err)
    } finally {
      setIsImproving(false)
    }
  }

  return (
    <div className="card p-4 md:p-4 p-2 space-y-3">
      <h2 className="font-medium">
        <span className="inline-flex items-center gap-1">
          <TablerIcon name="edit_note" size={20} />
          <span>Tagebuch</span>
        </span>
      </h2>

      {/* New diary entry form - hidden in read mode */}
      {!readMode && (
        <DynamicJournalForm
          types={[
            { id: 'diary', code: 'diary', name: 'Tagebuch', icon: '📝' }
          ]}
          templates={[]}
          initialTypeId="diary"
          date={date}
          onSubmit={async (entryData) => {
            // Mapping von DynamicJournalForm-Data auf die bisherige saveDiaryEntry-Logik
            // Da DynamicJournalForm die Felder schon aufbereitet, müssen wir sie nur in den State schieben und speichern
            onNewDiaryTitleChange(entryData.title || '')
            onNewDiaryTextChange(entryData.content || '')
            
            // Extrahieren der Zeit aus occurredAt
            if (entryData.occurredAt) {
              const d = new Date(entryData.occurredAt)
              const hh = String(d.getHours()).padStart(2, '0')
              const mm = String(d.getMinutes()).padStart(2, '0')
              onNewDiaryTimeChange(`${hh}:${mm}`)
            }
            
            // Extrahieren der Zeit aus capturedAt
            if (entryData.capturedAt) {
              const d = new Date(entryData.capturedAt)
              const y = d.getFullYear()
              const m = String(d.getMonth() + 1).padStart(2, '0')
              const day = String(d.getDate()).padStart(2, '0')
              const hh = String(d.getHours()).padStart(2, '0')
              const mm = String(d.getMinutes()).padStart(2, '0')
              onNewDiaryCapturedDateChange(`${y}-${m}-${day}`)
              onNewDiaryCapturedTimeChange(`${hh}:${mm}`)
            }

            // Optional: Wenn audioFileIds in DynamicJournalForm zurückgegeben werden würden,
            // müssten wir sie hier setzen. Aktuell macht DynamicJournalForm das intern via API,
            // aber wir triggern einfach saveDiaryEntry, was den State leert und die Liste neu lädt.
            
            // Wir nutzen die neue API-Route direkt, da saveDiaryEntry auf den alten State zugreift
            // und React-State-Updates asynchron sind.
            try {
              const res = await fetch(`/api/day/${notes[0]?.dayId || timeBoxId}/notes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  type: 'DIARY',
                  title: entryData.title || null,
                  text: entryData.content || '',
                  // audioFileIds etc. sind in DynamicJournalForm bereits verarbeitet falls implementiert
                  occurredAt: entryData.occurredAt,
                  capturedAt: entryData.capturedAt,
                  tzOffsetMinutes: new Date().getTimezoneOffset(),
                }),
                credentials: 'same-origin',
              })
              
              if (res.ok) {
                // Bei Erfolg form leeren
                onClearDiaryForm()
                // Refresh notes
                await onRefreshNotes?.()
              } else {
                console.error('Failed to save entry via form')
              }
            } catch (err) {
              console.error('Error saving entry via form:', err)
            }
          }}
        />
      )}

      {/* Interaction panel for linking contacts - hidden in read mode */}
      {!readMode && (
        <DiaryInteractionPanel
          date={date}
          timeBoxId={timeBoxId}
          onInteractionAdded={() => {}}
        />
      )}

      {/* Existing diary entries */}
      <div className="space-y-4 mt-6">
        {notes.filter(n => n.type === 'DIARY').map(note => {
          // Wir transformieren DayNote zu EntryWithRelations, da die Card das Format verlangt
          // Die genaue Typisierung erfolgt hier auf "as any", da es sich um eine Migration handelt 
          // und page.tsx das echte EntryWithRelations bald liefert.
          const entryWithRelations = {
            id: note.id,
            userId: note.ownerUserId || '',
            typeId: note.type, // 'DIARY'
            timeBoxId: timeBoxId || '',
            title: note.title || '',
            content: note.text || '',
            aiSummary: note.aiSummary || null,
            analysis: note.analysis || null,
            occurredAt: note.occurredAtIso ? new Date(note.occurredAtIso) : new Date(),
            capturedAt: note.capturedAtIso ? new Date(note.capturedAtIso) : new Date(),
            createdAt: note.createdAtIso ? new Date(note.createdAtIso) : new Date(),
            updatedAt: note.contentUpdatedAt ? new Date(note.contentUpdatedAt) : new Date(),
            isSensitive: false,
            deletedAt: null,
            locationId: null,
            templateId: null,
            contentUpdatedAt: note.contentUpdatedAt ? new Date(note.contentUpdatedAt) : null,
            type: {
              id: note.type,
              code: 'diary',
              name: 'Tagebuch',
              icon: '📝',
              sortOrder: 0,
              createdAt: new Date(),
              updatedAt: new Date(),
              userId: null,
              description: null,
              defaultTemplateId: null,
              bgColorClass: null
            },
            mediaAttachments: note.audioAttachments?.map(a => ({
              id: a.id,
              assetId: a.assetId,
              entityId: note.id,
              userId: note.ownerUserId || '',
              role: 'ATTACHMENT',
              displayOrder: 0,
              timeBoxId: timeBoxId || null,
              transcript: a.transcript || null,
              transcriptModel: a.transcriptModel || null,
              fieldId: null,
              createdAt: a.createdAt ? new Date(a.createdAt) : new Date(),
              asset: {
                id: a.assetId,
                userId: note.ownerUserId || '',
                mimeType: 'audio/webm', // Fallback, da in AudioAttachmentInfo nicht enthalten
                filePath: a.filePath,
                duration: a.duration,
                capturedAt: a.capturedAt ? new Date(a.capturedAt) : null,
                createdAt: a.createdAt ? new Date(a.createdAt) : new Date(),
                updatedAt: new Date(),
                thumbnailData: null,
                width: null,
                height: null,
                externalProvider: null,
                externalId: null,
                externalUrl: null,
                thumbnailUrl: null,
                ocrText: null,
                ocrMetadata: null,
                ocrStatus: null,
                ocrProcessedAt: null,
              }
            })) || [],
            accessCount: note.sharedWithCount || 0
          } as any

          return (
            <JournalEntryCard
              key={note.id}
              entry={entryWithRelations}
              mode="compact"
              isEditing={editingNoteId === note.id}
              onEdit={() => onStartEditNote(note)}
              onDelete={onDeleteNote}
              onRunPipeline={async () => {
                // Führt die alte RunPipeline-Logik in page.tsx nicht direkt aus,
                // wir machen hier einen simplen Fetch wie in DiaryEntriesAccordion
                try {
                  await fetch('/api/journal-ai/pipeline', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ journalEntryId: note.id }),
                  })
                  onRefreshNotes?.()
                } catch (e) {
                  console.error('Pipeline failed', e)
                }
              }}
              onViewPhoto={(attachmentId, url) => onViewPhoto(note.id, 0, url)}
              onUploadPhotos={(id, files) => onUploadPhotos(id, files)}
              onDeletePhoto={onDeletePhoto}
              onRestoreOcrToContent={(text) => {
                // Placeholder für OCR Restore in Phase 6 Startseite
                console.log('Restore OCR:', text)
              }}
            />
          )
        })}
      </div>
      
      <SaveIndicator saving={saving} savedAt={savedAt} />
    </div>
  )
}
