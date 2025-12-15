import { NextRequest, NextResponse } from 'next/server'
import { getPrisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Weight API - Uses Measurement with MetricDefinition code='body_weight'
 */

const WEIGHT_METRIC_CODE = 'body_weight'

async function getOrCreateWeightMetric(prisma: ReturnType<typeof getPrisma>) {
  let metric = await prisma.metricDefinition.findFirst({ 
    where: { code: WEIGHT_METRIC_CODE, userId: null } 
  })
  if (!metric) {
    metric = await prisma.metricDefinition.create({
      data: {
        code: WEIGHT_METRIC_CODE,
        name: 'Körpergewicht',
        dataType: 'NUMERIC',
        unit: 'kg',
        minValue: 20,
        maxValue: 300,
        category: 'health',
        icon: '⚖️',
        origin: 'SYSTEM',
      }
    })
  }
  return metric
}

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: dayId } = await context.params
    const prisma = getPrisma()
    
    const day = await prisma.dayEntry.findUnique({ 
      where: { id: dayId },
      include: { timeBox: true }
    })
    if (!day) return NextResponse.json({ error: 'Day not found' }, { status: 404 })
    if (!day.timeBoxId) return NextResponse.json({ weight: null })
    
    const metric = await getOrCreateWeightMetric(prisma)
    const measurement = await prisma.measurement.findFirst({
      where: { metricId: metric.id, timeBoxId: day.timeBoxId, userId: day.userId }
    })
    
    return NextResponse.json({ weight: measurement?.valueNum ?? null })
  } catch (err) {
    console.error('GET /api/day/[id]/weight failed', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: dayId } = await context.params
    const prisma = getPrisma()
    
    const body = await req.json().catch(() => ({}))
    // Accept weight as number or string (with comma or dot)
    let weight: number | null = null
    if (body.weight !== null && body.weight !== undefined && body.weight !== '') {
      const raw = body.weight
      if (typeof raw === 'number') {
        weight = Math.round(raw * 10) / 10
      } else if (typeof raw === 'string') {
        const parsed = Number(raw.replace(',', '.'))
        if (!isNaN(parsed) && isFinite(parsed)) {
          weight = Math.round(parsed * 10) / 10
        }
      }
    }
    
    const day = await prisma.dayEntry.findUnique({ 
      where: { id: dayId },
      include: { timeBox: true }
    })
    if (!day) return NextResponse.json({ error: 'Day not found' }, { status: 404 })
    if (!day.timeBoxId) return NextResponse.json({ error: 'Day has no timeBox' }, { status: 400 })
    
    const metric = await getOrCreateWeightMetric(prisma)
    
    if (weight === null) {
      // Delete existing measurement
      await prisma.measurement.deleteMany({
        where: { metricId: metric.id, timeBoxId: day.timeBoxId, userId: day.userId }
      })
    } else {
      // Validate weight
      if (weight < 20 || weight > 300) {
        return NextResponse.json({ error: 'Weight must be between 20 and 300 kg' }, { status: 400 })
      }
      
      // Upsert measurement
      const existing = await prisma.measurement.findFirst({
        where: { metricId: metric.id, timeBoxId: day.timeBoxId, userId: day.userId }
      })
      
      if (existing) {
        await prisma.measurement.update({
          where: { id: existing.id },
          data: { valueNum: weight }
        })
      } else {
        await prisma.measurement.create({
          data: {
            metricId: metric.id,
            userId: day.userId,
            timeBoxId: day.timeBoxId,
            valueNum: weight,
            source: 'MANUAL',
          }
        })
      }
    }
    
    // Return updated weight
    const updated = await prisma.measurement.findFirst({
      where: { metricId: metric.id, timeBoxId: day.timeBoxId, userId: day.userId }
    })
    
    return NextResponse.json({ weight: updated?.valueNum ?? null })
  } catch (err) {
    console.error('PUT /api/day/[id]/weight failed', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
