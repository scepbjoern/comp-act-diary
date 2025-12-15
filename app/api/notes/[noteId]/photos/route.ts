import { NextRequest, NextResponse } from 'next/server'
import { getPrisma } from '@/lib/prisma'
import path from 'path'
import fs from 'fs/promises'
import { constants as fsConstants } from 'fs'
import sharp from 'sharp'
import { v4 as uuidv4 } from 'uuid'

const IMAGE_MAX_WIDTH = parseInt(process.env.IMAGE_MAX_WIDTH || '1600', 10)
const IMAGE_MAX_HEIGHT = parseInt(process.env.IMAGE_MAX_HEIGHT || '1600', 10)
const IMAGE_FORMAT = (process.env.IMAGE_FORMAT || 'webp').toLowerCase() as 'webp' | 'png' | 'jpeg'
const IMAGE_QUALITY = parseInt(process.env.IMAGE_QUALITY || '80', 10)

// Base directory for persisted uploads (mounted in Docker to survive restarts)
const UPLOADS_BASE = process.env.UPLOADS_DIR || path.join(process.cwd(), 'uploads')

function getImageFolder(targetDate: Date): { folderPath: string; relativePath: string } {
  const year = targetDate.getFullYear()
  const month = String(targetDate.getMonth() + 1).padStart(2, '0')
  const day = String(targetDate.getDate()).padStart(2, '0')
  const decade = `${Math.floor(year / 10) * 10}s`
  
  const relativePath = path.join('images', decade, String(year), month, day)
  const folderPath = path.join(UPLOADS_BASE, relativePath)
  
  return { folderPath, relativePath }
}

function generateImageFilename(targetDate: Date, extension: string = 'webp'): string {
  const year = targetDate.getFullYear()
  const month = String(targetDate.getMonth() + 1).padStart(2, '0')
  const day = String(targetDate.getDate()).padStart(2, '0')
  const hours = String(targetDate.getHours()).padStart(2, '0')
  const minutes = String(targetDate.getMinutes()).padStart(2, '0')
  const guid = uuidv4()
  
  return `${year}-${month}-${day}_${hours}-${minutes}_${guid}.${extension}`
}

export async function POST(req: NextRequest, context: { params: Promise<{ noteId: string }> }) {
  try {
    const prisma = getPrisma()
    const { noteId } = await context.params
    const cookieUserId = req.cookies.get('userId')?.value
    let user = cookieUserId ? await prisma.user.findUnique({ where: { id: cookieUserId } }) : null
    if (!user) user = await prisma.user.findUnique({ where: { username: 'demo' } })
    if (!user) return NextResponse.json({ error: 'No user' }, { status: 401 })

    // JournalEntry replaces DayNote
    const entry = await prisma.journalEntry.findUnique({ where: { id: noteId } })
    if (!entry) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (entry.userId !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const contentType = req.headers.get('content-type') || ''

    const createdPhotos: { id: string; url: string }[] = []
    if (contentType.includes('application/json')) {
      // JSON body with URL (fallback)
      const body = await req.json().catch(() => ({} as any))
      const url = String(body?.url || '').trim()
      if (!url) return NextResponse.json({ error: 'No url provided' }, { status: 400 })
      // Create MediaAsset and MediaAttachment
      const asset = await prisma.mediaAsset.create({ 
        data: { 
          userId: user.id,
          filePath: url, 
          mimeType: 'image/jpeg',
        }
      })
      await prisma.mediaAttachment.create({
        data: {
          assetId: asset.id,
          entityId: noteId,
          userId: user.id,
          role: 'ATTACHMENT',
          timeBoxId: entry.timeBoxId,
        }
      })
      createdPhotos.push({ id: asset.id, url: asset.filePath || '' })
    } else if (contentType.includes('multipart/form-data')) {
      const form = await req.formData().catch(err => {
        console.error('formData parse failed', err)
        return null as any
      })
      if (!form) return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
      const files = form.getAll('files') as unknown as File[]
      const timeStr = form.get('time') as string | null // Optional HH:MM from diary entry
      if (!files || files.length === 0) return NextResponse.json({ error: 'No files' }, { status: 400 })

      // Determine target date for folder and filename
      let targetDate: Date
      if (timeStr) {
        // Use the diary entry time
        const now = new Date()
        const [hours, minutes] = timeStr.split(':').map(Number)
        targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes)
      } else {
        // Use current time or file's timestamp
        targetDate = new Date()
      }

      const { folderPath, relativePath } = getImageFolder(targetDate)
      
      // Create directory if it doesn't exist
      await fs.mkdir(folderPath, { recursive: true })
      
      try {
        await fs.access(folderPath, fsConstants.W_OK)
      } catch {
        console.error('Upload dir not writable', { folderPath })
        return NextResponse.json({ error: 'Upload directory is not writable', folderPath }, { status: 500 })
      }

      for (const file of files) {
        if (!(file instanceof File)) continue
        try {
          const arrayBuffer = await file.arrayBuffer()
          const input = Buffer.from(arrayBuffer)

          // Use file's lastModified if available and no timeStr provided
          const fileDate = !timeStr && file.lastModified ? new Date(file.lastModified) : targetDate

          let pipeline = sharp(input).rotate()
          pipeline = pipeline.resize({ width: IMAGE_MAX_WIDTH, height: IMAGE_MAX_HEIGHT, fit: 'inside', withoutEnlargement: true })

          let extension: string
          if (IMAGE_FORMAT === 'png') {
            pipeline = pipeline.png({ quality: IMAGE_QUALITY })
            extension = 'png'
          } else if (IMAGE_FORMAT === 'jpeg') {
            pipeline = pipeline.jpeg({ quality: IMAGE_QUALITY })
            extension = 'jpg'
          } else {
            pipeline = pipeline.webp({ quality: IMAGE_QUALITY })
            extension = 'webp'
          }

          const fileName = generateImageFilename(fileDate, extension)
          const outPath = path.join(folderPath, fileName)
          await pipeline.toFile(outPath)
          const filePath = `/uploads/${relativePath.replace(/\\/g, '/')}/${fileName}`
          // Create MediaAsset and MediaAttachment
          const asset = await prisma.mediaAsset.create({ 
            data: { 
              userId: user.id,
              filePath, 
              mimeType: file.type || 'image/webp',
            }
          })
          await prisma.mediaAttachment.create({
            data: {
              assetId: asset.id,
              entityId: noteId,
              userId: user.id,
              role: 'ATTACHMENT',
              timeBoxId: entry.timeBoxId,
            }
          })
          createdPhotos.push({ id: asset.id, url: asset.filePath || '' })
        } catch (err) {
          console.error('Failed to process/upload file', err)
          return NextResponse.json({ error: 'Failed to process file' }, { status: 500 })
        }
      }
    } else {
      return NextResponse.json({ error: 'Unsupported Content-Type' }, { status: 415 })
    }

    // Return refreshed notes list for the timeBox
    const notes = await loadNotesForTimeBox(entry.timeBoxId, entry.userId)
    return NextResponse.json({ ok: true, photos: createdPhotos, notes })
  } catch (err) {
    console.error('Photo upload failed', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

const CodeToNoteType: Record<string, string> = {
  'meal': 'MEAL',
  'daily_reflection': 'REFLECTION',
  'diary': 'DIARY'
}

async function loadNotesForTimeBox(timeBoxId: string, dayId: string) {
  const prisma = getPrisma()
  
  const journalRows = await prisma.journalEntry.findMany({
    where: { timeBoxId, deletedAt: null },
    orderBy: { createdAt: 'asc' },
    include: { type: true },
  })
  
  const journalIds = journalRows.map(j => j.id)
  const attachments = journalIds.length > 0 
    ? await prisma.mediaAttachment.findMany({
        where: { entityId: { in: journalIds } },
        include: { asset: true }
      })
    : []
  const attachmentsByEntry = new Map<string, typeof attachments>()
  for (const att of attachments) {
    const list = attachmentsByEntry.get(att.entityId) || []
    list.push(att)
    attachmentsByEntry.set(att.entityId, list)
  }

  return journalRows.map((j) => {
    const entryAttachments = attachmentsByEntry.get(j.id) || []
    const photoAtts = entryAttachments.filter(a => a.asset.mimeType?.startsWith('image/'))
    
    return {
      id: j.id,
      dayId,
      type: CodeToNoteType[j.type.code] || 'DIARY',
      title: j.title ?? null,
      time: j.createdAt?.toISOString().slice(11, 16),
      techTime: j.createdAt?.toISOString().slice(11, 16),
      occurredAtIso: j.createdAt?.toISOString(),
      createdAtIso: j.createdAt?.toISOString(),
      text: j.content ?? '',
      photos: photoAtts.map((p) => ({ id: p.asset.id, url: p.asset.filePath || '' })),
    }
  })
}
