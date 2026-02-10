/**
 * hooks/useJournalEntries.ts
 * Unified hook for journal entry CRUD operations.
 * Replaces journal-related functionality from useDiaryManagement.
 */

import { useCallback, useEffect, useState } from 'react'
import type { EntryWithRelations, ListEntriesResult } from '@/lib/services/journal/types'

// =============================================================================
// TYPES
// =============================================================================

export interface UseJournalEntriesOptions {
  /** Filter by TimeBox ID (for day view) */
  timeBoxId?: string
  /** Filter by entry type ID */
  typeId?: string
  /** Filter by template ID */
  templateId?: string
  /** Number of entries per page */
  limit?: number
  /** Auto-fetch on mount and when filters change */
  autoFetch?: boolean
  /** Lean mode: skip media attachments for list views */
  lean?: boolean
}

export interface CreateEntryParams {
  typeId: string
  content: string
  timeBoxId?: string
  templateId?: string | null
  locationId?: string | null
  title?: string | null
  fieldValues?: Record<string, string>
  occurredAt?: Date
  capturedAt?: Date
  timezoneOffset?: number
  isSensitive?: boolean
  audioFileIds?: string[]
  audioTranscripts?: Array<{ assetId: string; transcript: string; transcriptModel?: string | null }>
  ocrAssetIds?: string[]
  photoAssetIds?: string[]
}

export interface UpdateEntryParams {
  title?: string | null
  content?: string
  fieldValues?: Record<string, string>
  occurredAt?: Date
  capturedAt?: Date
  isSensitive?: boolean
  locationId?: string | null
}

export interface UseJournalEntriesReturn {
  // State
  entries: EntryWithRelations[]
  total: number
  isLoading: boolean
  error: string | null

  // CRUD
  createEntry: (params: CreateEntryParams) => Promise<EntryWithRelations | null>
  updateEntry: (id: string, params: UpdateEntryParams) => Promise<EntryWithRelations | null>
  deleteEntry: (id: string) => Promise<boolean>

  // Media
  addMedia: (entryId: string, assetId: string, role: 'ATTACHMENT' | 'SOURCE' | 'GALLERY', transcript?: string, transcriptModel?: string) => Promise<boolean>
  removeMedia: (entryId: string, attachmentId: string) => Promise<boolean>
  updateTranscript: (entryId: string, attachmentId: string, transcript: string, transcriptModel?: string) => Promise<boolean>

  // AI (user-triggered)
  runPipeline: (entryId: string) => Promise<boolean>
  generateTitle: (entryId: string) => Promise<string | null>

  // Pagination & Refresh
  loadMore: () => Promise<void>
  refetch: () => Promise<void>
  setEntries: React.Dispatch<React.SetStateAction<EntryWithRelations[]>>
}

// =============================================================================
// HOOK IMPLEMENTATION
// =============================================================================

export function useJournalEntries(options: UseJournalEntriesOptions = {}): UseJournalEntriesReturn {
  const { timeBoxId, typeId, templateId, limit = 50, autoFetch = true, lean = false } = options

  const [entries, setEntries] = useState<EntryWithRelations[]>([])
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ---------------------------------------------------------------------------
  // FETCH ENTRIES
  // ---------------------------------------------------------------------------

  const fetchEntries = useCallback(async (reset = false) => {
    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (timeBoxId) params.set('timeBoxId', timeBoxId)
      if (typeId) params.set('typeId', typeId)
      if (templateId) params.set('templateId', templateId)
      params.set('limit', String(limit))
      params.set('offset', reset ? '0' : String(offset))
      if (lean) params.set('lean', 'true')

      const response = await fetch(`/api/journal-entries?${params.toString()}`, {
        credentials: 'same-origin',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Fehler beim Laden')
      }

      const data: ListEntriesResult = await response.json()

      if (reset) {
        setEntries(data.entries)
        setOffset(data.entries.length)
      } else {
        setEntries((prev) => [...prev, ...data.entries])
        setOffset((prev) => prev + data.entries.length)
      }
      setTotal(data.total)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler')
    } finally {
      setIsLoading(false)
    }
  }, [timeBoxId, typeId, templateId, limit, offset, lean])

  // Auto-fetch on mount and when filters change
  useEffect(() => {
    if (autoFetch) {
      void fetchEntries(true)
    }
    // Reset offset when filters change
    setOffset(0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeBoxId, typeId, templateId, autoFetch])

  // ---------------------------------------------------------------------------
  // CREATE ENTRY
  // ---------------------------------------------------------------------------

  const createEntry = useCallback(async (params: CreateEntryParams): Promise<EntryWithRelations | null> => {
    setError(null)

    try {
      const response = await fetch('/api/journal-entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(params),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Fehler beim Erstellen')
      }

      const data = await response.json()
      const newEntry = data.entry as EntryWithRelations

      // Add to list (at beginning since sorted by occurredAt desc)
      setEntries((prev) => [newEntry, ...prev])
      setTotal((prev) => prev + 1)

      return newEntry
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler')
      return null
    }
  }, [])

  // ---------------------------------------------------------------------------
  // UPDATE ENTRY
  // ---------------------------------------------------------------------------

  const updateEntry = useCallback(async (id: string, params: UpdateEntryParams): Promise<EntryWithRelations | null> => {
    setError(null)

    try {
      const response = await fetch(`/api/journal-entries/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(params),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Fehler beim Aktualisieren')
      }

      const data = await response.json()
      const updatedEntry = data.entry as EntryWithRelations

      // Update in list
      setEntries((prev) => prev.map((e) => (e.id === id ? updatedEntry : e)))

      return updatedEntry
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler')
      return null
    }
  }, [])

  // ---------------------------------------------------------------------------
  // DELETE ENTRY
  // ---------------------------------------------------------------------------

  const deleteEntry = useCallback(async (id: string): Promise<boolean> => {
    setError(null)

    try {
      const response = await fetch(`/api/journal-entries/${id}`, {
        method: 'DELETE',
        credentials: 'same-origin',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Fehler beim Löschen')
      }

      // Remove from list
      setEntries((prev) => prev.filter((e) => e.id !== id))
      setTotal((prev) => prev - 1)

      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler')
      return false
    }
  }, [])

  // ---------------------------------------------------------------------------
  // MEDIA OPERATIONS
  // ---------------------------------------------------------------------------

  const addMedia = useCallback(async (
    entryId: string,
    assetId: string,
    role: 'ATTACHMENT' | 'SOURCE' | 'GALLERY',
    transcript?: string,
    transcriptModel?: string
  ): Promise<boolean> => {
    setError(null)

    try {
      const response = await fetch(`/api/journal-entries/${entryId}/media`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ assetId, role, transcript, transcriptModel }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Fehler beim Hinzufügen')
      }

      const data = await response.json()
      const updatedEntry = data.entry as EntryWithRelations

      // Update in list
      setEntries((prev) => prev.map((e) => (e.id === entryId ? updatedEntry : e)))

      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler')
      return false
    }
  }, [])

  const removeMedia = useCallback(async (entryId: string, attachmentId: string): Promise<boolean> => {
    setError(null)

    try {
      const response = await fetch(`/api/journal-entries/${entryId}/media/${attachmentId}`, {
        method: 'DELETE',
        credentials: 'same-origin',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Fehler beim Löschen')
      }

      const data = await response.json()
      const updatedEntry = data.entry as EntryWithRelations

      // Update in list
      setEntries((prev) => prev.map((e) => (e.id === entryId ? updatedEntry : e)))

      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler')
      return false
    }
  }, [])

  const updateTranscript = useCallback(async (
    entryId: string,
    attachmentId: string,
    transcript: string,
    transcriptModel?: string
  ): Promise<boolean> => {
    setError(null)

    try {
      const response = await fetch(`/api/journal-entries/${entryId}/media/${attachmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ transcript, transcriptModel }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Fehler beim Aktualisieren')
      }

      const data = await response.json()
      const updatedEntry = data.entry as EntryWithRelations

      // Update in list
      setEntries((prev) => prev.map((e) => (e.id === entryId ? updatedEntry : e)))

      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler')
      return false
    }
  }, [])

  // ---------------------------------------------------------------------------
  // AI OPERATIONS
  // ---------------------------------------------------------------------------

  const runPipeline = useCallback(async (entryId: string): Promise<boolean> => {
    setError(null)
    console.log('[runPipeline] Starting for entry:', entryId)

    try {
      const response = await fetch('/api/journal-ai/pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ journalEntryId: entryId }),
      })

      const data = await response.json()
      console.log('[runPipeline] Response:', response.status, data)

      if (!response.ok) {
        throw new Error(data.error || 'AI-Pipeline fehlgeschlagen')
      }

      // Log individual step results for debugging
      if (data.steps) {
        for (const step of data.steps) {
          if (!step.success) {
            console.warn(`[runPipeline] Step "${step.step}" failed:`, step.error)
          }
        }
      }

      // Refetch the entry to get updated data
      const entryResponse = await fetch(`/api/journal-entries/${entryId}`, {
        credentials: 'same-origin',
      })

      if (entryResponse.ok) {
        const entryData = await entryResponse.json()
        const updatedEntry = entryData.entry as EntryWithRelations
        setEntries((prev) => prev.map((e) => (e.id === entryId ? updatedEntry : e)))
      }

      // Return false if all steps failed
      const allFailed = data.steps?.every((s: { success: boolean }) => !s.success)
      if (allFailed && data.steps?.length > 0) {
        const errors = data.steps.map((s: { step: string; error?: string }) => `${s.step}: ${s.error}`).join('; ')
        throw new Error(`Alle Pipeline-Schritte fehlgeschlagen: ${errors}`)
      }

      return true
    } catch (err) {
      console.error('[runPipeline] Error:', err)
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler')
      return false
    }
  }, [])

  const generateTitle = useCallback(async (entryId: string): Promise<string | null> => {
    setError(null)

    try {
      // Get entry content
      const entry = entries.find((e) => e.id === entryId)
      if (!entry) {
        throw new Error('Eintrag nicht gefunden')
      }

      const response = await fetch('/api/generate-title', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ text: entry.content }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Titel-Generierung fehlgeschlagen')
      }

      const data = await response.json()
      const title = data.title as string

      // Update entry with new title
      await updateEntry(entryId, { title })

      return title
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler')
      return null
    }
  }, [entries, updateEntry])

  // ---------------------------------------------------------------------------
  // PAGINATION & REFRESH
  // ---------------------------------------------------------------------------

  const loadMore = useCallback(async () => {
    if (isLoading || entries.length >= total) return
    await fetchEntries(false)
  }, [isLoading, entries.length, total, fetchEntries])

  const refetch = useCallback(async () => {
    await fetchEntries(true)
  }, [fetchEntries])

  // ---------------------------------------------------------------------------
  // RETURN
  // ---------------------------------------------------------------------------

  return {
    entries,
    total,
    isLoading,
    error,
    createEntry,
    updateEntry,
    deleteEntry,
    addMedia,
    removeMedia,
    updateTranscript,
    runPipeline,
    generateTitle,
    loadMore,
    refetch,
    setEntries,
  }
}
