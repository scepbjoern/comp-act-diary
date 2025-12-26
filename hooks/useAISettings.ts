/**
 * useAISettings - Hook for managing Journal AI settings.
 * Provides functions to load, update, and reset AI settings per JournalEntryType.
 */

'use client'

import { useState, useCallback, useEffect } from 'react'
import {
  type JournalAISettings,
  type JournalEntryTypeAISettings,
  getDefaultAISettings,
} from '@/lib/defaultPrompts'
import { DEFAULT_MODEL_ID } from '@/lib/llmModels'

// =============================================================================
// TYPES
// =============================================================================

export interface UseAISettingsReturn {
  settings: JournalAISettings
  isLoading: boolean
  error: string | null
  getSettingsForType: (typeCode: string) => JournalEntryTypeAISettings
  updateSettingsForType: (typeCode: string, settings: Partial<JournalEntryTypeAISettings>) => Promise<boolean>
  resetToDefault: (typeCode: string, field: 'content' | 'analysis' | 'summary') => Promise<boolean>
  refetch: () => Promise<void>
}

// =============================================================================
// HOOK
// =============================================================================

export function useAISettings(): UseAISettingsReturn {
  const [settings, setSettings] = useState<JournalAISettings>({})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSettings = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch('/api/me')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load settings')
      }

      setSettings(data.user?.settings?.journalAISettings || {})
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  const getSettingsForType = useCallback((typeCode: string): JournalEntryTypeAISettings => {
    const typeSettings = settings[typeCode]
    const defaults = getDefaultAISettings(DEFAULT_MODEL_ID)

    if (!typeSettings) {
      return defaults
    }

    // Merge with defaults to ensure all fields exist
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
  }, [settings])

  const updateSettingsForType = useCallback(async (
    typeCode: string,
    newSettings: Partial<JournalEntryTypeAISettings>
  ): Promise<boolean> => {
    try {
      setError(null)

      // Merge with existing settings
      const currentTypeSettings = getSettingsForType(typeCode)
      const mergedSettings: JournalEntryTypeAISettings = {
        content: {
          ...currentTypeSettings.content,
          ...newSettings.content,
        },
        analysis: {
          ...currentTypeSettings.analysis,
          ...newSettings.analysis,
        },
        summary: {
          ...currentTypeSettings.summary,
          ...newSettings.summary,
        },
      }

      // Update local state optimistically
      const updatedSettings = {
        ...settings,
        [typeCode]: mergedSettings,
      }
      setSettings(updatedSettings)

      // Persist to server
      const response = await fetch('/api/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings: {
            journalAISettings: updatedSettings,
          },
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        // Revert on error
        await fetchSettings()
        throw new Error(data.error || 'Failed to update settings')
      }

      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
      return false
    }
  }, [settings, getSettingsForType, fetchSettings])

  const resetToDefault = useCallback(async (
    typeCode: string,
    field: 'content' | 'analysis' | 'summary'
  ): Promise<boolean> => {
    const defaults = getDefaultAISettings(DEFAULT_MODEL_ID)
    
    return updateSettingsForType(typeCode, {
      [field]: defaults[field],
    })
  }, [updateSettingsForType])

  return {
    settings,
    isLoading,
    error,
    getSettingsForType,
    updateSettingsForType,
    resetToDefault,
    refetch: fetchSettings,
  }
}
