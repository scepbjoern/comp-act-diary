'use client'

/**
 * OCRSourcePanel - Displays OCR source files (images/PDFs) for a journal entry
 * Shows the original files used for OCR extraction with preview/download options.
 * Note: The transcript is shown separately in OriginalTranscriptPanel.
 */

import React, { useState, useCallback } from 'react'
import Image from 'next/image'
import { TablerIcon } from './TablerIcon'

interface MediaAssetSource {
  id: string
  filePath: string | null
  mimeType: string
  createdAt: string
  ocrText?: string | null
}

interface OCRSourcePanelProps {
  /** Journal entry ID to load sources for */
  noteId: string
  /** Initial transcript if already loaded */
  initialTranscript?: string | null
  /** Callback when user wants to use original text as content */
  onRestoreToContent?: (originalText: string) => void
}

export function OCRSourcePanel({
  noteId,
  initialTranscript,
}: OCRSourcePanelProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [sources, setSources] = useState<MediaAssetSource[]>([])
  const [hasLoaded, setHasLoaded] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  // Load OCR sources when panel is expanded
  const loadSources = useCallback(async () => {
    if (hasLoaded || isLoading) return

    setIsLoading(true)
    try {
      // Load media attachments with role SOURCE
      const sourcesRes = await fetch(`/api/notes/${noteId}/ocr-sources`, {
        credentials: 'same-origin',
      })
      if (sourcesRes.ok) {
        const data = await sourcesRes.json()
        setSources(data.sources || [])
      }

      setHasLoaded(true)
    } catch (err) {
      console.error('Failed to load OCR sources:', err)
    } finally {
      setIsLoading(false)
    }
  }, [noteId, hasLoaded, isLoading])

  // Handle expand/collapse
  const handleToggle = useCallback(() => {
    if (!isExpanded && !hasLoaded) {
      loadSources()
    }
    setIsExpanded((prev) => !prev)
  }, [isExpanded, hasLoaded, loadSources])

  // Get file icon based on MIME type
  const getFileIcon = (mimeType: string): string => {
    if (mimeType === 'application/pdf') return 'file-type-pdf'
    if (mimeType.startsWith('image/')) return 'photo'
    return 'file'
  }

  // Format date
  const formatDate = (dateStr: string): string => {
    try {
      return new Date(dateStr).toLocaleDateString('de-CH', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    } catch {
      return dateStr
    }
  }

  // Get download URL for a file
  const getDownloadUrl = (filePath: string | null): string | null => {
    if (!filePath) return null
    // Assuming uploads are served from /uploads/
    return `/uploads/${filePath}`
  }

  // Don't render if no transcript (indicates no OCR source)
  if (!initialTranscript && !hasLoaded) {
    return null
  }

  return (
    <div className="border border-base-300 rounded-lg overflow-hidden">
      {/* Header - always visible */}
      <button
        type="button"
        onClick={handleToggle}
        className="w-full flex items-center justify-between p-3 bg-base-200 hover:bg-base-300 transition-colors"
      >
        <div className="flex items-center gap-2">
          <TablerIcon name="scan" className="w-5 h-5 text-primary" />
          <span className="font-medium">OCR-Quellen</span>
          {sources.length > 0 && (
            <span className="badge badge-sm">{sources.length} Datei{sources.length !== 1 ? 'en' : ''}</span>
          )}
        </div>
        <TablerIcon
          name={isExpanded ? 'chevron-up' : 'chevron-down'}
          className="w-5 h-5"
        />
      </button>

      {/* Content - collapsible */}
      {isExpanded && (
        <div className="p-4 space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <span className="loading loading-spinner loading-md" />
            </div>
          ) : (
            <>
              {/* Source files */}
              {sources.length > 0 ? (
                <div className="space-y-3">
                  {sources.map((source) => {
                    const isImage = source.mimeType.startsWith('image/')
                    const url = getDownloadUrl(source.filePath)
                    
                    return (
                      <div
                        key={source.id}
                        className="bg-base-100 rounded-lg border border-base-300 overflow-hidden"
                      >
                        {/* File header */}
                        <div className="flex items-center gap-3 p-3">
                          <div className="w-10 h-10 flex items-center justify-center bg-base-200 rounded">
                            <TablerIcon name={getFileIcon(source.mimeType)} className="w-6 h-6" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {source.filePath?.split('/').pop() || 'Unbekannte Datei'}
                            </p>
                            <p className="text-xs text-base-content/60">
                              {formatDate(source.createdAt)}
                            </p>
                          </div>
                          <div className="flex gap-1">
                            {isImage && url && (
                              <button
                                type="button"
                                className="btn btn-ghost btn-sm btn-circle"
                                onClick={() => setPreviewUrl(previewUrl === url ? null : url)}
                                title="Vorschau"
                              >
                                <TablerIcon name="eye" className="w-4 h-4" />
                              </button>
                            )}
                            {url && (
                              <a
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-ghost btn-sm btn-circle"
                                title="Öffnen/Herunterladen"
                              >
                                <TablerIcon name="external-link" className="w-4 h-4" />
                              </a>
                            )}
                          </div>
                        </div>
                        
                        {/* Image preview */}
                        {isImage && previewUrl === url && url && (
                          <div className="border-t border-base-300 p-3 bg-base-200">
                            <Image
                              src={url}
                              alt="OCR-Quelle"
                              width={400}
                              height={300}
                              className="max-w-full h-auto rounded"
                              style={{ maxHeight: '300px', objectFit: 'contain' }}
                            />
                          </div>
                        )}
                        
                        {/* PDF: show link to open in new tab */}
                        {source.mimeType === 'application/pdf' && url && (
                          <div className="border-t border-base-300 p-3 bg-base-200">
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn btn-sm btn-primary"
                            >
                              <TablerIcon name="file-type-pdf" className="w-4 h-4" />
                              PDF öffnen
                            </a>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-sm text-base-content/60 text-center py-4">
                  Keine OCR-Quelldateien verknüpft
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default OCRSourcePanel
