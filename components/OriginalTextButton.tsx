"use client"
import React, { useState } from 'react'
import { createPortal } from 'react-dom'
import { TablerIcon } from './TablerIcon'

/**
 * OriginalTranscriptSection
 * - Shows a section below the editor with original transcript
 * - Allows viewing, copying to clipboard, or restoring the original text
 */
export function OriginalTranscriptSection(props: {
  originalText: string
  onRestore: (originalText: string) => void
}) {
  const { originalText, onRestore } = props
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
  }

  const modalContent = (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/50 p-4" onClick={() => setShowDialog(false)}>
      <div className="bg-base-100 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold mb-4">Original-Transkript</h2>

        <div className="space-y-4">
          {/* Original text display */}
          <div className="bg-slate-700/30 border border-slate-600 rounded p-3 min-h-[120px] max-h-[300px] overflow-y-auto whitespace-pre-wrap text-sm">
            {originalText}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleCopy}
              className="btn btn-primary flex-1"
            >
              <TablerIcon name="copy" size={16} />
              {copied ? 'Kopiert!' : 'Kopieren'}
            </button>
            <button
              onClick={() => {
                handleRestore()
                setShowDialog(false)
              }}
              className="btn btn-warning flex-1"
            >
              <TablerIcon name="arrow-back-up" size={16} />
              Wiederherstellen
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
    <div className="flex items-center gap-2 p-2 bg-slate-700/30 rounded text-sm">
      <span className="text-gray-400">Original-Transkript vorhanden</span>
      <div className="flex items-center gap-1 ml-auto">
        <button
          onClick={() => setShowDialog(true)}
          className="btn btn-ghost btn-xs text-gray-300 hover:text-gray-100"
          title="Original-Transkript anzeigen"
        >
          <TablerIcon name="eye" size={14} />
          <span className="hidden md:inline ml-1">Anzeigen</span>
        </button>
        <button
          onClick={handleCopy}
          className="btn btn-ghost btn-xs text-gray-300 hover:text-gray-100"
          title="In Zwischenablage kopieren"
        >
          <TablerIcon name="copy" size={14} />
          {copied && <span className="ml-1 text-green-400">✓</span>}
        </button>
        <button
          onClick={handleRestore}
          className="btn btn-ghost btn-xs text-amber-400 hover:text-amber-300"
          title="Original-Text wiederherstellen"
        >
          <TablerIcon name="arrow-back-up" size={14} />
          <span className="hidden md:inline ml-1">Wiederherstellen</span>
        </button>
      </div>

      {showDialog && typeof document !== 'undefined' && createPortal(modalContent, document.body)}
    </div>
  )
}

// Keep old export for backwards compatibility
export const OriginalTextButton = OriginalTranscriptSection
