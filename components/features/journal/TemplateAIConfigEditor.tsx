/**
 * components/features/journal/TemplateAIConfigEditor.tsx
 * Editor component for template AI configuration.
 * Configures models and prompts for title, summary, analysis, and segmentation.
 */

'use client'

import { useCallback } from 'react'
import { IconRobot, IconChevronDown, IconChevronUp } from '@tabler/icons-react'
import { TemplateAIConfig } from '@/types/journal'
import { useState } from 'react'

/** Model option for the select dropdown */
interface ModelOption {
  value: string
  label: string
}

interface TemplateAIConfigEditorProps {
  /** Current AI configuration */
  config: TemplateAIConfig
  /** Callback when configuration changes */
  onChange: (config: TemplateAIConfig) => void
  /** Whether the template has multiple fields (shows segmentation config) */
  hasMultipleFields: boolean
  /** Whether editing is disabled */
  disabled?: boolean
  /** Available LLM models from database */
  availableModels?: ModelOption[]
}

/** Fallback AI models if none provided */
const FALLBACK_MODELS: ModelOption[] = [
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini (schnell, günstig)' },
  { value: 'gpt-4o', label: 'GPT-4o (leistungsstark)' },
  { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
]

/** Default prompts for different AI operations */
const DEFAULT_PROMPTS = {
  content: `Du bist ein professioneller Texteditor. Verbessere das folgende Transkript:
- Korrigiere Grammatik und Rechtschreibung (Schweizer Rechtschreibung mit ss)
- Strukturiere den Text in sinnvolle Absätze
- Verwende Markdown für Formatierung (Überschriften, Listen wo sinnvoll)
- Behalte den persönlichen Stil und alle Inhalte bei
- Entferne Füllwörter und Wiederholungen

Gib nur den verbesserten Text zurück, ohne Erklärungen.`,

  title: `Generiere einen kurzen, prägnanten Titel (max. 60 Zeichen) für den folgenden Tagebucheintrag. 
Der Titel soll den Kern des Eintrags erfassen, ohne zu viel zu verraten.
Antworte nur mit dem Titel, ohne Anführungszeichen oder Erklärungen.`,

  summary: `Fasse den folgenden Tagebucheintrag in 2-3 Sätzen zusammen.
Die Zusammenfassung soll die wichtigsten Punkte und Gefühle erfassen.
Verwende die erste Person (ich-Form).`,

  analysis: `Analysiere den folgenden Tagebucheintrag aus psychologischer Perspektive (ACT - Akzeptanz- und Commitment-Therapie).
Identifiziere:
- Werte und wertorientiertes Verhalten
- Vermeidungsstrategien oder Fusion mit Gedanken
- Momente der Achtsamkeit oder Akzeptanz
- Mögliche committed actions

Sei einfühlsam und nicht wertend. Formuliere konstruktive Beobachtungen.`,

  segmentation: `Teile das folgende Transkript auf die angegebenen Felder auf.
Verbessere dabei die Textqualität (Grammatik, Struktur, Füllwörter entfernen).
Verwende Schweizer Rechtschreibung (ss statt ß).
Wenn ein Abschnitt nicht klar zugeordnet werden kann, füge ihn dem letzten Feld hinzu.

Antworte im JSON-Format:
{
  "segments": {
    "field_id": "Verbesserter Text für das Feld"
  }
}`,
}

/**
 * Collapsible section component for each AI operation type.
 */
function AIConfigSection({
  title,
  description,
  modelValue,
  promptValue,
  defaultPrompt,
  onModelChange,
  onPromptChange,
  disabled,
  models,
}: {
  title: string
  description: string
  modelValue?: string
  promptValue?: string
  defaultPrompt: string
  onModelChange: (model: string) => void
  onPromptChange: (prompt: string) => void
  disabled?: boolean
  models: ModelOption[]
}) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className="rounded-lg border border-base-300">
      {/* Header - clickable to expand/collapse */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between p-3 text-left hover:bg-base-200"
      >
        <div>
          <h4 className="font-medium">{title}</h4>
          <p className="text-sm text-base-content/60">{description}</p>
        </div>
        {isExpanded ? (
          <IconChevronUp className="h-5 w-5 text-base-content/60" />
        ) : (
          <IconChevronDown className="h-5 w-5 text-base-content/60" />
        )}
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="space-y-3 border-t border-base-300 p-3">
          {/* Model Selection */}
          <div className="form-control">
            <label className="label">
              <span className="label-text text-sm">Modell</span>
            </label>
            <select
              value={modelValue || (models[0]?.value || 'gpt-4o-mini')}
              onChange={(e) => onModelChange(e.target.value)}
              disabled={disabled}
              className="select select-bordered select-sm w-full"
            >
              {models.map((model) => (
                <option key={model.value} value={model.value}>
                  {model.label}
                </option>
              ))}
            </select>
          </div>

          {/* Prompt */}
          <div className="form-control">
            <label className="label">
              <span className="label-text text-sm">Prompt</span>
              <button
                type="button"
                onClick={() => onPromptChange(defaultPrompt)}
                disabled={disabled}
                className="link-hover link text-xs"
              >
                Standard zurücksetzen
              </button>
            </label>
            <textarea
              value={promptValue || ''}
              onChange={(e) => onPromptChange(e.target.value)}
              disabled={disabled}
              placeholder={defaultPrompt}
              className="textarea textarea-bordered textarea-sm w-full font-mono text-xs"
              rows={6}
            />
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Editor for template AI configuration.
 * Provides collapsible sections for each AI operation type.
 */
export function TemplateAIConfigEditor({
  config,
  onChange,
  hasMultipleFields,
  disabled = false,
  availableModels,
}: TemplateAIConfigEditorProps) {
  // Use provided models or fallback
  const models = availableModels && availableModels.length > 0 ? availableModels : FALLBACK_MODELS
  // Helper to update a specific config property
  const updateConfig = useCallback(
    (updates: Partial<TemplateAIConfig>) => {
      onChange({ ...config, ...updates })
    },
    [config, onChange]
  )

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center gap-2">
        <IconRobot className="h-5 w-5 text-primary" />
        <h3 className="font-medium">AI-Konfiguration</h3>
      </div>

      <p className="text-sm text-base-content/60">
        Konfiguriere die KI-Modelle und Prompts für verschiedene Operationen.
        Leere Prompts verwenden den Standardwert.
      </p>

      {/* Content Improvement */}
      <AIConfigSection
        title="Content-Verbesserung"
        description="Transkript → verbesserter Text"
        modelValue={config.contentModel}
        promptValue={config.contentPrompt}
        defaultPrompt={DEFAULT_PROMPTS.content}
        onModelChange={(model) => updateConfig({ contentModel: model })}
        onPromptChange={(prompt) => updateConfig({ contentPrompt: prompt })}
        disabled={disabled}
        models={models}
      />

      {/* Title Generation */}
      <AIConfigSection
        title="Titel-Generierung"
        description="Automatischer Titel für Einträge"
        modelValue={config.titleModel}
        promptValue={config.titlePrompt}
        defaultPrompt={DEFAULT_PROMPTS.title}
        onModelChange={(model) => updateConfig({ titleModel: model })}
        onPromptChange={(prompt) => updateConfig({ titlePrompt: prompt })}
        disabled={disabled}
        models={models}
      />

      {/* Summary Generation */}
      <AIConfigSection
        title="Zusammenfassung"
        description="Kurze Zusammenfassung des Eintrags"
        modelValue={config.summaryModel}
        promptValue={config.summaryPrompt}
        defaultPrompt={DEFAULT_PROMPTS.summary}
        onModelChange={(model) => updateConfig({ summaryModel: model })}
        onPromptChange={(prompt) => updateConfig({ summaryPrompt: prompt })}
        disabled={disabled}
        models={models}
      />

      {/* Analysis Generation */}
      <AIConfigSection
        title="Analyse"
        description="Psychologische Analyse (ACT-Perspektive)"
        modelValue={config.analysisModel}
        promptValue={config.analysisPrompt}
        defaultPrompt={DEFAULT_PROMPTS.analysis}
        onModelChange={(model) => updateConfig({ analysisModel: model })}
        onPromptChange={(prompt) => updateConfig({ analysisPrompt: prompt })}
        disabled={disabled}
        models={models}
      />

      {/* Audio Segmentation - only shown for multi-field templates */}
      {hasMultipleFields && (
        <AIConfigSection
          title="Audio-Segmentierung"
          description="Transkript auf Felder aufteilen (inkl. Verbesserung)"
          modelValue={config.segmentationModel}
          promptValue={config.segmentationPrompt}
          defaultPrompt={DEFAULT_PROMPTS.segmentation}
          onModelChange={(model) => updateConfig({ segmentationModel: model })}
          onPromptChange={(prompt) => updateConfig({ segmentationPrompt: prompt })}
          disabled={disabled}
          models={models}
        />
      )}
    </div>
  )
}

export default TemplateAIConfigEditor
