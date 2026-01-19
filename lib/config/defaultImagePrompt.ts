/**
 * Default Image Prompt and Interpolation
 * Template and utilities for AI image generation prompts
 */

import {
  type ImageGenerationSettings,
  DEFAULT_IMAGE_MODEL_ID,
  DEFAULT_ASPECT_RATIO,
  DEFAULT_STEPS,
} from './imageModels'

// =============================================================================
// DEFAULT PROMPT
// =============================================================================

export const DEFAULT_IMAGE_PROMPT = `Kunstvolles Stillleben, das den Tag symbolisiert. 
Die wichtigsten Elemente aus der folgenden Zusammenfassung als Objekte auf einem Tisch dargestellt.
Subtile Hinweise auf die Stimmung des Tages. Editorial-Illustration, feine Texturen, klare Formen, ruhiger Hintergrund, hochwertig, ohne Text.

Zusammenfassung:
{{summary}}`

// =============================================================================
// PROMPT VARIABLES
// =============================================================================

export const IMAGE_PROMPT_VARIABLES = {
  '{{summary}}': 'Die Zusammenfassung des Tages oder der Reflexion',
} as const

export type ImagePromptVariable = keyof typeof IMAGE_PROMPT_VARIABLES

// =============================================================================
// DEFAULT SETTINGS
// =============================================================================

export const DEFAULT_IMAGE_GENERATION_SETTINGS: ImageGenerationSettings = {
  modelId: DEFAULT_IMAGE_MODEL_ID,
  promptTemplate: DEFAULT_IMAGE_PROMPT,
  aspectRatio: DEFAULT_ASPECT_RATIO,
  steps: DEFAULT_STEPS,
  autoGenerate: true,
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Interpolates the {{summary}} variable in the prompt template
 */
export function interpolateImagePrompt(template: string, summary: string): string {
  return template.replace(/\{\{summary\}\}/g, summary.trim())
}

/**
 * Validates that a prompt template contains the required {{summary}} variable
 */
export function validatePromptTemplate(template: string): boolean {
  return template.includes('{{summary}}')
}

/**
 * Merges user settings with defaults
 */
export function mergeWithDefaults(
  userSettings: Partial<ImageGenerationSettings> | undefined
): ImageGenerationSettings {
  if (!userSettings) {
    return { ...DEFAULT_IMAGE_GENERATION_SETTINGS }
  }

  return {
    modelId: userSettings.modelId || DEFAULT_IMAGE_GENERATION_SETTINGS.modelId,
    promptTemplate: userSettings.promptTemplate || DEFAULT_IMAGE_GENERATION_SETTINGS.promptTemplate,
    aspectRatio: userSettings.aspectRatio || DEFAULT_IMAGE_GENERATION_SETTINGS.aspectRatio,
    steps: userSettings.steps ?? DEFAULT_IMAGE_GENERATION_SETTINGS.steps,
    autoGenerate: userSettings.autoGenerate ?? DEFAULT_IMAGE_GENERATION_SETTINGS.autoGenerate,
  }
}
