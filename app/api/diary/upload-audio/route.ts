import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'
import Together from 'together-ai'

const whisperModels = ['openai/whisper-large-v3'] as const
type WhisperModel = (typeof whisperModels)[number]

function isWhisperModel(model: string): model is WhisperModel {
  return whisperModels.includes(model as WhisperModel)
}

// Helper to get uploads directory
function getUploadsDir(): string {
  return process.env.UPLOADS_DIR || path.join(process.cwd(), 'uploads')
}

// Helper to create folder structure: uploads/Jahrzehnt/Jahr/Monat/
function getAudioFolder(date: Date): { folderPath: string; relativePath: string } {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const decade = `${Math.floor(year / 10) * 10}s` // e.g., "2020s"
  
  const uploadsDir = getUploadsDir()
  const relativePath = path.join(decade, String(year), month)
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
// FormData: file (audio/*), date (ISO string), model (string), keepAudio (boolean)
export async function POST(req: NextRequest) {
  try {
    const form = await req.formData()
    const file = form.get('file') as File | null
    const dateStr = form.get('date') as string | null
    const model = (form.get('model') as string | null) || whisperModels[0]
    const keepAudio = form.get('keepAudio') === 'true'

    if (!file) return NextResponse.json({ error: 'Missing file' }, { status: 400 })
    if (!dateStr) return NextResponse.json({ error: 'Missing date' }, { status: 400 })

    // Check file size limit
    const maxSizeMB = parseInt(process.env.MAX_AUDIO_FILE_SIZE_MB || '50', 10)
    const maxSizeBytes = maxSizeMB * 1024 * 1024
    if (file.size > maxSizeBytes) {
      return NextResponse.json({ 
        error: `File too large. Maximum size is ${maxSizeMB}MB` 
      }, { status: 400 })
    }

    const date = new Date(dateStr)
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Determine file extension
    let extension = 'm4a'
    if (file.type.includes('mpeg') || file.name.endsWith('.mp3')) extension = 'mp3'
    if (file.name.endsWith('.m4a')) extension = 'm4a'
    if (file.type.includes('webm') || file.name.endsWith('.webm')) extension = 'webm'

    // Create folder structure and save file
    const { folderPath, relativePath } = getAudioFolder(date)
    const filename = generateAudioFilename(date, extension)
    const fullPath = path.join(folderPath, filename)
    const relativeFilePath = path.join(relativePath, filename).replace(/\\/g, '/')

    // Create directories if they don't exist
    if (!existsSync(folderPath)) {
      await mkdir(folderPath, { recursive: true })
    }

    // Save audio file
    await writeFile(fullPath, buffer)

    // Transcribe audio
    let transcribedText = ''
    
    if (isWhisperModel(model)) {
      const apiKey = process.env.TOGETHERAI_API_KEY
      if (!apiKey) {
        return NextResponse.json({ error: 'Missing TOGETHERAI_API_KEY' }, { status: 500 })
      }

      const together = new Together({ apiKey })
      const response = await together.audio.transcriptions.create({
        model,
        language: 'de',
        file: new File([buffer], filename, { type: file.type || 'audio/webm' }),
      })

      transcribedText = response?.text || ''
    } else {
      // Use OpenAI for GPT transcription models
      const apiKey = process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_TRANSCRIBE
      if (!apiKey) {
        return NextResponse.json({ error: 'Missing OPENAI_API_KEY' }, { status: 500 })
      }

      const ofd = new FormData()
      const blob = new Blob([buffer], { type: file.type || 'audio/webm' })
      ofd.append('file', blob, filename)
      ofd.append('model', model)

      const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        body: ofd,
      })

      if (!res.ok) {
        const text = await res.text()
        return NextResponse.json({ error: 'OpenAI error', details: text }, { status: 500 })
      }

      const data = await res.json()
      transcribedText = data?.text || ''
    }

    // If keepAudio is false, we could delete the file here
    // For now, we'll keep it and let the client decide via the DB flag
    
    return NextResponse.json({
      text: transcribedText,
      audioFilePath: relativeFilePath,
      keepAudio,
      fileSize: file.size,
      filename,
    })
  } catch (err) {
    console.error('POST /api/diary/upload-audio failed', err)
    return NextResponse.json({ 
      error: 'Internal Server Error', 
      details: err instanceof Error ? err.message : String(err) 
    }, { status: 500 })
  }
}
