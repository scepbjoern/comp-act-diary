'use client'

import { useState, useEffect, useCallback } from 'react'
import { IconKey, IconPlus, IconTrash, IconCopy, IconCheck, IconRefresh, IconExternalLink } from '@tabler/icons-react'
import Link from 'next/link'

// =============================================================================
// TYPES
// =============================================================================

interface WebhookToken {
  id: string
  deviceName: string
  providerType: string
  isActive: boolean
  lastUsedAt: string | null
  createdAt: string
  plainToken?: string
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function CalendarSettingsPage() {
  const [tokens, setTokens] = useState<WebhookToken[]>([])
  const [loading, setLoading] = useState(true)
  const [newTokenName, setNewTokenName] = useState('')
  const [newToken, setNewToken] = useState<string | null>(null)
  const [copiedToken, setCopiedToken] = useState(false)
  const [creating, setCreating] = useState(false)
  const [rematchResult, setRematchResult] = useState<{ matched: number; total: number } | null>(null)
  const [rematching, setRematching] = useState(false)

  // Load tokens
  const loadTokens = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/calendar/token')
      if (res.ok) {
        const data = await res.json()
        setTokens(data.tokens || [])
      }
    } catch (error) {
      console.error('Failed to load tokens:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadTokens()
  }, [loadTokens])

  // Create token
  const createToken = async () => {
    if (!newTokenName.trim() || creating) return

    setCreating(true)
    try {
      const res = await fetch('/api/calendar/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceName: newTokenName.trim() }),
      })

      if (res.ok) {
        const data = await res.json()
        setNewToken(data.token.plainToken)
        setNewTokenName('')
        void loadTokens()
      }
    } catch (error) {
      console.error('Failed to create token:', error)
    } finally {
      setCreating(false)
    }
  }

  // Delete token
  const deleteToken = async (tokenId: string) => {
    if (!confirm('Token wirklich löschen?')) return

    try {
      const res = await fetch(`/api/calendar/token/${tokenId}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        void loadTokens()
      }
    } catch (error) {
      console.error('Failed to delete token:', error)
    }
  }

  // Copy token to clipboard
  const copyToken = async (token: string) => {
    await navigator.clipboard.writeText(token)
    setCopiedToken(true)
    setTimeout(() => setCopiedToken(false), 2000)
  }

  // Re-match events
  const runRematch = async () => {
    setRematching(true)
    setRematchResult(null)
    try {
      const res = await fetch('/api/calendar/rematch', {
        method: 'POST',
      })
      if (res.ok) {
        const data = await res.json()
        setRematchResult({ matched: data.matched, total: data.total })
      }
    } catch (error) {
      console.error('Failed to rematch:', error)
    } finally {
      setRematching(false)
    }
  }

  // Webhook URL
  const webhookUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/api/calendar/webhook`
    : '/api/calendar/webhook'

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Kalender-Einstellungen</h1>
          <p className="text-base-content/60 mt-1">
            Konfiguration für die Tasker Kalender-Synchronisation
          </p>
        </div>
        <Link href="/calendar" className="btn btn-ghost btn-sm">
          ← Zurück zum Kalender
        </Link>
      </div>

      {/* Webhook URL Info */}
      <div className="card bg-base-100 shadow mb-6">
        <div className="card-body">
          <h2 className="card-title text-lg">Webhook-URL</h2>
          <p className="text-sm text-base-content/70 mb-3">
            Diese URL in Tasker als HTTP-Ziel für den Kalender-Sync verwenden:
          </p>
          <div className="flex items-center gap-2 bg-base-200 p-3 rounded-lg">
            <code className="flex-1 text-sm break-all">{webhookUrl}</code>
            <button 
              onClick={() => void copyToken(webhookUrl)}
              className="btn btn-ghost btn-sm btn-square"
              title="URL kopieren"
            >
              <IconCopy className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Token Management */}
      <div className="card bg-base-100 shadow mb-6">
        <div className="card-body">
          <h2 className="card-title text-lg flex items-center gap-2">
            <IconKey className="w-5 h-5" />
            Authentifizierungs-Tokens
          </h2>
          <p className="text-sm text-base-content/70 mb-4">
            Token für die Authentifizierung der Tasker HTTP-Requests erstellen.
          </p>

          {/* Create Token Form */}
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              placeholder="Gerätename (z.B. Pixel 7 Pro)"
              value={newTokenName}
              onChange={(e) => setNewTokenName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void createToken()}
              className="input input-bordered flex-1"
              maxLength={50}
            />
            <button
              onClick={() => void createToken()}
              disabled={!newTokenName.trim() || creating}
              className="btn btn-primary"
            >
              {creating ? (
                <span className="loading loading-spinner loading-sm"></span>
              ) : (
                <>
                  <IconPlus className="w-4 h-4" />
                  Token erstellen
                </>
              )}
            </button>
          </div>

          {/* New Token Display */}
          {newToken && (
            <div className="alert alert-success mb-4">
              <div className="flex-1">
                <p className="font-medium">Token erstellt!</p>
                <p className="text-sm mb-2">
                  Achtung: Dieser Token wird nur einmal angezeigt. Jetzt kopieren!
                </p>
                <div className="flex items-center gap-2 bg-success/20 p-2 rounded">
                  <code className="flex-1 text-sm font-mono break-all">{newToken}</code>
                  <button
                    onClick={() => void copyToken(newToken)}
                    className="btn btn-ghost btn-sm btn-square"
                  >
                    {copiedToken ? (
                      <IconCheck className="w-4 h-4 text-success" />
                    ) : (
                      <IconCopy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
              <button
                onClick={() => setNewToken(null)}
                className="btn btn-ghost btn-sm"
              >
                Schliessen
              </button>
            </div>
          )}

          {/* Token List */}
          {loading ? (
            <div className="flex justify-center py-4">
              <span className="loading loading-spinner loading-md"></span>
            </div>
          ) : tokens.length === 0 ? (
            <p className="text-center text-base-content/60 py-4">
              Noch keine Tokens erstellt
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>Gerät</th>
                    <th>Zuletzt verwendet</th>
                    <th>Erstellt</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {tokens.map(token => (
                    <tr key={token.id}>
                      <td className="font-medium">{token.deviceName}</td>
                      <td>
                        {token.lastUsedAt 
                          ? new Date(token.lastUsedAt).toLocaleString('de-CH')
                          : 'Nie'}
                      </td>
                      <td>{new Date(token.createdAt).toLocaleDateString('de-CH')}</td>
                      <td>
                        <button 
                          className="btn btn-ghost btn-sm text-error"
                          onClick={() => void deleteToken(token.id)}
                        >
                          <IconTrash className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Pattern Matching */}
      <div className="card bg-base-100 shadow mb-6">
        <div className="card-body">
          <h2 className="card-title text-lg">Pattern-Matching</h2>
          <p className="text-sm text-base-content/70 mb-4">
            Verknüpfe Kalender-Orte automatisch mit deinen Locations via Regex-Patterns.
          </p>
          
          <div className="flex items-center gap-4">
            <Link href="/settings/match-patterns" className="btn btn-outline btn-sm">
              <IconExternalLink className="w-4 h-4" />
              Patterns verwalten
            </Link>
            
            <button 
              onClick={() => void runRematch()}
              disabled={rematching}
              className="btn btn-outline btn-sm"
            >
              {rematching ? (
                <span className="loading loading-spinner loading-sm"></span>
              ) : (
                <IconRefresh className="w-4 h-4" />
              )}
              Re-Match ausführen
            </button>
          </div>

          {rematchResult && (
            <div className="alert alert-info mt-4">
              <span>
                {rematchResult.matched} von {rematchResult.total} Events wurden gematcht.
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Tasker Setup Instructions */}
      <div className="card bg-base-100 shadow">
        <div className="card-body">
          <h2 className="card-title text-lg">Tasker-Einrichtung</h2>
          <div className="prose prose-sm max-w-none">
            <ol className="list-decimal list-inside space-y-2 text-base-content/80">
              <li>Installiere das <strong>AutoCalendar</strong>-Plugin für Tasker</li>
              <li>Erstelle einen neuen Task mit <strong>AutoCalendar Query</strong></li>
              <li>Füge ein <strong>HTTP Request</strong>-Action hinzu:
                <ul className="list-disc list-inside ml-4 mt-1">
                  <li>Method: <code>POST</code></li>
                  <li>URL: Webhook-URL von oben</li>
                  <li>Headers: <code>Authorization: Bearer &lt;token&gt;</code></li>
                  <li>Body: JSON-Array der Kalender-Events</li>
                </ul>
              </li>
              <li>Trigger den Task periodisch (z.B. alle 15 Min) oder bei Kalender-Änderungen</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  )
}
