'use client'

import { Icon } from '@/components/ui/Icon'
import { DaySettings } from '@/components/features/day/DaySettings'
import { SymptomsSection } from '@/components/features/symptoms/SymptomsSection'
import { StoolSection } from '@/components/features/symptoms/StoolSection'
import { WeightSection } from '@/components/features/symptoms/WeightSection'
import { HabitsSection } from '@/components/features/habits/HabitsSection'
import { MealNotesSection } from '@/components/features/meals/MealNotesSection'
import type { Day, Habit, DayNote, InlineData } from '@/types/day'
import { useReadMode } from '@/hooks/useReadMode'

interface DarmkurSectionProps {
  day: Day
  habits: Habit[]
  notes: DayNote[]
  symptomIcons: Record<string, string | null>
  draftSymptoms: Record<string, number | undefined>
  draftUserSymptoms: Record<string, number | undefined>
  clearedSymptoms: Set<string>
  clearedUserSymptoms: Set<string>
  inlineData: InlineData | null
  darmkurCollapsed: boolean
  mealTime: string
  mealText: string
  editingNoteId: string | null
  editingText: string
  editingTime: string
  saving: boolean
  savedAt: number | null
  onToggleCollapse: () => void
  onUpdateDayMeta: (patch: { dayRating?: number | null }) => void
  onSetDraftSymptom: (type: string, score: number) => void
  onSetDraftUserSymptom: (id: string, score: number) => void
  onClearDraftSymptom: (type: string) => void
  onClearDraftUserSymptom: (id: string) => void
  onUpdateStool: (bristol: number) => void
  onToggleHabit: (habitId: string, checked: boolean) => void
  onStartEditNote: (note: DayNote) => void
  onSaveEditNote: (noteId: string) => void
  onCancelEditNote: () => void
  onDeleteNote: (noteId: string) => void
  onEditingTextChange: (text: string) => void
  onEditingTimeChange: (time: string) => void
  onUploadPhotos: (noteId: string, files: FileList | File[]) => void
  onDeletePhoto: (photoId: string) => void
  onViewPhoto: (noteId: string, index: number, url?: string) => void
  onMealTimeChange: (time: string) => void
  onMealTextChange: (text: string) => void
  onAddMealNote: () => void
}

export function DarmkurSection({
  day,
  habits,
  notes,
  symptomIcons,
  draftSymptoms,
  draftUserSymptoms,
  clearedSymptoms,
  clearedUserSymptoms,
  inlineData,
  darmkurCollapsed,
  mealTime,
  mealText,
  editingNoteId,
  editingText,
  editingTime,
  saving,
  savedAt,
  onToggleCollapse,
  onUpdateDayMeta,
  onSetDraftSymptom,
  onSetDraftUserSymptom,
  onClearDraftSymptom,
  onClearDraftUserSymptom,
  onUpdateStool,
  onToggleHabit,
  onStartEditNote,
  onSaveEditNote,
  onCancelEditNote,
  onDeleteNote,
  onEditingTextChange,
  onEditingTimeChange,
  onUploadPhotos,
  onDeletePhoto,
  onViewPhoto,
  onMealTimeChange,
  onMealTextChange,
  onAddMealNote,
}: DarmkurSectionProps) {
  const { readMode } = useReadMode()

  // Hide entire section in read mode
  if (readMode) return null

  return (
    <div className="card p-4 space-y-3">
      <button 
        className="w-full flex items-center justify-between font-medium text-left"
        onClick={onToggleCollapse}
      >
        <span className="inline-flex items-center gap-1">
          <Icon name="spa" />
          <span>Darmkur-Tagebuch</span>
        </span>
        <span className="text-gray-400">{darmkurCollapsed ? '▾' : '▴'}</span>
      </button>
      
      {!darmkurCollapsed && (
        <div className="space-y-6 pt-3">
          <DaySettings 
            day={day} 
            onUpdateMeta={onUpdateDayMeta} 
            saving={saving} 
            savedAt={savedAt} 
          />

          <SymptomsSection
            day={day}
            symptomIcons={symptomIcons}
            draftSymptoms={draftSymptoms}
            draftUserSymptoms={draftUserSymptoms}
            clearedSymptoms={clearedSymptoms}
            clearedUserSymptoms={clearedUserSymptoms}
            inlineData={inlineData}
            onSetDraftSymptom={onSetDraftSymptom}
            onSetDraftUserSymptom={onSetDraftUserSymptom}
            onClearDraftSymptom={onClearDraftSymptom}
            onClearDraftUserSymptom={onClearDraftUserSymptom}
          />

          <StoolSection 
            day={day} 
            inlineData={inlineData} 
            onUpdateStool={onUpdateStool} 
          />

          <WeightSection day={day} />

          <HabitsSection 
            day={day} 
            habits={habits} 
            inlineData={inlineData} 
            onToggleHabit={onToggleHabit} 
          />

          <MealNotesSection
            notes={notes}
            editingNoteId={editingNoteId}
            editingText={editingText}
            editingTime={editingTime}
            mealTime={mealTime}
            mealText={mealText}
            saving={saving}
            savedAt={savedAt}
            onEdit={onStartEditNote}
            onSave={onSaveEditNote}
            onCancel={onCancelEditNote}
            onDelete={onDeleteNote}
            onTextChange={onEditingTextChange}
            onTimeChange={onEditingTimeChange}
            onUploadPhotos={onUploadPhotos}
            onDeletePhoto={onDeletePhoto}
            onViewPhoto={onViewPhoto}
            onMealTimeChange={onMealTimeChange}
            onMealTextChange={onMealTextChange}
            onAddMealNote={onAddMealNote}
          />
        </div>
      )}
    </div>
  )
}
