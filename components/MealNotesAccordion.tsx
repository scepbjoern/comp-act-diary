"use client"
import React from 'react'
import Image from 'next/image'
import { TablerIcon } from './TablerIcon'
import { MicrophoneButton } from './MicrophoneButton'
import { ImproveTextButton } from './ImproveTextButton'
import { CameraPicker } from './CameraPicker'
import { AudioPlayerH5 } from './AudioPlayerH5'

type Note = {
  id: string
  dayId: string
  type: 'MEAL' | 'REFLECTION' | 'DIARY'
  time?: string
  techTime?: string
  text: string
  originalTranscript?: string | null
  audioFilePath?: string | null
  keepAudio?: boolean
  photos?: { id: string; url: string }[]
  occurredAtIso?: string
  createdAtIso?: string
}

interface MealNotesAccordionProps {
  notes: Note[]
  editingNoteId: string | null
  editingText: string
  editingTime: string
  onEdit: (note: Note) => void
  onSave: (id: string) => void
  onCancel: () => void
  onDelete: (id: string) => void
  onTextChange: (text: string) => void
  onTimeChange: (time: string) => void
  onUploadPhotos: (id: string, files: FileList | File[]) => void
  onDeletePhoto: (id: string) => void
  onViewPhoto: (noteId: string, index: number) => void
}

export function MealNotesAccordion({
  notes,
  editingNoteId,
  editingText,
  editingTime,
  onEdit,
  onSave,
  onCancel,
  onDelete,
  onTextChange,
  onTimeChange,
  onUploadPhotos,
  onDeletePhoto,
  onViewPhoto
}: MealNotesAccordionProps) {
  const fmtHMLocal = (iso?: string) => {
    if (!iso) return ''
    const d = new Date(iso)
    return d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
  }

  const mealNotes = notes.filter(n => n.type === 'MEAL').sort((a, b) => 
    (a.occurredAtIso || '').localeCompare(b.occurredAtIso || '')
  )

  if (mealNotes.length === 0) {
    return <div className="text-sm text-gray-400">Noch keine Einträge.</div>
  }

  return (
    <div className="space-y-2">
      {mealNotes.map(n => (
        <div key={n.id} className="collapse collapse-arrow bg-base-200 border border-base-300">
          <input type="checkbox" />
          <div className="collapse-title text-sm font-medium py-2">
            <div className="flex items-center gap-2">
              <span className="text-gray-400">{fmtHMLocal(n.occurredAtIso)}</span>
              <span className="text-gray-300 truncate">
                {n.text}
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
              </div>
              
              {editingNoteId === n.id ? (
                <div className="space-y-2">
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
                    <textarea 
                      value={editingText} 
                      onChange={e => onTextChange(e.target.value)} 
                      className="w-full bg-background border border-slate-700 rounded p-2 text-xs leading-5" 
                      rows={3} 
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
                <div className="whitespace-pre-wrap text-xs leading-5">{n.text}</div>
              )}
              
              {/* Audio section */}
              {n.audioFilePath && (
                <div className="mt-2">
                  <AudioPlayerH5 
                    audioFilePath={n.audioFilePath} 
                    compact
                  />
                </div>
              )}
              
              {n.photos && n.photos.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {n.photos.map((p, idx) => (
                    <div key={p.id} className="relative group">
                      <Image 
                        src={`${p.url}?v=${p.id}`} 
                        alt="Foto" 
                        width={64}
                        height={64}
                        className="w-16 h-16 object-cover rounded border border-slate-700 cursor-zoom-in" 
                        onClick={() => onViewPhoto(n.id, idx)} 
                      />
                      <button 
                        className="btn btn-circle btn-error btn-xs absolute -top-2 -right-2 opacity-0 group-hover:opacity-100" 
                        title="Foto löschen" 
                        onClick={e => { e.stopPropagation(); e.preventDefault(); onDeletePhoto(p.id); }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
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
