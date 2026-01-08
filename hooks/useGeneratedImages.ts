/**
 * useGeneratedImages - Hook for managing AI-generated images for an entity
 */

'use client'

import { useState, useCallback, useEffect } from 'react'

// =============================================================================
// TYPES
// =============================================================================

export interface GeneratedImageAsset {
  id: string
  filePath: string | null
  width: number | null
  height: number | null
  mimeType: string
}

export interface GeneratedImage {
  id: string
  entityId: string
  assetId: string
  model: string
  prompt: string
  aspectRatio: string
  steps: number
  displayOrder: number
  createdAt: string
  asset: GeneratedImageAsset
}

export interface UseGeneratedImagesReturn {
  images: GeneratedImage[]
  loading: boolean
  generating: boolean
  fetched: boolean
  error: string | null
  generateImage: (summaryText: string, customPrompt?: string) => Promise<boolean>
  deleteImage: (id: string) => Promise<boolean>
  refetch: () => Promise<void>
}

// =============================================================================
// HOOK
// =============================================================================

export function useGeneratedImages(
  entityId: string | null,
  onToast?: (message: string, type: 'success' | 'error' | 'info') => void
): UseGeneratedImagesReturn {
  const [images, setImages] = useState<GeneratedImage[]>([])
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [fetched, setFetched] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchImages = useCallback(async () => {
    if (!entityId) {
      setImages([])
      setFetched(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/generated-images?entityId=${entityId}`, {
        credentials: 'same-origin',
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch images')
      }

      setImages(data.images || [])
      setFetched(true)
    } catch (err) {
      console.error('[useGeneratedImages] fetchImages failed:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
      setFetched(true)
    } finally {
      setLoading(false)
    }
  }, [entityId])

  useEffect(() => {
    fetchImages()
  }, [fetchImages])

  const generateImage = useCallback(
    async (summaryText: string, customPrompt?: string): Promise<boolean> => {
      if (!entityId) return false

      const requestBody: { entityId: string; summaryText: string; customPrompt?: string } = { 
        entityId, 
        summaryText 
      }
      
      // If custom prompt is provided, send it instead of summaryText
      // The API will use this directly as the prompt
      if (customPrompt) {
        requestBody.customPrompt = customPrompt
      }

      setGenerating(true)
      setError(null)

      try {
        const res = await fetch('/api/generated-images', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify(requestBody),
        })
        
        // DEBUG: Log response details
        console.log('Fetch response status:', res.status)
        console.log('Fetch response ok:', res.ok)
        console.log('Fetch response headers:', Object.fromEntries(res.headers.entries()))

        const data = await res.json()
        console.log('Response data:', data)

        if (!res.ok) {
          const errorMsg = typeof data.details === 'object' ? JSON.stringify(data.details) : (data.details || data.error || 'Bildgenerierung fehlgeschlagen')
          onToast?.(errorMsg, 'error')
          setError(errorMsg)
          return false
        }

        if (data.image) {
          setImages((prev) => [...prev, data.image])
          onToast?.('Bild generiert', 'success')
          return true
        }

        return false
      } catch (err) {
        console.error('[useGeneratedImages] generateImage failed:', err)
        const errorMsg = err instanceof Error ? err.message : 'Bildgenerierung fehlgeschlagen'
        onToast?.(errorMsg, 'error')
        setError(errorMsg)
        return false
      } finally {
        setGenerating(false)
      }
    },
    [entityId, onToast]
  )

  const deleteImage = useCallback(
    async (id: string): Promise<boolean> => {
      if (!window.confirm('Bild wirklich löschen?')) return false

      setLoading(true)
      setError(null)

      try {
        const res = await fetch(`/api/generated-images/${id}`, {
          method: 'DELETE',
          credentials: 'same-origin',
        })

        if (!res.ok) {
          const data = await res.json()
          onToast?.(data.error || 'Löschen fehlgeschlagen', 'error')
          return false
        }

        setImages((prev) => prev.filter((img) => img.id !== id))
        onToast?.('Bild gelöscht', 'info')
        return true
      } catch (err) {
        console.error('[useGeneratedImages] deleteImage failed:', err)
        onToast?.('Löschen fehlgeschlagen', 'error')
        return false
      } finally {
        setLoading(false)
      }
    },
    [onToast]
  )

  return {
    images,
    loading,
    generating,
    fetched,
    error,
    generateImage,
    deleteImage,
    refetch: fetchImages,
  }
}
