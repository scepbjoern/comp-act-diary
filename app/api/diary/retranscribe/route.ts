import { NextRequest, NextResponse } from 'next/server'
import { existsSync } from 'fs'
import path from 'path'
import { getPrisma } from '@/lib/prisma'
import {
  transcribeAudioFile,
  buildTranscriptionPrompt,
  getDefaultTranscriptionModel,
} from '@/lib/transcription'

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
    const model = (form.get('model') as string | null) || getDefaultTranscriptionModel()

    console.log('Parsed form data:', { audioFileId, model })

    if (!audioFileId) {
      console.error('ERROR: Missing audioFileId in form data')
      return NextResponse.json({ error: 'Missing audioFileId' }, { status: 400 })
    }

    // Get media asset from database
    const prisma = getPrisma()
    const mediaAsset = await prisma.mediaAsset.findUnique({
      where: { id: audioFileId },
    })

    if (!mediaAsset) {
      console.error('ERROR: Media asset not found:', audioFileId)
      return NextResponse.json({ error: 'Audio file not found' }, { status: 404 })
    }

    if (!mediaAsset.filePath) {
      console.error('ERROR: Media asset has no file path:', audioFileId)
      return NextResponse.json({ error: 'Audio file has no path' }, { status: 404 })
    }

    // Check if file exists on disk
    const uploadsDir = getUploadsDir()
    const fullPath = path.join(uploadsDir, mediaAsset.filePath)

    if (!existsSync(fullPath)) {
      console.error('ERROR: Audio file not found on disk:', fullPath)
      return NextResponse.json({ error: 'Audio file not found on disk' }, { status: 404 })
    }

    const extension = path.extname(mediaAsset.filePath).slice(1) || 'm4a'
    const mimeType = mediaAsset.mimeType || `audio/${extension}`

    console.log('Audio file found:', {
      filePath: mediaAsset.filePath,
      mimeType,
      extension,
    })

    // Get user settings for transcription prompt
    const cookieUserId = req.cookies.get('userId')?.value
    let user = cookieUserId ? await prisma.user.findUnique({ where: { id: cookieUserId } }) : null
    if (!user) user = await prisma.user.findUnique({ where: { username: 'demo' } })

    const userSettings = (user?.settings as Record<string, any>) || {}
    const transcriptionPrompt = buildTranscriptionPrompt(
      userSettings.transcriptionPrompt,
      userSettings.transcriptionGlossary
    )

    // Transcribe audio using shared library
    const transcriptionResult = await transcribeAudioFile({
      filePath: fullPath,
      mimeType,
      model,
      prompt: transcriptionPrompt,
      uploadsDir,
      onProgress: (msg) => console.log(msg),
    })

    if (transcriptionResult.error) {
      console.error('Re-transcription failed:', transcriptionResult.error, transcriptionResult.details)
      return NextResponse.json({
        error: transcriptionResult.error,
        details: transcriptionResult.details,
      }, { status: 500 })
    }

    console.log('Transcription complete, returning result')

    const result = {
      text: transcriptionResult.text,
      audioFileId,
      model,
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
      stack: err instanceof Error ? err.stack : undefined,
    }, { status: 500 })
  }
}
