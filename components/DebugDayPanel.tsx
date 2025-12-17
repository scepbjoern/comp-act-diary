'use client'

interface DebugDayPanelProps {
  debugData: {
    taggings: { id: string; taxonomyName: string; entityType: string }[]
    contacts: { id: string; name: string }[]
    locations: { id: string; name: string; lat?: number; lng?: number }[]
    measurements: { id: string; metricName: string; value: number; unit?: string }[]
  } | null
}

/**
 * Temporäres Debug-Panel für Import-Verifizierung.
 * Zeigt Taggings, Kontakte, Locations und Messungen pro Tag.
 */
export function DebugDayPanel({ debugData }: DebugDayPanelProps) {
  if (!debugData) return null

  const { taggings, contacts, locations, measurements } = debugData

  // Nur anzeigen wenn Daten vorhanden
  const hasData = taggings.length > 0 || contacts.length > 0 || locations.length > 0 || measurements.length > 0
  if (!hasData) return null

  return (
    <details className="card p-4 bg-yellow-900/20 border border-yellow-700/50">
      <summary className="cursor-pointer font-medium text-yellow-400 hover:text-yellow-300">
        🐛 Debug: Import-Daten ({taggings.length} Tags, {contacts.length} Kontakte, {locations.length} Orte, {measurements.length} Messungen)
      </summary>
      
      <div className="mt-4 space-y-4 text-sm">
        {/* Taggings */}
        {taggings.length > 0 && (
          <div>
            <h4 className="font-medium text-yellow-300 mb-2">🏷️ Taggings ({taggings.length})</h4>
            <div className="flex flex-wrap gap-1">
              {taggings.map((t) => (
                <span key={t.id} className="px-2 py-0.5 bg-yellow-800/50 rounded text-xs">
                  {t.taxonomyName}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Kontakte */}
        {contacts.length > 0 && (
          <div>
            <h4 className="font-medium text-yellow-300 mb-2">👥 Kontakte ({contacts.length})</h4>
            <div className="flex flex-wrap gap-1">
              {contacts.map((c) => (
                <span key={c.id} className="px-2 py-0.5 bg-blue-800/50 rounded text-xs">
                  {c.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Locations */}
        {locations.length > 0 && (
          <div>
            <h4 className="font-medium text-yellow-300 mb-2">📍 Locations ({locations.length})</h4>
            <div className="space-y-1">
              {locations.map((l) => (
                <div key={l.id} className="text-xs text-gray-300">
                  <span className="font-medium">{l.name}</span>
                  {l.lat && l.lng && (
                    <span className="text-gray-500 ml-2">
                      ({l.lat.toFixed(4)}, {l.lng.toFixed(4)})
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Messungen */}
        {measurements.length > 0 && (
          <div>
            <h4 className="font-medium text-yellow-300 mb-2">📊 Messungen ({measurements.length})</h4>
            <div className="space-y-1">
              {measurements.map((m) => (
                <div key={m.id} className="text-xs text-gray-300">
                  <span className="font-medium">{m.metricName}:</span>{' '}
                  <span>{m.value} {m.unit || ''}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </details>
  )
}
