import { NextRequest, NextResponse } from 'next/server'
import { getPrisma } from '@/lib/core/prisma'
import { findMentionsInText, createMentionInteractions } from '@/lib/utils/mentions'
import { getJournalEntryAccessService } from '@/lib/services/journalEntryAccessService'

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
  // Support both single audioFileId (legacy) and multiple audioFileIds (new)
  const audioFileIds: string[] = Array.isArray(body?.audioFileIds) 
    ? body.audioFileIds 
    : (body?.audioFileId ? [body.audioFileId] : [])
  const audioTranscriptsRaw: any[] = Array.isArray(body?.audioTranscripts) ? body.audioTranscripts : []
  const audioTranscriptByAssetId = new Map<string, { transcript: string | null; transcriptModel: string | null }>()
  for (const t of audioTranscriptsRaw) {
    const assetId = typeof t?.assetId === 'string'
      ? String(t.assetId)
      : (typeof t?.audioFileId === 'string' ? String(t.audioFileId) : null)
    const transcript = typeof t?.transcript === 'string'
      ? String(t.transcript).trim()
      : (typeof t?.text === 'string' ? String(t.text).trim() : null)
    const transcriptModel = typeof t?.transcriptModel === 'string'
      ? String(t.transcriptModel).trim()
      : (typeof t?.model === 'string' ? String(t.model).trim() : null)

    if (assetId) {
      audioTranscriptByAssetId.set(assetId, {
        transcript: transcript || null,
        transcriptModel: transcriptModel || null,
      })
    }
  }

  const firstAudioId = audioFileIds[0] ?? null
  const firstAudioTranscript = firstAudioId ? audioTranscriptByAssetId.get(firstAudioId)?.transcript ?? null : null
  const firstAudioTranscriptModel = firstAudioId ? audioTranscriptByAssetId.get(firstAudioId)?.transcriptModel ?? null : null

  const originalTranscript = body?.originalTranscript
    ? String(body.originalTranscript).trim()
    : firstAudioTranscript
  const originalTranscriptModel = body?.originalTranscriptModel
    ? String(body.originalTranscriptModel).trim()
    : firstAudioTranscriptModel
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
      originalTranscriptModel,
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

  // Create MediaAttachments for all audio files
  // First audio gets the originalTranscript for backward compatibility
  for (let i = 0; i < audioFileIds.length; i++) {
    const assetId = audioFileIds[i]
    // First audio attachment gets the transcript from the request (legacy support)
    // Additional audios already have their transcripts stored on their MediaAttachment
    // when they were created via /api/journal-entries/[id]/audio
    const isFirst = i === 0
    const tr = audioTranscriptByAssetId.get(assetId) || null
    await prisma.mediaAttachment.create({
      data: {
        assetId,
        entityId: entry.id,
        userId: day.userId,
        role: 'ATTACHMENT',
        timeBoxId: day.timeBoxId,
        transcript: tr?.transcript ?? (isFirst ? originalTranscript : null),
        transcriptModel: tr?.transcriptModel ?? (isFirst ? originalTranscriptModel : null),
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

  // Apply default sharing rules (auto-share with configured partners)
  try {
    const accessService = getJournalEntryAccessService()
    await accessService.applyDefaultSharingOnCreate(entry.id, day.userId, entryType.id)
  } catch (shareError) {
    console.error('Error applying default sharing:', shareError)
  }

  // Load all journal entries for this day (only owned by this user)
  const notes = await loadNotesForTimeBox(day.timeBoxId, day.userId, day.id)
  return NextResponse.json({ ok: true, note: { id: entry.id }, notes })
}

async function loadNotesForTimeBox(timeBoxId: string, userId: string, dayId: string) {
  const prisma = getPrisma()
  
  // Load entries owned by the requesting user
  const ownedRows = await prisma.journalEntry.findMany({
    where: { timeBoxId, userId, deletedAt: null },
    orderBy: { occurredAt: 'asc' },
    include: { type: true, user: { select: { id: true, displayName: true, username: true } } },
  })
  
  // Load shared entries for this timeBox
  const sharedGrants = await prisma.journalEntryAccess.findMany({
    where: {
      userId,
      journalEntry: { timeBoxId, deletedAt: null },
    },
    include: {
      journalEntry: {
        include: { type: true, user: { select: { id: true, displayName: true, username: true } } },
      },
    },
  })
  
  // Combine owned and shared entries
  const sharedRows = sharedGrants.map(g => ({
    ...g.journalEntry,
    sharedStatus: g.role === 'EDITOR' ? 'shared-edit' as const : 'shared-view' as const,
    accessRole: g.role,
  }))
  
  // Merge and deduplicate (owned entries take precedence)
  const ownedIds = new Set(ownedRows.map(r => r.id))
  const journalRows = [
    ...ownedRows.map(r => ({ ...r, sharedStatus: 'owned' as const, accessRole: null as null })),
    ...sharedRows.filter(r => !ownedIds.has(r.id)),
  ].sort((a, b) => (a.occurredAt?.getTime() ?? 0) - (b.occurredAt?.getTime() ?? 0))
  
  // Count access grants for owned entries (for sharedWithCount badge)
  const ownedEntryIds = ownedRows.map(r => r.id)
  const accessCounts = ownedEntryIds.length > 0
    ? await prisma.journalEntryAccess.groupBy({
        by: ['journalEntryId'],
        where: { journalEntryId: { in: ownedEntryIds } },
        _count: { id: true },
      })
    : []
  const accessCountByEntry = new Map(accessCounts.map(ac => [ac.journalEntryId, ac._count.id]))
  
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
    // Get all audio attachments for multi-audio support
    const audioAtts = entryAttachments.filter(a => a.asset.mimeType?.startsWith('audio/'))
    const audioAtt = audioAtts[0] // Primary audio for backward compatibility
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
    
    // Build audio attachments array for multi-audio support
    const audioAttachments = audioAtts.map(a => ({
      id: a.id,
      assetId: a.asset.id,
      filePath: a.asset.filePath,
      duration: a.asset.duration,
      transcript: a.transcript ?? null,
      transcriptModel: a.transcriptModel ?? null,
      capturedAt: a.asset.capturedAt?.toISOString() ?? null,
      createdAt: a.createdAt?.toISOString() ?? null,
    }))
    
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
      // Backward compatibility: use first audio attachment transcript or fallback to JournalEntry
      originalTranscript: audioAtt 
        ? (audioAtt.transcript ?? j.originalTranscript ?? null)
        : (j.originalTranscript ?? null),
      originalTranscriptModel: audioAtt
        ? (audioAtt.transcriptModel ?? j.originalTranscriptModel ?? null)
        : (j.originalTranscriptModel ?? null),
      audioFilePath: audioAtt?.asset.filePath ?? null,
      audioFileId: audioAtt?.asset.id ?? null,
      keepAudio: true,
      // New: all audio attachments for multi-audio UI
      audioAttachments,
      photos: photoAtts.map((p) => ({ 
        id: p.asset.id, 
        url: p.asset.filePath ? `/uploads/${p.asset.filePath}` : '' 
      })),
      // Sharing information
      sharedStatus: j.sharedStatus,
      ownerUserId: j.userId,
      ownerName: j.sharedStatus !== 'owned' ? (j.user?.displayName || j.user?.username || null) : null,
      accessRole: j.accessRole,
      sharedWithCount: j.sharedStatus === 'owned' ? (accessCountByEntry.get(j.id) || 0) : 0,
    }
  })
}
