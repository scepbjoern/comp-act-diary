import { NextRequest, NextResponse } from 'next/server'
import { getPrisma } from '@/lib/core/prisma'
import { getJournalEntryAccessService } from '@/lib/services/journalEntryAccessService'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function toYmdLocal(d: Date) {
  const dt = new Date(d)
  const y = dt.getFullYear()
  const m = String(dt.getMonth() + 1).padStart(2, '0')
  const day = String(dt.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function getMonthRange(ym: string) {
  const parts = ym.split('-').map((n: string) => parseInt(n, 10))
  const y = parts[0] ?? new Date().getFullYear()
  const m = parts[1] ?? 1
  const start = new Date(y, m - 1, 1)
  const end = new Date(y, m, 1)
  return { start, end }
}

export async function GET(req: NextRequest) {
  const prisma = getPrisma()
  const { searchParams } = new URL(req.url)
  const monthStr = searchParams.get('month') // YYYY-MM
  if (!monthStr) {
    return NextResponse.json({ error: 'Missing month (YYYY-MM)' }, { status: 400 })
  }
  const { start, end } = getMonthRange(monthStr)

  const cookieUserId = req.cookies.get('userId')?.value
  let user = cookieUserId
    ? await prisma.user.findUnique({ where: { id: cookieUserId } })
    : null
  if (!user) {
    user = await prisma.user.findUnique({ where: { username: 'demo' } })
    if (!user) return NextResponse.json({ error: 'No user' }, { status: 401 })
  }

  // Load TimeBoxes with data (JournalEntries, HabitCheckIns, or Measurements)
  const timeBoxes = await prisma.timeBox.findMany({
    where: {
      userId: user.id,
      localDate: { gte: toYmdLocal(start), lt: toYmdLocal(end) },
      kind: 'DAY',
      OR: [
        { journalEntries: { some: { userId: user.id } } },
        { habitCheckIns: { some: {} } },
        { measurements: { some: {} } },
      ],
    },
    select: { localDate: true },
    orderBy: { localDate: 'asc' },
  })

  const ownedDays = timeBoxes.filter(tb => tb.localDate).map((tb) => tb.localDate as string)

  // Also get days with shared entries
  const accessService = getJournalEntryAccessService()
  const sharedEntryDates = await accessService.getSharedEntryDatesForMonth(
    user.id,
    new Date(start),
    new Date(end)
  )

  // Combine owned and shared days, remove duplicates
  const allDays = [...new Set([...ownedDays, ...sharedEntryDates])].sort()

  // Reflections not migrated - return empty for now
  const reflectionDays: string[] = []

  return NextResponse.json({ days: allDays, reflectionDays, sharedDays: sharedEntryDates })
}
