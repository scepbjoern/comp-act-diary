/**
 * ImageGenerationSettings - Settings section for AI image generation
 */

'use client'

import { useState, useEffect } from 'react'
import { IconPhoto, IconRefresh } from '@tabler/icons-react'
import {
  IMAGE_MODELS,
  ASPECT_RATIO_LABELS,
  type AspectRatio,
  type ImageGenerationSettings as ImageGenSettings,
  MIN_STEPS,
  MAX_STEPS,
} from '@/lib/imageModels'
import {
  DEFAULT_IMAGE_GENERATION_SETTINGS,
  IMAGE_PROMPT_VARIABLES,
} from '@/lib/defaultImagePrompt'

// =============================================================================
// TYPES
// =============================================================================

interface ImageGenerationSettingsProps {
  settings: ImageGenSettings
  onSettingsChange: (settings: ImageGenSettings) => void
  onSave: () => Promise<void>
  saving: boolean
}

// =============================================================================
// COMPONENT
// =============================================================================

export function ImageGenerationSettings({
  settings,
  onSettingsChange,
  onSave,
  saving,
}: ImageGenerationSettingsProps) {
  const [localSettings, setLocalSettings] = useState<ImageGenSettings>(settings)
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    setLocalSettings(settings)
    setHasChanges(false)
  }, [settings])

  const handleChange = <K extends keyof ImageGenSettings>(
    key: K,
    value: ImageGenSettings[K]
  ) => {
    const newSettings = { ...localSettings, [key]: value }
    setLocalSettings(newSettings)
    onSettingsChange(newSettings)
    setHasChanges(true)
  }

  const handleReset = () => {
    setLocalSettings(DEFAULT_IMAGE_GENERATION_SETTINGS)
    onSettingsChange(DEFAULT_IMAGE_GENERATION_SETTINGS)
    setHasChanges(true)
  }

  const handleSave = async () => {
    await onSave()
    setHasChanges(false)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-primary/10 rounded-lg">
            <IconPhoto size={22} className="text-primary" />
          </div>
          <h3 className="font-semibold text-base">Bildgenerierung</h3>
        </div>
        <button
          type="button"
          className="px-3 py-1.5 text-xs font-medium rounded-md bg-base-300 hover:bg-base-300/80 transition-all flex items-center gap-1.5 active:scale-95 shadow-sm"
          onClick={handleReset}
          disabled={saving}
          title="Auf Standard zurücksetzen"
        >
          <IconRefresh size={14} />
          Standard
        </button>
      </div>

      <div className="space-y-6 p-5 bg-base-200/50 rounded-xl border border-base-300 shadow-sm">
        {/* Model Selection */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold flex items-center gap-2">
            Modell
          </label>
          <select
            className="w-full bg-base-100 border border-base-300 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all appearance-none cursor-pointer"
            value={localSettings.modelId}
            onChange={(e) => handleChange('modelId', e.target.value)}
            disabled={saving}
          >
            {IMAGE_MODELS.map((model) => (
              <option key={model.id} value={model.id}>
                {model.name}
              </option>
            ))}
          </select>
        </div>

        {/* Prompt Template */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold flex items-center gap-2">
            Prompt-Template
          </label>
          <textarea
            className="w-full bg-base-100 border border-base-300 rounded-lg px-3.5 py-3 text-sm min-h-[10rem] outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-y leading-relaxed"
            value={localSettings.promptTemplate}
            onChange={(e) => handleChange('promptTemplate', e.target.value)}
            disabled={saving}
            placeholder="Prompt eingeben..."
          />
          <div className="p-2.5 bg-base-300/30 rounded-lg">
            <span className="text-[10px] text-base-content/70 leading-relaxed block">
              <span className="font-bold uppercase tracking-wider opacity-60 mr-2">Variablen:</span>
              {Object.entries(IMAGE_PROMPT_VARIABLES).map(([key, desc]) => (
                <span key={key} className="inline-block mr-4 py-0.5">
                  <code className="text-primary font-mono font-bold bg-primary/5 px-1 rounded">{key}</code>: {desc}
                </span>
              ))}
            </span>
          </div>
        </div>

        {/* Aspect Ratio */}
        <div className="flex flex-col gap-3">
          <label className="text-sm font-semibold">
            Seitenverhältnis
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {(Object.keys(ASPECT_RATIO_LABELS) as AspectRatio[]).map((ratio) => (
              <label 
                key={ratio} 
                className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg border transition-all cursor-pointer select-none ${
                  localSettings.aspectRatio === ratio 
                    ? 'bg-primary/10 border-primary text-primary font-medium' 
                    : 'bg-base-100 border-base-300 hover:border-base-content/20'
                }`}
              >
                <input
                  type="radio"
                  name="aspectRatio"
                  checked={localSettings.aspectRatio === ratio}
                  onChange={() => handleChange('aspectRatio', ratio)}
                  disabled={saving}
                  className="hidden"
                />
                <span className="text-xs">{ASPECT_RATIO_LABELS[ratio]}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Steps */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold">Generierungsschritte</label>
            <span className="text-xs font-bold font-mono bg-primary text-primary-content px-2 py-0.5 rounded-full shadow-sm">
              {localSettings.steps}
            </span>
          </div>
          <input
            type="range"
            min={MIN_STEPS}
            max={MAX_STEPS}
            value={localSettings.steps}
            onChange={(e) => handleChange('steps', parseInt(e.target.value, 10))}
            className="w-full h-1.5 bg-base-300 rounded-lg appearance-none cursor-pointer accent-primary"
            disabled={saving}
          />
          <span className="text-[10px] text-base-content/60 italic block">
            Tipp: Mehr Schritte ergeben eine höhere Qualität, benötigen aber mehr Zeit.
          </span>
        </div>

        {/* Auto Generate */}
        <div className="pt-2">
          <label className="flex items-center gap-3 cursor-pointer group select-none">
            <div className={`w-5 h-5 rounded border transition-all flex items-center justify-center ${
              localSettings.autoGenerate 
                ? 'bg-primary border-primary text-primary-content' 
                : 'bg-base-100 border-base-300 group-hover:border-primary/50'
            }`}>
              {localSettings.autoGenerate && (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <input
              type="checkbox"
              checked={localSettings.autoGenerate}
              onChange={(e) => handleChange('autoGenerate', e.target.checked)}
              disabled={saving}
              className="hidden"
            />
            <span className="text-sm font-medium group-hover:text-primary transition-colors">
              Automatisch Bild generieren bei Summary-Erstellung
            </span>
          </label>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-4 border-t border-base-300/50">
          <button
            type="button"
            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 active:scale-95 ${
              saving || !hasChanges 
                ? 'bg-base-300 text-base-content/30 cursor-not-allowed shadow-none' 
                : 'bg-primary text-primary-content hover:brightness-105 shadow-md shadow-primary/20'
            }`}
            onClick={handleSave}
            disabled={saving || !hasChanges}
          >
            {saving && <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />}
            {saving ? 'Wird gespeichert...' : 'Einstellungen speichern'}
          </button>
        </div>
      </div>
    </div>
  )
}
