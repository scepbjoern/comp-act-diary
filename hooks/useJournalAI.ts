/**
 * useJournalAI - Hook for Journal AI operations.
 * Provides functions to generate content, analysis, and summary.
 */

'use client'

import { useState, useCallback } from 'react'

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

export interface UseJournalAIReturn {
  isLoading: boolean
  error: string | null
  currentStep: 'content' | 'analysis' | 'summary' | null
  generateContent: (journalEntryId: string, text?: string) => Promise<GenerateResult | null>
  generateAnalysis: (journalEntryId: string) => Promise<GenerateResult | null>
  generateSummary: (journalEntryId: string) => Promise<GenerateResult | null>
  runPipeline: (journalEntryId: string, steps?: ('content' | 'analysis' | 'summary')[]) => Promise<PipelineResult | null>
  clearError: () => void
}

// =============================================================================
// HOOK
// =============================================================================

export function useJournalAI(): UseJournalAIReturn {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentStep, setCurrentStep] = useState<'content' | 'analysis' | 'summary' | null>(null)

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const generateContent = useCallback(async (
    journalEntryId: string,
    text?: string
  ): Promise<GenerateResult | null> => {
    setIsLoading(true)
    setError(null)
    setCurrentStep('content')

    try {
      const response = await fetch('/api/journal-ai/generate-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ journalEntryId, text }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate content')
      }

      return {
        text: data.content,
        tokensUsed: data.tokensUsed || 0,
        modelUsed: data.modelUsed || '',
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
      return null
    } finally {
      setIsLoading(false)
      setCurrentStep(null)
    }
  }, [])

  const generateAnalysis = useCallback(async (
    journalEntryId: string
  ): Promise<GenerateResult | null> => {
    setIsLoading(true)
    setError(null)
    setCurrentStep('analysis')

    try {
      const response = await fetch('/api/journal-ai/generate-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ journalEntryId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate analysis')
      }

      return {
        text: data.analysis,
        tokensUsed: data.tokensUsed || 0,
        modelUsed: data.modelUsed || '',
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
      return null
    } finally {
      setIsLoading(false)
      setCurrentStep(null)
    }
  }, [])

  const generateSummary = useCallback(async (
    journalEntryId: string
  ): Promise<GenerateResult | null> => {
    setIsLoading(true)
    setError(null)
    setCurrentStep('summary')

    try {
      const response = await fetch('/api/journal-ai/generate-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ journalEntryId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate summary')
      }

      return {
        text: data.aiSummary,
        tokensUsed: data.tokensUsed || 0,
        modelUsed: data.modelUsed || '',
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
      return null
    } finally {
      setIsLoading(false)
      setCurrentStep(null)
    }
  }, [])

  const runPipeline = useCallback(async (
    journalEntryId: string,
    steps?: ('content' | 'analysis' | 'summary')[]
  ): Promise<PipelineResult | null> => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/journal-ai/pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ journalEntryId, steps }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to run pipeline')
      }

      return data as PipelineResult
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
      return null
    } finally {
      setIsLoading(false)
      setCurrentStep(null)
    }
  }, [])

  return {
    isLoading,
    error,
    currentStep,
    generateContent,
    generateAnalysis,
    generateSummary,
    runPipeline,
    clearError,
  }
}
