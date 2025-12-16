import { NextRequest, NextResponse } from 'next/server'
import { getPrisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Symptom enum names from Prisma schema
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

function toYmd(d: Date): string {
  const dt = new Date(d)
  const y = dt.getFullYear()
  const m = String(dt.getMonth() + 1).padStart(2, '0')
  const day = String(dt.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function fromYmd(s: string | null): Date | null {
  if (!s) return null
  const m = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/.exec(s)
  if (!m) return null
  const y = Number(m[1])
  const mo = Number(m[2]) - 1
  const d = Number(m[3])
  const dt = new Date(Date.UTC(y, mo, d))
  // Normalize to local date (strip time by constructing local date)
  return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate())
}

function startOfWeekLocal(d: Date, weekStart: 'mon' | 'sun'): Date {
  const dt = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const day = dt.getDay() // 0=Sun..6=Sat
  const offset = weekStart === 'sun' ? day : (day === 0 ? 6 : day - 1) // days since week start
  dt.setDate(dt.getDate() - offset)
  return dt
}

export async function GET(req: NextRequest) {
  try {
    const prisma = getPrisma()
    const url = new URL(req.url)
    const fromParam = url.searchParams.get('from')

    // Resolve user (cookie -> demo fallback)
    const cookieUserId = req.cookies.get('userId')?.value
    let user = cookieUserId
      ? await prisma.user.findUnique({ where: { id: cookieUserId } })
      : null
    if (!user) {
      user = await prisma.user.findUnique({ where: { username: 'demo' } })
    }
    if (!user) return NextResponse.json({ error: 'No user' }, { status: 401 })

    // Settings not available in new schema - default to Monday
    const weekStartPref: 'mon' | 'sun' = 'mon'

    let start = fromYmd(fromParam)
    if (!start) start = startOfWeekLocal(new Date(), weekStartPref)

    // Build the 7-day window
    const days: Date[] = []
    const keys: string[] = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(start)
      d.setDate(d.getDate() + i)
      days.push(d)
      keys.push(toYmd(d))
    }

    const _rangeStart = new Date(days[0])
    const rangeEndExclusive = new Date(days[6])
    rangeEndExclusive.setDate(rangeEndExclusive.getDate() + 1)

    // Load TimeBoxes in range (new schema)
    const timeBoxes = await prisma.timeBox.findMany({
      where: {
        userId: user.id,
        localDate: { gte: keys[0], lte: keys[6] },
        kind: 'DAY',
      },
      select: { id: true, localDate: true },
    })

    const dayIdByKey = new Map<string, string>()
    const dayKeyById = new Map<string, string>()
    for (const tb of timeBoxes) {
      if (tb.localDate) {
        dayIdByKey.set(tb.localDate, tb.id)
        dayKeyById.set(tb.id, tb.localDate)
      }
    }
    const timeBoxIds = timeBoxes.map((tb) => tb.id)

    // Load habit check-ins
    const [checkIns, activeHabitsCount] = await Promise.all([
      timeBoxIds.length
        ? prisma.habitCheckIn.findMany({ 
            where: { timeBoxId: { in: timeBoxIds }, status: 'DONE' }, 
            select: { timeBoxId: true } 
          })
        : Promise.resolve([]),
      prisma.habit.count({ where: { userId: user.id, isActive: true } }),
    ])

    // Map done check-ins per timeBox
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
    
    const symptoms: Record<SymptomKey, (number | null)[]> = {
      BESCHWERDEFREIHEIT: keys.map(k => { const tb = dayIdByKey.get(k); return tb ? (symptomByTimeBox.get(tb)?.BESCHWERDEFREIHEIT ?? null) : null }),
      ENERGIE: keys.map(k => { const tb = dayIdByKey.get(k); return tb ? (symptomByTimeBox.get(tb)?.ENERGIE ?? null) : null }),
      STIMMUNG: keys.map(k => { const tb = dayIdByKey.get(k); return tb ? (symptomByTimeBox.get(tb)?.STIMMUNG ?? null) : null }),
      SCHLAF: keys.map(k => { const tb = dayIdByKey.get(k); return tb ? (symptomByTimeBox.get(tb)?.SCHLAF ?? null) : null }),
      ENTSPANNUNG: keys.map(k => { const tb = dayIdByKey.get(k); return tb ? (symptomByTimeBox.get(tb)?.ENTSPANNUNG ?? null) : null }),
      HEISSHUNGERFREIHEIT: keys.map(k => { const tb = dayIdByKey.get(k); return tb ? (symptomByTimeBox.get(tb)?.HEISSHUNGERFREIHEIT ?? null) : null }),
      BEWEGUNG: keys.map(k => { const tb = dayIdByKey.get(k); return tb ? (symptomByTimeBox.get(tb)?.BEWEGUNG ?? null) : null }),
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
      if (m.valueNum !== null && m.timeBoxId) stoolByTimeBox.set(m.timeBoxId, m.valueNum)
    }
    const stool: (number | null)[] = keys.map(k => {
      const tb = dayIdByKey.get(k)
      return tb ? (stoolByTimeBox.get(tb) ?? null) : null
    })
    
    // Calculate wellBeingIndex as average of all symptoms for each day
    const wellBeingIndex: (number | null)[] = keys.map(k => {
      const tb = dayIdByKey.get(k)
      if (!tb) return null
      const daySymptoms = symptomByTimeBox.get(tb)
      if (!daySymptoms) return null
      const values = Object.values(daySymptoms)
      if (values.length === 0) return null
      const avg = values.reduce((a, b) => a + b, 0) / values.length
      return Number(avg.toFixed(2))
    })

    // Habit fulfillment series
    const habitFulfillment: (number | null)[] = keys.map((key) => {
      const tbId = dayIdByKey.get(key)
      if (activeHabitsCount > 0 && tbId) {
        const done = doneByTimeBoxId.get(tbId) || 0
        return Number((done / activeHabitsCount).toFixed(3))
      }
      return null
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
      customSeries[metric.id] = keys.map(k => {
        const tb = dayIdByKey.get(k)
        return tb ? (customByTimeBox.get(tb)?.get(metric.id) ?? null) : null
      })
    }

    const payload = {
      weekStart: toYmd(days[0]),
      days: keys,
      symptoms,
      wellBeingIndex,
      stool,
      habitFulfillment,
      customSymptoms: {
        defs: customDefs,
        series: customSeries,
      },
    }

    const res = NextResponse.json(payload)
    res.headers.set('Cache-Control', 'no-store')
    return res
  } catch (err) {
    console.error('GET /api/analytics/weekly failed', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
