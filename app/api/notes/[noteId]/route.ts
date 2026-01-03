import { NextRequest, NextResponse } from 'next/server'
import { getPrisma } from '@/lib/prisma'
import path from 'path'
import fs from 'fs/promises'
import { findMentionsInText, createMentionInteractions } from '@/lib/mentions'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const CodeToNoteType: Record<string, string> = {
  'meal': 'MEAL',
  'daily_reflection': 'REFLECTION',
  'diary': 'DIARY'
}

const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(process.cwd(), 'uploads')

function resolveFilePath(filePath: string | null | undefined): string | null {
  if (!filePath) return null
  const abs = path.join(UPLOADS_DIR, filePath.replace(/^\/+uploads\//, ''))
  const normalized = path.normalize(abs)
  if (!normalized.startsWith(path.normalize(UPLOADS_DIR))) return null
  return normalized
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ noteId: string }> }) {
  const { noteId } = await context.params
  const prisma = getPrisma()
  const body = await req.json().catch(() => ({} as any))

  const cookieUserId = req.cookies.get('userId')?.value
  let user = cookieUserId ? await prisma.user.findUnique({ where: { id: cookieUserId } }) : null
  if (!user) user = await prisma.user.findUnique({ where: { username: 'demo' } })
  if (!user) return NextResponse.json({ error: 'No user' }, { status: 401 })

  // JournalEntry replaces DayNote
  const entry = await prisma.journalEntry.findUnique({ 
    where: { id: noteId },
    include: { timeBox: true }
  })
  if (!entry) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (entry.userId !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const data: { title?: string | null; content?: string; contentUpdatedAt?: Date; aiSummary?: string | null } = {}
  if (typeof body.title === 'string') data.title = String(body.title).trim() || null
  if (typeof body.text === 'string') {
    data.content = String(body.text).trim()
    data.contentUpdatedAt = new Date()
  }
  if (body.aiSummary !== undefined) {
    data.aiSummary = body.aiSummary === null ? null : String(body.aiSummary).trim()
  }

  // Handle audio deletion via MediaAttachment
  if (body.audioFilePath === null || body.audioFileId === null) {
    const audioAttachment = await prisma.mediaAttachment.findFirst({
      where: { entityId: noteId },
      include: { asset: true }
    })
    if (audioAttachment?.asset.mimeType?.startsWith('audio/')) {
      const audioPath = resolveFilePath(audioAttachment.asset.filePath)
      if (audioPath) {
        try { await fs.unlink(audioPath) } catch (err: any) {
          if (err?.code !== 'ENOENT') console.warn('Failed to delete audio', err)
        }
      }
      await prisma.mediaAttachment.delete({ where: { id: audioAttachment.id } })
      await prisma.mediaAsset.delete({ where: { id: audioAttachment.assetId } })
    }
  }

  if (Object.keys(data).length > 0) {
    await prisma.journalEntry.update({ where: { id: noteId }, data })
    
    // Automatically detect and create mentions when content is updated
    if (data.content) {
      try {
        const mentions = await findMentionsInText(user.id, data.content)
        if (mentions.length > 0) {
          await createMentionInteractions(
            user.id,
            noteId,
            mentions.map(m => m.contactId),
            entry.timeBox.startAt,
            entry.timeBoxId
          )
        }
      } catch (mentionError) {
        console.error('Error processing mentions:', mentionError)
      }
    }
  }

  const notes = await loadNotesForTimeBox(entry.timeBoxId, entry.userId)
  return NextResponse.json({ ok: true, note: { id: noteId }, notes })
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ noteId: string }> }) {
  const { noteId } = await context.params
  const prisma = getPrisma()

  const cookieUserId = req.cookies.get('userId')?.value
  let user = cookieUserId ? await prisma.user.findUnique({ where: { id: cookieUserId } }) : null
  if (!user) user = await prisma.user.findUnique({ where: { username: 'demo' } })
  if (!user) return NextResponse.json({ error: 'No user' }, { status: 401 })

  const entry = await prisma.journalEntry.findUnique({ where: { id: noteId } })
  if (!entry) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (entry.userId !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Delete associated media attachments and their files
  const attachments = await prisma.mediaAttachment.findMany({
    where: { entityId: noteId },
    include: { asset: true }
  })
  for (const att of attachments) {
    const filePath = resolveFilePath(att.asset.filePath)
    if (filePath) {
      try { await fs.unlink(filePath) } catch (err: any) {
        if (err?.code !== 'ENOENT') console.warn('Failed to delete file', err)
      }
    }
    await prisma.mediaAttachment.delete({ where: { id: att.id } })
    await prisma.mediaAsset.delete({ where: { id: att.assetId } })
  }

  // Delete Entity registry entry
  await prisma.entity.deleteMany({ where: { id: noteId } })

  // Delete JournalEntry
  await prisma.journalEntry.delete({ where: { id: noteId } })

  const notes = await loadNotesForTimeBox(entry.timeBoxId, entry.userId)
  return NextResponse.json({ ok: true, deleted: noteId, notes })
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
    const audioAtt = entryAttachments.find(a => a.asset.mimeType?.startsWith('audio/'))
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
      originalTranscript: j.originalTranscript ?? null,
      aiSummary: j.aiSummary ?? null,
      analysis: j.analysis ?? null,
      contentUpdatedAt: j.contentUpdatedAt?.toISOString() ?? null,
      audioFilePath: audioAtt?.asset.filePath ?? null,
      audioFileId: audioAtt?.asset.id ?? null,
      keepAudio: true,
      photos: photoAtts.map((p) => ({ id: p.asset.id, url: p.asset.filePath || '' })),
    }
  })
}
