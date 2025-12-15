import { NextRequest, NextResponse } from 'next/server'
import { getPrisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * User Symptoms API - Uses Measurement with user-defined MetricDefinition
 */

export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: dayId } = await context.params
    const prisma = getPrisma()
    
    const body = await req.json().catch(() => ({}))
    // body.scores is expected as { metricId: score, ... }
    const scores: Record<string, number | null> = body.scores || {}
    
    const day = await prisma.dayEntry.findUnique({ 
      where: { id: dayId },
      include: { timeBox: true }
    })
    if (!day) return NextResponse.json({ error: 'Day not found' }, { status: 404 })
    if (!day.timeBoxId) return NextResponse.json({ error: 'Day has no timeBox' }, { status: 400 })
    
    // Process each user symptom score
    for (const [metricId, score] of Object.entries(scores)) {
      // Verify metric exists and belongs to user
      const metric = await prisma.metricDefinition.findFirst({
        where: { id: metricId, userId: day.userId, category: 'user_symptom' }
      })
      if (!metric) continue
      
      if (score === null || score === undefined) {
        await prisma.measurement.deleteMany({
          where: { metricId, timeBoxId: day.timeBoxId, userId: day.userId }
        })
      } else {
        const numScore = Number(score)
        if (numScore < 1 || numScore > 10) continue
        
        const existing = await prisma.measurement.findFirst({
          where: { metricId, timeBoxId: day.timeBoxId, userId: day.userId }
        })
        
        if (existing) {
          await prisma.measurement.update({
            where: { id: existing.id },
            data: { valueNum: numScore }
          })
        } else {
          await prisma.measurement.create({
            data: {
              metricId,
              userId: day.userId,
              timeBoxId: day.timeBoxId,
              valueNum: numScore,
              source: 'MANUAL',
            }
          })
        }
      }
    }
    
    // Return updated user symptoms
    const userMetrics = await prisma.metricDefinition.findMany({
      where: { userId: day.userId, category: 'user_symptom' }
    })
    const userSymptomsOut: { id: string; title: string; score?: number }[] = []
    for (const metric of userMetrics) {
      const m = await prisma.measurement.findFirst({
        where: { metricId: metric.id, timeBoxId: day.timeBoxId, userId: day.userId }
      })
      userSymptomsOut.push({
        id: metric.id,
        title: metric.name,
        score: m?.valueNum ?? undefined
      })
    }
    
    return NextResponse.json({ day: { id: day.id, userSymptoms: userSymptomsOut } })
  } catch (err) {
    console.error('PUT /api/day/[id]/user-symptoms failed', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: dayId } = await context.params
    const prisma = getPrisma()
    
    const day = await prisma.dayEntry.findUnique({ 
      where: { id: dayId },
      include: { timeBox: true }
    })
    if (!day) return NextResponse.json({ error: 'Day not found' }, { status: 404 })
    if (!day.timeBoxId) return NextResponse.json({ error: 'Day has no timeBox' }, { status: 400 })
    
    const userMetrics = await prisma.metricDefinition.findMany({
      where: { userId: day.userId, category: 'user_symptom' }
    })
    const metricIds = userMetrics.map(m => m.id)
    
    await prisma.measurement.deleteMany({
      where: { 
        metricId: { in: metricIds }, 
        timeBoxId: day.timeBoxId, 
        userId: day.userId 
      }
    })
    
    return NextResponse.json({ day: { id: day.id, userSymptoms: [] } })
  } catch (err) {
    console.error('DELETE /api/day/[id]/user-symptoms failed', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
