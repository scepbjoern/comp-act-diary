'use client'

/**
 * OCRUploadModal - Modal dialog for OCR file upload
 * Supports drag & drop, multiple files, and progress indication.
 */

import { useState, useRef, useCallback, useEffect } from 'react'
import { TablerIcon } from '@/components/ui/TablerIcon'

interface OCRUploadModalProps {
  /** Whether modal is open */
  isOpen: boolean
  /** Close modal callback */
  onClose: () => void
  /** Success callback with extracted text */
  onComplete: (result: { text: string; mediaAssetIds: string[]; capturedAt?: string }) => void
  /** Date for the entry */
  date: string
  /** Time for the entry */
  time: string
}

interface SelectedFile {
  file: File
  preview?: string
  /** For PDFs: page range (e.g., "1-5" or "1,3,5" or empty for all) */
  pageRange?: string
}

type UploadStage = 'idle' | 'uploading' | 'extracting' | 'complete' | 'error'

const stageMessages: Record<UploadStage, string> = {
  idle: '',
  uploading: 'Dateien werden hochgeladen...',
  extracting: 'Text wird extrahiert...',
  complete: 'Fertig!',
  error: 'Fehler aufgetreten',
}

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']
const MAX_FILE_SIZE_MB = 50
const MAX_FILES = 20

export default function OCRUploadModal({
  isOpen,
  onClose,
  onComplete,
  date: _date,
  time: _time,
}: OCRUploadModalProps) {
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([])
  const [stage, setStage] = useState<UploadStage>('idle')
  const [error, setError] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // OCR options
  const [includeImages, setIncludeImages] = useState(false)
  const [includeTableFormat, setIncludeTableFormat] = useState(false)

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedFiles([])
      setStage('idle')
      setError(null)
      setDragActive(false)
      setIncludeImages(false)
      setIncludeTableFormat(false)
    }
  }, [isOpen])

  // Cleanup preview URLs on unmount
  useEffect(() => {
    return () => {
      selectedFiles.forEach((f) => {
        if (f.preview) URL.revokeObjectURL(f.preview)
      })
    }
  }, [selectedFiles])

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return `Dateityp nicht unterstützt: ${file.type}`
    }
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      return `Datei zu gross (max. ${MAX_FILE_SIZE_MB}MB)`
    }
    return null
  }

  const addFiles = useCallback((files: FileList | File[]) => {
    const newFiles: SelectedFile[] = []
    const errors: string[] = []

    Array.from(files).forEach((file) => {
      // Check max files limit
      if (selectedFiles.length + newFiles.length >= MAX_FILES) {
        errors.push(`Maximal ${MAX_FILES} Dateien erlaubt`)
        return
      }

      const validationError = validateFile(file)
      if (validationError) {
        errors.push(`${file.name}: ${validationError}`)
        return
      }

      // Create preview for images
      let preview: string | undefined
      if (file.type.startsWith('image/')) {
        preview = URL.createObjectURL(file)
      }

      newFiles.push({ file, preview })
    })

    if (errors.length > 0) {
      setError(errors.join('\n'))
    } else {
      setError(null)
    }

    if (newFiles.length > 0) {
      setSelectedFiles((prev) => [...prev, ...newFiles])
    }
  }, [selectedFiles.length])

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => {
      const file = prev[index]
      if (file.preview) URL.revokeObjectURL(file.preview)
      return prev.filter((_, i) => i !== index)
    })
    setError(null)
  }

  const updatePageRange = (index: number, pageRange: string) => {
    setSelectedFiles((prev) => 
      prev.map((sf, i) => i === index ? { ...sf, pageRange } : sf)
    )
  }

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files)
    }
  }, [addFiles])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(e.target.files)
    }
    // Reset input so same file can be selected again
    e.target.value = ''
  }

  const handleExtract = async () => {
    if (selectedFiles.length === 0) return

    setStage('uploading')
    setError(null)

    try {
      const formData = new FormData()
      selectedFiles.forEach((sf, i) => {
        formData.append(`file${i}`, sf.file)
      })
      
      // Add OCR options
      const options = {
        includeImages,
        includeTableFormat,
      }
      formData.append('options', JSON.stringify(options))
      
      // Add page ranges for PDFs
      const pageRanges: Record<number, string> = {}
      selectedFiles.forEach((sf, i) => {
        if (sf.file.type === 'application/pdf' && sf.pageRange?.trim()) {
          pageRanges[i] = sf.pageRange.trim()
        }
      })
      if (Object.keys(pageRanges).length > 0) {
        formData.append('pageRanges', JSON.stringify(pageRanges))
      }
      
      // Send file.lastModified as capturedAt (use first file's lastModified)
      const firstFile = selectedFiles[0]?.file
      if (firstFile?.lastModified) {
        formData.append('capturedAt', new Date(firstFile.lastModified).toISOString())
      }

      setStage('extracting')

      const response = await fetch('/api/ocr/extract', {
        method: 'POST',
        body: formData,
        credentials: 'same-origin',
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || errorData.details || 'OCR-Extraktion fehlgeschlagen')
      }

      const result = await response.json()
      const capturedAt = firstFile?.lastModified
        ? new Date(firstFile.lastModified).toISOString()
        : undefined
      setStage('complete')

      // Brief delay to show completion state
      setTimeout(() => {
        onComplete({
          text: result.text,
          mediaAssetIds: result.mediaAssetIds,
          capturedAt,
        })
      }, 500)
    } catch (err) {
      console.error('[OCR] Extraction error:', err)
      setStage('error')
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler')
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const getFileIcon = (mimeType: string): string => {
    if (mimeType === 'application/pdf') return 'file-type-pdf'
    if (mimeType.startsWith('image/')) return 'photo'
    return 'file'
  }

  if (!isOpen) return null

  const isProcessing = stage === 'uploading' || stage === 'extracting'

  return (
    <dialog className="modal modal-open">
      <div className="modal-box max-w-2xl">
        <button
          type="button"
          className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
          onClick={onClose}
          disabled={isProcessing}
        >
          ✕
        </button>

        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
          <TablerIcon name="scan" className="w-6 h-6" />
          Bild/PDF scannen (OCR)
        </h3>

        {/* Drop Zone */}
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragActive
              ? 'border-primary bg-primary/10'
              : 'border-base-300 hover:border-primary/50'
          } ${isProcessing ? 'opacity-50 pointer-events-none' : 'cursor-pointer'}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <TablerIcon name="upload" className="w-12 h-12 mx-auto mb-2 text-base-content/50" />
          <p className="text-base-content/70">
            Dateien hierher ziehen oder klicken zum Auswählen
          </p>
          <p className="text-sm text-base-content/50 mt-1">
            JPG, PNG, WEBP, GIF, PDF • Max. {MAX_FILE_SIZE_MB}MB pro Datei • Max. {MAX_FILES} Dateien
          </p>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept={ALLOWED_TYPES.join(',')}
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* OCR Options */}
        {selectedFiles.length > 0 && (
          <div className="mt-4 p-4 bg-base-200 rounded-lg space-y-3">
            <h4 className="font-medium text-sm">Extraktionsoptionen</h4>
            
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={includeImages}
                onChange={(e) => setIncludeImages(e.target.checked)}
                disabled={isProcessing}
                style={{ width: '16px', height: '16px', accentColor: 'var(--p)' }}
              />
              <div>
                <span className="text-sm">Bilder extrahieren</span>
                <p className="text-xs text-base-content/60">Eingebettete Bilder als Base64 im Markdown</p>
              </div>
            </label>
            
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={includeTableFormat}
                onChange={(e) => setIncludeTableFormat(e.target.checked)}
                disabled={isProcessing}
                style={{ width: '16px', height: '16px', accentColor: 'var(--p)' }}
              />
              <div>
                <span className="text-sm">Tabellen formatieren</span>
                <p className="text-xs text-base-content/60">Tabellen als Markdown-Tabellen extrahieren</p>
              </div>
            </label>
          </div>
        )}

        {/* Selected Files List */}
        {selectedFiles.length > 0 && (
          <div className="mt-4">
            <h4 className="font-medium mb-2">
              Ausgewählte Dateien ({selectedFiles.length})
            </h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {selectedFiles.map((sf, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-2 bg-base-200 rounded-lg"
                >
                  {/* Preview or Icon */}
                  {sf.preview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={sf.preview}
                      alt={sf.file.name}
                      className="w-10 h-10 object-cover rounded"
                    />
                  ) : (
                    <div className="w-10 h-10 flex items-center justify-center bg-base-300 rounded">
                      <TablerIcon name={getFileIcon(sf.file.type)} className="w-6 h-6" />
                    </div>
                  )}

                  {/* File Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{sf.file.name}</p>
                    <p className="text-xs text-base-content/60">
                      {formatFileSize(sf.file.size)}
                    </p>
                    {/* Page range input for PDFs */}
                    {sf.file.type === 'application/pdf' && (
                      <div className="mt-1 flex items-center gap-2">
                        <label className="text-xs text-base-content/60">Seiten:</label>
                        <input
                          type="text"
                          value={sf.pageRange || ''}
                          onChange={(e) => updatePageRange(index, e.target.value)}
                          placeholder="Alle (z.B. 1-5 oder 1,3,5)"
                          className="input input-xs input-bordered w-32 text-xs"
                          disabled={isProcessing}
                        />
                      </div>
                    )}
                  </div>

                  {/* Remove Button */}
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm btn-circle"
                    onClick={(e) => {
                      e.stopPropagation()
                      removeFile(index)
                    }}
                    disabled={isProcessing}
                  >
                    <TablerIcon name="x" className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Progress / Status */}
        {isProcessing && (
          <div className="mt-4 p-4 bg-base-200 rounded-lg">
            <div className="flex items-center gap-3">
              <span className="loading loading-spinner loading-md" />
              <span>{stageMessages[stage]}</span>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="alert alert-error mt-4">
            <TablerIcon name="alert-circle" className="w-5 h-5" />
            <pre className="whitespace-pre-wrap text-sm">{error}</pre>
          </div>
        )}

        {/* Actions */}
        <div className="modal-action">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={onClose}
            disabled={isProcessing}
          >
            Abbrechen
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleExtract}
            disabled={selectedFiles.length === 0 || isProcessing}
          >
            <TablerIcon name="scan" className="w-5 h-5" />
            Extrahieren
          </button>
        </div>
      </div>

      {/* Backdrop */}
      <form method="dialog" className="modal-backdrop">
        <button type="button" onClick={onClose} disabled={isProcessing}>
          close
        </button>
      </form>
    </dialog>
  )
}
