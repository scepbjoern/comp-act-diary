/**
 * ShareEntryModal Component
 * Modal for managing access grants on a journal entry.
 * Allows granting, updating, and revoking access to other users.
 */

'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import {
  IconX,
  IconTrash,
  IconUserPlus,
  IconLoader2,
  IconCheck,
  IconAlertCircle,
} from '@tabler/icons-react'

interface AccessGrant {
  id: string
  userId: string
  username: string
  userName: string | null
  role: 'VIEWER' | 'EDITOR'
  grantedByUserId: string | null
  createdAt: string
}

interface ShareEntryModalProps {
  /** Entry ID to manage access for */
  entryId: string
  /** Whether the modal is open */
  isOpen: boolean
  /** Callback when modal closes */
  onClose: () => void
  /** Callback when access grants change */
  onAccessChange?: () => void
}

export function ShareEntryModal({
  entryId,
  isOpen,
  onClose,
  onAccessChange,
}: ShareEntryModalProps) {
  const [grants, setGrants] = useState<AccessGrant[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // New grant form state - prefilled from user's sharing defaults
  const [newUsername, setNewUsername] = useState('')
  const [newRole, setNewRole] = useState<'VIEWER' | 'EDITOR'>('EDITOR')
  const [submitting, setSubmitting] = useState(false)
  const [defaultsLoaded, setDefaultsLoaded] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  // Load sharing defaults from user settings
  const loadDefaults = useCallback(async () => {
    if (defaultsLoaded) return
    try {
      const res = await fetch('/api/user/settings')
      if (res.ok) {
        const data = await res.json()
        const sharingDefaults = data.settings?.sharingDefaults
        if (sharingDefaults) {
          // Prefill with default partner if set
          if (sharingDefaults.defaultShareUsername) {
            setNewUsername(sharingDefaults.defaultShareUsername)
          }
          // Use default role (always EDITOR for quick sharing)
          if (sharingDefaults.defaultShareRole) {
            setNewRole(sharingDefaults.defaultShareRole)
          }
        }
      }
    } catch (err) {
      console.error('Failed to load sharing defaults:', err)
    } finally {
      setDefaultsLoaded(true)
    }
  }, [defaultsLoaded])

  // Load access grants
  const loadGrants = useCallback(async () => {
    if (!entryId) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/journal-entries/${entryId}/access`)
      if (!res.ok) {
        throw new Error('Fehler beim Laden der Freigaben')
      }
      const data = await res.json()
      setGrants(data.grants || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler')
    } finally {
      setLoading(false)
    }
  }, [entryId])

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (isOpen && entryId) {
      void loadGrants()
      void loadDefaults()
    }
  }, [isOpen, entryId, loadGrants, loadDefaults])

  // Grant access to new user
  const handleGrantAccess = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newUsername.trim()) return

    setSubmitting(true)
    setError(null)
    setSuccess(null)

    try {
      const res = await fetch(`/api/journal-entries/${entryId}/access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: newUsername.trim(), role: newRole }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Fehler beim Freigeben')
      }

      setGrants(data.grants || [])
      setNewUsername('')
      setSuccess('Freigabe erteilt')
      onAccessChange?.()

      // Clear success message after 3 seconds
      void setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler')
    } finally {
      setSubmitting(false)
    }
  }

  // Update access role
  const handleUpdateRole = async (userId: string, newRole: 'VIEWER' | 'EDITOR') => {
    setError(null)
    try {
      const res = await fetch(`/api/journal-entries/${entryId}/access/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Fehler beim Ändern der Rolle')
      }

      setGrants(data.grants || [])
      onAccessChange?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler')
    }
  }

  // Revoke access
  const handleRevokeAccess = async (userId: string) => {
    setError(null)
    try {
      const res = await fetch(`/api/journal-entries/${entryId}/access/${userId}`, {
        method: 'DELETE',
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Fehler beim Entfernen der Freigabe')
      }

      setGrants(data.grants || [])
      onAccessChange?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler')
    }
  }

  if (!isOpen || !isMounted) return null

  return createPortal(
    <dialog className="modal modal-open">
      <div className="modal-box max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg">Eintrag teilen</h3>
          <button
            type="button"
            className="btn btn-ghost btn-sm btn-circle"
            onClick={onClose}
          >
            <IconX size={20} />
          </button>
        </div>

        {/* Error/Success messages */}
        {error && (
          <div className="alert alert-error mb-4">
            <IconAlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="alert alert-success mb-4">
            <IconCheck size={20} />
            <span>{success}</span>
          </div>
        )}

        {/* Add new grant form */}
        <form onSubmit={handleGrantAccess} className="mb-6">
          <div className="flex gap-2">
            <input
              type="text"
              className="input input-bordered flex-1"
              placeholder="Benutzername"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              disabled={submitting}
              required
            />
            <select
              className="select select-bordered"
              value={newRole}
              onChange={(e) => setNewRole(e.target.value as 'VIEWER' | 'EDITOR')}
              disabled={submitting}
            >
              <option value="VIEWER">Viewer</option>
              <option value="EDITOR">Editor</option>
            </select>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting || !newUsername.trim()}
            >
              {submitting ? (
                <IconLoader2 size={20} className="animate-spin" />
              ) : (
                <IconUserPlus size={20} />
              )}
            </button>
          </div>
          <p className="text-xs text-base-content/60 mt-1">
            Viewer können lesen, Editoren können auch bearbeiten und löschen.
          </p>
        </form>

        {/* Existing grants list */}
        <div className="divider">Aktuelle Freigaben</div>

        {loading ? (
          <div className="flex justify-center py-4">
            <IconLoader2 size={24} className="animate-spin" />
          </div>
        ) : grants.length === 0 ? (
          <p className="text-center text-base-content/60 py-4">
            Noch keine Freigaben erteilt.
          </p>
        ) : (
          <ul className="space-y-2">
            {grants.map((grant) => (
              <li
                key={grant.id}
                className="flex items-center justify-between p-2 bg-base-200 rounded-lg"
              >
                <div className="flex-1">
                  <p className="font-medium">
                    {grant.userName || grant.username || 'Unbekannt'}
                  </p>
                  <p className="text-xs text-base-content/60">@{grant.username}</p>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    className="select select-bordered select-sm"
                    value={grant.role}
                    onChange={(e) =>
                      handleUpdateRole(grant.userId, e.target.value as 'VIEWER' | 'EDITOR')
                    }
                  >
                    <option value="VIEWER">Viewer</option>
                    <option value="EDITOR">Editor</option>
                  </select>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm btn-square text-error"
                    onClick={() => handleRevokeAccess(grant.userId)}
                    title="Freigabe entfernen"
                  >
                    <IconTrash size={16} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {/* Footer */}
        <div className="modal-action">
          <button type="button" className="btn" onClick={onClose}>
            Schliessen
          </button>
        </div>
      </div>
      <div className="modal-backdrop" onClick={onClose} />
    </dialog>,
    document.body
  )
}
