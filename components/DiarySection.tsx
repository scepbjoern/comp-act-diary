'use client'

import { useState } from 'react'
import { TablerIcon } from '@/components/TablerIcon'
import { MicrophoneButton } from '@/components/MicrophoneButton'
import AudioUploadButton from '@/components/AudioUploadButton'
import { OriginalTranscriptSection } from '@/components/OriginalTextButton'
import { IconSparkles } from '@tabler/icons-react'
import { RichTextEditor } from '@/components/RichTextEditor'
import { SaveIndicator } from '@/components/SaveIndicator'
import dynamic from 'next/dynamic'
import type { DayNote } from '@/types/day'
import DiaryInteractionPanel from './DiaryInteractionPanel'

const DiaryEntriesAccordion = dynamic(() => import('@/components/DiaryEntriesAccordion').then(mod => ({ default: mod.DiaryEntriesAccordion })), {
  loading: () => <div className="text-sm text-gray-400">Lädt...</div>
})

interface DiarySectionProps {
  date: string
  notes: DayNote[]
  newDiaryTitle: string
  newDiaryText: string
  newDiaryTime: string
  newDiaryAudioFileId: string | null
  editorKey: number
  keepAudio: boolean
  showRetranscribeOptions: boolean
  isRetranscribing: boolean
  editingNoteId: string | null
  editingText: string
  editingTime: string
  editingTitle: string
  saving: boolean
  savedAt: number | null
  originalDiaryText?: string
  onNewDiaryTitleChange: (title: string) => void
  onNewDiaryTextChange: (text: string) => void
  onNewDiaryTimeChange: (time: string) => void
  onNewDiaryAudioFileIdChange: (id: string | null) => void
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
  onEditingTitleChange: (title: string) => void
  onUploadPhotos: (noteId: string, files: FileList | File[]) => void
  onDeletePhoto: (photoId: string) => void
  onViewPhoto: (noteId: string, index: number) => void
  onDeleteAudio: (noteId: string) => void
  onHandleRetranscribe: (noteId: string, model: string) => Promise<void>
  onGenerateTitle: () => Promise<void>
  onOriginalPreserved: (orig: string) => void
  onUpdateNoteContent: (noteId: string, newContent: string) => Promise<boolean>
  onRefreshNotes?: () => Promise<void>
  onSaveAndRunPipeline?: () => Promise<void>
}

export function DiarySection({
  date,
  notes,
  newDiaryTitle,
  newDiaryText,
  newDiaryTime,
  newDiaryAudioFileId,
  editorKey,
  keepAudio,
  showRetranscribeOptions,
  isRetranscribing,
  editingNoteId,
  editingText,
  editingTime,
  editingTitle,
  saving,
  savedAt,
  originalDiaryText,
  onNewDiaryTitleChange,
  onNewDiaryTextChange,
  onNewDiaryTimeChange,
  onNewDiaryAudioFileIdChange,
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
  onEditingTitleChange,
  onUploadPhotos,
  onDeletePhoto,
  onViewPhoto,
  onDeleteAudio,
  onHandleRetranscribe,
  onGenerateTitle,
  onOriginalPreserved,
  onUpdateNoteContent,
  onRefreshNotes,
  onSaveAndRunPipeline,
}: DiarySectionProps) {
  const [isImproving, setIsImproving] = useState(false)
  const [isSavingWithPipeline, setIsSavingWithPipeline] = useState(false)

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
      // Preserve original transcript if not already preserved
      if (originalDiaryText && !newDiaryText.includes('[Original')) {
        onOriginalPreserved(originalDiaryText)
      }
      
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

      {/* New diary entry form */}
      <div className="space-y-2 md:p-3 md:rounded md:border md:border-slate-700 md:bg-slate-800/30">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs text-gray-400">Titel</span>
          <input 
            type="text" 
            value={newDiaryTitle}
            onChange={e => onNewDiaryTitleChange(e.target.value)}
            placeholder="Optional: Titel für Eintrag"
            className="flex-1 bg-background border border-slate-700 rounded px-2 py-1 text-sm"
          />
          <button
            className="btn btn-ghost btn-xs text-gray-300 hover:text-gray-100"
            onClick={onGenerateTitle}
            title="Titel mit KI generieren"
          >
            <span className="md:inline hidden">Generieren</span>
            ✨
          </button>
        </div>
        
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs text-gray-400">Uhrzeit</span>
          <input 
            type="time" 
            value={newDiaryTime}
            onChange={e => onNewDiaryTimeChange(e.target.value)}
            className="bg-background border border-slate-700 rounded px-2 py-1 text-sm"
          />
        </div>
        
        <RichTextEditor
          key={editorKey}
          markdown={newDiaryText}
          onChange={onNewDiaryTextChange}
          placeholder="Neuer Tagebucheintrag..."
          time={newDiaryTime}
        />

        {/* Original transcript section - shown when text was improved */}
        {originalDiaryText && (
          <OriginalTranscriptSection
            originalText={originalDiaryText}
            onRestore={(t: string) => {
              onNewDiaryTextChange(t)
              setTimeout(() => onEditorKeyIncrement(), 0)
            }}
          />
        )}
        
        {/* Direct re-transcribe button for newly uploaded audio */}
        {newDiaryAudioFileId && (
          <div className="flex items-center gap-2 p-2 bg-slate-700/30 rounded">
            <span className="text-xs text-gray-400">
              Audio bereit {isRetranscribing && '(transkribiere...)'}
            </span>
            <div className="relative">
              <button
                className="btn btn-ghost btn-xs text-gray-300 hover:text-gray-100"
                onClick={onShowRetranscribeOptionsToggle}
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
                    onClick={() => onRetranscribeAudio('openai/whisper-large-v3')}
                  >
                    openai/whisper-large-v3
                  </button>
                  <button
                    className="btn btn-ghost btn-xs w-full justify-start text-left mb-1"
                    onClick={() => onRetranscribeAudio('gpt-4o-mini-transcribe')}
                  >
                    gpt-4o-mini-transcribe
                  </button>
                  <button
                    className="btn btn-ghost btn-xs w-full justify-start text-left"
                    onClick={() => onRetranscribeAudio('gpt-4o-transcribe')}
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
            onAudioData={({ text, audioFileId }: { text: string; audioFileId?: string | null }) => {
              onNewDiaryTextChange(newDiaryText ? (newDiaryText + '\n\n' + text) : text)
              if (audioFileId) {
                onNewDiaryAudioFileIdChange(audioFileId)
              }
              // Set original transcript when first transcribing
              onOriginalPreserved(text)
              onEditorKeyIncrement()
            }}
            className="text-gray-300 hover:text-gray-100"
            compact
          />
          
          <AudioUploadButton
            date={date}
            time={newDiaryTime}
            keepAudio={keepAudio}
            onAudioUploaded={({ text, audioFileId }: { text: string; audioFileId?: string | null }) => {
              onNewDiaryTextChange(newDiaryText ? (newDiaryText + '\n\n' + text) : text)
              if (audioFileId) {
                onNewDiaryAudioFileIdChange(audioFileId)
              }
              // Set original transcript when first transcribing
              onOriginalPreserved(text)
              onEditorKeyIncrement()
            }}
            compact
          />

          {/* Audio storage toggle - database icons */}
          <button
            type="button"
            onClick={() => onKeepAudioChange(!keepAudio)}
            title={keepAudio ? 'Audio wird gespeichert' : 'Audio wird nicht gespeichert'}
            className="text-gray-500 hover:text-gray-400"
          >
            <TablerIcon name={keepAudio ? 'database' : 'database-off'} size={20} />
          </button>
          
          {/* Vertical divider */}
          <div className="w-px h-5 bg-slate-600" />
          
          <button
            type="button"
            onClick={handleImproveText}
            disabled={isImproving || (!newDiaryText.trim() && !originalDiaryText?.trim())}
            title="Text mit KI verbessern"
            className="text-primary hover:text-primary/80 disabled:opacity-50"
          >
            {isImproving ? (
              <span className="loading loading-spinner loading-xs" />
            ) : (
              <IconSparkles size={20} />
            )}
          </button>
          
          {/* Vertical divider */}
          <div className="w-px h-5 bg-slate-600" />
          
          {/* Save button - icon only, hidden when nothing to save */}
          {newDiaryText.trim() && (
            <button 
              type="button"
              onClick={onSaveDiaryEntry}
              title="Speichern"
              className="text-green-500 hover:text-green-400"
            >
              <TablerIcon name="device-floppy" size={20} />
            </button>
          )}
          
          {/* Save + AI Pipeline button */}
          {newDiaryText.trim() && onSaveAndRunPipeline && (
            <button 
              type="button"
              onClick={handleSaveAndRunPipeline}
              disabled={isSavingWithPipeline}
              title="Speichern + AI-Pipeline ausführen"
              className="text-primary hover:text-primary/80 disabled:opacity-50 flex items-center gap-1"
            >
              {isSavingWithPipeline ? (
                <span className="loading loading-spinner loading-xs" />
              ) : (
                <>
                  <TablerIcon name="device-floppy" size={16} />
                  <IconSparkles size={16} />
                </>
              )}
            </button>
          )}
          
          {/* Cancel button - icon only, hidden when nothing to cancel */}
          {(newDiaryText.trim() || newDiaryAudioFileId || newDiaryTime) && (
            <button 
              type="button"
              onClick={onClearDiaryForm}
              title="Abbrechen"
              className="text-red-500 hover:text-red-400"
            >
              <TablerIcon name="cancel" size={20} />
            </button>
          )}
        </div>
      </div>

      {/* Interaction panel for linking contacts - always visible */}
      <DiaryInteractionPanel
        date={date}
        onInteractionAdded={() => {}}
      />

      {/* Existing diary entries */}
      <DiaryEntriesAccordion
        notes={notes}
        editingNoteId={editingNoteId}
        editingText={editingText}
        editingTime={editingTime}
        editingTitle={editingTitle}
        onEdit={onStartEditNote}
        onSave={onSaveEditNote}
        onCancel={onCancelEditNote}
        onDelete={onDeleteNote}
        onTextChange={onEditingTextChange}
        onTimeChange={onEditingTimeChange}
        onTitleChange={onEditingTitleChange}
        onUploadPhotos={onUploadPhotos}
        onDeletePhoto={onDeletePhoto}
        onViewPhoto={onViewPhoto}
        onDeleteAudio={onDeleteAudio}
        onRetranscribe={onHandleRetranscribe}
        onUpdateContent={onUpdateNoteContent}
        onRefreshNotes={onRefreshNotes}
      />
      
      <SaveIndicator saving={saving} savedAt={savedAt} />
    </div>
  )
}
