/**
 * useTasksForEntry Hook
 * Fetches and manages tasks associated with a specific journal entry.
 * Provides loading state, error handling, and refetch capability.
 */

import { useState, useEffect, useCallback } from 'react'
import type { TaskCardData } from '@/components/features/tasks/TaskCard'

// =============================================================================
// TYPES
// =============================================================================

interface UseTasksForEntryResult {
  tasks: TaskCardData[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  pendingCount: number
}

// =============================================================================
// HOOK
// =============================================================================

export function useTasksForEntry(journalEntryId: string | null): UseTasksForEntryResult {
  const [tasks, setTasks] = useState<TaskCardData[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchTasks = useCallback(async () => {
    if (!journalEntryId) {
      setTasks([])
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/journal-entries/${journalEntryId}/tasks`)
      
      if (!res.ok) {
        if (res.status === 404) {
          setTasks([])
          return
        }
        throw new Error(`Fehler beim Laden der Aufgaben: ${res.status}`)
      }

      const data = await res.json()
      setTasks(data.tasks || [])
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unbekannter Fehler'
      setError(message)
      console.error('Error fetching tasks for entry:', err)
    } finally {
      setLoading(false)
    }
  }, [journalEntryId])

  // Fetch on mount and when journalEntryId changes
  useEffect(() => {
    void fetchTasks()
  }, [fetchTasks])

  // Calculate pending count
  const pendingCount = tasks.filter((t) => t.status === 'PENDING').length

  return {
    tasks,
    loading,
    error,
    refetch: fetchTasks,
    pendingCount,
  }
}

export default useTasksForEntry
