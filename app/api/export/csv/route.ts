import { NextRequest, NextResponse } from 'next/server'
import { getPrisma } from '@/lib/core/prisma'

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

const SYSTEM_SYMPTOM_CODES = [
  'symptom_beschwerdefreiheit',
  'symptom_energie',
  'symptom_stimmung',
  'symptom_schlaf',
  'symptom_entspannung',
  'symptom_heisshungerfreiheit',
  'symptom_bewegung',
]

export async function GET(req: NextRequest) {
  try {
    const prisma = getPrisma()
    const url = new URL(req.url)
    const fromParam = url.searchParams.get('from')
    const toParam = url.searchParams.get('to')

    // Resolve user
    const cookieUserId = req.cookies.get('userId')?.value
    let user = cookieUserId
      ? await prisma.user.findUnique({ where: { id: cookieUserId } })
      : null
    if (!user) user = await prisma.user.findUnique({ where: { username: 'demo' } })
    if (!user) return NextResponse.json({ error: 'No user' }, { status: 401 })

    // Date range (default: last 30 days)
    const toDate = toParam ? new Date(toParam) : new Date()
    const fromDate = fromParam ? new Date(fromParam) : new Date(toDate.getTime() - 30 * 24 * 60 * 60 * 1000)
    const fromStr = toYmd(fromDate)
    const toStr = toYmd(toDate)

    // Load TimeBoxes in range
    const timeBoxes = await prisma.timeBox.findMany({
      where: {
        userId: user.id,
        kind: 'DAY',
        localDate: { gte: fromStr, lte: toStr },
      },
      orderBy: { localDate: 'asc' },
    })

    const timeBoxIds = timeBoxes.map(tb => tb.id)

    // Load metrics
    const symptomMetrics = await prisma.metricDefinition.findMany({
      where: { code: { in: SYSTEM_SYMPTOM_CODES }, userId: null }
    })
    const stoolMetric = await prisma.metricDefinition.findFirst({
      where: { code: 'bristol_stool', userId: null }
    })

    // Load all measurements
    const allMetricIds = [...symptomMetrics.map(m => m.id)]
    if (stoolMetric) allMetricIds.push(stoolMetric.id)
    
    const measurements = timeBoxIds.length > 0 && allMetricIds.length > 0
      ? await prisma.measurement.findMany({
          where: { timeBoxId: { in: timeBoxIds }, metricId: { in: allMetricIds }, userId: user.id },
          include: { metric: true }
        })
      : []

    // Load habits and check-ins
    const habits = await prisma.habit.findMany({
      where: { userId: user.id, isActive: true },
      orderBy: { sortOrder: 'asc' },
    })
    const checkIns = timeBoxIds.length > 0
      ? await prisma.habitCheckIn.findMany({
          where: { timeBoxId: { in: timeBoxIds }, status: 'DONE' }
        })
      : []

    // Build data map per timeBox
    const dataByTimeBox = new Map<string, {
      symptoms: Record<string, number | null>,
      stool: number | null,
      habitsDone: Set<string>
    }>()

    for (const tb of timeBoxes) {
      dataByTimeBox.set(tb.id, {
        symptoms: Object.fromEntries(SYMPTOMS.map(s => [s, null])),
        stool: null,
        habitsDone: new Set()
      })
    }

    for (const m of measurements) {
      const data = dataByTimeBox.get(m.timeBoxId!)
      if (!data || m.valueNum === null) continue
      if (m.metric) {
        if (m.metric.code === 'bristol_stool') {
          data.stool = m.valueNum
        } else {
          const key = m.metric.code.replace('symptom_', '').toUpperCase()
          data.symptoms[key] = m.valueNum
        }
      }
    }

    for (const ci of checkIns) {
      const data = dataByTimeBox.get(ci.timeBoxId)
      if (data) data.habitsDone.add(ci.habitId)
    }

    // Build CSV
    const habitCols = habits.map(h => h.title)
    const header = ['Datum', ...SYMPTOMS, 'Stuhl', ...habitCols]
    const rows: string[][] = [header]

    for (const tb of timeBoxes) {
      const data = dataByTimeBox.get(tb.id)!
      const row: string[] = [
        tb.localDate || '',
        ...SYMPTOMS.map(s => data.symptoms[s]?.toString() ?? ''),
        data.stool?.toString() ?? '',
        ...habits.map(h => data.habitsDone.has(h.id) ? '1' : '0')
      ]
      rows.push(row)
    }

    const csv = rows.map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(';')).join('\n')

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="tagebuch_${fromStr}_${toStr}.csv"`,
      }
    })
  } catch (err) {
    console.error('GET /api/export/csv failed', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

function toYmd(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
