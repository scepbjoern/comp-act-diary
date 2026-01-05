import { NextRequest, NextResponse } from 'next/server'
import { getPrisma } from '@/lib/prisma'
import {
  transcribeAudioBuffer,
  buildTranscriptionPrompt,
  getDefaultTranscriptionModel,
  isWhisperModel,
} from '@/lib/transcription'

// POST /api/transcribe
// FormData: file (audio/*), model (string)
export async function POST(req: NextRequest) {
  try {
    const form = await req.formData()
    const file = form.get('file') as File | null
    const model = (form.get('model') as string | null) || getDefaultTranscriptionModel()

    if (!file) return NextResponse.json({ error: 'Missing file' }, { status: 400 })

    // Get user settings for transcription prompt (only used for OpenAI models)
    const prisma = getPrisma()
    const cookieUserId = req.cookies.get('userId')?.value
    let user = cookieUserId ? await prisma.user.findUnique({ where: { id: cookieUserId } }) : null
    if (!user) user = await prisma.user.findUnique({ where: { username: 'demo' } })

    const userSettings = (user?.settings as Record<string, any>) || {}
    const prompt = buildTranscriptionPrompt(userSettings.transcriptionPrompt, userSettings.transcriptionGlossary)

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const result = await transcribeAudioBuffer(
      buffer,
      file.name || 'recording.webm',
      file.type || 'audio/webm',
      { model, prompt }
    )

    if (result.error) {
      return NextResponse.json({ error: result.error, details: result.details }, { status: 500 })
    }

    return NextResponse.json({ text: result.text })
  } catch (err) {
    console.error('POST /api/transcribe failed', err)
    return NextResponse.json({ error: 'Internal Server Error', details: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}
