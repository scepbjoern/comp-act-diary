import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
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

function getUploadsDir(): string {
  return process.env.UPLOADS_DIR || path.join(process.cwd(), 'uploads')
}

// POST /api/diary/retranscribe
// FormData: audioFileId (string), model (string)
export async function POST(req: NextRequest) {
  try {
    console.log('=== RETRANSCRIBE DEBUG START ===')
    
    const form = await req.formData()
    const audioFileId = form.get('audioFileId') as string | null
    const model = (form.get('model') as string | null) || whisperModels[0]

    console.log('Parsed form data:', { audioFileId, model })

    if (!audioFileId) {
      console.error('ERROR: Missing audioFileId in form data')
      return NextResponse.json({ error: 'Missing audioFileId' }, { status: 400 })
    }

    // Get audio file from database
    const prisma = getPrisma()
    const audioFile = await prisma.audioFile.findUnique({
      where: { id: audioFileId }
    })

    if (!audioFile) {
      console.error('ERROR: Audio file not found:', audioFileId)
      return NextResponse.json({ error: 'Audio file not found' }, { status: 404 })
    }

    // Check if file exists on disk
    const uploadsDir = getUploadsDir()
    const fullPath = path.join(uploadsDir, audioFile.filePath)

    if (!existsSync(fullPath)) {
      console.error('ERROR: Audio file not found on disk:', fullPath)
      return NextResponse.json({ error: 'Audio file not found on disk' }, { status: 404 })
    }

    // Read the audio file
    const audioBuffer = await readFile(fullPath)
    const extension = path.extname(audioFile.fileName).slice(1) || 'm4a'
    const mimeType = audioFile.mimeType || `audio/${extension}`

    console.log('Audio file loaded:', { 
      fileName: audioFile.fileName, 
      fileSize: audioBuffer.length, 
      mimeType,
      extension 
    })

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
        const tempChunkDir = path.join(uploadsDir, 'temp', uuidv4())
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
    
    console.log('Starting re-transcription with model:', model)
    console.log('Is Whisper model:', isWhisperModel(model))
    console.log('Number of chunks to transcribe:', chunks.length)
    
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
            file: new File([new Uint8Array(chunkBuffer)], chunkFilename, { type: mimeType }),
          })

          chunkText = response?.text || ''
          console.log(`TogetherAI re-transcription chunk ${i + 1} successful, text length: ${chunkText.length}`)
        } catch (togetherError) {
          console.error(`TogetherAI re-transcription chunk ${i + 1} failed:`, togetherError)
          await cleanupChunks(chunks, fullPath)
          return NextResponse.json({ 
            error: 'TogetherAI re-transcription failed', 
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
        const blob = new Blob([new Uint8Array(chunkBuffer)], { type: mimeType })
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
          console.log(`OpenAI re-transcription chunk ${i + 1} successful, text length: ${chunkText.length}`)
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

    // Update all notes that use this audio file with the new transcription
    const updatedNotes = await prisma.dayNote.updateMany({
      where: { audioFileId },
      data: { 
        text: transcribedText,
        originalTranscript: transcribedText // Store as original transcript
      }
    })

    console.log('Updated notes count:', updatedNotes.count)

    const result = {
      text: transcribedText,
      audioFileId,
      updatedNotesCount: updatedNotes.count,
      model
    }
    
    console.log('=== RETRANSCRIBE DEBUG END SUCCESS ===')
    return NextResponse.json(result)

  } catch (err) {
    console.error('=== RETRANSCRIBE DEBUG END ERROR ===')
    console.error('POST /api/diary/retranscribe failed:', err)
    console.error('Error stack:', err instanceof Error ? err.stack : 'No stack trace')
    
    return NextResponse.json({ 
      error: 'Internal Server Error', 
      details: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined
    }, { status: 500 })
  }
}
