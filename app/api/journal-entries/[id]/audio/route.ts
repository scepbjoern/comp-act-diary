/**
 * API Route: Add audio to existing JournalEntry
 * 
 * POST /api/journal-entries/[id]/audio
 * Adds a new audio file to an existing journal entry, transcribes it,
 * and optionally appends the transcript to the entry content.
 */

import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir, stat, unlink } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { getPrisma } from '@/lib/core/prisma'
import { v4 as uuidv4 } from 'uuid'
import {
  transcribeAudioFile,
  buildTranscriptionPrompt,
  getDefaultTranscriptionModel,
} from '@/lib/media/transcription'

// Helper to get uploads directory
function getUploadsDir(): string {
  return process.env.UPLOADS_DIR || path.join(process.cwd(), 'uploads')
}

// Helper to create folder structure: uploads/audio/Jahrzehnt/Jahr/Monat/Tag/
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

export async function POST(
  req: NextRequest, 
  context: { params: Promise<{ id: string }> }
) {
  let tempFilePath: string | null = null
  const { id: journalEntryId } = await context.params

  try {
    const prisma = getPrisma()
    
    // Verify user and get entry
    const cookieUserId = req.cookies.get('userId')?.value
    let user = cookieUserId ? await prisma.user.findUnique({ where: { id: cookieUserId } }) : null
    if (!user) user = await prisma.user.findUnique({ where: { username: 'demo' } })
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify entry exists and user has access
    const entry = await prisma.journalEntry.findUnique({
      where: { id: journalEntryId },
      include: { timeBox: true }
    })
    
    if (!entry) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
    }
    
    if (entry.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const form = await req.formData()
    const file = form.get('file') as File | null
    const model = (form.get('model') as string | null) || getDefaultTranscriptionModel()
    const appendText = form.get('appendText') !== 'false' // Default true
    const fieldId = form.get('fieldId') as string | null

    if (!file) {
      return NextResponse.json({ error: 'Missing file' }, { status: 400 })
    }

    // Check file size limit
    const maxSizeMB = parseInt(process.env.MAX_AUDIO_FILE_SIZE_MB || '50', 10)
    const maxSizeBytes = maxSizeMB * 1024 * 1024
    if (file.size > maxSizeBytes) {
      return NextResponse.json({
        error: `File too large. Maximum size is ${maxSizeMB}MB`,
      }, { status: 400 })
    }

    const capturedAt = file.lastModified ? new Date(file.lastModified) : new Date()
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Determine file extension
    let extension = 'm4a'
    if (file.type.includes('mpeg') || file.name.endsWith('.mp3')) extension = 'mp3'
    if (file.name.endsWith('.m4a')) extension = 'm4a'
    if (file.type.includes('webm') || file.name.endsWith('.webm')) extension = 'webm'

    // Create folder structure and save file
    const { folderPath, relativePath } = getAudioFolder(capturedAt)
    const filename = generateAudioFilename(capturedAt, extension)
    const fullPath = path.join(folderPath, filename)
    const relativeFilePath = path.join(relativePath, filename).replace(/\\/g, '/')

    // Create directories if they don't exist
    if (!existsSync(folderPath)) {
      await mkdir(folderPath, { recursive: true })
    }

    // Save audio file
    await writeFile(fullPath, buffer)
    tempFilePath = fullPath

    // Get file stats for metadata
    const fileStats = await stat(fullPath)
    const fileSizeBytes = fileStats.size

    // Get user settings for transcription prompt
    const userSettings = (user.settings as Record<string, unknown>) || {}
    const glossary = (userSettings.transcriptionGlossary as string[]) || []
    const transcriptionPrompt = buildTranscriptionPrompt(
      userSettings.transcriptionPrompt as string | undefined,
      glossary
    )
    
    // Get per-model language setting
    const modelLanguages = (userSettings.transcriptionModelLanguages as Record<string, string>) || {}
    const transcriptionLanguage = modelLanguages[model]

    // Transcribe audio
    // Normalize mimeType for OpenAI compatibility (audio/x-m4a and audio/m4a → audio/mp4)
    let mimeType = file.type || (extension === 'webm' ? 'audio/webm' : extension === 'm4a' ? 'audio/mp4' : 'audio/mpeg')
    if (mimeType === 'audio/x-m4a' || mimeType === 'audio/m4a') {
      mimeType = 'audio/mp4'
    }

    const transcriptionResult = await transcribeAudioFile({
      filePath: fullPath,
      mimeType,
      model,
      language: transcriptionLanguage,
      prompt: transcriptionPrompt,
      glossary,
      uploadsDir: getUploadsDir(),
      onProgress: (msg) => console.warn(msg),
    })

    if (transcriptionResult.error) {
      // Clean up file on error
      if (tempFilePath && existsSync(tempFilePath)) {
        await unlink(tempFilePath)
      }
      return NextResponse.json({
        error: transcriptionResult.error,
        details: transcriptionResult.details,
      }, { status: 500 })
    }

    // Create MediaAsset
    const mediaAsset = await prisma.mediaAsset.create({
      data: {
        userId: user.id,
        filePath: relativeFilePath,
        mimeType,
        duration: transcriptionResult.duration > 0 ? transcriptionResult.duration : null,
        capturedAt,
      },
    })

    // Create MediaAttachment with transcript
    const mediaAttachment = await prisma.mediaAttachment.create({
      data: {
        assetId: mediaAsset.id,
        entityId: journalEntryId,
        userId: user.id,
        role: 'ATTACHMENT',
        timeBoxId: entry.timeBoxId,
        transcript: transcriptionResult.text,
        transcriptModel: model,
        fieldId: fieldId || null,
      },
    })

    // Optionally append transcript to entry content
    if (appendText && transcriptionResult.text) {
      const separator = entry.content ? '\n\n' : ''
      const updatedContent = entry.content + separator + transcriptionResult.text
      
      await prisma.journalEntry.update({
        where: { id: journalEntryId },
        data: {
          content: updatedContent,
          contentUpdatedAt: new Date(),
        },
      })
    }

    return NextResponse.json({
      attachmentId: mediaAttachment.id,
      assetId: mediaAsset.id,
      transcript: transcriptionResult.text,
      model,
      duration: transcriptionResult.duration,
      filePath: relativeFilePath,
      fileSize: fileSizeBytes,
      appended: appendText,
    })

  } catch (err) {
    console.error('POST /api/journal-entries/[id]/audio failed:', err)

    // Clean up temporary file if it exists
    if (tempFilePath && existsSync(tempFilePath)) {
      try {
        await unlink(tempFilePath)
      } catch (cleanupError) {
        console.error('Failed to clean up temporary file:', cleanupError)
      }
    }

    return NextResponse.json({
      error: 'Internal Server Error',
      details: err instanceof Error ? err.message : String(err),
    }, { status: 500 })
  }
}

// GET: List all audio attachments for a journal entry
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: journalEntryId } = await context.params
  
  try {
    const prisma = getPrisma()
    
    // Verify user
    const cookieUserId = req.cookies.get('userId')?.value
    let user = cookieUserId ? await prisma.user.findUnique({ where: { id: cookieUserId } }) : null
    if (!user) user = await prisma.user.findUnique({ where: { username: 'demo' } })
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get entry with audio attachments
    const entry = await prisma.journalEntry.findUnique({
      where: { id: journalEntryId },
    })
    
    if (!entry) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
    }
    
    if (entry.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get audio attachments via Entity
    const attachments = await prisma.mediaAttachment.findMany({
      where: { entityId: journalEntryId },
      include: { asset: true },
      orderBy: { createdAt: 'asc' },
    })

    const audioAttachments = attachments
      .filter(a => a.asset.mimeType?.startsWith('audio/'))
      .map(a => ({
        id: a.id,
        assetId: a.asset.id,
        filePath: a.asset.filePath,
        duration: a.asset.duration,
        transcript: a.transcript ?? null,
        transcriptModel: a.transcriptModel ?? null,
        fieldId: a.fieldId ?? null,
        capturedAt: a.asset.capturedAt?.toISOString() ?? null,
        createdAt: a.createdAt?.toISOString() ?? null,
      }))

    return NextResponse.json({ audioAttachments })

  } catch (err) {
    console.error('GET /api/journal-entries/[id]/audio failed:', err)
    return NextResponse.json({
      error: 'Internal Server Error',
      details: err instanceof Error ? err.message : String(err),
    }, { status: 500 })
  }
}

// PATCH: Update transcript/model for a specific audio attachment
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: journalEntryId } = await context.params

  try {
    const prisma = getPrisma()
    const body = await req.json().catch(() => ({} as Record<string, unknown>))
    const attachmentId = typeof body.attachmentId === 'string' ? body.attachmentId : null
    const transcript = typeof body.transcript === 'string' ? body.transcript : null
    const transcriptModel = typeof body.transcriptModel === 'string' ? body.transcriptModel : null

    if (!attachmentId) {
      return NextResponse.json({ error: 'Missing attachmentId' }, { status: 400 })
    }

    // Verify user
    const cookieUserId = req.cookies.get('userId')?.value
    let user = cookieUserId ? await prisma.user.findUnique({ where: { id: cookieUserId } }) : null
    if (!user) user = await prisma.user.findUnique({ where: { username: 'demo' } })
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify attachment exists and belongs to user + entry
    const attachment = await prisma.mediaAttachment.findUnique({
      where: { id: attachmentId },
      include: { asset: true },
    })

    if (!attachment) {
      return NextResponse.json({ error: 'Attachment not found' }, { status: 404 })
    }

    if (attachment.entityId !== journalEntryId || attachment.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const updated = await prisma.mediaAttachment.update({
      where: { id: attachmentId },
      data: {
        transcript,
        transcriptModel,
      },
      include: { asset: true },
    })

    return NextResponse.json({
      ok: true,
      attachment: {
        id: updated.id,
        assetId: updated.assetId,
        filePath: updated.asset.filePath,
        duration: updated.asset.duration,
        transcript: updated.transcript ?? null,
        transcriptModel: updated.transcriptModel ?? null,
        capturedAt: updated.asset.capturedAt?.toISOString() ?? null,
        createdAt: updated.createdAt?.toISOString() ?? null,
      },
    })
  } catch (err) {
    console.error('PATCH /api/journal-entries/[id]/audio failed:', err)
    return NextResponse.json({
      error: 'Internal Server Error',
      details: err instanceof Error ? err.message : String(err),
    }, { status: 500 })
  }
}

// DELETE: Remove an audio attachment
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: journalEntryId } = await context.params
  
  try {
    const prisma = getPrisma()
    const { searchParams } = new URL(req.url)
    const attachmentId = searchParams.get('attachmentId')
    
    if (!attachmentId) {
      return NextResponse.json({ error: 'Missing attachmentId' }, { status: 400 })
    }
    
    // Verify user
    const cookieUserId = req.cookies.get('userId')?.value
    let user = cookieUserId ? await prisma.user.findUnique({ where: { id: cookieUserId } }) : null
    if (!user) user = await prisma.user.findUnique({ where: { username: 'demo' } })
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify attachment exists and belongs to user
    const attachment = await prisma.mediaAttachment.findUnique({
      where: { id: attachmentId },
      include: { asset: true },
    })
    
    if (!attachment) {
      return NextResponse.json({ error: 'Attachment not found' }, { status: 404 })
    }
    
    if (attachment.entityId !== journalEntryId || attachment.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Delete the attachment (asset will be cascade deleted if no other attachments)
    await prisma.mediaAttachment.delete({
      where: { id: attachmentId },
    })

    // Optionally delete the file from disk
    if (attachment.asset.filePath) {
      const fullPath = path.join(getUploadsDir(), attachment.asset.filePath)
      if (existsSync(fullPath)) {
        try {
          await unlink(fullPath)
        } catch (fileErr) {
          console.error('Failed to delete audio file:', fileErr)
        }
      }
    }

    // Delete the asset if no other attachments reference it
    const otherAttachments = await prisma.mediaAttachment.count({
      where: { assetId: attachment.assetId },
    })
    
    if (otherAttachments === 0) {
      await prisma.mediaAsset.delete({
        where: { id: attachment.assetId },
      })
    }

    return NextResponse.json({ ok: true })

  } catch (err) {
    console.error('DELETE /api/journal-entries/[id]/audio failed:', err)
    return NextResponse.json({
      error: 'Internal Server Error',
      details: err instanceof Error ? err.message : String(err),
    }, { status: 500 })
  }
}
