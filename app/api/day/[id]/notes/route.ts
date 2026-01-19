import { NextRequest, NextResponse } from 'next/server'
import { getPrisma } from '@/lib/core/prisma'
import { findMentionsInText, createMentionInteractions } from '@/lib/utils/mentions'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Mapping old NoteTypes to JournalEntryType codes
const NoteTypes = ['MEAL', 'REFLECTION', 'DIARY'] as const
export type NoteType = typeof NoteTypes[number]
const NoteTypeToCode: Record<string, string> = {
  'MEAL': 'meal',
  'REFLECTION': 'daily_reflection',
  'DIARY': 'diary'
}
const CodeToNoteType: Record<string, string> = {
  'meal': 'MEAL',
  'daily_reflection': 'REFLECTION',
  'diary': 'DIARY'
}

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const prisma = getPrisma()
  
  // Load DayEntry with TimeBox
  const day = await prisma.dayEntry.findUnique({ 
    where: { id },
    include: { timeBox: true }
  })
  if (!day) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!day.timeBoxId) return NextResponse.json({ error: 'Day has no TimeBox' }, { status: 400 })

  const body = await req.json().catch(() => ({}))
  const type = String(body?.type || '') as NoteType
  const text = String(body?.text || '').trim()
  const title = body?.title ? String(body.title).trim() : null
  const audioFileId = body?.audioFileId ?? null
  const originalTranscript = body?.originalTranscript ? String(body.originalTranscript).trim() : null
  const ocrAssetIds: string[] = Array.isArray(body?.ocrAssetIds) ? body.ocrAssetIds : []
  const occurredAt = body?.occurredAt ? new Date(body.occurredAt) : new Date()
  const capturedAt = body?.capturedAt ? new Date(body.capturedAt) : new Date()
  
  if (!NoteTypes.includes(type)) return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
  if (!text) return NextResponse.json({ error: 'Text required' }, { status: 400 })

  // Find JournalEntryType by code
  const typeCode = NoteTypeToCode[type] || 'diary'
  let entryType = await prisma.journalEntryType.findFirst({ 
    where: { code: typeCode, userId: null } 
  })
  if (!entryType) {
    // Create if not exists
    entryType = await prisma.journalEntryType.create({
      data: { code: typeCode, name: type, userId: null }
    })
  }

  // Create JournalEntry with timestamp fields
  const entry = await prisma.journalEntry.create({
    data: {
      userId: day.userId,
      typeId: entryType.id,
      timeBoxId: day.timeBoxId,
      title,
      content: text,
      originalTranscript,
      occurredAt,
      capturedAt,
    },
  })

  // Create Entity registry entry
  await prisma.entity.create({
    data: {
      id: entry.id,
      userId: day.userId,
      type: 'JOURNAL_ENTRY',
    }
  })

  // If audioFileId provided, create MediaAttachment
  if (audioFileId) {
    await prisma.mediaAttachment.create({
      data: {
        assetId: audioFileId,
        entityId: entry.id,
        userId: day.userId,
        role: 'ATTACHMENT',
        timeBoxId: day.timeBoxId,
      }
    })
  }

  // If ocrAssetIds provided, create MediaAttachments with role SOURCE
  if (ocrAssetIds.length > 0) {
    for (const assetId of ocrAssetIds) {
      await prisma.mediaAttachment.create({
        data: {
          assetId,
          entityId: entry.id,
          userId: day.userId,
          role: 'SOURCE',
          timeBoxId: day.timeBoxId,
        }
      })
    }
  }

  // Automatically detect and create mentions
  // Use the TimeBox's startAt date as the occurrence date, not entry.createdAt
  try {
    const mentions = await findMentionsInText(day.userId, text)
    if (mentions.length > 0 && day.timeBox) {
      await createMentionInteractions(
        day.userId,
        entry.id,
        mentions.map(m => m.contactId),
        day.timeBox.startAt,
        day.timeBoxId
      )
    }
  } catch (mentionError) {
    console.error('Error processing mentions:', mentionError)
  }

  // Load all journal entries for this day
  const notes = await loadNotesForTimeBox(day.timeBoxId, day.id)
  return NextResponse.json({ ok: true, note: { id: entry.id }, notes })
}

async function loadNotesForTimeBox(timeBoxId: string, dayId: string) {
  const prisma = getPrisma()
  
  const journalRows = await prisma.journalEntry.findMany({
    where: { timeBoxId, deletedAt: null },
    orderBy: { occurredAt: 'asc' },
    include: { type: true },
  })
  
  // Load MediaAttachments
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
    // Only include images that are ATTACHMENT or GALLERY, not SOURCE (OCR sources)
    // Also exclude images in ocr/ folder as fallback
    const photoAtts = entryAttachments.filter(a => {
      if (!a.asset.mimeType?.startsWith('image/')) return false
      // Exclude OCR sources by role
      if (a.role === 'SOURCE') return false
      // Fallback: exclude by path pattern
      if (a.asset.filePath?.startsWith('ocr/')) return false
      return true
    })
    
    // Use occurredAt for display time, fallback to createdAt
    const displayTime = j.occurredAt ?? j.createdAt
    
    return {
      id: j.id,
      dayId,
      type: CodeToNoteType[j.type.code] || 'DIARY',
      title: j.title ?? null,
      time: displayTime?.toISOString().slice(11, 16),
      techTime: displayTime?.toISOString().slice(11, 16),
      occurredAtIso: (j.occurredAt ?? j.createdAt)?.toISOString(),
      capturedAtIso: (j.capturedAt ?? j.createdAt)?.toISOString(),
      createdAtIso: j.createdAt?.toISOString(),
      audioCapturedAtIso: audioAtt?.asset.capturedAt?.toISOString() ?? null,
      audioUploadedAtIso: audioAtt?.asset.createdAt?.toISOString() ?? null,
      text: j.content ?? '',
      originalTranscript: j.originalTranscript ?? null,
      audioFilePath: audioAtt?.asset.filePath ?? null,
      audioFileId: audioAtt?.asset.id ?? null,
      keepAudio: true,
      photos: photoAtts.map((p) => ({ 
        id: p.asset.id, 
        url: p.asset.filePath ? `/uploads/${p.asset.filePath}` : '' 
      })),
    }
  })
}
