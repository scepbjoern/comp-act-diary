/**
 * components/features/diary/DiarySection.tsx
 * Diary section on the home page. Uses DynamicJournalForm for new entries
 * and JournalEntryCard for displaying existing diary entries.
 * Refactored in Phase 6 to replace legacy DiaryEntriesAccordion.
 */
'use client'

import { TablerIcon } from '@/components/ui/TablerIcon'
import { DynamicJournalForm } from '@/components/features/journal/DynamicJournalForm'
import { JournalEntryCard } from '@/components/features/journal/JournalEntryCard'
import DiaryInteractionPanel from './DiaryInteractionPanel'
import { useReadMode } from '@/hooks/useReadMode'
import type { DayNote } from '@/types/day'

interface DiarySectionProps {
  date: string
  timeBoxId?: string
  notes: DayNote[]
  onClearDiaryForm: () => void
  onStartEditNote: (note: DayNote) => void
  onDeleteNote: (noteId: string) => void
  onUploadPhotos: (noteId: string, files: FileList | File[]) => void
  onDeletePhoto: (photoId: string) => void
  onViewPhoto: (noteId: string, index: number, url?: string) => void
  onRefreshNotes?: () => Promise<void>
}

export function DiarySection({
  date,
  timeBoxId,
  notes,
  onClearDiaryForm,
  onStartEditNote,
  onDeleteNote,
  onUploadPhotos,
  onDeletePhoto,
  onViewPhoto,
  onRefreshNotes,
}: DiarySectionProps) {
  const { readMode } = useReadMode()

  return (
    <div className="card p-4 md:p-4 p-2 space-y-3">
      <h2 className="font-medium">
        <span className="inline-flex items-center gap-1">
          <TablerIcon name="edit_note" size={20} />
          <span>Tagebuch</span>
        </span>
      </h2>

      {/* New diary entry form – hidden in read mode */}
      {!readMode && (
        <DynamicJournalForm
        types={[
          { id: 'diary', code: 'diary', name: 'Tagebuch', icon: '📝' }
        ]}
        templates={[]}
        initialTypeId="diary"
        date={date}
        onSubmit={async (entryData) => {
          try {
            const res = await fetch(`/api/day/${notes[0]?.dayId || timeBoxId}/notes`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: 'DIARY',
                title: entryData.title || null,
                text: entryData.content || '',
                occurredAt: entryData.occurredAt,
                capturedAt: entryData.capturedAt,
                tzOffsetMinutes: new Date().getTimezoneOffset(),
              }),
              credentials: 'same-origin',
            })
            
            if (res.ok) {
              onClearDiaryForm()
              await onRefreshNotes?.()
            } else {
              console.error('Failed to save diary entry via form')
            }
          } catch (err) {
            console.error('Error saving diary entry:', err)
          }
        }}
        />
      )}

      {/* Interaction panel for linking contacts – hidden in read mode */}
      {!readMode && (
        <DiaryInteractionPanel
          date={date}
          timeBoxId={timeBoxId}
          onInteractionAdded={() => {}}
        />
      )}

      {/* Existing diary entries */}
      <div className="space-y-4 mt-6">
        {notes.filter(n => n.type === 'DIARY').map(note => (
          <JournalEntryCard
            key={note.id}
            entry={note as any}
            mode="compact"
            isEditing={false}
            onEdit={() => onStartEditNote(note)}
            onDelete={onDeleteNote}
            onRunPipeline={async () => {
              try {
                await fetch('/api/journal-ai/pipeline', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ journalEntryId: note.id }),
                })
                void onRefreshNotes?.()
              } catch (e) {
                console.error('Pipeline failed', e)
              }
            }}
            onViewPhoto={(attachmentId, url) => onViewPhoto(note.id, 0, url)}
            onUploadPhotos={(id, files) => onUploadPhotos(id, files)}
            onDeletePhoto={onDeletePhoto}
          />
        ))}
      </div>
    </div>
  )
}
