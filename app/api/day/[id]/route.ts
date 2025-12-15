import { NextRequest, NextResponse } from 'next/server'
import { getPrisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const prisma = getPrisma()
  const body = await req.json().catch(() => ({}))

  const day = await prisma.dayEntry.findUnique({ where: { id } })
  if (!day) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Update dayRating or aiSummary if provided
  const data: { dayRating?: number | null; aiSummary?: string | null } = {}
  if (typeof body.dayRating !== 'undefined') data.dayRating = body.dayRating
  if (typeof body.aiSummary !== 'undefined') data.aiSummary = body.aiSummary

  if (Object.keys(data).length > 0) {
    await prisma.dayEntry.update({ where: { id }, data })
  }

  const payload = await buildDayPayload(id)
  return NextResponse.json({ day: payload })
}

export async function DELETE(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const prisma = getPrisma()
  const day = await prisma.dayEntry.findUnique({ 
    where: { id },
    include: { timeBox: true }
  })
  if (!day) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Delete journal entries for this day's timeBox
  if (day.timeBoxId) {
    await prisma.journalEntry.deleteMany({ where: { timeBoxId: day.timeBoxId } })
    await prisma.habitCheckIn.deleteMany({ where: { timeBoxId: day.timeBoxId } })
    await prisma.measurement.deleteMany({ where: { timeBoxId: day.timeBoxId } })
  }

  // Reset day entry fields
  await prisma.dayEntry.update({
    where: { id },
    data: { dayRating: null, aiSummary: null }
  })

  const payload = await buildDayPayload(day.id)
  return NextResponse.json({ day: payload })
}

const SYSTEM_SYMPTOM_CODES = [
  'symptom_beschwerdefreiheit',
  'symptom_energie',
  'symptom_stimmung',
  'symptom_schlaf',
  'symptom_entspannung',
  'symptom_heisshungerfreiheit',
  'symptom_bewegung',
]

async function buildDayPayload(dayId: string) {
  const prisma = getPrisma()
  const day = await prisma.dayEntry.findUnique({ 
    where: { id: dayId },
    include: { timeBox: true }
  })
  if (!day) throw new Error('Day not found after update')
  
  const dateStr = day.timeBox?.localDate ?? toYmd(new Date())
  
  // Load habits
  const habits = await prisma.habit.findMany({ 
    where: { userId: day.userId, isActive: true }, 
    orderBy: { sortOrder: 'asc' }, 
    select: { id: true, title: true } 
  })
  
  // Load habit check-ins
  const checkIns = day.timeBoxId 
    ? await prisma.habitCheckIn.findMany({ where: { timeBoxId: day.timeBoxId } })
    : []
  const ticks = habits.map((h) => ({ 
    habitId: h.id, 
    checked: checkIns.some(ci => ci.habitId === h.id && ci.status === 'DONE') 
  }))
  
  // Load symptoms from Measurement
  const symptoms: Record<string, number | undefined> = {}
  if (day.timeBoxId) {
    const symptomMetrics = await prisma.metricDefinition.findMany({
      where: { code: { in: SYSTEM_SYMPTOM_CODES }, userId: null }
    })
    const metricIds = symptomMetrics.map(m => m.id)
    const measurements = await prisma.measurement.findMany({
      where: { metricId: { in: metricIds }, timeBoxId: day.timeBoxId, userId: day.userId },
      include: { metric: true }
    })
    for (const m of measurements) {
      if (m.metric && m.valueNum !== null) {
        const key = m.metric.code.replace('symptom_', '').toUpperCase()
        symptoms[key] = m.valueNum
      }
    }
  }
  
  // Load stool from Measurement
  let stool: number | undefined
  if (day.timeBoxId) {
    const stoolMetric = await prisma.metricDefinition.findFirst({
      where: { code: 'bristol_stool', userId: null }
    })
    if (stoolMetric) {
      const stoolM = await prisma.measurement.findFirst({
        where: { metricId: stoolMetric.id, timeBoxId: day.timeBoxId, userId: day.userId }
      })
      stool = stoolM?.valueNum ?? undefined
    }
  }
  
  // Load user symptoms
  const userSymptomsOut: { id: string; title: string; score?: number }[] = []
  if (day.timeBoxId) {
    const userMetrics = await prisma.metricDefinition.findMany({
      where: { userId: day.userId, category: 'user_symptom' }
    })
    for (const metric of userMetrics) {
      const m = await prisma.measurement.findFirst({
        where: { metricId: metric.id, timeBoxId: day.timeBoxId, userId: day.userId }
      })
      userSymptomsOut.push({
        id: metric.id,
        title: metric.name,
        score: m?.valueNum ?? undefined
      })
    }
  }
  
  return { 
    id: day.id, 
    date: dateStr, 
    timeBoxId: day.timeBoxId,
    symptoms, 
    stool, 
    habitTicks: ticks, 
    userSymptoms: userSymptomsOut,
    dayRating: day.dayRating,
    aiSummary: day.aiSummary
  }
}

function toYmd(d: Date) {
  const dt = new Date(d)
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
}

// Unused export for backwards compatibility
export type Phase = 'PHASE_1' | 'PHASE_2' | 'PHASE_3'
export type CareCategory = 'SANFT' | 'MEDIUM' | 'INTENSIV'
