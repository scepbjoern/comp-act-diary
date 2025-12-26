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
  updateAllSettings: (allSettings: JournalAISettings) => Promise<boolean>
  resetToDefault: (typeCode: string, field: 'title' | 'content' | 'analysis' | 'summary') => Promise<boolean>
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

      console.log('[useAISettings] fetchSettings response:', JSON.stringify(data.user?.settings?.journalAISettings, null, 2))

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
  }, [settings])

  const updateSettingsForType = useCallback(async (
    typeCode: string,
    newSettings: Partial<JournalEntryTypeAISettings>
  ): Promise<boolean> => {
    try {
      setError(null)

      console.log('[useAISettings] updateSettingsForType called with:', { typeCode, newSettings })

      // Get defaults for fallback
      const defaults = getDefaultAISettings(DEFAULT_MODEL_ID)
      
      // Build complete settings for this type, using newSettings values directly
      const mergedSettings: JournalEntryTypeAISettings = {
        title: {
          modelId: newSettings.title?.modelId || settings[typeCode]?.title?.modelId || defaults.title.modelId,
          prompt: newSettings.title?.prompt ?? settings[typeCode]?.title?.prompt ?? defaults.title.prompt,
        },
        content: {
          modelId: newSettings.content?.modelId || settings[typeCode]?.content?.modelId || defaults.content.modelId,
          prompt: newSettings.content?.prompt ?? settings[typeCode]?.content?.prompt ?? defaults.content.prompt,
        },
        analysis: {
          modelId: newSettings.analysis?.modelId || settings[typeCode]?.analysis?.modelId || defaults.analysis.modelId,
          prompt: newSettings.analysis?.prompt ?? settings[typeCode]?.analysis?.prompt ?? defaults.analysis.prompt,
        },
        summary: {
          modelId: newSettings.summary?.modelId || settings[typeCode]?.summary?.modelId || defaults.summary.modelId,
          prompt: newSettings.summary?.prompt ?? settings[typeCode]?.summary?.prompt ?? defaults.summary.prompt,
        },
      }

      console.log('[useAISettings] mergedSettings:', mergedSettings)

      // Update local state optimistically
      const updatedSettings = {
        ...settings,
        [typeCode]: mergedSettings,
      }
      setSettings(updatedSettings)

      console.log('[useAISettings] Sending to API:', JSON.stringify({ journalAISettings: updatedSettings }, null, 2))

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
      console.log('[useAISettings] API response:', response.ok, data)

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
  }, [settings, fetchSettings])

  // Save all settings in a single API call (avoids race conditions)
  const updateAllSettings = useCallback(async (
    allSettings: JournalAISettings
  ): Promise<boolean> => {
    try {
      setError(null)

      console.log('[useAISettings] updateAllSettings called with:', JSON.stringify(allSettings, null, 2))

      // Update local state optimistically
      setSettings(allSettings)

      // Persist to server
      const response = await fetch('/api/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings: {
            journalAISettings: allSettings,
          },
        }),
      })

      const data = await response.json()
      console.log('[useAISettings] updateAllSettings API response:', response.ok, data)

      if (!response.ok) {
        await fetchSettings()
        throw new Error(data.error || 'Failed to update settings')
      }

      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
      return false
    }
  }, [fetchSettings])

  const resetToDefault = useCallback(async (
    typeCode: string,
    field: 'title' | 'content' | 'analysis' | 'summary'
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
    updateAllSettings,
    resetToDefault,
    refetch: fetchSettings,
  }
}
