"use client"
import React, { useState } from 'react'
import { TextImprovementDialog } from './TextImprovementDialog'
import { TablerIcon } from './TablerIcon'

/**
 * ImproveTextButton
 * - Shows a magic wand icon
 * - Opens a dialog to improve text using AI
 * - Calls onImprovedText when user accepts the improved text
 * - Optionally calls onOriginalPreserved to save the original text before improvement
 * - If sourceTranscript is provided, it will ALWAYS use that for improvement (not the current text)
 */
export function ImproveTextButton(props: {
  text: string
  /** The true original transcript (unedited). If provided, LLM always improves from this. */
  sourceTranscript?: string | null
  onImprovedText: (improvedText: string) => void
  onOriginalPreserved?: (originalText: string) => void
  title?: string
  className?: string
}) {
  const { text, sourceTranscript, onImprovedText, onOriginalPreserved, title = 'Text mit KI verbessern', className } = props
  const [showDialog, setShowDialog] = useState(false)

  function handleAccept(improvedText: string) {
    // Preserve original text before applying improvement
    if (onOriginalPreserved && text && text !== improvedText) {
      onOriginalPreserved(text)
    }
    onImprovedText(improvedText)
    setShowDialog(false)
  }

  // Icon size consistent at 20px
  const ICON_SIZE = 20

  return (
    <>
      <span
        role="button"
        tabIndex={0}
        title={title}
        aria-label={title}
        className={[
          'inline-flex items-center justify-center cursor-pointer select-none',
          'text-blue-500 hover:text-blue-400',
          className || ''
        ].join(' ')}
        onClick={() => setShowDialog(true)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            setShowDialog(true)
          }
        }}
      >
        <TablerIcon name="text-grammar" size={ICON_SIZE} />
      </span>

      {showDialog && (
        <TextImprovementDialog
          originalText={text}
          sourceTranscript={sourceTranscript}
          onAccept={handleAccept}
          onCancel={() => setShowDialog(false)}
        />
      )}
    </>
  )
}
