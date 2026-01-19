import ffmpeg from 'fluent-ffmpeg'
import { promises as fs } from 'fs'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'

// Maximum chunk duration in seconds (20 minutes to stay safely under OpenAI's 1400s limit)
const MAX_CHUNK_DURATION_SECONDS = 1200

export interface AudioChunkInfo {
  filePath: string
  startTime: number
  duration: number
  index: number
}

export interface ChunkingProgress {
  stage: 'analyzing' | 'splitting' | 'complete'
  totalChunks?: number
  currentChunk?: number
  message: string
}

export interface AudioMetadata {
  duration: number
  format: string
  sampleRate?: number
  channels?: number
}

/**
 * Get audio file metadata including duration
 */
export async function getAudioMetadata(filePath: string): Promise<AudioMetadata> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        reject(new Error(`Failed to analyze audio file: ${err.message}`))
        return
      }

      const duration = metadata.format.duration
      if (duration === undefined || duration === null) {
        reject(new Error('Could not determine audio duration'))
        return
      }

      resolve({
        duration,
        format: metadata.format.format_name || 'unknown',
        sampleRate: metadata.streams?.[0]?.sample_rate,
        channels: metadata.streams?.[0]?.channels,
      })
    })
  })
}

/**
 * Check if audio needs chunking based on duration
 */
export function needsChunking(durationSeconds: number): boolean {
  return durationSeconds > MAX_CHUNK_DURATION_SECONDS
}

/**
 * Split audio file into chunks
 * 
 * @param inputPath - Path to the input audio file
 * @param outputDir - Directory to store chunk files
 * @param onProgress - Optional progress callback
 * @returns Array of chunk information
 */
export async function splitAudioIntoChunks(
  inputPath: string,
  outputDir: string,
  onProgress?: (progress: ChunkingProgress) => void
): Promise<AudioChunkInfo[]> {
  // Ensure output directory exists
  await fs.mkdir(outputDir, { recursive: true })

  // Get audio metadata
  onProgress?.({
    stage: 'analyzing',
    message: 'Audio wird analysiert...',
  })

  const metadata = await getAudioMetadata(inputPath)
  const totalDuration = metadata.duration

  // If no chunking needed, return single chunk info pointing to original file
  if (!needsChunking(totalDuration)) {
    onProgress?.({
      stage: 'complete',
      totalChunks: 1,
      currentChunk: 1,
      message: 'Audio ist kurz genug, kein Splitting nötig',
    })

    return [{
      filePath: inputPath,
      startTime: 0,
      duration: totalDuration,
      index: 0,
    }]
  }

  // Calculate number of chunks
  const numChunks = Math.ceil(totalDuration / MAX_CHUNK_DURATION_SECONDS)
  const chunks: AudioChunkInfo[] = []
  const ext = path.extname(inputPath) || '.m4a'
  const baseName = uuidv4()

  onProgress?.({
    stage: 'splitting',
    totalChunks: numChunks,
    currentChunk: 0,
    message: `Audio wird in ${numChunks} Teile aufgeteilt...`,
  })

  // Split into chunks
  for (let i = 0; i < numChunks; i++) {
    const startTime = i * MAX_CHUNK_DURATION_SECONDS
    // Last chunk may be shorter
    const duration = Math.min(MAX_CHUNK_DURATION_SECONDS, totalDuration - startTime)
    const chunkPath = path.join(outputDir, `${baseName}_chunk_${i}${ext}`)

    await extractAudioSegment(inputPath, chunkPath, startTime, duration)

    chunks.push({
      filePath: chunkPath,
      startTime,
      duration,
      index: i,
    })

    onProgress?.({
      stage: 'splitting',
      totalChunks: numChunks,
      currentChunk: i + 1,
      message: `Teil ${i + 1} von ${numChunks} erstellt`,
    })
  }

  onProgress?.({
    stage: 'complete',
    totalChunks: numChunks,
    currentChunk: numChunks,
    message: `Audio in ${numChunks} Teile aufgeteilt`,
  })

  return chunks
}

/**
 * Extract a segment of audio using ffmpeg
 */
async function extractAudioSegment(
  inputPath: string,
  outputPath: string,
  startTime: number,
  duration: number
): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .setStartTime(startTime)
      .setDuration(duration)
      .output(outputPath)
      // Copy audio codec to avoid re-encoding (faster and preserves quality)
      .audioCodec('copy')
      .on('start', (cmd) => {
        console.warn(`[audio-chunker] Extracting segment: ${cmd}`)
      })
      .on('error', (err) => {
        console.error(`[audio-chunker] FFmpeg error:`, err)
        reject(new Error(`Failed to extract audio segment: ${err.message}`))
      })
      .on('end', () => {
        console.warn(`[audio-chunker] Segment extracted: ${outputPath}`)
        resolve()
      })
      .run()
  })
}

/**
 * Clean up temporary chunk files
 */
export async function cleanupChunks(chunks: AudioChunkInfo[], originalPath: string): Promise<void> {
  for (const chunk of chunks) {
    // Don't delete the original file
    if (chunk.filePath !== originalPath) {
      try {
        await fs.unlink(chunk.filePath)
        console.warn(`[audio-chunker] Cleaned up chunk: ${chunk.filePath}`)
      } catch (err) {
        console.warn(`[audio-chunker] Failed to clean up chunk ${chunk.filePath}:`, err)
      }
    }
  }
}

/**
 * Merge multiple transcriptions into a single text
 * Handles potential overlap at chunk boundaries
 */
export function mergeTranscriptions(transcriptions: string[]): string {
  if (transcriptions.length === 0) return ''
  if (transcriptions.length === 1) return transcriptions[0]

  // Simple concatenation with double newline separator
  // The chunks are cut precisely without overlap, so no deduplication needed
  return transcriptions
    .map(t => t.trim())
    .filter(t => t.length > 0)
    .join(' ')
}

/**
 * Format duration in seconds to human-readable string
 */
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  if (mins === 0) {
    return `${secs}s`
  }
  return `${mins}m ${secs}s`
}

/**
 * Get maximum allowed chunk duration
 */
export function getMaxChunkDuration(): number {
  return MAX_CHUNK_DURATION_SECONDS
}
