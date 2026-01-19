"use client"
import React, { useState } from 'react'
import { createPortal } from 'react-dom'
import { TablerIcon } from '@/components/ui/TablerIcon'

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
    void navigator.clipboard.writeText(originalText).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function handleRestore() {
    void onRestore(originalText)
  }

  const modalContent = (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/50 p-4" onClick={() => setShowDialog(false)}>
      <div className="bg-base-200 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-4" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold text-base-content mb-3">Original-Transkript</h2>

        <div className="space-y-3">
          {/* Original text display */}
          <div className="bg-base-100 border border-base-300 rounded-lg p-3 min-h-[120px] max-h-[300px] overflow-y-auto whitespace-pre-wrap text-sm text-base-content">
            {originalText}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="btn btn-primary btn-sm flex-1"
            >
              <TablerIcon name="copy" size={16} />
              {copied ? 'Kopiert!' : 'Kopieren'}
            </button>
            <button
              onClick={() => {
                handleRestore()
                setShowDialog(false)
              }}
              className="btn btn-warning btn-sm flex-1"
            >
              <TablerIcon name="restore" size={16} />
              Wiederherstellen
            </button>
          </div>

          <button
            onClick={() => setShowDialog(false)}
            className="btn btn-ghost btn-sm w-full"
          >
            Schließen
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="flex items-center gap-2 p-2 bg-base-300/50 rounded text-sm">
      <span className="text-base-content/70">Original-Transkript vorhanden</span>
      <div className="flex items-center gap-1 ml-auto">
        <button
          onClick={() => setShowDialog(true)}
          className="btn btn-ghost btn-xs"
          title="Original-Transkript anzeigen"
        >
          <TablerIcon name="blockquote" size={16} />
          <span className="hidden md:inline ml-1">Anzeigen</span>
        </button>
        <button
          onClick={handleCopy}
          className="btn btn-ghost btn-xs"
          title="In Zwischenablage kopieren"
        >
          <TablerIcon name="copy" size={16} />
          {copied && <span className="ml-1 text-success">✓</span>}
        </button>
        <button
          onClick={handleRestore}
          className="btn btn-ghost btn-xs text-warning"
          title="Original-Text wiederherstellen"
        >
          <TablerIcon name="restore" size={16} />
          <span className="hidden md:inline ml-1">Wiederherstellen</span>
        </button>
      </div>

      {showDialog && typeof document !== 'undefined' && createPortal(modalContent, document.body)}
    </div>
  )
}

// Keep old export for backwards compatibility
export const OriginalTextButton = OriginalTranscriptSection
