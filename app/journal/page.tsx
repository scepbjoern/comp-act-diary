/**
 * app/journal/page.tsx
 * Journal overview page - displays entries by type/template with filtering.
 * Uses the unified JournalService via /api/journal-entries.
 * Integrates DynamicJournalForm for full-featured entry creation.
 * Phase 2+3: Panels (OCR, Tasks) and Modals (Share, Timestamp, AISettings).
 */

'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import {
  IconPlus,
  IconFilter,
  IconChevronDown,
  IconBook2,
  IconLoader2,
  IconX,
} from '@tabler/icons-react'
import { JournalEntryCard } from '@/components/features/journal'
import { DynamicJournalForm } from '@/components/features/journal/DynamicJournalForm'
import type { DynamicJournalFormHandle } from '@/components/features/journal/DynamicJournalForm'
import { OCRSourcePanel } from '@/components/features/ocr/OCRSourcePanel'
import JournalTasksPanel from '@/components/features/tasks/JournalTasksPanel'
import { PhotoLightbox } from '@/components/features/journal/PhotoLightbox'
import { ShareEntryModal } from '@/components/features/diary/ShareEntryModal'
import { TimestampModal } from '@/components/features/day/TimestampModal'
import { AISettingsPopup } from '@/components/features/ai/AISettingsPopup'
import { useJournalEntries } from '@/hooks/useJournalEntries'
import type { EntryWithRelations } from '@/lib/services/journal/types'
import type { TaskCardData } from '@/components/features/tasks/TaskCard'
import type { TemplateField, TemplateAIConfig } from '@/types/journal'
import { TablerIcon } from '@/components/ui/TablerIcon'
import { Toasts, useToasts } from '@/components/ui/Toast'
import { ymd } from '@/lib/utils/date-utils'

// =============================================================================
// TYPES
// =============================================================================

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

// =============================================================================
// EDIT MODE WRAPPER (shows form + panels together)
// =============================================================================

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
    audioTranscripts?: Record<string, string>
    ocrAssetIds?: string[]
    photoAssetIds?: string[]
  }) => void
  onCancel: () => void
  onSaveAndRunPipeline?: (data: EditModeWrapperProps['onSubmit'] extends (data: infer D) => void ? D : never) => void
  onTasksChange: () => void
}

/**
 * Wrapper that renders DynamicJournalForm with OCR/Tasks panels below.
 * Solves MT-10: panels must remain visible during inline editing.
 */
function EditModeWrapper({ entry, types, templates, today, isSubmitting, tasks, onSubmit, onCancel, onSaveAndRunPipeline, onTasksChange }: EditModeWrapperProps) {
  const formRef = useRef<DynamicJournalFormHandle>(null)

  // Check if entry has non-audio OCR sources
  const hasOCRSources = useMemo(
    () => entry.mediaAttachments.some(
      (a) => a.role === 'SOURCE' && !a.asset.mimeType?.startsWith('audio/')
    ),
    [entry.mediaAttachments]
  )

  // Handle OCR restore to content via form ref
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
      />

      {/* OCR Source Panel – visible in edit mode with restore button */}
      {hasOCRSources && (
        <OCRSourcePanel
          noteId={entry.id}
          initialTranscript={entry.content}
          onRestoreToContent={handleRestoreToContent}
        />
      )}

      {/* Tasks Panel – read-only during edit */}
      <JournalTasksPanel
        journalEntryId={entry.id}
        tasks={tasks || []}
        onTasksChange={onTasksChange}
      />
    </div>
  )
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * Journal overview page using the unified JournalService.
 */
export default function JournalPage() {
  const { toasts, push, dismiss } = useToasts()

  // Filter state
  const [typeFilter, setTypeFilter] = useState<string | undefined>(undefined)
  
  // Metadata state
  const [types, setTypes] = useState<JournalEntryType[]>([])
  const [templates, setTemplates] = useState<JournalTemplate[]>([])
  const [isMetadataLoading, setIsMetadataLoading] = useState(true)

  // Use the unified hook for entries
  const {
    entries,
    total,
    isLoading,
    error,
    createEntry,
    deleteEntry,
    runPipeline,
    loadMore,
    refetch,
  } = useJournalEntries({
    typeId: typeFilter,
    limit: 20,
    autoFetch: true,
  })

  // New entry form state
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Phase 5: Inline-edit state
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null)

  // Photo lightbox state
  const [lightboxPhoto, setLightboxPhoto] = useState<{ url: string; alt?: string } | null>(null)

  // Phase 3: Modal states
  const [shareModalEntryId, setShareModalEntryId] = useState<string | null>(null)
  const [timestampModalEntry, setTimestampModalEntry] = useState<EntryWithRelations | null>(null)
  const [aiSettingsEntry, setAiSettingsEntry] = useState<EntryWithRelations | null>(null)

  // Phase 2: Tasks per entry (loaded separately per Entscheidung F5)
  const [tasksMap, setTasksMap] = useState<Record<string, TaskCardData[]>>({})
  const [tasksLoadingSet, setTasksLoadingSet] = useState<Set<string>>(new Set())

  // Current date for audio persistence
  const today = ymd(new Date())

  // Refs for infinite scroll
  const loadMoreRef = useRef<HTMLDivElement>(null)

  // ---------------------------------------------------------------------------
  // LOAD METADATA
  // ---------------------------------------------------------------------------

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
      } finally {
        setIsMetadataLoading(false)
      }
    }

    void loadMetadata()
  }, [])

  // ---------------------------------------------------------------------------
  // LOAD TASKS FOR VISIBLE ENTRIES (separate per Entscheidung F5)
  // ---------------------------------------------------------------------------

  /** Load tasks for a single entry on-demand (when card becomes visible/expanded) */
  const loadTasksForEntry = useCallback(async (entryId: string) => {
    // Skip if already loaded or currently loading
    if (tasksMap[entryId] !== undefined || tasksLoadingSet.has(entryId)) return

    setTasksLoadingSet((prev) => new Set(prev).add(entryId))
    try {
      const res = await fetch(`/api/journal-entries/${entryId}/tasks`)
      if (res.ok) {
        const data = await res.json()
        setTasksMap((prev) => ({ ...prev, [entryId]: data.tasks || [] }))
      } else {
        // Entry may not have tasks endpoint - set empty
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

  /** Refetch tasks for a specific entry after task changes */
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

  // Load tasks for all visible entries when entries change
  useEffect(() => {
    for (const entry of entries) {
      void loadTasksForEntry(entry.id)
    }
  }, [entries, loadTasksForEntry])

  // ---------------------------------------------------------------------------
  // INFINITE SCROLL
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const observer = new IntersectionObserver(
      (observerEntries) => {
        if (observerEntries[0].isIntersecting && entries.length < total && !isLoading) {
          void loadMore()
        }
      },
      { threshold: 0.1 }
    )

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current)
    }

    return () => observer.disconnect()
  }, [entries.length, total, isLoading, loadMore])

  // ---------------------------------------------------------------------------
  // HANDLERS
  // ---------------------------------------------------------------------------

  /** Handle form submission from DynamicJournalForm (create mode) */
  const handleFormSubmit = useCallback(async (data: {
    typeId: string
    templateId: string | null
    content: string
    fieldValues: Record<string, string>
    title?: string
    isSensitive?: boolean
    occurredAt?: string
    audioFileIds?: string[]
    audioTranscripts?: Record<string, string>
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
        occurredAt: data.occurredAt ? new Date(data.occurredAt) : undefined,
      })

      if (result) {
        setIsFormOpen(false)
        push('Eintrag erstellt', 'success')
        
        // Attach audio files after entry creation
        if (data.audioFileIds && data.audioFileIds.length > 0) {
          for (const assetId of data.audioFileIds) {
            const transcript = data.audioTranscripts?.[assetId]
            try {
              await fetch(`/api/journal-entries/${result.id}/media`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  assetId,
                  role: 'SOURCE',
                  transcript: transcript || null,
                }),
              })
            } catch (err) {
              console.error('Failed to attach audio:', err)
            }
          }
          await refetch()
        }

        // Attach OCR assets after entry creation
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

        // Attach photo assets after entry creation
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

        // Refetch if any media was attached
        if (
          (data.audioFileIds && data.audioFileIds.length > 0) ||
          (data.ocrAssetIds && data.ocrAssetIds.length > 0) ||
          (data.photoAssetIds && data.photoAssetIds.length > 0)
        ) {
          await refetch()
        }
      }
    } catch (err) {
      console.error('Failed to create entry:', err)
      push('Fehler beim Erstellen', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }, [createEntry, push, refetch])

  /** W3: Create entry and then run AI pipeline */
  const handleFormSubmitAndPipeline = useCallback(async (data: Parameters<typeof handleFormSubmit>[0]) => {
    setIsSubmitting(true)
    try {
      const result = await createEntry({
        typeId: data.typeId,
        templateId: data.templateId || undefined,
        content: data.content,
        title: data.title,
        isSensitive: data.isSensitive,
        occurredAt: data.occurredAt ? new Date(data.occurredAt) : undefined,
      })
      if (result) {
        setIsFormOpen(false)
        push('Eintrag erstellt – Pipeline läuft…', 'success')
        await runPipeline(result.id)
        push('KI-Pipeline abgeschlossen', 'success')
      }
    } catch (err) {
      console.error('Create+Pipeline failed:', err)
      push('Fehler', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }, [createEntry, runPipeline, push])

  /** Phase 5: Handle edit-submit from DynamicJournalForm (edit mode) */
  const handleEditSubmit = useCallback(async (entryId: string, data: {
    typeId: string
    templateId: string | null
    content: string
    fieldValues: Record<string, string>
    title?: string
    isSensitive?: boolean
    occurredAt?: string
    capturedAt?: string | null
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
      setEditingEntryId(null)
      await refetch()
      push('Eintrag aktualisiert', 'success')
    } catch (err) {
      console.error('Failed to update entry:', err)
      push('Fehler beim Aktualisieren', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }, [refetch, push])

  /** W5: Edit-submit + pipeline */
  const handleEditSubmitAndPipeline = useCallback(async (entryId: string, data: Parameters<typeof handleEditSubmit>[1]) => {
    await handleEditSubmit(entryId, data)
    try {
      await runPipeline(entryId)
      push('KI-Pipeline abgeschlossen', 'success')
    } catch {
      push('KI-Pipeline fehlgeschlagen', 'error')
    }
  }, [handleEditSubmit, runPipeline, push])

  const handleDeleteEntry = useCallback(async (entryId: string) => {
    if (!confirm('Eintrag wirklich löschen?')) return
    await deleteEntry(entryId)
    push('Eintrag gelöscht', 'success')
  }, [deleteEntry, push])

  const [pipelineRunningId, setPipelineRunningId] = useState<string | null>(null)
  const handleRunPipeline = useCallback(async (entryId: string) => {
    setPipelineRunningId(entryId)
    try {
      const success = await runPipeline(entryId)
      if (success) {
        push('KI-Pipeline abgeschlossen', 'success')
      } else {
        push('KI-Pipeline: einige Schritte fehlgeschlagen – siehe Konsole', 'error')
      }
    } catch (err) {
      console.error('Pipeline failed:', err)
      push(err instanceof Error ? err.message : 'KI-Pipeline fehlgeschlagen', 'error')
    } finally {
      setPipelineRunningId(null)
    }
  }, [runPipeline, push])

  const handleTypeFilterChange = useCallback((typeId: string | undefined) => {
    setTypeFilter(typeId)
  }, [])

  /** Handle photo view for lightbox */
  const handleViewPhoto = useCallback((attachmentId: string, imageUrl: string) => {
    // Ensure URL starts with / but avoid double-prefixing
    const fullUrl = imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`
    setLightboxPhoto({ url: fullUrl, alt: `Foto ${attachmentId}` })
  }, [])

  /** Phase 3: Handle timestamp save via PATCH /api/journal-entries/[id] */
  const handleTimestampSave = useCallback(async (
    occurredAt: string,
    capturedAt: string,
    _audioFileId?: string | null
  ) => {
    if (!timestampModalEntry) return
    try {
      const res = await fetch(`/api/journal-entries/${timestampModalEntry.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ occurredAt, capturedAt }),
      })
      if (!res.ok) throw new Error('Fehler beim Speichern')
      push('Zeitpunkte aktualisiert', 'success')
      await refetch()
    } catch (err) {
      console.error('Failed to save timestamps:', err)
      push('Fehler beim Speichern der Zeitpunkte', 'error')
      throw err
    }
  }, [timestampModalEntry, push, refetch])

  /** Phase 3: Handle access change from ShareEntryModal */
  const handleAccessChange = useCallback(async () => {
    await refetch()
  }, [refetch])

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------

  // Initial loading
  if (isLoading && entries.length === 0 && isMetadataLoading) {
    return (
      <div className="flex min-h-96 items-center justify-center">
        <IconLoader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-4xl p-4">
      <Toasts toasts={toasts} dismiss={dismiss} />

      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <IconBook2 className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Journal</h1>
            <p className="text-sm text-base-content/60">
              {total} Einträge
            </p>
          </div>
        </div>

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
      </div>

      {/* Error message */}
      {error && (
        <div className="alert alert-error mb-4">
          <span>{error}</span>
          <button onClick={() => refetch()} className="btn btn-ghost btn-sm">
            Erneut versuchen
          </button>
        </div>
      )}

      {/* New entry form - Full-featured DynamicJournalForm */}
      {isFormOpen && types.length > 0 && (
        <div className="mb-6 rounded-lg border border-base-300 bg-base-100 p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium">Neuer Eintrag</h2>
            <button
              onClick={() => setIsFormOpen(false)}
              className="btn btn-ghost btn-sm btn-circle"
            >
              <IconX className="h-4 w-4" />
            </button>
          </div>
          
          <DynamicJournalForm
            types={types}
            templates={templates}
            onSubmit={handleFormSubmit}
            onSaveAndRunPipeline={handleFormSubmitAndPipeline}
            isSubmitting={isSubmitting}
            showMediaButtons={true}
            date={today}
          />
        </div>
      )}

      {/* Type filter */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="dropdown">
          <label tabIndex={0} className="btn btn-ghost btn-sm gap-1">
            <IconFilter className="h-4 w-4" />
            {typeFilter
              ? types.find((t) => t.id === typeFilter)?.name || 'Typ'
              : 'Alle Typen'}
            <IconChevronDown className="h-3 w-3" />
          </label>
          <ul
            tabIndex={0}
            className="menu dropdown-content z-10 w-52 rounded-box bg-base-200 p-2 shadow"
          >
            <li>
              <button onClick={() => handleTypeFilterChange(undefined)}>
                Alle Typen
              </button>
            </li>
            {types.map((type) => (
              <li key={type.id}>
                <button onClick={() => handleTypeFilterChange(type.id)}>
                  {type.icon && <TablerIcon name={type.icon} className="h-4 w-4" />}
                  {type.name}
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Entry count */}
        <span className="text-sm text-base-content/60">
          {entries.length} von {total} geladen
        </span>
      </div>

      {/* Entries list */}
      {entries.length === 0 ? (
        <div className="rounded-lg border border-dashed border-base-300 p-8 text-center">
          <IconBook2 className="mx-auto h-12 w-12 text-base-content/30" />
          <p className="mt-2 text-base-content/60">
            {typeFilter
              ? 'Keine Einträge dieses Typs gefunden'
              : 'Noch keine Einträge vorhanden'}
          </p>
          {!isFormOpen && (
            <button onClick={() => setIsFormOpen(true)} className="btn btn-primary btn-sm mt-4">
              <IconPlus className="h-4 w-4" />
              Ersten Eintrag erstellen
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) =>
            editingEntryId === entry.id ? (
              // Phase 5: Inline-Edit – render DynamicJournalForm + panels
              <EditModeWrapper
                key={entry.id}
                entry={entry}
                types={types}
                templates={templates}
                today={today}
                isSubmitting={isSubmitting}
                tasks={tasksMap[entry.id]}
                onSubmit={(data) => handleEditSubmit(entry.id, data)}
                onSaveAndRunPipeline={(data) => handleEditSubmitAndPipeline(entry.id, data)}
                onCancel={() => setEditingEntryId(null)}
                onTasksChange={() => refetchTasksForEntry(entry.id)}
              />
            ) : (
              <JournalEntryCard
                key={entry.id}
                entry={entry}
                mode="compact"
                onEdit={() => setEditingEntryId(entry.id)}
                onDelete={() => handleDeleteEntry(entry.id)}
                onRunPipeline={() => handleRunPipeline(entry.id)}
                pipelineRunning={pipelineRunningId === entry.id}
                onViewPhoto={handleViewPhoto}
                // Phase 2: Tasks
                tasks={tasksMap[entry.id]}
                onTasksChange={() => refetchTasksForEntry(entry.id)}
                // Phase 3: Modals
                isShared={entry.accessCount > 0}
                sharedWithCount={entry.accessCount}
                onOpenShareModal={() => setShareModalEntryId(entry.id)}
                onOpenTimestampModal={() => setTimestampModalEntry(entry)}
                onOpenAISettings={() => setAiSettingsEntry(entry)}
              />
            )
          )}

          {/* Load more trigger */}
          <div ref={loadMoreRef} className="h-10">
            {isLoading && entries.length > 0 && (
              <div className="flex justify-center">
                <IconLoader2 className="h-5 w-5 animate-spin text-base-content/40" />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Photo Lightbox */}
      <PhotoLightbox
        isOpen={lightboxPhoto !== null}
        onClose={() => setLightboxPhoto(null)}
        imageUrl={lightboxPhoto?.url || ''}
        alt={lightboxPhoto?.alt}
      />

      {/* Phase 3: ShareEntryModal */}
      {shareModalEntryId && (
        <ShareEntryModal
          entryId={shareModalEntryId}
          isOpen={true}
          onClose={() => setShareModalEntryId(null)}
          onAccessChange={handleAccessChange}
        />
      )}

      {/* Phase 3: TimestampModal */}
      {timestampModalEntry && (
        <TimestampModal
          isOpen={true}
          onClose={() => setTimestampModalEntry(null)}
          onSave={handleTimestampSave}
          occurredAtIso={timestampModalEntry.occurredAt ? new Date(timestampModalEntry.occurredAt).toISOString() : undefined}
          capturedAtIso={timestampModalEntry.capturedAt ? new Date(timestampModalEntry.capturedAt).toISOString() : undefined}
        />
      )}

      {/* Phase 3: AISettingsPopup (template-based AI config) */}
      {aiSettingsEntry && aiSettingsEntry.type && (
        <AISettingsPopup
          isOpen={true}
          onClose={() => setAiSettingsEntry(null)}
          typeName={aiSettingsEntry.type.name}
          templateId={aiSettingsEntry.templateId}
          templateName={aiSettingsEntry.template?.name}
        />
      )}
    </div>
  )
}
