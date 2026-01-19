import { NextRequest, NextResponse } from 'next/server'
import { getPrisma } from '@/lib/core/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const prisma = getPrisma()
  const body = await req.json().catch(() => ({}))
  const habitId = String(body.habitId || '')
  const checked = Boolean(body.checked)
  if (!habitId || typeof body.checked !== 'boolean') return NextResponse.json({ error: 'Bad request' }, { status: 400 })

  const day = await prisma.dayEntry.findUnique({ 
    where: { id },
    include: { timeBox: true }
  })
  if (!day) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!day.timeBoxId) return NextResponse.json({ error: 'Day has no TimeBox' }, { status: 400 })

  // Ensure habit exists
  const habit = await prisma.habit.findUnique({ where: { id: habitId } })
  if (!habit) return NextResponse.json({ error: 'Habit not found' }, { status: 404 })

  // Use HabitCheckIn instead of HabitTick
  const existingCheckIn = await prisma.habitCheckIn.findFirst({
    where: { habitId, timeBoxId: day.timeBoxId }
  })

  if (existingCheckIn) {
    await prisma.habitCheckIn.update({
      where: { id: existingCheckIn.id },
      data: { status: checked ? 'DONE' : 'SKIPPED' }
    })
  } else {
    await prisma.habitCheckIn.create({
      data: {
        habitId,
        userId: day.userId,
        timeBoxId: day.timeBoxId,
        status: checked ? 'DONE' : 'SKIPPED',
        occurredAt: new Date()
      }
    })
  }

  const payload = await buildDayPayload(day.id)
  return NextResponse.json({ day: payload })
}

async function buildDayPayload(dayId: string) {
  const prisma = getPrisma()
  const day = await prisma.dayEntry.findUnique({ 
    where: { id: dayId },
    include: { timeBox: true }
  })
  if (!day) throw new Error('Day not found')
  
  const dateStr = day.timeBox?.localDate ?? toYmd(new Date())
  
  const habits = await prisma.habit.findMany({ 
    where: { userId: day.userId, isActive: true }, 
    orderBy: { sortOrder: 'asc' }, 
    select: { id: true, title: true } 
  })
  
  const checkIns = day.timeBoxId 
    ? await prisma.habitCheckIn.findMany({ where: { timeBoxId: day.timeBoxId } })
    : []
  const ticks = habits.map((h) => ({ 
    habitId: h.id, 
    checked: checkIns.some(ci => ci.habitId === h.id && ci.status === 'DONE') 
  }))
  
  // Symptoms not migrated
  const symptoms: Record<string, number | undefined> = {}
  const userSymptomsOut: { id: string; title: string; score?: number }[] = []
  
  return { 
    id: day.id, 
    date: dateStr, 
    timeBoxId: day.timeBoxId,
    symptoms, 
    stool: undefined, 
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
