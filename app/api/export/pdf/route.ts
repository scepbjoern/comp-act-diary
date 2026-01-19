import { NextRequest, NextResponse } from 'next/server'
import { getPrisma } from '@/lib/core/prisma'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const SYMPTOM_LABELS: Record<string, string> = {
  BESCHWERDEFREIHEIT: 'Beschwerdefreiheit',
  ENERGIE: 'Energielevel',
  STIMMUNG: 'Stimmung',
  SCHLAF: 'Schlafqualität',
  ENTSPANNUNG: 'Entspannung',
  HEISSHUNGERFREIHEIT: 'Heisshungerfreiheit',
  BEWEGUNG: 'Bewegung',
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
    type DayData = {
      symptoms: Record<string, number | null>,
      stool: number | null,
      habitsDone: Set<string>
    }
    const dataByTimeBox = new Map<string, DayData>()

    for (const tb of timeBoxes) {
      dataByTimeBox.set(tb.id, {
        symptoms: Object.fromEntries(Object.keys(SYMPTOM_LABELS).map(s => [s, null])),
        stool: null,
        habitsDone: new Set()
      })
    }

    for (const m of measurements) {
      if (!m.timeBoxId) continue
      const data = dataByTimeBox.get(m.timeBoxId)
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

    // Build HTML for print
    const html = buildHtml(timeBoxes, dataByTimeBox, habits, fromStr, toStr)

    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      }
    })
  } catch (err) {
    console.error('GET /api/export/pdf failed', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

function toYmd(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function buildHtml(
  timeBoxes: { id: string; localDate: string | null }[],
  dataByTimeBox: Map<string, { symptoms: Record<string, number | null>; stool: number | null; habitsDone: Set<string> }>,
  habits: { id: string; title: string }[],
  fromStr: string,
  toStr: string
): string {
  const symptomKeys = Object.keys(SYMPTOM_LABELS)
  
  let tableRows = ''
  for (const tb of timeBoxes) {
    const data = dataByTimeBox.get(tb.id)!
    const symptomCells = symptomKeys.map(s => `<td>${data.symptoms[s] ?? '-'}</td>`).join('')
    const habitCells = habits.map(h => `<td>${data.habitsDone.has(h.id) ? '✓' : ''}</td>`).join('')
    tableRows += `<tr><td>${tb.localDate}</td>${symptomCells}<td>${data.stool ?? '-'}</td>${habitCells}</tr>\n`
  }

  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <title>Tagebuch Export ${fromStr} - ${toStr}</title>
  <style>
    body { font-family: sans-serif; font-size: 10px; margin: 20px; }
    h1 { font-size: 16px; margin-bottom: 10px; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ccc; padding: 4px 6px; text-align: center; }
    th { background: #f0f0f0; font-weight: bold; }
    @media print {
      body { margin: 0; }
      button { display: none; }
    }
  </style>
</head>
<body>
  <h1>Tagebuch Export: ${fromStr} bis ${toStr}</h1>
  <button onclick="window.print()">Als PDF drucken</button>
  <table>
    <thead>
      <tr>
        <th>Datum</th>
        ${symptomKeys.map(s => `<th>${SYMPTOM_LABELS[s]}</th>`).join('')}
        <th>Stuhl</th>
        ${habits.map(h => `<th>${escapeHtml(h.title)}</th>`).join('')}
      </tr>
    </thead>
    <tbody>
      ${tableRows}
    </tbody>
  </table>
</body>
</html>`
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
