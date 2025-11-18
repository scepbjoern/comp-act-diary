import { Icon } from '@/components/Icon'
import { MicrophoneButton } from '@/components/MicrophoneButton'
import AudioUploadButton from '@/components/AudioUploadButton'
import { ImproveTextButton } from '@/components/ImproveTextButton'
import { RichTextEditor } from '@/components/RichTextEditor'
import { SaveIndicator } from '@/components/SaveIndicator'
import dynamic from 'next/dynamic'
import type { DayNote } from '@/types/day'

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
}: DiarySectionProps) {
  return (
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
            onChange={e => onNewDiaryTitleChange(e.target.value)}
            placeholder="Optional: Titel für Eintrag"
            className="flex-1 bg-background border border-slate-700 rounded px-2 py-1 text-sm"
          />
          <button
            className="btn btn-ghost btn-xs text-gray-300 hover:text-gray-100"
            onClick={onGenerateTitle}
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
              onEditorKeyIncrement()
            }}
            compact
          />
          
          <ImproveTextButton
            text={newDiaryText}
            onImprovedText={(t) => {
              onNewDiaryTextChange(t)
              onEditorKeyIncrement()
            }}
            onOriginalPreserved={onOriginalPreserved}
            className="text-gray-300 hover:text-gray-100"
          />
          
          <label className="flex items-center gap-1 text-xs text-gray-400 cursor-pointer">
            <input
              type="checkbox"
              checked={keepAudio}
              onChange={e => onKeepAudioChange(e.target.checked)}
              className="rounded"
            />
            Audio behalten
          </label>
          
          <button 
            className="pill !bg-blue-600 !text-white hover:!bg-blue-500"
            onClick={onSaveDiaryEntry}
            disabled={!newDiaryText.trim()}
          >
            Speichern
          </button>
          
          {(newDiaryText.trim() || newDiaryAudioFileId || newDiaryTime) && (
            <button 
              className="pill !bg-gray-600 !text-white hover:!bg-gray-500"
              onClick={onClearDiaryForm}
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
      />
      
      <SaveIndicator saving={saving} savedAt={savedAt} />
    </div>
  )
}
