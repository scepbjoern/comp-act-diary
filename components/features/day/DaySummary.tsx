'use client'

import { useState } from 'react'
import { Icon } from '@/components/ui/Icon'
import { MarkdownRenderer } from '@/components/features/editor/MarkdownRenderer'
import { useReadMode } from '@/hooks/useReadMode'

interface DaySummaryProps {
  dayId: string | null
  summary: {
    content: string
    model: string
    generatedAt: string
    sources: string[]
  } | null
  loading: boolean
  generateWithImage?: boolean
  onGenerate: (withImage: boolean) => void
  onRegenerate: (withImage: boolean) => void
  onDelete: () => void
}

/**
 * DaySummary Component - Extensible day summary section
 * 
 * Future enhancements:
 * - Add dashboard-style widgets
 * - Add multiple summary views/formats
 * - Add summary history/versions
 * - Add export functionality
 */
export function DaySummary({
  dayId,
  summary,
  loading,
  generateWithImage = true,
  onGenerate,
  onRegenerate,
  onDelete
}: DaySummaryProps) {
  const { readMode } = useReadMode()
  const [withImage, setWithImage] = useState(generateWithImage)

  if (!dayId) {
    return null
  }

  return (
    <div className="card p-4 md:p-4 p-2 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-medium">
          <span className="inline-flex items-center gap-1">
            <Icon name="summarize" />
            <span>Zusammenfassung</span>
          </span>
        </h2>
        
        {/* Hide regenerate/delete buttons in read mode */}
        {summary && !readMode && (
          <div className="flex items-center gap-2">
            <button
              className="btn btn-ghost btn-xs text-gray-400 hover:text-gray-200"
              onClick={() => onRegenerate(withImage)}
              disabled={loading}
              title="Neu generieren"
            >
              <Icon name="refresh" />
              <span className="md:inline hidden ml-1">Neu generieren</span>
            </button>
            <button
              className="btn btn-ghost btn-xs text-gray-400 hover:text-red-400"
              onClick={onDelete}
              disabled={loading}
              title="Löschen"
            >
              <Icon name="delete" />
              <span className="md:inline hidden ml-1">Löschen</span>
            </button>
          </div>
        )}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="loading loading-spinner loading-md"></div>
          <span className="ml-3 text-gray-400">Generiere Zusammenfassung...</span>
        </div>
      )}

      {/* Hide generate button in read mode, show info text instead */}
      {!loading && !summary && (
        readMode ? (
          <div className="text-center py-4">
            <p className="text-gray-400 text-sm">Keine Zusammenfassung vorhanden</p>
          </div>
        ) : (
          <div className="text-center py-8 space-y-3">
            <p className="text-gray-400 text-sm">
              Noch keine Zusammenfassung vorhanden
            </p>
            <label className="flex items-center justify-center gap-2 mb-2 cursor-pointer">
              <input
                type="checkbox"
                checked={withImage}
                onChange={(e) => setWithImage(e.target.checked)}
                className="w-4 h-4 accent-primary"
              />
              <span className="text-sm">Mit Bild generieren</span>
            </label>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => onGenerate(withImage)}
            >
              <Icon name="auto_awesome" />
              Zusammenfassung generieren
            </button>
          </div>
        )
      )}

      {!loading && summary && (
        <div className="space-y-3">
          <div className="prose prose-invert prose-sm max-w-none">
            <MarkdownRenderer markdown={summary.content} />
          </div>
          
          <details className="text-xs text-gray-500">
            <summary className="cursor-pointer hover:text-gray-400">
              Metadaten
            </summary>
            <div className="mt-2 space-y-1 pl-4">
              <div><strong>Modell:</strong> {summary.model}</div>
              <div><strong>Generiert:</strong> {new Date(summary.generatedAt).toLocaleString('de-DE')}</div>
              <div><strong>Quellen:</strong> {summary.sources.length} Einträge</div>
            </div>
          </details>
        </div>
      )}
    </div>
  )
}
