'use client'

import { useState } from 'react'
import Image from 'next/image'
import { IconPhoto, IconRefresh, IconTrash } from '@tabler/icons-react'
import { useGeneratedImages } from '@/hooks/useGeneratedImages'
import { ImageGenerationModal } from './ImageGenerationModal'
import { DEFAULT_IMAGE_PROMPT } from '@/lib/defaultImagePrompt'

interface JournalEntryImageProps {
  entryId: string
  summaryText: string
  onToast?: (message: string, type: 'success' | 'error' | 'info') => void
}

export function JournalEntryImage({ entryId, summaryText, onToast }: JournalEntryImageProps) {
  const [modalOpen, setModalOpen] = useState(false)
  
  const {
    images,
    loading,
    generating,
    generateImage,
    deleteImage,
  } = useGeneratedImages(entryId, onToast)

  const hasImage = images.length > 0
  const latestImage = hasImage ? images[images.length - 1] : null
  const imageUrl = latestImage?.asset.filePath ? `/${latestImage.asset.filePath}` : null

  const handleGenerate = (finalPrompt: string) => {
    setModalOpen(false)
    void generateImage(summaryText, finalPrompt)
  }

  // Show generating state
  if (generating) {
    return (
      <div className="w-full aspect-video bg-base-300 rounded-lg flex items-center justify-center mb-2">
        <div className="flex flex-col items-center gap-2">
          <span className="loading loading-spinner loading-md text-primary"></span>
          <span className="text-xs text-base-content/60">Generiere Bild...</span>
        </div>
      </div>
    )
  }

  // Show existing image
  if (hasImage && imageUrl) {
    return (
      <div className="relative w-full aspect-video bg-base-300 rounded-lg overflow-hidden mb-2 group">
        <Image
          src={imageUrl}
          alt="Generiertes Bild"
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 600px"
        />
        {/* Overlay with actions */}
        <div className="absolute bottom-0 right-0 p-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            className="btn btn-circle btn-xs bg-base-100/80 hover:bg-base-100"
            onClick={() => setModalOpen(true)}
            title="Neues Bild generieren"
          >
            <IconRefresh size={14} />
          </button>
          <button
            className="btn btn-circle btn-xs bg-base-100/80 hover:bg-error/80"
            onClick={() => latestImage && deleteImage(latestImage.id)}
            title="Bild löschen"
          >
            <IconTrash size={14} />
          </button>
        </div>
        
        <ImageGenerationModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onGenerate={handleGenerate}
          summaryText={summaryText}
          defaultPromptTemplate={DEFAULT_IMAGE_PROMPT}
          generating={generating}
          title="Bild für Eintrag generieren"
        />
      </div>
    )
  }

  // Show generate button (only if there's summary text to use)
  if (!summaryText) {
    return null
  }

  return (
    <>
      <button
        className="btn btn-ghost btn-xs gap-1 mb-2"
        onClick={() => setModalOpen(true)}
        disabled={generating || loading}
        title="Bild für diesen Eintrag generieren"
      >
        <IconPhoto size={14} />
        <span className="text-xs">Bild generieren</span>
      </button>
      
      <ImageGenerationModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onGenerate={handleGenerate}
        summaryText={summaryText}
        defaultPromptTemplate={DEFAULT_IMAGE_PROMPT}
        generating={generating}
        title="Bild für Eintrag generieren"
      />
    </>
  )
}
