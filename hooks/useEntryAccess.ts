/**
 * useEntryAccess Hook
 * Provides access checking and management for journal entries.
 */

import { useState, useCallback } from 'react'

interface AccessGrant {
  id: string
  userId: string
  userEmail: string | null
  userName: string | null
  role: 'VIEWER' | 'EDITOR'
  grantedByUserId: string | null
  createdAt: string
}

interface AccessInfo {
  entryId: string
  owner: {
    userId: string
    email: string | null
    name: string | null
  } | null
  grants: AccessGrant[]
}

interface UseEntryAccessReturn {
  /** Current access info */
  accessInfo: AccessInfo | null
  /** Loading state */
  loading: boolean
  /** Error message */
  error: string | null
  /** Load access grants for an entry */
  loadAccess: (entryId: string) => Promise<void>
  /** Grant access to a user by email */
  grantAccess: (entryId: string, email: string, role: 'VIEWER' | 'EDITOR') => Promise<boolean>
  /** Update access role */
  updateRole: (entryId: string, userId: string, role: 'VIEWER' | 'EDITOR') => Promise<boolean>
  /** Revoke access from a user */
  revokeAccess: (entryId: string, userId: string) => Promise<boolean>
}

/**
 * Hook for managing journal entry access grants.
 */
export function useEntryAccess(): UseEntryAccessReturn {
  const [accessInfo, setAccessInfo] = useState<AccessInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadAccess = useCallback(async (entryId: string) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/journal-entries/${entryId}/access`)
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Fehler beim Laden der Freigaben')
      }
      const data = await res.json()
      setAccessInfo({
        entryId: data.entryId,
        owner: data.owner,
        grants: data.grants || [],
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler')
    } finally {
      setLoading(false)
    }
  }, [])

  const grantAccess = useCallback(
    async (entryId: string, email: string, role: 'VIEWER' | 'EDITOR'): Promise<boolean> => {
      setError(null)
      try {
        const res = await fetch(`/api/journal-entries/${entryId}/access`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, role }),
        })
        const data = await res.json()
        if (!res.ok) {
          throw new Error(data.error || 'Fehler beim Freigeben')
        }
        if (accessInfo?.entryId === entryId) {
          setAccessInfo({ ...accessInfo, grants: data.grants || [] })
        }
        return true
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unbekannter Fehler')
        return false
      }
    },
    [accessInfo]
  )

  const updateRole = useCallback(
    async (entryId: string, userId: string, role: 'VIEWER' | 'EDITOR'): Promise<boolean> => {
      setError(null)
      try {
        const res = await fetch(`/api/journal-entries/${entryId}/access/${userId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role }),
        })
        const data = await res.json()
        if (!res.ok) {
          throw new Error(data.error || 'Fehler beim Ändern der Rolle')
        }
        if (accessInfo?.entryId === entryId) {
          setAccessInfo({ ...accessInfo, grants: data.grants || [] })
        }
        return true
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unbekannter Fehler')
        return false
      }
    },
    [accessInfo]
  )

  const revokeAccess = useCallback(
    async (entryId: string, userId: string): Promise<boolean> => {
      setError(null)
      try {
        const res = await fetch(`/api/journal-entries/${entryId}/access/${userId}`, {
          method: 'DELETE',
        })
        const data = await res.json()
        if (!res.ok) {
          throw new Error(data.error || 'Fehler beim Entfernen der Freigabe')
        }
        if (accessInfo?.entryId === entryId) {
          setAccessInfo({ ...accessInfo, grants: data.grants || [] })
        }
        return true
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unbekannter Fehler')
        return false
      }
    },
    [accessInfo]
  )

  return {
    accessInfo,
    loading,
    error,
    loadAccess,
    grantAccess,
    updateRole,
    revokeAccess,
  }
}
