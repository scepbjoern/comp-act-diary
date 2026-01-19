import { Together } from 'together-ai'
import { createClient as createDeepgramClient } from '@deepgram/sdk'
import { readFile } from 'fs/promises'
import path from 'path'
import {
  getAudioMetadata,
  needsChunking,
  splitAudioIntoChunks,
  cleanupChunks,
  mergeTranscriptions,
  formatDuration,
  AudioChunkInfo,
} from '@/lib/media/audio-chunker'
import { v4 as uuidv4 } from 'uuid'

// Supported transcription models by provider
export const WHISPER_MODELS = ['openai/whisper-large-v3'] as const
export const DEEPGRAM_MODELS = ['deepgram/nova-3'] as const

export type WhisperModel = (typeof WHISPER_MODELS)[number]
export type DeepgramModel = (typeof DEEPGRAM_MODELS)[number]

// All available transcription models
export const ALL_TRANSCRIPTION_MODELS = [
  ...WHISPER_MODELS,
  ...DEEPGRAM_MODELS,
  'gpt-4o-transcribe',
  'gpt-4o-mini-transcribe', 
  'whisper-1',
] as const

export function isWhisperModel(model: string): model is WhisperModel {
  return WHISPER_MODELS.includes(model as WhisperModel)
}

export function isDeepgramModel(model: string): model is DeepgramModel {
  return DEEPGRAM_MODELS.includes(model as DeepgramModel)
}

export function getDefaultTranscriptionModel(): string {
  return WHISPER_MODELS[0]
}

// Default language codes per model
export const DEFAULT_MODEL_LANGUAGES: Record<string, string> = {
  'openai/whisper-large-v3': 'de',
  'deepgram/nova-3': 'de-CH',
  'gpt-4o-transcribe': 'de',
  'gpt-4o-mini-transcribe': 'de',
  'whisper-1': 'de',
}

// Build transcription prompt from user settings
// Note: Only used for OpenAI models - Together.ai/Whisper has issues with prompts
export function buildTranscriptionPrompt(
  transcriptionPrompt?: string,
  transcriptionGlossary?: string[]
): string | undefined {
  const parts: string[] = []

  if (transcriptionPrompt && transcriptionPrompt.trim()) {
    parts.push(transcriptionPrompt.trim())
  }

  if (transcriptionGlossary && transcriptionGlossary.length > 0) {
    parts.push(`Glossar: ${transcriptionGlossary.join(', ')}`)
  }

  return parts.length > 0 ? parts.join(' ') : undefined
}

export interface TranscriptionOptions {
  model: string
  language?: string
  prompt?: string // Only used for OpenAI models
  glossary?: string[] // Used for OpenAI (in prompt) and Deepgram (as keyterms)
}

export interface TranscriptionResult {
  text: string
  error?: string
  details?: string
}

// Transcribe a single audio buffer
export async function transcribeAudioBuffer(
  buffer: Buffer | Uint8Array,
  filename: string,
  mimeType: string,
  options: TranscriptionOptions
): Promise<TranscriptionResult> {
  const { model, language, prompt, glossary } = options
  
  // Get default language for the model if not specified
  const effectiveLanguage = language || DEFAULT_MODEL_LANGUAGES[model] || 'de'
  
  // Convert to bytes array for Blob/File creation
  const bytes = Array.from(buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer))

  if (isDeepgramModel(model)) {
    // Use Deepgram for Nova models
    const apiKey = process.env.DEEPGRAM_API_KEY
    if (!apiKey) {
      return { text: '', error: 'Missing DEEPGRAM_API_KEY' }
    }

    try {
      const deepgram = createDeepgramClient(apiKey)
      
      // Build Deepgram options
      const deepgramOptions: Record<string, unknown> = {
        model: 'nova-3', // Extract model name without provider prefix
        language: effectiveLanguage,
        smart_format: true,
        mip_opt_out: true, // Opt out of Model Improvement Partnership Program
      }
      
      // Add keyterms from glossary (Deepgram's equivalent to prompt)
      if (glossary && glossary.length > 0) {
        deepgramOptions.keyterm = glossary
      }
      
      const { result, error } = await deepgram.listen.prerecorded.transcribeFile(
        Buffer.from(bytes),
        deepgramOptions
      )

      if (error) {
        return {
          text: '',
          error: 'Deepgram transcription failed',
          details: String(error),
        }
      }

      // Extract transcript from Deepgram response
      const transcript = result?.results?.channels?.[0]?.alternatives?.[0]?.transcript || ''
      return { text: transcript }
    } catch (err) {
      return {
        text: '',
        error: 'Deepgram transcription failed',
        details: err instanceof Error ? err.message : String(err),
      }
    }
  } else if (isWhisperModel(model)) {
    // Use Together.ai for Whisper models
    // Note: Together.ai's Whisper implementation has issues with the prompt parameter
    // causing it to hallucinate glossary words, so we don't pass it
    const apiKey = process.env.TOGETHERAI_API_KEY
    if (!apiKey) {
      return { text: '', error: 'Missing TOGETHERAI_API_KEY' }
    }

    const together = new Together({ apiKey })

    try {
      const response = await together.audio.transcriptions.create({
        model,
        language: effectiveLanguage,
        file: new File([new Uint8Array(bytes)], filename, { type: mimeType }),
        // Deliberately NOT passing prompt for Together.ai - causes hallucinations
      })

      return { text: response?.text || '' }
    } catch (err) {
      return {
        text: '',
        error: 'TogetherAI transcription failed',
        details: err instanceof Error ? err.message : String(err),
      }
    }
  } else {
    // Use OpenAI for other models (gpt-4o-transcribe, whisper-1, etc.)
    const apiKey = process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_TRANSCRIBE
    if (!apiKey) {
      return { text: '', error: 'Missing OPENAI_API_KEY' }
    }

    const formData = new FormData()
    const blob = new Blob([new Uint8Array(bytes)], { type: mimeType })
    formData.append('file', blob, filename)
    formData.append('model', model)
    formData.append('language', effectiveLanguage)
    
    // OpenAI handles prompts well for spelling guidance
    if (prompt) {
      formData.append('prompt', prompt)
    }

    try {
      const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        body: formData,
      })

      if (!res.ok) {
        const text = await res.text()
        return { text: '', error: 'OpenAI error', details: text }
      }

      const data = await res.json()
      return { text: data?.text || '' }
    } catch (err) {
      return {
        text: '',
        error: 'OpenAI request failed',
        details: err instanceof Error ? err.message : String(err),
      }
    }
  }
}

export interface TranscribeFileOptions {
  filePath: string
  mimeType: string
  model: string
  language?: string // Language code (e.g., 'de', 'de-CH')
  prompt?: string // Only used for OpenAI models
  glossary?: string[] // Used for OpenAI (in prompt) and Deepgram (as keyterms)
  uploadsDir: string
  onProgress?: (message: string) => void
}

export interface TranscribeFileResult {
  text: string
  duration: number
  error?: string
  details?: string
}

// Transcribe an audio file with automatic chunking for long files
export async function transcribeAudioFile(
  options: TranscribeFileOptions
): Promise<TranscribeFileResult> {
  const { filePath, mimeType, model, language, prompt, glossary, uploadsDir, onProgress } = options
  const log = onProgress || console.warn

  log(`Starting transcription with model: ${model}`)
  log(`Is Whisper model: ${isWhisperModel(model)}, Is Deepgram model: ${isDeepgramModel(model)}`)
  log(`Language: ${language || DEFAULT_MODEL_LANGUAGES[model] || 'de'}`)

  // Analyze audio duration and determine if chunking is needed
  let audioDuration = 0
  let chunks: AudioChunkInfo[] = []

  try {
    const metadata = await getAudioMetadata(filePath)
    audioDuration = metadata.duration
    log(`Audio duration: ${formatDuration(audioDuration)} (${audioDuration}s)`)

    if (needsChunking(audioDuration)) {
      log('Audio is longer than 20 minutes, splitting into chunks...')
      const tempChunkDir = path.join(uploadsDir, 'temp', uuidv4())
      chunks = await splitAudioIntoChunks(filePath, tempChunkDir, (progress) => {
        log(`[Chunking] ${progress.message}`)
      })
      log(`Audio split into ${chunks.length} chunks`)
    } else {
      chunks = [{
        filePath,
        startTime: 0,
        duration: audioDuration,
        index: 0,
      }]
      log('Audio is short enough, no chunking needed')
    }
  } catch (metadataError) {
    log(`Could not analyze audio duration, proceeding without chunking: ${metadataError}`)
    chunks = [{
      filePath,
      startTime: 0,
      duration: 0,
      index: 0,
    }]
  }

  // Transcribe each chunk
  const transcriptions: string[] = []
  log(`Number of chunks to transcribe: ${chunks.length}`)
  if (prompt && !isWhisperModel(model) && !isDeepgramModel(model)) {
    log(`Custom transcription prompt: ${prompt.substring(0, 100)}...`)
  } else if (prompt && isWhisperModel(model)) {
    log('Note: Custom prompt ignored for Together.ai/Whisper (causes hallucinations)')
  }
  if (glossary && glossary.length > 0 && isDeepgramModel(model)) {
    log(`Deepgram keyterms: ${glossary.join(', ')}`)
  }

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i]
    log(`Transcribing chunk ${i + 1}/${chunks.length} (start: ${formatDuration(chunk.startTime)}, duration: ${formatDuration(chunk.duration)})`)

    const chunkBuffer = await readFile(chunk.filePath)
    const chunkFilename = path.basename(chunk.filePath)

    const result = await transcribeAudioBuffer(
      new Uint8Array(chunkBuffer),
      chunkFilename,
      mimeType,
      { model, language, prompt, glossary }
    )

    if (result.error) {
      await cleanupChunks(chunks, filePath)
      return {
        text: '',
        duration: audioDuration,
        error: result.error,
        details: result.details,
      }
    }

    log(`Chunk ${i + 1} transcribed successfully, text length: ${result.text.length}`)
    transcriptions.push(result.text)
  }

  // Merge all transcriptions
  const transcribedText = mergeTranscriptions(transcriptions)
  log(`Merged ${transcriptions.length} transcriptions, total length: ${transcribedText.length}`)

  // Clean up temporary chunk files
  await cleanupChunks(chunks, filePath)

  return {
    text: transcribedText,
    duration: audioDuration,
  }
}
