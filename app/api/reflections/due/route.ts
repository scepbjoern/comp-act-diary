import { NextRequest, NextResponse } from 'next/server'
import { getPrisma } from '@/lib/core/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const SIX_DAYS_MS = 6 * 24 * 60 * 60 * 1000

export async function GET(req: NextRequest) {
  try {
    const prisma = getPrisma()
    const cookieUserId = req.cookies.get('userId')?.value
    let user = cookieUserId ? await prisma.user.findUnique({ where: { id: cookieUserId } }) : null
    if (!user) user = await prisma.user.findUnique({ where: { username: 'demo' } })
    if (!user) return NextResponse.json({ error: 'No user' }, { status: 401 })

    // Reflections not migrated - use TimeBox for first day calculation
    const firstTimeBox = await prisma.timeBox.findFirst({
      where: { userId: user.id, kind: 'DAY', localDate: { not: null } },
      orderBy: { localDate: 'asc' },
      select: { localDate: true, createdAt: true },
    })

    const now = Date.now()
    let due = false
    let daysSince = 0

    if (firstTimeBox) {
      daysSince = Math.floor((now - firstTimeBox.createdAt.getTime()) / (24 * 60 * 60 * 1000))
      due = now - firstTimeBox.createdAt.getTime() > SIX_DAYS_MS
    } else {
      due = false
      daysSince = 0
    }

    return NextResponse.json({ due, daysSince })
  } catch (err) {
    console.error('GET /api/reflections/due failed', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
