/**
 * app/journal/page.tsx
 * Journal overview page - displays entries by type/template with filtering.
 * Uses the unified JournalService via /api/journal-entries.
 * Integrates DynamicJournalForm for full-featured entry creation.
 */

'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  IconPlus,
  IconFilter,
  IconChevronDown,
  IconChevronUp,
  IconBook2,
  IconLoader2,
  IconX,
} from '@tabler/icons-react'
import { JournalEntryCard } from '@/components/features/journal'
import { DynamicJournalForm } from '@/components/features/journal/DynamicJournalForm'
import { useJournalEntries } from '@/hooks/useJournalEntries'
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
// MAIN COMPONENT
// =============================================================================

/**
 * Journal overview page using the unified JournalService.
 */
export default function JournalPage() {
  const router = useRouter()
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
    generateTitle,
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

  /** Handle form submission from DynamicJournalForm */
  const handleFormSubmit = useCallback(async (data: {
    typeId: string
    templateId: string | null
    content: string
    fieldValues: Record<string, string>
    audioFileIds?: string[]
    audioTranscripts?: Record<string, string>
  }) => {
    setIsSubmitting(true)
    try {
      const result = await createEntry({
        typeId: data.typeId,
        templateId: data.templateId || undefined,
        content: data.content,
        // Audio files are attached separately after entry creation
      })

      if (result) {
        setIsFormOpen(false)
        push('Eintrag erstellt', 'success')
        
        // If audio files were recorded, attach them
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
      }
    } catch (err) {
      console.error('Failed to create entry:', err)
      push('Fehler beim Erstellen', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }, [createEntry, push, refetch])

  const handleDeleteEntry = useCallback(async (entryId: string) => {
    if (!confirm('Eintrag wirklich löschen?')) return
    await deleteEntry(entryId)
    push('Eintrag gelöscht', 'success')
  }, [deleteEntry, push])

  const handleRunPipeline = useCallback(async (entryId: string) => {
    try {
      await runPipeline(entryId)
      push('KI-Pipeline abgeschlossen', 'success')
    } catch (err) {
      console.error('Pipeline failed:', err)
      push('KI-Pipeline fehlgeschlagen', 'error')
    }
  }, [runPipeline, push])

  const handleGenerateTitle = useCallback(async (entryId: string) => {
    try {
      const title = await generateTitle(entryId)
      if (title) {
        push('Titel generiert', 'success')
      }
    } catch (err) {
      console.error('Title generation failed:', err)
      push('Titel-Generierung fehlgeschlagen', 'error')
    }
  }, [generateTitle, push])

  const handleTypeFilterChange = useCallback((typeId: string | undefined) => {
    setTypeFilter(typeId)
  }, [])

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
          {entries.map((entry) => (
            <JournalEntryCard
              key={entry.id}
              entry={entry}
              mode="expanded"
              onEdit={() => router.push(`/journal/${entry.id}`)}
              onDelete={() => handleDeleteEntry(entry.id)}
              onRunPipeline={() => handleRunPipeline(entry.id)}
            />
          ))}

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
    </div>
  )
}
