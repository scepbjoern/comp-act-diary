/**
 * GeneratedImageGallery - Displays AI-generated images for an entity
 * Shows images in full width with minimal metadata overlay
 */

'use client'

import { useState } from 'react'
import Image from 'next/image'
import { IconPhoto, IconRefresh, IconTrash, IconChevronLeft, IconChevronRight } from '@tabler/icons-react'
import { type GeneratedImage } from '@/hooks/useGeneratedImages'
import { getShortModelName } from '@/lib/config/imageModels'
import { useReadMode } from '@/hooks/useReadMode'

// =============================================================================
// TYPES
// =============================================================================

interface GeneratedImageGalleryProps {
  images: GeneratedImage[]
  loading: boolean
  generating: boolean
  hasSummary: boolean
  onGenerate: () => void
  onDelete: (id: string) => void
  onOpenModal?: () => void
}

// =============================================================================
// COMPONENT
// =============================================================================

export function GeneratedImageGallery({
  images,
  loading,
  generating,
  hasSummary,
  onGenerate,
  onDelete,
  onOpenModal,
}: GeneratedImageGalleryProps) {
  const { readMode } = useReadMode()
  // Use modal if available, otherwise fall back to direct generation
  const handleGenerate = onOpenModal || onGenerate
  const [activeIndex, setActiveIndex] = useState(0)

  const hasImages = images.length > 0
  const activeImage = hasImages ? images[Math.min(activeIndex, images.length - 1)] : null

  const handlePrev = () => {
    setActiveIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1))
  }

  const handleNext = () => {
    setActiveIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0))
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('de-CH', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
    })
  }

  // Generating state
  if (generating) {
    return (
      <div className="w-full aspect-video bg-base-200 rounded-lg flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <span className="loading loading-spinner loading-lg text-primary"></span>
          <span className="text-sm text-base-content/60">Generiere Bild...</span>
        </div>
      </div>
    )
  }

  // No summary yet - don't render anything
  if (!hasSummary) {
    return null
  }

  // No images yet, but has summary - compact button (hidden in read mode)
  if (!hasImages && !loading) {
    if (readMode) return null
    return (
      <div className="flex justify-center py-2">
        <button
          className="btn btn-outline btn-sm gap-2"
          onClick={handleGenerate}
          disabled={generating}
        >
          <IconPhoto size={16} />
          Tagesbild generieren
        </button>
      </div>
    )
  }

  // Loading state
  if (loading && !hasImages) {
    return (
      <div className="w-full aspect-video bg-base-200 rounded-lg flex items-center justify-center">
        <span className="loading loading-spinner loading-md"></span>
      </div>
    )
  }

  // Show active image
  if (!activeImage) return null

  const imageUrl = activeImage.asset.filePath
    ? `/${activeImage.asset.filePath}`
    : null

  return (
    <div className="w-full relative group">
      {/* Image Container */}
      <div className="relative w-full aspect-video bg-base-200 rounded-lg overflow-hidden">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt="Generiertes Tagesbild"
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 800px"
            priority
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-base-content/40">
            <IconPhoto size={48} />
          </div>
        )}

        {/* Gallery Navigation (only if multiple images) */}
        {images.length > 1 && (
          <>
            <button
              className="absolute left-2 top-1/2 -translate-y-1/2 btn btn-circle btn-sm btn-ghost bg-base-100/50 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={handlePrev}
            >
              <IconChevronLeft size={20} />
            </button>
            <button
              className="absolute right-2 top-1/2 -translate-y-1/2 btn btn-circle btn-sm btn-ghost bg-base-100/50 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={handleNext}
            >
              <IconChevronRight size={20} />
            </button>

            {/* Dots indicator */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
              {images.map((_, idx) => (
                <button
                  key={idx}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    idx === activeIndex ? 'bg-primary' : 'bg-base-100/50'
                  }`}
                  onClick={() => setActiveIndex(idx)}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Metadata Bar - Small, right-aligned */}
      <div className="flex items-center justify-end gap-3 mt-1 px-1">
        <span className="text-xs text-base-content/40">
          {getShortModelName(activeImage.model)} · {formatDate(activeImage.createdAt)}
        </span>

        {/* Hide action buttons in read mode */}
        {!readMode && (
          <div className="flex items-center gap-1">
            <button
              className="btn btn-ghost btn-xs text-base-content/40 hover:text-primary"
              onClick={handleGenerate}
              disabled={generating}
              title="Neues Bild generieren"
            >
              <IconRefresh size={14} />
            </button>
            <button
              className="btn btn-ghost btn-xs text-base-content/40 hover:text-error"
              onClick={() => onDelete(activeImage.id)}
              disabled={loading}
              title="Bild löschen"
            >
              <IconTrash size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
