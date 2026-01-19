/**
 * Image Generation Model Definitions
 * Constants and utilities for AI image generation via together.ai
 */

import { z } from 'zod'

// =============================================================================
// TYPES
// =============================================================================

export interface ImageModel {
  id: string
  name: string
  provider: 'togetherai'
  defaultSteps: number
  description?: string
}

export type AspectRatio = '16:9' | '4:3' | '1:1' | '9:16'

export interface ImageDimensions {
  width: number
  height: number
}

export interface ImageGenerationSettings {
  modelId: string
  promptTemplate: string
  aspectRatio: AspectRatio
  steps: number
  autoGenerate: boolean
}

// =============================================================================
// CONSTANTS
// =============================================================================

export const IMAGE_MODELS: ImageModel[] = [
  {
    id: 'google/flash-image-2.5',
    name: 'Gemini Flash Image 2.5',
    provider: 'togetherai',
    defaultSteps: 4,
    description: 'Schnelle, effiziente Bildgenerierung',
  },
  {
    id: 'ByteDance-Seed/Seedream-4.0',
    name: 'Seedream 4.0',
    provider: 'togetherai',
    defaultSteps: 4,
    description: 'Hochwertige Bildgenerierung mit feinen Details',
  },
  {
    id: 'black-forest-labs/FLUX.1-schnell',
    name: 'FLUX.1 Schnell',
    provider: 'togetherai',
    defaultSteps: 4,
    description: 'Schnelle, hochwertige Bildgenerierung (Kostenpflichtig)',
  },
]

export const ASPECT_RATIOS: Record<AspectRatio, ImageDimensions> = {
  '16:9': { width: 1344, height: 768 },
  '4:3': { width: 1024, height: 768 },
  '1:1': { width: 1024, height: 1024 },
  '9:16': { width: 768, height: 1344 },
}

export const ASPECT_RATIO_LABELS: Record<AspectRatio, string> = {
  '16:9': 'Querformat (16:9)',
  '4:3': 'Klassisch (4:3)',
  '1:1': 'Quadrat (1:1)',
  '9:16': 'Hochformat (9:16)',
}

export const DEFAULT_IMAGE_MODEL_ID = 'google/flash-image-2.5'
export const DEFAULT_ASPECT_RATIO: AspectRatio = '16:9'
export const DEFAULT_STEPS = 4
export const MIN_STEPS = 4
export const MAX_STEPS = 50

// =============================================================================
// ZOD SCHEMAS
// =============================================================================

export const AspectRatioSchema = z.enum(['16:9', '4:3', '1:1', '9:16'])

export const ImageGenerationSettingsSchema = z.object({
  modelId: z.string().min(1),
  promptTemplate: z.string().min(1),
  aspectRatio: AspectRatioSchema,
  steps: z.number().min(MIN_STEPS).max(MAX_STEPS),
  autoGenerate: z.boolean(),
})

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get image dimensions for a given aspect ratio
 */
export function getImageDimensions(aspectRatio: AspectRatio): ImageDimensions {
  return ASPECT_RATIOS[aspectRatio]
}

/**
 * Get model by ID
 */
export function getImageModel(modelId: string): ImageModel | undefined {
  return IMAGE_MODELS.find((m) => m.id === modelId)
}

/**
 * Get default steps for a model
 */
export function getDefaultSteps(modelId: string): number {
  const model = getImageModel(modelId)
  return model?.defaultSteps ?? DEFAULT_STEPS
}

/**
 * Validate if a model ID is supported
 */
export function isValidImageModel(modelId: string): boolean {
  return IMAGE_MODELS.some((m) => m.id === modelId)
}

/**
 * Get short model name for display (e.g., "Gemini Flash" instead of full name)
 */
export function getShortModelName(modelId: string): string {
  const model = getImageModel(modelId)
  if (!model) return modelId
  
  if (modelId.includes('flash-image')) return 'Gemini Flash'
  if (modelId.includes('Seedream')) return 'Seedream 4.0'
  if (modelId.includes('FLUX.1-schnell')) return 'FLUX Schnell'
  return model.name
}
