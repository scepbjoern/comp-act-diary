/**
 * app/journal/[id]/page.tsx
 * Detail view for a single journal entry with editing capabilities.
 * Uses DynamicJournalForm for edit mode (Entscheidung E3).
 */

'use client'

import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import { TablerIcon } from '@/components/ui/TablerIcon'
import { IconArrowLeft, IconEdit, IconTrash } from '@tabler/icons-react'
import { Toasts, useToasts } from '@/components/ui/Toast'
import { PipelineStepModal } from '@/components/features/journal/PipelineStepModal'
import type { PipelineStepId } from '@/components/features/journal/PipelineStepModal'
import { DynamicJournalForm } from '@/components/features/journal/DynamicJournalForm'
import type { JournalEntryTypeOption, JournalTemplateOption, DynamicJournalFormHandle } from '@/components/features/journal/DynamicJournalForm'
import { OCRSourcePanel } from '@/components/features/ocr/OCRSourcePanel'
import JournalTasksPanel from '@/components/features/tasks/JournalTasksPanel'
import type { EntryWithRelations } from '@/lib/services/journal/types'
import { ymd } from '@/lib/utils/date-utils'

export default function JournalEntryPage() {
  const params = useParams()
  const router = useRouter()
  const { toasts, push, dismiss } = useToasts()
  const entryId = params.id as string

  const [entry, setEntry] = useState<EntryWithRelations | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Pipeline modal state
  const [showPipelineModal, setShowPipelineModal] = useState(false)
  const [pipelineRunning, setPipelineRunning] = useState(false)

  // Metadata for DynamicJournalForm
  const [types, setTypes] = useState<JournalEntryTypeOption[]>([])
  const [templates, setTemplates] = useState<JournalTemplateOption[]>([])

  const today = ymd(new Date())
  const formRef = useRef<DynamicJournalFormHandle>(null)

  // Check if entry has non-audio OCR sources
  const hasOCRSources = useMemo(
    () => entry?.mediaAttachments.some(
      (a) => a.role === 'SOURCE' && !a.asset.mimeType?.startsWith('audio/')
    ) ?? false,
    [entry?.mediaAttachments]
  )

  // ---------------------------------------------------------------------------
  // FETCH DATA
  // ---------------------------------------------------------------------------

  const fetchEntry = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/journal-entries/${entryId}`)
      if (!response.ok) {
        if (response.status === 404) {
          setError('Eintrag nicht gefunden')
        } else if (response.status === 403) {
          setError('Kein Zugriff auf diesen Eintrag')
        } else {
          setError('Fehler beim Laden des Eintrags')
        }
        return
      }
      const data = await response.json()
      setEntry(data.entry)
    } catch (err) {
      console.error('Error fetching entry:', err)
      setError('Fehler beim Laden des Eintrags')
    } finally {
      setIsLoading(false)
    }
  }, [entryId])

  // Load entry + metadata on mount
  useEffect(() => {
    void fetchEntry()

    // Load types and templates for edit form
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
  }, [fetchEntry])

  // ---------------------------------------------------------------------------
  // HANDLERS
  // ---------------------------------------------------------------------------

  /** Handle edit-submit from DynamicJournalForm */
  const handleEditSubmit = useCallback(async (data: {
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
    setIsSaving(true)
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

      // Update MediaAttachment transcripts if changed
      if (data.updatedTranscripts) {
        for (const [attachmentId, { transcript, transcriptModel }] of Object.entries(data.updatedTranscripts)) {
          try {
            await fetch(`/api/journal-entries/${entryId}/media/${attachmentId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ transcript, transcriptModel }),
            })
          } catch (err) {
            console.error('Failed to update transcript for attachment:', attachmentId, err)
          }
        }
      }

      const resData = await res.json()
      setEntry(resData.entry)
      setIsEditing(false)
      push('Eintrag gespeichert', 'success')
    } catch (err) {
      console.error('Failed to update entry:', err)
      push('Fehler beim Speichern', 'error')
    } finally {
      setIsSaving(false)
    }
  }, [entryId, push])

  /** W5: Save + open pipeline modal on detail page */
  const handleEditSubmitAndPipeline = useCallback(async (data: Parameters<typeof handleEditSubmit>[0]) => {
    await handleEditSubmit(data)
    setShowPipelineModal(true)
  }, [handleEditSubmit])

  /** Execute pipeline with user-selected steps */
  const executePipelineWithSteps = useCallback(async (steps: PipelineStepId[]) => {
    setPipelineRunning(true)
    try {
      const response = await fetch('/api/journal-ai/pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ journalEntryId: entryId, steps }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'AI-Pipeline fehlgeschlagen')
      }
      const failedSteps = data.steps?.filter((s: { success: boolean }) => !s.success) || []
      await fetchEntry()
      setShowPipelineModal(false)
      if (failedSteps.length === 0) {
        push('KI-Pipeline abgeschlossen', 'success')
      } else {
        push(`KI-Pipeline: ${data.steps.length - failedSteps.length}/${data.steps.length} Schritte erfolgreich`, 'success')
      }
    } catch (err) {
      console.error('Pipeline failed:', err)
      push(err instanceof Error ? err.message : 'KI-Pipeline fehlgeschlagen', 'error')
    } finally {
      setPipelineRunning(false)
    }
  }, [entryId, fetchEntry, push])

  /** Delete entry and navigate back */
  const handleDelete = useCallback(async () => {
    if (!confirm('Eintrag wirklich löschen?')) return
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/journal-entries/${entryId}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Fehler beim Löschen')
      push('Eintrag gelöscht', 'success')
      router.push('/journal')
    } catch (err) {
      console.error('Error deleting entry:', err)
      push('Fehler beim Löschen', 'error')
    } finally {
      setIsDeleting(false)
    }
  }, [entryId, push, router])

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <span className="loading loading-spinner loading-lg" />
      </div>
    )
  }

  if (error || !entry) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 p-4">
        <Link href="/journal" className="btn btn-ghost btn-sm gap-2">
          <IconArrowLeft className="h-4 w-4" />
          Zurück
        </Link>
        <div className="alert alert-error">
          <span>{error || 'Eintrag nicht gefunden'}</span>
        </div>
      </div>
    )
  }

  // Date display
  const formattedDate = entry.occurredAt
    ? format(new Date(entry.occurredAt), 'EEEE, d. MMMM yyyy', { locale: de })
    : format(new Date(entry.createdAt), 'EEEE, d. MMMM yyyy', { locale: de })

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4">
      <Toasts toasts={toasts} dismiss={dismiss} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <Link href="/journal" className="btn btn-ghost btn-sm gap-2">
          <IconArrowLeft className="h-4 w-4" />
          Zurück
        </Link>
        <div className="flex gap-2">
          {!isEditing && (
            <>
              <button onClick={() => setIsEditing(true)} className="btn btn-ghost btn-sm gap-2">
                <IconEdit className="h-4 w-4" />
                Bearbeiten
              </button>
              <button
                onClick={() => void handleDelete()}
                className="btn btn-ghost btn-sm text-error"
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <span className="loading loading-spinner loading-xs" />
                ) : (
                  <IconTrash className="h-4 w-4" />
                )}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Edit Mode: DynamicJournalForm + Panels */}
      {isEditing && types.length > 0 ? (
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
            onSubmit={handleEditSubmit}
            onSaveAndRunPipeline={handleEditSubmitAndPipeline}
            onCancel={() => setIsEditing(false)}
            isSubmitting={isSaving}
            date={today}
            onToast={push}
          />

          {/* OCR Source Panel with restore button */}
          {hasOCRSources && (
            <OCRSourcePanel
              noteId={entry.id}
              initialTranscript={entry.content}
              onRestoreToContent={(text) => formRef.current?.appendToContent(text)}
            />
          )}

          {/* Tasks Panel */}
          <JournalTasksPanel
            journalEntryId={entry.id}
            tasks={[]}
            onTasksChange={() => {}}
          />
        </div>
      ) : isEditing ? (
        // Metadata still loading
        <div className="flex justify-center py-8">
          <span className="loading loading-spinner loading-md" />
        </div>
      ) : (
        // View Mode
        <div className="card bg-base-100 shadow-sm">
          <div className="card-body">
            {/* Type & Date */}
            <div className="flex items-center gap-3">
              {entry.type && (
                <div className="flex items-center gap-2 rounded-full px-3 py-1 text-sm bg-base-200">
                  {entry.type.icon && <TablerIcon name={entry.type.icon} size={16} />}
                  <span>{entry.type.name}</span>
                </div>
              )}
              <span className="text-sm text-base-content/60">{formattedDate}</span>
            </div>

            {/* Title */}
            {entry.title && <h1 className="text-xl font-semibold">{entry.title}</h1>}

            {/* Template Info */}
            {entry.template && (
              <div className="text-sm text-base-content/60">
                Template: {entry.template.name}
              </div>
            )}

            {/* Content */}
            <div className="prose prose-sm max-w-none dark:prose-invert whitespace-pre-wrap">
              {entry.content}
            </div>

            {/* Location */}
            {entry.location && (
              <div className="flex items-center gap-2 pt-4 text-sm text-base-content/60">
                <TablerIcon name="map_pin" size={16} />
                <span>{entry.location.name}</span>
              </div>
            )}

            {/* Timestamps */}
            <div className="border-t border-base-200 pt-4 text-xs text-base-content/50">
              <div>Erstellt: {format(new Date(entry.createdAt), 'dd.MM.yyyy HH:mm', { locale: de })}</div>
              {entry.updatedAt !== entry.createdAt && (
                <div>Bearbeitet: {format(new Date(entry.updatedAt), 'dd.MM.yyyy HH:mm', { locale: de })}</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Pipeline Step Selection Modal */}
      <PipelineStepModal
        isOpen={showPipelineModal}
        onClose={() => setShowPipelineModal(false)}
        onConfirm={executePipelineWithSteps}
        isRunning={pipelineRunning}
      />
    </div>
  )
}
