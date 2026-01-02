/**
 * useLlmModels - Hook for managing user LLM models
 * Loads models from database and provides CRUD operations
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { LLMModel, LLMProvider } from '@/lib/llmModels'

export interface LlmModelData {
  id: string
  modelId: string
  name: string
  provider: LLMProvider
  inputCost: string | null
  outputCost: string | null
  url: string | null
  bestFor: string | null
  supportsReasoningEffort: boolean
  defaultReasoningEffort: string | null
  sortOrder: number
}

interface UseLlmModelsReturn {
  models: LlmModelData[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
  addModel: (model: Omit<LlmModelData, 'id' | 'sortOrder'>) => Promise<boolean>
  updateModel: (id: string, updates: Partial<LlmModelData>) => Promise<boolean>
  deleteModel: (id: string) => Promise<boolean>
  syncDefaultModels: () => Promise<{ added: number; skipped: number } | null>
}

export function useLlmModels(): UseLlmModelsReturn {
  const [models, setModels] = useState<LlmModelData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchModels = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await fetch('/api/llm-models')
      if (!response.ok) {
        throw new Error('Failed to fetch LLM models')
      }
      const data = await response.json()
      setModels(data.models || [])
    } catch (err) {
      console.error('Error fetching LLM models:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchModels()
  }, [fetchModels])

  const addModel = useCallback(async (model: Omit<LlmModelData, 'id' | 'sortOrder'>): Promise<boolean> => {
    try {
      const response = await fetch('/api/llm-models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(model),
      })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to add model')
      }
      await fetchModels()
      return true
    } catch (err) {
      console.error('Error adding LLM model:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
      return false
    }
  }, [fetchModels])

  const updateModel = useCallback(async (id: string, updates: Partial<LlmModelData>): Promise<boolean> => {
    try {
      const response = await fetch(`/api/llm-models/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      if (!response.ok) {
        throw new Error('Failed to update model')
      }
      await fetchModels()
      return true
    } catch (err) {
      console.error('Error updating LLM model:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
      return false
    }
  }, [fetchModels])

  const deleteModel = useCallback(async (id: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/llm-models/${id}`, {
        method: 'DELETE',
      })
      if (!response.ok) {
        throw new Error('Failed to delete model')
      }
      await fetchModels()
      return true
    } catch (err) {
      console.error('Error deleting LLM model:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
      return false
    }
  }, [fetchModels])

  const syncDefaultModels = useCallback(async (): Promise<{ added: number; skipped: number } | null> => {
    try {
      const response = await fetch('/api/llm-models/sync', {
        method: 'POST',
      })
      if (!response.ok) {
        throw new Error('Failed to sync default models')
      }
      const data = await response.json()
      await fetchModels()
      return { added: data.added, skipped: data.skipped }
    } catch (err) {
      console.error('Error syncing default models:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
      return null
    }
  }, [fetchModels])

  return {
    models,
    isLoading,
    error,
    refetch: fetchModels,
    addModel,
    updateModel,
    deleteModel,
    syncDefaultModels,
  }
}
