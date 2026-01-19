/**
 * JournalAIService - Central service for all Journal AI operations.
 * Handles content generation, analysis, and summary creation.
 */

import { PrismaClient } from '@prisma/client'
import Together from 'together-ai'
import OpenAI from 'openai'
import {
  FALLBACK_MODEL_ID,
  inferProvider,
  getApiKeyForProvider,
  type LLMProvider,
} from '@/lib/config/llmModels'
import {
  interpolatePrompt,
  formatDateForPrompt,
  getDefaultAISettings,
  type JournalEntryTypeAISettings,
  type JournalAISettings,
} from '@/lib/config/defaultPrompts'

// =============================================================================
// TYPES
// =============================================================================

export interface GenerateResult {
  text: string
  tokensUsed: number
  modelUsed: string
}

export interface PipelineStepResult {
  step: 'title' | 'content' | 'analysis' | 'summary'
  success: boolean
  error?: string
  tokensUsed?: number
}

export interface PipelineResult {
  title?: string
  content?: string
  analysis?: string
  aiSummary?: string
  steps: PipelineStepResult[]
  totalTokensUsed: number
}

export interface BatchPipelineParams {
  userId: string
  dateFrom: string
  dateTo: string
  typeCodes: string[]
  steps: ('title' | 'content' | 'analysis' | 'summary')[]
  overwriteMode: 'empty_only' | 'overwrite_all'
}

export interface BatchEntryResult {
  entryId: string
  entryTitle: string | null
  entryDate: string
  success: boolean
  stepsRun: string[]
  error?: string
}

export interface BatchPipelineResult {
  totalProcessed: number
  successCount: number
  errorCount: number
  results: BatchEntryResult[]
  totalTokensUsed: number
}

export interface AffectedEntry {
  id: string
  date: string
  title: string | null
  typeName: string
  typeCode: string
  typeIcon: string | null
  hasTitle: boolean
  hasContent: boolean
  hasAnalysis: boolean
  hasSummary: boolean
}

// =============================================================================
// SERVICE CLASS
// =============================================================================

export class JournalAIService {
  private prisma: PrismaClient

  constructor(prisma: PrismaClient) {
    this.prisma = prisma
  }

  /**
   * Gets the provider for a model from the database or infers it from the model ID.
   */
  private async getProviderForModel(modelId: string, userId: string): Promise<LLMProvider> {
    // Try to find the model in user's configured models
    const userModel = await this.prisma.llmModel.findFirst({
      where: { userId, modelId },
      select: { provider: true },
    })
    
    if (userModel?.provider) {
      return userModel.provider as LLMProvider
    }
    
    // Fallback: infer provider from model ID
    return inferProvider(modelId)
  }

  /**
   * Gets model configuration including reasoning effort support from the database.
   */
  private async getModelConfig(modelId: string, userId: string): Promise<{
    provider: LLMProvider
    supportsReasoningEffort: boolean
    defaultReasoningEffort: string | null
  }> {
    const userModel = await this.prisma.llmModel.findFirst({
      where: { userId, modelId },
      select: { provider: true, supportsReasoningEffort: true, defaultReasoningEffort: true },
    })
    
    return {
      provider: (userModel?.provider as LLMProvider) || inferProvider(modelId),
      supportsReasoningEffort: userModel?.supportsReasoningEffort ?? false,
      defaultReasoningEffort: userModel?.defaultReasoningEffort ?? null,
    }
  }

  /**
   * Generates formatted content from originalTranscript.
   */
  async generateContent(params: {
    journalEntryId: string
    userId: string
    text?: string
  }): Promise<GenerateResult> {
    const { journalEntryId, userId, text } = params

    // Load journal entry to get originalTranscript and type
    const entry = await this.prisma.journalEntry.findUnique({
      where: { id: journalEntryId },
      include: { type: true },
    })

    if (!entry) {
      throw new Error('Journal entry not found')
    }

    if (entry.userId !== userId) {
      throw new Error('Unauthorized')
    }

    const inputText = text ?? entry.originalTranscript ?? entry.content
    if (!inputText) {
      throw new Error('No text to process')
    }

    // Get AI settings for this entry type
    const settings = await this.getSettingsForEntry(entry.typeId, userId)
    const { modelId, prompt } = settings.content

    // Interpolate variables in prompt
    const interpolatedPrompt = interpolatePrompt(prompt, {
      '{{date}}': formatDateForPrompt(entry.createdAt),
      '{{entryType}}': entry.type.name,
      '{{title}}': entry.title ?? '',
    })

    // Call LLM
    const result = await this.callLLM({
      modelId,
      systemPrompt: interpolatedPrompt,
      userMessage: inputText,
      userId,
    })

    // Update entry with new content and contentUpdatedAt
    await this.prisma.journalEntry.update({
      where: { id: journalEntryId },
      data: {
        content: result.text,
        contentUpdatedAt: new Date(),
      },
    })

    return {
      text: result.text,
      tokensUsed: result.tokensUsed,
      modelUsed: modelId,
    }
  }

  /**
   * Generates formatted content from raw text without a journal entry.
   * Used for improving text before saving a new entry.
   */
  async generateContentFromText(params: {
    text: string
    userId: string
    typeCode?: string
  }): Promise<GenerateResult> {
    const { text, userId, typeCode = 'diary' } = params

    // Get AI settings for this type
    const entryType = await this.prisma.journalEntryType.findFirst({
      where: { code: typeCode },
    })

    const settings = entryType
      ? await this.getSettingsForEntry(entryType.id, userId)
      : getDefaultAISettings(FALLBACK_MODEL_ID)

    const { modelId, prompt } = settings.content

    // Interpolate variables
    const interpolatedPrompt = interpolatePrompt(prompt, {
      '{{date}}': formatDateForPrompt(new Date()),
      '{{entryType}}': entryType?.name ?? 'Tagebucheintrag',
      '{{title}}': '',
    })

    // Call LLM
    const result = await this.callLLM({
      modelId,
      systemPrompt: interpolatedPrompt,
      userMessage: text,
      userId,
    })

    return {
      text: result.text,
      tokensUsed: result.tokensUsed,
      modelUsed: modelId,
    }
  }

  /**
   * Generates ACT-based analysis from content.
   */
  async generateAnalysis(params: {
    journalEntryId: string
    userId: string
  }): Promise<GenerateResult> {
    const { journalEntryId, userId } = params

    // Load journal entry
    const entry = await this.prisma.journalEntry.findUnique({
      where: { id: journalEntryId },
      include: { type: true },
    })

    if (!entry) {
      throw new Error('Journal entry not found')
    }

    if (entry.userId !== userId) {
      throw new Error('Unauthorized')
    }

    if (!entry.content) {
      throw new Error('No content to analyze')
    }

    // Get AI settings
    const settings = await this.getSettingsForEntry(entry.typeId, userId)
    const { modelId, prompt } = settings.analysis

    // Interpolate variables
    const interpolatedPrompt = interpolatePrompt(prompt, {
      '{{date}}': formatDateForPrompt(entry.createdAt),
      '{{entryType}}': entry.type.name,
      '{{title}}': entry.title ?? '',
    })

    // Call LLM
    const result = await this.callLLM({
      modelId,
      systemPrompt: interpolatedPrompt,
      userMessage: entry.content,
      userId,
    })

    // Update entry with analysis
    await this.prisma.journalEntry.update({
      where: { id: journalEntryId },
      data: { analysis: result.text },
    })

    return {
      text: result.text,
      tokensUsed: result.tokensUsed,
      modelUsed: modelId,
    }
  }

  /**
   * Generates summary from content.
   */
  async generateSummary(params: {
    journalEntryId: string
    userId: string
  }): Promise<GenerateResult> {
    const { journalEntryId, userId } = params

    // Load journal entry
    const entry = await this.prisma.journalEntry.findUnique({
      where: { id: journalEntryId },
      include: { type: true },
    })

    if (!entry) {
      throw new Error('Journal entry not found')
    }

    if (entry.userId !== userId) {
      throw new Error('Unauthorized')
    }

    if (!entry.content) {
      throw new Error('No content to summarize')
    }

    // Get AI settings
    const settings = await this.getSettingsForEntry(entry.typeId, userId)
    const { modelId, prompt } = settings.summary

    // Interpolate variables
    const interpolatedPrompt = interpolatePrompt(prompt, {
      '{{date}}': formatDateForPrompt(entry.createdAt),
      '{{entryType}}': entry.type.name,
      '{{title}}': entry.title ?? '',
    })

    // Call LLM
    const result = await this.callLLM({
      modelId,
      systemPrompt: interpolatedPrompt,
      userMessage: entry.content,
      userId,
    })

    // Update entry with summary
    await this.prisma.journalEntry.update({
      where: { id: journalEntryId },
      data: { aiSummary: result.text },
    })

    return {
      text: result.text,
      tokensUsed: result.tokensUsed,
      modelUsed: modelId,
    }
  }

  /**
   * Runs the full AI pipeline: content → analysis → summary.
   */
  async runPipeline(params: {
    journalEntryId: string
    userId: string
    steps?: ('content' | 'analysis' | 'summary')[]
  }): Promise<PipelineResult> {
    const { journalEntryId, userId, steps = ['content', 'analysis', 'summary'] } = params

    const result: PipelineResult = {
      steps: [],
      totalTokensUsed: 0,
    }

    // Step 1: Generate content (if requested and originalTranscript exists)
    if (steps.includes('content')) {
      try {
        const contentResult = await this.generateContent({ journalEntryId, userId })
        result.content = contentResult.text
        result.totalTokensUsed += contentResult.tokensUsed
        result.steps.push({
          step: 'content',
          success: true,
          tokensUsed: contentResult.tokensUsed,
        })
      } catch (error) {
        result.steps.push({
          step: 'content',
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    // Step 2: Generate analysis (if requested)
    if (steps.includes('analysis')) {
      try {
        const analysisResult = await this.generateAnalysis({ journalEntryId, userId })
        result.analysis = analysisResult.text
        result.totalTokensUsed += analysisResult.tokensUsed
        result.steps.push({
          step: 'analysis',
          success: true,
          tokensUsed: analysisResult.tokensUsed,
        })
      } catch (error) {
        result.steps.push({
          step: 'analysis',
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    // Step 3: Generate summary (if requested)
    if (steps.includes('summary')) {
      try {
        const summaryResult = await this.generateSummary({ journalEntryId, userId })
        result.aiSummary = summaryResult.text
        result.totalTokensUsed += summaryResult.tokensUsed
        result.steps.push({
          step: 'summary',
          success: true,
          tokensUsed: summaryResult.tokensUsed,
        })
      } catch (error) {
        result.steps.push({
          step: 'summary',
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    return result
  }

  /**
   * Generates a title for a journal entry.
   */
  async generateTitle(params: {
    journalEntryId: string
    userId: string
  }): Promise<GenerateResult> {
    const { journalEntryId, userId } = params

    const entry = await this.prisma.journalEntry.findUnique({
      where: { id: journalEntryId },
      include: { type: true },
    })

    if (!entry) {
      throw new Error('Journal entry not found')
    }

    if (entry.userId !== userId) {
      throw new Error('Unauthorized')
    }

    if (!entry.content) {
      throw new Error('No content to generate title from')
    }

    const settings = await this.getSettingsForEntry(entry.typeId, userId)
    const { modelId, prompt } = settings.title

    const interpolatedPrompt = interpolatePrompt(prompt, {
      '{{date}}': formatDateForPrompt(entry.createdAt),
      '{{entryType}}': entry.type.name,
      '{{title}}': entry.title ?? '',
    })

    const result = await this.callLLM({
      modelId,
      systemPrompt: interpolatedPrompt,
      userMessage: entry.content.substring(0, 1000),
      userId,
    })

    // Update entry with new title
    await this.prisma.journalEntry.update({
      where: { id: journalEntryId },
      data: { title: result.text.trim() },
    })

    return {
      text: result.text.trim(),
      tokensUsed: result.tokensUsed,
      modelUsed: modelId,
    }
  }

  /**
   * Gets affected entries for batch processing (dry-run).
   */
  async getAffectedEntries(params: BatchPipelineParams): Promise<AffectedEntry[]> {
    const { userId, dateFrom, dateTo, typeCodes, steps, overwriteMode } = params

    // Get type IDs for the requested codes
    const types = await this.prisma.journalEntryType.findMany({
      where: {
        OR: [
          { userId: null, code: { in: typeCodes } },
          { userId, code: { in: typeCodes } },
        ],
      },
    })
    const typeIds = types.map(t => t.id)
    const typeMap = new Map(types.map(t => [t.id, t]))

    if (typeIds.length === 0) {
      return []
    }

    // Get timeboxes in date range
    const timeBoxes = await this.prisma.timeBox.findMany({
      where: {
        userId,
        kind: 'DAY',
        localDate: {
          gte: dateFrom,
          lte: dateTo,
        },
      },
      select: { id: true, localDate: true },
    })
    const timeBoxIds = timeBoxes.map(t => t.id)
    const timeBoxMap = new Map(timeBoxes.map(t => [t.id, t.localDate]))

    if (timeBoxIds.length === 0) {
      return []
    }

    // Get journal entries
    const entries = await this.prisma.journalEntry.findMany({
      where: {
        userId,
        typeId: { in: typeIds },
        timeBoxId: { in: timeBoxIds },
        deletedAt: null,
      },
      select: {
        id: true,
        title: true,
        content: true,
        analysis: true,
        aiSummary: true,
        typeId: true,
        timeBoxId: true,
      },
    })

    // Filter based on overwriteMode
    const affectedEntries: AffectedEntry[] = []

    for (const entry of entries) {
      const type = typeMap.get(entry.typeId)
      const localDate = timeBoxMap.get(entry.timeBoxId) || ''

      const hasTitle = Boolean(entry.title?.trim())
      const hasContent = Boolean(entry.content?.trim())
      const hasAnalysis = Boolean(entry.analysis?.trim())
      const hasSummary = Boolean(entry.aiSummary?.trim())

      // Check if entry should be included based on overwriteMode
      let shouldInclude = false

      if (overwriteMode === 'overwrite_all') {
        // Always include if content exists (needed for processing)
        shouldInclude = hasContent || steps.includes('content')
      } else {
        // Only include if at least one requested step has empty field
        for (const step of steps) {
          if (step === 'title' && !hasTitle && hasContent) shouldInclude = true
          if (step === 'content' && !hasContent) shouldInclude = true
          if (step === 'analysis' && !hasAnalysis && hasContent) shouldInclude = true
          if (step === 'summary' && !hasSummary && hasContent) shouldInclude = true
        }
      }

      if (shouldInclude) {
        affectedEntries.push({
          id: entry.id,
          date: localDate,
          title: entry.title,
          typeName: type?.name || 'Unbekannt',
          typeCode: type?.code || 'unknown',
          typeIcon: type?.icon || null,
          hasTitle,
          hasContent,
          hasAnalysis,
          hasSummary,
        })
      }
    }

    // Sort by date descending
    affectedEntries.sort((a, b) => b.date.localeCompare(a.date))

    return affectedEntries
  }

  /**
   * Runs batch pipeline on multiple entries.
   */
  async runBatchPipeline(params: BatchPipelineParams): Promise<BatchPipelineResult> {
    const { userId, steps, overwriteMode } = params

    const affectedEntries = await this.getAffectedEntries(params)

    const result: BatchPipelineResult = {
      totalProcessed: 0,
      successCount: 0,
      errorCount: 0,
      results: [],
      totalTokensUsed: 0,
    }

    for (const entry of affectedEntries) {
      result.totalProcessed++
      const stepsRun: string[] = []
      let entrySuccess = true
      let entryError: string | undefined

      try {
        // Run each requested step
        for (const step of steps) {
          // Check if we should skip based on overwriteMode
          if (overwriteMode === 'empty_only') {
            if (step === 'title' && entry.hasTitle) continue
            if (step === 'analysis' && entry.hasAnalysis) continue
            if (step === 'summary' && entry.hasSummary) continue
          }

          // Skip if no content (except for content step)
          if (step !== 'content' && !entry.hasContent) continue

          try {
            if (step === 'title') {
              const r = await this.generateTitle({ journalEntryId: entry.id, userId })
              result.totalTokensUsed += r.tokensUsed
              stepsRun.push('title')
            } else if (step === 'content') {
              const r = await this.generateContent({ journalEntryId: entry.id, userId })
              result.totalTokensUsed += r.tokensUsed
              stepsRun.push('content')
            } else if (step === 'analysis') {
              const r = await this.generateAnalysis({ journalEntryId: entry.id, userId })
              result.totalTokensUsed += r.tokensUsed
              stepsRun.push('analysis')
            } else if (step === 'summary') {
              const r = await this.generateSummary({ journalEntryId: entry.id, userId })
              result.totalTokensUsed += r.tokensUsed
              stepsRun.push('summary')
            }
          } catch (stepError) {
            // Continue with other steps even if one fails
            console.error(`Step ${step} failed for entry ${entry.id}:`, stepError)
          }
        }

        if (stepsRun.length > 0) {
          result.successCount++
        }
      } catch (error) {
        entrySuccess = false
        entryError = error instanceof Error ? error.message : 'Unknown error'
        result.errorCount++
      }

      result.results.push({
        entryId: entry.id,
        entryTitle: entry.title,
        entryDate: entry.date,
        success: entrySuccess && stepsRun.length > 0,
        stepsRun,
        error: entryError,
      })
    }

    return result
  }

  /**
   * Gets AI settings for a journal entry type.
   * Falls back to defaults if no user settings exist.
   */
  private async getSettingsForEntry(
    typeId: string,
    userId: string
  ): Promise<JournalEntryTypeAISettings> {
    // Load user with settings
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { settings: true },
    })

    const userSettings = user?.settings as Record<string, unknown> | null
    const journalAISettings = userSettings?.journalAISettings as JournalAISettings | undefined

    // Load journal entry type to get the code
    const entryType = await this.prisma.journalEntryType.findUnique({
      where: { id: typeId },
      select: { code: true },
    })

    if (!entryType) {
      return getDefaultAISettings(FALLBACK_MODEL_ID)
    }

    // Check if user has settings for this type
    const typeSettings = journalAISettings?.[entryType.code]

    if (typeSettings) {
      // Merge with defaults to ensure all fields exist
      const defaults = getDefaultAISettings(FALLBACK_MODEL_ID)
      return {
        title: {
          modelId: typeSettings.title?.modelId || defaults.title.modelId,
          prompt: typeSettings.title?.prompt || defaults.title.prompt,
        },
        content: {
          modelId: typeSettings.content?.modelId || defaults.content.modelId,
          prompt: typeSettings.content?.prompt || defaults.content.prompt,
        },
        analysis: {
          modelId: typeSettings.analysis?.modelId || defaults.analysis.modelId,
          prompt: typeSettings.analysis?.prompt || defaults.analysis.prompt,
        },
        summary: {
          modelId: typeSettings.summary?.modelId || defaults.summary.modelId,
          prompt: typeSettings.summary?.prompt || defaults.summary.prompt,
        },
      }
    }

    return getDefaultAISettings(FALLBACK_MODEL_ID)
  }

  /**
   * Calls the LLM via the appropriate provider (OpenAI or TogetherAI).
   * Supports reasoning_effort parameter for OpenAI GPT-5 series models.
   */
  private async callLLM(params: {
    modelId: string
    systemPrompt: string
    userMessage: string
    userId: string
    reasoningEffort?: string
  }): Promise<{ text: string; tokensUsed: number }> {
    const { modelId, systemPrompt, userMessage, userId, reasoningEffort } = params
    
    const modelConfig = await this.getModelConfig(modelId, userId)
    const apiKey = getApiKeyForProvider(modelConfig.provider)
    
    if (!apiKey) {
      throw new Error(`Missing API key for provider: ${modelConfig.provider}`)
    }

    const messages: Array<{ role: 'system' | 'user'; content: string }> = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ]

    if (modelConfig.provider === 'openai') {
      const openai = new OpenAI({ apiKey })
      
      // Build request options
      const requestOptions: Parameters<typeof openai.chat.completions.create>[0] = {
        model: modelId,
        messages,
        max_tokens: 4096,
        temperature: 0.7,
        stream: false as const,
      }
      
      // Add reasoning_effort for models that support it (GPT-5 series)
      if (modelConfig.supportsReasoningEffort) {
        const effort = reasoningEffort || modelConfig.defaultReasoningEffort || 'medium'
        if (effort !== 'none') {
          // reasoning_effort is passed via the reasoning object for GPT-5 models
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ;(requestOptions as any).reasoning = { effort }
        }
      }
      
      const response = await openai.chat.completions.create(requestOptions) as OpenAI.Chat.ChatCompletion
      const text = response.choices?.[0]?.message?.content || ''
      const tokensUsed = response.usage?.total_tokens || 0
      return { text, tokensUsed }
    } else {
      const together = new Together({ apiKey })
      
      // Build request options
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const requestOptions: any = {
        model: modelId,
        messages,
        max_tokens: 4096,
        temperature: 0.7,
      }
      
      // Add reasoning_effort for TogetherAI models that support it
      if (modelConfig.supportsReasoningEffort) {
        const effort = reasoningEffort || modelConfig.defaultReasoningEffort
        if (effort && effort !== 'none') {
          requestOptions.reasoning_effort = effort
        }
      }
      
      const response = await together.chat.completions.create(requestOptions)
      const text = response.choices?.[0]?.message?.content || ''
      const tokensUsed = response.usage?.total_tokens || 0
      return { text, tokensUsed }
    }
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

let journalAIServiceInstance: JournalAIService | null = null

/**
 * Gets the JournalAIService singleton instance.
 */
export function getJournalAIService(prisma: PrismaClient): JournalAIService {
  if (!journalAIServiceInstance) {
    journalAIServiceInstance = new JournalAIService(prisma)
  }
  return journalAIServiceInstance
}
