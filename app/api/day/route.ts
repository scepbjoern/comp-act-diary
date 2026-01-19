import { NextRequest, NextResponse } from 'next/server'
import { getPrisma } from '@/lib/prisma'
import { DEFAULT_HABIT_ICONS, DEFAULT_SYMPTOM_ICONS } from '@/lib/default-icons'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Local enums für JournalEntry-Typen (Mapping zu alten NoteTypes)
const _NoteTypeToCode: Record<string, string> = {
  'MEAL': 'meal',
  'REFLECTION': 'daily_reflection', 
  'DIARY': 'diary'
}
const CodeToNoteType: Record<string, string> = {
  'meal': 'MEAL',
  'daily_reflection': 'REFLECTION',
  'diary': 'DIARY'
}

export async function GET(req: NextRequest) {
  const prisma = getPrisma()
  const { searchParams } = new URL(req.url)
  const dateStr = searchParams.get('date') ?? toYmdLocal(new Date())

  // Resolve user by cookie; fallback to demo user
  const cookieUserId = req.cookies.get('userId')?.value
  let user = cookieUserId
    ? await prisma.user.findUnique({ where: { id: cookieUserId } })
    : null
  if (!user) {
    user = await prisma.user.findUnique({ where: { username: 'demo' } })
    if (!user) return NextResponse.json({ error: 'No user' }, { status: 401 })
  }

  // Find or create TimeBox for this date
  let timeBox = await prisma.timeBox.findFirst({ 
    where: { userId: user.id, kind: 'DAY', localDate: dateStr } 
  })
  if (!timeBox) {
    const { start, end } = getDayRange(dateStr)
    timeBox = await prisma.timeBox.create({
      data: {
        userId: user.id,
        kind: 'DAY',
        startAt: start,
        endAt: end,
        timezone: 'Europe/Zurich',
        localDate: dateStr,
      },
    })
  }

  // Find or create DayEntry linked to TimeBox
  let day = await prisma.dayEntry.findFirst({ 
    where: { userId: user.id, timeBoxId: timeBox.id } 
  })
  if (!day) {
    day = await prisma.dayEntry.create({
      data: {
        userId: user.id,
        timeBoxId: timeBox.id,
      },
    })
  }

  // Load habits for this user
  const _habits = await prisma.habit.findMany({
    where: { userId: user.id, isActive: true },
    orderBy: { sortOrder: 'asc' },
    select: { id: true, title: true, userId: true, icon: true },
  })
  const habits = _habits.map((h) => ({
    id: h.id,
    title: h.title,
    userId: h.userId,
    icon: h.icon ?? DEFAULT_HABIT_ICONS[h.title] ?? null
  }))

  // Load habit check-ins (replaces habitTick)
  const checkInRows = await prisma.habitCheckIn.findMany({ 
    where: { timeBoxId: timeBox.id } 
  })
  const ticks = habits.map((h) => {
    const ci = checkInRows.find((x) => x.habitId === h.id)
    return { habitId: h.id, checked: ci?.status === 'DONE' }
  })

  // Load JournalEntries (replaces DayNote)
  const journalRows = await prisma.journalEntry.findMany({
    where: { timeBoxId: timeBox.id, deletedAt: null },
    orderBy: { occurredAt: 'asc' },
    include: { type: true },
  })
  
  // Load MediaAttachments for journal entries
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

  // Map JournalEntry to old DayNote format for API compatibility
  const notes = journalRows.map((j) => {
    const entryAttachments = attachmentsByEntry.get(j.id) || []
    const audioAtt = entryAttachments.find(a => a.asset.mimeType?.startsWith('audio/'))
    // Only include images that are ATTACHMENT or GALLERY, not SOURCE (OCR sources)
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
      dayId: day.id,
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
      aiSummary: j.aiSummary ?? null,
      analysis: j.analysis ?? null,
      contentUpdatedAt: j.contentUpdatedAt?.toISOString() ?? null,
      audioFilePath: audioAtt?.asset.filePath ?? null,
      audioFileId: audioAtt?.asset.id ?? null,
      keepAudio: true,
      photos: photoAtts.map((p) => ({ 
        id: p.asset.id, 
        url: p.asset.filePath ? `/uploads/${p.asset.filePath}` : '' 
      })),
    }
  })

  // Load symptoms from Measurement
  const SYSTEM_SYMPTOM_CODES = [
    'symptom_beschwerdefreiheit',
    'symptom_energie',
    'symptom_stimmung',
    'symptom_schlaf',
    'symptom_entspannung',
    'symptom_heisshungerfreiheit',
    'symptom_bewegung',
  ]
  const symptoms: Record<string, number | undefined> = {}
  const symptomMetrics = await prisma.metricDefinition.findMany({
    where: { code: { in: SYSTEM_SYMPTOM_CODES }, userId: null }
  })
  const symptomMetricIds = symptomMetrics.map(m => m.id)
  const symptomMeasurements = await prisma.measurement.findMany({
    where: { metricId: { in: symptomMetricIds }, timeBoxId: timeBox.id, userId: user.id },
    include: { metric: true }
  })
  for (const m of symptomMeasurements) {
    if (m.metric && m.valueNum !== null) {
      const key = m.metric.code.replace('symptom_', '').toUpperCase()
      symptoms[key] = m.valueNum
    }
  }
  
  // Load stool from Measurement
  let stool: number | undefined
  const stoolMetric = await prisma.metricDefinition.findFirst({
    where: { code: 'bristol_stool', userId: null }
  })
  if (stoolMetric) {
    const stoolM = await prisma.measurement.findFirst({
      where: { metricId: stoolMetric.id, timeBoxId: timeBox.id, userId: user.id }
    })
    stool = stoolM?.valueNum ?? undefined
  }
  
  // Load user symptoms from Measurement
  const userSymptoms: { id: string; title: string; icon: string | null; score?: number }[] = []
  const userMetrics = await prisma.metricDefinition.findMany({
    where: { userId: user.id, category: 'user_symptom' }
  })
  for (const metric of userMetrics) {
    const m = await prisma.measurement.findFirst({
      where: { metricId: metric.id, timeBoxId: timeBox.id, userId: user.id }
    })
    userSymptoms.push({
      id: metric.id,
      title: metric.name,
      icon: metric.icon ?? null,
      score: m?.valueNum ?? undefined
    })
  }
  
  const symptomIcons: Record<string, string | null> = { ...DEFAULT_SYMPTOM_ICONS }

  // DEBUG: Load taggings, contacts, locations, measurements for this day
  const debugTaggings = await prisma.tagging.findMany({
    where: {
      userId: user.id,
      entity: {
        type: 'JOURNAL_ENTRY',
        id: { in: journalIds }
      }
    },
    include: { taxonomy: true }
  })
  
  const debugMeasurements = await prisma.measurement.findMany({
    where: { timeBoxId: timeBox.id, userId: user.id },
    include: { metric: true }
  })
  
  // Filter out system symptom measurements for debug display
  const nonSymptomMeasurements = debugMeasurements.filter(m => 
    !m.metric.code.startsWith('symptom_') && m.metric.code !== 'bristol_stool'
  )
  
  // Load LocationVisits for this day
  const debugLocationVisits = await prisma.locationVisit.findMany({
    where: { timeBoxId: timeBox.id, userId: user.id },
    include: { location: true }
  })
  
  // Load Interactions for this day to get contacts
  const debugInteractions = await prisma.interaction.findMany({
    where: { timeBoxId: timeBox.id, userId: user.id },
    include: { contact: true }
  })
  
  const debugData = {
    taggings: debugTaggings.map(t => ({
      id: t.id,
      taxonomyName: t.taxonomy.shortName,
      entityType: 'JournalEntry'
    })),
    contacts: debugInteractions.map(i => ({
      id: i.contact.id,
      name: i.contact.name
    })),
    locations: debugLocationVisits.map(lv => ({
      id: lv.location.id,
      name: lv.location.name,
      lat: lv.location.lat ?? undefined,
      lng: lv.location.lng ?? undefined
    })),
    measurements: nonSymptomMeasurements.map(m => ({
      id: m.id,
      metricName: m.metric.name,
      value: m.valueNum ?? 0,
      unit: m.metric.unit ?? undefined
    }))
  }

  const payload = {
    day: {
      id: day.id,
      date: dateStr,
      timeBoxId: timeBox.id,
      symptoms,
      stool,
      habitTicks: ticks,
      userSymptoms,
      dayRating: day.dayRating,
      aiSummary: day.aiSummary,
    },
    habits,
    notes,
    symptomIcons,
    debugData,
  }

  return NextResponse.json(payload)
}

function getDayRange(ymd: string) {
  const [y, m, d] = ymd.split('-').map((n: string) => parseInt(n, 10))
  const start = new Date(y, (m || 1) - 1, d || 1)
  const end = new Date(y, (m || 1) - 1, (d || 1) + 1)
  return { start, end }
}

function toYmdLocal(d: Date) {
  const dt = new Date(d)
  const y = dt.getFullYear()
  const m = String(dt.getMonth() + 1).padStart(2, '0')
  const day = String(dt.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
