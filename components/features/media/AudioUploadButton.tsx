'use client'

import { useRef, useState, useEffect } from 'react'
import { TablerIcon } from '@/components/ui/TablerIcon'

interface AudioUploadButtonProps {
  onAudioUploaded: (result: { text: string; audioFileId: string; audioFilePath: string; keepAudio: boolean; capturedAt?: string; model?: string }) => void
  date: string // ISO date string YYYY-MM-DD
  time: string // HH:MM time string
  keepAudio?: boolean
  className?: string
  compact?: boolean
  disabled?: boolean
  model?: string
}

type UploadStage = 'idle' | 'uploading' | 'analyzing' | 'transcribing' | 'complete'

const stageMessages: Record<UploadStage, string> = {
  idle: '',
  uploading: 'Datei wird hochgeladen...',
  analyzing: 'Audio wird analysiert...',
  transcribing: 'Wird transkribiert...',
  complete: 'Fertig!',
}

export default function AudioUploadButton({
  onAudioUploaded,
  date,
  time,
  keepAudio = true,
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

  const formatElapsedTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    if (mins === 0) return `${secs}s`
    return `${mins}m ${secs}s`
  }

  // Estimate progress stage based on elapsed time and file size
  const updateStageByTime = (fileSizeMB: number) => {
    // Rough estimates: 
    // - Upload: ~2 seconds per MB (min 3s)
    // - Analysis: ~5 seconds
    // - Transcription: rest of the time
    const uploadTime = Math.max(3, fileSizeMB * 2)
    const analysisTime = 5
    
    return () => {
      const elapsed = elapsedTimeRef.current
      if (elapsed < uploadTime) {
        setStage('uploading')
      } else if (elapsed < uploadTime + analysisTime) {
        setStage('analyzing')
      } else {
        setStage('transcribing')
      }
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    const validTypes = ['audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'audio/mp3']
    if (!validTypes.includes(file.type) && !file.name.match(/\.(mp3|m4a)$/i)) {
      setError('Bitte nur .mp3 oder .m4a Dateien hochladen')
      return
    }

    // Check file size (max from env or 50MB)
    const maxSizeMB = parseInt(process.env.NEXT_PUBLIC_MAX_AUDIO_FILE_SIZE_MB || '50', 10)
    const maxSizeBytes = maxSizeMB * 1024 * 1024
    if (file.size > maxSizeBytes) {
      setError(`Datei zu groß. Maximum ${maxSizeMB}MB`)
      return
    }

    setUploading(true)
    setError(null)
    setStage('uploading')
    
    // Calculate file size in MB for stage estimation
    const fileSizeMB = file.size / (1024 * 1024)
    const stageUpdater = updateStageByTime(fileSizeMB)
    
    // Start stage estimation interval
    const stageInterval = setInterval(() => {
      stageUpdater()
    }, 1000)

    try {
      // Resolve transcription model (prop -> DB settings -> fallback)
      let selectedModel = model
      if (!selectedModel) {
        try {
          const settingsRes = await fetch('/api/user/settings', { credentials: 'same-origin' })
          if (settingsRes.ok) {
            const settingsData = await settingsRes.json()
            selectedModel = settingsData.settings?.transcriptionModel
          }
        } catch {/* ignore settings fetch errors */}
      }
      if (!selectedModel) {
        selectedModel = 'gpt-4o-transcribe'
      }

      const formData = new FormData()
      const capturedAt = file.lastModified ? new Date(file.lastModified).toISOString() : undefined
      formData.append('file', file)
      formData.append('date', date)
      formData.append('time', time)
      formData.append('model', selectedModel)
      formData.append('keepAudio', String(keepAudio))
      // Send file.lastModified as capturedAt (default for uploaded files)
      if (capturedAt) {
        formData.append('capturedAt', capturedAt)
      }

      setStage('uploading')
      const response = await fetch('/api/diary/upload-audio', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('Server error response:', errorData)
        const errorMessage = errorData.error || 'Upload fehlgeschlagen'
        const details = errorData.details ? ` (${errorData.details})` : ''
        throw new Error(errorMessage + details)
      }

      setStage('complete')
      const result = await response.json()
      onAudioUploaded({
        text: result.text,
        audioFileId: result.audioFileId,
        audioFilePath: result.audioFilePath,
        keepAudio: result.keepAudio,
        capturedAt,
        model: result.model || selectedModel,
      })

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
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
    const baseMessage = stageMessages[stage]
    const timeInfo = elapsedTime > 0 ? ` (${formatElapsedTime(elapsedTime)})` : ''
    return baseMessage + timeInfo
  }

  // Icon size consistent at 20px
  const ICON_SIZE = 20

  if (compact) {
    return (
      <div className={`inline-flex items-center ${className}`}>
        <input
          ref={fileInputRef}
          type="file"
          accept=".mp3,.m4a,audio/mpeg,audio/mp4,audio/x-m4a"
          onChange={handleFileSelect}
          className="hidden"
          disabled={disabled || uploading}
        />
        <button
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
      <input
        ref={fileInputRef}
        type="file"
        accept=".mp3,.m4a,audio/mpeg,audio/mp4,audio/x-m4a"
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled || uploading}
      />
      <button
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
      {uploading && (
        <div className="text-sm text-base-content/70 mt-1">
          Lange Audios werden automatisch in Teile aufgeteilt.
        </div>
      )}
      {error && <div className="text-sm text-error mt-1">{error}</div>}
    </div>
  )
}
