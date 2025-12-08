"use client"
import React, { useState } from 'react'
import { createPortal } from 'react-dom'
import { TablerIcon } from './TablerIcon'

/**
 * OriginalTextButton
 * - Shows a button to view original text before improvement
 * - Opens a dialog displaying the original text
 * - Allows copying to clipboard or restoring the original text
 */
export function OriginalTextButton(props: {
  originalText: string
  onRestore: (originalText: string) => void
  title?: string
  className?: string
}) {
  const { originalText, onRestore, title = 'Original-Text anzeigen', className } = props
  const [showDialog, setShowDialog] = useState(false)
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    navigator.clipboard.writeText(originalText).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function handleRestore() {
    onRestore(originalText)
    setShowDialog(false)
  }

  const modalContent = (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/50" onClick={() => setShowDialog(false)}>
      <div className="modal-box max-w-2xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold mb-4">Original-Text</h2>

        <div className="space-y-4">
          {/* Original text display */}
          <div>
            <div className="text-sm text-gray-400 mb-1">Text vor Verbesserung</div>
            <div className="textarea textarea-bordered min-h-[120px] max-h-[300px] overflow-y-auto whitespace-pre-wrap">
              {originalText || <span className="text-gray-500 italic">Kein Text</span>}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={handleCopy}
              className="btn btn-primary flex-1"
            >
              <TablerIcon name="copy" size={16} />
              {copied ? 'Kopiert!' : 'In Zwischenablage kopieren'}
            </button>
            <button
              onClick={handleRestore}
              className="btn btn-warning flex-1"
            >
              <TablerIcon name="arrow-back-up" size={16} />
              Text wiederherstellen
            </button>
          </div>

          <button
            onClick={() => setShowDialog(false)}
            className="btn btn-ghost w-full"
          >
            Schließen
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <>
      <span
        role="button"
        tabIndex={0}
        title={title}
        aria-label={title}
        className={[
          'inline-flex items-center justify-center cursor-pointer select-none',
          'text-gray-300 hover:text-gray-100',
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
        <TablerIcon name="history" size={16} />
      </span>

      {showDialog && typeof document !== 'undefined' && createPortal(modalContent, document.body)}
    </>
  )
}
