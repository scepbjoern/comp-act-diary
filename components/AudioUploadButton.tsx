'use client'

import { useRef, useState } from 'react'
import { TablerIcon } from './TablerIcon'

interface AudioUploadButtonProps {
  onAudioUploaded: (result: { text: string; audioFileId: string; audioFilePath: string; keepAudio: boolean }) => void
  date: string // ISO date string YYYY-MM-DD
  time: string // HH:MM time string
  keepAudio?: boolean
  className?: string
  compact?: boolean
  disabled?: boolean
  model?: string
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
      formData.append('file', file)
      formData.append('date', date)
      formData.append('time', time)
      formData.append('model', selectedModel)
      formData.append('keepAudio', String(keepAudio))

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

      const result = await response.json()
      onAudioUploaded({
        text: result.text,
        audioFileId: result.audioFileId,
        audioFilePath: result.audioFilePath,
        keepAudio: result.keepAudio,
      })

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (err) {
      console.error('Audio upload error:', err)
      setError(err instanceof Error ? err.message : 'Upload fehlgeschlagen')
    } finally {
      setUploading(false)
    }
  }

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
          className="text-gray-300 hover:text-gray-100 disabled:opacity-50"
          title="Audio-Datei hochladen"
        >
          {uploading ? (
            <TablerIcon name="hourglass_empty" className="animate-spin" />
          ) : (
            <TablerIcon name="upload_file" />
          )}
        </button>
        {error && <span className="text-xs text-red-400 ml-2">{error}</span>}
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
            <TablerIcon name="hourglass_empty" className="animate-spin" />
            <span>Wird hochgeladen...</span>
          </>
        ) : (
          <>
            <TablerIcon name="upload_file" />
            <span>Audio hochladen</span>
          </>
        )}
      </button>
      {error && <div className="text-sm text-red-400 mt-1">{error}</div>}
    </div>
  )
}
