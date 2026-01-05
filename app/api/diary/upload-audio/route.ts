import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir, stat, unlink } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { getPrisma } from '@/lib/prisma'
import { v4 as uuidv4 } from 'uuid'
import {
  transcribeAudioFile,
  buildTranscriptionPrompt,
  getDefaultTranscriptionModel,
} from '@/lib/transcription'

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

    const form = await req.formData()

    const file = form.get('file') as File | null
    const dateStr = form.get('date') as string | null
    const timeStr = form.get('time') as string | null
    const model = (form.get('model') as string | null) || getDefaultTranscriptionModel()
    const keepAudio = form.get('keepAudio') === 'true'

    console.log('Parsed form data:', {
      hasFile: !!file,
      fileName: file?.name,
      fileSize: file?.size,
      fileType: file?.type,
      dateStr,
      timeStr,
      model,
      keepAudio,
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
        error: `File too large. Maximum size is ${maxSizeMB}MB`,
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

    // Get user settings for transcription prompt
    const prisma = getPrisma()
    const cookieUserId = req.cookies.get('userId')?.value
    let user = cookieUserId ? await prisma.user.findUnique({ where: { id: cookieUserId } }) : null
    if (!user) user = await prisma.user.findUnique({ where: { username: 'demo' } })

    const userSettings = (user?.settings as Record<string, any>) || {}
    const glossary = userSettings.transcriptionGlossary || []
    const transcriptionPrompt = buildTranscriptionPrompt(
      userSettings.transcriptionPrompt,
      glossary
    )
    
    // Get per-model language setting
    const modelLanguages = userSettings.transcriptionModelLanguages || {}
    const transcriptionLanguage = modelLanguages[model]

    // Transcribe audio using shared library
    const mimeType = file.type || (extension === 'webm' ? 'audio/webm' : extension === 'm4a' ? 'audio/m4a' : 'audio/mpeg')

    const transcriptionResult = await transcribeAudioFile({
      filePath: fullPath,
      mimeType,
      model,
      language: transcriptionLanguage,
      prompt: transcriptionPrompt,
      glossary,
      uploadsDir: getUploadsDir(),
      onProgress: (msg) => console.log(msg),
    })

    if (transcriptionResult.error) {
      console.error('Transcription failed:', transcriptionResult.error, transcriptionResult.details)
      return NextResponse.json({
        error: transcriptionResult.error,
        details: transcriptionResult.details,
      }, { status: 500 })
    }

    console.log('Creating database record...')

    if (!user) {
      return NextResponse.json({ error: 'No user found' }, { status: 401 })
    }

    try {
      const mediaAsset = await prisma.mediaAsset.create({
        data: {
          userId: user.id,
          filePath: relativeFilePath,
          mimeType,
          duration: transcriptionResult.duration > 0 ? transcriptionResult.duration : null,
        },
      })

      console.log('MediaAsset record created successfully, ID:', mediaAsset.id)

      const result = {
        text: transcriptionResult.text,
        audioFileId: mediaAsset.id, // Keep name for backward compatibility
        audioFilePath: relativeFilePath,
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
        details: dbError instanceof Error ? dbError.message : String(dbError),
      }, { status: 500 })
    }
  } catch (err) {
    console.error('=== AUDIO UPLOAD DEBUG END ERROR ===')
    console.error('POST /api/diary/upload-audio failed:', err)
    console.error('Error stack:', err instanceof Error ? err.stack : 'No stack trace')

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
      stack: err instanceof Error ? err.stack : undefined,
    }, { status: 500 })
  }
}
