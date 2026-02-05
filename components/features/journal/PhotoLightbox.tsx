'use client'

/**
 * components/features/journal/PhotoLightbox.tsx
 * Simple modal component for displaying photos in fullscreen.
 * Uses createPortal for proper z-index stacking.
 * 
 * Features:
 * - Close via button, backdrop click, or Escape key
 * - Responsive image scaling
 * - SSR-safe with isMounted check
 */

import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { IconX } from '@tabler/icons-react'

// =============================================================================
// TYPES
// =============================================================================

export interface PhotoLightboxProps {
  /** Whether the lightbox is open */
  isOpen: boolean
  /** Callback when lightbox should close */
  onClose: () => void
  /** URL of the image to display */
  imageUrl: string
  /** Alt text for the image */
  alt?: string
}

// =============================================================================
// COMPONENT
// =============================================================================

export function PhotoLightbox({ isOpen, onClose, imageUrl, alt = 'Foto' }: PhotoLightboxProps) {
  // SSR hydration safety - Portal needs DOM
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Handle Escape key to close
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
    }
  }, [onClose])

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      // Prevent body scroll when lightbox is open
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [isOpen, handleKeyDown])

  // Return null if not open OR not mounted (SSR safety)
  if (!isOpen || !isMounted) return null

  return createPortal(
    <div 
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Foto-Ansicht"
    >
      {/* Close button (top right) */}
      <button
        className="absolute top-4 right-4 btn btn-circle btn-ghost text-white hover:bg-white/20"
        onClick={onClose}
        aria-label="Schliessen"
      >
        <IconX size={24} />
      </button>

      {/* Image container - stops click propagation so clicking image doesn't close */}
      <div 
        className="max-w-full max-h-full"
        onClick={(e) => e.stopPropagation()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt={alt}
          className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
        />
      </div>
    </div>,
    document.body
  )
}
