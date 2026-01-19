"use client"
import React, { useState, useCallback } from 'react'
import { TablerIcon } from '@/components/ui/TablerIcon'
import { RetranscribeButton } from '@/components/features/transcription/RetranscribeButton'

/**
 * OriginalTranscriptPanel
 * - Collapsible panel showing original transcript
 * - Lazy loads the transcript on first expand
 * - Allows editing and saving the original transcript
 * - Allows restoring original to content
 */
export function OriginalTranscriptPanel(props: {
  noteId: string
  /** If already loaded, pass it here to avoid re-fetching */
  initialTranscript?: string | null
  /** Audio file ID for re-transcription */
  audioFileId?: string | null
  /** Called when user wants to use original as the new content */
  onRestoreToContent: (originalText: string) => void
  /** Called when original transcript is updated */
  onOriginalUpdated?: (newOriginal: string) => void
  /** Called when re-transcription completes */
  onRetranscribe?: (noteId: string, newText: string) => void
}) {
  const { noteId, initialTranscript, audioFileId, onRestoreToContent, onOriginalUpdated, onRetranscribe } = props
  
  const [isExpanded, setIsExpanded] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [transcript, setTranscript] = useState<string | null>(initialTranscript ?? null)
  // hasLoaded should only be true if we have an actual string, not null
  const [hasLoaded, setHasLoaded] = useState(typeof initialTranscript === 'string' && initialTranscript.length > 0)
  const [isEditing, setIsEditing] = useState(false)
  const [editText, setEditText] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [copied, setCopied] = useState(false)

  // Lazy load the original transcript
  const loadTranscript = useCallback(async () => {
    if (hasLoaded || isLoading) return
    
    setIsLoading(true)
    try {
      const res = await fetch(`/api/notes/${noteId}/original-transcript`, {
        credentials: 'same-origin'
      })
      if (res.ok) {
        const data = await res.json()
        setTranscript(data.originalTranscript)
        setHasLoaded(true)
      }
    } catch (err) {
      console.error('Failed to load original transcript:', err)
    } finally {
      setIsLoading(false)
    }
  }, [noteId, hasLoaded, isLoading])

  // Handle expand/collapse
  const handleToggle = useCallback(() => {
    if (!isExpanded && !hasLoaded) {
      void loadTranscript()
    }
    setIsExpanded(prev => !prev)
  }, [isExpanded, hasLoaded, loadTranscript])

  // Start editing
  const handleStartEdit = useCallback(() => {
    setEditText(transcript || '')
    setIsEditing(true)
  }, [transcript])

  // Save edited transcript
  const handleSaveEdit = useCallback(async () => {
    setIsSaving(true)
    try {
      const res = await fetch(`/api/notes/${noteId}/original-transcript`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ originalTranscript: editText }),
        credentials: 'same-origin'
      })
      if (res.ok) {
        setTranscript(editText)
        setIsEditing(false)
        onOriginalUpdated?.(editText)
      }
    } catch (err) {
      console.error('Failed to save original transcript:', err)
    } finally {
      setIsSaving(false)
    }
  }, [noteId, editText, onOriginalUpdated])

  // Copy to clipboard
  const handleCopy = useCallback(() => {
    if (transcript) {
      void navigator.clipboard.writeText(transcript).then(() => {
        setCopied(true)
        void setTimeout(() => setCopied(false), 2000)
      })
    }
  }, [transcript])

  // Restore to content
  const handleRestore = useCallback(() => {
    if (transcript) {
      onRestoreToContent(transcript)
    }
  }, [transcript, onRestoreToContent])

  // Always show header if audioFileId triggered this panel (allow lazy loading)
  // Only hide if we've loaded and confirmed there's no transcript AND not expanded
  // Actually, we should always show - even if null, user can still try to load

  return (
    <div className="border-t border-base-300 mt-2">
      {/* Header - always visible */}
      <button
        onClick={handleToggle}
        className="flex items-center gap-2 w-full py-2 px-1 text-sm text-base-content/70 hover:text-base-content transition-colors"
      >
        <TablerIcon 
          name={isExpanded ? 'chevron-down' : 'chevron-right'} 
          size={16} 
        />
        <TablerIcon name="file-text" size={16} />
        <span>Original-Transkript</span>
        {isLoading && (
          <span className="loading loading-spinner loading-xs ml-2"></span>
        )}
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="pb-2 px-1">
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-base-content/50 py-4">
              <span className="loading loading-spinner loading-sm"></span>
              <span>Lade Original-Transkript...</span>
            </div>
          ) : !transcript ? (
            <div className="space-y-2">
              <div className="text-sm text-base-content/50 italic py-2">
                Kein Original-Transkript vorhanden
              </div>
              {/* Re-transcribe button even without transcript */}
              {audioFileId && onRetranscribe && (
                <RetranscribeButton
                  audioFileId={audioFileId}
                  onRetranscribed={(newText) => {
                    setTranscript(newText)
                    setHasLoaded(true)
                    onRetranscribe(noteId, newText)
                  }}
                />
              )}
            </div>
          ) : isEditing ? (
            /* Edit mode */
            <div className="space-y-2">
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="textarea textarea-bordered textarea-sm w-full min-h-[120px]"
                placeholder="Original-Transkript bearbeiten..."
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSaveEdit}
                  disabled={isSaving}
                  className="btn btn-primary btn-xs"
                >
                  {isSaving ? (
                    <>
                      <span className="loading loading-spinner loading-xs"></span>
                      Speichern...
                    </>
                  ) : (
                    <>
                      <TablerIcon name="device-floppy" size={14} />
                      Speichern
                    </>
                  )}
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="btn btn-ghost btn-xs"
                >
                  Abbrechen
                </button>
              </div>
            </div>
          ) : (
            /* View mode */
            <div className="space-y-2">
              <div className="bg-base-100 border border-base-300 rounded p-2 text-sm whitespace-pre-wrap max-h-[200px] overflow-y-auto">
                {transcript}
              </div>
              <div className="flex items-center gap-1 flex-wrap">
                <button
                  onClick={handleStartEdit}
                  className="btn btn-ghost btn-xs"
                  title="Original-Transkript bearbeiten"
                >
                  <TablerIcon name="edit" size={14} />
                  <span className="hidden sm:inline">Bearbeiten</span>
                </button>
                <button
                  onClick={handleCopy}
                  className="btn btn-ghost btn-xs"
                  title="In Zwischenablage kopieren"
                >
                  <TablerIcon name="copy" size={14} />
                  {copied ? <span className="text-success">✓</span> : <span className="hidden sm:inline">Kopieren</span>}
                </button>
                <button
                  onClick={handleRestore}
                  className="btn btn-ghost btn-xs text-warning"
                  title="Original als Inhalt übernehmen (überschreibt aktuellen Text)"
                >
                  <TablerIcon name="restore" size={14} />
                  <span className="hidden sm:inline">Als Inhalt übernehmen</span>
                </button>
                {audioFileId && onRetranscribe && (
                  <RetranscribeButton
                    audioFileId={audioFileId}
                    onRetranscribed={(newText) => {
                      setTranscript(newText)
                      onRetranscribe(noteId, newText)
                    }}
                  />
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
