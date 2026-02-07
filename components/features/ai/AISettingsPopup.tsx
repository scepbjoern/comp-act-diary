/**
 * AISettingsPopup - Read-only popup showing current AI settings for a template.
 * Fetches template AI config and provides a link to /settings/templates for editing.
 */

'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import {
  IconX,
  IconPencil,
  IconSearch,
  IconClipboard,
  IconSettings,
  IconAlertCircle,
  IconWaveSine,
} from '@tabler/icons-react'
import { useLlmModels, LlmModelData } from '@/hooks/useLlmModels'
import type { TemplateAIConfig } from '@/types/journal'

// =============================================================================
// TYPES
// =============================================================================

export interface AISettingsPopupProps {
  isOpen: boolean
  onClose: () => void
  /** Entry type name for the header display */
  typeName: string
  /** Template ID to load AI config from (if assigned) */
  templateId?: string | null
  /** Template name for display */
  templateName?: string | null
  /** @deprecated Use templateId instead - kept for backward compatibility */
  typeCode?: string
}

// =============================================================================
// HELPER
// =============================================================================

function getModelInfo(modelId: string, models: LlmModelData[]): { name: string; inputCost: string; outputCost: string } {
  const model = models.find((m) => m.modelId === modelId)
  return {
    name: model?.name || modelId.split('/').pop() || modelId,
    inputCost: model?.inputCost || '?',
    outputCost: model?.outputCost || '?',
  }
}

function truncatePrompt(prompt: string, maxLength = 320): string {
  if (prompt.length <= maxLength) return prompt
  return prompt.slice(0, maxLength).trim() + '...'
}

// =============================================================================
// HELPER COMPONENT
// =============================================================================

/** Renders a single AI config row (model + prompt) */
function AIConfigRow({
  icon,
  label,
  modelId,
  prompt,
  models,
}: {
  icon: React.ReactNode
  label: string
  modelId?: string
  prompt?: string
  models: LlmModelData[]
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 text-sm font-medium">
        {icon}
        {label}
      </div>
      <div className="text-sm text-base-content/70 pl-6">
        {modelId && (() => {
          const info = getModelInfo(modelId, models)
          return (
            <div>
              <span className="font-medium">Modell:</span>{' '}
              {info.name}{' '}
              <span className="text-xs opacity-60">({info.inputCost} / {info.outputCost})</span>
            </div>
          )
        })()}
        {prompt && (
          <div className="mt-1">
            <span className="font-medium">Prompt:</span>{' '}
            <span className="italic">
              &quot;{truncatePrompt(prompt)}&quot;
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

// =============================================================================
// COMPONENT
// =============================================================================

export function AISettingsPopup({
  isOpen,
  onClose,
  typeName,
  templateId,
  templateName,
  typeCode: _typeCode,
}: AISettingsPopupProps) {
  const modalRef = useRef<HTMLDivElement>(null)
  const { models } = useLlmModels()
  const [aiConfig, setAiConfig] = useState<TemplateAIConfig | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)

  // Fetch template AI config when popup opens
  const fetchTemplateConfig = useCallback(async () => {
    if (!templateId) {
      setAiConfig(null)
      return
    }
    setIsLoading(true)
    setFetchError(null)
    try {
      const res = await fetch(`/api/templates/${templateId}`)
      if (!res.ok) throw new Error('Template nicht gefunden')
      const data = await res.json()
      setAiConfig(data.template?.aiConfig || null)
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : 'Fehler beim Laden')
    } finally {
      setIsLoading(false)
    }
  }, [templateId])

  useEffect(() => {
    if (isOpen && templateId) {
      void fetchTemplateConfig()
    }
  }, [isOpen, templateId, fetchTemplateConfig])

  // Close on escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    if (isOpen) {
      // Small delay to prevent immediate close from the click that opened it
      const timer = setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside)
      }, 100)
      return () => {
        clearTimeout(timer)
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const content = (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div
        ref={modalRef}
        className="bg-base-100 rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[80vh] overflow-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-base-300">
          <h3 className="font-semibold">AI-Einstellungen: {typeName}</h3>
          <button
            type="button"
            className="btn btn-ghost btn-sm btn-square"
            onClick={onClose}
          >
            <IconX size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <span className="loading loading-spinner loading-md" />
            </div>
          ) : fetchError ? (
            <div className="flex items-center gap-2 text-error text-sm py-4">
              <IconAlertCircle size={18} />
              {fetchError}
            </div>
          ) : !templateId ? (
            <div className="text-sm text-base-content/60 py-4">
              Kein Template zugewiesen. AI-Einstellungen werden über Templates konfiguriert.
            </div>
          ) : !aiConfig ? (
            <div className="text-sm text-base-content/60 py-4">
              Keine AI-Konfiguration für dieses Template hinterlegt.
              Standard-Einstellungen werden verwendet.
            </div>
          ) : (
            <>
              {/* Template name */}
              {templateName && (
                <div className="text-sm text-base-content/60">
                  Template: <span className="font-medium text-base-content">{templateName}</span>
                </div>
              )}

              {/* Content Generation */}
              {(aiConfig.contentModel || aiConfig.contentPrompt) && (
                <AIConfigRow
                  icon={<IconPencil size={16} className="text-primary" />}
                  label="Content-Generierung"
                  modelId={aiConfig.contentModel}
                  prompt={aiConfig.contentPrompt}
                  models={models}
                />
              )}

              {/* Analysis */}
              {(aiConfig.analysisModel || aiConfig.analysisPrompt) && (
                <AIConfigRow
                  icon={<IconSearch size={16} className="text-warning" />}
                  label="Analyse"
                  modelId={aiConfig.analysisModel}
                  prompt={aiConfig.analysisPrompt}
                  models={models}
                />
              )}

              {/* Summary */}
              {(aiConfig.summaryModel || aiConfig.summaryPrompt) && (
                <AIConfigRow
                  icon={<IconClipboard size={16} className="text-info" />}
                  label="Zusammenfassung"
                  modelId={aiConfig.summaryModel}
                  prompt={aiConfig.summaryPrompt}
                  models={models}
                />
              )}

              {/* Title */}
              {(aiConfig.titleModel || aiConfig.titlePrompt) && (
                <AIConfigRow
                  icon={<IconPencil size={16} className="text-success" />}
                  label="Titel-Generierung"
                  modelId={aiConfig.titleModel}
                  prompt={aiConfig.titlePrompt}
                  models={models}
                />
              )}

              {/* Audio Segmentation */}
              {(aiConfig.segmentationModel || aiConfig.segmentationPrompt) && (
                <AIConfigRow
                  icon={<IconWaveSine size={16} className="text-accent" />}
                  label="Audio-Segmentierung"
                  modelId={aiConfig.segmentationModel}
                  prompt={aiConfig.segmentationPrompt}
                  models={models}
                />
              )}

              {/* Show fallback if no config sections are set */}
              {!aiConfig.contentModel && !aiConfig.contentPrompt &&
               !aiConfig.analysisModel && !aiConfig.analysisPrompt &&
               !aiConfig.summaryModel && !aiConfig.summaryPrompt &&
               !aiConfig.titleModel && !aiConfig.titlePrompt &&
               !aiConfig.segmentationModel && !aiConfig.segmentationPrompt && (
                <div className="text-sm text-base-content/60 py-2">
                  Keine spezifischen Einstellungen konfiguriert.
                  Standard-Einstellungen werden verwendet.
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-base-300">
          <a
            href="/settings/templates"
            className="btn btn-primary btn-block"
            onClick={onClose}
          >
            <IconSettings size={18} />
            Einstellungen bearbeiten
          </a>
        </div>
      </div>
    </div>
  )

  // Use portal to render outside component hierarchy
  if (typeof window !== 'undefined') {
    return createPortal(content, document.body)
  }

  return null
}
