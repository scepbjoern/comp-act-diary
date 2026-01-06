'use client'

import { useState } from 'react'
import { Icon } from '@/components/Icon'
import { MicrophoneButton } from '@/components/MicrophoneButton'
import { SaveIndicator } from '@/components/SaveIndicator'
import { MealNotesAccordion } from '@/components/MealNotesAccordion'
import { IconSparkles } from '@tabler/icons-react'
import type { DayNote } from '@/types/day'

interface MealNotesSectionProps {
  notes: DayNote[]
  editingNoteId: string | null
  editingText: string
  editingTime: string
  mealTime: string
  mealText: string
  saving: boolean
  savedAt: number | null
  onEdit: (note: DayNote) => void
  onSave: (noteId: string) => void
  onCancel: () => void
  onDelete: (noteId: string) => void
  onTextChange: (text: string) => void
  onTimeChange: (time: string) => void
  onUploadPhotos: (noteId: string, files: FileList | File[]) => void
  onDeletePhoto: (photoId: string) => void
  onViewPhoto: (noteId: string, index: number, url?: string) => void
  onMealTimeChange: (time: string) => void
  onMealTextChange: (text: string) => void
  onAddMealNote: () => void
}

export function MealNotesSection({
  notes,
  editingNoteId,
  editingText,
  editingTime,
  mealTime,
  mealText,
  saving,
  savedAt,
  onEdit,
  onSave,
  onCancel,
  onDelete,
  onTextChange,
  onTimeChange,
  onUploadPhotos,
  onDeletePhoto,
  onViewPhoto,
  onMealTimeChange,
  onMealTextChange,
  onAddMealNote,
}: MealNotesSectionProps) {
  const [isImproving, setIsImproving] = useState(false)

  const handleImproveText = async () => {
    if (!mealText.trim()) return
    setIsImproving(true)
    try {
      const response = await fetch('/api/journal-ai/generate-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: mealText, typeCode: 'meal' }),
      })
      const data = await response.json()
      if (response.ok && data.content) {
        onMealTextChange(data.content)
      }
    } catch (err) {
      console.error('Text improvement failed:', err)
    } finally {
      setIsImproving(false)
    }
  }
  return (
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
        onEdit={onEdit}
        onSave={onSave}
        onCancel={onCancel}
        onDelete={onDelete}
        onTextChange={onTextChange}
        onTimeChange={onTimeChange}
        onUploadPhotos={onUploadPhotos}
        onDeletePhoto={onDeletePhoto}
        onViewPhoto={onViewPhoto}
      />
      <div className="flex flex-col sm:flex-row items-stretch sm:items-start gap-2">
        <input 
          type="time" 
          value={mealTime} 
          onChange={e => onMealTimeChange(e.target.value)} 
          className="bg-background border border-slate-700 rounded px-2 py-1 text-sm w-full sm:w-auto" 
        />
        <textarea 
          value={mealText} 
          onChange={e => onMealTextChange(e.target.value)} 
          placeholder="Beschreibung…" 
          className="flex-1 bg-background border border-slate-700 rounded px-2 py-1 text-sm w-full" 
          rows={3} 
        />
        <div className="flex items-center gap-2">
          <MicrophoneButton
            onText={(t) => onMealTextChange(mealText ? (mealText + ' ' + t) : t)}
            className="text-gray-300 hover:text-gray-100 text-xs"
            compact
          />
          <button
            type="button"
            onClick={handleImproveText}
            disabled={isImproving || !mealText.trim()}
            title="Text mit KI verbessern"
            className="text-primary hover:text-primary/80 disabled:opacity-50"
          >
            {isImproving ? (
              <span className="loading loading-spinner loading-xs" />
            ) : (
              <IconSparkles size={16} />
            )}
          </button>
          <button 
            className="pill w-full sm:w-auto" 
            onClick={onAddMealNote} 
            disabled={!mealText.trim()}
          >
            Hinzufügen
          </button>
        </div>
      </div>
      <SaveIndicator saving={saving} savedAt={savedAt} />
    </div>
  )
}
