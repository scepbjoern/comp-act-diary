/**
 * AISettingsPopup - Read-only popup showing current AI settings for a JournalEntryType.
 * Provides a link to the Settings page for editing.
 */

'use client'

import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import {
  IconX,
  IconPencil,
  IconSearch,
  IconClipboard,
  IconSettings,
} from '@tabler/icons-react'
import { useAISettings } from '@/hooks/useAISettings'
import { DEFAULT_LLM_MODELS } from '@/lib/llmModels'

// =============================================================================
// TYPES
// =============================================================================

export interface AISettingsPopupProps {
  isOpen: boolean
  onClose: () => void
  typeCode: string
  typeName: string
}

// =============================================================================
// HELPER
// =============================================================================

function getModelInfo(modelId: string): { name: string; inputCost: string; outputCost: string } {
  const model = DEFAULT_LLM_MODELS.find((m) => m.id === modelId)
  return {
    name: model?.name || modelId.split('/').pop() || modelId,
    inputCost: model?.inputCost || '?',
    outputCost: model?.outputCost || '?',
  }
}

function truncatePrompt(prompt: string, maxLength = 160): string {
  if (prompt.length <= maxLength) return prompt
  return prompt.slice(0, maxLength).trim() + '...'
}

// =============================================================================
// COMPONENT
// =============================================================================

export function AISettingsPopup({
  isOpen,
  onClose,
  typeCode,
  typeName,
}: AISettingsPopupProps) {
  const modalRef = useRef<HTMLDivElement>(null)
  const { getSettingsForType, isLoading } = useAISettings()

  const settings = getSettingsForType(typeCode)

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
          ) : (
            <>
              {/* Content Generation */}
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <IconPencil size={16} className="text-primary" />
                  Content-Generierung
                </div>
                <div className="text-sm text-base-content/70 pl-6">
                  {(() => {
                    const info = getModelInfo(settings.content.modelId)
                    return (
                      <div>
                        <span className="font-medium">Modell:</span>{' '}
                        {info.name}{' '}
                        <span className="text-xs opacity-60">({info.inputCost} / {info.outputCost})</span>
                      </div>
                    )
                  })()}
                  <div className="mt-1">
                    <span className="font-medium">Prompt:</span>{' '}
                    <span className="italic">
                      &quot;{truncatePrompt(settings.content.prompt)}&quot;
                    </span>
                  </div>
                </div>
              </div>

              {/* Analysis */}
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <IconSearch size={16} className="text-warning" />
                  Analyse
                </div>
                <div className="text-sm text-base-content/70 pl-6">
                  {(() => {
                    const info = getModelInfo(settings.analysis.modelId)
                    return (
                      <div>
                        <span className="font-medium">Modell:</span>{' '}
                        {info.name}{' '}
                        <span className="text-xs opacity-60">({info.inputCost} / {info.outputCost})</span>
                      </div>
                    )
                  })()}
                  <div className="mt-1">
                    <span className="font-medium">Prompt:</span>{' '}
                    <span className="italic">
                      &quot;{truncatePrompt(settings.analysis.prompt)}&quot;
                    </span>
                  </div>
                </div>
              </div>

              {/* Summary */}
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <IconClipboard size={16} className="text-info" />
                  Zusammenfassung
                </div>
                <div className="text-sm text-base-content/70 pl-6">
                  {(() => {
                    const info = getModelInfo(settings.summary.modelId)
                    return (
                      <div>
                        <span className="font-medium">Modell:</span>{' '}
                        {info.name}{' '}
                        <span className="text-xs opacity-60">({info.inputCost} / {info.outputCost})</span>
                      </div>
                    )
                  })()}
                  <div className="mt-1">
                    <span className="font-medium">Prompt:</span>{' '}
                    <span className="italic">
                      &quot;{truncatePrompt(settings.summary.prompt)}&quot;
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-base-300">
          <a
            href="/settings#ai-config"
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
