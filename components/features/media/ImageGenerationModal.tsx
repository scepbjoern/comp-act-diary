'use client'

import { useState, useEffect } from 'react'
import { IconPhoto, IconX, IconSparkles } from '@tabler/icons-react'
import { DEFAULT_IMAGE_PROMPT, interpolateImagePrompt } from '@/lib/config/defaultImagePrompt'

interface ImageGenerationModalProps {
  isOpen: boolean
  onClose: () => void
  onGenerate: (finalPrompt: string) => void
  summaryText: string
  defaultPromptTemplate?: string
  generating?: boolean
  title?: string
}

export function ImageGenerationModal({
  isOpen,
  onClose,
  onGenerate,
  summaryText,
  defaultPromptTemplate = DEFAULT_IMAGE_PROMPT,
  generating = false,
  title = 'Bild generieren',
}: ImageGenerationModalProps) {
  const [promptTemplate, setPromptTemplate] = useState(defaultPromptTemplate)
  const [showPreview, setShowPreview] = useState(false)

  // Reset prompt when modal opens
  useEffect(() => {
    if (isOpen) {
      setPromptTemplate(defaultPromptTemplate)
      setShowPreview(false)
    }
  }, [isOpen, defaultPromptTemplate])

  if (!isOpen) return null

  const finalPrompt = interpolateImagePrompt(promptTemplate, summaryText)

  const handleGenerate = () => {
    onGenerate(finalPrompt)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div 
        className="bg-base-200 border border-base-300 rounded-xl p-4 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium flex items-center gap-2">
            <IconPhoto size={20} />
            {title}
          </h3>
          <button
            className="btn btn-ghost btn-sm btn-circle"
            onClick={onClose}
            disabled={generating}
          >
            <IconX size={18} />
          </button>
        </div>

        {/* Prompt Template */}
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">
              Prompt-Vorlage
              <span className="text-xs text-base-content/50 ml-2">
                ({"{{summary}}"} wird mit dem Text ersetzt)
              </span>
            </label>
            <textarea
              value={promptTemplate}
              onChange={(e) => setPromptTemplate(e.target.value)}
              rows={6}
              className="w-full bg-base-100 border border-base-300 rounded-lg px-3 py-2 text-sm font-mono resize-y"
              placeholder="Prompt-Vorlage eingeben..."
              disabled={generating}
            />
          </div>

          {/* Summary Preview */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Zusammenfassungs-Text (wird eingefügt)
            </label>
            <div className="bg-base-100 border border-base-300 rounded-lg px-3 py-2 text-sm max-h-32 overflow-y-auto">
              <p className="text-base-content/70 whitespace-pre-wrap">
                {summaryText || <span className="italic text-base-content/50">Kein Text vorhanden</span>}
              </p>
            </div>
          </div>

          {/* Final Prompt Preview */}
          <div>
            <button
              type="button"
              className="text-sm text-primary hover:underline mb-1"
              onClick={() => setShowPreview(!showPreview)}
            >
              {showPreview ? '▼ Finalen Prompt ausblenden' : '▶ Finalen Prompt anzeigen'}
            </button>
            {showPreview && (
              <div className="bg-base-300 border border-base-300 rounded-lg px-3 py-2 text-xs font-mono max-h-48 overflow-y-auto whitespace-pre-wrap">
                {finalPrompt}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 mt-4 pt-4 border-t border-base-300">
          <button
            className="btn btn-ghost btn-sm"
            onClick={onClose}
            disabled={generating}
          >
            Abbrechen
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={handleGenerate}
            disabled={generating || !summaryText.trim()}
          >
            {generating ? (
              <>
                <span className="loading loading-spinner loading-xs" />
                Generiere...
              </>
            ) : (
              <>
                <IconSparkles size={16} />
                Bild generieren
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
