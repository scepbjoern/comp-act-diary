'use client'

import { useState, useEffect } from 'react'
import { IconBrandGoogle, IconRefresh, IconCheck, IconX, IconLink, IconLinkOff } from '@tabler/icons-react'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'

interface SyncStatus {
  isConnected: boolean
  lastSyncAt: string | null
  syncToken: string | null
}

interface SyncResult {
  created: number
  updated: number
  skipped: number
  errors: string[]
}

export default function GoogleSyncStatus() {
  const [status, setStatus] = useState<SyncStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null)

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
    fetchStatus()
  }, [])

  const handleConnect = async () => {
    setConnecting(true)
    try {
      const res = await fetch('/api/sync/google-contacts/auth')
      if (res.ok) {
        const { authUrl } = await res.json()
        window.location.href = authUrl
      }
    } catch (error) {
      console.error('Error connecting:', error)
    } finally {
      setConnecting(false)
    }
  }

  const handleDisconnect = async () => {
    if (!confirm('Möchtest du die Verbindung zu Google Contacts wirklich trennen?')) return
    
    try {
      const res = await fetch('/api/sync/google-contacts/status', { method: 'DELETE' })
      if (res.ok) {
        setStatus({ isConnected: false, lastSyncAt: null, syncToken: null })
      }
    } catch (error) {
      console.error('Error disconnecting:', error)
    }
  }

  const handleSync = async () => {
    setSyncing(true)
    setLastSyncResult(null)
    try {
      const res = await fetch('/api/sync/google-contacts/sync', { method: 'POST' })
      if (res.ok) {
        const result = await res.json()
        if (result.success) {
          setLastSyncResult({
            created: result.stats?.created || 0,
            updated: result.stats?.updated || 0,
            skipped: result.stats?.skipped || 0,
            errors: result.stats?.errors || [],
          })
          await fetchStatus()
        } else {
          alert(`Sync fehlgeschlagen: ${result.error}`)
        }
      }
    } catch (error) {
      console.error('Error syncing:', error)
    } finally {
      setSyncing(false)
    }
  }

  if (loading) {
    return (
      <div className="card bg-base-100 shadow-sm border border-base-200">
        <div className="card-body">
          <div className="flex items-center gap-3">
            <span className="loading loading-spinner loading-sm"></span>
            <span>Lade Google Sync Status...</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="card bg-base-100 shadow-sm border border-base-200">
      <div className="card-body">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-full ${status?.isConnected ? 'bg-success/10 text-success' : 'bg-base-200'}`}>
            <IconBrandGoogle size={24} />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold">Google Contacts</h3>
            <p className="text-sm text-base-content/60">
              {status?.isConnected ? (
                <>
                  <IconCheck size={14} className="inline text-success mr-1" />
                  Verbunden
                  {status.lastSyncAt && (
                    <span className="ml-2">
                      • Letzter Sync: {format(new Date(status.lastSyncAt), 'd. MMM yyyy, HH:mm', { locale: de })}
                    </span>
                  )}
                </>
              ) : (
                <>
                  <IconX size={14} className="inline text-error mr-1" />
                  Nicht verbunden
                </>
              )}
            </p>
          </div>
        </div>

        {/* Sync Result Display */}
        {lastSyncResult && (
          <div className="mt-3 p-3 bg-base-200 rounded-lg text-sm">
            <div className="font-medium mb-2">Sync-Ergebnis:</div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-success/10 text-success rounded p-2">
                <div className="text-lg font-bold">{lastSyncResult.created}</div>
                <div className="text-xs">Neu</div>
              </div>
              <div className="bg-info/10 text-info rounded p-2">
                <div className="text-lg font-bold">{lastSyncResult.updated}</div>
                <div className="text-xs">Aktualisiert</div>
              </div>
              <div className="bg-base-300 rounded p-2">
                <div className="text-lg font-bold">{lastSyncResult.skipped}</div>
                <div className="text-xs">Übersprungen</div>
              </div>
            </div>
            {lastSyncResult.errors.length > 0 && (
              <div className="mt-2 text-error text-xs">
                {lastSyncResult.errors.length} Fehler aufgetreten
              </div>
            )}
          </div>
        )}

        <div className="flex gap-2 mt-4">
          {status?.isConnected ? (
            <>
              <button
                onClick={handleSync}
                disabled={syncing}
                className="btn btn-primary btn-sm flex-1"
              >
                {syncing ? (
                  <span className="loading loading-spinner loading-xs"></span>
                ) : (
                  <IconRefresh size={16} />
                )}
                {syncing ? 'Synchronisiere...' : 'Jetzt synchronisieren'}
              </button>
              <button
                onClick={handleDisconnect}
                className="btn btn-ghost btn-sm text-error"
              >
                <IconLinkOff size={16} />
                Trennen
              </button>
            </>
          ) : (
            <button
              onClick={handleConnect}
              disabled={connecting}
              className="btn btn-primary btn-sm flex-1"
            >
              {connecting ? (
                <span className="loading loading-spinner loading-xs"></span>
              ) : (
                <IconLink size={16} />
              )}
              Mit Google verbinden
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
