/**
 * Location Settings Page
 * Configuration for OwnTracks webhook, token management, and Google Timeline import.
 */

'use client'

import { useState, useEffect } from 'react'
import { IconMapPin, IconKey, IconUpload, IconCopy, IconTrash, IconPlus, IconExternalLink, IconSettings } from '@tabler/icons-react'

interface Token {
  id: string
  deviceName: string
  isActive: boolean
  lastUsedAt: string | null
  createdAt: string
  plainToken?: string
}

interface ImportStats {
  lastImportedDataAt: string | null
}

interface GeocodingSettings {
  clusterDistanceMeters: number
  knownLocationRadiusMeters: number
  includePoi: boolean
}

export default function LocationSettingsPage() {
  const [tokens, setTokens] = useState<Token[]>([])
  const [newTokenName, setNewTokenName] = useState('')
  const [newToken, setNewToken] = useState<Token | null>(null)
  const [loading, setLoading] = useState(true)
  const [importing, setImporting] = useState(false)
  const [importProgress, setImportProgress] = useState<string>('')
  const [importStats, setImportStats] = useState<ImportStats | null>(null)
  const [ungeocodedCount, setUngeocodedCount] = useState(0)
  const [error, setError] = useState<string | null>(null)
  
  // Geocoding settings
  const [geocodingSettings, setGeocodingSettings] = useState<GeocodingSettings>({
    clusterDistanceMeters: 50,
    knownLocationRadiusMeters: 100,
    includePoi: false,
  })
  const [savingSettings, setSavingSettings] = useState(false)

  // Get webhook URL
  const webhookUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/api/location/webhook`
    : ''

  // Load tokens and stats
  useEffect(() => {
    void loadData()
  }, [])

  async function loadData() {
    try {
      setLoading(true)
      
      // Load tokens
      const tokenRes = await fetch('/api/location/token')
      if (tokenRes.ok) {
        const data = await tokenRes.json()
        setTokens(data.tokens || [])
      }

      // Load geocoding settings
      const settingsRes = await fetch('/api/location/settings')
      if (settingsRes.ok) {
        const data = await settingsRes.json()
        if (data.settings) {
          setGeocodingSettings({
            clusterDistanceMeters: data.settings.clusterDistanceMeters ?? 50,
            knownLocationRadiusMeters: data.settings.knownLocationRadiusMeters ?? 100,
            includePoi: data.settings.includePoi ?? false,
          })
        }
      }

      // Load ungeocoded count
      const pointsRes = await fetch('/api/location/raw-points?ungeocodedOnly=true&limit=1')
      if (pointsRes.ok) {
        const data = await pointsRes.json()
        setUngeocodedCount(data.count || 0)
      }

    } catch (_err) {
      setError('Fehler beim Laden der Daten')
    } finally {
      setLoading(false)
    }
  }

  async function saveGeocodingSettings() {
    try {
      setSavingSettings(true)
      const res = await fetch('/api/location/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(geocodingSettings),
      })
      if (!res.ok) {
        throw new Error('Speichern fehlgeschlagen')
      }
    } catch (_err) {
      setError('Fehler beim Speichern der Einstellungen')
    } finally {
      setSavingSettings(false)
    }
  }

  async function createToken() {
    if (!newTokenName.trim()) return

    try {
      const res = await fetch('/api/location/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceName: newTokenName.trim() }),
      })

      if (res.ok) {
        const data = await res.json()
        setNewToken(data.token)
        setNewTokenName('')
        void loadData()
      } else {
        const data = await res.json()
        setError(data.error || 'Fehler beim Erstellen des Tokens')
      }
    } catch {
      setError('Fehler beim Erstellen des Tokens')
    }
  }

  async function deleteToken(id: string) {
    if (!confirm('Token wirklich löschen?')) return

    try {
      const res = await fetch(`/api/location/token/${id}`, { method: 'DELETE' })
      if (res.ok) {
        void loadData()
      }
    } catch {
      setError('Fehler beim Löschen des Tokens')
    }
  }

  async function handleImport(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      setImporting(true)
      setError(null)
      setImportProgress('Datei wird gelesen...')

      // Show file size info
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(1)
      setImportProgress(`Datei wird gelesen (${fileSizeMB} MB)...`)

      const content = await file.text()
      
      setImportProgress('JSON wird verarbeitet...')
      const json = JSON.parse(content)
      
      // Count items for progress info
      const itemCount = json?.timelineObjects?.length || json?.semanticSegments?.length || 0
      setImportProgress(`${itemCount} Einträge werden importiert... (kann bei großen Dateien >1 Min dauern)`)

      const res = await fetch('/api/location/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(json),
      })

      const data = await res.json()

      if (res.ok) {
        setImportProgress('')
        alert(`Import erfolgreich!\n\nGesamt: ${data.total}\nNeu: ${data.new}\nGematcht: ${data.matched}\nUngeokodiert: ${data.ungeocoded}\nÜbersprungen: ${data.skipped}`)
        setImportStats({ lastImportedDataAt: data.lastImportedDataAt })
        setUngeocodedCount(prev => prev + data.ungeocoded)
      } else {
        setError(data.error || 'Import fehlgeschlagen')
      }
    } catch (_err) {
      setError('Fehler beim Importieren der Datei')
    } finally {
      setImporting(false)
      setImportProgress('')
      // Reset file input
      event.target.value = ''
    }
  }

  function copyToClipboard(text: string) {
    void navigator.clipboard.writeText(text)
    alert('In Zwischenablage kopiert!')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <IconMapPin className="w-7 h-7" />
        Standort-Tracking
      </h1>

      {error && (
        <div className="alert alert-error mb-4">
          <span>{error}</span>
          <button className="btn btn-sm btn-ghost" onClick={() => setError(null)}>×</button>
        </div>
      )}

      {/* OwnTracks Webhook Section */}
      <div className="card bg-base-200 mb-6">
        <div className="card-body">
          <h2 className="card-title">
            <IconMapPin className="w-5 h-5" />
            OwnTracks Webhook
          </h2>
          
          <div className="form-control">
            <label className="label">
              <span className="label-text font-medium">Webhook-URL für OwnTracks</span>
            </label>
            <div className="join w-full">
              <input
                type="text"
                value={webhookUrl}
                readOnly
                className="input input-bordered join-item flex-1 font-mono text-sm"
              />
              <button 
                className="btn btn-primary join-item"
                onClick={() => copyToClipboard(webhookUrl)}
              >
                <IconCopy className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="alert alert-info mt-4">
            <div>
              <p className="font-medium">OwnTracks einrichten:</p>
              <ol className="list-decimal list-inside text-sm mt-2 space-y-1">
                <li>OwnTracks App installieren (Play Store / App Store)</li>
                <li>Einstellungen → Verbindung → Modus: <strong>HTTP</strong></li>
                <li>URL: Obige Webhook-URL eingeben</li>
                <li>Identifikation → <strong>Benutzername</strong>: beliebiger Name (z.B. &quot;mein-handy&quot;)</li>
                <li>Identifikation → <strong>Passwort</strong>: Token von unten einfügen</li>
                <li>Geräte-ID und Tracker-ID: können auf Standard bleiben</li>
                <li>Überwachung → Modus: <strong>Signifikant</strong> (spart Akku)</li>
              </ol>
              <p className="text-xs mt-2 text-base-content/70">
                OwnTracks nutzt HTTP Basic Auth. Der Benutzername dient nur zur Identifikation, 
                das Passwort ist der Token zur Authentifizierung.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Token Management Section */}
      <div className="card bg-base-200 mb-6">
        <div className="card-body">
          <h2 className="card-title">
            <IconKey className="w-5 h-5" />
            API-Tokens
          </h2>

          {/* New Token Display */}
          {newToken?.plainToken && (
            <div className="alert alert-warning mb-4">
              <div className="w-full">
                <p className="font-bold">⚠️ Neuer Token erstellt - nur einmal sichtbar!</p>
                <div className="join w-full mt-2">
                  <input
                    type="text"
                    value={newToken.plainToken}
                    readOnly
                    className="input input-bordered join-item flex-1 font-mono text-xs"
                  />
                  <button 
                    className="btn btn-warning join-item"
                    onClick={() => copyToClipboard(newToken.plainToken!)}
                  >
                    <IconCopy className="w-4 h-4" />
                  </button>
                </div>
                <button 
                  className="btn btn-sm btn-ghost mt-2"
                  onClick={() => setNewToken(null)}
                >
                  Verstanden, Token gespeichert
                </button>
              </div>
            </div>
          )}

          {/* Token List */}
          <div className="overflow-x-auto">
            <table className="table">
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
                        onClick={() => deleteToken(token.id)}
                      >
                        <IconTrash className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {tokens.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-center text-base-content/60">
                      Keine Tokens vorhanden
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Create Token */}
          <div className="form-control mt-4">
            <div className="join w-full">
              <input
                type="text"
                placeholder="Gerätename (z.B. Pixel 7 Pro)"
                value={newTokenName}
                onChange={e => setNewTokenName(e.target.value)}
                className="input input-bordered join-item flex-1"
                onKeyDown={e => e.key === 'Enter' && createToken()}
              />
              <button 
                className="btn btn-primary join-item"
                onClick={createToken}
                disabled={!newTokenName.trim()}
              >
                <IconPlus className="w-4 h-4" />
                Token erstellen
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Google Timeline Import Section */}
      <div className="card bg-base-200 mb-6">
        <div className="card-body">
          <h2 className="card-title">
            <IconUpload className="w-5 h-5" />
            Google Timeline Import
          </h2>

          {importStats?.lastImportedDataAt && (
            <p className="text-sm text-base-content/70">
              Letzter Import: {new Date(importStats.lastImportedDataAt).toLocaleString('de-CH')}
            </p>
          )}

          <div className="form-control mt-2">
            <label className="label">
              <span className="label-text">JSON-Datei von Google Timeline exportieren und hier hochladen</span>
            </label>
            <input
              type="file"
              accept=".json,application/json"
              onChange={handleImport}
              disabled={importing}
              className="file-input file-input-bordered w-full"
            />
          </div>

          {importing && (
            <div className="flex items-center gap-2 mt-2 p-3 bg-base-300 rounded-lg">
              <span className="loading loading-spinner loading-sm"></span>
              <div>
                <span className="font-medium">Import läuft...</span>
                {importProgress && (
                  <p className="text-sm text-base-content/70">{importProgress}</p>
                )}
              </div>
            </div>
          )}

          <div className="alert mt-4">
            <div>
              <p className="font-medium">So exportierst du deine Timeline:</p>
              <ol className="list-decimal list-inside text-sm mt-2 space-y-1">
                <li>Android: Einstellungen → Standort → Zeitachse</li>
                <li>Menü (⋮) → Zeitachsendaten exportieren</li>
                <li>JSON-Datei auf PC übertragen</li>
                <li>Hier hochladen (nur neue Daten werden importiert)</li>
              </ol>
            </div>
          </div>
        </div>
      </div>

      {/* Geocoding Settings Section */}
      <div className="card bg-base-200 mb-6">
        <div className="card-body">
          <h2 className="card-title">
            <IconSettings className="w-5 h-5" />
            Geocoding-Einstellungen
          </h2>

          <div className="grid gap-4 mt-2">
            {/* Cluster Distance */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Cluster-Distanz (Meter)</span>
                <span className="label-text-alt">{geocodingSettings.clusterDistanceMeters}m</span>
              </label>
              <input
                type="range"
                min="10"
                max="200"
                step="10"
                value={geocodingSettings.clusterDistanceMeters}
                onChange={e => setGeocodingSettings(s => ({ ...s, clusterDistanceMeters: parseInt(e.target.value) }))}
                className="range range-primary range-sm"
              />
              <p className="text-xs text-base-content/60 mt-1">
                Punkte innerhalb dieser Distanz werden zusammengefasst (spart API-Kosten)
              </p>
            </div>

            {/* Known Location Radius */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Bekannte Orte Radius (Meter)</span>
                <span className="label-text-alt">{geocodingSettings.knownLocationRadiusMeters}m</span>
              </label>
              <input
                type="range"
                min="25"
                max="500"
                step="25"
                value={geocodingSettings.knownLocationRadiusMeters}
                onChange={e => setGeocodingSettings(s => ({ ...s, knownLocationRadiusMeters: parseInt(e.target.value) }))}
                className="range range-primary range-sm"
              />
              <p className="text-xs text-base-content/60 mt-1">
                Punkte innerhalb dieses Radius werden automatisch einem bekannten Ort zugeordnet
              </p>
            </div>

            {/* Include POI */}
            <div className="form-control">
              <label className="label cursor-pointer justify-start gap-3">
                <input
                  type="checkbox"
                  checked={geocodingSettings.includePoi}
                  onChange={e => setGeocodingSettings(s => ({ ...s, includePoi: e.target.checked }))}
                  className="checkbox checkbox-primary"
                />
                <div>
                  <span className="label-text font-medium">POI-Suche aktivieren</span>
                  <p className="text-xs text-base-content/60">
                    Zusätzlich zu Adressen auch Points of Interest (Restaurants, Shops, etc.) suchen.
                    Nutzt die Search Box API (keine permanente Speicherung erlaubt).
                  </p>
                </div>
              </label>
            </div>

            <button
              className="btn btn-primary btn-sm w-fit"
              onClick={saveGeocodingSettings}
              disabled={savingSettings}
            >
              {savingSettings ? (
                <span className="loading loading-spinner loading-xs"></span>
              ) : (
                'Einstellungen speichern'
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Ungeocoded Points Section */}
      <div className="card bg-base-200">
        <div className="card-body">
          <div className="flex justify-between items-center">
            <h2 className="card-title">
              Ungeokodierte Punkte
              {ungeocodedCount > 0 && (
                <span className="badge badge-warning">{ungeocodedCount}</span>
              )}
            </h2>
            <a href="/batch/geocode" className="btn btn-primary btn-sm">
              <IconExternalLink className="w-4 h-4" />
              Batch-Geocoding
            </a>
          </div>

          <p className="text-sm text-base-content/70">
            GPS-Punkte ohne Adresse. Diese müssen manuell geocoded werden (Kosten: ~$0.005/Punkt).
          </p>
        </div>
      </div>
    </div>
  )
}
