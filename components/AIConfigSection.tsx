/**
 * AIConfigSection - Settings section for AI configuration per JournalEntryType.
 * Allows editing model and prompt for content, analysis, and summary generation.
 */

'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import {
  IconChevronDown,
  IconChevronRight,
  IconPencil,
  IconSearch,
  IconClipboard,
  IconRefresh,
  IconHeading,
  IconDownload,
  IconTrash,
  IconPlus,
  IconRobot,
} from '@tabler/icons-react'
import { useAISettings } from '@/hooks/useAISettings'
import { useLlmModels, LlmModelData } from '@/hooks/useLlmModels'
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
  reasoningEffort?: string
  models: LlmModelData[]
  onModelChange: (modelId: string) => void
  onPromptChange: (prompt: string) => void
  onReasoningEffortChange?: (effort: string) => void
  onReset: () => void
  disabled: boolean
}

const REASONING_EFFORT_OPTIONS = [
  { value: 'minimal', label: 'Minimal', description: 'Schnellste Antwort, wenig Reasoning' },
  { value: 'low', label: 'Niedrig', description: 'Schnell, grundlegendes Reasoning' },
  { value: 'medium', label: 'Mittel', description: 'Ausgewogen (Standard)' },
  { value: 'high', label: 'Hoch', description: 'Tiefgreifendes Reasoning, langsamer' },
]

function AIFunctionConfig({
  title,
  icon,
  modelId,
  prompt,
  reasoningEffort,
  models,
  onModelChange,
  onPromptChange,
  onReasoningEffortChange,
  onReset,
  disabled,
}: AIFunctionConfigProps) {
  const selectedModel = models.find(m => m.modelId === modelId)
  const supportsReasoning = selectedModel?.supportsReasoningEffort ?? false

  // Sort models alphabetically for the dropdown
  const sortedModelsForSelect = useMemo(() => {
    return [...models].sort((a, b) => a.name.localeCompare(b.name))
  }, [models])

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
          disabled={disabled}
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
          className="w-full bg-base-100 border border-base-300 rounded px-2 py-1 text-sm"
          value={modelId}
          onChange={(e) => onModelChange(e.target.value)}
          disabled={disabled}
        >
          {sortedModelsForSelect.length === 0 ? (
            <option value="">Keine Modelle verfügbar</option>
          ) : (
            sortedModelsForSelect.map((model) => (
              <option key={model.modelId} value={model.modelId}>
                {model.name} ({model.inputCost || '-'} / {model.outputCost || '-'}) [{model.provider}]
              </option>
            ))
          )}
        </select>
      </div>

      {/* Reasoning Effort (only for models that support it) */}
      {supportsReasoning && onReasoningEffortChange && (
        <div className="form-control">
          <label className="label">
            <span className="label-text text-sm">Reasoning-Aufwand</span>
            <span className="label-text-alt text-xs text-info">GPT-5 Serie</span>
          </label>
          <select
            className="w-full bg-base-100 border border-base-300 rounded px-2 py-1 text-sm"
            value={reasoningEffort || selectedModel?.defaultReasoningEffort || 'medium'}
            onChange={(e) => onReasoningEffortChange(e.target.value)}
            disabled={disabled}
          >
            {REASONING_EFFORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label} - {opt.description}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Prompt */}
      <div className="form-control">
        <label className="label">
          <span className="label-text text-sm">Prompt</span>
        </label>
        <textarea
          className="w-full bg-base-100 border border-base-300 rounded px-2 py-1 text-sm min-h-32"
          value={prompt}
          onChange={(e) => onPromptChange(e.target.value)}
          disabled={disabled}
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
  const { getSettingsForType, updateAllSettings, resetToDefault, isLoading, error } = useAISettings()
  const { models } = useLlmModels()
  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set(['diary']))
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [hasChanges, setHasChanges] = useState(false)

  // Local state for form values (edited locally, saved explicitly)
  const [localSettings, setLocalSettings] = useState<Record<string, {
    title: { modelId: string; prompt: string }
    content: { modelId: string; prompt: string }
    analysis: { modelId: string; prompt: string }
    summary: { modelId: string; prompt: string }
  }>>({})

  // Available journal entry types (currently just diary)
  const journalEntryTypes: JournalEntryType[] = [
    { code: 'diary', name: 'Tagebucheintrag', icon: '📓' },
    { code: 'meal', name: 'Mahlzeit', icon: '🍽️' },
  ]

  // Track if initial load has been done
  const initialLoadDone = useRef(false)

  // Initialize local settings from server (only on first load)
  useEffect(() => {
    if (!isLoading && !initialLoadDone.current) {
      initialLoadDone.current = true
      const newLocalSettings: typeof localSettings = {}
      for (const type of journalEntryTypes) {
        newLocalSettings[type.code] = getSettingsForType(type.code)
      }
      console.log('[AIConfigSection] Initializing localSettings from server:', JSON.stringify(newLocalSettings, null, 2))
      setLocalSettings(newLocalSettings)
      setHasChanges(false)
    }
  }, [isLoading, getSettingsForType])

  const toggleType = (code: string) => {
    const newExpanded = new Set(expandedTypes)
    if (newExpanded.has(code)) {
      newExpanded.delete(code)
    } else {
      newExpanded.add(code)
    }
    setExpandedTypes(newExpanded)
  }

  // Update local state only (no API call)
  const handleLocalChange = (typeCode: string, field: 'title' | 'content' | 'analysis' | 'summary', updates: { modelId?: string; prompt?: string }) => {
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
    setHasChanges(true)
  }

  // Save all changes to server in a single API call
  const handleSaveAll = async () => {
    setIsSaving(true)
    setSaveError(null)

    console.log('[AIConfigSection] Saving all settings in single call, localSettings:', JSON.stringify(localSettings, null, 2))

    try {
      const success = await updateAllSettings(localSettings)
      if (!success) {
        setSaveError('Fehler beim Speichern')
        setIsSaving(false)
        return
      }
      setHasChanges(false)
      console.log('[AIConfigSection] All settings saved successfully')
    } catch (err) {
      console.error('[AIConfigSection] Save error:', err)
      setSaveError('Fehler beim Speichern')
    } finally {
      setIsSaving(false)
    }
  }

  const handleReset = async (typeCode: string, field: 'title' | 'content' | 'analysis' | 'summary') => {
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
        setHasChanges(true)
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
                  {/* Title Generation */}
                  <AIFunctionConfig
                    title="Titel-Generierung (Text → Titel)"
                    icon={<IconHeading size={16} className="text-success" />}
                    modelId={typeSettings.title?.modelId || ''}
                    prompt={typeSettings.title?.prompt || ''}
                    models={models}
                    onModelChange={(modelId) => handleLocalChange(type.code, 'title', { modelId })}
                    onPromptChange={(prompt) => handleLocalChange(type.code, 'title', { prompt })}
                    onReset={() => handleReset(type.code, 'title')}
                    disabled={isSaving}
                  />

                  {/* Content Generation */}
                  <AIFunctionConfig
                    title="Content-Generierung (Transkript → Inhalt)"
                    icon={<IconPencil size={16} className="text-primary" />}
                    modelId={typeSettings.content.modelId}
                    prompt={typeSettings.content.prompt}
                    models={models}
                    onModelChange={(modelId) => handleLocalChange(type.code, 'content', { modelId })}
                    onPromptChange={(prompt) => handleLocalChange(type.code, 'content', { prompt })}
                    onReset={() => handleReset(type.code, 'content')}
                    disabled={isSaving}
                  />

                  {/* Analysis */}
                  <AIFunctionConfig
                    title="Analyse (Inhalt → Analyse)"
                    icon={<IconSearch size={16} className="text-warning" />}
                    modelId={typeSettings.analysis.modelId}
                    prompt={typeSettings.analysis.prompt}
                    models={models}
                    onModelChange={(modelId) => handleLocalChange(type.code, 'analysis', { modelId })}
                    onPromptChange={(prompt) => handleLocalChange(type.code, 'analysis', { prompt })}
                    onReset={() => handleReset(type.code, 'analysis')}
                    disabled={isSaving}
                  />

                  {/* Summary */}
                  <AIFunctionConfig
                    title="Zusammenfassung (Inhalt → Zusammenfassung)"
                    icon={<IconClipboard size={16} className="text-info" />}
                    modelId={typeSettings.summary.modelId}
                    prompt={typeSettings.summary.prompt}
                    models={models}
                    onModelChange={(modelId) => handleLocalChange(type.code, 'summary', { modelId })}
                    onPromptChange={(prompt) => handleLocalChange(type.code, 'summary', { prompt })}
                    onReset={() => handleReset(type.code, 'summary')}
                    disabled={isSaving}
                  />

                  {/* Save Button */}
                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={handleSaveAll}
                      disabled={isSaving || !hasChanges}
                    >
                      {isSaving ? (
                        <span className="loading loading-spinner loading-xs" />
                      ) : null}
                      Speichern
                    </button>
                  </div>
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
