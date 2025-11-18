"use client"
import React from 'react'
import { TablerIcon } from './TablerIcon'
import { MicrophoneButton } from './MicrophoneButton'
import { ImproveTextButton } from './ImproveTextButton'
import { CameraPicker } from './CameraPicker'
import { AudioPlayerH5 } from './AudioPlayerH5'
import { RetranscribeButton } from './RetranscribeButton'
import { RichTextEditor } from './RichTextEditor'
import { MarkdownRenderer } from './MarkdownRenderer'

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

interface DiaryEntriesAccordionProps {
  notes: DayNote[]
  editingNoteId: string | null
  editingText: string
  editingTime: string
  editingTitle: string
  onEdit: (note: DayNote) => void
  onSave: (id: string) => void
  onCancel: () => void
  onDelete: (id: string) => void
  onTextChange: (text: string) => void
  onTimeChange: (time: string) => void
  onTitleChange: (title: string) => void
  onUploadPhotos: (id: string, files: FileList | File[]) => void
  onDeletePhoto: (id: string) => void
  onViewPhoto: (noteId: string, index: number) => void
  onDeleteAudio?: (id: string) => void
  onRetranscribe?: (noteId: string, newText: string) => void
}

export function DiaryEntriesAccordion({
  notes,
  editingNoteId,
  editingText,
  editingTime,
  editingTitle,
  onEdit,
  onSave,
  onCancel,
  onDelete,
  onTextChange,
  onTimeChange,
  onTitleChange,
  onUploadPhotos,
  onDeletePhoto,
  onViewPhoto,
  onDeleteAudio,
  onRetranscribe
}: DiaryEntriesAccordionProps) {
  const fmtHMLocal = (iso?: string) => {
    if (!iso) return ''
    const d = new Date(iso)
    return d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
  }

  // Extract image URLs from markdown text
  const extractImageUrls = (text: string): string[] => {
    const imageRegex = /!\[.*?\]\((.*?)\)/g
    const urls: string[] = []
    let match
    while ((match = imageRegex.exec(text)) !== null) {
      urls.push(match[1])
    }
    return urls
  }

  const diaryNotes = notes.filter(n => n.type === 'DIARY').sort((a, b) => 
    (b.occurredAtIso || '').localeCompare(a.occurredAtIso || '')
  )

  if (diaryNotes.length === 0) {
    return <div className="text-sm text-gray-400">Noch keine Tagebucheinträge.</div>
  }

  return (
    <div className="space-y-2">
      {diaryNotes.map(n => (
        <div key={n.id} className="collapse collapse-arrow bg-base-200 border border-base-300">
          <input type="checkbox" />
          <div className="collapse-title text-sm font-medium py-2">
            <div className="flex items-center gap-2">
              <span className="text-gray-400">{fmtHMLocal(n.occurredAtIso)}</span>
              <span className="text-gray-300 truncate">
                {n.title || n.text.substring(0, 100) || 'Tagebucheintrag'}
              </span>
            </div>
          </div>
          <div className="collapse-content">
            <div className="pt-2 space-y-2 text-sm">
              {/* Action buttons */}
              <div className="flex items-center gap-2 pb-2 border-b border-slate-700">
                {editingNoteId === n.id ? (
                  <>
                    <button 
                      className="btn btn-success btn-xs" 
                      onClick={() => onSave(n.id)}
                    >
                      Speichern
                    </button>
                    <button 
                      className="btn btn-ghost btn-xs" 
                      onClick={onCancel}
                    >
                      Abbrechen
                    </button>
                  </>
                ) : (
                  <>
                    <button 
                      className="btn btn-ghost btn-xs" 
                      title="Bearbeiten" 
                      onClick={() => onEdit(n)}
                    >
                      <TablerIcon name="edit_note" size={14} />
                      <span className="ml-1">Bearbeiten</span>
                    </button>
                    <button 
                      className="btn btn-ghost btn-xs text-red-400" 
                      title="Löschen" 
                      onClick={() => onDelete(n.id)}
                    >
                      <TablerIcon name="delete" size={14} />
                      <span className="ml-1">Löschen</span>
                    </button>
                  </>
                )}
                
                {/* Re-transcribe button for audio entries */}
                {n.audioFileId && onRetranscribe && (
                  <>
                    {/* Debug: Show audioFileId */}
                    <div className="text-xs text-gray-500">Audio: {n.audioFileId.substring(0, 8)}...</div>
                    <RetranscribeButton
                      audioFileId={n.audioFileId}
                      onRetranscribed={(newText) => onRetranscribe(n.id, newText)}
                      disabled={editingNoteId === n.id}
                    />
                  </>
                )}
              </div>
              
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
                    <button
                      className="btn btn-ghost btn-xs text-gray-300 hover:text-gray-100"
                      onClick={async () => {
                        if (!editingText.trim()) return
                        try {
                          const res = await fetch('/api/generate-title', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ text: editingText, model: 'gpt-4o-mini' })
                          })
                          const data = await res.json()
                          if (data.title) onTitleChange(data.title)
                        } catch (e) {
                          console.error('Title generation failed', e)
                        }
                      }}
                      title="Titel mit KI generieren"
                    >
                      ✨
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">Zeit</span>
                    <input 
                      type="time" 
                      value={editingTime} 
                      onChange={e => onTimeChange(e.target.value)} 
                      className="bg-background border border-slate-700 rounded px-2 py-1 text-xs" 
                    />
                  </div>
                  <div className="space-y-1">
                    <RichTextEditor
                      markdown={editingText}
                      onChange={onTextChange}
                      placeholder="Tagebucheintrag bearbeiten..."
                    />
                    <div className="flex items-center gap-2">
                      <MicrophoneButton
                        onText={(t) => onTextChange(editingText ? (editingText + ' ' + t) : t)}
                        className="text-gray-300 hover:text-gray-100 text-xs"
                        compact
                      />
                      <ImproveTextButton
                        text={editingText}
                        onImprovedText={(t) => onTextChange(t)}
                        className="text-gray-300 hover:text-gray-100 text-xs"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <MarkdownRenderer markdown={n.text} />
              )}
              
              {/* Audio section */}
              {n.audioFilePath && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <TablerIcon name="microphone" size={12} />
                      Audio-Aufnahme
                    </span>
                    <button 
                      className="btn btn-ghost btn-xs text-red-400 hover:text-red-300"
                      onClick={(e) => { e.stopPropagation(); e.preventDefault(); onDeleteAudio?.(n.id); }}
                      title="Audio löschen"
                    >
                      <TablerIcon name="delete" size={12} />
                      Audio löschen
                    </button>
                  </div>
                  <AudioPlayerH5 
                    audioFilePath={n.audioFilePath} 
                    compact
                  />
                </div>
              )}
              
              {/* Original transcript */}
              {n.originalTranscript && (
                <details className="text-xs">
                  <summary className="cursor-pointer text-gray-400 hover:text-gray-300">
                    Original-Transkript anzeigen
                  </summary>
                  <div className="mt-1 p-2 rounded bg-slate-900/50 text-gray-200 whitespace-pre-wrap">
                    {n.originalTranscript}
                  </div>
                </details>
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
                    {allImages.map((img, idx) => (
                      <div key={idx} className="relative group">
                        {img.type === 'uploaded' ? (
                          <>
                            <img 
                              src={`${img.data.url}?v=${img.data.id}`} 
                              alt="Foto" 
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
                          <img 
                            src={img.url} 
                            alt="Markdown Bild" 
                            className="w-16 h-16 object-cover rounded border border-blue-500/50 cursor-zoom-in" 
                            onClick={() => onViewPhoto(n.id, img.index)}
                            title="Aus Markdown"
                          />
                        )}
                      </div>
                    ))}
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
      ))}
    </div>
  )
}
