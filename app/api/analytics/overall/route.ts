import { NextRequest, NextResponse } from 'next/server'
import { getPrisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const _SYMPTOMS = [
  'BESCHWERDEFREIHEIT',
  'ENERGIE',
  'STIMMUNG',
  'SCHLAF',
  'ENTSPANNUNG',
  'HEISSHUNGERFREIHEIT',
  'BEWEGUNG',
] as const

type SymptomKey = typeof _SYMPTOMS[number]

function _toYmd(d: Date): string {
  const dt = new Date(d)
  const y = dt.getFullYear()
  const m = String(dt.getMonth() + 1).padStart(2, '0')
  const day = String(dt.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export async function GET(req: NextRequest) {
  try {
    const prisma = getPrisma()
    // Resolve user from cookie; fallback to demo; if still missing, return consistent empty shapes
    const cookieUserId = req.cookies.get('userId')?.value
    let user = cookieUserId
      ? await prisma.user.findUnique({ where: { id: cookieUserId } })
      : null
    if (!user) user = await prisma.user.findUnique({ where: { username: 'demo' } })
    if (!user) {
      const emptySymptoms = {
        BESCHWERDEFREIHEIT: [],
        ENERGIE: [],
        STIMMUNG: [],
        SCHLAF: [],
        ENTSPANNUNG: [],
        HEISSHUNGERFREIHEIT: [],
        BEWEGUNG: [],
      }
      return NextResponse.json({ dates: [], wellBeingIndex: [], stool: [], habitFulfillment: [], markers: [], symptoms: emptySymptoms })
    }

    // Load TimeBoxes with data (new schema)
    const timeBoxes = await prisma.timeBox.findMany({
      where: { userId: user.id, kind: 'DAY', localDate: { not: null } },
      select: { id: true, localDate: true },
      orderBy: { localDate: 'asc' },
    })
    const dates = timeBoxes.filter(tb => tb.localDate).map((tb) => tb.localDate as string)
    const timeBoxIds = timeBoxes.map((tb) => tb.id)

    // Load habit check-ins
    const [checkIns, activeHabitsCount] = await Promise.all([
      timeBoxIds.length
        ? prisma.habitCheckIn.findMany({ where: { timeBoxId: { in: timeBoxIds }, status: 'DONE' }, select: { timeBoxId: true } })
        : Promise.resolve([]),
      prisma.habit.count({ where: { userId: user.id, isActive: true } }),
    ])

    const dayKeyById = new Map<string, string>()
    const dayIdByKey = new Map<string, string>()
    for (const tb of timeBoxes) {
      if (tb.localDate) {
        dayKeyById.set(tb.id, tb.localDate)
        dayIdByKey.set(tb.localDate, tb.id)
      }
    }

    const doneByTimeBoxId = new Map<string, number>()
    for (const ci of checkIns) doneByTimeBoxId.set(ci.timeBoxId, (doneByTimeBoxId.get(ci.timeBoxId) || 0) + 1)

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
    const symptomMetrics = await prisma.metricDefinition.findMany({
      where: { code: { in: SYSTEM_SYMPTOM_CODES }, userId: null }
    })
    const symptomMetricIds = symptomMetrics.map(m => m.id)
    const symptomMeasurements = timeBoxIds.length > 0
      ? await prisma.measurement.findMany({
          where: { metricId: { in: symptomMetricIds }, timeBoxId: { in: timeBoxIds }, userId: user.id },
          include: { metric: true }
        })
      : []
    
    // Build symptom data map: timeBoxId -> { KEY: value }
    const symptomByTimeBox = new Map<string, Record<string, number>>()
    for (const m of symptomMeasurements) {
      const tbId = m.timeBoxId
      if (m.metric && m.valueNum !== null && tbId) {
        const key = m.metric.code.replace('symptom_', '').toUpperCase()
        const existing = symptomByTimeBox.get(tbId) || {}
        existing[key] = m.valueNum
        symptomByTimeBox.set(tbId, existing)
      }
    }
    
    const symptomSeries: Record<SymptomKey, (number | null)[]> = {
      BESCHWERDEFREIHEIT: dates.map(k => { const tb = dayIdByKey.get(k); return tb ? (symptomByTimeBox.get(tb)?.BESCHWERDEFREIHEIT ?? null) : null }),
      ENERGIE: dates.map(k => { const tb = dayIdByKey.get(k); return tb ? (symptomByTimeBox.get(tb)?.ENERGIE ?? null) : null }),
      STIMMUNG: dates.map(k => { const tb = dayIdByKey.get(k); return tb ? (symptomByTimeBox.get(tb)?.STIMMUNG ?? null) : null }),
      SCHLAF: dates.map(k => { const tb = dayIdByKey.get(k); return tb ? (symptomByTimeBox.get(tb)?.SCHLAF ?? null) : null }),
      ENTSPANNUNG: dates.map(k => { const tb = dayIdByKey.get(k); return tb ? (symptomByTimeBox.get(tb)?.ENTSPANNUNG ?? null) : null }),
      HEISSHUNGERFREIHEIT: dates.map(k => { const tb = dayIdByKey.get(k); return tb ? (symptomByTimeBox.get(tb)?.HEISSHUNGERFREIHEIT ?? null) : null }),
      BEWEGUNG: dates.map(k => { const tb = dayIdByKey.get(k); return tb ? (symptomByTimeBox.get(tb)?.BEWEGUNG ?? null) : null }),
    }
    
    // Load stool from Measurement
    const stoolMetric = await prisma.metricDefinition.findFirst({
      where: { code: 'bristol_stool', userId: null }
    })
    const stoolMeasurements = stoolMetric && timeBoxIds.length > 0
      ? await prisma.measurement.findMany({
          where: { metricId: stoolMetric.id, timeBoxId: { in: timeBoxIds }, userId: user.id }
        })
      : []
    const stoolByTimeBox = new Map<string, number>()
    for (const m of stoolMeasurements) {
      if (m.timeBoxId && m.valueNum !== null) {
        stoolByTimeBox.set(m.timeBoxId, m.valueNum)
      }
    }
    const stool: (number | null)[] = dates.map(k => {
      const tb = dayIdByKey.get(k)
      return tb ? (stoolByTimeBox.get(tb) ?? null) : null
    })
    
    // Calculate wellBeingIndex as average of all symptoms
    const wellBeingIndex: (number | null)[] = dates.map(k => {
      const tb = dayIdByKey.get(k)
      if (!tb) return null
      const data = symptomByTimeBox.get(tb)
      if (!data) return null
      const vals = Object.values(data).filter(v => typeof v === 'number')
      if (vals.length === 0) return null
      return Number((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1))
    })
    
    // Load custom/user symptoms
    const userMetrics = await prisma.metricDefinition.findMany({
      where: { userId: user.id, category: 'user_symptom' }
    })
    const userMetricIds = userMetrics.map(m => m.id)
    const userSymptomMeasurements = userMetricIds.length > 0 && timeBoxIds.length > 0
      ? await prisma.measurement.findMany({
          where: { metricId: { in: userMetricIds }, timeBoxId: { in: timeBoxIds }, userId: user.id }
        })
      : []
    const customByTimeBox = new Map<string, Map<string, number>>()
    for (const m of userSymptomMeasurements) {
      if (m.timeBoxId && m.valueNum !== null) {
        const inner = customByTimeBox.get(m.timeBoxId) || new Map()
        inner.set(m.metricId, m.valueNum)
        customByTimeBox.set(m.timeBoxId, inner)
      }
    }
    const customDefs = userMetrics.map(m => ({ id: m.id, title: m.name }))
    const customSeries: Record<string, (number | null)[]> = {}
    for (const metric of userMetrics) {
      customSeries[metric.id] = dates.map(k => {
        const tb = dayIdByKey.get(k)
        if (!tb) return null
        return customByTimeBox.get(tb)?.get(metric.id) ?? null
      })
    }

    // Habit fulfillment series
    const habitFulfillment: (number | null)[] = dates.map((key) => {
      const tbId = dayIdByKey.get(key)
      if (activeHabitsCount > 0 && tbId) {
        const done = doneByTimeBoxId.get(tbId) || 0
        return Number((done / activeHabitsCount).toFixed(3))
      }
      return null
    })

    // Reflections not migrated
    const markers: { id: string; date: string; kind: string }[] = []

    const payload = {
      dates,
      wellBeingIndex,
      stool,
      habitFulfillment,
      markers,
      symptoms: symptomSeries,
      customSymptoms: {
        defs: customDefs,
        series: customSeries,
      },
    }
    const res = NextResponse.json(payload)
    res.headers.set('Cache-Control', 'no-store')
    return res
  } catch (err) {
    console.error('GET /api/analytics/overall failed', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
