import { NextRequest, NextResponse } from 'next/server'
import { getPrisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Stool API - Uses Measurement with MetricDefinition code='bristol_stool'
 */

const STOOL_METRIC_CODE = 'bristol_stool'

async function getOrCreateStoolMetric(prisma: ReturnType<typeof getPrisma>) {
  let metric = await prisma.metricDefinition.findFirst({ 
    where: { code: STOOL_METRIC_CODE, userId: null } 
  })
  if (!metric) {
    metric = await prisma.metricDefinition.create({
      data: {
        code: STOOL_METRIC_CODE,
        name: 'Bristol-Stuhlform',
        dataType: 'NUMERIC',
        minValue: 1,
        maxValue: 7,
        category: 'health',
        icon: '💩',
        origin: 'SYSTEM',
      }
    })
  }
  return metric
}

export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: dayId } = await context.params
    const prisma = getPrisma()
    
    const body = await req.json().catch(() => ({}))
    const score = typeof body.score === 'number' ? body.score : null
    
    // Get day entry with timeBox
    const day = await prisma.dayEntry.findUnique({ 
      where: { id: dayId },
      include: { timeBox: true }
    })
    if (!day) return NextResponse.json({ error: 'Day not found' }, { status: 404 })
    if (!day.timeBoxId) return NextResponse.json({ error: 'Day has no timeBox' }, { status: 400 })
    
    const metric = await getOrCreateStoolMetric(prisma)
    
    if (score === null) {
      // Delete existing measurement
      await prisma.measurement.deleteMany({
        where: { metricId: metric.id, timeBoxId: day.timeBoxId, userId: day.userId }
      })
    } else {
      // Validate score (1-7 Bristol scale)
      if (score < 1 || score > 7) {
        return NextResponse.json({ error: 'Score must be 1-7' }, { status: 400 })
      }
      
      // Upsert measurement
      const existing = await prisma.measurement.findFirst({
        where: { metricId: metric.id, timeBoxId: day.timeBoxId, userId: day.userId }
      })
      
      if (existing) {
        await prisma.measurement.update({
          where: { id: existing.id },
          data: { valueNum: score }
        })
      } else {
        await prisma.measurement.create({
          data: {
            metricId: metric.id,
            userId: day.userId,
            timeBoxId: day.timeBoxId,
            valueNum: score,
            source: 'MANUAL',
          }
        })
      }
    }
    
    // Return updated day payload
    const stoolMeasurement = await prisma.measurement.findFirst({
      where: { metricId: metric.id, timeBoxId: day.timeBoxId, userId: day.userId }
    })
    
    return NextResponse.json({ 
      day: { 
        id: day.id, 
        stool: stoolMeasurement?.valueNum ?? undefined 
      } 
    })
  } catch (err) {
    console.error('PUT /api/day/[id]/stool failed', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
