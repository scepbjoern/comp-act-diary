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

/**
 * Phase analytics - Shows all data (phase concept removed from new schema)
 */
export async function GET(req: NextRequest) {
  try {
    const prisma = getPrisma()
    const url = new URL(req.url)
    const phase = url.searchParams.get('phase') || 'ALL'

    // Resolve user
    const cookieUserId = req.cookies.get('userId')?.value
    let user = cookieUserId
      ? await prisma.user.findUnique({ where: { id: cookieUserId } })
      : null
    if (!user) user = await prisma.user.findUnique({ where: { username: 'demo' } })
    if (!user) return NextResponse.json({ error: 'No user' }, { status: 401 })

    // Load all TimeBoxes
    const timeBoxes = await prisma.timeBox.findMany({
      where: { userId: user.id, kind: 'DAY', localDate: { not: null } },
      select: { id: true, localDate: true },
      orderBy: { localDate: 'asc' },
    })
    const dates = timeBoxes.filter(tb => tb.localDate).map(tb => tb.localDate as string)
    const timeBoxIds = timeBoxes.map(tb => tb.id)
    const dayIdByKey = new Map<string, string>()
    for (const tb of timeBoxes) {
      if (tb.localDate) dayIdByKey.set(tb.localDate, tb.id)
    }

    // Load symptoms from Measurement
    const SYSTEM_SYMPTOM_CODES = [
      'symptom_beschwerdefreiheit', 'symptom_energie', 'symptom_stimmung',
      'symptom_schlaf', 'symptom_entspannung', 'symptom_heisshungerfreiheit', 'symptom_bewegung',
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

    // Build symptom data map
    const symptomByTimeBox = new Map<string, Record<string, number>>()
    const symptomValues: Record<string, number[]> = {}
    for (const key of SYMPTOMS) symptomValues[key] = []
    
    for (const m of symptomMeasurements) {
      const tbId = m.timeBoxId
      if (m.metric && m.valueNum !== null && tbId) {
        const key = m.metric.code.replace('symptom_', '').toUpperCase()
        const existing = symptomByTimeBox.get(tbId) || {}
        existing[key] = m.valueNum
        symptomByTimeBox.set(tbId, existing)
        if (symptomValues[key]) symptomValues[key].push(m.valueNum)
      }
    }

    // Calculate metrics (avg, min, max)
    const calcMetrics = (vals: number[]) => vals.length > 0
      ? { avg: Number((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1)), min: Math.min(...vals), max: Math.max(...vals) }
      : { avg: null, min: null, max: null }

    const symptomMetricsResult: Record<SymptomKey, { avg: number | null; min: number | null; max: number | null }> = {
      BESCHWERDEFREIHEIT: calcMetrics(symptomValues['BESCHWERDEFREIHEIT'] || []),
      ENERGIE: calcMetrics(symptomValues['ENERGIE'] || []),
      STIMMUNG: calcMetrics(symptomValues['STIMMUNG'] || []),
      SCHLAF: calcMetrics(symptomValues['SCHLAF'] || []),
      ENTSPANNUNG: calcMetrics(symptomValues['ENTSPANNUNG'] || []),
      HEISSHUNGERFREIHEIT: calcMetrics(symptomValues['HEISSHUNGERFREIHEIT'] || []),
      BEWEGUNG: calcMetrics(symptomValues['BEWEGUNG'] || []),
    }

    const symptomSeries: Record<SymptomKey, (number | null)[]> = {
      BESCHWERDEFREIHEIT: dates.map(k => symptomByTimeBox.get(dayIdByKey.get(k)!)?.BESCHWERDEFREIHEIT ?? null),
      ENERGIE: dates.map(k => symptomByTimeBox.get(dayIdByKey.get(k)!)?.ENERGIE ?? null),
      STIMMUNG: dates.map(k => symptomByTimeBox.get(dayIdByKey.get(k)!)?.STIMMUNG ?? null),
      SCHLAF: dates.map(k => symptomByTimeBox.get(dayIdByKey.get(k)!)?.SCHLAF ?? null),
      ENTSPANNUNG: dates.map(k => symptomByTimeBox.get(dayIdByKey.get(k)!)?.ENTSPANNUNG ?? null),
      HEISSHUNGERFREIHEIT: dates.map(k => symptomByTimeBox.get(dayIdByKey.get(k)!)?.HEISSHUNGERFREIHEIT ?? null),
      BEWEGUNG: dates.map(k => symptomByTimeBox.get(dayIdByKey.get(k)!)?.BEWEGUNG ?? null),
    }

    // Load stool
    const stoolMetric = await prisma.metricDefinition.findFirst({ where: { code: 'bristol_stool', userId: null } })
    const stoolMeasurements = stoolMetric && timeBoxIds.length > 0
      ? await prisma.measurement.findMany({ where: { metricId: stoolMetric.id, timeBoxId: { in: timeBoxIds }, userId: user.id } })
      : []
    const stoolByTimeBox = new Map<string, number>()
    const stoolVals: number[] = []
    for (const m of stoolMeasurements) {
      if (m.timeBoxId && m.valueNum !== null) {
        stoolByTimeBox.set(m.timeBoxId, m.valueNum)
        stoolVals.push(m.valueNum)
      }
    }
    const stoolSeries = dates.map(k => stoolByTimeBox.get(dayIdByKey.get(k)!) ?? null)
    const stoolAvg = stoolVals.length > 0 ? Number((stoolVals.reduce((a, b) => a + b, 0) / stoolVals.length).toFixed(1)) : null

    // WellBeing index
    const wellBeingIndex = dates.map(k => {
      const data = symptomByTimeBox.get(dayIdByKey.get(k)!)
      if (!data) return null
      const vals = Object.values(data).filter(v => typeof v === 'number')
      return vals.length > 0 ? Number((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1)) : null
    })

    // Habit fulfillment
    const [checkIns, activeHabitsCount] = await Promise.all([
      timeBoxIds.length ? prisma.habitCheckIn.findMany({ where: { timeBoxId: { in: timeBoxIds }, status: 'DONE' }, select: { timeBoxId: true } }) : [],
      prisma.habit.count({ where: { userId: user.id, isActive: true } }),
    ])
    const doneByTb = new Map<string, number>()
    for (const ci of checkIns) doneByTb.set(ci.timeBoxId, (doneByTb.get(ci.timeBoxId) || 0) + 1)
    const habitSeries = dates.map(k => {
      const tbId = dayIdByKey.get(k)
      return activeHabitsCount > 0 && tbId ? Number(((doneByTb.get(tbId) || 0) / activeHabitsCount).toFixed(3)) : null
    })
    const habitVals = habitSeries.filter(v => v !== null) as number[]
    const habitAvg = habitVals.length > 0 ? Number((habitVals.reduce((a, b) => a + b, 0) / habitVals.length).toFixed(3)) : null

    // Custom symptoms
    const userMetrics = await prisma.metricDefinition.findMany({ where: { userId: user.id, category: 'user_symptom' } })
    const userMetricIds = userMetrics.map(m => m.id)
    const userMeasurements = userMetricIds.length > 0 && timeBoxIds.length > 0
      ? await prisma.measurement.findMany({ where: { metricId: { in: userMetricIds }, timeBoxId: { in: timeBoxIds }, userId: user.id } })
      : []
    const customByTimeBox = new Map<string, Map<string, number>>()
    for (const m of userMeasurements) {
      if (m.timeBoxId && m.valueNum !== null) {
        const inner = customByTimeBox.get(m.timeBoxId) || new Map()
        inner.set(m.metricId, m.valueNum)
        customByTimeBox.set(m.timeBoxId, inner)
      }
    }
    const customDefs = userMetrics.map(m => ({ id: m.id, title: m.name }))
    const customSeries: Record<string, (number | null)[]> = {}
    for (const metric of userMetrics) {
      customSeries[metric.id] = dates.map(k => customByTimeBox.get(dayIdByKey.get(k)!)?.get(metric.id) ?? null)
    }

    const payload = {
      phase,
      metrics: {
        symptoms: symptomMetricsResult,
        stool: { avg: stoolAvg },
        habitFulfillment: { avg: habitAvg },
      },
      series: {
        dates,
        wellBeingIndex,
        stool: stoolSeries,
        habitFulfillment: habitSeries,
        symptoms: symptomSeries,
      },
      customSymptoms: {
        defs: customDefs,
        series: customSeries,
      },
    }

    const res = NextResponse.json(payload)
    res.headers.set('Cache-Control', 'no-store')
    return res
  } catch (err) {
    console.error('GET /api/analytics/phase failed', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
