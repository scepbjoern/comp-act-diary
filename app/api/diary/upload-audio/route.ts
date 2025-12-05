import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir, stat, unlink, readFile } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { getPrisma } from '@/lib/prisma'
import { Together } from 'together-ai'
import { v4 as uuidv4 } from 'uuid'
import {
  getAudioMetadata,
  needsChunking,
  splitAudioIntoChunks,
  cleanupChunks,
  mergeTranscriptions,
  formatDuration,
  AudioChunkInfo,
} from '@/lib/audio-chunker'

const whisperModels = ['openai/whisper-large-v3'] as const
type WhisperModel = (typeof whisperModels)[number]

function isWhisperModel(model: string): model is WhisperModel {
  return whisperModels.includes(model as WhisperModel)
}

// Helper to get uploads directory
function getUploadsDir(): string {
  return process.env.UPLOADS_DIR || path.join(process.cwd(), 'uploads')
}

// Helper to create folder structure: uploads/audio/Jahrzehnt/Jahr/Monat/Tag/
function getAudioFolder(date: Date): { folderPath: string; relativePath: string } {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const decade = `${Math.floor(year / 10) * 10}s` // e.g., "2020s"
  
  const uploadsDir = getUploadsDir()
  const relativePath = path.join('audio', decade, String(year), month, day)
  const folderPath = path.join(uploadsDir, relativePath)
  
  return { folderPath, relativePath }
}

// Helper to generate filename: YYYY-MM-DD_HH-MM_GUID.m4a
function generateAudioFilename(date: Date, extension: string = 'm4a'): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const guid = uuidv4()
  
  return `${year}-${month}-${day}_${hours}-${minutes}_${guid}.${extension}`
}

// POST /api/diary/upload-audio
// FormData: file (audio/*), date (ISO string), time (HH:MM string), model (string), keepAudio (boolean)
export async function POST(req: NextRequest) {
  let tempFilePath: string | null = null
  
  try {
    console.log('=== AUDIO UPLOAD DEBUG START ===')
    console.log('Request headers:', Object.fromEntries(req.headers.entries()))
    
    const form = await req.formData()
    console.log('FormData entries count:', form.keys.length)
    
    const file = form.get('file') as File | null
    const dateStr = form.get('date') as string | null
    const timeStr = form.get('time') as string | null
    const model = (form.get('model') as string | null) || whisperModels[0]
    const keepAudio = form.get('keepAudio') === 'true'

    console.log('Parsed form data:', { 
      hasFile: !!file, 
      fileName: file?.name, 
      fileSize: file?.size, 
      fileType: file?.type,
      dateStr, 
      timeStr,
      model, 
      keepAudio 
    })

    if (!file) {
      console.error('ERROR: Missing file in form data')
      return NextResponse.json({ error: 'Missing file' }, { status: 400 })
    }
    if (!dateStr) {
      console.error('ERROR: Missing date in form data')
      return NextResponse.json({ error: 'Missing date' }, { status: 400 })
    }

    // Check file size limit
    const maxSizeMB = parseInt(process.env.MAX_AUDIO_FILE_SIZE_MB || '50', 10)
    const maxSizeBytes = maxSizeMB * 1024 * 1024
    if (file.size > maxSizeBytes) {
      console.error(`ERROR: File too large. ${file.size} bytes > ${maxSizeBytes} bytes`)
      return NextResponse.json({ 
        error: `File too large. Maximum size is ${maxSizeMB}MB` 
      }, { status: 400 })
    }

    const date = new Date(dateStr)
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    console.log('Buffer created, size:', buffer.length, 'bytes')

    // Determine file extension
    let extension = 'm4a'
    if (file.type.includes('mpeg') || file.name.endsWith('.mp3')) extension = 'mp3'
    if (file.name.endsWith('.m4a')) extension = 'm4a'
    if (file.type.includes('webm') || file.name.endsWith('.webm')) extension = 'webm'

    console.log('Determined extension:', extension)

    // Create datetime from date and time string for filename
    let fileDateTime = date
    if (timeStr) {
      const [hours, minutes] = timeStr.split(':').map(Number)
      if (!isNaN(hours) && !isNaN(minutes)) {
        fileDateTime = new Date(date.getFullYear(), date.getMonth(), date.getDate(), hours, minutes)
        console.log('Using provided time for filename:', fileDateTime.toISOString())
      }
    } else {
      console.log('No time provided, using date only:', fileDateTime.toISOString())
    }

    // Create folder structure and save file
    const { folderPath, relativePath } = getAudioFolder(date)
    const filename = generateAudioFilename(fileDateTime, extension)
    const fullPath = path.join(folderPath, filename)
    const relativeFilePath = path.join(relativePath, filename).replace(/\\/g, '/')

    console.log('File paths:', { folderPath, relativePath, filename, fullPath })

    // Create directories if they don't exist
    if (!existsSync(folderPath)) {
      console.log('Creating directory:', folderPath)
      await mkdir(folderPath, { recursive: true })
    }

    // Save audio file
    console.log('Saving file to:', fullPath)
    await writeFile(fullPath, buffer)
    tempFilePath = fullPath
    
    // Get file stats for metadata
    const fileStats = await stat(fullPath)
    const fileSizeBytes = fileStats.size

    console.log('File saved successfully, size on disk:', fileSizeBytes, 'bytes')

    // Analyze audio duration and determine if chunking is needed
    console.log('Analyzing audio file for duration...')
    let audioDuration = 0
    let chunks: AudioChunkInfo[] = []
    
    try {
      const metadata = await getAudioMetadata(fullPath)
      audioDuration = metadata.duration
      console.log(`Audio duration: ${formatDuration(audioDuration)} (${audioDuration}s)`)
      
      if (needsChunking(audioDuration)) {
        console.log('Audio is longer than 20 minutes, splitting into chunks...')
        const tempChunkDir = path.join(getUploadsDir(), 'temp', uuidv4())
        chunks = await splitAudioIntoChunks(fullPath, tempChunkDir, (progress) => {
          console.log(`[Chunking] ${progress.message}`)
        })
        console.log(`Audio split into ${chunks.length} chunks`)
      } else {
        // Single chunk pointing to original file
        chunks = [{
          filePath: fullPath,
          startTime: 0,
          duration: audioDuration,
          index: 0,
        }]
        console.log('Audio is short enough, no chunking needed')
      }
    } catch (metadataError) {
      console.warn('Could not analyze audio duration, proceeding without chunking:', metadataError)
      // Fall back to single chunk
      chunks = [{
        filePath: fullPath,
        startTime: 0,
        duration: 0,
        index: 0,
      }]
    }

    // Transcribe audio (with chunking support)
    let transcribedText = ''
    const transcriptions: string[] = []
    
    console.log('Starting transcription with model:', model)
    console.log('Is Whisper model:', isWhisperModel(model))
    console.log('Number of chunks to transcribe:', chunks.length)
    console.log('Environment variables:', {
      hasTogetherAI: !!process.env.TOGETHERAI_API_KEY,
      hasOpenAI: !!process.env.OPENAI_API_KEY,
      togetherPrefix: process.env.TOGETHERAI_API_KEY?.substring(0, 10) + '...',
      openaiPrefix: process.env.OPENAI_API_KEY?.substring(0, 10) + '...'
    })
    
    // Transcribe each chunk
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]
      console.log(`Transcribing chunk ${i + 1}/${chunks.length} (start: ${formatDuration(chunk.startTime)}, duration: ${formatDuration(chunk.duration)})`)
      
      // Read chunk file
      const chunkBuffer = await readFile(chunk.filePath)
      const chunkFilename = path.basename(chunk.filePath)
      
      let chunkText = ''
      
      if (isWhisperModel(model)) {
        const apiKey = process.env.TOGETHERAI_API_KEY
        if (!apiKey) {
          console.error('ERROR: Missing TOGETHERAI_API_KEY for Whisper model')
          await cleanupChunks(chunks, fullPath)
          return NextResponse.json({ error: 'Missing TOGETHERAI_API_KEY' }, { status: 500 })
        }

        console.log(`Using TogetherAI for chunk ${i + 1}...`)
        const together = new Together({ apiKey })
        
        try {
          const response = await together.audio.transcriptions.create({
            model,
            language: 'de',
            file: new File([new Uint8Array(chunkBuffer)], chunkFilename, { type: file.type || 'audio/webm' }),
          })

          chunkText = response?.text || ''
          console.log(`TogetherAI transcription chunk ${i + 1} successful, text length: ${chunkText.length}`)
        } catch (togetherError) {
          console.error(`TogetherAI transcription chunk ${i + 1} failed:`, togetherError)
          await cleanupChunks(chunks, fullPath)
          return NextResponse.json({ 
            error: 'TogetherAI transcription failed', 
            details: togetherError instanceof Error ? togetherError.message : String(togetherError) 
          }, { status: 500 })
        }
      } else {
        // Use OpenAI for GPT transcription models
        const apiKey = process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_TRANSCRIBE
        if (!apiKey) {
          console.error('ERROR: Missing OPENAI_API_KEY for GPT model')
          await cleanupChunks(chunks, fullPath)
          return NextResponse.json({ error: 'Missing OPENAI_API_KEY' }, { status: 500 })
        }

        console.log(`Using OpenAI for chunk ${i + 1}...`)
        const ofd = new FormData()
        const blob = new Blob([new Uint8Array(chunkBuffer)], { type: file.type || 'audio/webm' })
        ofd.append('file', blob, chunkFilename)
        ofd.append('model', model)

        try {
          const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${apiKey}`,
            },
            body: ofd,
          })

          console.log(`OpenAI response status for chunk ${i + 1}:`, res.status)

          if (!res.ok) {
            const text = await res.text()
            console.error(`OpenAI API error for chunk ${i + 1}:`, text)
            await cleanupChunks(chunks, fullPath)
            return NextResponse.json({ error: 'OpenAI error', details: text }, { status: 500 })
          }

          const data = await res.json()
          chunkText = data?.text || ''
          console.log(`OpenAI transcription chunk ${i + 1} successful, text length: ${chunkText.length}`)
        } catch (openaiError) {
          console.error(`OpenAI request chunk ${i + 1} failed:`, openaiError)
          await cleanupChunks(chunks, fullPath)
          return NextResponse.json({ 
            error: 'OpenAI request failed', 
            details: openaiError instanceof Error ? openaiError.message : String(openaiError) 
          }, { status: 500 })
        }
      }
      
      transcriptions.push(chunkText)
    }
    
    // Merge all transcriptions
    transcribedText = mergeTranscriptions(transcriptions)
    console.log(`Merged ${transcriptions.length} transcriptions, total length: ${transcribedText.length}`)
    
    // Clean up temporary chunk files
    await cleanupChunks(chunks, fullPath)

    console.log('Creating database record...')
    
    // Create AudioFile record in database
    const prisma = getPrisma()
    const mimeType = file.type || (extension === 'webm' ? 'audio/webm' : extension === 'm4a' ? 'audio/m4a' : 'audio/mpeg')
    
    try {
      const audioFile = await prisma.audioFile.create({
        data: {
          filePath: relativeFilePath,
          fileName: filename,
          mimeType,
          sizeBytes: fileSizeBytes,
        }
      })
      
      console.log('Database record created successfully, ID:', audioFile.id)
      
      const result = {
        text: transcribedText,
        audioFileId: audioFile.id,
        audioFilePath: relativeFilePath, // Keep for backward compatibility
        keepAudio,
        fileSize: fileSizeBytes,
        filename,
      }
      
      console.log('=== AUDIO UPLOAD DEBUG END SUCCESS ===')
      return NextResponse.json(result)
    } catch (dbError) {
      console.error('Database operation failed:', dbError)
      return NextResponse.json({ 
        error: 'Database operation failed', 
        details: dbError instanceof Error ? dbError.message : String(dbError) 
      }, { status: 500 })
    }
  } catch (err) {
    console.error('=== AUDIO UPLOAD DEBUG END ERROR ===')
    console.error('POST /api/diary/upload-audio failed:', err)
    console.error('Error stack:', err instanceof Error ? err.stack : 'No stack trace')
    console.error('Error type:', typeof err)
    console.error('Error constructor:', err?.constructor?.name)
    
    // Clean up temporary file if it exists
    if (tempFilePath && existsSync(tempFilePath)) {
      try {
        await unlink(tempFilePath)
        console.log('Cleaned up temporary file:', tempFilePath)
      } catch (cleanupError) {
        console.error('Failed to clean up temporary file:', cleanupError)
      }
    }
    
    return NextResponse.json({ 
      error: 'Internal Server Error', 
      details: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined
    }, { status: 500 })
  }
}
