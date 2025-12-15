import { NextRequest, NextResponse } from 'next/server'
import { getPrisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const SYMPTOMS = [
  'BESCHWERDEFREIHEIT',
  'ENERGIE',
  'STIMMUNG',
  'SCHLAF',
  'ENTSPANNUNG',
  'HEISSHUNGERFREIHEIT',
  'BEWEGUNG',
] as const

type SymptomKey = typeof SYMPTOMS[number]

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

export async function GET(req: NextRequest) {
  try {
    const prisma = getPrisma()
    const url = new URL(req.url)
    const toParam = url.searchParams.get('to')

    // Resolve user (cookie -> demo fallback)
    const cookieUserId = req.cookies.get('userId')?.value
    let user = cookieUserId
      ? await prisma.user.findUnique({ where: { id: cookieUserId } })
      : null
    if (!user) user = await prisma.user.findUnique({ where: { username: 'demo' } })
    if (!user) return NextResponse.json({ error: 'No user' }, { status: 401 })

    // Determine 7-day window ending at 'to' (inclusive)
    let toDate = fromYmd(toParam)
    if (!toDate) toDate = new Date()
    const endInclusive = new Date(toDate.getFullYear(), toDate.getMonth(), toDate.getDate())
    const startInclusive = new Date(endInclusive)
    startInclusive.setDate(startInclusive.getDate() - 6)

    // Keys array from start..end inclusive
    const days: Date[] = []
    const keys: string[] = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(startInclusive)
      d.setDate(d.getDate() + i)
      days.push(d)
      keys.push(toYmd(d))
    }

    const rangeStart = new Date(startInclusive)
    const rangeEndExclusive = new Date(endInclusive)
    rangeEndExclusive.setDate(rangeEndExclusive.getDate() + 1)

    // Load TimeBoxes in range (replaces date-based DayEntry query)
    const timeBoxes = await prisma.timeBox.findMany({
      where: { 
        userId: user.id, 
        localDate: { gte: toYmd(rangeStart), lte: toYmd(endInclusive) },
        kind: 'DAY'
      },
      select: { id: true, localDate: true },
    })

    const dayKeyById = new Map<string, string>()
    const dayIdByKey = new Map<string, string>()
    for (const tb of timeBoxes) {
      if (tb.localDate) {
        dayKeyById.set(tb.id, tb.localDate)
        dayIdByKey.set(tb.localDate, tb.id)
      }
    }
    const timeBoxIds = timeBoxes.map((tb) => tb.id)

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
    const customByTimeBox = new Map<string, Record<string, number>>()
    for (const m of userSymptomMeasurements) {
      const tbId = m.timeBoxId
      if (m.valueNum !== null && tbId) {
        const existing = customByTimeBox.get(tbId) || {}
        existing[m.metricId] = m.valueNum
        customByTimeBox.set(tbId, existing)
      }
    }
    const sortedDefs = userMetrics
      .map(m => ({ id: m.id, title: m.name }))
      .sort((a, b) => new Intl.Collator('de-DE', { sensitivity: 'base' }).compare(a.title, b.title))

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

    // Yesterday values (relative to 'to')
    const yest = new Date(endInclusive)
    yest.setDate(yest.getDate() - 1)
    const yKey = toYmd(yest)
    const yTimeBoxId = dayIdByKey.get(yKey)
    let yesterdayHabits: string[] = []
    if (yTimeBoxId) {
      const habitCheckIns = await prisma.habitCheckIn.findMany({ 
        where: { timeBoxId: yTimeBoxId, status: 'DONE' }, 
        select: { habitId: true } 
      })
      yesterdayHabits = habitCheckIns.map((r) => r.habitId)
    }
    // Get yesterday's symptom values
    const ySymptoms = yTimeBoxId ? symptomByTimeBox.get(yTimeBoxId) : null
    const yCustom = yTimeBoxId ? customByTimeBox.get(yTimeBoxId) : null
    const yStool = yTimeBoxId ? stoolByTimeBox.get(yTimeBoxId) : null
    
    const yesterday = {
      standard: Object.fromEntries(SYMPTOMS.map(t => [t, ySymptoms?.[t] ?? null])) as Record<SymptomKey, number | null>,
      custom: Object.fromEntries(sortedDefs.map(d => [d.id, yCustom?.[d.id] ?? null])) as Record<string, number | null>,
      stool: yStool ?? null,
      habits: yesterdayHabits,
    }

    // Build custom symptoms series
    const customSeries: Record<string, (number | null)[]> = {}
    for (const def of sortedDefs) {
      customSeries[def.id] = keys.map(k => {
        const tb = dayIdByKey.get(k)
        return tb ? (customByTimeBox.get(tb)?.[def.id] ?? null) : null
      })
    }

    const payload = {
      days: keys,
      symptoms,
      stool,
      customSymptoms: {
        defs: sortedDefs,
        series: customSeries,
      },
      yesterday,
    }

    const res = NextResponse.json(payload)
    res.headers.set('Cache-Control', 'no-store')
    return res
  } catch (err) {
    console.error('GET /api/analytics/inline failed', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
