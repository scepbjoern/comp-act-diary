'use client'

/**
 * components/features/media/AudioUploadButton.tsx
 * Button for uploading audio files (.mp3, .m4a) with transcription.
 * Supports both legacy diary endpoint and unified journal-entries endpoint.
 * Uses audioUploadCore for shared upload logic.
 */

import { useRef, useState, useEffect } from 'react'
import { TablerIcon } from '@/components/ui/TablerIcon'
import {
  validateAudioFile,
  formatElapsedTime,
  estimateStage,
  resolveTranscriptionModel,
  uploadAudioForEntry,
  uploadAudioStandalone,
  STAGE_MESSAGES,
  type UploadStage,
  type AudioUploadResult,
} from '@/lib/audio/audioUploadCore'

interface AudioUploadButtonProps {
  /** Legacy callback – kept for backward compatibility (DiarySection) */
  onAudioUploaded?: (result: { text: string; audioFileId: string; audioFilePath: string; keepAudio: boolean; capturedAt?: string; model?: string }) => void
  /** Unified callback – preferred for new code */
  onResult?: (result: AudioUploadResult) => void
  date: string // ISO date string YYYY-MM-DD
  time: string // HH:MM time string
  keepAudio?: boolean
  /** If set, uploads via /api/journal-entries/[id]/audio instead of legacy endpoint */
  existingEntryId?: string
  /** Show date/time input for capturedAt override */
  showCapturedAtInput?: boolean
  className?: string
  compact?: boolean
  disabled?: boolean
  model?: string
}

export default function AudioUploadButton({
  onAudioUploaded,
  onResult,
  date,
  time,
  keepAudio = true,
  existingEntryId,
  showCapturedAtInput = false,
  className = '',
  compact = false,
  disabled = false,
  model,
}: AudioUploadButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [stage, setStage] = useState<UploadStage>('idle')
  const [elapsedTime, setElapsedTime] = useState(0)
  const elapsedTimeRef = useRef(0)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // State for optional capturedAt override
  const [capturedAtDate, setCapturedAtDate] = useState('')
  const [capturedAtTime, setCapturedAtTime] = useState('')

  // Timer for elapsed time display
  useEffect(() => {
    if (uploading) {
      setElapsedTime(0)
      elapsedTimeRef.current = 0
      timerRef.current = setInterval(() => {
        elapsedTimeRef.current += 1
        setElapsedTime(elapsedTimeRef.current)
      }, 1000)
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [uploading])

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate using audioUploadCore
    const validationError = validateAudioFile(file)
    if (validationError) {
      setError(validationError)
      return
    }

    setUploading(true)
    setError(null)
    setStage('uploading')
    
    // Stage estimation based on file size
    const fileSizeMB = file.size / (1024 * 1024)
    const stageInterval = setInterval(() => {
      setStage(estimateStage(elapsedTimeRef.current, fileSizeMB))
    }, 1000)

    try {
      const selectedModel = await resolveTranscriptionModel(model)

      // Determine capturedAt: user override → file.lastModified → undefined
      let capturedAt: string | undefined
      if (capturedAtDate) {
        const dateStr = capturedAtDate + (capturedAtTime ? `T${capturedAtTime}:00` : 'T00:00:00')
        capturedAt = new Date(dateStr).toISOString()
      } else if (file.lastModified) {
        capturedAt = new Date(file.lastModified).toISOString()
      }

      let result: AudioUploadResult

      if (existingEntryId) {
        // Upload to existing entry via unified API
        result = await uploadAudioForEntry(file, {
          entryId: existingEntryId,
          model: selectedModel,
        }, (s, msg) => { setStage(s); void msg })
      } else {
        // Upload via legacy standalone endpoint
        result = await uploadAudioStandalone(file, {
          date,
          time,
          model: selectedModel,
          keepAudio,
          capturedAt,
        }, (s, msg) => { setStage(s); void msg })
      }

      setStage('complete')

      // Call unified callback if provided
      if (onResult) {
        onResult(result)
      }

      // Call legacy callback for backward compatibility
      if (onAudioUploaded) {
        onAudioUploaded({
          text: result.text,
          audioFileId: result.audioFileId || '',
          audioFilePath: result.audioFilePath || '',
          keepAudio: result.keepAudio ?? keepAudio,
          capturedAt: result.capturedAt,
          model: result.model,
        })
      }

      // Reset file input and capturedAt fields
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      setCapturedAtDate('')
      setCapturedAtTime('')
    } catch (err) {
      console.error('Audio upload error:', err)
      setError(err instanceof Error ? err.message : 'Upload fehlgeschlagen')
    } finally {
      clearInterval(stageInterval)
      setUploading(false)
      setStage('idle')
    }
  }

  // Get current status message
  const getStatusMessage = () => {
    if (!uploading) return ''
    const baseMessage = STAGE_MESSAGES[stage]
    const timeInfo = elapsedTime > 0 ? ` (${formatElapsedTime(elapsedTime)})` : ''
    return baseMessage + timeInfo
  }

  // Icon size consistent at 20px
  const ICON_SIZE = 20

  // Shared file input element
  const fileInput = (
    <input
      ref={fileInputRef}
      type="file"
      accept=".mp3,.m4a,audio/mpeg,audio/mp4,audio/x-m4a"
      onChange={handleFileSelect}
      className="hidden"
      disabled={disabled || uploading}
    />
  )

  // Optional capturedAt input row
  const capturedAtInputs = showCapturedAtInput && !compact && (
    <div className="flex items-center gap-2 mt-2 text-sm">
      <label className="text-base-content/70">Aufgenommen am:</label>
      <input
        type="date"
        value={capturedAtDate}
        onChange={(e) => setCapturedAtDate(e.target.value)}
        className="input input-bordered input-xs"
        disabled={uploading}
      />
      <span className="text-base-content/70">um</span>
      <input
        type="time"
        value={capturedAtTime}
        onChange={(e) => setCapturedAtTime(e.target.value)}
        className="input input-bordered input-xs"
        disabled={uploading}
      />
      <span className="text-base-content/50 text-xs">(optional)</span>
    </div>
  )

  if (compact) {
    return (
      <div className={`inline-flex items-center ${className}`}>
        {fileInput}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || uploading}
          className="text-green-500 hover:text-green-400 disabled:opacity-50"
          title={uploading ? getStatusMessage() : 'Audio-Datei hochladen'}
        >
          {uploading ? (
            <TablerIcon name="hourglass-filled" size={ICON_SIZE} className="animate-spin text-amber-700" />
          ) : (
            <TablerIcon name="cloud-upload" size={ICON_SIZE} />
          )}
        </button>
        {uploading && (
          <span className="text-sm text-base-content/70 ml-2">
            {getStatusMessage()}
          </span>
        )}
        {error && <span className="text-sm text-error ml-2">{error}</span>}
      </div>
    )
  }

  return (
    <div className={className}>
      {fileInput}
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={disabled || uploading}
        className="pill flex items-center gap-2"
      >
        {uploading ? (
          <>
            <TablerIcon name="hourglass-filled" size={ICON_SIZE} className="animate-spin text-amber-700" />
            <span>{getStatusMessage()}</span>
          </>
        ) : (
          <>
            <TablerIcon name="cloud-upload" size={ICON_SIZE} className="text-green-500" />
            <span>Audio hochladen</span>
          </>
        )}
      </button>
      {capturedAtInputs}
      {uploading && (
        <div className="text-sm text-base-content/70 mt-1">
          Lange Audios werden automatisch in Teile aufgeteilt.
        </div>
      )}
      {error && <div className="text-sm text-error mt-1">{error}</div>}
    </div>
  )
}
