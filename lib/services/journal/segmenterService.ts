/**
 * lib/services/journal/segmenterService.ts
 * AI-based audio transcript segmentation for multi-field templates.
 * Splits transcripts into field-specific content using explicit markers or AI inference.
 */

import { TemplateField, SegmentationResult, TemplateAIConfig } from '@/types/journal'
import { generateText } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'

// =============================================================================
// CONSTANTS
// =============================================================================

// Explicit markers that users can say to indicate field transitions
const EXPLICIT_MARKERS = [
  'nächstes feld',
  'naechstes feld',
  'next field',
  'feld eins',
  'feld zwei',
  'feld drei',
  'feld vier',
  'feld fünf',
  'feld 1',
  'feld 2',
  'feld 3',
  'feld 4',
  'feld 5',
]

// Default segmentation prompt template
const DEFAULT_SEGMENTATION_PROMPT = `Du bist ein intelligenter Textassistent. Teile das folgende Transkript auf die angegebenen Felder auf.

WICHTIG:
- Verbessere dabei die Textqualität (Grammatik, Struktur, Füllwörter entfernen)
- Verwende Schweizer Rechtschreibung (ss statt ß)
- Behalte den persönlichen Stil und alle Inhalte bei
- Strukturiere in sinnvolle Absätze
- Wenn ein Abschnitt nicht klar zugeordnet werden kann, füge ihn dem letzten Feld hinzu

Felder:
{{fieldLabels}}

Transkript:
{{transcript}}

Antworte NUR mit einem JSON-Objekt im folgenden Format:
{
  "segments": {
    "field_id_1": "Verbesserter Text für Feld 1",
    "field_id_2": "Verbesserter Text für Feld 2"
  },
  "warning": "Optional: Hinweis falls Zuordnung unsicher war"
}`

// =============================================================================
// EXPLICIT MARKER DETECTION
// =============================================================================

/**
 * Attempts to segment transcript using explicit spoken markers.
 * Returns null if no explicit markers are found.
 */
function segmentByExplicitMarkers(
  transcript: string,
  fields: TemplateField[]
): SegmentationResult | null {
  const lowerTranscript = transcript.toLowerCase()

  // Check if any explicit markers are present
  const hasExplicitMarkers = EXPLICIT_MARKERS.some((marker) => lowerTranscript.includes(marker))

  if (!hasExplicitMarkers) {
    // Also check for field labels mentioned in transcript
    const hasLabelMarkers = fields.some((field) => {
      if (!field.label) return false
      return lowerTranscript.includes(field.label.toLowerCase())
    })

    if (!hasLabelMarkers) {
      return null // No explicit markers found
    }
  }

  // Sort fields by order
  const sortedFields = [...fields].sort((a, b) => a.order - b.order)
  const segments: Record<string, string> = {}

  // Initialize all fields with empty strings
  for (const field of sortedFields) {
    segments[field.id] = ''
  }

  // Try to split by "nächstes feld" markers
  const nextFieldPattern = /n[aä]chstes\s+feld/gi
  const parts = transcript.split(nextFieldPattern)

  if (parts.length > 1) {
    // Successfully split by "nächstes feld"
    for (let i = 0; i < Math.min(parts.length, sortedFields.length); i++) {
      segments[sortedFields[i].id] = parts[i].trim()
    }

    // If more parts than fields, append remainder to last field
    if (parts.length > sortedFields.length) {
      const lastFieldId = sortedFields[sortedFields.length - 1].id
      const remainder = parts.slice(sortedFields.length).join(' ')
      segments[lastFieldId] += ' ' + remainder
    }

    return {
      segments,
      warning:
        parts.length !== sortedFields.length
          ? 'Anzahl der Segmente stimmt nicht mit Anzahl der Felder überein'
          : undefined,
    }
  }

  // Try to split by field labels
  let remainingText = transcript
  let lastMatchedIndex = -1

  for (let i = 0; i < sortedFields.length; i++) {
    const field = sortedFields[i]
    if (!field.label) continue

    const labelPattern = new RegExp(escapeRegex(field.label), 'gi')
    const match = labelPattern.exec(remainingText)

    if (match) {
      // Found label in text
      if (lastMatchedIndex >= 0 && lastMatchedIndex < i) {
        // Assign text between last match and this match to previous field
        const previousField = sortedFields[lastMatchedIndex]
        const textBefore = remainingText.substring(0, match.index).trim()
        segments[previousField.id] = textBefore
      }

      remainingText = remainingText.substring(match.index + match[0].length)
      lastMatchedIndex = i
    }
  }

  // Assign remaining text to last matched field
  if (lastMatchedIndex >= 0) {
    segments[sortedFields[lastMatchedIndex].id] = remainingText.trim()
    return { segments }
  }

  return null // Could not segment by explicit markers
}

/**
 * Escapes special regex characters in a string.
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// =============================================================================
// AI-BASED SEGMENTATION
// =============================================================================

/**
 * Segments transcript using AI inference.
 * Uses the template's segmentation prompt or a default prompt.
 */
async function segmentByAI(
  transcript: string,
  fields: TemplateField[],
  options: { model?: string; prompt?: string }
): Promise<SegmentationResult> {
  const sortedFields = [...fields].sort((a, b) => a.order - b.order)

  // Build field labels string for prompt
  const fieldLabels = sortedFields
    .map((f, i) => {
      const label = f.label || `Feld ${i + 1}`
      const icon = f.icon ? `${f.icon} ` : ''
      return `- ${icon}${label} (ID: ${f.id})`
    })
    .join('\n')

  // Build prompt
  const promptTemplate = options.prompt || DEFAULT_SEGMENTATION_PROMPT
  const prompt = promptTemplate
    .replace('{{fieldLabels}}', fieldLabels)
    .replace('{{transcript}}', transcript)

  // Determine model to use
  const modelName = options.model || 'gpt-4o-mini'

  try {
    // Create OpenAI provider
    const openai = createOpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })

    // Generate segmentation
    const result = await generateText({
      model: openai(modelName),
      prompt,
      temperature: 0.3, // Lower temperature for more consistent output
    })

    // Parse JSON response
    const responseText = result.text.trim()

    // Extract JSON from response (handle markdown code blocks)
    let jsonStr = responseText
    const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim()
    }

    const parsed = JSON.parse(jsonStr)

    // Validate response structure
    if (!parsed.segments || typeof parsed.segments !== 'object') {
      throw new Error('Invalid response format: missing segments object')
    }

    // Ensure all field IDs are present
    const segments: Record<string, string> = {}
    for (const field of sortedFields) {
      segments[field.id] = parsed.segments[field.id] || ''
    }

    return {
      segments,
      warning: parsed.warning,
    }
  } catch (error) {
    // If AI fails, fall back to putting everything in first field
    console.error('AI segmentation failed:', error)

    const segments: Record<string, string> = {}
    for (let i = 0; i < sortedFields.length; i++) {
      segments[sortedFields[i].id] = i === 0 ? transcript : ''
    }

    return {
      segments,
      warning: 'KI-Segmentierung fehlgeschlagen. Transkript wurde in erstes Feld eingefügt.',
    }
  }
}

// =============================================================================
// MAIN SEGMENTATION FUNCTION
// =============================================================================

/**
 * Segments a transcript by template fields.
 * First attempts explicit marker detection, then falls back to AI inference.
 *
 * @param transcript - The audio transcript to segment
 * @param fields - Template field definitions
 * @param options - Optional model and prompt overrides from template AI config
 * @returns Segmentation result with field-specific content
 */
export async function segmentTranscriptByFields(
  transcript: string,
  fields: TemplateField[],
  options: {
    model?: string
    prompt?: string
  } = {}
): Promise<SegmentationResult> {
  // Validate inputs
  if (!transcript || transcript.trim().length === 0) {
    const segments: Record<string, string> = {}
    for (const field of fields) {
      segments[field.id] = ''
    }
    return { segments, warning: 'Leeres Transkript' }
  }

  if (!fields || fields.length === 0) {
    return { segments: {}, warning: 'Keine Felder definiert' }
  }

  // For single-field templates, no segmentation needed
  if (fields.length === 1) {
    return {
      segments: { [fields[0].id]: transcript },
    }
  }

  // Try explicit marker detection first
  const explicitResult = segmentByExplicitMarkers(transcript, fields)
  if (explicitResult) {
    return explicitResult
  }

  // Fall back to AI-based segmentation
  return segmentByAI(transcript, fields, options)
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Gets segmentation options from template AI config.
 */
export function getSegmentationOptions(aiConfig: TemplateAIConfig | null): {
  model?: string
  prompt?: string
} {
  if (!aiConfig) return {}

  return {
    model: aiConfig.segmentationModel,
    prompt: aiConfig.segmentationPrompt,
  }
}

/**
 * Checks if a template needs segmentation (has multiple fields).
 */
export function templateNeedsSegmentation(fields: TemplateField[] | null): boolean {
  return fields !== null && fields.length > 1
}
