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
    orderBy: { createdAt: 'asc' },
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
    const photoAtts = entryAttachments.filter(a => a.asset.mimeType?.startsWith('image/'))
    
    return {
      id: j.id,
      dayId: day.id,
      type: CodeToNoteType[j.type.code] || 'DIARY',
      title: j.title ?? null,
      time: j.createdAt?.toISOString().slice(11, 16),
      techTime: j.createdAt?.toISOString().slice(11, 16),
      occurredAtIso: j.createdAt?.toISOString(),
      createdAtIso: j.createdAt?.toISOString(),
      text: j.content ?? '',
      originalTranscript: j.originalTranscript ?? null,
      audioFilePath: audioAtt?.asset.filePath ?? null,
      audioFileId: audioAtt?.asset.id ?? null,
      keepAudio: true,
      photos: photoAtts.map((p) => ({ id: p.asset.id, url: p.asset.filePath || '' })),
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
