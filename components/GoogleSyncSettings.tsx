'use client'

import { useState, useEffect } from 'react'
import { IconBrandGoogle, IconRefresh, IconUnlink, IconCheck, IconX } from '@tabler/icons-react'
import { formatDistanceToNow } from 'date-fns'
import { de } from 'date-fns/locale'

interface SyncStatus {
  connected: boolean
  lastSyncAt?: string | null
  contactCount?: number
}

export default function GoogleSyncSettings() {
  const [status, setStatus] = useState<SyncStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/sync/google-contacts/status')
      if (res.ok) {
        const data = await res.json()
        setStatus(data)
      }
    } catch (error) {
      console.error('Error fetching sync status:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchStatus()
    
    // Check for google_connected query param
    const params = new URLSearchParams(window.location.search)
    if (params.get('google_connected') === 'true') {
      // Reload status after a brief delay to ensure backend is updated
      setTimeout(() => fetchStatus(), 500)
    }
  }, [])

  const handleConnect = async () => {
    try {
      const res = await fetch('/api/sync/google-contacts/auth')
      const data = await res.json()
      if (data.authUrl) {
        window.location.href = data.authUrl
      }
    } catch (error) {
      console.error('Error initiating OAuth:', error)
    }
  }

  const handleSync = async () => {
    setSyncing(true)
    try {
      const res = await fetch('/api/sync/google-contacts/sync', {
        method: 'POST',
      })
      if (res.ok) {
        await fetchStatus()
      }
    } catch (error) {
      console.error('Error syncing:', error)
    } finally {
      setSyncing(false)
    }
  }

  const handleDisconnect = async () => {
    if (!confirm('Möchtest du die Verbindung zu Google Kontakte wirklich trennen?')) {
      return
    }

    setDisconnecting(true)
    try {
      const res = await fetch('/api/sync/google-contacts/status', {
        method: 'DELETE',
      })
      if (res.ok) {
        setStatus({ connected: false })
      }
    } catch (error) {
      console.error('Error disconnecting:', error)
    } finally {
      setDisconnecting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2">
        <span className="loading loading-spinner loading-sm" />
        <span className="text-sm text-gray-400">Lade Status...</span>
      </div>
    )
  }

  if (!status?.connected) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm">
          <IconX size={16} className="text-error" />
          <span>Nicht verbunden</span>
        </div>
        <button
          className="pill flex items-center gap-2"
          onClick={handleConnect}
        >
          <IconBrandGoogle size={18} />
          Mit Google verbinden
        </button>
        <p className="text-xs text-gray-500">
          Nach der Verbindung werden deine Google Kontakte mit der App synchronisiert.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm">
        <IconCheck size={16} className="text-success" />
        <span>Verbunden mit Google</span>
      </div>

      {status.lastSyncAt && (
        <p className="text-xs text-gray-400">
          Letzte Synchronisation:{' '}
          {formatDistanceToNow(new Date(status.lastSyncAt), {
            addSuffix: true,
            locale: de,
          })}
        </p>
      )}

      {status.contactCount !== undefined && (
        <p className="text-xs text-gray-400">
          {status.contactCount} Kontakte synchronisiert
        </p>
      )}

      <div className="flex items-center gap-2">
        <button
          className="pill flex items-center gap-2"
          onClick={handleSync}
          disabled={syncing}
        >
          {syncing ? (
            <span className="loading loading-spinner loading-xs" />
          ) : (
            <IconRefresh size={16} />
          )}
          Jetzt synchronisieren
        </button>

        <button
          className="pill flex items-center gap-2 text-error"
          onClick={handleDisconnect}
          disabled={disconnecting}
        >
          {disconnecting ? (
            <span className="loading loading-spinner loading-xs" />
          ) : (
            <IconUnlink size={16} />
          )}
          Trennen
        </button>
      </div>
    </div>
  )
}
