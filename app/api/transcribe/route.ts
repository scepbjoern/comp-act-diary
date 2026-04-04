import { NextRequest, NextResponse } from 'next/server'
import { mkdir, unlink, writeFile } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'
import { getPrisma } from '@/lib/core/prisma'
import {
  transcribeAudioFile,
  transcribeAudioBuffer,
  buildTranscriptionPrompt,
  getDefaultTranscriptionModel,
} from '@/lib/media/transcription'

function getUploadsDir(): string {
  return process.env.UPLOADS_DIR || path.join(process.cwd(), 'uploads')
}

function getAudioFolder(date: Date): { folderPath: string; relativePath: string } {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const decade = `${Math.floor(year / 10) * 10}s`

  const uploadsDir = getUploadsDir()
  const relativePath = path.join('audio', decade, String(year), month, day)
  const folderPath = path.join(uploadsDir, relativePath)

  return { folderPath, relativePath }
}

function resolveAudioExtension(file: File): string {
  const lowerName = file.name.toLowerCase()

  if (file.type.includes('mpeg') || lowerName.endsWith('.mp3')) return 'mp3'
  if (file.type.includes('mp4') || file.type.includes('x-m4a') || file.type.includes('m4a') || lowerName.endsWith('.m4a')) return 'm4a'
  if (file.type.includes('ogg') || lowerName.endsWith('.ogg')) return 'ogg'
  if (file.type.includes('webm') || lowerName.endsWith('.webm')) return 'webm'

  return 'm4a'
}

function generateAudioFilename(date: Date, extension: string): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')

  return `${year}-${month}-${day}_${hours}-${minutes}_${uuidv4()}.${extension}`
}

// POST /api/transcribe
// FormData: file (audio/*), model (string)
export async function POST(req: NextRequest) {
  let tempFilePath: string | null = null
  try {
    const form = await req.formData()
    const file = form.get('file') as File | null
    const model = (form.get('model') as string | null) || getDefaultTranscriptionModel()
    const keepAudio = form.get('keepAudio') === 'true'
    const capturedAtRaw = form.get('capturedAt') as string | null

    if (!file) return NextResponse.json({ error: 'Missing file' }, { status: 400 })

    const maxSizeMB = parseInt(process.env.MAX_AUDIO_FILE_SIZE_MB || '50', 10)
    const maxSizeBytes = maxSizeMB * 1024 * 1024
    if (file.size > maxSizeBytes) {
      return NextResponse.json({ error: `File too large. Maximum size is ${maxSizeMB}MB` }, { status: 400 })
    }

    // Get user settings for transcription prompt and glossary
    const prisma = getPrisma()
    const cookieUserId = req.cookies.get('userId')?.value
    let user = cookieUserId ? await prisma.user.findUnique({ where: { id: cookieUserId } }) : null
    if (!user) user = await prisma.user.findUnique({ where: { username: 'demo' } })

    if (keepAudio && !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userSettings = (user?.settings as Record<string, any>) || {}
    const glossary = userSettings.transcriptionGlossary || []
    const prompt = buildTranscriptionPrompt(userSettings.transcriptionPrompt, glossary)
    
    // Get per-model language setting
    const modelLanguages = userSettings.transcriptionModelLanguages || {}
    const language = modelLanguages[model]

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    if (keepAudio) {
      const parsedCapturedAt = capturedAtRaw ? new Date(capturedAtRaw) : null
      const capturedAt = parsedCapturedAt && !Number.isNaN(parsedCapturedAt.getTime())
        ? parsedCapturedAt
        : file.lastModified
          ? new Date(file.lastModified)
          : new Date()

      const extension = resolveAudioExtension(file)
      const { folderPath, relativePath } = getAudioFolder(capturedAt)
      const filename = generateAudioFilename(capturedAt, extension)
      const fullPath = path.join(folderPath, filename)
      const relativeFilePath = path.join(relativePath, filename).replace(/\\/g, '/')

      await mkdir(folderPath, { recursive: true })
      await writeFile(fullPath, buffer)
      tempFilePath = fullPath

      let mimeType = file.type || (extension === 'webm' ? 'audio/webm' : extension === 'ogg' ? 'audio/ogg' : extension === 'mp3' ? 'audio/mpeg' : 'audio/mp4')
      if (mimeType === 'audio/x-m4a' || mimeType === 'audio/m4a') {
        mimeType = 'audio/mp4'
      }

      const result = await transcribeAudioFile({
        filePath: fullPath,
        mimeType,
        model,
        language,
        prompt,
        glossary,
        uploadsDir: getUploadsDir(),
        onProgress: (message) => console.warn(message),
      })

      if (result.error) {
        if (tempFilePath && existsSync(tempFilePath)) {
          await unlink(tempFilePath)
        }
        return NextResponse.json({ error: result.error, details: result.details }, { status: 500 })
      }

      const mediaAsset = await prisma.mediaAsset.create({
        data: {
          userId: user!.id,
          filePath: relativeFilePath,
          mimeType,
          duration: result.duration > 0 ? result.duration : null,
          capturedAt,
        },
      })

      tempFilePath = null

      return NextResponse.json({
        text: result.text,
        assetId: mediaAsset.id,
        filePath: relativeFilePath,
        capturedAt: capturedAt.toISOString(),
        model,
        keepAudio: true,
      })
    }

    const result = await transcribeAudioBuffer(
      buffer,
      file.name || 'recording.webm',
      file.type || 'audio/webm',
      { model, language, prompt, glossary }
    )

    if (result.error) {
      return NextResponse.json({ error: result.error, details: result.details }, { status: 500 })
    }

    return NextResponse.json({ text: result.text })
  } catch (err) {
    if (tempFilePath && existsSync(tempFilePath)) {
      try {
        await unlink(tempFilePath)
      } catch (cleanupError) {
        console.error('POST /api/transcribe cleanup failed', cleanupError)
      }
    }
    console.error('POST /api/transcribe failed', err)
    return NextResponse.json({ error: 'Internal Server Error', details: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}
