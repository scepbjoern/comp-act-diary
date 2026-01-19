import { NextRequest, NextResponse } from 'next/server'
import { getPrisma } from '@/lib/core/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Symptoms API - Uses Measurement with MetricDefinition for system symptoms
 */

const SYSTEM_SYMPTOMS = [
  { code: 'symptom_beschwerdefreiheit', name: 'Beschwerdefreiheit', icon: '😌' },
  { code: 'symptom_energie', name: 'Energie', icon: '⚡' },
  { code: 'symptom_stimmung', name: 'Stimmung', icon: '😊' },
  { code: 'symptom_schlaf', name: 'Schlaf', icon: '😴' },
  { code: 'symptom_entspannung', name: 'Entspannung', icon: '🧘' },
  { code: 'symptom_heisshungerfreiheit', name: 'Heißhungerfreiheit', icon: '🍎' },
  { code: 'symptom_bewegung', name: 'Bewegung', icon: '🏃' },
] as const

async function getOrCreateSymptomMetrics(prisma: ReturnType<typeof getPrisma>) {
  const metrics: Record<string, string> = {}
  
  for (const symptom of SYSTEM_SYMPTOMS) {
    let metric = await prisma.metricDefinition.findFirst({ 
      where: { code: symptom.code, userId: null } 
    })
    if (!metric) {
      metric = await prisma.metricDefinition.create({
        data: {
          code: symptom.code,
          name: symptom.name,
          dataType: 'NUMERIC',
          minValue: 1,
          maxValue: 10,
          category: 'symptom',
          icon: symptom.icon,
          origin: 'SYSTEM',
        }
      })
    }
    // Map short name to metric ID (e.g., 'BESCHWERDEFREIHEIT' -> metric.id)
    const shortName = symptom.code.replace('symptom_', '').toUpperCase()
    metrics[shortName] = metric.id
  }
  
  return metrics
}

export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: dayId } = await context.params
    const prisma = getPrisma()
    
    const body = await req.json().catch(() => ({}))
    // body.scores is expected as { BESCHWERDEFREIHEIT: 5, ENERGIE: 7, ... }
    const scores: Record<string, number | null> = body.scores || {}
    
    const day = await prisma.dayEntry.findUnique({ 
      where: { id: dayId },
      include: { timeBox: true }
    })
    if (!day) return NextResponse.json({ error: 'Day not found' }, { status: 404 })
    if (!day.timeBoxId) return NextResponse.json({ error: 'Day has no timeBox' }, { status: 400 })
    
    const metricMap = await getOrCreateSymptomMetrics(prisma)
    
    // Process each symptom score
    for (const [symptomKey, score] of Object.entries(scores)) {
      const metricId = metricMap[symptomKey]
      if (!metricId) continue
      
      if (score === null || score === undefined) {
        // Delete measurement
        await prisma.measurement.deleteMany({
          where: { metricId, timeBoxId: day.timeBoxId, userId: day.userId }
        })
      } else {
        // Validate score (1-10)
        const numScore = Number(score)
        if (numScore < 1 || numScore > 10) continue
        
        // Upsert measurement
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
    
    // Return updated symptoms
    const symptomsOut: Record<string, number | undefined> = {}
    for (const [key, metricId] of Object.entries(metricMap)) {
      const m = await prisma.measurement.findFirst({
        where: { metricId, timeBoxId: day.timeBoxId, userId: day.userId }
      })
      if (m?.valueNum !== null && m?.valueNum !== undefined) {
        symptomsOut[key] = m.valueNum
      }
    }
    
    return NextResponse.json({ day: { id: day.id, symptoms: symptomsOut } })
  } catch (err) {
    console.error('PUT /api/day/[id]/symptoms failed', err)
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
    
    const metricMap = await getOrCreateSymptomMetrics(prisma)
    const metricIds = Object.values(metricMap)
    
    // Delete all symptom measurements for this day
    await prisma.measurement.deleteMany({
      where: { 
        metricId: { in: metricIds }, 
        timeBoxId: day.timeBoxId, 
        userId: day.userId 
      }
    })
    
    return NextResponse.json({ day: { id: day.id, symptoms: {} } })
  } catch (err) {
    console.error('DELETE /api/day/[id]/symptoms failed', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
