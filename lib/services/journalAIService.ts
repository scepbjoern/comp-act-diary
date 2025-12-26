/**
 * JournalAIService - Central service for all Journal AI operations.
 * Handles content generation, analysis, and summary creation.
 */

import { PrismaClient } from '@prisma/client'
import Together from 'together-ai'
import { DEFAULT_MODEL_ID } from '@/lib/llmModels'
import {
  interpolatePrompt,
  formatDateForPrompt,
  getDefaultAISettings,
  type JournalEntryTypeAISettings,
  type JournalAISettings,
} from '@/lib/defaultPrompts'

// =============================================================================
// TYPES
// =============================================================================

export interface GenerateResult {
  text: string
  tokensUsed: number
  modelUsed: string
}

export interface PipelineStepResult {
  step: 'content' | 'analysis' | 'summary'
  success: boolean
  error?: string
  tokensUsed?: number
}

export interface PipelineResult {
  content?: string
  analysis?: string
  aiSummary?: string
  steps: PipelineStepResult[]
  totalTokensUsed: number
}

// =============================================================================
// SERVICE CLASS
// =============================================================================

export class JournalAIService {
  private prisma: PrismaClient
  private together: Together

  constructor(prisma: PrismaClient) {
    this.prisma = prisma
    const apiKey = process.env.TOGETHERAI_API_KEY
    if (!apiKey) {
      throw new Error('Missing TOGETHERAI_API_KEY environment variable')
    }
    this.together = new Together({ apiKey })
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
      return getDefaultAISettings(DEFAULT_MODEL_ID)
    }

    // Check if user has settings for this type
    const typeSettings = journalAISettings?.[entryType.code]

    if (typeSettings) {
      // Merge with defaults to ensure all fields exist
      const defaults = getDefaultAISettings(DEFAULT_MODEL_ID)
      return {
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

    return getDefaultAISettings(DEFAULT_MODEL_ID)
  }

  /**
   * Calls the LLM via Together AI.
   */
  private async callLLM(params: {
    modelId: string
    systemPrompt: string
    userMessage: string
  }): Promise<{ text: string; tokensUsed: number }> {
    const { modelId, systemPrompt, userMessage } = params

    const response = await this.together.chat.completions.create({
      model: modelId,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      max_tokens: 4096,
      temperature: 0.7,
    })

    const text = response.choices?.[0]?.message?.content || ''
    const tokensUsed = response.usage?.total_tokens || 0

    return { text, tokensUsed }
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
