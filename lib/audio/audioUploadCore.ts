/**
 * lib/audio/audioUploadCore.ts
 * Shared audio upload utilities extracted from MicrophoneButton and AudioUploadButton.
 * Provides upload functions, validation, stage messages, and formatting helpers.
 * Pure functions – no React dependencies.
 */

// =============================================================================
// TYPES
// =============================================================================

/** Stages an audio upload goes through */
export type UploadStage = 'idle' | 'uploading' | 'analyzing' | 'transcribing' | 'complete'

/** Result returned by all upload functions */
export interface AudioUploadResult {
  text: string
  audioFileId?: string | null
  audioFilePath?: string | null
  attachmentId?: string | null
  capturedAt?: string
  model?: string
  keepAudio?: boolean
}

/** Options for uploading audio to an existing journal entry */
export interface UploadForEntryOptions {
  entryId: string
  model: string
  /** If true, transcript is NOT appended to the DB entry content (editor handles it) */
  appendText?: boolean
}

/** Options for standalone audio upload (legacy diary endpoint) */
export interface UploadStandaloneOptions {
  date: string
  time?: string
  model: string
  keepAudio: boolean
  capturedAt?: string
}

/** Options for transcription-only (no audio persistence) */
export interface TranscribeOnlyOptions {
  model: string
}

/** Callback for stage changes during upload */
export type OnStageChange = (stage: UploadStage, message: string) => void

// =============================================================================
// CONSTANTS
// =============================================================================

/** Human-readable stage messages (German) */
export const STAGE_MESSAGES: Record<UploadStage, string> = {
  idle: '',
  uploading: 'Datei wird hochgeladen...',
  analyzing: 'Audio wird analysiert...',
  transcribing: 'Wird transkribiert...',
  complete: 'Fertig!',
}

/** Max file size from env or default 50 MB */
export const MAX_AUDIO_FILE_SIZE_MB =
  typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_MAX_AUDIO_FILE_SIZE_MB
    ? parseInt(process.env.NEXT_PUBLIC_MAX_AUDIO_FILE_SIZE_MB, 10)
    : 50

/** Accepted MIME types for file uploads */
const VALID_UPLOAD_TYPES = ['audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'audio/mp3']

/** File extension regex for fallback validation */
const VALID_UPLOAD_EXT = /\.(mp3|m4a)$/i

// =============================================================================
// VALIDATION
// =============================================================================

/**
 * Validates an audio file for upload (type + size).
 * Returns null if valid, or an error message string.
 */
export function validateAudioFile(file: File): string | null {
  if (!VALID_UPLOAD_TYPES.includes(file.type) && !VALID_UPLOAD_EXT.test(file.name)) {
    return 'Bitte nur .mp3 oder .m4a Dateien hochladen'
  }

  const maxSizeBytes = MAX_AUDIO_FILE_SIZE_MB * 1024 * 1024
  if (file.size > maxSizeBytes) {
    return `Datei zu gross. Maximum ${MAX_AUDIO_FILE_SIZE_MB}MB`
  }

  return null
}

// =============================================================================
// FORMATTING
// =============================================================================

/**
 * Formats elapsed seconds into a human-readable string (e.g. "1m 23s").
 */
export function formatElapsedTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  if (mins === 0) return `${secs}s`
  return `${mins}m ${secs}s`
}

/**
 * Derives a file extension from a Blob MIME type.
 */
export function extensionFromMime(mimeType: string): string {
  if (mimeType.includes('ogg')) return 'ogg'
  if (mimeType.includes('mp4')) return 'mp4'
  if (mimeType.includes('mpeg')) return 'mp3'
  return 'webm'
}

/**
 * Generates a timestamped filename for a recorded audio blob.
 */
export function generateAudioFilename(startTime: Date, mimeType: string): string {
  const year = startTime.getFullYear()
  const month = String(startTime.getMonth() + 1).padStart(2, '0')
  const day = String(startTime.getDate()).padStart(2, '0')
  const hours = String(startTime.getHours()).padStart(2, '0')
  const minutes = String(startTime.getMinutes()).padStart(2, '0')
  const guid = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substr(2, 9)
  const ext = extensionFromMime(mimeType)
  return `${year}-${month}-${day}_${hours}-${minutes}_${guid}.${ext}`
}

// =============================================================================
// UPLOAD FUNCTIONS
// =============================================================================

/**
 * Parses a server error response into a human-readable message.
 */
async function parseServerError(res: Response): Promise<string> {
  try {
    const data = await res.json()
    const msg = data.error || 'Upload fehlgeschlagen'
    const details = data.details ? ` (${data.details})` : ''
    return msg + details
  } catch {
    return 'Upload fehlgeschlagen'
  }
}

/**
 * Uploads audio to an existing journal entry via `/api/journal-entries/[id]/audio`.
 * Creates MediaAsset + MediaAttachment and transcribes the audio.
 */
export async function uploadAudioForEntry(
  fileOrBlob: File | Blob,
  options: UploadForEntryOptions,
  onStageChange?: OnStageChange,
): Promise<AudioUploadResult> {
  const { entryId, model, appendText = false } = options

  const fd = new FormData()

  // Ensure we have a proper File object with a name
  if (fileOrBlob instanceof File) {
    fd.append('file', fileOrBlob)
  } else {
    const filename = generateAudioFilename(new Date(), fileOrBlob.type || 'audio/webm')
    fd.append('file', new File([fileOrBlob], filename, { type: fileOrBlob.type || 'audio/webm' }))
  }

  fd.append('model', model)
  fd.append('appendText', String(appendText))

  onStageChange?.('uploading', STAGE_MESSAGES.uploading)

  const res = await fetch(`/api/journal-entries/${entryId}/audio`, {
    method: 'POST',
    body: fd,
    credentials: 'same-origin',
  })

  if (!res.ok) {
    throw new Error(await parseServerError(res))
  }

  onStageChange?.('transcribing', STAGE_MESSAGES.transcribing)

  const data = await res.json()

  onStageChange?.('complete', STAGE_MESSAGES.complete)

  return {
    text: data.transcript,
    audioFileId: data.assetId,
    audioFilePath: data.filePath,
    attachmentId: data.attachmentId ?? null,
    capturedAt: new Date().toISOString(),
    model: data.model || model,
    keepAudio: data.keepAudio,
  }
}

/**
 * Options for standalone audio upload (legacy diary endpoint)
 */
export async function uploadAudioStandalone(
  _file: File,
  _options: UploadStandaloneOptions,
  _onStageChange?: OnStageChange
): Promise<AudioUploadResult> {
  throw new Error("Standalone audio upload is no longer supported. Please save the entry first and upload audio to the entry.")
}

/**
 * Transcribes audio without persisting it via `/api/transcribe`.
 * Used when no date/entry context is available (e.g. coach, reflections).
 */
export async function transcribeOnly(
  fileOrBlob: File | Blob,
  options: TranscribeOnlyOptions,
  onStageChange?: OnStageChange,
): Promise<AudioUploadResult> {
  const { model } = options

  const fd = new FormData()

  if (fileOrBlob instanceof File) {
    fd.append('file', fileOrBlob)
  } else {
    const filename = generateAudioFilename(new Date(), fileOrBlob.type || 'audio/webm')
    fd.append('file', new File([fileOrBlob], filename, { type: fileOrBlob.type || 'audio/webm' }))
  }

  fd.append('model', model)

  onStageChange?.('uploading', STAGE_MESSAGES.uploading)

  const res = await fetch('/api/transcribe', {
    method: 'POST',
    body: fd,
    credentials: 'same-origin',
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || 'Transkription fehlgeschlagen')
  }

  onStageChange?.('transcribing', STAGE_MESSAGES.transcribing)

  const data = await res.json()

  onStageChange?.('complete', STAGE_MESSAGES.complete)

  return {
    text: data.text,
    audioFileId: null,
    audioFilePath: null,
    capturedAt: new Date().toISOString(),
    model,
  }
}

// =============================================================================
// STAGE ESTIMATION (for file uploads with unknown server processing time)
// =============================================================================

/**
 * Estimates the current upload stage based on elapsed time and file size.
 * Useful for AudioUploadButton where we don't get server-side progress.
 */
export function estimateStage(elapsedSeconds: number, fileSizeMB: number): UploadStage {
  // Rough estimates: upload ~2s/MB (min 3s), analysis ~5s, then transcription
  const uploadTime = Math.max(3, fileSizeMB * 2)
  const analysisTime = 5

  if (elapsedSeconds < uploadTime) return 'uploading'
  if (elapsedSeconds < uploadTime + analysisTime) return 'analyzing'
  return 'transcribing'
}

/**
 * Resolves the transcription model: prop → DB settings → fallback.
 */
export async function resolveTranscriptionModel(modelProp?: string): Promise<string> {
  if (modelProp) return modelProp

  try {
    const res = await fetch('/api/user/settings', { credentials: 'same-origin' })
    if (res.ok) {
      const data = await res.json()
      if (data.settings?.transcriptionModel) {
        return data.settings.transcriptionModel
      }
    }
  } catch {
    // Ignore settings fetch errors
  }

  return 'gpt-4o-transcribe'
}
