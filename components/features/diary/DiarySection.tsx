/**
 * components/features/diary/DiarySection.tsx
 * Self-contained diary section on the home page.
 * Uses useJournalEntries hook (same as Journal page) for full feature parity:
 * - Types/Templates loaded from API
 * - DynamicJournalForm behind toggle button
 * - JournalEntryCard with expanded mode, tasks, modals
 * - Inline editing via EditModeWrapper pattern
 * - PipelineStepModal for AI pipeline step selection
 * Refactored in Phase 6 to replace legacy DiaryEntriesAccordion.
 */
'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { IconPlus, IconX, IconLoader2 } from '@tabler/icons-react'
import { TablerIcon } from '@/components/ui/TablerIcon'
import { DynamicJournalForm } from '@/components/features/journal/DynamicJournalForm'
import type { DynamicJournalFormHandle } from '@/components/features/journal/DynamicJournalForm'
import { JournalEntryCard } from '@/components/features/journal/JournalEntryCard'
import { PhotoLightbox } from '@/components/features/journal/PhotoLightbox'
import { ShareEntryModal } from '@/components/shared/ShareEntryModal'
import { TimestampModal } from '@/components/features/day/TimestampModal'
import { AISettingsPopup } from '@/components/features/ai/AISettingsPopup'
import { PipelineStepModal } from '@/components/features/journal/PipelineStepModal'
import type { PipelineStepId } from '@/components/features/journal/PipelineStepModal'
import { OCRSourcePanel } from '@/components/features/ocr/OCRSourcePanel'
import JournalTasksPanel from '@/components/features/tasks/JournalTasksPanel'
import DiaryInteractionPanel from './DiaryInteractionPanel'
import { useJournalEntries } from '@/hooks/useJournalEntries'
import { useReadMode } from '@/hooks/useReadMode'
import type { EntryWithRelations } from '@/lib/services/journal/types'
import type { TaskCardData } from '@/components/features/tasks/TaskCard'
import type { TemplateField, TemplateAIConfig } from '@/types/journal'

// ─── Types ───────────────────────────────────────────────────────────────────

interface JournalEntryType {
  id: string
  code: string
  name: string
  icon: string | null
}

interface JournalTemplate {
  id: string
  name: string
  fields: TemplateField[] | null
  aiConfig: TemplateAIConfig | null
  typeId: string | null
}

interface DiarySectionProps {
  date: string
  timeBoxId?: string
  /** Toast callback from parent (optional) */
  onToast?: (message: string, type: 'success' | 'error') => void
}

// ─── Edit Mode Wrapper (same pattern as Journal page) ────────────────────────

interface EditModeWrapperProps {
  entry: EntryWithRelations
  types: JournalEntryType[]
  templates: JournalTemplate[]
  today: string
  isSubmitting: boolean
  tasks?: TaskCardData[]
  onSubmit: (data: {
    typeId: string
    templateId: string | null
    content: string
    fieldValues: Record<string, string>
    title?: string
    isSensitive?: boolean
    audioFileIds?: string[]
    audioTranscripts?: Record<string, { transcript: string; model: string }>
    updatedTranscripts?: Record<string, { transcript: string; transcriptModel: string }>
    ocrAssetIds?: string[]
    photoAssetIds?: string[]
  }) => void
  onCancel: () => void
  onSaveAndRunPipeline?: (data: EditModeWrapperProps['onSubmit'] extends (data: infer D) => void ? D : never) => void
  onTasksChange: () => void
  onToast?: (message: string, type: 'success' | 'error') => void
}

function EditModeWrapper({ entry, types, templates, today, isSubmitting, tasks, onSubmit, onCancel, onSaveAndRunPipeline, onTasksChange, onToast }: EditModeWrapperProps) {
  const formRef = useRef<DynamicJournalFormHandle>(null)

  const hasOCRSources = useMemo(
    () => entry.mediaAttachments.some(
      (a) => a.role === 'SOURCE' && !a.asset.mimeType?.startsWith('audio/')
    ),
    [entry.mediaAttachments]
  )

  const handleRestoreToContent = useCallback((text: string) => {
    formRef.current?.appendToContent(text)
  }, [])

  return (
    <div className="rounded-lg border border-primary/30 bg-base-100 p-4 space-y-4">
      <DynamicJournalForm
        ref={formRef}
        types={types}
        templates={templates}
        existingEntry={entry}
        existingEntryId={entry.id}
        initialTypeId={entry.type?.id}
        initialTemplateId={entry.templateId || undefined}
        initialContent={entry.content}
        onSubmit={onSubmit}
        onCancel={onCancel}
        onSaveAndRunPipeline={onSaveAndRunPipeline}
        isSubmitting={isSubmitting}
        date={today}
        onToast={onToast}
      />
      {hasOCRSources && (
        <OCRSourcePanel
          noteId={entry.id}
          initialTranscript={entry.content}
          onRestoreToContent={handleRestoreToContent}
        />
      )}
      <JournalTasksPanel
        journalEntryId={entry.id}
        tasks={tasks || []}
        onTasksChange={onTasksChange}
      />
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function DiarySection({ date, timeBoxId, onToast }: DiarySectionProps) {
  const { readMode } = useReadMode()

  // ── Metadata (types + templates from API, same as Journal page) ──
  const [types, setTypes] = useState<JournalEntryType[]>([])
  const [templates, setTemplates] = useState<JournalTemplate[]>([])

  useEffect(() => {
    async function loadMetadata() {
      try {
        const [typesRes, templatesRes] = await Promise.all([
          fetch('/api/journal-entry-types'),
          fetch('/api/templates'),
        ])
        if (typesRes.ok) {
          const data = await typesRes.json()
          setTypes(data.types || [])
        }
        if (templatesRes.ok) {
          const data = await templatesRes.json()
          setTemplates(data.templates || [])
        }
      } catch (err) {
        console.error('Failed to load metadata:', err)
      }
    }
    void loadMetadata()
  }, [])

  // ── Journal entries via unified hook (filtered by timeBoxId) ──
  const {
    entries,
    isLoading,
    createEntry,
    deleteEntry,
    refetch,
  } = useJournalEntries({
    timeBoxId: timeBoxId,
    limit: 100,
    autoFetch: Boolean(timeBoxId),
  })

  // Filter to diary-type entries only
  const diaryEntries = useMemo(
    () => entries.filter(e => e.type?.code === 'diary'),
    [entries]
  )

  // ── Form toggle state ──
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // ── Inline edit state ──
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null)

  // ── Photo lightbox ──
  const [lightboxPhoto, setLightboxPhoto] = useState<{ url: string; alt?: string } | null>(null)

  // ── Modal states (Share, Timestamp, AISettings, Pipeline) ──
  const [shareModalEntryId, setShareModalEntryId] = useState<string | null>(null)
  const [timestampModalEntry, setTimestampModalEntry] = useState<EntryWithRelations | null>(null)
  const [aiSettingsEntry, setAiSettingsEntry] = useState<EntryWithRelations | null>(null)
  const [pipelineModalEntryId, setPipelineModalEntryId] = useState<string | null>(null)
  const [pipelineRunning, setPipelineRunning] = useState(false)
  const [pipelineRunningId, setPipelineRunningId] = useState<string | null>(null)

  // ── Tasks per entry ──
  const [tasksMap, setTasksMap] = useState<Record<string, TaskCardData[]>>({})
  const [tasksLoadingSet, setTasksLoadingSet] = useState<Set<string>>(new Set())

  const loadTasksForEntry = useCallback(async (entryId: string) => {
    if (tasksMap[entryId] !== undefined || tasksLoadingSet.has(entryId)) return
    setTasksLoadingSet((prev) => new Set(prev).add(entryId))
    try {
      const res = await fetch(`/api/journal-entries/${entryId}/tasks`)
      if (res.ok) {
        const data = await res.json()
        setTasksMap((prev) => ({ ...prev, [entryId]: data.tasks || [] }))
      } else {
        setTasksMap((prev) => ({ ...prev, [entryId]: [] }))
      }
    } catch {
      setTasksMap((prev) => ({ ...prev, [entryId]: [] }))
    } finally {
      setTasksLoadingSet((prev) => {
        const next = new Set(prev)
        next.delete(entryId)
        return next
      })
    }
  }, [tasksMap, tasksLoadingSet])

  const refetchTasksForEntry = useCallback(async (entryId: string) => {
    try {
      const res = await fetch(`/api/journal-entries/${entryId}/tasks`)
      if (res.ok) {
        const data = await res.json()
        setTasksMap((prev) => ({ ...prev, [entryId]: data.tasks || [] }))
      }
    } catch (err) {
      console.error('Failed to refetch tasks:', err)
    }
  }, [])

  // Load tasks for visible entries
  useEffect(() => {
    for (const entry of diaryEntries) {
      void loadTasksForEntry(entry.id)
    }
  }, [diaryEntries, loadTasksForEntry])

  // ── Handlers ──

  /** Create new entry via unified API */
  const handleFormSubmit = useCallback(async (data: {
    typeId: string
    templateId: string | null
    content: string
    fieldValues: Record<string, string>
    title?: string
    isSensitive?: boolean
    occurredAt?: string
    audioFileIds?: string[]
    audioTranscripts?: Record<string, { transcript: string; model: string }>
    ocrAssetIds?: string[]
    photoAssetIds?: string[]
  }) => {
    setIsSubmitting(true)
    try {
      const result = await createEntry({
        typeId: data.typeId,
        templateId: data.templateId || undefined,
        content: data.content,
        title: data.title,
        isSensitive: data.isSensitive,
        timeBoxId,
        occurredAt: data.occurredAt ? new Date(data.occurredAt) : undefined,
      })

      if (result) {
        // Attach audio files
        if (data.audioFileIds && data.audioFileIds.length > 0) {
          for (const assetId of data.audioFileIds) {
            const audioData = data.audioTranscripts?.[assetId]
            try {
              await fetch(`/api/journal-entries/${result.id}/media`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  assetId,
                  role: 'SOURCE',
                  transcript: audioData?.transcript || null,
                  transcriptModel: audioData?.model || null,
                }),
              })
            } catch (err) {
              console.error('Failed to attach audio:', err)
            }
          }
        }

        // Attach OCR assets
        if (data.ocrAssetIds && data.ocrAssetIds.length > 0) {
          for (const assetId of data.ocrAssetIds) {
            try {
              await fetch(`/api/journal-entries/${result.id}/media`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ assetId, role: 'SOURCE' }),
              })
            } catch (err) {
              console.error('Failed to attach OCR asset:', err)
            }
          }
        }

        // Attach photo assets
        if (data.photoAssetIds && data.photoAssetIds.length > 0) {
          for (const assetId of data.photoAssetIds) {
            try {
              await fetch(`/api/journal-entries/${result.id}/media`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ assetId, role: 'GALLERY' }),
              })
            } catch (err) {
              console.error('Failed to attach photo:', err)
            }
          }
        }

        // Refetch if media was attached
        if (
          (data.audioFileIds?.length) ||
          (data.ocrAssetIds?.length) ||
          (data.photoAssetIds?.length)
        ) {
          await refetch()
        }

        setIsFormOpen(false)
        onToast?.('Eintrag erstellt', 'success')
      }
    } catch (err) {
      console.error('Failed to create entry:', err)
      onToast?.('Fehler beim Erstellen', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }, [createEntry, timeBoxId, refetch, onToast])

  /** Create entry and open pipeline modal */
  const handleFormSubmitAndPipeline = useCallback(async (data: Parameters<typeof handleFormSubmit>[0]) => {
    setIsSubmitting(true)
    try {
      const result = await createEntry({
        typeId: data.typeId,
        templateId: data.templateId || undefined,
        content: data.content,
        title: data.title,
        isSensitive: data.isSensitive,
        timeBoxId,
        occurredAt: data.occurredAt ? new Date(data.occurredAt) : undefined,
      })
      if (result) {
        setIsFormOpen(false)
        onToast?.('Eintrag erstellt', 'success')
        setPipelineModalEntryId(result.id)
      }
    } catch (err) {
      console.error('Create+Pipeline failed:', err)
      onToast?.('Fehler', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }, [createEntry, timeBoxId, onToast])

  /** Edit submit via PATCH */
  const handleEditSubmit = useCallback(async (entryId: string, data: {
    typeId: string
    templateId: string | null
    content: string
    fieldValues: Record<string, string>
    title?: string
    isSensitive?: boolean
    occurredAt?: string
    capturedAt?: string | null
    updatedTranscripts?: Record<string, { transcript: string; transcriptModel: string }>
  }) => {
    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/journal-entries/${entryId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: data.content,
          title: data.title || null,
          isSensitive: data.isSensitive,
          occurredAt: data.occurredAt,
          capturedAt: data.capturedAt,
        }),
      })
      if (!res.ok) throw new Error('Update fehlgeschlagen')

      // Update transcripts if changed
      if (data.updatedTranscripts) {
        for (const [attachmentId, { transcript, transcriptModel }] of Object.entries(data.updatedTranscripts)) {
          try {
            await fetch(`/api/journal-entries/${entryId}/media/${attachmentId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ transcript, transcriptModel }),
            })
          } catch (err) {
            console.error('Failed to update transcript:', attachmentId, err)
          }
        }
      }

      setEditingEntryId(null)
      await refetch()
      onToast?.('Eintrag aktualisiert', 'success')
    } catch (err) {
      console.error('Failed to update entry:', err)
      onToast?.('Fehler beim Aktualisieren', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }, [refetch, onToast])

  /** Edit + open pipeline modal */
  const handleEditSubmitAndPipeline = useCallback(async (entryId: string, data: Parameters<typeof handleEditSubmit>[1]) => {
    await handleEditSubmit(entryId, data)
    setPipelineModalEntryId(entryId)
  }, [handleEditSubmit])

  /** Delete entry with confirmation */
  const handleDeleteEntry = useCallback(async (entryId: string) => {
    if (!confirm('Eintrag wirklich löschen?')) return
    await deleteEntry(entryId)
    onToast?.('Eintrag gelöscht', 'success')
  }, [deleteEntry, onToast])

  /** Open pipeline modal (from card sparkle icon) */
  const handleRunPipeline = useCallback((entryId: string) => {
    setPipelineModalEntryId(entryId)
  }, [])

  /** Execute pipeline with user-selected steps */
  const executePipelineWithSteps = useCallback(async (steps: PipelineStepId[]) => {
    if (!pipelineModalEntryId) return
    const entryId = pipelineModalEntryId
    setPipelineRunning(true)
    setPipelineRunningId(entryId)
    try {
      const response = await fetch('/api/journal-ai/pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ journalEntryId: entryId, steps }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'AI-Pipeline fehlgeschlagen')
      }
      const failedSteps = data.steps?.filter((s: { success: boolean }) => !s.success) || []
      await refetch()
      setPipelineModalEntryId(null)
      if (failedSteps.length === 0) {
        onToast?.('KI-Pipeline abgeschlossen', 'success')
      } else {
        onToast?.(`KI-Pipeline: ${data.steps.length - failedSteps.length}/${data.steps.length} Schritte erfolgreich`, 'success')
      }
    } catch (err) {
      console.error('Pipeline failed:', err)
      onToast?.(err instanceof Error ? err.message : 'KI-Pipeline fehlgeschlagen', 'error')
    } finally {
      setPipelineRunning(false)
      setPipelineRunningId(null)
    }
  }, [pipelineModalEntryId, refetch, onToast])

  /** Photo view for lightbox */
  const handleViewPhoto = useCallback((attachmentId: string, imageUrl: string) => {
    const fullUrl = imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`
    setLightboxPhoto({ url: fullUrl, alt: `Foto ${attachmentId}` })
  }, [])

  /** Timestamp save */
  const handleTimestampSave = useCallback(async (
    occurredAt: string,
    capturedAt: string,
  ) => {
    if (!timestampModalEntry) return
    try {
      const res = await fetch(`/api/journal-entries/${timestampModalEntry.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ occurredAt, capturedAt }),
      })
      if (!res.ok) throw new Error('Fehler beim Speichern')
      onToast?.('Zeitpunkte aktualisiert', 'success')
      await refetch()
    } catch (err) {
      console.error('Failed to save timestamps:', err)
      onToast?.('Fehler beim Speichern der Zeitpunkte', 'error')
      throw err
    }
  }, [timestampModalEntry, onToast, refetch])

  /** Access change from ShareEntryModal */
  const handleAccessChange = useCallback(async () => {
    await refetch()
  }, [refetch])

  // ── Render ──

  return (
    <div className="card p-4 md:p-4 p-2 space-y-3">
      {/* Header with toggle button */}
      <div className="flex items-center justify-between">
        <h2 className="font-medium">
          <span className="inline-flex items-center gap-1">
            <TablerIcon name="edit_note" size={20} />
            <span>Tagebuch</span>
          </span>
        </h2>

        {!readMode && (
          <button
            onClick={() => setIsFormOpen(!isFormOpen)}
            className="btn btn-primary btn-sm gap-1"
          >
            {isFormOpen ? (
              <>
                <IconX className="h-4 w-4" />
                Schliessen
              </>
            ) : (
              <>
                <IconPlus className="h-4 w-4" />
                Neuer Eintrag
              </>
            )}
          </button>
        )}
      </div>

      {/* New entry form – behind toggle, hidden in read mode */}
      {!readMode && isFormOpen && types.length > 0 && (
        <div className="rounded-lg border border-base-300 bg-base-100 p-4">
          <DynamicJournalForm
            types={types}
            templates={templates}
            onSubmit={handleFormSubmit}
            onSaveAndRunPipeline={handleFormSubmitAndPipeline}
            isSubmitting={isSubmitting}
            showMediaButtons={true}
            date={date}
            onToast={onToast}
          />
        </div>
      )}

      {/* Interaction panel for linking contacts – hidden in read mode */}
      {!readMode && (
        <DiaryInteractionPanel
          date={date}
          timeBoxId={timeBoxId}
          onInteractionAdded={() => {}}
        />
      )}

      {/* Loading state */}
      {isLoading && diaryEntries.length === 0 && (
        <div className="flex justify-center py-8">
          <IconLoader2 className="h-6 w-6 animate-spin text-base-content/40" />
        </div>
      )}

      {/* Existing diary entries */}
      <div className="space-y-4 mt-4">
        {diaryEntries.map((entry) =>
          editingEntryId === entry.id ? (
            <EditModeWrapper
              key={entry.id}
              entry={entry}
              types={types}
              templates={templates}
              today={date}
              isSubmitting={isSubmitting}
              tasks={tasksMap[entry.id]}
              onSubmit={(data) => handleEditSubmit(entry.id, data)}
              onSaveAndRunPipeline={(data) => handleEditSubmitAndPipeline(entry.id, data)}
              onCancel={() => setEditingEntryId(null)}
              onTasksChange={() => refetchTasksForEntry(entry.id)}
              onToast={onToast}
            />
          ) : (
            <JournalEntryCard
              key={entry.id}
              entry={entry}
              mode="expanded"
              onEdit={() => setEditingEntryId(entry.id)}
              onDelete={() => handleDeleteEntry(entry.id)}
              onRunPipeline={() => handleRunPipeline(entry.id)}
              pipelineRunning={pipelineRunningId === entry.id}
              onViewPhoto={handleViewPhoto}
              tasks={tasksMap[entry.id]}
              onTasksChange={() => refetchTasksForEntry(entry.id)}
              isShared={entry.accessCount > 0}
              sharedWithCount={entry.accessCount}
              onOpenShareModal={() => setShareModalEntryId(entry.id)}
              onOpenTimestampModal={() => setTimestampModalEntry(entry)}
              onOpenAISettings={() => setAiSettingsEntry(entry)}
            />
          )
        )}
      </div>

      {/* Photo Lightbox */}
      <PhotoLightbox
        isOpen={lightboxPhoto !== null}
        onClose={() => setLightboxPhoto(null)}
        imageUrl={lightboxPhoto?.url || ''}
        alt={lightboxPhoto?.alt}
      />

      {/* Share Modal */}
      {shareModalEntryId && (
        <ShareEntryModal
          entryId={shareModalEntryId}
          isOpen={true}
          onClose={() => setShareModalEntryId(null)}
          onAccessChange={handleAccessChange}
        />
      )}

      {/* Timestamp Modal */}
      {timestampModalEntry && (
        <TimestampModal
          isOpen={true}
          onClose={() => setTimestampModalEntry(null)}
          onSave={handleTimestampSave}
          occurredAtIso={timestampModalEntry.occurredAt ? new Date(timestampModalEntry.occurredAt).toISOString() : undefined}
          capturedAtIso={timestampModalEntry.capturedAt ? new Date(timestampModalEntry.capturedAt).toISOString() : undefined}
        />
      )}

      {/* AI Settings Popup */}
      {aiSettingsEntry && aiSettingsEntry.type && (
        <AISettingsPopup
          isOpen={true}
          onClose={() => setAiSettingsEntry(null)}
          typeName={aiSettingsEntry.type.name}
          templateId={aiSettingsEntry.templateId}
          templateName={aiSettingsEntry.template?.name}
        />
      )}

      {/* Pipeline Step Selection Modal */}
      <PipelineStepModal
        isOpen={pipelineModalEntryId !== null}
        onClose={() => setPipelineModalEntryId(null)}
        onConfirm={executePipelineWithSteps}
        isRunning={pipelineRunning}
      />
    </div>
  )
}
