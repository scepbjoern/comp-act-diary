/**
 * Task AI Service
 * Handles AI-powered task extraction from journal entry content.
 * Uses LLM to identify actionable items, categorize them, and estimate priority.
 */

import { logger } from '@/lib/core/logger'
import Together from 'together-ai'
import OpenAI from 'openai'
import {
  FALLBACK_MODEL_ID,
  inferProvider,
  getApiKeyForProvider,
} from '@/lib/config/llmModels'
import type { TaskType, TaskPriority } from '@/lib/validators/task'
import { DEFAULT_TASK_EXTRACTION_PROMPT } from '@/lib/config/defaultTaskExtractionPrompt'

// =============================================================================
// TYPES
// =============================================================================

/** Raw task suggestion from AI extraction */
export interface TaskSuggestion {
  title: string
  description?: string
  taskType: TaskType
  priority: TaskPriority
  suggestedDueDate?: Date | null
  relatedContactName?: string | null
  confidence: number
}

/** Result of task extraction */
export interface TaskExtractionResult {
  suggestions: TaskSuggestion[]
  tokensUsed: number
  modelUsed: string
}

/** Schema for LLM response validation */
interface RawTaskFromLLM {
  title: string
  description?: string
  taskType: string
  priority: string
  suggestedDueDate?: string | null
  relatedPersonName?: string | null
  confidence: number
}

// Prompt is now imported from config file:
// @/lib/config/defaultTaskExtractionPrompt.ts

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Validates and converts raw LLM output to typed TaskSuggestion array
 */
function parseTasksFromLLM(rawResponse: string): TaskSuggestion[] {
  try {
    // Try to extract JSON from response (handle markdown code blocks)
    let jsonStr = rawResponse.trim()
    
    // Remove markdown code blocks if present
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
    }
    
    const parsed = JSON.parse(jsonStr) as RawTaskFromLLM[]
    
    if (!Array.isArray(parsed)) {
      logger.warn('LLM response is not an array')
      return []
    }
    
    const validTaskTypes: TaskType[] = [
      'IMMEDIATE', 'REFLECTION', 'PLANNED_INTERACTION',
      'FOLLOW_UP', 'RESEARCH', 'HABIT_RELATED', 'GENERAL'
    ]
    const validPriorities: TaskPriority[] = ['LOW', 'MEDIUM', 'HIGH']
    
    return parsed
      .filter((item): item is RawTaskFromLLM => {
        return (
          typeof item === 'object' &&
          item !== null &&
          typeof item.title === 'string' &&
          item.title.length > 0 &&
          typeof item.confidence === 'number'
        )
      })
      .map((item) => ({
        title: item.title.substring(0, 500),
        description: item.description?.substring(0, 5000),
        taskType: validTaskTypes.includes(item.taskType as TaskType)
          ? (item.taskType as TaskType)
          : 'GENERAL',
        priority: validPriorities.includes(item.priority as TaskPriority)
          ? (item.priority as TaskPriority)
          : 'MEDIUM',
        suggestedDueDate: item.suggestedDueDate
          ? parseDate(item.suggestedDueDate)
          : null,
        relatedContactName: item.relatedPersonName || null,
        confidence: Math.max(0, Math.min(1, item.confidence)),
      }))
  } catch (error) {
    logger.error({ error, rawResponse: rawResponse.substring(0, 500) }, 'Failed to parse LLM task response')
    return []
  }
}

/**
 * Parses a date string safely
 */
function parseDate(dateStr: string): Date | null {
  try {
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) return null
    return date
  } catch {
    return null
  }
}

// =============================================================================
// MAIN FUNCTIONS
// =============================================================================

/**
 * Extracts tasks from journal entry content using AI
 */
export async function extractTasksFromContent(
  content: string,
  modelId?: string,
  userId?: string,
  customPrompt?: string
): Promise<TaskExtractionResult> {
  const model = modelId || FALLBACK_MODEL_ID
  const provider = inferProvider(model)
  const apiKey = getApiKeyForProvider(provider)
  
  if (!apiKey) {
    const envVar = provider === 'openai' ? 'OPENAI_API_KEY' : 'TOGETHERAI_API_KEY'
    throw new Error(`Missing ${envVar} environment variable`)
  }
  
  if (!content || content.trim().length < 10) {
    return { suggestions: [], tokensUsed: 0, modelUsed: model }
  }
  
  const messages: Array<{ role: 'system' | 'user'; content: string }> = [
    { role: 'system', content: customPrompt || DEFAULT_TASK_EXTRACTION_PROMPT },
    { role: 'user', content: content },
  ]
  
  let responseText = ''
  let tokensUsed = 0
  
  try {
    if (provider === 'openai') {
      const openai = new OpenAI({ apiKey })
      const response = await openai.chat.completions.create({
        model,
        messages,
        max_tokens: 2048,
        temperature: 0.3, // Lower temperature for more consistent output
      })
      responseText = response.choices?.[0]?.message?.content || '[]'
      tokensUsed = response.usage?.total_tokens || 0
    } else {
      const together = new Together({ apiKey })
      const response = await together.chat.completions.create({
        model,
        messages,
        max_tokens: 2048,
        temperature: 0.3,
      })
      responseText = response.choices?.[0]?.message?.content || '[]'
      tokensUsed = response.usage?.total_tokens || 0
    }
    
    const suggestions = parseTasksFromLLM(responseText)
    
    logger.info({
      suggestionsCount: suggestions.length,
      tokensUsed,
      model,
      userId,
    }, 'Task extraction completed')
    
    return {
      suggestions,
      tokensUsed,
      modelUsed: model,
    }
  } catch (error) {
    logger.error({ error, model, provider }, 'Task extraction failed')
    throw error
  }
}

/**
 * Builds the task extraction prompt (for debugging/customization)
 */
export function getTaskExtractionPrompt(): string {
  return DEFAULT_TASK_EXTRACTION_PROMPT
}
