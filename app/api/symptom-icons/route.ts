import { NextRequest, NextResponse } from 'next/server'
import { getPrisma } from '@/lib/prisma'
import { DEFAULT_SYMPTOM_ICONS } from '@/lib/default-icons'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Symptom Icons API - Uses MetricDefinition for system symptoms
 * Icons are now stored directly on MetricDefinition.icon
 */

const SYMPTOM_TYPES = [
  'BESCHWERDEFREIHEIT',
  'ENERGIE',
  'STIMMUNG',
  'SCHLAF',
  'ENTSPANNUNG',
  'HEISSHUNGERFREIHEIT',
  'BEWEGUNG',
] as const

export async function GET(req: NextRequest) {
  try {
    const prisma = getPrisma()
    const cookieUserId = req.cookies.get('userId')?.value
    let user = cookieUserId ? await prisma.user.findUnique({ where: { id: cookieUserId } }) : null
    if (!user) user = await prisma.user.findUnique({ where: { username: 'demo' } })
    if (!user) return NextResponse.json({ icons: DEFAULT_SYMPTOM_ICONS })

    // Get user's custom icons from MetricDefinition
    const metrics = await prisma.metricDefinition.findMany({
      where: { 
        userId: user.id, 
        category: 'symptom_icon',
      }
    })
    
    const map: Record<string, string | null> = { ...DEFAULT_SYMPTOM_ICONS }
    for (const m of metrics) {
      if (m.code && m.icon) map[m.code] = m.icon
    }
    return NextResponse.json({ icons: map })
  } catch (err) {
    console.error('GET /api/symptom-icons failed', err)
    return NextResponse.json({ icons: DEFAULT_SYMPTOM_ICONS })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const prisma = getPrisma()
    const cookieUserId = req.cookies.get('userId')?.value
    let user = cookieUserId ? await prisma.user.findUnique({ where: { id: cookieUserId } }) : null
    if (!user) user = await prisma.user.findUnique({ where: { username: 'demo' } })
    if (!user) return NextResponse.json({ error: 'No user' }, { status: 401 })

    const body = await req.json().catch(() => ({} as any))
    const type = String(body?.type || '')
    if (!SYMPTOM_TYPES.includes(type as typeof SYMPTOM_TYPES[number])) {
      return NextResponse.json({ error: 'Ungültiger Symptomtyp' }, { status: 400 })
    }
    
    const iconStr = typeof body?.icon === 'string' ? String(body.icon).trim() : ''
    
    if (!iconStr) {
      // Clear override: delete MetricDefinition for this symptom icon
      await prisma.metricDefinition.deleteMany({ 
        where: { userId: user.id, category: 'symptom_icon', code: type } 
      })
      return NextResponse.json({ ok: true, type, icon: null })
    } else {
      // Upsert MetricDefinition for icon override
      const existing = await prisma.metricDefinition.findFirst({
        where: { userId: user.id, category: 'symptom_icon', code: type }
      })
      
      if (existing) {
        await prisma.metricDefinition.update({
          where: { id: existing.id },
          data: { icon: iconStr }
        })
      } else {
        await prisma.metricDefinition.create({
          data: {
            userId: user.id,
            code: type,
            name: type,
            category: 'symptom_icon',
            icon: iconStr,
            dataType: 'NUMERIC',
          }
        })
      }
      return NextResponse.json({ ok: true, type, icon: iconStr })
    }
  } catch (err) {
    console.error('PATCH /api/symptom-icons failed', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
