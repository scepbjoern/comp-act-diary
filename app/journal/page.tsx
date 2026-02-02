/**
 * app/journal/page.tsx
 * Journal overview page - displays entries by type/template with filtering.
 * Replaces the old /reflections page with a unified journal view.
 */

'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  IconPlus,
  IconFilter,
  IconSearch,
  IconCalendar,
  IconChevronDown,
  IconBook2,
} from '@tabler/icons-react'
import { DynamicJournalForm } from '@/components/features/journal'
import { TemplateField, TemplateAIConfig, JournalEntryWithRelations } from '@/types/journal'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'

// Types
interface JournalEntryType {
  id: string
  code: string
  name: string
  icon: string | null
  bgColorClass: string | null
}

interface JournalTemplate {
  id: string
  name: string
  fields: TemplateField[] | null
  aiConfig: TemplateAIConfig | null
  typeId: string | null
}

interface TimeBox {
  id: string
  localDate: string
}

/**
 * Journal overview page component.
 */
export default function JournalPage() {
  const router = useRouter()

  // Data state
  const [entries, setEntries] = useState<JournalEntryWithRelations[]>([])
  const [types, setTypes] = useState<JournalEntryType[]>([])
  const [templates, setTemplates] = useState<JournalTemplate[]>([])
  const [timeBoxes, setTimeBoxes] = useState<TimeBox[]>([])

  // Loading and error state
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Pagination
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)

  // Filters
  const [typeFilter, setTypeFilter] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  // New entry form state
  const [isCreating, setIsCreating] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Refs for infinite scroll
  const loadMoreRef = useRef<HTMLDivElement>(null)

  // Fetch initial data
  const fetchData = useCallback(async (cursor?: string) => {
    try {
      if (cursor) {
        setIsLoadingMore(true)
      } else {
        setIsLoading(true)
      }
      setError(null)

      // Build query params
      const params = new URLSearchParams()
      if (typeFilter) params.set('typeCode', typeFilter)
      if (searchQuery) params.set('search', searchQuery)
      if (dateFrom) params.set('dateFrom', dateFrom)
      if (dateTo) params.set('dateTo', dateTo)
      if (cursor) params.set('cursor', cursor)
      params.set('limit', '20')

      // Fetch entries
      const entriesRes = await fetch(`/api/journal?${params.toString()}`)
      if (!entriesRes.ok) throw new Error('Fehler beim Laden der Einträge')
      const entriesData = await entriesRes.json()

      if (cursor) {
        // Append to existing entries
        setEntries((prev) => [...prev, ...(entriesData.entries || [])])
      } else {
        setEntries(entriesData.entries || [])
      }

      setNextCursor(entriesData.nextCursor)
      setHasMore(entriesData.hasMore)

      // Fetch types and templates only on initial load
      if (!cursor) {
        const [typesRes, templatesRes, timeBoxesRes] = await Promise.all([
          fetch('/api/journal-entry-types'),
          fetch('/api/templates'),
          fetch('/api/day?limit=30'), // Get recent days for timeBox selection
        ])

        if (typesRes.ok) {
          const typesData = await typesRes.json()
          setTypes(typesData.types || [])
        }

        if (templatesRes.ok) {
          const templatesData = await templatesRes.json()
          setTemplates(templatesData.templates || [])
        }

        if (timeBoxesRes.ok) {
          const timeBoxesData = await timeBoxesRes.json()
          setTimeBoxes(
            (timeBoxesData.days || []).map((d: { id: string; localDate: string }) => ({
              id: d.id,
              localDate: d.localDate,
            }))
          )
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler')
    } finally {
      setIsLoading(false)
      setIsLoadingMore(false)
    }
  }, [typeFilter, searchQuery, dateFrom, dateTo])

  // Initial fetch
  useEffect(() => {
    void fetchData()
  }, [fetchData])

  // Load more entries
  const loadMore = useCallback(() => {
    if (nextCursor && !isLoadingMore) {
      void fetchData(nextCursor)
    }
  }, [nextCursor, isLoadingMore, fetchData])

  // Intersection observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
          loadMore()
        }
      },
      { threshold: 0.1 }
    )

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current)
    }

    return () => observer.disconnect()
  }, [hasMore, isLoadingMore, loadMore])

  // Handle filter changes
  const handleFilterChange = useCallback(() => {
    setNextCursor(null)
    void fetchData()
  }, [fetchData])

  // Handle create entry
  const handleCreateEntry = useCallback(
    async (data: {
      typeId: string
      templateId: string | null
      content: string
      fieldValues: Record<string, string>
      audioFileIds?: string[]
      audioTranscripts?: Record<string, string>
    }) => {
      try {
        setIsSubmitting(true)

        // Get or create today's timeBox via GET (auto-creates if missing)
        let timeBoxId = timeBoxes[0]?.id
        if (!timeBoxId) {
          const today = format(new Date(), 'yyyy-MM-dd')
          const dayRes = await fetch(`/api/day?date=${today}`)
          if (dayRes.ok) {
            const dayData = await dayRes.json()
            timeBoxId = dayData.day.timeBoxId
          }
        }

        if (!timeBoxId) {
          throw new Error('Kein TimeBox verfügbar')
        }

        const res = await fetch('/api/journal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            typeId: data.typeId,
            templateId: data.templateId,
            content: data.content,
            fieldValues: data.fieldValues,
            audioFileIds: data.audioFileIds,
            audioTranscripts: data.audioTranscripts,
            timeBoxId,
          }),
        })

        if (!res.ok) {
          const errorData = await res.json()
          throw new Error(errorData.error || 'Fehler beim Erstellen')
        }

        // Refresh entries and close form
        await fetchData()
        setIsCreating(false)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Fehler beim Erstellen')
      } finally {
        setIsSubmitting(false)
      }
    },
    [timeBoxes, fetchData]
  )

  // Loading state
  if (isLoading && entries.length === 0) {
    return (
      <div className="flex min-h-96 items-center justify-center">
        <span className="loading loading-spinner loading-lg" />
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-4xl p-4">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <IconBook2 className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Journal</h1>
            <p className="text-sm text-base-content/60">
              Deine Tagebucheinträge und Reflexionen
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsCreating(true)}
          className="btn btn-primary btn-sm gap-1"
        >
          <IconPlus className="h-4 w-4" />
          Neuer Eintrag
        </button>
      </div>

      {/* Error message */}
      {error && (
        <div className="alert alert-error mb-4">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="btn btn-ghost btn-sm">
            ×
          </button>
        </div>
      )}

      {/* New entry form */}
      {isCreating && (
        <div className="mb-6 rounded-lg border border-base-300 bg-base-100 p-4">
          <h2 className="mb-4 text-lg font-medium">Neuer Eintrag</h2>
          <DynamicJournalForm
            types={types}
            templates={templates}
            onSubmit={handleCreateEntry}
            isSubmitting={isSubmitting}
            showMediaButtons={true}
            date={format(new Date(), 'yyyy-MM-dd')}
          />
          <div className="mt-4 flex justify-end">
            <button
              onClick={() => setIsCreating(false)}
              disabled={isSubmitting}
              className="btn btn-ghost btn-sm"
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        {/* Type filter */}
        <div className="dropdown">
          <label tabIndex={0} className="btn btn-ghost btn-sm gap-1">
            <IconFilter className="h-4 w-4" />
            {typeFilter
              ? types.find((t) => t.code === typeFilter)?.name || 'Typ'
              : 'Alle Typen'}
            <IconChevronDown className="h-3 w-3" />
          </label>
          <ul
            tabIndex={0}
            className="menu dropdown-content z-10 w-52 rounded-box bg-base-200 p-2 shadow"
          >
            <li>
              <button onClick={() => { setTypeFilter(''); handleFilterChange(); }}>
                Alle Typen
              </button>
            </li>
            {types.map((type) => (
              <li key={type.id}>
                <button onClick={() => { setTypeFilter(type.code); handleFilterChange(); }}>
                  {type.icon && <span>{type.icon}</span>}
                  {type.name}
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Search */}
        <div className="relative flex-1">
          <IconSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-base-content/40" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleFilterChange()}
            placeholder="Suchen..."
            className="input input-bordered input-sm w-full pl-9"
          />
        </div>

        {/* Date filters */}
        <div className="flex items-center gap-2">
          <IconCalendar className="h-4 w-4 text-base-content/40" />
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); handleFilterChange(); }}
            className="input input-bordered input-sm"
          />
          <span className="text-base-content/40">–</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); handleFilterChange(); }}
            className="input input-bordered input-sm"
          />
        </div>
      </div>

      {/* Entries list */}
      {entries.length === 0 ? (
        <div className="rounded-lg border border-dashed border-base-300 p-8 text-center">
          <IconBook2 className="mx-auto h-12 w-12 text-base-content/30" />
          <p className="mt-2 text-base-content/60">
            {typeFilter || searchQuery || dateFrom || dateTo
              ? 'Keine Einträge gefunden'
              : 'Noch keine Einträge vorhanden'}
          </p>
          {!isCreating && (
            <button onClick={() => setIsCreating(true)} className="btn btn-primary btn-sm mt-4">
              <IconPlus className="h-4 w-4" />
              Ersten Eintrag erstellen
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {entries.map((entry) => (
            <JournalEntryCard
              key={entry.id}
              entry={entry}
              onClick={() => router.push(`/journal/${entry.id}`)}
            />
          ))}

          {/* Load more trigger */}
          <div ref={loadMoreRef} className="h-10">
            {isLoadingMore && (
              <div className="flex justify-center">
                <span className="loading loading-spinner loading-sm" />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Journal entry card component.
 */
function JournalEntryCard({
  entry,
  onClick,
}: {
  entry: JournalEntryWithRelations
  onClick: () => void
}) {
  // Format date
  const formattedDate = entry.occurredAt
    ? format(new Date(entry.occurredAt), 'dd. MMM yyyy, HH:mm', { locale: de })
    : format(new Date(entry.createdAt), 'dd. MMM yyyy, HH:mm', { locale: de })

  // Get preview text (first 200 chars without markdown)
  const previewText = entry.content
    .replace(/^#+ .*/gm, '') // Remove headers
    .replace(/\*\*|__/g, '') // Remove bold
    .replace(/\*|_/g, '') // Remove italic
    .replace(/\n+/g, ' ') // Replace newlines with spaces
    .trim()
    .slice(0, 200)

  return (
    <button
      onClick={onClick}
      className={`w-full rounded-lg border border-base-300 p-4 text-left transition-colors hover:bg-base-200 ${
        entry.type.bgColorClass || ''
      }`}
    >
      {/* Header */}
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {entry.type.icon && <span className="text-lg">{entry.type.icon}</span>}
          <span className="font-medium">{entry.type.name}</span>
          {entry.template && (
            <span className="text-sm text-base-content/60">• {entry.template.name}</span>
          )}
        </div>
        <span className="text-sm text-base-content/60">{formattedDate}</span>
      </div>

      {/* Title */}
      {entry.title && <h3 className="mb-1 font-medium">{entry.title}</h3>}

      {/* Preview */}
      <p className="text-sm text-base-content/70">
        {previewText}
        {entry.content.length > 200 && '...'}
      </p>

      {/* Summary badge */}
      {entry.aiSummary && (
        <div className="mt-2">
          <span className="badge badge-ghost badge-sm">Zusammenfassung vorhanden</span>
        </div>
      )}
    </button>
  )
}
