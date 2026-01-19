/**
 * useSharedEntries Hook
 * Provides access to journal entries shared with the current user.
 */

import { useState, useCallback } from 'react'

interface SharedEntry {
  id: string
  title: string | null
  content: string
  occurredAt: string | null
  typeCode: string
  typeName: string
  ownerUserId: string
  ownerName: string | null
  accessRole: 'VIEWER' | 'EDITOR'
}

interface UseSharedEntriesReturn {
  /** Shared entries */
  entries: SharedEntry[]
  /** Loading state */
  loading: boolean
  /** Error message */
  error: string | null
  /** Load shared entries with optional date filter */
  loadSharedEntries: (dateFrom?: string, dateTo?: string) => Promise<void>
  /** Refresh shared entries */
  refresh: () => Promise<void>
}

/**
 * Hook for loading journal entries shared with the current user.
 */
export function useSharedEntries(): UseSharedEntriesReturn {
  const [entries, setEntries] = useState<SharedEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastDateFrom, setLastDateFrom] = useState<string | undefined>()
  const [lastDateTo, setLastDateTo] = useState<string | undefined>()

  const loadSharedEntries = useCallback(async (dateFrom?: string, dateTo?: string) => {
    setLoading(true)
    setError(null)
    setLastDateFrom(dateFrom)
    setLastDateTo(dateTo)

    try {
      const params = new URLSearchParams()
      if (dateFrom) params.set('dateFrom', dateFrom)
      if (dateTo) params.set('dateTo', dateTo)

      const url = `/api/journal-entries/shared${params.toString() ? `?${params}` : ''}`
      const res = await fetch(url)

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Fehler beim Laden der geteilten Einträge')
      }

      const data = await res.json()
      setEntries(data.entries || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler')
    } finally {
      setLoading(false)
    }
  }, [])

  const refresh = useCallback(async () => {
    await loadSharedEntries(lastDateFrom, lastDateTo)
  }, [loadSharedEntries, lastDateFrom, lastDateTo])

  return {
    entries,
    loading,
    error,
    loadSharedEntries,
    refresh,
  }
}
