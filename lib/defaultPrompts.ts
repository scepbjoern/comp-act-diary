/**
 * Default prompts and TypeScript interfaces for Journal AI features.
 * These prompts are used when no user-specific settings are configured.
 */

import { z } from 'zod'

// =============================================================================
// DEFAULT PROMPTS
// =============================================================================

export const DEFAULT_CONTENT_PROMPT = `Du bist ein professioneller Texteditor. Verbessere das folgende Transkript:
- Korrigiere Grammatik und Rechtschreibung (Schweizer Rechtschreibung mit ss)
- Strukturiere den Text in sinnvolle Absätze
- Verwende Markdown für Formatierung (Überschriften, Listen wo sinnvoll)
- Behalte den persönlichen Stil und alle Inhalte bei
- Entferne Füllwörter und Wiederholungen

Datum des Eintrags: {{date}}
Eintragstyp: {{entryType}}

Gib nur den verbesserten Text zurück, ohne Erklärungen.`

export const DEFAULT_ANALYSIS_PROMPT = `Du bist ein ACT-Therapeut (Acceptance and Commitment Therapy). Analysiere den folgenden Tagebucheintrag aus ACT-Perspektive:

- Identifiziere Gedankenmuster (z.B. Fusion, Vermeidung)
- Erkenne Emotionen und deren Akzeptanz
- Beobachte wertebezogenes Handeln
- Gib konstruktive Reflexionsfragen

Datum: {{date}}

Formatiere als Markdown mit klaren Abschnitten. Sei einfühlsam und nicht wertend.`

export const DEFAULT_SUMMARY_PROMPT = `Fasse den folgenden Tagebucheintrag in 2-3 kurzen Sätzen zusammen.
Fokussiere auf: Hauptthemen, emotionale Kernaussage, wichtigste Ereignisse.

Datum: {{date}}

Antworte direkt mit der Zusammenfassung, ohne Einleitung.`

// =============================================================================
// PROMPT VARIABLES
// =============================================================================

/**
 * Supported variables that can be used in prompts.
 * Variables are replaced with actual values during prompt interpolation.
 */
export const PROMPT_VARIABLES = {
  '{{date}}': 'Datum des Eintrags (z.B. "23. Dezember 2024")',
  '{{entryType}}': 'Typ des Eintrags (z.B. "Tagebucheintrag")',
  '{{content}}': 'Der zu verarbeitende Text',
  '{{title}}': 'Titel des Eintrags (falls vorhanden)',
} as const

export type PromptVariable = keyof typeof PROMPT_VARIABLES

// =============================================================================
// TYPESCRIPT INTERFACES
// =============================================================================

/**
 * AI settings for a single AI function (content, analysis, or summary).
 */
export interface AIFunctionSettings {
  modelId: string
  prompt: string
}

/**
 * AI settings for a single JournalEntryType.
 */
export interface JournalEntryTypeAISettings {
  content: AIFunctionSettings
  analysis: AIFunctionSettings
  summary: AIFunctionSettings
}

/**
 * AI settings for all JournalEntryTypes, keyed by type code.
 */
export interface JournalAISettings {
  [journalEntryTypeCode: string]: JournalEntryTypeAISettings
}

/**
 * Extended user settings including AI configuration.
 */
export interface UserSettingsWithAI {
  theme: 'dark' | 'bright'
  timeFormat24h: boolean
  weekStart: 'mon' | 'sun'
  autosaveEnabled: boolean
  autosaveIntervalSec: number
  summaryModel: string
  summaryPrompt: string
  customModels: Array<{ id: string; name: string; inputCost?: string; outputCost?: string }>
  journalAISettings?: JournalAISettings
}

// =============================================================================
// ZOD SCHEMAS
// =============================================================================

export const AIFunctionSettingsSchema = z.object({
  modelId: z.string().min(1),
  prompt: z.string().min(1),
})

export const JournalEntryTypeAISettingsSchema = z.object({
  content: AIFunctionSettingsSchema,
  analysis: AIFunctionSettingsSchema,
  summary: AIFunctionSettingsSchema,
})

export const JournalAISettingsSchema = z.record(z.string(), JournalEntryTypeAISettingsSchema)

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Interpolates variables in a prompt string.
 * @param prompt - The prompt template with {{variable}} placeholders
 * @param variables - Object mapping variable names to their values
 * @returns The prompt with variables replaced
 */
export function interpolatePrompt(
  prompt: string,
  variables: Partial<Record<PromptVariable, string>>
): string {
  let result = prompt
  for (const [key, value] of Object.entries(variables)) {
    if (value !== undefined) {
      result = result.split(key).join(value)
    }
  }
  return result
}

/**
 * Gets the default AI settings for a JournalEntryType.
 * @param defaultModelId - The default model ID to use
 * @returns Default AI settings
 */
export function getDefaultAISettings(defaultModelId: string): JournalEntryTypeAISettings {
  return {
    content: {
      modelId: defaultModelId,
      prompt: DEFAULT_CONTENT_PROMPT,
    },
    analysis: {
      modelId: defaultModelId,
      prompt: DEFAULT_ANALYSIS_PROMPT,
    },
    summary: {
      modelId: defaultModelId,
      prompt: DEFAULT_SUMMARY_PROMPT,
    },
  }
}

/**
 * Formats a date for use in prompts.
 * @param date - The date to format
 * @returns Formatted date string (e.g., "23. Dezember 2024")
 */
export function formatDateForPrompt(date: Date): string {
  return date.toLocaleDateString('de-CH', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}
