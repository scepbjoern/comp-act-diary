'use client'

/**
 * OCRUploadButton - Trigger button for OCR file upload modal
 * Analog to AudioUploadButton, placed next to it in the toolbar.
 */

import { useState } from 'react'
import { TablerIcon } from './TablerIcon'
import OCRUploadModal from './OCRUploadModal'

interface OCRUploadButtonProps {
  /** Callback when OCR extraction completes */
  onOcrComplete: (result: { text: string; mediaAssetIds: string[] }) => void
  /** Date for the entry (YYYY-MM-DD) */
  date: string
  /** Time for the entry (HH:MM) */
  time: string
  /** Additional CSS classes */
  className?: string
  /** Compact mode (icon only) */
  compact?: boolean
  /** Disabled state */
  disabled?: boolean
}

export default function OCRUploadButton({
  onOcrComplete,
  date,
  time,
  className = '',
  compact = false,
  disabled = false,
}: OCRUploadButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)

  const handleOpenModal = () => {
    if (!disabled) {
      setIsModalOpen(true)
    }
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
  }

  const handleComplete = (result: { text: string; mediaAssetIds: string[] }) => {
    setIsModalOpen(false)
    onOcrComplete(result)
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpenModal}
        disabled={disabled}
        className={`btn btn-ghost btn-sm gap-1 ${disabled ? 'btn-disabled' : ''} ${className}`}
        title="Bild/PDF scannen (OCR)"
      >
        <TablerIcon name="scan" className="w-5 h-5" />
        {!compact && <span>OCR</span>}
      </button>

      <OCRUploadModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onComplete={handleComplete}
        date={date}
        time={time}
      />
    </>
  )
}
