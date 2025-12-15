import { NextRequest, NextResponse } from 'next/server'
import { getPrisma } from '@/lib/prisma'
import { DEFAULT_HABIT_ICONS } from '@/lib/default-icons'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const prisma = getPrisma()
  const cookieUserId = req.cookies.get('userId')?.value
  let user = cookieUserId ? await prisma.user.findUnique({ where: { id: cookieUserId } }) : null
  if (!user) user = await prisma.user.findUnique({ where: { username: 'demo' } })
  if (!user) return NextResponse.json({ error: 'No user' }, { status: 401 })

  const habits = await prisma.habit.findMany({
    where: { userId: user.id, isActive: true },
    orderBy: { sortOrder: 'asc' },
    select: { id: true, title: true, userId: true, icon: true },
  })
  const list = habits.map((h) => ({
    id: h.id,
    title: h.title,
    userId: h.userId,
    icon: h.icon ?? DEFAULT_HABIT_ICONS[h.title] ?? null
  }))
  return NextResponse.json({ habits: list })
}

export async function POST(req: NextRequest) {
  const prisma = getPrisma()
  const body = await req.json().catch(() => ({}))
  const title = String(body?.title || '').trim() || 'Neue Gewohnheit'
  const icon = (typeof body?.icon === 'string' ? String(body.icon).trim() : '') || null

  const cookieUserId = req.cookies.get('userId')?.value
  let user = cookieUserId ? await prisma.user.findUnique({ where: { id: cookieUserId } }) : null
  if (!user) user = await prisma.user.findUnique({ where: { username: 'demo' } })
  if (!user) return NextResponse.json({ error: 'No user' }, { status: 401 })

  const last = await prisma.habit.findFirst({ where: { userId: user.id }, orderBy: { sortOrder: 'desc' }, select: { sortOrder: true } })
  const sortOrder = (last?.sortOrder ?? 0) + 1
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  const habit = await prisma.habit.create({ 
    data: { userId: user.id, title, slug, icon, isActive: true, sortOrder }, 
    select: { id: true, title: true, userId: true, icon: true } 
  })
  return NextResponse.json({ ok: true, habit })
}
