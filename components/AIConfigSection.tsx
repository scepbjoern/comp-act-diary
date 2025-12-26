/**
 * AIConfigSection - Settings section for AI configuration per JournalEntryType.
 * Allows editing model and prompt for content, analysis, and summary generation.
 */

'use client'

import { useState, useEffect } from 'react'
import {
  IconChevronDown,
  IconChevronRight,
  IconPencil,
  IconSearch,
  IconClipboard,
  IconRefresh,
} from '@tabler/icons-react'
import { useAISettings } from '@/hooks/useAISettings'
import { DEFAULT_LLM_MODELS } from '@/lib/llmModels'
import { PROMPT_VARIABLES } from '@/lib/defaultPrompts'

// =============================================================================
// TYPES
// =============================================================================

interface JournalEntryType {
  code: string
  name: string
  icon?: string
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

interface AIFunctionConfigProps {
  title: string
  icon: React.ReactNode
  modelId: string
  prompt: string
  onModelChange: (modelId: string) => void
  onPromptChange: (prompt: string) => void
  onReset: () => void
  isSaving: boolean
}

function AIFunctionConfig({
  title,
  icon,
  modelId,
  prompt,
  onModelChange,
  onPromptChange,
  onReset,
  isSaving,
}: AIFunctionConfigProps) {
  return (
    <div className="space-y-3 p-4 bg-base-200/50 rounded-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 font-medium">
          {icon}
          {title}
        </div>
        <button
          type="button"
          className="btn btn-ghost btn-xs"
          onClick={onReset}
          disabled={isSaving}
          title="Auf Standard zurücksetzen"
        >
          <IconRefresh size={14} />
          Standard
        </button>
      </div>

      {/* Model selection */}
      <div className="form-control">
        <label className="label">
          <span className="label-text text-sm">Modell</span>
        </label>
        <select
          className="select select-bordered select-sm w-full"
          value={modelId}
          onChange={(e) => onModelChange(e.target.value)}
          disabled={isSaving}
        >
          {DEFAULT_LLM_MODELS.map((model) => (
            <option key={model.id} value={model.id}>
              {model.name} ({model.inputCost} / {model.outputCost})
            </option>
          ))}
        </select>
      </div>

      {/* Prompt */}
      <div className="form-control">
        <label className="label">
          <span className="label-text text-sm">Prompt</span>
        </label>
        <textarea
          className="textarea textarea-bordered text-sm min-h-32"
          value={prompt}
          onChange={(e) => onPromptChange(e.target.value)}
          disabled={isSaving}
          placeholder="Prompt eingeben..."
        />
      </div>
    </div>
  )
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function AIConfigSection() {
  const { getSettingsForType, updateSettingsForType, resetToDefault, isLoading, error } = useAISettings()
  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set(['diary']))
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Local state for form values (to enable debounced saving)
  const [localSettings, setLocalSettings] = useState<Record<string, {
    content: { modelId: string; prompt: string }
    analysis: { modelId: string; prompt: string }
    summary: { modelId: string; prompt: string }
  }>>({})

  // Available journal entry types (currently just diary)
  const journalEntryTypes: JournalEntryType[] = [
    { code: 'diary', name: 'Tagebucheintrag', icon: '📓' },
    { code: 'meal', name: 'Mahlzeit', icon: '🍽️' },
  ]

  // Initialize local settings from server
  useEffect(() => {
    if (!isLoading) {
      const newLocalSettings: typeof localSettings = {}
      for (const type of journalEntryTypes) {
        newLocalSettings[type.code] = getSettingsForType(type.code)
      }
      setLocalSettings(newLocalSettings)
    }
  }, [isLoading])

  const toggleType = (code: string) => {
    const newExpanded = new Set(expandedTypes)
    if (newExpanded.has(code)) {
      newExpanded.delete(code)
    } else {
      newExpanded.add(code)
    }
    setExpandedTypes(newExpanded)
  }

  const handleSave = async (typeCode: string, field: 'content' | 'analysis' | 'summary', updates: { modelId?: string; prompt?: string }) => {
    setIsSaving(true)
    setSaveError(null)

    // Update local state immediately
    setLocalSettings((prev) => ({
      ...prev,
      [typeCode]: {
        ...prev[typeCode],
        [field]: {
          ...prev[typeCode]?.[field],
          ...updates,
        },
      },
    }))

    // Debounced save to server
    try {
      const success = await updateSettingsForType(typeCode, {
        [field]: {
          ...localSettings[typeCode]?.[field],
          ...updates,
        },
      })
      if (!success) {
        setSaveError('Fehler beim Speichern')
      }
    } catch (_err) {
      setSaveError('Fehler beim Speichern')
    } finally {
      setIsSaving(false)
    }
  }

  const handleReset = async (typeCode: string, field: 'content' | 'analysis' | 'summary') => {
    setIsSaving(true)
    setSaveError(null)

    try {
      const success = await resetToDefault(typeCode, field)
      if (success) {
        // Update local state with defaults
        const defaults = getSettingsForType(typeCode)
        setLocalSettings((prev) => ({
          ...prev,
          [typeCode]: {
            ...prev[typeCode],
            [field]: defaults[field],
          },
        }))
      } else {
        setSaveError('Fehler beim Zurücksetzen')
      }
    } catch (_err) {
      setSaveError('Fehler beim Zurücksetzen')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <span className="loading loading-spinner loading-md" />
      </div>
    )
  }

  return (
    <div id="ai-config" className="space-y-4">
      <div className="prose prose-sm max-w-none">
        <p className="text-base-content/70">
          Hier legst du fest, welche KI-Modelle und Prompts für die automatische
          Textverarbeitung deiner Tagebucheinträge verwendet werden. Die
          Einstellungen gelten pro Eintragstyp.
        </p>
      </div>

      {(error || saveError) && (
        <div className="alert alert-error">
          <span>{error || saveError}</span>
        </div>
      )}

      {/* Journal Entry Types */}
      <div className="space-y-2">
        {journalEntryTypes.map((type) => {
          const isExpanded = expandedTypes.has(type.code)
          const typeSettings = localSettings[type.code] || getSettingsForType(type.code)

          return (
            <div key={type.code} className="border border-base-300 rounded-lg">
              {/* Type Header */}
              <button
                type="button"
                className="w-full flex items-center justify-between p-4 hover:bg-base-200/50 transition-colors"
                onClick={() => toggleType(type.code)}
              >
                <div className="flex items-center gap-2 font-medium">
                  <span>{type.icon}</span>
                  {type.name}
                </div>
                {isExpanded ? (
                  <IconChevronDown size={18} />
                ) : (
                  <IconChevronRight size={18} />
                )}
              </button>

              {/* Type Content */}
              {isExpanded && (
                <div className="p-4 pt-0 space-y-4">
                  {/* Content Generation */}
                  <AIFunctionConfig
                    title="Content-Generierung (Transkript → Inhalt)"
                    icon={<IconPencil size={16} className="text-primary" />}
                    modelId={typeSettings.content.modelId}
                    prompt={typeSettings.content.prompt}
                    onModelChange={(modelId) => handleSave(type.code, 'content', { modelId })}
                    onPromptChange={(prompt) => handleSave(type.code, 'content', { prompt })}
                    onReset={() => handleReset(type.code, 'content')}
                    isSaving={isSaving}
                  />

                  {/* Analysis */}
                  <AIFunctionConfig
                    title="Analyse (Inhalt → Analyse)"
                    icon={<IconSearch size={16} className="text-warning" />}
                    modelId={typeSettings.analysis.modelId}
                    prompt={typeSettings.analysis.prompt}
                    onModelChange={(modelId) => handleSave(type.code, 'analysis', { modelId })}
                    onPromptChange={(prompt) => handleSave(type.code, 'analysis', { prompt })}
                    onReset={() => handleReset(type.code, 'analysis')}
                    isSaving={isSaving}
                  />

                  {/* Summary */}
                  <AIFunctionConfig
                    title="Zusammenfassung (Inhalt → Zusammenfassung)"
                    icon={<IconClipboard size={16} className="text-info" />}
                    modelId={typeSettings.summary.modelId}
                    prompt={typeSettings.summary.prompt}
                    onModelChange={(modelId) => handleSave(type.code, 'summary', { modelId })}
                    onPromptChange={(prompt) => handleSave(type.code, 'summary', { prompt })}
                    onReset={() => handleReset(type.code, 'summary')}
                    isSaving={isSaving}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Available Variables */}
      <div className="text-sm text-base-content/60 p-4 bg-base-200/30 rounded-lg">
        <p className="font-medium mb-2">Verfügbare Variablen für Prompts:</p>
        <ul className="space-y-1">
          {Object.entries(PROMPT_VARIABLES).map(([variable, description]) => (
            <li key={variable}>
              <code className="text-primary">{variable}</code> – {description}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
